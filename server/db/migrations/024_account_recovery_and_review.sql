CREATE TABLE password_recovery_codes (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE password_change_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), method TEXT NOT NULL CHECK(method IN ('otp','current_password'))
);
CREATE INDEX ON password_change_events(user_id,changed_at);
CREATE TABLE recovery_rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON recovery_rate_limits(expires_at);
ALTER TABLE quiz_question_reports ADD COLUMN reviewer_note TEXT;
ALTER TABLE quiz_question_reports ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quiz_question_reports ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE flashcards ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE question_report_review_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), report_id UUID NOT NULL REFERENCES quiz_question_reports(id) ON DELETE CASCADE,
 reviewer_id UUID NOT NULL REFERENCES users(id), status TEXT NOT NULL CHECK(status IN ('resolved','dismissed','pending_review')),
 note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
