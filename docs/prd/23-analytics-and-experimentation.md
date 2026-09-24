# 23. Analytics and experimentation

| **Event** | **Trigger** | **Properties** | **Purpose** |
|---|---|---|---|
| landing_viewed | Landing loaded | source, referrer type | Acquisition |
| cta_check_fit_clicked | Hero button clicked | variant | Message tests |
| signup_started / signup_completed | Auth step | method | Friction |
| resume_uploaded | Document accepted | file_type, size_bucket | Activation |
| resume_parse_completed | Parse finished | duration_ms, items_found, unverified_count | Parse quality |
| resume_parse_corrected | User edits the parse | section, count | Parse quality |
| job_added | Job input submitted | method (url, paste) | Activation |
| job_ingest_blocked | Link could not be read | reason | Fetch policy tuning |
| job_confirmed | Confirm pressed | requirement_count, low_confidence_count, edited | Extraction quality |
| application_created | Application created | has_default_resume | Activation |
| fit_analysis_completed | Analysis complete | score_bucket, label, coverage, counts per state, duration_ms | Value and quality |
| fit_viewed | Fit screen shown | variant (score-first or change-first) | Experiment 2 |
| evidence_viewed | Evidence sheet opened | state | Trust |
| correction_submitted | Correction action | action, state_before | Trust and quality |
| tailoring_opened | Improve tab opened | suggestion_count | Value |
| tailoring_change_accepted / rejected / edited | Decision | change_type, support_state | Value and quality |
| accept_all_safe_used | Accept all used | count | Feature check |
| guard_blocked / needs_confirmation_shown | Validator outcome shown | reason code | Safety |
| tailored_resume_exported | Export completed | format, template_id, accepted_count | Value |
| export_blocked_by_guard | Export refused | reason | Safety |
| cover_letter_generated / edited / downloaded | Letter events | validated, prompts_shown | Value |
| interview_prep_opened / practice_session_started / completed | Interview events | mode, duration_s | Value and cost |
| application_status_changed | Status changed | from, to | Outcome signal |
| certification_suggestion_clicked | Registry link clicked | concept | Suggestion usefulness |
| document_added / evidence_confirmed | Documents activity | kind | Evidence depth |
| checklist_item_completed | Checklist tick | item, auto | Pack usage |
| paywall_viewed (placeholder) | A gate would show | trigger, experiment arm | Experiments 3 and 4 (no purchase exists) |
| experiment_exposed | User enters an arm | experiment_id, arm | Experiments |
| error_shown | User-facing error | code, screen | Quality |

## Rules

- No resume, job or evidence text in any event. Identifiers and enums only.

- Event names and properties are allow-listed and validated on the server.

- Events are stored in the Event table first. A provider can be added later (OQ-13).

- Experiment arms are assigned by a stable hash of the user id. Each exposure is logged once.

- Analytics respects the cookie consent banner (**FACT:** exists).
