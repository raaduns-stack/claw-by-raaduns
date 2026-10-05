# Staff-Claw Agents — Source of Truth

Status: CTO-approved architecture baseline
Scope: Staff-Claw platform; Consultancy is the first implementation
Deployment root: /var/www/raaduns_com_usr/data/www/claw.raaduns.com

## 1. Product Model

Staff-Claw is a reusable autonomous business-operations platform.

The platform is NOT built around one business workflow.

Architecture:

Core -> Capabilities -> Business Configurations

A business is composed from one or more capabilities. Each capability defines its own workflow while using shared Staff-Claw Core services.

## 2. Core

Shared infrastructure used by capabilities:
- AI reasoning and extraction
- Browser automation
- Job scheduling and workers
- Policy enforcement
- Company/business knowledge
- Credential handling
- Audit/event logging
- Document processing
- Persistence
- Observability

Core MUST remain independent of any specific business workflow.

## 3. Capability Model

A capability is an autonomous business function with its own:
- inputs
- workflow/state machine
- domain models
- decision logic
- actions
- outputs
- policy requirements
- adapters

Initial capabilities may include:
- QUALIFY_AND_BID
- LEAD_DISCOVERY
- LEAD_QUALIFICATION
- OUTREACH
- PROPOSAL_GENERATION
- LISTING_DISTRIBUTION
- FOLLOW_UP

Only capabilities required by the current business are implemented.

## 4. First Capability: QUALIFY_AND_BID

Consultancy is the first implementation.

Workflow:

DISCOVER
-> EXTRACT
-> QUALIFY
-> BID / NO-BID
-> PREPARE BID
-> SUBMIT
-> TRACK OUTCOME

This workflow belongs to QUALIFY_AND_BID, not to Staff-Claw Core.

## 5. Consultancy Qualification

The capability evaluates:
1. Industry
2. Contract value
3. Location
4. Required capabilities
5. Closing date
6. Company eligibility
7. Required certifications
8. Previous experience
9. Profit potential
10. Competition

Output:
- BID
- NO_BID
- ESCALATE

All decisions require evidence and an audit record.

## 6. Business Composition

Example:

Consultancy:
CORE + DISCOVERY + QUALIFY_AND_BID

Law firm:
CORE + LEAD_DISCOVERY + LEAD_QUALIFICATION + OUTREACH + FOLLOW_UP

Real estate:
CORE + BRIEF_INGESTION + LISTING_GENERATION + LISTING_DISTRIBUTION

Software company:
CORE + LEAD_DISCOVERY + NEED_ANALYSIS + PROPOSAL_GENERATION + OUTREACH

Travel agency:
To be defined from its actual workflow.

## 7. Authority

Each business has an AI Operating Policy.

The policy defines:
- allowed actions
- authority limits
- commercial limits
- prohibited actions
- escalation conditions
- learning boundaries

AI may learn within these boundaries but MUST NOT silently change authority, commercial limits, legal constraints, or fundamental policy.

## 8. Source Adapters

External websites and systems are accessed through adapters.

Adapters are capability inputs/outputs and must not become the core architecture.

For QUALIFY_AND_BID:
Tender Source -> Source Adapter -> Common Opportunity Model -> Qualification -> Bid -> Submission

NaijaBusiness is the first source adapter target.

## 9. Source of Truth Hierarchy

1. CTO-approved Staff-Claw architecture and policies
2. Business-specific operating policy
3. Company knowledge base
4. Capability contracts and schemas
5. External source data

External websites are data sources, not business-policy authorities.

## 10. Engineering Principles

- Prefer modular capabilities over business-specific code.
- Keep deterministic policy separate from AI reasoning.
- Preserve source evidence.
- Never fabricate business or tender facts.
- Never store credentials in source code.
- Audit autonomous actions.
- Make retries safe and submissions idempotent where possible.
- Human intervention is exception-based, not routine.
- CTO has final authority on unresolved business decisions.

## 11. Current Documentation

- OPPORTUNITY_SCHEMA.md
- COMPANY_KNOWLEDGE_BASE.md
- AI_OPERATING_POLICY.md
- TENDER_SOURCE_ADAPTER.md

These documents must remain consistent with this source of truth.


## 12. Platform Configuration and Authentication UX

QUALIFY_AND_BID source-platform configuration is managed from the Staff-Claw frontend.

The configuration page accepts:
- platform name
- source ID
- platform URL
- source-platform username/email
- source-platform password

The frontend stores runtime source credentials through the backend credential endpoint. Credentials are encrypted at rest and are never returned by the platform API or placed in source code.

