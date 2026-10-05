export type Decision = "BID" | "NO_BID" | "ESCALATE";
export type QualificationStatus = "pending" | "qualified" | "rejected" | "uncertain";

export interface Opportunity {
  opportunityId: string;
  sourceId: string;
  sourceOpportunityId?: string;
  sourceUrl: string;
  discoveredAt: Date;
  title: string;
  opportunityType: "tender" | "contract" | "eoi" | "rfq" | "other";
  issuingOrganization?: string;
  industry?: string;
  location?: string;
  contractValue?: number;
  currency?: string;
  closingAt?: Date;
  requirements: string[];
  eligibilityRequirements: string[];
  capabilitiesRequired: string[];
  certificationsRequired: string[];
  experienceRequired: string[];
  sourceEvidence: string[];
}

export interface QualificationDecision {
  opportunityId: string;
  status: QualificationStatus;
  decision: Decision;
  score?: number;
  reasons: string[];
  missingRequirements: string[];
  estimatedCost?: number;
  estimatedProfit?: number;
  estimatedMargin?: number;
  confidence?: number;
  decidedAt: Date;
}

export interface AgentAction {
  actionId: string;
  component: string;
  action: string;
  opportunityId?: string;
  reason: string;
  result: "success" | "failure" | "blocked";
  createdAt: Date;
}