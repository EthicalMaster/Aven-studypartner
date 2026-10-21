# Free-hosting preview preparation

## What is implemented

- `EMBEDDING_BACKEND=onnx` selects the quantized BGE encoder inside the existing
  Python JSON-line runner. `torch` remains the local default. There is no synthetic
  fallback in production. The ONNX model revision is pinned and telemetry disabled.
- ONNX processes one text at a time, using one CPU thread, CLS pooling, the same
  query prefix, 512-token truncation and normalized 384-dimensional vectors.
- `Dockerfile.onnx` installs no PyTorch and caches the model during the build.
  Runtime inference is offline. NumPy 2.3.5 supports Debian's Python 3.11.
- `STORAGE_PROVIDER=supabase` stores uploads in a private bucket. Server-only
  credentials access objects after existing Aven session/ownership checks.
  Downloads use the storage abstraction rather than requiring a local path.
  Public buckets are rejected; storage outages propagate as errors.
- Upload memory buffering respects MAX_FILE_SIZE_MB. The candidate image uses 5 MB.
  File removal failure retains the database record for a retry. Object storage and
  database writes are not a single transaction; monitor orphan files on upload errors.

## Verification performed (21 October 2026)

- TypeScript check, production build, pgvector integration tests.
- Existing material tests: 15/15 (local storage and database ownership).
- Supabase adapter tests through the real SDK with mocked HTTP: round trip,
  new adapter instance, deletion, missing objects, unsafe keys, public bucket and outage.
  This is NOT a real Supabase account test.
- Real ONNX model via the application's Python runner: generated PDF extraction,
  correct passage ranking, 16 long chunks, three queued queries, runner restart.
- Compiled production-mode application HTTP startup and unauthenticated download rejection.
- Compiled Node smoke-test peak RSS: 151.90 MiB. Separate ONNX benchmark peak:
  175.32 MiB; eight of eight synthetic retrieval questions correct.
  The sum (~327 MiB) is a planning estimate, NOT a simultaneous cgroup measurement.
  Development tsx tooling measured much higher and must not run on the small host.

No real Neon credentials, Supabase bucket or Render deployment were used here.
Docker is unavailable in this environment, so neither Docker build nor a 512 MiB
container limit has been validated. Authenticated end-to-end upload/download/search,
multiple concurrent uploads, large/complex PDFs and host restart remain preview gates.
PDF file size does not bound parser memory. The embedding queue is still in-process;
interrupted jobs must be retried. Do not claim production readiness from these tests.

## Local Windows opt-in test

Keep your existing .venv. Create a separate environment:

```powershell
npm ci
py -3.13 -m venv .venv-onnx
.\.venv-onnx\Scripts\python.exe -m pip install -r requirements-embedding-onnx.txt
```

In your private `.env`, set:

```dotenv
EMBEDDING_BACKEND=onnx
EMBEDDING_PYTHON_PATH=C:/Users/saife/Downloads/Aven-studypartner/.venv-onnx/Scripts/python.exe
EMBEDDING_BATCH_SIZE=1
EMBEDDING_WORKER_CONCURRENCY=1
MAX_FILE_SIZE_MB=5
```

If PowerShell still has a previous override, update it before starting:

```powershell
$env:EMBEDDING_PYTHON_PATH = "$PWD\.venv-onnx\Scripts\python.exe"
$env:EMBEDDING_BACKEND = "onnx"
npm run dev
```

Upload a new small PDF and test known facts. Quantization slightly changes vectors;
re-generate existing document vectors consistently before production cutover. Do not
rely on eight synthetic examples as proof of compatibility for every existing PDF.

## Private PDF storage

Use a Supabase Free project and create a PRIVATE bucket named `aven-materials`.
Keep public access OFF. Set its upload limit to 5 MB; allow application/pdf,
text/plain, text/markdown and text/x-markdown if you want all supported formats.
Do not add anonymous read/write policies. This app uses its own sessions and Neon
ownership, not Supabase Auth; the backend holds the privileged storage key.

Set only in `.env` locally and server secret settings on the host:

```dotenv
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_STORAGE_BUCKET=aven-materials
```

Use the project's secret key (or legacy service_role key), not an anon/publishable
key. Never prefix it with VITE_, paste it into chat or commit it. The app checks the
bucket is private on every operation. An administrator must keep it private.

Existing local PDF files are NOT moved automatically. Re-upload the PDFs you need
after switching storage. Existing extracted text and vectors remain in Neon.
Monitor the project-wide free storage/egress quotas; Aven's quota is per student,
not a reservation or global billing limit. Use a dedicated bucket for this app.

## Render preview (only after local checks)

Create a Free Docker web service from the updated branch and select
`Dockerfile.onnx`. Do not deploy the old PyTorch Dockerfile on this memory budget.
Provide DATABASE_URL (Neon, SSL), the four storage settings above, and set
STORAGE_QUOTA_MB=50, MAX_ACTIVE_MATERIALS=10, MAX_FILE_SIZE_MB=5,
EMBEDDING_BATCH_SIZE=1, EMBEDDING_WORKER_CONCURRENCY=1. Keep the free plan selected.
Use the built `npm start`; never npm run dev. This image does not run migrations
at startup: run npm run db:migrate locally against the intended database first.

The free web service sleeps when idle. Its filesystem is ephemeral: cloud storage
must pass the real round-trip/restart test before using it for retained PDFs.

Before replacing Railway: sign in, upload, wait for vectors, search a known fact,
download the original file, restart the service, repeat search/download, check a
second account cannot access the first document, and inspect memory logs during
uploads. Sync any new Railway data since the original backup before cutting over.
Keep your original database backup. Stop if the preview is killed for memory usage.

## Rollback

Switch EMBEDDING_BACKEND back to torch and select the old .venv Python path locally.
Changing STORAGE_PROVIDER back to local does not copy cloud files back. Keep the
same storage provider for documents uploaded there, or explicitly migrate/reupload
files. Neither path deletes the Neon database. No automatic production switch is made.

## Sources checked

- https://supabase.com/docs/reference/javascript/storage-from-upload
- https://supabase.com/docs/reference/javascript/storage-from-download
- https://supabase.com/docs/reference/javascript/storage-from-remove
- https://supabase.com/changelog/cbc-tls-ciphers-deprecated (Node 22 supports modern TLS)
- https://render.com/docs/free
