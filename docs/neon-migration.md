> Update: the optional ONNX runtime and private Supabase storage adapter are now available. See [free-hosting-preview.md](free-hosting-preview.md). The original PyTorch Dockerfile remains available.

# Neon retrieval migration

This branch routes application vector operations through PostgreSQL + pgvector. Qdrant is retained only for legacy tests. The new document_vectors table holds real BGE-small-en-v1.5 vectors; source text and ownership remain canonical PostgreSQL records. Storage failure is an error, never a silent in-memory success.

## Status and limits

The user's Railway backup has been restored separately to Neon and vector enabled. This code has NOT been connected to that database or deployed. The original PDFs were not preserved. Existing extracted chunks can be re-embedded without those PDFs, but original download/reprocessing requires re-uploading them.

The container includes Python, CPU PyTorch and sentence-transformers, downloads BGE during build, and runs inference offline at runtime. Docker is not available in the implementation environment, so container build, real model inference, RAM usage, and deployed login/upload/search are still unverified. A free host must not be assumed to have enough RAM. The current embedding job queue is in-process: interrupted jobs must be retried after restart.

Uploads still use files. Set UPLOADS_DIR to a writable persistent volume, or implement object storage before hosting on an ephemeral filesystem. Do not use this container unchanged on an ephemeral free host for documents that must be retained. The AI answer provider remains unchanged and needs separate configuration/implementation.

## Deployment sequence

1. Use npm ci (package-lock.json is the deployment lockfile). Keep the Railway deployment unchanged until a preview works.
2. Set DATABASE_URL to the intended Neon database using SSL. Use a direct connection for migrations; keep credentials out of git.
3. Run npm run db:migrate. Migration 016 adds vector storage without deleting existing records. It does not migrate Qdrant vectors or generate embeddings.
4. Build the Docker image and start it with DATABASE_URL and a writable uploads mount. PORT is read from the host; defaults to 3000. Production rejects synthetic embedding fallback.
5. Sign in, choose an existing document, and click Re-generate Vectors. Old embedding metadata alone does not prove that vectors exist in the new table. Re-upload documents when original files are needed.
6. Upload a new PDF, wait for indexing, search a known fact, and confirm the correct source/page. Restart the app and repeat search and original-file download. Confirm another student's document is inaccessible.
7. Before switching production, account for any writes to Railway since the backup. Do not overwrite a Neon database with new user activity using an older backup. Keep the original dump and Railway database until the cutover is verified.

## Verification

- npm run lint
- npm run build
- npm run test:pgvector

The pgvector integration test runs actual vector SQL in PGlite, including cosine ranking, material/subject/topic filters, student isolation, invalid vector rejection, transactional rollback, disk persistence across reopening, and cascading deletion. It does not validate Neon networking, real embeddings, or the complete deployed workflow.

## Rollback

Switch the app back to the previous deployment and its original database connection. Do not run db:rollback casually: migration 016's down script deletes the new vectors (source document chunks remain). The original Qdrant service would still be needed by the previous code for real persistent search.
