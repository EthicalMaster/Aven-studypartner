import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import path from 'node:path';
import type { IStorageService, StorageSaveResult } from './storage.service.js';

/** Server-only storage. Routes must check material ownership before calling it. */
export class SupabaseStorageService implements IStorageService {
  private client: SupabaseClient;
  constructor(url: string, secret: string, private bucket: string, client?: SupabaseClient) {
    if (!url || !secret || !bucket) throw new Error('Supabase storage configuration is incomplete.');
    this.client = client || createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }) },
    });
  }
  private validate(key: string): void {
    if (!/^[a-zA-Z0-9_.-]+$/.test(key) || key.includes('..')) {
      throw new Error('STORAGE_KEY_INVALID');
    }
  }
  private async privateBucket(): Promise<void> {
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
