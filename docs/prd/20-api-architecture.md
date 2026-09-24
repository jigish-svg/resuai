# 20. API architecture

## 20A. Conventions

| **Topic** | **Rule** |
|---|---|
| Base path | /api/v1. JSON. **DECISION:** keep the current framework (Next.js route handlers on Supabase). No separate backend service in the MVP. |
| Authentication | Session cookie from the auth provider (**FACT:** current). Every route except the landing assets requires it. 401 otherwise. |
| Authorisation | The user id comes from the session, never from the request. Row-level security plus explicit ownership checks. |
| Errors | { "error": { "code": string, "message": string, "details": object? } }. Codes: validation_failed, unauthorized, forbidden, not_found, conflict, payload_too_large, unsupported_media_type, rate_limited, upstream_blocked, analysis_failed, guard_blocked, needs_confirmation, entitlement_required (future). |
| Async work | Long tasks return 202 with an id. The client polls the GET. Statuses: queued, running, complete, failed. |
| Idempotency | POSTs that start work accept an Idempotency-Key header. The same key returns the same job. |
| Validation | Runtime schemas on every request body. Unknown fields rejected. |
| Limits | Body size caps per route. Rate limits per user per route. Expensive routes also have daily caps and fail closed. |
| Pagination | Cursor based. limit up to 50. |

## 20B. Endpoints

All paths are under /api/v1 and require an authenticated user unless stated. Sensitive logic (scoring, validation, entitlement) is server-side only.

