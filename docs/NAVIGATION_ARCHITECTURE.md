# Staff-Claw Navigation Architecture

Status: CTO-approved UX implementation baseline

## Rule
Staff-Claw navigation follows the Core -> Capabilities -> Business Configurations architecture.

## Current navigation
- Businesses — business configuration and business-owned knowledge.
- Registered capabilities — rendered from the server-side capability registry as collapsible groups.
- Core / AI Providers — shared AI provider configuration.
- Sign out.

## Capability registry
The server-side capability registry is the navigation authority for capability groups. Each active capability declares:
- stable capability ID
- display label
- version
- status
- navigation items and page identifiers
- workflow stages

The frontend consumes `GET /api/capabilities` and does not hardcode capability group names or capability navigation items.

## Extensibility
A new capability registers its manifest and navigation items. The existing sidebar automatically renders a new collapsible capability group. Capability-specific workflow pages remain owned by that capability.

Business-specific configuration remains under Businesses. Shared AI provider configuration remains under Core. Capability infrastructure belongs to its owning capability.

The frontend MUST NOT hardcode business names or capability group names into navigation.

[executed on device: mail.quicrefill.com (657bc0f0-b268-4295-8ef1-fac3aa0eceb5)]