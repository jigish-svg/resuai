# 5. Screen-by-screen specification

Endpoint paths refer to section 20. States use the wording in section 7.

## A. Landing (/)

| **Field** | **Detail** |
|---|---|
| Purpose | Explain the product in seconds and start the flow. |
| Primary user goal | Understand what this does and begin. |
| Layout | One column, maximum width about 720 px. Five blocks: hero, three steps, trust example, product preview, FAQ. Footer. |
| Components | Hero, StepsRow (3), EvidenceExample, ChangeCardPreview, FAQ accordion (5), Footer. |
| Information hierarchy | Headline, then button, then product image. Everything else quieter. |
| Primary CTA | Check my fit |
| Secondary CTA | Text link "How it works" (anchor). |
| States | Signed-in visitors are redirected to Home. No dynamic data. Page under about 250 words (**FACT:** today about 930). |
| Interactions | FAQ expands one at a time. CTA goes to sign-in, then to New application. |
| Data required | None. |
| API dependencies | None. Emits landing_viewed and cta_check_fit_clicked. |
| Mobile behavior | Same column. Sticky CTA appears after the first scroll. |

## B. Authentication (/signin)

| **Field** | **Detail** |
|---|---|
| Purpose | Get the user in with minimum friction. |
| Primary user goal | Continue. |
| Layout | One centred panel for new and returning users. |
| Components | GoogleButton, EmailField, "Send code" button, CodeInput (6 digits), legal links. |
| Information hierarchy | Google first, email code second. No password. |
| Primary CTA | Continue with Google |
| Secondary CTA | Use an email code |
| States | Sending code (loading). Wrong code: "That code did not work. Try again." Expired code. Too many tries: "Please wait a minute." |
| Interactions | Digits auto-advance. Paste fills all digits. |
| Data required | Email address. |
| API dependencies | Supabase auth and /auth/callback (**FACT:** exist). The separate password mode on the current login page is removed. |
| Mobile behavior | Full width. Numeric keypad for the code. |

## C. Home (/)

| **Field** | **Detail** |
|---|---|
| Purpose | Answer: what should I do next? |
| Primary user goal | Continue where I left off, or start a new application. |
| Layout | Header, optional Continue card, Applications list, New application button. |
| Components | ContinueCard, ApplicationRow (title, company, status word), EmptyState, NewApplicationButton. |
| Information hierarchy | Continue card first. List second. No metrics, no tiles, no averages. |
| Primary CTA | Continue (card) or Add resume / Add job / New application (empty states). |
| Secondary CTA | Row tap opens the application. "See all". |
| States | First-time without resume: "Check how you fit a job. Add your resume, then a job." Resume but no job: "Add a job. See how you fit it." Returning with work in progress: card plus list. All applied: list only. |
| Interactions | Next-step rule (fixed): 1) changes waiting for review, 2) items to verify, 3) an unfinished pack item, 4) no card. |
| Data required | Per application: id, job title, company, status, fit score, label, counts by state, next_step (server-computed). |
| API dependencies | GET /api/v1/applications |
| Mobile behavior | Same order. Bottom bar visible. |

## D. Resume upload (sheet)

| **Field** | **Detail** |
|---|---|
| Purpose | Get a resume into the system. |
| Primary user goal | Add my resume. |
| Layout | A sheet with a drop zone and a "Paste text" link. |
| Components | DropZone, PasteTextarea, ReadingStatus, ConfirmLine, "Edit" link. |
| Information hierarchy | Drop zone, then confirmation. |
| Primary CTA | Looks right |
| Secondary CTA | Edit details |
| States | Uploading, Reading. Errors: unreadable (scanned or empty), too big, unsupported type. Empty: drop zone only. |
| Interactions | Reading starts automatically. There is no "Parse with AI" button (**FACT:** today it exists). |
| Data required | File up to 5 MB or text up to 50,000 characters (**FACT:** existing limits). |
| API dependencies | POST /api/v1/documents, POST /api/v1/resumes/import, GET /api/v1/resumes/{id} |
| Mobile behavior | File picker and paste. Same sheet as a full screen. |

## E. Resume editor (/resumes/{id})

