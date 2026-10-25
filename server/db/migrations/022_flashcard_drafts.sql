ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source_evidence TEXT;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source_page INTEGER;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS user_edited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE flashcards ALTER COLUMN subject TYPE VARCHAR(120);
CREATE TABLE IF NOT EXISTS flashcard_generation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject VARCHAR(120) NOT NULL,
  topic VARCHAR(150) NOT NULL,
  cards JSONB NOT NULL,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  committed_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, material_id)
);
ALTER TABLE flashcards ALTER COLUMN key_concept TYPE VARCHAR(160);
