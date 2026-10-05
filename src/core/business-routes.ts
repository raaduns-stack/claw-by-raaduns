import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listBusinesses, upsertBusiness } from "./business-repository.js";
const profile=z.object({allowedOpportunityTypes:z.array(z.enum(["tender","contract","eoi","rfq","other"])).optional(),excludedIndustries:z.array(z.string()).optional(),excludedLocations:z.array(z.string()).optional(),minimumContractValue:z.number().nonnegative().optional(),minimumMargin:z.number().optional(),minimumLeadTimeDays:z.number().nonnegative().optional(),capabilities:z.array(z.string()).optional(),certifications:z.array(z.string()).optional(),experienceKeywords:z.array(z.string()).optional()});
const schema=z.object({id:z.string().uuid().optional(),slug:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(1),status:z.enum(["draft","active","disabled"]).default("draft"),qualificationProfile:profile.default({})});
export function registerBusinessRoutes(app:FastifyInstance){
 app.get("/api/businesses",async()=>listBusinesses());
 app.put("/api/businesses",async(request,reply)=>{const input=schema.parse(request.body);const business=await upsertBusiness(input);return reply.send(business)});
}
