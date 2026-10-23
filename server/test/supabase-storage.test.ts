import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from '../services/supabase-storage.service.js';

// SDK against a fake HTTP transport: no credentials or external account needed.
const objects = new Map<string, Buffer>();
let bucketPublic = false;
let outage = false;
let calls = 0;
let logins = 0;
let refreshes = 0;
let wrongAccount = false;
const account = { email: 'aven@example.test', password: 'test-only-password', userId: '7b6b27ad-64a0-42d9-86b1-902fcc31939a' };
const client = createClient('https://storage-test.invalid', 'test-server-secret', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (input, init) => {
    calls++;
    const url = new URL(String(input));
    const method = init?.method || 'GET';
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') refreshes++; else logins++;
      const user = { id: wrongAccount ? '00000000-0000-4000-8000-000000000001' : account.userId, role: 'authenticated', aud: 'authenticated', email: account.email };
      const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
      const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })}.fake-signature`;
      return Response.json({ access_token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, user });
    }
    assert.match(new Headers(init?.headers).get('authorization') || '', /fake-signature$/, 'Storage requests must use the dedicated session token');
    if (outage) return Response.json({ message: 'internal secret must not escape', statusCode: '503' }, { status: 503 });
    if (url.pathname.endsWith('/bucket/aven-materials')) return Response.json({ id: 'aven-materials', public: bucketPublic });
    const key = decodeURIComponent(url.pathname.split('/').pop()!);
    if (method === 'POST') {
      objects.set(key, Buffer.from(init?.body as Uint8Array));
      return Response.json({ Key: `aven-materials/${key}` });
    }
    if (method === 'DELETE') {
      for (const name of JSON.parse(String(init?.body)).prefixes) objects.delete(name);
      return Response.json([]);
    }
    const value = objects.get(key);
    return value ? new Response(new Uint8Array(value)) : Response.json({ message: 'missing', statusCode: '404', code: 'NoSuchKey' }, { status: 404 });
  } },
});
const storage = new SupabaseStorageService('https://storage-test.invalid', 'test-server-secret', 'aven-materials', account, client);
await Promise.all(Array.from({length: 5}, () => storage.get('missing.pdf')));
assert.equal(logins, 1, 'Concurrent requests should share one sign-in');
const saved = await storage.save(Buffer.from('%PDF-fixture'), '../unsafe.pdf', 'application/pdf');
assert.match(saved.storageKey, /^[a-f0-9-]+\.pdf$/);
assert.equal((await storage.get(saved.storageKey))?.toString(), '%PDF-fixture');
// A new adapter instance can still retrieve the remote object.
const restarted = new SupabaseStorageService('https://storage-test.invalid', 'test-server-secret', 'aven-materials', account, client);
const stream = await restarted.getStream(saved.storageKey);
let output = '';
for await (const chunk of stream!) output += chunk.toString();
assert.equal(output, '%PDF-fixture');
const before = calls;
await assert.rejects(storage.get('../secret'), /STORAGE_KEY_INVALID/);
assert.equal(calls, before);
bucketPublic = true;
await assert.rejects(storage.save(Buffer.from('private'), 'x.pdf', 'application/pdf'), /must be private/);
await assert.rejects(storage.get(saved.storageKey), /must be private/);
bucketPublic = false;
outage = true;
await assert.rejects(storage.get(saved.storageKey), /bucket is unavailable/);
outage = false;
assert.equal(await storage.delete(saved.storageKey), true);
assert.equal(await storage.get(saved.storageKey), null);
const realNow = Date.now;
const loginsBeforeRefresh = logins;
try {
  Date.now = () => realNow() + 3550 * 1000;
  await restarted.get('missing.pdf');
  assert.ok(refreshes >= 1);
  assert.equal(logins, loginsBeforeRefresh);
} finally { Date.now = realNow; }
wrongAccount = true;
const wrong = new SupabaseStorageService('https://storage-test.invalid', 'test-server-secret', 'aven-materials', account, client);
await assert.rejects(wrong.get('missing.pdf'), /sign-in failed/);
assert.throws(() => new SupabaseStorageService('https://storage-test.invalid', 'sb_secret_test', 'aven-materials', account), /publishable or anon/);
console.log('PASS: dedicated sign-in/concurrency/session renewal, UID/secret-key rejection, private storage upload/download/restart/delete, traversal rejection, public-bucket rejection and outage propagation (mock HTTP).');