| **Field** | **Detail** |
|---|---|
| Purpose | Let the user check and improve resume content with the least possible controls. |
| Primary user goal | Get the content right, then download. |
| Layout | Desktop: editor left, live preview right. Section row at the top of the editor. |
| Components | SectionRow, FieldGroup, BulletList, PreviewPane, ControlsBar (Template, Accent, Density), ExportButton, TemplatePanel (screen F merged here). |
| Information hierarchy | Content, then structure, then design controls last. |
| Primary CTA | Download |
| Secondary CTA | Improve wording (one bullet, only when an application is attached). |
| States | Saving, Saved, Save failed (retry). Inline field errors. Empty section: one line and "Add". |
| Interactions | Click a section to open it. One open at a time. Autosave updates the draft. Export or analysis seals a version. |
| Data required | Canonical resume model (section 9), template tokens, settings. |
| API dependencies | GET/POST /api/v1/resumes/{id}/versions, PATCH /api/v1/resumes/{id}/settings, GET /api/v1/templates, POST export authorize. |
| Mobile behavior | Two tabs: Edit and Preview. Sticky Preview button. |

## F. Template selection (panel in E)

| **Field** | **Detail** |
|---|---|
| Purpose | Choose how the resume looks without a long browse. |
| Primary user goal | Pick a good template quickly. |
| Layout | A panel or sheet: a Featured row, then categories. |
| Components | TemplateCard (real rendered preview, name, two short tags), CategoryFilter. |
| Information hierarchy | Preview, name, tags. No paragraphs. |
| Primary CTA | Use template |
| Secondary CTA | Close |
| States | Loading previews. Empty: not applicable (7 templates). |
| Interactions | Selecting applies instantly to the preview. Accent colour and density are separate small controls. |
| Data required | Template list with tokens. |
| API dependencies | GET /api/v1/templates, PATCH /api/v1/resumes/{id}/settings |
| Mobile behavior | Bottom sheet with horizontal cards. |

## G. New application (flow)

| **Field** | **Detail** |
|---|---|
| Purpose | Contain the two inputs an application needs. |
| Primary user goal | Start an application for a specific job. |
| Layout | A sheet or route with the text "Step 1 of 2" and "Step 2 of 2". |
| Components | ResumePicker (only if more than one resume), JobInput, StepText. |
| Information hierarchy | One input per step. |
| Primary CTA | Continue |
| Secondary CTA | Cancel |
| States | Inherited from D and H/I. |
| Interactions | Step 1 is skipped when a default resume exists and the user has one. |
| Data required | resume_id, job input. |
| API dependencies | POST /api/v1/jobs/ingest |
| Mobile behavior | Full screen. |

## H and I. Job input

| **Field** | **Detail** |
|---|---|
| Purpose | Accept a job as a link or as text in one box. |
| Primary user goal | Give the system the job. |
| Layout | One large box, one helper line. |
| Components | JobBox, HelperText, FallbackNotice. |
| Information hierarchy | Box first. Helper text quiet. |
| Primary CTA | Continue |
| Secondary CTA | "Paste the text instead" (appears after a blocked link). |
| States | Detecting. Reading (link). Blocked: "This site will not let us read the page. Paste the job description instead." Invalid: "That does not look like a job." |
| Interactions | Starts with http(s): link mode. Otherwise text mode. A blocked link keeps the link and focuses the paste box. |
| Data required | URL or text up to 50,000 characters. |
| API dependencies | POST /api/v1/jobs/ingest, GET /api/v1/jobs/ingest/{id} |
| Mobile behavior | Same. Paste is the common path. |

## J. Job confirmation

| **Field** | **Detail** |
|---|---|
| Purpose | Let the user check what we found before analysis. |
| Primary user goal | Is this the right job? |
| Layout | A short summary block. No form. |
| Components | JobSummary (title, company, location, type), MethodNote, RequirementsCount, ReviewLink. |
| Information hierarchy | Title and company first. |
| Primary CTA | Analyze |
| Secondary CTA | Edit job text. Not this job. |
| States | Zero requirements: Analyze disabled with "Paste the full description." Low-confidence items: a line "3 to review". |
| Interactions | Review opens the requirement list for edits (necessity, remove, add). |
| Data required | Draft job, method (structured data, page text, paste), requirement count, low-confidence count. |
| API dependencies | GET /api/v1/jobs/ingest/{id}, POST /api/v1/jobs/ingest/{id}/confirm |
| Mobile behavior | Same. |

## K. Fit analysis (Application page, Fit tab)

