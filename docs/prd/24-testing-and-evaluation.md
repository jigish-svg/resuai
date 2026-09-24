# 24. Testing and evaluation

## 24A. Layers

| **Layer** | **Content** | **When** |
|---|---|---|
| Unit | Score function and its properties. Concept normaliser and never-merge pairs. Cue and numeric rules. Years union. Date parsing. Claim Validator lexicons and atom extraction. Template token snapshots. | Every commit. |
| Integration | API with a real database and row-level security. Atomic saves under forced failure. Ingest with recorded pages (structured, text, blocked). SSRF set. Upload security cases. Correction and revision flows. Staleness marking. | Every commit. |
| End to end | The core journey on desktop and a phone viewport: sign in, resume, job, confirm, fit, evidence correction, accept changes, export, letter, interview. Error and empty states. Accessibility checks. | Every merge to main. |
| AI evaluation | Runs the labelled pairs through the real pipeline and reports the metrics below. Model calls recorded and replayed for determinism; live runs on prompt or model change and nightly. | On prompt or model change, and nightly. |
| Regression | Golden fixtures for score and validator outcomes. Any change to a fixture needs a written reason. | Every commit. |
| Adversarial suite | Invented metrics, titles, tools and certifications. Scope inflation. Injection text in jobs and resumes. Release blocking. | Every commit and release. |

## 24B. Evaluation dataset

| **Element** | **Definition** |
|---|---|
| Case | id, profession family, scenario tags, resume text, job text. |
| Gold requirements | For each requirement: quote, kind, necessity, numeric target, must-have. |
| Gold evidence links | For each requirement: the evidence spans and the correct state and reason code. |
| Gold fit band | A human rating of fit for a subset, used to check the score. |
| Sources | Real anonymised resumes and postings supplied by the team and testers with consent. Synthetic cases allowed and flagged as synthetic. |
| Coverage | At least 12 profession families. Scenario tags: strong, weak, career switch, missing skill, transferable skill, misleading similarity, multi-word skills, synonyms, seniority mismatch, sparse, exaggerated, OR groups, injection. |
| Labelling | Two labellers per case, adjudicated, with agreement reported. |
| Size | Grows towards about 100 pairs. The first release gate uses whatever exists, with the count stated. |

## 24C. Metrics

| **Metric** | **Definition** |
|---|---|
| Requirement extraction | Precision and recall of stated requirements against gold quotes. Kind and necessity accuracy. Numeric accuracy. |
| Evidence matching | Per-state precision, recall and F1. False positive rate: the system says Backed up where gold does not. False negative rate: the system says not Backed up where gold does. |
| Score stability | Identical inputs give identical scores (must be exact). Variance across re-runs of the model for the same pair. |
| Score validity | Rank correlation and band agreement with human fit ratings. |
| Fabrication | Share of generated changes, letter sentences and talking points containing an unsupported atom, by human audit of a sample. |
| Tailoring support rate | Share of proposed changes whose every atom is supported. |
| Latency | p50 and p95 per stage and end to end. |
| Cost | Tokens and estimated cost per analysis, tailoring run, letter, interview prep. |

## 24D. Acceptance criteria

No benchmark numbers are invented. Thresholds are set after the baseline is measured.

| **Area** | **Criterion** | **Status** |
|---|---|---|
| Determinism | Score tests pass. Same saved results give the same score. | Release blocking |
| Fabrication | Zero accepted unsupported changes in the adversarial suite. Zero unblocked invented metrics, titles, employers or certifications. | Release blocking |
| Validator coverage | Every generated-text path calls the Claim Validator, verified by a route test. | Release blocking |
| Injection | The injection suite changes no state and no score. | Release blocking |
| Normaliser | All never-merge pairs stay distinct. All listed synonyms map together. | Release blocking |
| Quality metrics | Extraction, matching and score-validity metrics meet thresholds. **Thresholds are set by the product owner after the baseline is measured. No thresholds are promised in this document.** | Gate once set |
| No regression | No metric falls below the last accepted baseline without written approval. | Gate |
| Latency | Targets set after measurement. | Gate once set |
