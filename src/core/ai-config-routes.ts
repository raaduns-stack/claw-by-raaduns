import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPublicAiConfig, getAiConfig, saveAiConfig } from "./ai-config-repository.js";
import { generateWithFallback } from "./ai-provider.js";
import { requireAdmin } from "./admin-auth.js";

const schema=z.object({defaultProvider:z.enum(["openai-cli","openai-api","gemini-api","groq-api"]),openaiApiKey:z.string().optional(),openaiModel:z.string().min(1),geminiApiKey:z.string().optional(),geminiModel:z.string().min(1),groqApiKey:z.string().optional(),groqModel:z.string().min(1)});

export function registerAiConfigRoutes(app:FastifyInstance){
  app.get("/api/ai/config",async(request,reply)=>{if(!requireAdmin(request,reply))return;return reply.send(await getPublicAiConfig());});
  app.put("/api/ai/config",async(request,reply)=>{if(!requireAdmin(request,reply))return;const current=await getAiConfig();const body=schema.parse(request.body);await saveAiConfig({defaultProvider:body.defaultProvider,openaiApiKey:body.openaiApiKey||current.openaiApiKey,openaiModel:body.openaiModel,geminiApiKey:body.geminiApiKey||current.geminiApiKey,geminiModel:body.geminiModel,groqApiKey:body.groqApiKey||current.groqApiKey,groqModel:body.groqModel});return reply.send(await getPublicAiConfig());});
  app.post("/api/ai/test",async(request,reply)=>{if(!requireAdmin(request,reply))return;const body=z.object({provider:z.enum(["openai-cli","openai-api","gemini-api","groq-api"])}).parse(request.body);try{const result=await generateWithFallback({system:"Return JSON only.",prompt:"Return exactly {\"ok\":true}.",model:undefined,maxOutputTokens:50});return reply.send({success:true,requestedProvider:body.provider,provider:result.provider,model:result.model});}catch(error){return reply.code(502).send({success:false,error:error instanceof Error?error.message:"AI provider test failed"});}});
}