| **Field** | **Detail** |
|---|---|
| Purpose | Show fit, the reasons, and the next step. |
| Primary user goal | Understand how I fit and what to do. |
| Layout | Header, fit block, three groups, one button. |
| Components | FitBlock (number, one-word label, coverage line), Group (Backed up, Needs attention, To verify; up to 3 items each), SeeWhyLink. |
| Information hierarchy | Overall fit, then why, then what to do. |
| Primary CTA | Improve my application |
| Secondary CTA | See why |
| States | Loading: "Building your fit…". Stale: banner "Your documents changed. Update the fit." Low coverage: range shown. Too little: "Not enough to score yet." |
| Interactions | Tap an item to open the evidence sheet. Correcting evidence re-computes the fit. |
| Data required | FitAnalysis (score, label, coverage, range), results by state. |
| API dependencies | POST /api/v1/applications/{id}/analysis, GET /api/v1/applications/{id}/analysis/latest |
| Mobile behavior | Stacked. Sticky primary button. |

## L. Evidence view (sheet)

| **Field** | **Detail** |
|---|---|
| Purpose | Explain one decision and let the user correct it. |
| Primary user goal | See why, and fix it if wrong. |
| Layout | Side panel (desktop) or bottom sheet (mobile). |
| Components | RequirementQuote, EvidenceQuote with source, StateChip with one-line reason, ActionRow. |
| Information hierarchy | Requirement, evidence, decision. |
| Primary CTA | Looks right, Add evidence, I have this, depending on state. |
| Secondary CTA | Wrong evidence. "This job does not need it". I do not. |
| States | Backed up, Needs attention, Unsupported, To verify (section 7 wording). |
| Interactions | Every action creates a Correction and re-runs that requirement. Score recomputes in code. |
| Data required | Requirement, result, evidence items with source refs. |
| API dependencies | GET /api/v1/analyses/{id}/requirements/{rid}, POST .../corrections |
| Mobile behavior | Bottom sheet, swipe to close. |

## M. Requirement view ("See why")

| **Field** | **Detail** |
|---|---|
| Purpose | Show every requirement and its state without overwhelming the Fit screen. |
| Primary user goal | Scan all requirements. |
| Layout | A list grouped by state, with counts. |
| Components | RequirementRow (quote, state chip, short reason), FilterToggle, "Not in the job post" collapsed section. |
| Information hierarchy | Needs attention first, then To verify, then Backed up. |
| Primary CTA | Improve my application |
| Secondary CTA | Filter: All, Needs attention, To verify. |
| States | Empty group hidden. |
| Interactions | Row opens L. "Not in the job post" holds optional, unscored prompts. |
| Data required | All results for the analysis, inferred suggestions. |
| API dependencies | GET /api/v1/applications/{id}/analysis/latest?include=results |
| Mobile behavior | Same list. |

## N. Tailoring (Improve tab)

| **Field** | **Detail** |
|---|---|
| Purpose | Present evidence-backed changes for the user to decide. |
| Primary user goal | Improve my resume for this job without adding anything untrue. |
| Layout | Header with counter, then one card at a time (mobile) or a short list (desktop). |
| Components | ChangeCard, QuestionCard, BlockedCard, AcceptAllSafeBar, Counter. |
| Information hierarchy | Before, after, why, evidence, decision. |
| Primary CTA | Accept |
| Secondary CTA | Reject. Edit. |
| States | Loading. Empty: "Nothing to change. Your resume already shows what it can." Blocked card with reason. |
| Interactions | Edit re-runs the validator and may ask to confirm new facts. Undo until export. Accept all appears only when two or more wording-only safe changes exist. |
| Data required | TailoringSuggestion rows, validator results. |
| API dependencies | POST/GET tailoring, POST /api/v1/tailoring/{id}/decision, POST accept-all-safe |
| Mobile behavior | One card per screen. |

## O. Tailored resume (review)

| **Field** | **Detail** |
|---|---|
| Purpose | Let the user see the result and export. |
| Primary user goal | Check and download. |
| Layout | Preview of the derived version with accepted changes lightly marked. |
| Components | PreviewPane, ChangesToggle, ExportButtons. |
| Information hierarchy | Preview, then download. |
| Primary CTA | Download PDF |
| Secondary CTA | Download Word. Back to changes. |
| States | Preparing. Guard message listing items needing confirmation. No accepted changes: base resume. |
| Interactions | Export authorises on the server first. |
| Data required | Derived ResumeVersion, template tokens. |
| API dependencies | POST /api/v1/applications/{id}/tailored-resume, POST .../export/authorize |
| Mobile behavior | Preview full width. |

## P. Cover letter (Letter tab)

