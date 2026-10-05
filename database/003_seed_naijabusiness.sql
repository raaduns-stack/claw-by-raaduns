INSERT INTO source_platforms (source_id, name, base_url, adapter_type, enabled)
VALUES ('naijabusiness', 'NaijaBusiness', 'https://www.naijabusiness.com.ng', 'naijabusiness', TRUE)
ON CONFLICT (source_id) DO UPDATE SET
  name=EXCLUDED.name,
  base_url=EXCLUDED.base_url,
  adapter_type=EXCLUDED.adapter_type,
  updated_at=NOW();
