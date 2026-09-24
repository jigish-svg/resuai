# 3. Core user journey

The pipeline is not strictly sequential. Resume reading starts on upload, so it is ready when the job arrives. Steps 5 to 8 run without user input.

## 3A. Actions and outputs

| **Step** | **User action** | **System action** | **Output** |
|---|---|---|---|
| 1\. Resume input | Uploads a file or pastes text. | Stores the document, extracts text, parses in the background, checks every extracted item against the source. | Document, ResumeVersion (draft), Evidence items. |
| 2\. Job input | Pastes a link or the job text. | Detects link or text. Link: fetch pipeline (section 16). Text: use directly. | JobIngest with raw text and method. |
| 3\. Job extraction | None. | Reads structured job data if present, else visible text. Extracts title, company, location, requirements with source quotes. | Draft job and draft requirements. |
| 4\. Job confirmation | Confirms or fixes the job. | Freezes the job and requirement set. | Confirmed Job, Requirement rows. |
| 5\. Resume parsing check | Confirms the read resume (first time only). | Marks the ResumeVersion sealed for analysis. | Sealed ResumeVersion. |
| 6\. Evidence extraction | None. | Derives evidence items from resume items and documents, with concepts and strength. | Evidence rows with lineage and hash. |
| 7\. Requirement extraction | None (review link optional). | Types each requirement, sets necessity, numbers, must-have flag. Inferred items stored but not scored. | Requirements with kind, necessity, numeric target. |
| 8\. Matching | None. | Runs the hybrid matcher (section 11). Validates every model output in code. | RequirementResult rows with evidence links. |
| 9\. Fit analysis | Views the fit. | Computes the score in code from results. | FitAnalysis with score, label, coverage. |
| 10\. Groups | Opens groups or single items. | Serves states and reasons. | Backed up, Needs attention, To verify lists. |
| 11\. Improvements | Accepts, rejects or edits each change. | Generates candidate changes from evidence, validates, stores decisions. | TailoringSuggestion and TailoringDecision rows. |
| 12\. Tailored resume | Reviews and exports. | Assembles a derived version from accepted changes. Runs the export guard. | Derived ResumeVersion, PDF or DOCX. |
| 13\. Application pack | Opens the letter and checklist. | Generates and validates the cover letter. Tracks checklist state. | CoverLetter, checklist state. |
| 14\. Interview preparation | Reads and practises. | Generates and validates questions and talking points. Voice practice is bounded. | InterviewPrep and InterviewItem rows. |

## 3B. UI, states and safety

| **Step** | **UI** | **Loading** | **Error** | **Empty** | **Trust and safety** |
|---|---|---|---|---|---|
| 1\. Resume input | Drop zone, "Paste text" link, confirm line. | "Reading your resume…" | "We could not read this file. Try a text-based PDF or paste the text." Too big: "That file is over 5 MB." | No resume: the drop zone is the whole screen. | Type checked by content, not extension. Size and page caps. Files stored privately. |
| 2\. Job input | One box: "Paste the job or a link". | None until submit. | "That does not look like a job. Paste the job description." | Empty box with example hint. | Only public https links. Text length cap. |
| 3\. Job extraction | Progress text only. | "Reading the job…" | "This site will not let us read the page. Paste the job description instead." Also for login walls and empty pages. | Not applicable. | Fetched content is untrusted. Server-side fetch protections. Robots respected. |
| 4\. Job confirmation | Title, company, location, "N requirements found", Review link. | None. | "We could not find requirements. Paste the full description." | Zero requirements blocks Analyze. | Every requirement has a source quote found in the text. |
| 5\. Resume parsing check | Confirm line "Found 3 roles, 2 projects, 8 skills. Looks right?" | "Reading your resume…" | "Some parts look unclear. Review them?" | Nothing parsed: return to step 1. | Every bullet exists in the source text. |
| 6\. Evidence extraction | No UI. | Part of "Finding evidence…" | Silent retry once, then analysis fails with a retry button. | Resume with no experience: fit runs on what exists, coverage shown. | Evidence carries source position and hash. |
| 7\. Requirement extraction | Review list (optional). | Part of "Analyzing the job…" | Low-confidence items go to Review, not to a silent guess. | Job with no requirements: blocked at step 4. | Inferred items flagged and never scored. |
| 8\. Matching | No UI. | "Finding evidence…" | Model failure on one requirement makes it To verify (engine_gap), never Unsupported. | Not applicable. | Model output validated: ids exist, quote is inside the cited evidence. |
| 9\. Fit analysis | Fit screen. | "Building your fit…" | "We could not finish. Try again." Keeps partial results out of view. | Not enough evaluated requirements: "Not enough to score yet." with the reason. | Score is a pure function. Coverage always shown. |
| 10\. Groups | Three groups, three items each, "See why". | None. | Not applicable. | A group with no items is hidden. | Wording never says "you do not have this" for absent evidence. |
| 11\. Improvements | Change cards. | "Building your suggestions…" | "We could not suggest changes. Your resume is unchanged." | "Nothing to change. Your resume already shows what it can." | Claim Validator on every card. Blocked cards show why. |
| 12\. Tailored resume | Preview with highlighted changes, Download. | "Preparing your file…" | "Some text needs your OK before export." lists the items. | No accepted changes: export the base resume. | Export guard runs on the server at export. |
| 13\. Application pack | Letter editor, checklist. | "Writing your letter…" | "We could not write the letter. Try again." | Letter not started: one button "Write my letter". | Every factual sentence cites evidence. New claims need your confirmation. |
| 14\. Interview preparation | Start card, one question at a time. | "Preparing your questions…" | "We could not prepare questions. Try again." | Not started: "10 questions, about 15 min. Start." | Talking points cite evidence. Gaps get honest guidance only. |
