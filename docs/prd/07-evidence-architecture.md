# 7. Evidence architecture

**DECISION.** Core relationship: **JOB REQUIREMENT, then EVIDENCE, then DECISION, then REASON, then SOURCE.** Every requirement result stores all five.

## 7A. States

Four canonical states. The Fit screen groups them as Backed up, Needs attention (which contains Unsupported items) and To verify.

| **State** | **Deterministic meaning** | **Reason codes** | **Score effect** | **User sees** |
|---|---|---|---|---|
| Backed up | The requirement's concept is present in at least one evidence item of strength evidenced or verified (an item that shows it in use or held), and every numeric or level target is met. Also set when the user supplies evidence that meets it. | exact_in_role_bullet, exact_in_project, alias_match, cert_present, degree_meets_level, years_meet, judge_supported, user_confirmed, user_declared | Credit 1.00 (verified) or 0.85 (evidenced) | "Backed up". Line: "Your {source} shows this." |
| Needs attention | Partly shown. One of: the skill is only listed with no item showing use; a numeric target is partly met; a curated adjacent concept is present; a verified model judgement says partial. | claimed_not_shown, years_short, adjacent_concept, judge_partial | Credit 0.50, ratio, 0.40, 0.50 (starting values) | "Needs attention". Line names the reason. |
| Unsupported | After every step, nothing in the candidate's documents shows it; or the data contradicts it; or the user said they do not have it. | no_evidence_found, below_required_level, expired_credential, contradicted_by_data, user_confirmed_no | Credit 0 | See wording rules below. Never "you do not have this" unless the user said so. |
| To verify | The documents cannot decide it by design, or the engine could not decide it, or the evidence is too thin to judge. | by_design, thin_evidence, ambiguous_requirement, low_confidence_extraction, judge_disagreement, engine_gap | Excluded from the score. Lowers coverage. | "To verify". Line: what to confirm. |

## 7B. Wording by reason

| **Reason** | **Words shown** | **Note** |
|---|---|---|
| no_evidence_found | "Not on your documents." | A statement about the documents, not the person. |
| below_required_level / contradicted_by_data | "Your documents show {X}. The job asks {Y}." | Both facts are shown. |
| expired_credential | "Your {credential} shows an expiry of {date}." | |
| user_confirmed_no | "You told us you do not have this." | The only wording that states absence. |
| claimed_not_shown | "Listed in Skills. Nothing shows it in use." | |
| adjacent_concept | "Related: {concept}. Not the same skill." | Names the related item. |
| years_short | "{n} of {m} years found." | |
| by_design | "The job asks for {X}. Documents cannot show this." | Work authorisation, location, clearance. |
| thin_evidence | "We need more detail on {item}." | Links to Add evidence. |
| engine_gap / judge_disagreement | "We could not tell. Please check this one." | Never shown as a failure of the person. |

## 7C. Distinctions the system must keep

| **Concept** | **Representation** | **Meaning** |
|---|---|---|
| Absence of evidence | Unsupported with reason no_evidence_found. | Nothing in the documents. Says nothing about the person. |
| Explicit contradiction | Unsupported with contradicted_by_data, below_required_level or expired_credential. | A specific datum conflicts. Both facts shown. |
| Unsupported claim | A candidate claim without support: evidence strength claimed, result Needs attention (claimed_not_shown). In generated text: Blocked. | A statement with nothing behind it. |
| Genuine gap | Unsupported with user_confirmed_no. | Only when the user says so. It then stays a gap for that application. |
| User-confirmed evidence | Backed up with user_confirmed. Strength evidenced if the statement shows use in context, claimed if a bare assertion. Never verified. | The user's own words, kept and labelled. |

## 7D. Evidence strength

| **Level** | **Meaning** | **Shown as** |
|---|---|---|
| claimed | The candidate stated it, for example in a skills list. | Shown as "Listed" |
| evidenced | A bullet, project, document or user description shows it in use or held. | Shown as "Backed up" |
| verified | An outside record confirms it (for example an issuer link whose name, issuer and date match). An uploaded file or resume alone is never verified. | Shown as "Verified link" |

**DECISION:** "Verified" means confirmed against an outside record. An uploaded resume or document is at most evidenced.

## 7E. Evidence kinds

| **Kind** | **Meaning** |
|---|---|
| experience_bullet | A bullet under a role. |
| project | A project entry and its bullets. |
| education | A degree or course record. |
| certification | A certificate or licence entry. |
| skill_mention | An entry in a skills list (always claimed). |
| link | A stored link, for example a repository. Stored, not read. |
| document_excerpt | A quoted passage from an uploaded document. |
| user_statement | Text the user added as evidence, or a confirmation. |

## 7F. Evidence identity

| **Field** | **Rule** |
|---|---|
| id | uuid, primary key. Display form "ev\_" plus the first 8 hex characters in logs and support tools. |
| lineage_id | uuid. The same across versions of the same source item, so a corrected or edited bullet keeps its history. |
| source_ref | JSON: document_id, resume_version_id, path (for example experience\[1\].bullets\[0\]), char_start, char_end. |
| content_hash | SHA-256 of the normalised text. Used to detect change. |
| concept_ids | Array of concept ids found in the text by dictionary matching. Derived, never assigned by a model. |
| strength, kind, origin | Enums. origin is parsed, user_added or user_confirmed. |
| verification | JSON: method (none, document, issuer_link), checked_at, url. |
| status | active, superseded or deleted. |
| Staleness rule | Any artifact that cites an evidence id also stores the content_hash it saw. If the current evidence for that lineage has a different hash, the artifact is marked stale and must be regenerated or re-confirmed. This replaces today's stale skills and metrics (**FACT**). |

## 7G. Who references evidence

| **Artifact** | **Reference rule** |
|---|---|
| Resume version | Every bullet, project and skill has an item_id. Evidence rows point back to the item by path. Derived bullets from tailoring store derived_from_evidence_ids. |
| Requirement result | RequirementEvidence rows: evidence_id, role (primary or supporting), quote, content_hash, method. |
| Tailoring suggestion | evidence_ids required unless the suggestion is Blocked. |
| Cover letter | Each segment lists evidence_ids. Factual segments must have at least one. |
| Interview item | Each talking point lists evidence_ids. |
| Export | The export record stores the file hash and the evidence ids of every changed line. |
