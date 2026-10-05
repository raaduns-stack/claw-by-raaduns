import { db } from "./db.js";
import { decryptSecret, encryptSecret } from "./crypto.js";

export type StoredPlatform = {
  id: string;
  sourceId: string;
  name: string;
  baseUrl: string;
  adapterType: string;
  enabled: boolean;
  authState: string;
  lastAuthenticatedAt?: Date;
  lastHealthCheckAt?: Date;
  lastError?: string;
};

export type PlatformCredentials = Record<string, string>;

function map(row: Record<string, unknown>): StoredPlatform {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    name: String(row.name),
    baseUrl: String(row.base_url),
    adapterType: String(row.adapter_type),
    enabled: Boolean(row.enabled),
    authState: String(row.auth_state),
    lastAuthenticatedAt: row.last_authenticated_at ? new Date(String(row.last_authenticated_at)) : undefined,
    lastHealthCheckAt: row.last_health_check_at ? new Date(String(row.last_health_check_at)) : undefined,
    lastError: row.last_error ? String(row.last_error) : undefined
  };
}

export async function listSourcePlatforms(): Promise<StoredPlatform[]> {
  const result = await db.query(
    "SELECT id,source_id,name,base_url,adapter_type,enabled,auth_state,last_authenticated_at,last_health_check_at,last_error FROM source_platforms ORDER BY name"
  );
  return result.rows.map(map);
}

export async function getSourcePlatform(sourceId: string): Promise<StoredPlatform | null> {
  const result = await db.query(
    "SELECT id,source_id,name,base_url,adapter_type,enabled,auth_state,last_authenticated_at,last_health_check_at,last_error FROM source_platforms WHERE source_id=$1",
    [sourceId]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

export async function upsertSourcePlatform(input: {
  sourceId: string;
  name: string;
  baseUrl: string;
  adapterType: string;
  enabled?: boolean;
}) {
  const result = await db.query(
    `INSERT INTO source_platforms (source_id,name,base_url,adapter_type,enabled,updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (source_id) DO UPDATE SET
       name=EXCLUDED.name, base_url=EXCLUDED.base_url, adapter_type=EXCLUDED.adapter_type,
       enabled=EXCLUDED.enabled, updated_at=NOW()
     RETURNING id,source_id,name,base_url,adapter_type,enabled,auth_state,last_authenticated_at,last_health_check_at,last_error`,
    [input.sourceId, input.name, input.baseUrl, input.adapterType, input.enabled ?? true]
  );
  return map(result.rows[0]);
}

export async function storePlatformCredentials(sourceId: string, credentials: PlatformCredentials) {
  const encrypted = encryptSecret(credentials);
  await db.query(
    `UPDATE source_platforms
     SET credentials_ciphertext=$2, credentials_iv=$3, credentials_auth_tag=$4,
         auth_state='NOT_AUTHENTICATED', last_error=NULL, updated_at=NOW()
     WHERE source_id=$1`,
    [sourceId, encrypted.ciphertext, encrypted.iv, encrypted.authTag]
  );
}

export async function loadPlatformCredentials(sourceId: string): Promise<PlatformCredentials | null> {
  const result = await db.query(
    "SELECT credentials_ciphertext,credentials_iv,credentials_auth_tag FROM source_platforms WHERE source_id=$1",
    [sourceId]
  );
  const row = result.rows[0];
  if (!row?.credentials_ciphertext || !row.credentials_iv || !row.credentials_auth_tag) return null;
  return decryptSecret<PlatformCredentials>(
    String(row.credentials_ciphertext),
    String(row.credentials_iv),
    String(row.credentials_auth_tag)
  );
}

export async function updatePlatformAuthState(sourceId: string, authState: string, error?: string) {
  await db.query(
    `UPDATE source_platforms
     SET auth_state=$2,
         last_authenticated_at=CASE WHEN $2='AUTHENTICATED' THEN NOW() ELSE last_authenticated_at END,
         last_health_check_at=NOW(), last_error=$3, updated_at=NOW()
     WHERE source_id=$1`,
    [sourceId, authState, error ?? null]
  );
}
