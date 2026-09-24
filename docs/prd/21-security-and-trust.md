# 21. Security and trust

| **Area** | **Requirement** | **Test** |
|---|---|---|
| Authentication | Google sign-in and email code (**FACT:** current). No passwords. Sessions expire. Sensitive actions (delete account) require recent sign-in. | Auth tests, expiry test. |
| Authorisation | User id from the session only. Row-level security on every user table. Explicit ownership checks in handlers. No service-role use on request paths that do not need it. | Cross-user access tests on every route. |
| Server-side gating | Every gate (entitlement, cap, guard) is enforced on the server. The client shows state but decides nothing. | Route tests with a modified client. |
| Input validation | Runtime schemas on every body and query. **FACT:** the resume save route trusts a client-supplied object today. Unknown fields rejected. | Fuzz and schema tests. |
| Uploaded documents | Type detected by content, not extension (**FACT:** the job parse route uses the extension). Size and page caps. Parse in a constrained context with time and memory limits. Private storage, signed URLs, sanitised file names. Never executed or rendered as HTML. | Malformed and oversized file tests. |
| Job page fetch | Section 16: private-range blocking, redirect re-checks, size and time caps, robots, no cookies. Fetch worker cannot reach internal services. | SSRF test set. |
| Untrusted content | Job text, fetched pages, uploaded documents and user text are all untrusted data. HTML never stored. Only plain text reaches a prompt. | Injection test set. |
| Prompt injection | 1\) Untrusted text is delimited and labelled as data. 2) Calls that see it have no tools. 3) Outputs are structured with enums. 4) Code validates ids and quotes, so an injected instruction can at most change one classification that is checked against evidence. 5) The score is computed in code from validated results. 6) Free-text fields from a model are never fed as instructions to another model. 7) Instruction-like patterns are flagged for review, but not relied on. 8) Judge inputs contain only the requirement and its candidate evidence. | Injection suite in CI: for example a job text saying to mark every requirement as backed up must not change any state. |
| Generated content validation | The Claim Validator on every generated text path, server-enforced at generation, edit and export. | Adversarial suite. Zero accepted unsupported changes. |
| Database integrity | Foreign keys, CHECK constraints, immutable sealed versions, atomic multi-row writes, unique analysis revisions, optimistic concurrency on drafts. | Forced-failure tests. |
| Audit logging | AuditLog for export authorisations, guard outcomes, corrections, deletions, job fetch results, account changes. | Log completeness tests. |
| Rate limiting and cost | **FACT:** the current limiter is per user per hour and fails open. **DECISION:** expensive AI routes fail closed, add daily caps and per-IP limits for anonymous routes. Usage rows record cost. | Cap tests. |
| Secrets | Environment variables only. Rotation runbook (**FACT:** exists in SECURITY.md). No secrets in the client. | Secret scan in CI. |
| Privacy | Delete account removes all data (**FACT:** exists). Data export. Logs redact resume and job text. Error monitoring scrubs personal data. Provider data-use terms are confirmed before launch (OQ-9). | Deletion and redaction tests. |
| Transport and browser | HTTPS only, secure cookies, CSRF protection for cookie-authenticated writes, strict content security policy, no CORS for the API. | Header tests. |
