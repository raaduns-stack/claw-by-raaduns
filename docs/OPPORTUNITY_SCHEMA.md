# Opportunity Schema — V1

Status: Engineering baseline
Scope: Consultancy opportunity acquisition

## Purpose
Canonical internal representation of a tender, contract, EOI, RFQ, or other revenue opportunity from any configured source.

## Required fields
- opportunity_id
- source_id
- source_opportunity_id
- source_url
- discovered_at
- title
- opportunity_type
- issuing_organization
- industry
- location
- contract_value
- currency
- closing_at
- requirements
- eligibility_requirements
- capabilities_required
- certifications_required
- experience_required
- submission_requirements
- documents_available
- extracted_text
- source_evidence

## Qualification
- qualification_status: pending | qualified | rejected | uncertain
- qualification_score
- qualification_reasons
- missing_requirements
- estimated_cost
- estimated_profit
- estimated_margin
- competition_assessment
- eligibility_assessment
- recommended_action: bid | no_bid | escalate
- decision_confidence
- decision_at

## Execution
- bid_status: not_started | preparing | ready | submitted | failed | withdrawn
- bid_reference
- submission_at
- submission_evidence
- bid_documents
- submission_errors
- next_action_at

## Outcome
- outcome_status: pending | won | lost | cancelled | unknown
- outcome_value
- outcome_at
- loss_reason
- learning_signals

## Rules
1. Adapters populate source facts; they do not make business qualification decisions.
2. Material extracted facts retain source evidence where technically possible.
3. Timestamps are UTC internally.
4. Monetary values preserve source currency.
5. Missing source fields are valid and explicit.
6. Qualification and commercial decisions are downstream of discovery.
