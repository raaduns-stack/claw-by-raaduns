import test from "node:test";
import assert from "node:assert/strict";
import { qualifyOpportunity } from "../src/capabilities/qualify-and-bid/qualification.js";
const profile = { capabilities: ["engineering"], certifications: ["ISO 9001"], industries: ["construction"], locations: ["Abuja"], experienceYears: 8 };
const base = { opportunity_id: "1", source_id: "test", source_opportunity_id: "1", source_url: "https://example.test/1", title: "Test", opportunity_type: "tender", issuing_organization: "Test", industry: "construction", location: "Abuja", contract_value: 100000, currency: "NGN", closing_at: new Date(Date.now() + 86400000).toISOString(), requirements: [], eligibility_requirements: [], capabilities_required: ["engineering"], certifications_required: ["ISO 9001"], experience_required: [], submission_requirements: [], documents_available: [], extracted_text: "", source_evidence: [] };
test("qualifies when deterministic requirements pass", () => assert.equal(qualifyOpportunity(base, profile, {}).decision, "BID"));
test("rejects below minimum contract value", () => assert.equal(qualifyOpportunity(base, profile, { minimumContractValue: 200000 }).decision, "NO_BID"));
test("escalates missing capability", () => assert.equal(qualifyOpportunity({ ...base, capabilities_required: ["surveying"] }, profile, {}).decision, "ESCALATE"));
