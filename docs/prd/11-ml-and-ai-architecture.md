# 11. ML and AI architecture

**DECISION.** Deterministic logic first. A model only where rules cannot decide. Code validates every model output.

## 11A. Pipeline

| **Stage** | **Rules** | **Embeddings** | **LLM** | **Code validation** |
|---|---|---|---|---|
| 1 Text extraction | pdf-parse and mammoth (**FACT:** current). Content-based file type check. | \- | \- | Size and page caps. Empty-text check. |
| 2 Resume sectioning | Heading dictionary and layout heuristics. | \- | Fallback only when no headings are found. | Section coverage check. |
| 3 Resume entities | Regex for dates, emails, links. | \- | Structured extraction into the schema (free text needs it). | Verbatim check. Schema check. |
| 4 Skill extraction and normalisation | Dictionary and alias table, word boundaries, never-merge list. | Suggests concepts for unmapped terms. Human-reviewed. Never auto-merges. | \- | Never-merge test pairs. |
| 5 Job ingestion | Structured job data parse. Boilerplate removal. | \- | \- | Fetch protections (section 16). |
| 6 Requirement extraction | Sentence split. Cue and heading rules. Numeric patterns. | \- | Candidates with quotes when rules abstain. | Every quote must be in the text. |
| 7 Requirement classification | Rules for kind, necessity, must-have. | \- | Only for abstentions. | Enum validation. |
| 8 Concept mapping | Alias table exact match. | Nearest-concept suggestions. | \- | Never-merge check. |
| 9 Evidence retrieval | Concept index. | Top-k by cosine similarity over evidence text, above a threshold. Candidates only. | \- | Candidate list is logged. |
| 10 Evidence matching | Steps M1 to M8 below. | Retrieval for unmapped requirements. | A judge for unclear cases, two passes. | Cited ids exist. Quote is inside the cited text. Reason fits the state. |
| 11 Score | Pure function (section 10). | \- | \- | Property tests. |
| 12 Tailoring | Eligibility rules. Diff. | \- | Rewording under constraints. | Claim Validator. |
| 13 Cover letter | Selection of evidence by weight. | \- | Paragraphs with claim markers. | Claim Validator per sentence. |
| 14 Interview preparation | Question templates by requirement kind. Ordering. | \- | Phrasing and structuring from evidence. | Claim Validator. |
| 15 Claim Validator | Atom extraction, lexicons, concept sets. | \- | Second-pass verifier. | The strictest outcome wins. |
| 16 Role family | Title keyword rules. | Nearest family suggestion. | \- | Configuration only. |

## 11B. Evidence matching steps

| **Step** | **Logic** | **Method** |
|---|---|---|
| M1 Normalise | Map the requirement and every evidence item to concepts using the alias table and the never-merge list. | Rules |
| M2 Direct match | If the requirement concept appears in an evidence item: evidenced item gives Backed up (exact_in_role_bullet, exact_in_project or alias_match); a skill list entry alone gives Needs attention (claimed_not_shown). | Rules |
| M3 Numbers | Compute years and education level. Years at or above target: Backed up (years_meet). Below: Needs attention (years_short) with credit ratio. Zero relevant years: Unsupported (no_evidence_found). Education below level: Unsupported (below_required_level). | Rules |
| M4 Adjacent | If no direct match but a curated adjacent concept is present: Needs attention (adjacent_concept), naming it. | Rules |
| M5 Retrieval and judge | For unmapped or unresolved requirements: retrieve top-k evidence by similarity above a threshold. If none: Unsupported (no_evidence_found), unless the requirement is ambiguous, then To verify. Otherwise a judge decides, twice with different prompt variants. Disagreement gives To verify (judge_disagreement). | Embeddings and model |
| M6 By design | Location, work authorisation and other by-design kinds: To verify (by_design), unless the user declared them (Backed up, user_declared, never scored). | Rules |
| M7 Contradiction | Expired credentials and explicit conflicting data override lower steps: Unsupported (expired_credential or contradicted_by_data). | Rules |
| M8 User overrides | Applied last. user_confirmed, user_declared, user_confirmed_no. | User |

## 11C. Judge contract

