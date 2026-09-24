# 26. Implementation roadmap

Strict order. Durations are not estimated here; the implementing team estimates them.

## Phase 0: Correctness and security foundation

| **Field** | **Detail** |
|---|---|
| Scope | Score function rebuilt as pure, weights to 1.0, no neutral fills. Final Score, Readiness Journey and ATS-in-fit removed. Quiz-to-skill removed. Server-side schemas on all writes. Atomic saves. Content-based upload checks. Fail-closed limits on AI routes. Friendly errors. Test runner and the first unit and integration tests. Interview chat removed. |
| Dependencies | None. |
| Deliverables | Patch set with tests. Updated SECURITY.md. |
| Acceptance criteria | Score tests pass (perfect candidate 100; deterministic; no forbidden inputs). Java and JavaScript never match. Saves survive forced failure. Cross-user tests pass. |
| Excluded | Redesign. New features. Payment. |

## Phase 1: ML and evidence foundation

| **Field** | **Detail** |
|---|---|
| Scope | Concept tables, normaliser, never-merge list, adjacency. Evidence model with lineage and hashes. Requirement model. Canonical resume model and parse v2 with verbatim checks. Job parse v2 with quotes. Judge contract and validators. Claim Validator core. Evaluation harness and the first labelled set. Injection suite. Data migrations from current tables. |
| Dependencies | Phase 0. An OpenAI key for evaluation runs. Real anonymised resumes and postings (OQ-4). |
| Deliverables | Schema migrations. Pipeline modules. Evaluation report with the baseline. |
| Acceptance criteria | Every stated requirement has a verified quote. Every bullet is traceable or flagged. Never-merge tests pass. Baseline metrics recorded for the old and new pipelines. |
| Excluded | New screens. Templates. Certification suggestions. |

## Phase 2: Minimal core UX

| **Field** | **Detail** |
|---|---|
| Scope | Design system components. Two-item navigation. Home. Sign-in. Start flow (resume, job input, confirmation). Documents (basic). Application page shell. Empty, loading and error states. Mobile layouts. Old URLs redirect. Event table and first events. |
| Dependencies | Phase 1 parse v2 and job ingest for paste. |
| Deliverables | Working shell and start flow on the new pipeline. |
| Acceptance criteria | Experiment 6 run. Desktop, tablet and phone checked. No screen has more than two card containers. |
| Excluded | Fit and change screens. New templates. Landing. |

## Phase 3: Fit and tailoring

| **Field** | **Detail** |
|---|---|
| Scope | Hybrid matcher. Score v1. Fit screen, evidence sheet, requirement list, corrections and revisions. Tailoring cards with Accept, Reject, Edit, Accept all safe. Claim Validator enforced at generation, edit and export. Tailored derived version. |
| Dependencies | Phases 1 and 2. |
| Deliverables | End-to-end fit and tailoring on real data. |
| Acceptance criteria | Deterministic score tests. Adversarial suite: zero accepted unsupported changes. Metrics meet thresholds once set. Experiments 1 and 2 run. |
| Excluded | Letter, interview pack, new templates. |

## Phase 4: Application pack

| **Field** | **Detail** |
|---|---|
| Scope | Cover letter with claim markers and validation. Interview preparation with evidence-cited talking points and clarification prompts. Bounded voice practice with written feedback. Checklist. Job URL analysis. Seven templates on the token engine with three emitters and embedded fonts. Certification suggestions from the registry and the link checker. |
| Dependencies | Phase 3. Licensed fonts. Fetch policy reviewed (OQ-10). |
| Deliverables | Complete application pack. |
| Acceptance criteria | Route tests prove every generated-text path is validated. SSRF and robots tests pass. Snapshot and text-order tests pass for all templates. Experiment 3 run. Cost per pack measured. |
| Excluded | Extension. LinkedIn analysis. Payment. |

## Phase 5: Acquisition experiments

| **Field** | **Detail** |
|---|---|
| Scope | Minimal landing page. Optional free fit check before sign-in as a test. Trimmed guides. A few role pages only after demand is checked. Analytics events complete. Experiments 4 and 5 and the message test. |
| Dependencies | Phase 4. Analytics decision (OQ-13). |
| Deliverables | Public site and experiment reports. |
| Acceptance criteria | Enough sessions to answer the experiments, with counts stated. A first target segment chosen or the message left broad. |
| Excluded | Page floods. Outcome claims. Invented testimonials. |

## Phase 6: Payment (last)

| **Field** | **Detail** |
|---|---|
| Scope | Entitlements replace the plan flag. Provider adapter. Checkout. Billing settings. Receipt and reminder emails. Cancel and refund flows. |
| Dependencies | Seller entity and country (OQ-2). Email service. Results of Experiments 3 and 4. Everything earlier in a satisfactory state. |
| Deliverables | Working purchase for the chosen unit. |
| Acceptance criteria | Test purchases work end to end. The end date is shown before paying. No auto-renewal surprise. Refund words are clear. |
| Excluded | Anything decided before the experiments give results. |
