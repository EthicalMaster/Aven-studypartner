import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { setPoolForTesting } from '../db/connection.js';
import { PostgresVectorRepository } from '../repositories/vector/postgres.repository.js';

const directory = mkdtempSync(join(tmpdir(), 'aven-vector-'));
let db = await PGlite.create(directory, { extensions: { vector } });
function attach() {
  const client = {
    query: async (sql: string, params?: any[]) => {
      const result = await db.query(sql, params);
      return { rows: result.rows, rowCount: result.affectedRows };
    },
    release() {},
  };
  setPoolForTesting({ ...client, connect: async () => client });
}
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const unit = (n: number) => Array.from({ length: 384 }, (_, i) => i === n ? 1 : 0);
const point = (id: number, material: number, student: number, axis: number) => ({
  id: uuid(id), vector: unit(axis), payload: {
    chunk_id: uuid(id), material_id: uuid(material), student_id: uuid(student),
    subject: 'Science', topic: 'Physics', page_start: 1, page_end: 1,
    section_id: null, chunk_index: id,
  },
});
try {
  await db.exec(`CREATE TABLE study_materials (id uuid PRIMARY KEY, student_id uuid, subject text, topic text);
    CREATE TABLE document_chunks (id uuid PRIMARY KEY, material_id uuid REFERENCES study_materials ON DELETE CASCADE,
      page_start int, page_end int, section_id uuid, chunk_index int);`);
  await db.exec(readFileSync(new URL('../db/migrations/016_postgres_vectors.sql', import.meta.url), 'utf8'));
  for (const [material, student] of [[10, 100], [20, 200]]) {
    await db.query('INSERT INTO study_materials VALUES ($1,$2,$3,$4)', [uuid(material), uuid(student), 'Science', 'Physics']);
  }
  for (const [id, material] of [[1, 10], [2, 10], [3, 20]]) {
    await db.query('INSERT INTO document_chunks VALUES ($1,$2,1,1,NULL,$3)', [uuid(id), uuid(material), id]);
  }
  attach();
  let repo = new PostgresVectorRepository();
  await repo.upsertChunks([point(1, 10, 100, 0), point(2, 10, 100, 1), point(3, 20, 200, 0)]);
  const query = { studentId: uuid(100), queryVector: unit(0), topK: 5 };
  let hits = await repo.search(query);
  assert.deepEqual(hits.map(hit => hit.id), [uuid(1), uuid(2)]);
  assert.equal(hits[0].score, 1);
  assert.equal((await repo.search({ ...query, materialId: uuid(20) })).length, 0);
  assert.equal((await repo.search({ ...query, subject: 'science', topic: 'physics', topK: 1 })).length, 1);
  assert.equal((await repo.search({ ...query, subject: 'History' })).length, 0);
  await assert.rejects(repo.search({ ...query, studentId: '' }));
  await assert.rejects(repo.search({ ...query, queryVector: Array(384).fill(0) }));
  await assert.rejects(repo.search({ ...query, queryVector: [NaN] }));
  await assert.rejects(repo.upsertChunks([point(3, 20, 100, 0)]));
  // A later invalid point rolls back earlier writes in the batch.
  await assert.rejects(repo.upsertChunks([point(1, 10, 100, 1), point(3, 20, 100, 0)]));
  assert.equal((await repo.search(query))[0].score, 1);
  await db.close();
  db = await PGlite.create(directory, { extensions: { vector } });
  attach();
  repo = new PostgresVectorRepository();
  assert.equal(await repo.countByMaterialId(uuid(10)), 2);
  assert.equal((await repo.search(query))[0].id, uuid(1));
  await db.query('DELETE FROM document_chunks WHERE id = $1', [uuid(1)]);
  assert.equal(await repo.countByMaterialId(uuid(10)), 1);
  await repo.deleteByMaterialId(uuid(10));
  assert.equal((await repo.search(query)).length, 0);
  assert.equal(await repo.countByMaterialId(uuid(20)), 1);
  console.log('PASS: cosine ranking, filters, tenant isolation, invalid vectors, atomic batches, restart persistence, cascade deletion.');
} finally {
  setPoolForTesting(null);
  await db.close();
  rmSync(directory, { recursive: true, force: true });
}
