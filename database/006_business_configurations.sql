CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','disabled')),
  qualification_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qualification_decisions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_decisions_business ON qualification_decisions(business_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_business ON agent_actions(business_id, created_at DESC);

INSERT INTO businesses (slug,name,status)
VALUES
  ('raa-n-business-solutions','Raa N Business Solutions','draft'),
  ('raa-software-solutions','Raa Software Solutions','draft'),
  ('raa-home-n-properties','Raa Home N Properties','draft')
ON CONFLICT (slug) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO claw_raaduns;
