# Staff-Claw Navigation Architecture

Status: CTO-approved UX implementation baseline

## Rule
Staff-Claw navigation follows the Core -> Capabilities -> Business Configurations architecture.

## Current navigation
- Businesses — business configuration and business-owned knowledge.
- QUALIFY_AND_BID — collapsible capability group containing Operations, Opportunities, Qualification, Activity, Tender Sources and Platform Login.
- Core / AI Providers — shared AI provider configuration.
- Sign out.

## Extensibility
Capability groups are collapsible navigation boundaries. New capabilities may add their own group without moving capability pages into Staff-Claw Core.

Business-specific configuration remains under Businesses. AI provider configuration remains shared Core infrastructure. Source/tender configuration remains under QUALIFY_AND_BID because it is capability infrastructure.

The frontend MUST NOT hardcode business names into navigation. Capability names should reflect registered platform capabilities rather than individual businesses.
