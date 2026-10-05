ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_opportunities_source_last_seen
  ON opportunities(source_id, last_seen_at DESC);