A dedicated Platform Login page exposes the authentication action and current authentication state.

Authentication states include:
- NOT_AUTHENTICATED
- AUTHENTICATED
- SESSION_EXPIRED
- LOGIN_FAILED
- MFA_REQUIRED
- CAPTCHA_REQUIRED
- BLOCKED
- ERROR

MFA/CAPTCHA/security controls requiring human intervention are explicit blocked states and MUST NOT be bypassed.

## 13. Current NaijaBusiness Implementation Status

NaijaBusiness is configured as the first source platform adapter.

Implemented:
- runtime platform configuration
- encrypted credential storage
- persistent Playwright browser session storage
- login attempt through the adapter
- authentication-state persistence
- health-check scaffolding
- frontend configuration and login UI

Not yet implemented:
- authenticated opportunity discovery/extraction
- opportunity document retrieval
- bid submission
- submission-status tracking

The system MUST NOT represent NaijaBusiness discovery or submission as operationally complete until those adapter functions are implemented and tested.


## 14. Multi-Platform Configuration UX

QUALIFY_AND_BID supports multiple configured tender source platforms through the source-platform registry.

The frontend configuration UI provides:
- a list of configured platforms
- Add Platform
- per-platform URL, source ID, adapter type, and enabled configuration
- per-platform runtime credentials
- per-platform Save Configuration and Save & Login actions

The Platform Login page displays each configured platform independently and invokes the adapter registered for that platform's adapter type.

Adding a source platform MUST NOT require changes to Staff-Claw Core. A source-specific adapter is required before that platform can authenticate or perform source-specific operations.


## 15. Discovery / Persistence / Extraction Status — 2026-10-04

QUALIFY_AND_BID now has operational adapter endpoints for the first acquisition stages:
- DISCOVER: POST /api/qualify-and-bid/discover/:sourceId with cursor pagination
- PERSIST: discovered canonical Opportunity records are upserted using (source_id, source_opportunity_id)
- EXTRACT: POST /api/qualify-and-bid/extract/:sourceId with sourceOpportunityId in the request body

Each discovery and extraction operation records an agent_actions audit event.

NaijaBusiness page 1 has been verified through the production endpoint and returned 15 canonical opportunities with nextCursor=2. A representative tender detail has also been extracted and persisted.

Current implementation remains intentionally pre-AI: source adapters collect and normalize source facts; qualification/reasoning remains downstream. The adapter MUST NOT invent restricted source requirements. If a tender page indicates that complete details are subscriber-only, only visible source evidence is persisted.

The next controlled stage is qualification against the consultancy Company Knowledge Base. Automatic bid submission remains out of scope until explicitly approved by the CTO.

## Business Configuration Model (2026-10-05)

`QUALIFY_AND_BID` is a reusable capability. It is not owned by, or hard-coded to, any single business.

Tender sources discover and persist opportunities once. Business configurations consume the shared capability and evaluate the same opportunity independently using their own qualification profile and policies.

Business-specific qualification decisions are keyed by `business_id + opportunity_id` through `qualification_decisions.business_id`.

Current business configurations seeded as draft records:
- Raa N Business Solutions
- Raa Software Solutions
- Raa Home N Properties

A business must be `active` before the qualification API can make a decision. An empty/draft business must not be treated as automatically qualified.

Business qualification profile currently contains: allowed opportunity types, excluded industries, excluded locations, minimum contract value, minimum margin, minimum lead time, capabilities, certifications, and experience keywords.

Source platform definitions remain shared source infrastructure. Business-specific source credentials/subscriptions can be introduced independently when required; discovery remains source-level and is not duplicated per business.

UI rule: the selected business is the context for operations, qualification, and activity. The capability remains shared.


## 16. Business Knowledge Base Implementation — 2026-10-05

Business configuration is a full business-owned knowledge boundary, not only a qualification form. The implementation includes identity/profile data, compliance records, experience records, bid assets, knowledge documents, and operating policy. These records are stored per business and are consumed downstream by shared capabilities.

The Business Configuration UI MUST remain data-driven. Business names must come from the business registry; no business-specific names may be hardcoded into the frontend. QUALIFY_AND_BID remains reusable and must not contain business-specific workflow logic.

The business knowledge API provides independent CRUD boundaries for profile, policy, compliance, experience, bid assets and knowledge documents. Evidence metadata must remain explicit. AI MUST NOT fabricate missing company facts or supporting evidence.

Migration: database/007_business_knowledge_base.sql.