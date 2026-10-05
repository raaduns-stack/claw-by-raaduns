import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import { config } from "./config.js";
import { listDashboardData } from "../capabilities/qualify-and-bid/repository.js";
import { registerQualifyAndBidRoutes } from "../capabilities/qualify-and-bid/routes.js";
import { registerPlatformRoutes } from "../capabilities/qualify-and-bid/platform-routes.js";
import { registerAdminAuthRoutes, requireAdmin } from "./admin-auth.js";
import { registerAiConfigRoutes } from "./ai-config-routes.js";
import { registerBusinessRoutes } from "./business-routes.js";
import { registerBusinessKnowledgeRoutes } from "./business-knowledge-routes.js";
import { registerCapabilityRoutes } from "./capability-routes.js";
const dashboardPath=new URL("../../public/index.html",import.meta.url);
export const app=Fastify({logger:true});
app.addHook("onRequest",async(request,reply)=>{if(request.url.startsWith("/api/")&&!request.url.startsWith("/api/auth/")&&!requireAdmin(request,reply))return reply;});
app.get("/",async(_request,reply)=>{const html=await readFile(dashboardPath,"utf8");return reply.header("Cache-Control","no-store, no-cache, must-revalidate").type("text/html; charset=utf-8").send(html);});
app.get("/api/dashboard/data",async(request)=>{const q=request.query as {businessId?:string};return listDashboardData(q.businessId)});
app.get("/health",async()=>({status:"ok",service:"staff-claw-core"}));
registerAdminAuthRoutes(app);registerAiConfigRoutes(app);registerBusinessRoutes(app);registerBusinessKnowledgeRoutes(app);registerCapabilityRoutes(app);registerPlatformRoutes(app);registerQualifyAndBidRoutes(app);
export async function startServer(){await app.listen({port:config.PORT,host:"127.0.0.1"});}
