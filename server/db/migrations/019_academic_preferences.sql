CREATE TABLE academic_generation_preferences (
  student_id UUID PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
