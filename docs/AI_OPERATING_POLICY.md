# AI Operating Policy — V1

Status: Engineering baseline
Scope: Consultancy business

## Purpose
Define what the autonomous agent is authorized to do.

## Discovery
Allowed:
- access configured tender sources
- authenticate using approved credentials
- browse/search/filter opportunities
- download/read permitted tender material
- create internal opportunity records

## Decisioning
Allowed:
- evaluate all configured qualification criteria
- calculate or estimate commercial viability
- make bid/no-bid decisions within configured limits
- record rationale and evidence

## Bid preparation
Allowed:
- generate proposals and bid responses
- select approved templates
- assemble approved company documents
- adapt content to tender requirements

## Submission
Allowed only when:
- qualification policy is satisfied
- required documents are available
- commercial limits are satisfied
- submission is technically possible
- no policy restriction requires escalation

## Escalation
Examples:
- value above configured authority limit
- legal agreement/signature requirement
- missing mandatory eligibility evidence
- conflicting authoritative business data
- irreversible commercial commitment outside policy
- unresolved material ambiguity

## Prohibited
- silently changing operating policy
- fabricating credentials, experience, certifications, references, pricing evidence, or tender facts
- knowingly false submissions
- exposing credentials
- bypassing access controls or security mechanisms
- commitments outside configured authority

## Learning
The agent may learn from opportunity outcomes, bid results, qualification accuracy, and operational failures.

Learning may adjust models, ranking, estimates, and recommendations within policy boundaries.

Learning MUST NOT silently change authority limits, prohibited actions, commercial limits, legal constraints, or fundamental operating policy.

## Audit
Every autonomous action records timestamp, component, opportunity_id where applicable, action, reason, evidence references, result, and error/retry information.


## 10. Credential Handling

Source-platform login credentials are runtime secrets owned by the configured business/source account. They are entered through the Staff-Claw frontend configuration UI and encrypted by the backend before persistence.

The agent may use approved runtime credentials solely to authenticate to the configured source platform. It MUST NOT expose, echo, log, export, or place those credentials in source code or documentation.

The Staff-Claw application/database credentials are infrastructure secrets and are separate from source-platform login credentials.

## 11. Human-Controlled Authentication

CAPTCHA, MFA/two-factor authentication, legal consent, or other security controls requiring human interaction are escalation/block states. The agent must stop and request human intervention rather than bypassing them.