| **Field** | **Detail** |
|---|---|
| Purpose | Produce a letter grounded in the user's evidence. |
| Primary user goal | Get a letter I can send. |
| Layout | One editable text area. No settings. |
| Components | LetterEditor, ValidationNote, CopyButton, DownloadButton. |
| Information hierarchy | Letter, then actions. |
| Primary CTA | Write my letter (empty) / Download. |
| Secondary CTA | Copy. Regenerate. |
| States | Empty, writing, written, "Confirm these facts" prompt when the user adds new claims, error. |
| Interactions | Edits are re-validated on save. New factual claims need "Yes, this is true". |
| Data required | CoverLetter segments with evidence ids. |
| API dependencies | POST/GET/PUT cover-letter |
| Mobile behavior | Full width editor. |

## Q. Interview preparation (Interview tab)

| **Field** | **Detail** |
|---|---|
| Purpose | Prepare from real evidence. |
| Primary user goal | Feel ready for this interview. |
| Layout | Start card, then one question at a time. Voice practice as a second option. |
| Components | StartCard ("10 questions, about 15 min"), QuestionView, TalkingPoints, ClarifyPrompt, VoicePracticeEntry. |
| Information hierarchy | Question, then points from your evidence. |
| Primary CTA | Start |
| Secondary CTA | Next question. Start voice practice. |
| States | Not started, preparing, in progress, finished, error. Clarify prompts for thin evidence. |
| Interactions | Clarify answers can become evidence items after confirmation. No score is shown. |
| Data required | InterviewItem rows with evidence ids. |
| API dependencies | POST/GET interview-prep, practice-sessions endpoints |
| Mobile behavior | One question per screen. |

## R. Applications list (/applications)

| **Field** | **Detail** |
|---|---|
| Purpose | Show all applications with a simple status. |
| Primary user goal | Find and update an application. |
| Layout | A plain list with status tabs: Saved, Applied, Interview, Offer, Rejected. |
| Components | StatusTabs, ApplicationRow, StatusMenu. |
| Information hierarchy | Title and company, then status. |
| Primary CTA | New application |
| Secondary CTA | Change status. |
| States | Empty per tab: one line. |
| Interactions | Status menu on each row. Archive hides a row. |
| Data required | Application list. |
| API dependencies | GET /api/v1/applications, PATCH /api/v1/applications/{id} |
| Mobile behavior | List with a status filter. |

## S. Documents (/documents)

| **Field** | **Detail** |
|---|---|
| Purpose | Hold reusable evidence quietly. |
| Primary user goal | Add or check something I can reuse. |
| Layout | Grouped list: Resumes, Projects, Certificates, Links, Other. One Add button. |
| Components | DocumentGroup, DocumentRow, AddChooser, ConfirmationCard, DetailSheet. |
| Information hierarchy | Groups, then rows. |
| Primary CTA | Add |
| Secondary CTA | Edit. Delete. |
| States | Empty: "Add a resume to begin." After adding: "We found 2 projects and 1 certificate. Keep them?" Needs details chip on thin items. |
| Interactions | Nothing is asked up front. Prompts come from Fit in context. |
| Data required | Documents, evidence items with status. |
| API dependencies | GET/POST/DELETE /api/v1/documents, GET/POST/PATCH /api/v1/evidence |
| Mobile behavior | Same list. |

## T. Settings (/settings)

| **Field** | **Detail** |
|---|---|
| Purpose | Keep account controls short and out of the way. |
| Primary user goal | Change or remove something about my account. |
| Layout | Six collapsed groups: Account, Resume, Preferences, Privacy, Subscription, Data. |
| Components | SettingsGroup, DeleteAccountDialog. |
| Information hierarchy | Groups closed by default. |
| Primary CTA | None (no primary action). |
| Secondary CTA | Delete account, Download my data. |
| States | Subscription shows a placeholder line in the MVP. |
| Interactions | Destructive actions use a confirm dialog. |
| Data required | Profile, preferences. |
| API dependencies | DELETE /api/v1/account, GET /api/v1/me/export |
| Mobile behavior | Same. |

## U. Application page (container)

| **Field** | **Detail** |
|---|---|
| Purpose | Be the parent of everything about one job. |
| Primary user goal | See where this application stands. |
| Layout | Header (title, company, status control), tab strip Fit, Improve, Letter, Interview, and a collapsible checklist. |
| Components | ApplicationHeader, StatusMenu, TabStrip, Checklist. |
| Information hierarchy | Job, then current tab, then checklist. |
| Primary CTA | Depends on state: Improve my application, Review resume, Download. |
| Secondary CTA | Change status. |
| States | Analysis running, stale, failed. |
| Interactions | Checklist items tick from real events (letter reviewed, must-haves resolved), and can be ticked by hand. |
| Data required | Application, latest analysis, pack state. |
| API dependencies | GET /api/v1/applications/{id} |
| Mobile behavior | Tabs scroll horizontally. Sticky primary button. |
