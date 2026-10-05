import { createHash } from "node:crypto";
import { db } from "../../core/db.js";
import type { Opportunity, QualificationDecision } from "../../core/types.js";

function opportunityHash(opportunity: Opportunity): string {
  return createHash("sha256").update(JSON.stringify({
    title: opportunity.title,
    opportunityType: opportunity.opportunityType,
    issuingOrganization: opportunity.issuingOrganization,
    industry: opportunity.industry,
    location: opportunity.location,
    contractValue: opportunity.contractValue,
    currency: opportunity.currency,
    closingAt: opportunity.closingAt?.toISOString(),
    requirements: opportunity.requirements,
    eligibilityRequirements: opportunity.eligibilityRequirements,
    capabilitiesRequired: opportunity.capabilitiesRequired,
    certificationsRequired: opportunity.certificationsRequired,
    experienceRequired: opportunity.experienceRequired,
    sourceEvidence: opportunity.sourceEvidence
  })).digest("hex");
}

export async function saveOpportunity(opportunity: Opportunity): Promise<{ id: string; isNew: boolean; changed: boolean }> {
  const hash = opportunityHash(opportunity);
  const existing = await db.query<{ id: string; content_hash: string | null }>(
    "SELECT id, content_hash FROM opportunities WHERE source_id=$1 AND source_opportunity_id=$2",
    [opportunity.sourceId, opportunity.sourceOpportunityId ?? null]
  );
  if (existing.rows[0]) {
    const changed = existing.rows[0].content_hash !== hash;
    await db.query(
      `UPDATE opportunities SET source_url=$1,title=$2,issuing_organization=$3,industry=$4,
       location=$5,contract_value=$6,currency=$7,closing_at=$8,requirements=$9::jsonb,
       eligibility_requirements=$10::jsonb,capabilities_required=$11::jsonb,
       certifications_required=$12::jsonb,experience_required=$13::jsonb,
       source_evidence=$14::jsonb,last_seen_at=NOW(),content_hash=$15
       WHERE id=$16`,
      [opportunity.sourceUrl,opportunity.title,opportunity.issuingOrganization ?? null,opportunity.industry ?? null,
       opportunity.location ?? null,opportunity.contractValue ?? null,opportunity.currency ?? null,opportunity.closingAt ?? null,
       JSON.stringify(opportunity.requirements),JSON.stringify(opportunity.eligibilityRequirements),
       JSON.stringify(opportunity.capabilitiesRequired),JSON.stringify(opportunity.certificationsRequired),
       JSON.stringify(opportunity.experienceRequired),JSON.stringify(opportunity.sourceEvidence),hash,existing.rows[0].id]
    );
    return { id: existing.rows[0].id, isNew: false, changed };
  }
  const result = await db.query<{ id: string }>(
    `INSERT INTO opportunities (
      source_id,source_opportunity_id,source_url,title,opportunity_type,issuing_organization,industry,location,
      contract_value,currency,closing_at,requirements,eligibility_requirements,capabilities_required,
      certifications_required,experience_required,source_evidence,last_seen_at,content_hash
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,NOW(),$18)
    RETURNING id`,
    [opportunity.sourceId,opportunity.sourceOpportunityId ?? null,opportunity.sourceUrl,opportunity.title,opportunity.opportunityType,
     opportunity.issuingOrganization ?? null,opportunity.industry ?? null,opportunity.location ?? null,opportunity.contractValue ?? null,
     opportunity.currency ?? null,opportunity.closingAt ?? null,JSON.stringify(opportunity.requirements),JSON.stringify(opportunity.eligibilityRequirements),
     JSON.stringify(opportunity.capabilitiesRequired),JSON.stringify(opportunity.certificationsRequired),JSON.stringify(opportunity.experienceRequired),
     JSON.stringify(opportunity.sourceEvidence),hash]
  );
  return { id: result.rows[0].id, isNew: true, changed: true };
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const result = await db.query<Record<string, unknown>>(
    "SELECT * FROM opportunities WHERE id = $1",
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    opportunityId: id,
    sourceId: String(row.source_id),
    sourceOpportunityId: row.source_opportunity_id ? String(row.source_opportunity_id) : undefined,
    sourceUrl: String(row.source_url),
    discoveredAt: new Date(String(row.discovered_at)),
    title: String(row.title),
    opportunityType: row.opportunity_type as Opportunity["opportunityType"],
    issuingOrganization: row.issuing_organization ? String(row.issuing_organization) : undefined,
    industry: row.industry ? String(row.industry) : undefined,
    location: row.location ? String(row.location) : undefined,
    contractValue: row.contract_value == null ? undefined : Number(row.contract_value),
    currency: row.currency ? String(row.currency) : undefined,
    closingAt: row.closing_at ? new Date(String(row.closing_at)) : undefined,
    requirements: row.requirements as string[],
    eligibilityRequirements: row.eligibility_requirements as string[],
    capabilitiesRequired: row.capabilities_required as string[],
    certificationsRequired: row.certifications_required as string[],
    experienceRequired: row.experience_required as string[],
    sourceEvidence: row.source_evidence as string[]
  };
}

