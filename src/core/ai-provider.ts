import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { config } from "./config.js";
import { getAiConfig } from "./ai-config-repository.js";

export type AiProviderId = "openai-cli" | "openai-api" | "gemini-api" | "groq-api";
export type AiRequest = { system: string; prompt: string; model?: string; maxOutputTokens?: number };
export type AiResponse = { provider: AiProviderId; model: string; text: string };
export class AiProviderError extends Error { constructor(message: string, readonly provider: AiProviderId) { super(message); this.name = "AiProviderError"; } }
export interface AiProvider { readonly id: AiProviderId; generate(request: AiRequest): Promise<AiResponse>; }

async function httpJson(url: string, init: RequestInit, provider: AiProviderId): Promise<any> {
  const response = await fetch(url, init); const body = await response.text();
  if (!response.ok) throw new AiProviderError(`${provider} HTTP ${response.status}`, provider);
  try { return JSON.parse(body); } catch { throw new AiProviderError(`${provider} returned invalid JSON`, provider); }
}

class CodexCliProvider implements AiProvider {
  readonly id = "openai-cli" as const;
  async generate(request: AiRequest): Promise<AiResponse> {
    const outputFile = join(tmpdir(), `staff-claw-codex-${randomUUID()}.txt`); const prompt = `${request.system}\n\n${request.prompt}`;
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(config.CODEX_BIN, ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "-o", outputFile, "-"], { env: { ...process.env, ...(config.CODEX_HOME ? { CODEX_HOME: config.CODEX_HOME } : {}) }, stdio: ["pipe", "ignore", "pipe"] });
        let stderr = ""; child.stderr.on("data", chunk => { stderr += String(chunk); });
        child.on("error", error => reject(new AiProviderError(`OpenAI CLI unavailable: ${error.message}`, this.id)));
        child.on("close", code => code === 0 ? resolve() : reject(new AiProviderError(`OpenAI CLI failed${stderr ? `: ${stderr.slice(0, 300)}` : ""}`, this.id)));
        child.stdin.end(prompt);
      });
      const text = (await readFile(outputFile, "utf8")).trim(); if (!text) throw new AiProviderError("OpenAI CLI returned empty output", this.id);
      return { provider: this.id, model: request.model ?? "codex-default", text };
    } finally { await unlink(outputFile).catch(() => undefined); }
  }
}

class OpenAiApiProvider implements AiProvider {
  readonly id = "openai-api" as const;
  async generate(request: AiRequest): Promise<AiResponse> {
    const cfg = await getAiConfig(); if (!cfg.openaiApiKey) throw new AiProviderError("OpenAI API key is not configured", this.id);
    const model = request.model ?? cfg.openaiModel;
    const body = await httpJson("https://api.openai.com/v1/responses", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${cfg.openaiApiKey}`}, body:JSON.stringify({model,store:false,instructions:request.system,input:request.prompt,max_output_tokens:request.maxOutputTokens??1200}) }, this.id);
    const text = String(body.output_text ?? "").trim(); if (!text) throw new AiProviderError("OpenAI API returned empty output", this.id); return {provider:this.id,model,text};
  }
}

class GeminiApiProvider implements AiProvider {
  readonly id = "gemini-api" as const;
  async generate(request: AiRequest): Promise<AiResponse> {
    const cfg = await getAiConfig(); if (!cfg.geminiApiKey) throw new AiProviderError("Gemini API key is not configured", this.id);
    const model = request.model ?? cfg.geminiModel;
    const body = await httpJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":cfg.geminiApiKey},body:JSON.stringify({systemInstruction:{parts:[{text:request.system}]},contents:[{role:"user",parts:[{text:request.prompt}]}],generationConfig:{maxOutputTokens:request.maxOutputTokens??1200,responseMimeType:"application/json"}})}, this.id);
    const text = String(body.candidates?.[0]?.content?.parts?.map((p:any)=>p.text??"").join("")??"").trim(); if(!text) throw new AiProviderError("Gemini API returned empty output",this.id); return {provider:this.id,model,text};
  }
}

class GroqApiProvider implements AiProvider {
  readonly id = "groq-api" as const;
  async generate(request: AiRequest): Promise<AiResponse> {
    const cfg = await getAiConfig(); if (!cfg.groqApiKey) throw new AiProviderError("Groq API key is not configured", this.id);
    const model = request.model ?? cfg.groqModel;
    const body = await httpJson("https://api.groq.com/openai/v1/chat/completions", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${cfg.groqApiKey}`},body:JSON.stringify({model,messages:[{role:"system",content:request.system},{role:"user",content:request.prompt}],max_completion_tokens:request.maxOutputTokens??1200,temperature:0})},this.id);
    const text=String(body.choices?.[0]?.message?.content??"").trim(); if(!text) throw new AiProviderError("Groq API returned empty output",this.id); return {provider:this.id,model,text};
  }
}

const providers: Record<AiProviderId,AiProvider>={"openai-cli":new CodexCliProvider(),"openai-api":new OpenAiApiProvider(),"gemini-api":new GeminiApiProvider(),"groq-api":new GroqApiProvider()};

export async function configuredAiProviders(): Promise<AiProviderId[]> {
  const cfg=await getAiConfig(); const candidates:AiProviderId[]=[cfg.defaultProvider,"openai-cli","openai-api","gemini-api","groq-api"]; const result:AiProviderId[]=[];
  for(const id of candidates){if(result.includes(id))continue;if(id==="openai-cli"||(id==="openai-api"&&cfg.openaiApiKey)||(id==="gemini-api"&&cfg.geminiApiKey)||(id==="groq-api"&&cfg.groqApiKey))result.push(id);}
  return result;
}

export async function generateWithFallback(request:AiRequest):Promise<AiResponse>{
  const order=await configuredAiProviders(); let lastError:unknown;
  for(const id of order){try{return await providers[id].generate(request);}catch(error){lastError=error;}}
  throw lastError instanceof Error?lastError:new Error("No AI provider succeeded");
}
