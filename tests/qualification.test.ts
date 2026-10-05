import test from "node:test";
import assert from "node:assert/strict";
import { qualifyOpportunity } from "../src/capabilities/qualify-and-bid/qualification.js";
import type { Opportunity } from "../src/core/types.js";

const base:Opportunity={
  opportunityId:"1",sourceId:"test",sourceOpportunityId:"1",sourceUrl:"https://example.test/1",
  discoveredAt:new Date(),title:"Test",opportunityType:"tender",issuingOrganization:"Test",
  industry:"construction",location:"Abuja",contractValue:100000,currency:"NGN",
  closingAt:new Date(Date.now()+86400000),requirements:[],eligibilityRequirements:[],
  capabilitiesRequired:["engineering"],certificationsRequired:["ISO 9001"],experienceRequired:[],sourceEvidence:[]
};

test("qualifies when deterministic requirements pass",()=>assert.equal(
  qualifyOpportunity(base,{capabilities:["engineering"],certifications:["ISO 9001"]}).decision,"BID"));

test("rejects below minimum contract value",()=>assert.equal(
  qualifyOpportunity(base,{minimumContractValue:200000}).decision,"NO_BID"));

test("escalates missing capability",()=>assert.equal(
  qualifyOpportunity({...base,capabilitiesRequired:["surveying"]},{capabilities:["engineering"]}).decision,"ESCALATE"));
