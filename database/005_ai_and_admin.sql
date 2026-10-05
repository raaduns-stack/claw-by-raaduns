CREATE TABLE IF NOT EXISTS ai_provider_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  default_provider TEXT NOT NULL,
  credentials_ciphertext TEXT,
  credentials_iv TEXT,
  credentials_auth_tag TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_provider_config TO claw_raaduns;
