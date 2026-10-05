CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  source_opportunity_id TEXT,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  issuing_organization TEXT,
  industry TEXT,
  location TEXT,
  contract_value NUMERIC,
  currency TEXT,
  closing_at TIMESTAMPTZ,
  requirements JSONB NOT NULL DEFAULT '[]',
  eligibility_requirements JSONB NOT NULL DEFAULT '[]',
  capabilities_required JSONB NOT NULL DEFAULT '[]',
  certifications_required JSONB NOT NULL DEFAULT '[]',
  experience_required JSONB NOT NULL DEFAULT '[]',
  source_evidence JSONB NOT NULL DEFAULT '[]',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, source_opportunity_id)
);

CREATE TABLE IF NOT EXISTS qualification_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  decision TEXT NOT NULL,
  score NUMERIC,
  reasons JSONB NOT NULL DEFAULT '[]',
  missing_requirements JSONB NOT NULL DEFAULT '[]',
  estimated_cost NUMERIC,
  estimated_profit NUMERIC,
  estimated_margin NUMERIC,
  confidence NUMERIC,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  action TEXT NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);