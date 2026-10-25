-- Public search-result metadata only; never private PDF content or account details.
CREATE TABLE IF NOT EXISTS exam_source_cache (
  context_key TEXT PRIMARY KEY,
  sources JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS exam_search_months (
  month DATE PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0)
);
CREATE TABLE IF NOT EXISTS exam_search_student_days (
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (student_id, day)
);
