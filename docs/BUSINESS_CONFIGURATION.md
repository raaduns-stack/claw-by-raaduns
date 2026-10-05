# Business Configuration — V2

Status: Engineering implementation baseline

## Purpose
A business is a reusable configuration and knowledge boundary. It consumes shared Staff-Claw capabilities without embedding business-specific logic in the capability.

## Business-owned domains
- Identity and registration
- Services and industries
- Technical and delivery capabilities
- Geographic coverage
- Staffing, equipment, resources, partners
- Compliance and eligibility evidence
- Project experience and references
- Commercial and qualification rules
- Bid assets and supporting documents
- AI operating policy

## Evidence model
Knowledge records support source, effective dates, verification state, owner and evidence URI where applicable. Missing evidence remains explicit and must not be fabricated by AI.

## Shared capability model
A source opportunity is persisted once. Multiple businesses can independently qualify the same opportunity using their own knowledge, rules and policy. Qualification decisions remain keyed by business_id + opportunity_id.

## Current API
- GET /api/businesses/:businessId/knowledge
- PUT /api/businesses/:businessId/profile
- PUT /api/businesses/:businessId/policy
- POST /api/businesses/:businessId/compliance
- POST /api/businesses/:businessId/experience
- POST /api/businesses/:businessId/asset
- POST /api/businesses/:businessId/document

Delete endpoints exist for each knowledge record type.

## UI
The Businesses page is data-driven from the businesses registry. It exposes business configuration and a business-owned Knowledge Base entry point. Business names are not hardcoded into the frontend.