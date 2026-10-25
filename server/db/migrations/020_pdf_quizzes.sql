-- Saved PDF papers are private snapshots; deleting a PDF preserves attempt history.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source_material_id UUID REFERENCES study_materials(id) ON DELETE SET NULL;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generation_key TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generation_metadata JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_quizzes_generation ON quizzes(student_id, generation_key) WHERE generation_key IS NOT NULL;
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS chk_quizzes_question_count;
ALTER TABLE quizzes ADD CONSTRAINT chk_quizzes_question_count CHECK (question_count BETWEEN 1 AND 100);
ALTER TABLE quizzes ALTER COLUMN subject TYPE VARCHAR(120);
