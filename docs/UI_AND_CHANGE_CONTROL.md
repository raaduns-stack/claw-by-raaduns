# Staff-Claw UI and Change-Control Record

2026-10-04

A wholesale replacement of public/index.html caused a regression by removing the existing tender-source credential management workflow. Future feature work must preserve existing navigation, forms, API calls, and operational workflows.

Required UI functions: Operations; Opportunities; Qualification; Activity; AI Providers; Tender Sources; Platform Login; Add/Update Tender Source; encrypted platform credential storage; source Login/Verify; Sign out.

UI API contracts: GET /api/platforms; POST /api/platforms; PUT /api/platforms/:sourceId/credentials; POST /api/platforms/:sourceId/login; GET/PUT /api/ai/config; POST /api/ai/test; GET/POST /api/auth/session; POST /api/auth/login; POST /api/auth/logout.

Change rule: prefer surgical edits to public/index.html. Do not replace the dashboard wholesale when adding a feature.

Verification before restart: login/logout; all dashboard pages; AI configuration/test; Tender Source add/update; Platform credential storage and Login/Verify; public health; typecheck; tests; build.

The configured GitHub repository currently reports as empty. Source-control recovery must be completed before further UI refactors.

## Multi-business architecture rule
`QUALIFY_AND_BID` is a shared capability consumed by business configurations. Never label the capability as belonging to one business. The UI must expose the selected business context separately from the capability.

A single source opportunity is persisted once and may have independent qualification decisions for multiple businesses.
