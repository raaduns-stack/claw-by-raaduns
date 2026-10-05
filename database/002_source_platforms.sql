CREATE TABLE IF NOT EXISTS source_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  credentials_ciphertext TEXT,
  credentials_iv TEXT,
  credentials_auth_tag TEXT,
  auth_state TEXT NOT NULL DEFAULT 'NOT_AUTHENTICATED',
  last_authenticated_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_platforms_enabled ON source_platforms(enabled);

CREATE TABLE IF NOT EXISTS source_platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES source_platforms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON source_platforms, source_platform_events TO claw_raaduns;
