import type { FastifyInstance } from "fastify";
import { listCapabilities } from "./capability-registry.js";

export function registerCapabilityRoutes(app: FastifyInstance) {
  app.get("/api/capabilities", async () => listCapabilities());
}