| **Item** | **Definition** |
|---|---|
| Input | Requirement (id, quote, kind, necessity). Candidate evidence (id, kind, text, source label). No other text. Instruction to treat all text as data. |
| Output schema | requirement_id; state (Backed up, Needs attention, Unsupported, To verify); reason_code from the judge-allowed set (judge_supported, judge_partial, no_evidence_found); evidence_ids; evidence_quote; rationale up to 200 characters. |
| V1 | evidence_ids are a subset of the candidates. |
| V2 | evidence_quote is a substring (after normalisation) of one cited evidence text. |
| V3 | The reason code is allowed for the state. |
| V4 | Backed up requires at least one cited item of strength evidenced or verified. |
| V5 | Two passes agree on state. Otherwise To verify (judge_disagreement). |
| V6 | The judge is never called for by-design kinds. |
| Any failure | The result becomes To verify (engine_gap). Never Unsupported. |

## 11D. Claim Validator

Replaces Truth Guard. Outcomes: PASS, NEEDS CONFIRMATION, BLOCKED.

| **Atom class** | **Extraction** | **Check** | **Outcome** |
|---|---|---|---|
| Numbers and metrics | Regex for percentages, currency, counts, multipliers. | Each must appear in the cited evidence (units normalised). | BLOCKED (invented_metric) |
| Dates, years, durations | Regex and date parse. | Must appear in the cited evidence. | BLOCKED (date_not_in_evidence) |
| Named entities | Employers, institutions, project and product names, matched against the canonical resume's entities. | Must exist in the evidence. | BLOCKED (unknown_entity) |
| Tools, technologies, skills | Concept dictionary matching in the output. | Each concept must be in the cited evidence's concept set. | BLOCKED (concept_not_in_evidence); adjacent gives NEEDS CONFIRMATION |
| Titles, certifications, qualifications | Exact or normalised match. | Must equal the evidence. | BLOCKED (title_or_credential_changed) |
| Scope verbs | Lexicon with ranks: 1 assisted, supported, contributed; 2 built, developed, implemented, delivered; 3 led, managed, owned, directed, headed. | Output rank must not exceed the highest rank in the evidence. | NEEDS CONFIRMATION (scope_inflation) |
| Impact claims | Verbs and nouns such as improved, reduced, increased, saved, grew. | The evidence must contain an impact word or a metric. | NEEDS CONFIRMATION (impact_added) |
| Size and scale words | team of, cross-functional, enterprise, global, large-scale. | Must appear in the evidence. | NEEDS CONFIRMATION (scale_added) |
| Second-pass verifier | A model checks each factual sentence against the cited quotes. | Any unsupported verdict. | NEEDS CONFIRMATION or BLOCKED. The strictest outcome wins. |

## Where it runs

- At suggestion generation, at user edit of a suggestion, at cover letter generation and edit, at interview item generation, and at export (every changed line of the tailored resume).

- Server-side only. The client can display results but cannot bypass them.

- User-authored text typed directly into the resume editor is the user's own. It is not blocked. It becomes a user_statement evidence item of strength claimed and can be used by later features.

- Lexicons and thresholds are versioned data with tests.

## 11E. Operations

| **Topic** | **Requirement** |
|---|---|
| Model calls | Structured output with a schema. Temperature 0. Pinned model version. Untrusted text delimited and labelled as data. No tools on any call that sees resume, evidence or job text. |
| Tool use | **FACT:** interview chat and skill prep currently use a web search tool. **DECISION:** none of that runs with candidate text. Study links come from the checked registry, not live search. The generic interview chat is removed (section 25 and Phase 0). |
| Model routing | Configured per task. Default is the current model (**FACT:** gpt-4o) until cost and accuracy are measured on the evaluation set. **HYPOTHESIS:** smaller models suffice for classification and the judge. |
| Prompts | Versioned files with ids. A change requires an evaluation run. |
| Caching | Results cached by input hash: job parse, resume parse, judge calls. Identical inputs return stored outputs. |
| Failure | Timeout or invalid output: one retry, then the item becomes To verify (engine_gap). If more than a set share of requirements are engine_gap (placeholder 40%), the analysis fails with a retry, and no score is shown. |
| Cost controls | Per-user daily caps. Two-pass judge only for unresolved requirements. Every call writes a Usage row (model, tokens, latency, outcome). |
| Embeddings | text-embedding-3-small, 1536 dimensions (**FACT:** current). One per evidence item. Recomputed when the hash changes. Retrieval only. Never assigns a state. |
| Async | Analysis, tailoring and letter generation run as jobs the client polls. Whether the platform supports this on the current host is a technical dependency (OQ-12). |
