import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { QualificationProfile } from "./qualification.js";
import { getOpportunity, recordAction, saveOpportunity, saveQualificationDecision } from "./repository.js";
import type { Opportunity } from "../../core/types.js";
import { getSourcePlatform } from "../../core/source-platform-repository.js";
import { getBusiness } from "../../core/business-repository.js";
import { NaijaBusinessAdapter } from "./adapters.js";
import { aiQualifyOpportunity } from "./ai-qualification.js";

const opportunitySchema = z.object({
  sourceId: z.string().min(1),
  sourceOpportunityId: z.string().min(1).optional(),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  opportunityType: z.enum(["tender", "contract", "eoi", "rfq", "other"]),
  issuingOrganization: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  contractValue: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  closingAt: z.string().datetime().optional(),
  requirements: z.array(z.string()).default([]),
  eligibilityRequirements: z.array(z.string()).default([]),
  capabilitiesRequired: z.array(z.string()).default([]),
  certificationsRequired: z.array(z.string()).default([]),
  experienceRequired: z.array(z.string()).default([]),
  sourceEvidence: z.array(z.string()).default([])
});

export async function registerQualifyAndBidRoutes(app: FastifyInstance) {
  app.post("/api/qualify-and-bid/discover/:sourceId", async (request, reply) => {
    const sourceId = String((request.params as { sourceId: string }).sourceId);
    const query = z.object({ cursor: z.string().default("1") }).parse(request.query ?? {});
    const platform = await getSourcePlatform(sourceId);
    if (!platform) return reply.code(404).send({ error: "Source platform not found." });
    if (!platform.enabled) return reply.code(409).send({ error: "Source platform is disabled." });

    if (platform.adapterType !== "naijabusiness") {
      return reply.code(400).send({ error: "No discovery adapter is registered for this platform." });
    }

    const adapter = new NaijaBusinessAdapter({
      sourceId: platform.sourceId,
      name: platform.name,
      baseUrl: platform.baseUrl,
      adapterType: platform.adapterType
    });

    try {
      const discovered = await adapter.discover(query.cursor);
      const saved: Array<{ id: string; sourceOpportunityId?: string; title: string; isNew: boolean; changed: boolean }> = [];

      for (const opportunity of discovered.opportunities) {
        const stored = await saveOpportunity(opportunity);
        saved.push({ id: stored.id, sourceOpportunityId: opportunity.sourceOpportunityId, title: opportunity.title, isNew: stored.isNew, changed: stored.changed });
      }

      await recordAction(
        "QUALIFY_AND_BID",
        "DISCOVER_OPPORTUNITIES",
        undefined,
        `Discovered ${discovered.opportunities.length} opportunities from ${sourceId} page ${query.cursor}.`,
        "success"
      );

      return reply.send({
        sourceId,
        cursor: query.cursor,
        nextCursor: discovered.nextCursor,
        discovered: discovered.opportunities.length,
        newOpportunities: saved.filter(item => item.isNew).length,
        changedOpportunities: saved.filter(item => !item.isNew && item.changed).length,
        unchangedOpportunities: saved.filter(item => !item.isNew && !item.changed).length,
        persisted: saved.length,
        opportunities: saved
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Discovery failed.";
      await recordAction("QUALIFY_AND_BID", "DISCOVER_OPPORTUNITIES", undefined, message.slice(0, 500), "failure");
      return reply.code(502).send({ error: message });
    }
  });

  app.post("/api/qualify-and-bid/extract/:sourceId", async (request, reply) => {
    const sourceId = String((request.params as { sourceId: string }).sourceId);
    const body = z.object({ sourceOpportunityId: z.string().min(1) }).parse(request.body);
    const sourceOpportunityId = body.sourceOpportunityId;
    const platform = await getSourcePlatform(sourceId);
    if (!platform) return reply.code(404).send({ error: "Source platform not found." });
    if (!platform.enabled) return reply.code(409).send({ error: "Source platform is disabled." });
    if (platform.adapterType !== "naijabusiness") {
      return reply.code(400).send({ error: "No extraction adapter is registered for this platform." });
    }

    const adapter = new NaijaBusinessAdapter({
      sourceId: platform.sourceId,
      name: platform.name,
      baseUrl: platform.baseUrl,
      adapterType: platform.adapterType
    });

    try {
      const opportunity = await adapter.getOpportunity(sourceOpportunityId);
      const stored = await saveOpportunity(opportunity);
      await recordAction(
        "QUALIFY_AND_BID",
        "EXTRACT_OPPORTUNITY",
        stored.id,
        `Extracted source details for ${sourceId}:${sourceOpportunityId}.`,
        "success"
      );
      return reply.send({ id: stored.id, opportunity });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed.";
      await recordAction("QUALIFY_AND_BID", "EXTRACT_OPPORTUNITY", undefined, message.slice(0, 500), "failure");
      return reply.code(502).send({ error: message });
    }
  });

  app.post("/api/qualify-and-bid/opportunities", async (request, reply) => {
    const input = opportunitySchema.parse(request.body);
    const opportunity: Opportunity = {
      ...input,
      opportunityId: input.sourceOpportunityId
        ? input.sourceId + ":" + input.sourceOpportunityId
        : input.sourceId + ":" + crypto.randomUUID(),
      discoveredAt: new Date(),
      closingAt: input.closingAt ? new Date(input.closingAt) : undefined
    };
    const stored = await saveOpportunity(opportunity);
    await recordAction("QUALIFY_AND_BID", "CREATE_OPPORTUNITY", stored.id, "Normalized opportunity accepted.", "success");
    return reply.code(201).send({ id: stored.id, opportunity });
  });

  app.post("/api/qualify-and-bid/opportunities/:id/qualify", async (request, reply) => {
    const input = z.object({ businessId: z.string().uuid() }).parse(request.body);
    const business = await getBusiness(input.businessId);
    if (!business) return reply.code(404).send({ error: "Business not found." });
    if (business.status !== "active") return reply.code(409).send({ error: "Business qualification configuration is not active." });
    const profile = business.qualificationProfile as QualificationProfile;
    const opportunity = await getOpportunity(String((request.params as { id: string }).id));
    if (!opportunity) return reply.code(404).send({ error: "Opportunity not found." });

    const decision = await aiQualifyOpportunity(opportunity, profile);
    await saveQualificationDecision(business.id, String((request.params as { id: string }).id), decision);
    await recordAction(
      "QUALIFY_AND_BID",
      "QUALIFY_OPPORTUNITY",
      String((request.params as { id: string }).id),
      decision.reasons.join(" ") || "Qualification completed.",
      "success", business.id
    );
    return reply.send({ opportunity, decision });
  });
}
