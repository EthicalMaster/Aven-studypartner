CREATE TABLE material_summaries (
  material_id UUID PRIMARY KEY REFERENCES study_materials(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_parts INTEGER NOT NULL CHECK (total_parts > 0),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  error TEXT,
  model TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
