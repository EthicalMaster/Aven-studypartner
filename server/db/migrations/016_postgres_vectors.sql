-- Existing Qdrant vectors are not imported: regenerate from document_chunks.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS document_vectors (
    chunk_id UUID PRIMARY KEY REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'BAAI/bge-small-en-v1.5',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Exact cosine search is intentional for small, per-student document collections.
