CREATE TABLE IF NOT EXISTS quiz_question_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
 question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
 session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
 reason TEXT NOT NULL CHECK(reason IN ('incorrect_answer','unclear_question','source_mismatch','other')),
 note TEXT NOT NULL CHECK(length(note) BETWEEN 5 AND 1000),
 status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','resolved','dismissed')),
 question_snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(student_id,question_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_reports_student_updated ON quiz_question_reports(student_id,updated_at DESC);
