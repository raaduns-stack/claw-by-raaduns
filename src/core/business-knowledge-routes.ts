import type { FastifyInstance } from "fastify";
import { getBusinessKnowledge,upsertBusinessProfile,upsertOperatingPolicy,insertRecord,deleteRecord } from "./business-knowledge-repository.js";
import { getBusiness } from "./business-repository.js";
export function registerBusinessKnowledgeRoutes(app:FastifyInstance){
 app.get("/api/businesses/:businessId/knowledge",async(request,reply)=>{const {businessId}=request.params as {businessId:string};const data=await getBusinessKnowledge(businessId);if(!data)return reply.code(404).send({error:"Business not found"});return data;});
 app.put("/api/businesses/:businessId/profile",async(request,reply)=>{const {businessId}=request.params as {businessId:string};if(!await getBusiness(businessId))return reply.code(404).send({error:"Business not found"});return upsertBusinessProfile(businessId,(request.body??{}) as Record<string,unknown>);});
 app.put("/api/businesses/:businessId/policy",async(request)=>{const {businessId}=request.params as {businessId:string};return upsertOperatingPolicy(businessId,(request.body??{}) as Record<string,unknown>);});

for(const kind of ["compliance","experience","asset","document"] as const){
 app.post(`/api/businesses/:businessId/${kind}`,async(request,reply)=>{const {businessId}=request.params as {businessId:string};if(!await getBusiness(businessId))return reply.code(404).send({error:"Business not found"});return insertRecord(kind,businessId,(request.body??{}) as Record<string,unknown>);});
 app.delete(`/api/businesses/:businessId/${kind}/:id`,async(request)=>{const p=request.params as {businessId:string;id:string};await deleteRecord(kind,p.id,p.businessId);return {ok:true};});
}
}