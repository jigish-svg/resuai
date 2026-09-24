# PRD index

The PRD is split into one file per section so you can read only what a task needs.

Rules for reading it:

- Always read `25-existing-repository-migration.md` and `26-implementation-roadmap.md` at the start of a task.
- Then read only the sections the task touches.
- Do not load every file at once.

| File | Covers | Read when |
|---|---|---|
| `00-document-control.md` | 0. Document control | Document status, tags, and the 12 resolved contradictions. Read once. |
| `01-executive-summary.md` | 1. Executive summary | Product summary and the FACT / DECISION / INFERENCE / HYPOTHESIS table. |
| `02-target-users.md` | 2. Target users | Who it is for; role-adaptive configuration. |
| `03-core-user-journey.md` | 3. Core user journey | The 14-step pipeline with states, errors and safety per step. |
| `04-information-architecture.md` | 4. Information architecture | Navigation and which screens exist. |
| `05-screen-by-screen-specification.md` | 5. Screen-by-screen specification | Every screen: layout, states, data, API, mobile. Read the screen you are building. |
| `06-ux-and-design-system.md` | 6. UX and design system | Type scale, colours, evidence-state visuals, score presentation. |
| `07-evidence-architecture.md` | 7. Evidence architecture | Evidence states, reason codes, wording rules, evidence IDs. Read before touching matching or fit UI. |
| `08-job-requirement-extraction.md` | 8. Job requirement extraction | Requirement kinds, necessity, must-haves, numeric rules. |
| `09-resume-parsing.md` | 9. Resume parsing | Canonical resume model and parsing rules. |
| `10-fit-score.md` | 10. Fit score | The score: dimensions, weights, credits, calculation, tests. Read before touching the scorer. |
| `11-ml-and-ai-architecture.md` | 11. ML and AI architecture | Pipeline, matching steps, judge contract, Claim Validator, model operations. |
| `12-tailoring-system.md` | 12. Tailoring system | Tailoring rules, change types, decisions, Accept all safe. |
| `13-cover-letter.md` | 13. Cover letter | Cover letter generation and validation. |
| `14-interview-preparation.md` | 14. Interview preparation | Interview preparation and the score boundary. |
| `15-resume-builder.md` | 15. Resume builder | Resume renderer, template tokens, the seven templates. |
| `16-job-url-ingestion.md` | 16. Job URL ingestion | Job link fetching, safety rules, states. |
| `17-application-pack.md` | 17. Application pack | What is built now versus experiment versus monetisation. |
| `18-certifications.md` | 18. Certifications | Certification suggestions; suggestion is not evidence. |
| `19-data-model.md` | 19. Data model | All tables, fields and relationships. Read before writing a migration. |
| `20-api-architecture.md` | 20. API architecture | Every endpoint with input, output, validation and errors. |
| `21-security-and-trust.md` | 21. Security and trust | Security requirements and their tests. |
| `22-monetization-architecture.md` | 22. Monetization architecture | Entitlements and the payment boundary (nothing is built yet). |
| `23-analytics-and-experimentation.md` | 23. Analytics and experimentation | Analytics events. |
| `24-testing-and-evaluation.md` | 24. Testing and evaluation | Test layers, evaluation dataset, metrics, acceptance criteria. |
| `25-existing-repository-migration.md` | 25. Existing repository migration | Current code versus required, with KEEP / MODIFY / REMOVE / REBUILD. Read at the start of any task. |
| `26-implementation-roadmap.md` | 26. Implementation roadmap | The seven phases with scope, exclusions and acceptance criteria. Read at the start of a phase. |
| `27-definition-of-done-mvp-ready.md` | 27. Definition of done (MVP-ready) | What must be true before the MVP is ready. |
| `28-open-questions.md` | 28. Open questions | Unresolved questions (OQ-1 to OQ-16). Do not decide these yourself. |
| `29-final-product-principles.md` | 29. Final product principles | The 15 non-negotiable principles. Read once. |
| `A-prd-summary.md` | A. PRD summary | Summary. |
| `B-mvp-scope.md` | B. MVP scope | MVP scope. |
| `C-out-of-scope.md` | C. Out of scope | Out of scope. |
| `D-technical-dependencies.md` | D. Technical dependencies | Technical dependencies. |
| `E-open-questions.md` | E. Open questions | Open questions pointer. |
| `F-build-order.md` | F. Build order | Build order. |
