import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import path from 'node:path';
import type { IStorageService, StorageSaveResult } from './storage.service.js';

/** Server-only storage. Routes must check material ownership before calling it. */
export class SupabaseStorageService implements IStorageService {
  private client: SupabaseClient;
  private loginPromise: Promise<void> | null = null;
  private sessionExpiresAt = 0;
  private retryAfter = 0;
  constructor(url: string, publishableKey: string, private bucket: string,
    private account: { email: string; password: string; userId: string }, client?: SupabaseClient) {
    if (!url || !publishableKey || !bucket || !account.email || !account.password || !account.userId) {
      throw new Error('Supabase storage configuration is incomplete.');
    }
    // Never silently fall back to project-wide elevated credentials.
    let role = '';
    try { role = JSON.parse(Buffer.from(publishableKey.split('.')[1] || '', 'base64url').toString()).role; } catch {}
    if (publishableKey.startsWith('sb_secret_') || role === 'service_role') {
      throw new Error('Use a Supabase publishable or anon key with the dedicated storage account.');
    }
    this.client = client || createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }) },
    });
  }
  private async authenticate(): Promise<void> {
    if (this.sessionExpiresAt > Date.now() + 60000) return;
    if (this.loginPromise) return this.loginPromise;
    if (Date.now() < this.retryAfter) throw new Error('Storage sign-in failed. Check the dedicated account settings.');
    this.loginPromise = (async () => {
      try {
        let result = this.sessionExpiresAt ? await this.client.auth.refreshSession() : null;
        if (!result || result.error || !result.data.session) {
          result = await this.client.auth.signInWithPassword({
            email: this.account.email, password: this.account.password,
          });
        }
        const session = result.data.session;
        if (result.error || !session || session.user.id !== this.account.userId || session.user.role !== 'authenticated') {
          this.sessionExpiresAt = 0;
          throw new Error('Storage account authentication failed.');
        }
        this.sessionExpiresAt = (session.expires_at || 0) * 1000;
        if (this.sessionExpiresAt <= Date.now() + 60000) throw new Error('Storage session expires too soon.');
      } catch {
        this.sessionExpiresAt = 0;
        this.retryAfter = Date.now() + 10000;
        throw new Error('Storage sign-in failed. Check the dedicated account settings.');
      }
    })();
    try { await this.loginPromise; } finally { this.loginPromise = null; }
  }
  private validate(key: string): void {
    if (!/^[a-zA-Z0-9_.-]+$/.test(key) || key.includes('..')) {
      throw new Error('STORAGE_KEY_INVALID');
    }
  }
  private async privateBucket(): Promise<void> {
    await this.authenticate();
    const { data, error } = await this.client.storage.getBucket(this.bucket);
    if (error || !data) throw new Error('Storage bucket is unavailable.');
    if (data.public) throw new Error('Storage bucket must be private.');
  }
  async save(buffer: Buffer, name: string, mime: string): Promise<StorageSaveResult> {
    await this.privateBucket();
    const ext = path.extname(name).toLowerCase();
    const key = `${crypto.randomUUID()}${/^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '.bin'}`;
    const { error } = await this.client.storage.from(this.bucket).upload(key, buffer, {
      contentType: mime, upsert: false,
    });
    if (error) throw new Error('File upload failed. Please check storage availability and quota.');
    return { storageKey: key, fileSizeBytes: buffer.length };
  }
  async get(key: string): Promise<Buffer | null> {
    this.validate(key);
    await this.privateBucket();
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) {
      if (String((error as any).statusCode) === '404' || (error as any).code === 'NoSuchKey') return null;
      throw new Error('File storage is temporarily unavailable.');
    }
    return data ? Buffer.from(await data.arrayBuffer()) : null;
  }
  load(key: string) { return this.get(key); }
  async getStream(key: string): Promise<Readable | null> {
    const buffer = await this.get(key);
    return buffer ? Readable.from(buffer) : null;
  }
  getFilePath(_key: string): null { return null; }
  async exists(key: string): Promise<boolean> { return (await this.get(key)) !== null; }
  async delete(key: string): Promise<boolean> {
    this.validate(key);
    await this.privateBucket();
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw new Error('File could not be removed from storage.');
    return true;
  }
}
