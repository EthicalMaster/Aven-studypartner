import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from '../services/supabase-storage.service.js';

// SDK against a fake HTTP transport: no credentials or external account needed.
const objects = new Map<string, Buffer>();
let bucketPublic = false;
let outage = false;
let calls = 0;
const client = createClient('https://storage-test.invalid', 'test-server-secret', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (input, init) => {
    calls++;
    const url = new URL(String(input));
    const method = init?.method || 'GET';
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
const storage = new SupabaseStorageService('https://storage-test.invalid', 'test-server-secret', 'aven-materials', client);
const saved = await storage.save(Buffer.from('%PDF-fixture'), '../unsafe.pdf', 'application/pdf');
assert.match(saved.storageKey, /^[a-f0-9-]+\.pdf$/);
assert.equal((await storage.get(saved.storageKey))?.toString(), '%PDF-fixture');
// A new adapter instance can still retrieve the remote object.
const restarted = new SupabaseStorageService('https://storage-test.invalid', 'test-server-secret', 'aven-materials', client);
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
console.log('PASS: private storage upload/download/restart/delete, traversal rejection, public-bucket rejection and outage propagation (mock HTTP).');
