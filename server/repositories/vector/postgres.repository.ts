import { getRequiredPool } from '../../db/connection.js';
import type { IVectorRepository, VectorPoint, VectorSearchParams, VectorSearchResult } from './types.js';

export function serializeVector(vector: number[]): string {
  if (!Array.isArray(vector) || vector.length !== 384 ||
      !vector.every(Number.isFinite) || !vector.some(value => value !== 0)) {
    throw new Error('Embedding must contain 384 finite numbers and have nonzero magnitude.');
  }
  return JSON.stringify(vector);
}

export class PostgresVectorRepository implements IVectorRepository {
  async ensureCollection(): Promise<void> {
    // Schema changes belong in migrations, never in a request handler.
    await getRequiredPool().query('SELECT chunk_id FROM document_vectors LIMIT 0');
  }

  async isAvailable(): Promise<boolean> {
    try { await this.ensureCollection(); return true; } catch { return false; }
  }

  async upsertChunks(points: VectorPoint[]): Promise<void> {
    if (!points.length) return;
    const vectors = points.map(point => serializeVector(point.vector));
    const client = await getRequiredPool().connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (point.id !== point.payload.chunk_id) throw new Error('Chunk ID mismatch.');
        // Ownership and material identity come from canonical rows, not JSON payloads.
        const result = await client.query(`
          INSERT INTO document_vectors (chunk_id, embedding)
          SELECT c.id, $2::vector FROM document_chunks c
          JOIN study_materials m ON m.id = c.material_id
          WHERE c.id = $1 AND c.material_id = $3 AND m.student_id = $4
          ON CONFLICT (chunk_id) DO UPDATE SET
            embedding = EXCLUDED.embedding, updated_at = NOW()
          RETURNING chunk_id`,
          [point.id, vectors[i], point.payload.material_id, point.payload.student_id]);
        if (result.rowCount !== 1) throw new Error('Chunk not found or ownership mismatch.');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async deleteByMaterialId(materialId: string): Promise<void> {
    await getRequiredPool().query(`DELETE FROM document_vectors v USING document_chunks c
      WHERE v.chunk_id = c.id AND c.material_id = $1`, [materialId]);
  }

  async deleteByChunkIds(chunkIds: string[]): Promise<void> {
    if (chunkIds.length) await getRequiredPool().query(
      'DELETE FROM document_vectors WHERE chunk_id = ANY($1::uuid[])', [chunkIds]);
  }

  async countByMaterialId(materialId: string): Promise<number> {
    const result = await getRequiredPool().query(`SELECT COUNT(*) AS count
      FROM document_vectors v JOIN document_chunks c ON c.id = v.chunk_id
      WHERE c.material_id = $1`, [materialId]);
    return Number(result.rows[0].count);
  }

  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    if (!params.studentId) throw new Error('Student ID is required for vector search.');
    const vector = serializeVector(params.queryVector);
    const topK = Number.isFinite(params.topK) ? Math.min(10, Math.max(1, Math.trunc(params.topK))) : 5;
    const result = await getRequiredPool().query(`
      SELECT c.id, 1 - (v.embedding <=> $1::vector) AS score,
        jsonb_build_object('chunk_id', c.id, 'material_id', c.material_id,
          'student_id', m.student_id, 'subject', m.subject, 'topic', m.topic,
          'page_start', c.page_start, 'page_end', c.page_end,
          'section_id', c.section_id, 'chunk_index', c.chunk_index) AS payload
      FROM document_vectors v
      JOIN document_chunks c ON c.id = v.chunk_id
      JOIN study_materials m ON m.id = c.material_id
      WHERE m.student_id = $2
        AND v.embedding_model = 'BAAI/bge-small-en-v1.5'
        AND ($3::uuid IS NULL OR c.material_id = $3)
        AND ($4::text IS NULL OR LOWER(m.subject) = LOWER($4))
        AND ($5::text IS NULL OR LOWER(m.topic) = LOWER($5))
      ORDER BY v.embedding <=> $1::vector, c.id LIMIT $6`,
      [vector, params.studentId, params.materialId ?? null, params.subject ?? null, params.topic ?? null, topK]);
    return result.rows.map(row => ({ id: row.id, score: Number(row.score), payload: row.payload }));
  }
}

export const vectorRepository: IVectorRepository = new PostgresVectorRepository();
