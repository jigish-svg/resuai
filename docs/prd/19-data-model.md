# 19. Data model

## 19A. Conventions

- Primary keys are uuid with default gen_random_uuid(). Timestamps are timestamptz in UTC.

- Enums are text columns with CHECK constraints (**FACT:** the current pattern).

- Every user-owned table has row-level security by user_id, directly or through its parent (**FACT:** the current pattern). Server code uses the service role only for jobs that need it.

- User-owned children cascade on delete. Sealed resume versions are immutable, enforced by a trigger.

- A CHECK constraint forbids a requirement with origin inferred and affects_score true.

- Analyses are immutable. A correction creates a new revision. Unique (application_id, revision).

- Multi-row writes happen in one database function or transaction. No delete-then-insert from the client path.

## 19B. Entities

| **Entity** | **Fields** | **Notes** |
|---|---|---|
| User | id (auth id), email, full_name, locale, created_at, updated_at, deleted_at | Extends the auth user. The plan column is removed in Phase 6. |
| Document | id, user_id, kind (resume, project, certificate, link, other), source (upload, paste, link), file_path, file_name, mime, size_bytes, source_text, url, description, status (processing, ready, failed), error_code, content_hash, created_at, updated_at | Replaces evidence_uploads and raw uploads. |
| Resume | id, user_id, name, is_default, template_id, accent, density, current_draft_version_id, created_at, updated_at, deleted_at | FK Template, ResumeVersion. |
| ResumeVersion | id, resume_id, parent_version_id, kind (base, tailored), application_id, status (draft, sealed), content jsonb (canonical model), content_hash, source_document_id, schema_version, sealed_at, created_at | content is the source of truth. |
| ResumeSection | id, resume_version_id, section_type, item_id, path, ordinal, text, start, end | A derived projection rebuilt on seal, used for search and evidence paths. |
| Evidence | id, user_id, lineage_id, document_id, resume_version_id, kind, text, source_ref jsonb, content_hash, concept_ids uuid\[\], strength (claimed, evidenced, verified), origin (parsed, user_added, user_confirmed), verification jsonb, embedding vector(1536), status (active, superseded, deleted), created_at | Replaces achievements. |
| Concept | id, slug (unique), canonical_name, kind, family, is_active | Skill and tool vocabulary. |
| ConceptAlias | concept_id, alias_normalized, alias_display, locale | PK (concept_id, alias_normalized). |
| ConceptRelation | from_concept_id, to_concept_id, relation (adjacent, broader, never_merge) | Curated. never_merge stored both ways. |
| RoleFamily | id, slug, label_overrides jsonb, default_sections jsonb, examples jsonb, recommended_templates text\[\] | Configuration. |
| JobIngest | id, user_id, input_type (url, text), source_url, method (structured, page_text, paste), status (queued, fetching, extracting, needs_paste, ready, failed), error_code, raw_text, structured_json, content_hash, robots_result, fetched_at, created_at | New. |
| Job | id, user_id, ingest_id, title, company, location, employment_type, source_url, raw_text, content_hash, parse_version, confirmed_at, created_at | Replaces jobs. |
| Requirement | id, job_id, ordinal, kind, text, source_quote, quote_start, quote_end, origin (stated, inferred), necessity (required, preferred, nice_to_have, unspecified), must_have, importance, numeric jsonb, alternatives jsonb, concept_id, extraction_method, confidence (high, medium, low), affects_score, user_edited, created_at | Replaces job_requirements. |
| Application | id, user_id, job_id, base_resume_version_id, tailored_resume_version_id, status (saved, applied, interview, offer, rejected), archived_at, deadline, notes, checklist jsonb, created_at, updated_at | New. The parent of everything for one job. |
| FitAnalysis | id, application_id, revision, job_id, resume_version_id, engine_version, score_config_version, status (queued, running, complete, failed, stale), score, label, coverage, evaluated_count, scored_total, range_low, range_high, rules_decided_ratio, inputs_hash, failure_code, created_at | Replaces matches. |
| RequirementResult | id, analysis_id, requirement_id, state (backed_up, needs_attention, unsupported, to_verify), reason_code, credit, weight, dimension, method (rule, alias, embedding_judge, user), confidence, wording_params jsonb, scored, correction_id, created_at | Replaces match_items. |
| RequirementEvidence | id, result_id, evidence_id, role (primary, supporting), quote, content_hash, similarity | Join. The source of "why". |
| Correction | id, user_id, analysis_id, requirement_id, action, payload jsonb, created_at | Logged for review. |
| TailoringSuggestion | id, application_id, analysis_id, target_type, target_item_id, change_type, wording_only, original_text, proposed_text, reason_text, requirement_ids, evidence_ids, validator_result jsonb, support_state, status, created_at | New. |
| TailoringDecision | id, suggestion_id, user_id, decision (accept, reject, edit, accept_all_safe), final_text, validator_result jsonb, decided_at, undone_at | New. |
| CoverLetter | id, application_id, version, segments jsonb (id, text, claim_type, evidence_ids), validator_result jsonb, confirmed_atoms jsonb, status (draft, validated, needs_confirmation), created_at, updated_at | Extends cover_letters. |
| InterviewPrep | id, application_id, analysis_id, status, validator_result jsonb, generated_at | Replaces interview_prep. |
| InterviewItem | id, prep_id, category (likely, candidate_specific, clarification, to_ask), question, source_requirement_id, talking_points jsonb (text, evidence_ids), gap_guidance, needs_clarification, ordinal | New. |
| PracticeSession | id, application_id, started_at, ended_at, duration_s, feedback jsonb, status | Replaces mock_interview_sessions. No score column. |
| Template | id, slug, name, category, tokens jsonb, version, is_active | New. |
| ResourceRegistry | id, concept_id, provider, title, url, kind (course, certification, documentation), status (ok, broken, unchecked), last_checked_at, reviewed_by, created_at | Replaces the hard-coded link map. |
| RequirementSuggestion | id, requirement_id, resource_id, status (suggested, started, completed_claimed, proof_added), created_at | Suggestion is not evidence. |
| ScoreConfig | version, weights jsonb, credits jsonb, bands jsonb, created_at | Versioned so scores are reproducible. |
| Usage | id, user_id, application_id, kind, model, prompt_id, tokens_in, tokens_out, latency_ms, cost_estimate, outcome, created_at | Cost measurement and future metering. |
| Entitlement (placeholder) | id, user_id, kind (free_beta, application_pack, time_pass, subscription), scope_application_id, starts_at, ends_at, status, source (system, provider), provider_ref, created_at | Returns free_beta in the MVP. No Subscription table until Phase 6. |
| Event | id, user_id, anon_id, name, properties jsonb, created_at | Product analytics. |
| AuditLog | id, user_id, action, entity_type, entity_id, metadata jsonb, created_at | Exports, deletions, corrections, fetches, guard outcomes. |

## 19C. Relationships

| **Relationship** | **Purpose** |
|---|---|
| User 1 to many Document, Resume, Evidence, Job, Application | Ownership. |
| Resume 1 to many ResumeVersion; ResumeVersion 1 to many ResumeSection and Evidence | History and derivation. |
| Application many to 1 Job; 1 to many FitAnalysis (revisions) | One job, many analyses. |
| FitAnalysis 1 to many RequirementResult; RequirementResult many to many Evidence through RequirementEvidence | The five-part chain. |
| Application 1 to many TailoringSuggestion; suggestion 1 to many TailoringDecision | Traceable changes. |
| Application 1 to 1 current CoverLetter; 1 to 1 current InterviewPrep; InterviewPrep 1 to many InterviewItem | The pack. |
