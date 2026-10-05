import type { Opportunity, QualificationDecision } from "../../core/types.js";

export type QualificationProfile = {
  allowedOpportunityTypes?: Opportunity["opportunityType"][];
  excludedIndustries?: string[];
  excludedLocations?: string[];
  minimumContractValue?: number;
  minimumMargin?: number;
  minimumLeadTimeDays?: number;
  capabilities?: string[];
  certifications?: string[];
  experienceKeywords?: string[];
};

const norm=(v:string)=>v.trim().toLowerCase();
const has=(values:string[]|undefined, value:string)=>Boolean(values?.some(v=>norm(v)===norm(value)));

function decision(opportunity:Opportunity,status:QualificationDecision["status"],d:QualificationDecision["decision"],reasons:string[],missing:string[],score=0):QualificationDecision {
  return { opportunityId:opportunity.opportunityId,status,decision:d,score,reasons,missingRequirements:missing,decidedAt:new Date() };
}

export function qualifyOpportunity(opportunity:Opportunity, profile:QualificationProfile):QualificationDecision {
  const reasons:string[]=[];
  const missing:string[]=[];

  if (profile.allowedOpportunityTypes?.length && !profile.allowedOpportunityTypes.includes(opportunity.opportunityType))
    return decision(opportunity,"rejected","NO_BID",["Opportunity type is outside configured scope"],[]);

  if (opportunity.industry && profile.excludedIndustries?.some(x=>norm(x)===norm(opportunity.industry!)))
    return decision(opportunity,"rejected","NO_BID",["Industry is excluded by policy"],[]);

  if (opportunity.location && profile.excludedLocations?.some(x=>norm(x)===norm(opportunity.location!)))
    return decision(opportunity,"rejected","NO_BID",["Location is excluded by policy"],[]);

  if (opportunity.closingAt && opportunity.closingAt.getTime() <= Date.now())
    return decision(opportunity,"rejected","NO_BID",["Closing date has passed"],[]);

  if (profile.minimumContractValue !== undefined && opportunity.contractValue !== undefined && opportunity.contractValue < profile.minimumContractValue)
    return decision(opportunity,"rejected","NO_BID",["Contract value is below configured minimum"],[]);

  if (profile.minimumLeadTimeDays !== undefined && opportunity.closingAt) {
    const days=(opportunity.closingAt.getTime()-Date.now())/86400000;
    if (days < profile.minimumLeadTimeDays)
      return decision(opportunity,"rejected","NO_BID",["Lead time is below configured minimum"],[]);
  }

  for (const capability of opportunity.capabilitiesRequired) if (!has(profile.capabilities,capability))
    missing.push(`Capability: ${capability}`);
  for (const certification of opportunity.certificationsRequired) if (!has(profile.certifications,certification))
    missing.push(`Certification: ${certification}`);

  if (profile.experienceKeywords?.length) {
    const experience=opportunity.experienceRequired.map(norm).join(" ");
    const matched=profile.experienceKeywords.some(k=>experience.includes(norm(k)));
    if (!matched && opportunity.experienceRequired.length) missing.push("Required experience evidence");
  }

  if (missing.length)
    return decision(opportunity,"uncertain","ESCALATE",["One or more configured qualification requirements are not satisfied"],missing);

  if (profile.minimumMargin !== undefined)
    reasons.push("Minimum margin policy configured; profitability requires cost estimation before final bid authority.");

  reasons.push("All deterministic qualification checks passed");
  return decision(opportunity,"qualified","BID",reasons,[],100);
}
