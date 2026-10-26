-- Additive catalog: existing questions and study history are not rewritten.
CREATE TABLE curriculum_contexts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), level TEXT NOT NULL CHECK(level IN ('school','university')),
 authority TEXT NOT NULL, program TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL,
 curriculum_version TEXT NOT NULL, source_url TEXT NOT NULL,
 review_note TEXT NOT NULL, reviewed_by TEXT NOT NULL,
 published BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(level,authority,program,stage,curriculum_version)
);
CREATE TABLE curriculum_question_placements (
 context_id UUID NOT NULL REFERENCES curriculum_contexts(id) ON DELETE CASCADE,
 question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE RESTRICT,
 unit TEXT NOT NULL, source_url TEXT NOT NULL, review_note TEXT NOT NULL,
 PRIMARY KEY(context_id,question_id)
);
CREATE INDEX ON curriculum_question_placements(question_id);
ALTER TABLE quizzes ADD COLUMN curriculum_snapshot JSONB;
