import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSourcePlatform, listSourcePlatforms, storePlatformCredentials, updatePlatformAuthState, upsertSourcePlatform } from "../../core/source-platform-repository.js";
import { NaijaBusinessAdapter } from "./adapters.js";

const platformSchema = z.object({sourceId:z.string().regex(/^[a-z0-9_-]+$/),name:z.string().min(1),baseUrl:z.string().url(),adapterType:z.string().min(1),enabled:z.boolean().default(true)});
const credentialsSchema = z.object({username:z.string().min(1),password:z.string().min(1)});

export function registerPlatformRoutes(app: FastifyInstance) {
  app.get("/api/platforms", async () => listSourcePlatforms());
  app.post("/api/platforms", async (request, reply) => {
    const input=platformSchema.parse(request.body); const platform=await upsertSourcePlatform(input); return reply.code(201).send(platform);
  });
  app.put("/api/platforms/:sourceId/credentials", async (request, reply) => {
    const sourceId=String((request.params as {sourceId:string}).sourceId); const credentials=credentialsSchema.parse(request.body);
    const platform=await getSourcePlatform(sourceId); if(!platform)return reply.code(404).send({error:"Platform not found"});
    await storePlatformCredentials(sourceId,credentials); return reply.send({sourceId,stored:true});
  });
  app.post("/api/platforms/:sourceId/login", async (request, reply) => {
    const sourceId=String((request.params as {sourceId:string}).sourceId); const platform=await getSourcePlatform(sourceId);
    if(!platform)return reply.code(404).send({error:"Platform not found"});
    if(platform.adapterType!=="naijabusiness"){await updatePlatformAuthState(sourceId,"ERROR","No login adapter is registered for this platform.");return reply.code(400).send({error:"Login adapter not implemented for this platform"});}
    const adapter=new NaijaBusinessAdapter({sourceId:platform.sourceId,name:platform.name,baseUrl:platform.baseUrl,adapterType:platform.adapterType});
    const authState=await adapter.authenticate(); return reply.send({sourceId,authState});
  });
}