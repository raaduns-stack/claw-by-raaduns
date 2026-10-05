import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  PGHOST: z.string().default("127.0.0.1"),
  PGPORT: z.coerce.number().default(5432),
  PGDATABASE: z.string().min(1),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "CREDENTIAL_ENCRYPTION_KEY must be 32-byte hex"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().regex(/^[0-9a-fA-F]{64}$/, "ADMIN_SESSION_SECRET must be 32-byte hex"),
  AI_DEFAULT_PROVIDER: z.enum(["openai-cli", "openai-api", "gemini-api", "groq-api"]).default("openai-cli"),
  CODEX_HOME: z.string().optional(),
  CODEX_BIN: z.string().default("codex"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.6-flash"),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b")
});

export const config = schema.parse(process.env);
