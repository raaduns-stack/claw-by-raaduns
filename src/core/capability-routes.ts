import type { FastifyInstance } from "fastify";
import { listCapabilities } from "./capability-registry.js";

export function registerCapabilityRoutes(app: FastifyInstance) {
  app.get("/api/capabilities", async () => listCapabilities());
}

[executed on device: mail.quicrefill.com (657bc0f0-b268-4295-8ef1-fac3aa0eceb5)]