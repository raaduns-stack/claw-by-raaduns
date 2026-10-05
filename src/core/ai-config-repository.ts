import { db } from "./db.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import type { AiProviderId } from "./ai-provider.js";

export type AiConfig = {
  defaultProvider: AiProviderId;
  openaiApiKey?: string;
  openaiModel: string;
  geminiApiKey?: string;
  geminiModel: string;
  groqApiKey?: string;
  groqModel: string;
};

const defaults: AiConfig = {
  defaultProvider: "openai-cli",
  openaiModel: "gpt-5",
  geminiModel: "gemini-3.6-flash",
  groqModel: "openai/gpt-oss-120b"
};

export async function getAiConfig(): Promise<AiConfig> {
  const result = await db.query("SELECT default_provider,credentials_ciphertext,credentials_iv,credentials_auth_tag FROM ai_provider_config WHERE id=TRUE");
  const row = result.rows[0];
  if (!row) return defaults;
  const secrets = row.credentials_ciphertext ? decryptSecret<Partial<AiConfig>>(String(row.credentials_ciphertext), String(row.credentials_iv), String(row.credentials_auth_tag)) : {};
  return {
    ...defaults,
    ...secrets,
    defaultProvider: String(row.default_provider) as AiProviderId
  };
}

export async function saveAiConfig(input: AiConfig) {
  const encrypted = encryptSecret({
    openaiApiKey: input.openaiApiKey,
    openaiModel: input.openaiModel,
    geminiApiKey: input.geminiApiKey,
    geminiModel: input.geminiModel,
    groqApiKey: input.groqApiKey,
    groqModel: input.groqModel
  });
  await db.query(`INSERT INTO ai_provider_config (id,default_provider,credentials_ciphertext,credentials_iv,credentials_auth_tag,updated_at)
    VALUES (TRUE,$1,$2,$3,$4,NOW())
    ON CONFLICT (id) DO UPDATE SET default_provider=EXCLUDED.default_provider,credentials_ciphertext=EXCLUDED.credentials_ciphertext,credentials_iv=EXCLUDED.credentials_iv,credentials_auth_tag=EXCLUDED.credentials_auth_tag,updated_at=NOW()`,
    [input.defaultProvider, encrypted.ciphertext, encrypted.iv, encrypted.authTag]);
}

export async function getPublicAiConfig() {
  const value = await getAiConfig();
  return {
    defaultProvider: value.defaultProvider,
    openaiConfigured: Boolean(value.openaiApiKey), openaiModel: value.openaiModel,
    geminiConfigured: Boolean(value.geminiApiKey), geminiModel: value.geminiModel,
    groqConfigured: Boolean(value.groqApiKey), groqModel: value.groqModel
  };
}
