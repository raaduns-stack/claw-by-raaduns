# Tender Source Adapter Contract — V1

Status: Engineering baseline
Scope: Multi-source opportunity discovery

## Purpose
Isolate source-specific authentication, navigation, extraction, and submission behavior from the core agent.

## Adapter responsibilities
1. Authentication/session management
2. Source navigation
3. Opportunity discovery
4. Source-specific extraction
5. Source document retrieval
6. Source-specific submission
7. Source-specific status retrieval
8. Source error normalization

## Core operations
- authenticate()
- health_check()
- discover(cursor)
- get_opportunity(source_opportunity_id)
- get_documents(source_opportunity_id)
- submit(source_opportunity_id, bid_package)
- get_submission_status(source_opportunity_id, submission_reference)
- logout()

## Discovery output
discover() returns normalized candidates containing source_id, source_opportunity_id, source_url, title, discovered_at, and enough source metadata for qualification.

## Boundaries
Adapters MUST NOT:
- make business bid/no-bid decisions
- modify company knowledge
- modify AI operating policy
- invent missing source facts
- store credentials in source code
- submit outside the core execution policy

## Authentication
Credentials are runtime secrets.

Adapters must support login/session establishment, session expiry detection, re-authentication, and explicit authentication failure reporting.

CAPTCHA, MFA, legal consent screens, or other controls requiring a human are reported as blocked states; they are not bypassed.

## Idempotency
Submission should use an idempotency key derived from internal opportunity and bid version where the source permits it.

Repeated discovery must not create duplicate opportunities.

## Evidence
Preserve source URL, source identifiers, retrieval timestamp, relevant source text/files, submission confirmation, and source error messages.

## First implementation
NaijaBusiness is the first adapter target.

The core system remains independent of its DOM, URL structure, field names, and authentication implementation.


## 10. Runtime Credential Configuration

Source credentials are supplied at runtime through the Staff-Claw frontend configuration page. They are not committed to the repository and must not appear in source code, documentation, logs, screenshots, or API responses.

The configuration flow is:
1. Configure platform URL and source account username/email in QUALIFY_AND_BID configuration.
2. Enter the source account password.
3. Backend encrypts and stores the credential material.
4. Platform Login invokes the source adapter using the stored runtime secret.
5. Adapter records the resulting authentication state.

The current NaijaBusiness adapter uses a persistent Playwright browser session so an authenticated session can survive across worker runs.

## 11. Human Authentication Controls

If the source presents CAPTCHA, MFA/two-factor authentication, legal consent, or another security control requiring human action, the adapter returns the corresponding blocked state and stops. The agent must not attempt to circumvent the control.


## 12. NaijaBusiness Runtime Findings — 2026-10-04

The configured NaijaBusiness application uses:
- Base URL: app.naijabusiness.com.ng
- Login endpoint: /login.php
- Tender listing: /?q=&sector=&type=&page=N
- Tender detail: /tender/{slug}

The login form uses a POST form with runtime identifier/password fields and a CSRF token. The adapter must submit the source form rather than assuming WordPress/MemberPress login semantics.

The public listing exposes normalized candidate metadata including title, sector, type, and closing date. Tender detail pages may expose only summary information when the account does not have subscriber access; the adapter must preserve the visible source evidence and must not invent restricted requirements.

Discovery is paginated and uses the source opportunity slug as source_opportunity_id. Repeated discovery is idempotent through the canonical database unique constraint on (source_id, source_opportunity_id).

Current implementation status:
- authentication endpoint corrected to /login.php
- health check corrected to the application home page
- paginated discovery implemented
- canonical Opportunity normalization implemented
- tender detail retrieval implemented for visible source content
- document-link discovery implemented
- submission and submission-status remain intentionally unimplemented
