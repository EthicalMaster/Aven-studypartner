/** Real PDF extraction + long-lived Python ONNX runner. No database credentials. */
import assert from 'node:assert/strict';
import { documentExtractor } from '../services/document-intelligence/extractor.js';
import { pythonEmbeddingRunner } from '../services/embedding/python-embedding-runner.js';
import { embeddingService } from '../services/embedding/embedding.service.js';
import { LocalStorageService } from '../services/storage.service.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function pdf(text: string): Buffer {
  const content = `BT /F1 12 Tf 40 740 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(data);
  data += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x => `${String(x).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
if (process.env.EMBEDDING_BACKEND !== 'onnx') throw new Error('Set EMBEDDING_BACKEND=onnx for this real-engine test.');
const temp = mkdtempSync(join(tmpdir(), 'aven-pdf-smoke-'));
const storage = new LocalStorageService(temp);
try {
  // Load the actual production-mode server and all of its routes into this process.
  await import('../../server.js');
  await embeddingService.waitUntilReady();
  console.log('MEMORY_STAGE ready', process.memoryUsage().rss / 1024**2);
  const root = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/`);
  assert.equal(root.status, 200);
  const denied = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/materials/unknown/download`);
  assert.equal(denied.status, 401);
  const saved = await storage.save(pdf('Hackathon teams must contain two to four members.'), 'fixture.pdf', 'application/pdf');
  const pages = await documentExtractor.extract((await storage.load(saved.storageKey))!, 'fixture.pdf', 'application/pdf');
  console.log('MEMORY_STAGE pdf', process.memoryUsage().rss / 1024**2);
  assert.match(pages[0].text, /two to four/);
  const docs = await embeddingService.embedTexts([pages[0].text, 'Photosynthesis stores sunlight energy in plants.']);
  const query = await embeddingService.embedQuery('How many people can be on a team?');
  const dot = (v: number[]) => v.reduce((sum, n, i) => sum + n * query[i], 0);
  assert.ok(dot(docs[0]) > dot(docs[1]));
  // Exercise 16 long chunks plus queued simultaneous search calls.
  await embeddingService.embedTexts(Array(16).fill(pages[0].text.repeat(100)));
  await Promise.all(Array.from({ length: 3 }, () => embeddingService.embedQuery('What is the team size?')));
  pythonEmbeddingRunner.shutdown();
  await embeddingService.waitUntilReady();
  const restarted = await embeddingService.embedQuery('How many people can be on a team?');
  assert.ok(restarted.every((v, i) => Math.abs(v - query[i]) < 0.00001));
  assert.ok(await new LocalStorageService(temp).get(saved.storageKey));
  await storage.delete(saved.storageKey);
  console.log(JSON.stringify({ result: 'PASS', nodePeakRssMiB: process.resourceUsage().maxRSS / 1024,
    finalRssMiB: process.memoryUsage().rss / 1024**2,
    checks: ['production HTTP startup', 'unauthenticated download rejected', 'PDF extraction', 'ONNX ranking', 'long chunks', 'queued queries', 'runner restart'],
    limitations: ['No real database or cloud storage', 'No authenticated upload HTTP test', 'No 512 MiB cgroup limit', 'Node memory excludes Python'] }));
} finally {
  pythonEmbeddingRunner.shutdown();
  rmSync(temp, { recursive: true, force: true });
}
process.exit(0);
