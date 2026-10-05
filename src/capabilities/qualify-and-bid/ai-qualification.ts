import { z } from "zod";
import type { Opportunity, QualificationDecision } from "../../core/types.js";
import { generateWithFallback, type AiProviderId } from "../../core/ai-provider.js";
import { qualifyOpportunity, type QualificationProfile } from "./qualification.js";

const aiResultSchema = z.object({
  decision: z.enum(["BID", "NO_BID", "ESCALATE"]),
  confidence: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).max(10),
  missingRequirements: z.array(z.string()).max(10)
});

export type AiQualificationResult = QualificationDecision & {
  provider: AiProviderId;
  model: string;
};

const systemPrompt = [
  "You are the qualification analyst for the selected business configuration.",
  "Return JSON only. Never invent facts, credentials, experience, prices, eligibility, or tender requirements.",
  "Use only the supplied opportunity, source evidence, and company qualification profile.",
  "The deterministic policy result is a hard constraint and cannot be overridden.",
  "If evidence is missing or ambiguous for a material requirement, choose ESCALATE.",
  "Decision must be exactly BID, NO_BID, or ESCALATE.",
  "BID means the supplied evidence supports qualification. NO_BID means evidence supports rejection. ESCALATE means human review is required."
].join(" ");

export async function aiQualifyOpportunity(opportunity: Opportunity, profile: QualificationProfile): Promise<AiQualificationResult> {
  const deterministic = qualifyOpportunity(opportunity, profile);
  const payload = JSON.stringify({
    opportunity: {
      ...opportunity,
      discoveredAt: opportunity.discoveredAt.toISOString(),
      closingAt: opportunity.closingAt?.toISOString()
    },
    businessQualificationProfile: profile,
    deterministicPolicyResult: deterministic
  });

  const response = await generateWithFallback({
    system: systemPrompt,
    prompt: [
      "Analyze this opportunity for qualification.",
      "Return exactly this JSON shape: {\"decision\":\"BID|NO_BID|ESCALATE\",\"confidence\":0,\"score\":0,\"reasons\":[],\"missingRequirements\":[]}.",
      payload
    ].join("\n"),
    maxOutputTokens: 1200
  });

  let parsed: z.infer<typeof aiResultSchema>;
  try {
    const fence = String.fromCharCode(96).repeat(3);
    const raw = response.text
      .replace(new RegExp("^" + fence + "json\\s*", "i"), "")
      .replace(new RegExp("\\s*" + fence + "$"), "")
      .trim();
    parsed = aiResultSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("AI provider " + response.provider + " returned invalid qualification JSON");
  }

  let finalDecision = parsed.decision;
  let finalStatus: QualificationDecision["status"] =
    finalDecision === "BID" ? "qualified" :
    finalDecision === "NO_BID" ? "rejected" : "uncertain";

  if (deterministic.decision === "NO_BID") {
    finalDecision = "NO_BID";
    finalStatus = "rejected";
  } else if (deterministic.decision === "ESCALATE") {
    finalDecision = "ESCALATE";
    finalStatus = "uncertain";
  }

  return {
    opportunityId: opportunity.opportunityId,
    status: finalStatus,
    decision: finalDecision,
    score: parsed.score,
    reasons: [...deterministic.reasons, ...parsed.reasons],
    missingRequirements: [...deterministic.missingRequirements, ...parsed.missingRequirements],
    confidence: parsed.confidence,
    decidedAt: new Date(),
    provider: response.provider,
    model: response.model
  };
}
