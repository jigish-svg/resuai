# 25. Existing repository migration

Not every issue needs a rewrite. KEEP, MODIFY, REMOVE or REBUILD is stated for each.

| **Current** | **Required** | **Action** |
|---|---|---|
| Score weights sum to 0.95, capped at 95 (**FACT**) | Weights sum to 1.0, six dimensions, renormalised, tested. | REBUILD (scorer) |
| Neutral fill 0.75 for empty categories, default ATS score 85 (**FACT**) | No neutral fills. Inactive dimensions are dropped and renormalised. | REMOVE |
| Final Score blends the interview number (**FACT**) | No blend. No number. | REMOVE |
| Readiness Journey component (**FACT**) | None. | REMOVE |
| ATS checklist inside the match (**FACT**) | No ATS in fit. Format check post-MVP. | REMOVE |
| A passed quiz adds a skill to the resume (**FACT**) | Quiz becomes a practice note. Manual skill entries are Listed (claimed). | MODIFY |
| Uploaded proof stored, never used (**FACT**) | Documents feed Evidence. Keep the private bucket and policies. | REBUILD around Document (keep storage) |
| Inferred requirements enter the score (**FACT**) | Optional prompts, never scored, constraint enforced. | MODIFY |
| Truth Guard called from one route only (**FACT**) | Claim Validator on every generated text path, server-enforced. | REBUILD (keep the idea) |
| Cover letters unvalidated (**FACT**) | Segments with evidence ids and validation. | MODIFY (keep DOCX export) |
| Interview talking points unvalidated (**FACT**) | Evidence-cited and validated. | MODIFY |
| Skills and metrics per bullet from the model, stale after edits (**FACT**) | Derived by concept matching. Lineage and hashes. | REBUILD |
| Resume save trusts browser JSON; raw text can drift (**FACT**) | Server-validated versions, one source of text. | REBUILD |
| Delete-then-insert saves, not atomic (**FACT**) | Transactional functions. | REBUILD |
| 8-item sidebar, 4 job pickers (**FACT**) | Two-item navigation and an Application page. | REBUILD (shell); REMOVE 4 picker pages |
| Dashboard with 7 card containers, gradient tiles, averages (**FACT**) | Home with a Continue card and a list. | REBUILD |
| profiles.plan free or paid, hard-coded limits (**FACT**) | Entitlements later. Until then free_beta and caps. | MODIFY (adapter now, replace in Phase 6) |
| Upgrade page placeholder (**FACT**) | Account menu placeholder. | KEEP (move) |
| Embeddings stored, never read (**FACT**) | Evidence embeddings used for retrieval only. | MODIFY |
| ATS keyword check uses substring, so "Java" matches "JavaScript" (**FACT**) | Word-boundary concept matching with never-merge pairs. | REBUILD (normaliser) |
| One model call matches all requirements at once (**FACT**) | Hybrid matcher with validated judge. | REBUILD |
| Requirement categories and importance enums (**FACT**) | Kind, necessity, must-have, numeric, origin. | MODIFY (migration) |
| DOCX export ignores templates, built-in fonts only, PDF built in the browser (**FACT**) | Token engine, three emitters, embedded fonts, server authorisation. | REBUILD (renderer); KEEP the PDF library if viable |
| 4 templates as style objects in one switch (**FACT**) | 7 templates as tokens. | MODIFY |
| Rate limiter fails open (**FACT**) | Fail closed on expensive routes, daily caps. | MODIFY |
| Upload type by file extension in the job parse route (**FACT**) | Content-based detection. Resume parse route to be checked. | MODIFY |
| Interview chat widget using a web search tool (**FACT**) | Removed (generic chatbot). | REMOVE |
| Study links by live web search and a hard-coded map (**FACT**) | Checked registry. | REBUILD |
| Voice mock interview with readiness score (**FACT**) | Kept, capped, no number, no score link. | MODIFY |
| Kanban board with drag and drop (**FACT**) | Status list. | MODIFY (remove board) |
| Landing page about 930 words, 15 cards (**FACT**) | Under about 250 words. | REBUILD |
| Auth: Google and email code, account deletion, cookie banner, Sentry, private storage, RLS pattern (**FACT**) | Same. | KEEP |
| Palette and typeface (**FACT**) | Same. | KEEP |
| Guides and SEO groundwork (**FACT**) | Trimmed and kept. | KEEP (trim) |
| No automated tests, no analytics (**FACT**) | Test layers and event table. | ADD |
| Existing tables: achievements, job_requirements, matches, match_items, evidence_uploads, cover_letters, interview_prep | Map to Evidence, Requirement, FitAnalysis, RequirementResult, Document, CoverLetter, InterviewPrep with data migrations. | MODIFY (migrate) |