| **Method** | **Path** | **Auth** | **Input** | **Output** | **Validation** | **Errors** |
|---|---|---|---|---|---|---|
| POST | /documents | User | multipart file + kind, or JSON kind + text or url + description | 202 document id, status | Type by content, 5 MB, text 50,000 chars, https url | 400, 413, 415, 429 |
| GET | /documents | User | kind?, cursor? | Documents | Enums | 401 |
| GET | /documents/{id} | User | \- | Document, evidence summary | Ownership | 404 |
| DELETE | /documents/{id} | User | \- | 204\. Dependent artifacts marked stale | Ownership | 404 |
| POST | /resumes/import | User | document_id | 202 resume id, version id | Document ready, kind resume | 409, 422 |
| GET | /resumes | User | \- | Resumes | \- | 401 |
| GET | /resumes/{id} | User | \- | Resume, latest version | Ownership | 404 |
| POST | /resumes/{id}/versions | User | base_version_id, canonical content | 201 draft version | Server schema, current draft only, atomic | 409, 422 |
| GET | /resumes/{id}/versions/{vid} | User | \- | Version | Ownership | 404 |
| PATCH | /resumes/{id}/settings | User | template_id?, accent?, density?, name? | Resume | Enums, active template | 422 |
| POST | /resumes/{id}/set-default | User | \- | 204 | Ownership | 404 |
| DELETE | /resumes/{id} | User | \- | 204 | Not referenced by an open application, or confirm | 409 |
| GET | /templates | User | \- | Active templates | \- | 401 |
| POST | /jobs/ingest | User | url or text | 202 ingest id, status (needs_paste if no-fetch) | https public url; 50,000 chars | 400, 429 |
| GET | /jobs/ingest/{id} | User | \- | Status, draft job, requirement summary, method, error_code | Ownership | 404 |
| POST | /jobs/ingest/{id}/confirm | User | edits? | 201 job id | At least one stated requirement with a quote | 409, 422 |
| GET | /jobs/{id} | User | \- | Job, requirements | Ownership | 404 |
| PATCH | /jobs/{id}/requirements/{rid} | User | necessity?, kind?, remove? | Requirement | Enums, audited | 404, 422 |
| POST | /applications | User | job_id, resume_id | 201 application id. Starts analysis | Ownership of both | 404 |
| GET | /applications | User | status?, cursor? | Applications with fit summary and next_step | Enums | 401 |
| GET | /applications/{id} | User | \- | Application, latest analysis, pack state | Ownership | 404 |
| PATCH | /applications/{id} | User | status?, deadline?, notes?, archived? | Application | Enums | 422 |
| DELETE | /applications/{id} | User | \- | 204 | Ownership | 404 |
| POST | /applications/{id}/analysis | User | mode (full or revise) | 202 analysis id | Sealed resume version, idempotency key, daily cap | 404, 429 |
| GET | /applications/{id}/analysis/latest | User | include=results? | Score, label, coverage, range, groups, results | Ownership | 404 |
| GET | /analyses/{id}/requirements/{rid} | User | \- | Result, evidence, registry suggestions | Ownership | 404 |
| POST | /analyses/{id}/requirements/{rid}/corrections | User | action, payload | 202 new revision | Action enum, per-action schema, evidence owned by user | 404, 422 |
| GET | /evidence | User | document_id?, kind? | Evidence items | Enums | 401 |
| POST | /evidence | User | kind, text, link?, requirement_id? | 201 evidence | Length, https link. Strength by rule | 422 |
| PATCH | /evidence/{id} | User | text?, confirm? | New lineage row, old superseded | Ownership | 404 |
| DELETE | /evidence/{id} | User | \- | 204\. Dependents marked stale | Ownership | 404 |
| POST | /applications/{id}/tailoring | User | analysis_id | 202 tailoring id | Fresh analysis, daily cap | 409 stale, 429 |
| GET | /applications/{id}/tailoring/latest | User | \- | Suggestions with validator results | Ownership | 404 |
| POST | /tailoring/{sid}/decision | User | decision, edited_text?, confirm_atoms? | Suggestion, validator result | Validator re-run | 409, 422 guard_blocked or needs_confirmation |
| POST | /applications/{id}/tailoring/accept-all-safe | User | \- | Accepted ids | Only eligible suggestions | 409 |
| POST | /tailoring/{sid}/undo | User | \- | Suggestion | Before export | 409 |
| POST | /applications/{id}/tailored-resume | User | \- | 201 derived version id | Built from decisions, atomic | 409 |
| POST | /resumes/{id}/versions/{vid}/export/authorize | User | format, application_id? | 200 export id, single-use token; or 422 needs_confirmation with items | Validator over changed lines. Seals version | 403, 422 |
| POST | /exports/{id}/complete | User | file_hash | 204 | Token single use. Only if rendered outside the server | 410 |
| POST | /applications/{id}/cover-letter/generate | User | motivation_text? | 202 letter id | Length cap, daily cap | 429 |
| GET | /applications/{id}/cover-letter | User | \- | Letter, validator result | Ownership | 404 |
| PUT | /cover-letter/{id} | User | segments, confirm_atoms? | Letter, validator result | Validator re-run | 422 needs_confirmation |
| POST | /applications/{id}/interview-prep | User | \- | 202 prep id | Daily cap | 429 |
| GET | /applications/{id}/interview-prep | User | \- | Items with talking points | Ownership | 404 |
| POST | /interview-items/{id}/clarify | User | answer_text | Item, confirmation prompt | Validator | 422 |
| POST | /applications/{id}/practice-sessions | User | mode | 201 session id, ephemeral token, max seconds | Per-user caps | 429 |
| POST | /practice-sessions/{id}/finalize | User | transcript reference | Written feedback | Ownership | 404 |
| GET / PATCH | /applications/{id}/checklist | User | item, done | Checklist | Known items | 422 |
| GET | /requirements/{rid}/suggestions | User | \- | Registry resources with status ok | Eligibility rules | 404 |
| POST | /requirement-suggestions/{id}/proof | User | document_id or link | Evidence | Ownership, https | 422 |
| DELETE | /account | User, recent sign-in | confirm | 202 | Re-auth | 403 |
| GET | /me/export | User | \- | 202 export id | Rate limit | 429 |
| POST | /events | User or anonymous | name, properties | 204 | Allow-listed names, size cap, no free text | 400 |
| GET | /entitlements | User | \- | free_beta placeholder | \- | 401 |