export async function saveQualificationDecision(businessId: string, databaseOpportunityId: string, decision: QualificationDecision) {
  await db.query(
    `INSERT INTO qualification_decisions (
      business_id,opportunity_id,status,decision,score,reasons,missing_requirements,
      estimated_cost,estimated_profit,estimated_margin,confidence,decided_at
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12)`,
    [
      businessId, databaseOpportunityId, decision.status, decision.decision, decision.score ?? null,
      JSON.stringify(decision.reasons), JSON.stringify(decision.missingRequirements),
      decision.estimatedCost ?? null, decision.estimatedProfit ?? null,
      decision.estimatedMargin ?? null, decision.confidence ?? null, decision.decidedAt
    ]
  );
}

export async function listDashboardData(businessId?: string) {
  const [opportunities, decisions, actions] = await Promise.all([
    db.query(`SELECT id,title,opportunity_type,issuing_organization,industry,location,contract_value,currency,closing_at,discovered_at,source_url FROM opportunities ORDER BY discovered_at DESC LIMIT 100`),
    businessId ? db.query(`SELECT q.id,q.business_id,q.opportunity_id,q.status,q.decision,q.score,q.reasons,q.missing_requirements,q.decided_at,o.title,b.name AS business_name FROM qualification_decisions q JOIN opportunities o ON o.id=q.opportunity_id LEFT JOIN businesses b ON b.id=q.business_id WHERE q.business_id=$1 ORDER BY q.decided_at DESC LIMIT 100`,[businessId]) : db.query(`SELECT q.id,q.business_id,q.opportunity_id,q.status,q.decision,q.score,q.reasons,q.missing_requirements,q.decided_at,o.title,b.name AS business_name FROM qualification_decisions q JOIN opportunities o ON o.id=q.opportunity_id LEFT JOIN businesses b ON b.id=q.business_id ORDER BY q.decided_at DESC LIMIT 100`),
    db.query(`SELECT a.id,a.component,a.action,a.opportunity_id,a.business_id,a.reason,a.result,a.created_at,b.name AS business_name FROM agent_actions a LEFT JOIN businesses b ON b.id=a.business_id ORDER BY created_at DESC LIMIT 100`)
  ]);
  return { opportunities: opportunities.rows, decisions: decisions.rows, actions: actions.rows };
}

export async function recordAction(
  component: string, action: string, opportunityId: string | undefined,
  reason: string, result: "success" | "failure" | "blocked", businessId?: string
) {
  await db.query(
    "INSERT INTO agent_actions (component,action,opportunity_id,reason,result,business_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [component, action, opportunityId ?? null, reason, result, businessId ?? null]
  );
}
