# 12. Tailoring system

## Must not

- Invent jobs, projects, achievements, metrics, employers, certifications, education, titles or responsibilities.

- Turn a recommendation, a quiz result or a suggestion into a claimed skill.

- Write a skill the evidence does not show, even if the job asks for it.

- Change numbers, dates, titles, employers or credentials.

## May

- Reword an existing bullet or summary for clarity and relevance.

- Align terminology where the concept is supported by the cited evidence.

- Reorder existing bullets and sections by relevance.

- Promote a skill already shown in bullets into the Skills list.

- Hide a skill not relevant to the job.

## Change types

| **Type** | **What** | **Decisions** |
|---|---|---|
| reword | Reword an existing bullet. | Accept, Reject, Edit. Eligible for Accept all if wording-only. |
| reorder | Reorder bullets or sections. | Accept, Reject. Not in Accept all. |
| summary_reword | Reword an existing summary. | Accept, Reject, Edit. |
| summary_draft | A summary where none exists, each sentence citing evidence. | Needs confirmation. Never in Accept all. |
| skill_promote | Add an evidenced skill to the Skills list. | Accept, Reject. Not in Accept all. |
| skill_hide | Hide an irrelevant skill from this application's resume. | Accept, Reject. |

## Suggestion object

| **Field** | **Content** |
|---|---|
| id, application_id, analysis_id | Identity. |
| target_type, target_item_id | What is changed. |
| change_type, wording_only | From the table above. |
| original_text, proposed_text | Exact texts. |
| reason_text | One line, generated from the linked requirement. |
| requirement_ids, evidence_ids | Links. Required unless Blocked. |
| validator_result | Status (pass, needs_confirmation, blocked), atoms found, flags. |
| support_state | evidence_backed, needs_confirmation, blocked. |
| status | proposed, accepted, rejected, edited, superseded. |

## Decisions and rules

| **Item** | **Rule** |
|---|---|
| Accept | Stores a TailoringDecision. The change enters the derived resume. |
| Reject | Stores a decision. The original stays. |
| Edit | The user edits the proposed text. The Claim Validator re-runs. New factual atoms not in the evidence prompt: "You added {X}. Is this true?" Yes creates a user_statement evidence item and the edit is allowed. No removes the new text. |
| Accept all safe | Available only when two or more suggestions qualify. Qualifying means all of: change_type is reword; wording_only is true; the validator passed; no new atoms; no numbers, dates, entities or titles changed; scope rank not raised. Each card stays viewable and undoable. |
| Conflicts | Two suggestions on the same bullet: only one active. The other is superseded. |
| Undo | Until export. Export seals the derived version. |
| Assembly | The derived ResumeVersion is built by code from the base version and accepted decisions. No model rewrites the whole resume (**FACT:** today an "optimise" path can). |
| Which requirement states produce what | Backed up, not expressed in the job's terms: reword. Skill shown in bullets but not listed: skill_promote. Needs attention (claimed_not_shown or adjacent): a question card, never text. Unsupported or To verify: no text; a Blocked card when the user might expect one. |

## Acceptance

- Every suggestion has original, proposed, reason, evidence and source, or is Blocked. **DECISION.**

- Zero accepted changes contain an unsupported atom in the adversarial suite. Release-blocking. **DECISION.**

- Accepting changes leaves the score unchanged. **DECISION.**
