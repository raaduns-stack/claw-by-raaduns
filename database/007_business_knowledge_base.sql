CREATE TABLE IF NOT EXISTS business_profiles (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  legal_name TEXT,
  trading_name TEXT,
  business_type TEXT,
  registration_number TEXT,
  tax_number TEXT,
  registration_jurisdiction TEXT,
  website TEXT,
  addresses JSONB NOT NULL DEFAULT '[]',
  contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  authorized_representatives JSONB NOT NULL DEFAULT '[]',
  services JSONB NOT NULL DEFAULT '[]',
  industries JSONB NOT NULL DEFAULT '[]',
  technical_capabilities JSONB NOT NULL DEFAULT '[]',
  delivery_capabilities JSONB NOT NULL DEFAULT '[]',
  geographic_coverage JSONB NOT NULL DEFAULT '[]',
  staffing_capacity JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipment_resources JSONB NOT NULL DEFAULT '[]',
  partners_subcontractors JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  issuer TEXT,
  evidence_uri TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  owner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_experience_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  client_name TEXT,
  client_sector TEXT,
  opportunity_type TEXT,
  services JSONB NOT NULL DEFAULT '[]',
  industries JSONB NOT NULL DEFAULT '[]',
  location TEXT,
  start_date DATE,
  end_date DATE,
  contract_value NUMERIC,
  currency TEXT,
  scope TEXT,
  outcome TEXT,
  reference_available BOOLEAN NOT NULL DEFAULT FALSE,
  reference_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_uri TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_bid_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  storage_uri TEXT,
  content TEXT,
  version TEXT,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  storage_uri TEXT,
  source TEXT,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  owner TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_operating_policies (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  allowed_actions JSONB NOT NULL DEFAULT '[]',
  prohibited_actions JSONB NOT NULL DEFAULT '[]',
  commercial_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_conditions JSONB NOT NULL DEFAULT '[]',
  learning_boundaries JSONB NOT NULL DEFAULT '[]',
  policy_restrictions JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_compliance_business ON business_compliance_records(business_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_business_experience_business ON business_experience_records(business_id, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_assets_business ON business_bid_assets(business_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_business_knowledge_business ON business_knowledge_documents(business_id, document_type);

INSERT INTO business_profiles (business_id) SELECT id FROM businesses ON CONFLICT DO NOTHING;
INSERT INTO business_operating_policies (business_id) SELECT id FROM businesses ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON business_profiles, business_compliance_records, business_experience_records, business_bid_assets, business_knowledge_documents, business_operating_policies TO claw_raaduns;