# GETJOBFIT.AI PRODUCT REQUIREMENTS DOCUMENT

Canonical PRD. 24 September 2026. No code is included and payment is not built.

# 0. Document control

| **Field** | **Detail** |
|---|---|
| Document | GetJobFit.ai Product Requirements Document (PRD) |
| Status | Canonical draft v1.0 for engineering review. Supersedes earlier direction documents where they conflict (see the table below). |
| Date | 24 September 2026 |
| Basis | Repository github.com/jigish-svg/resuai at commit 3f7d69e; the Blueprint, Teal teardown, strategy report, direction and audit documents; official Teal pages read on 24 Sep 2026. |
| Scope | Everything needed to build the product through the payment-ready state. No code is included. Payment implementation is out of scope until Phase 6. |
| Not validated | No user research, conversion data or AI cost data exists yet. Every value marked "starting value" or "placeholder" is a configurable default to be calibrated, not a result. |

## Tags used throughout

| **Tag** | **Meaning** |
|---|---|
| FACT | Seen in the repository or on an official page. |
| DECISION | A product or engineering choice made in this PRD. Can change only through an explicit change to this document. |
| INFERENCE | Reasoned from facts. May be wrong. |
| HYPOTHESIS | Untested. An experiment or evaluation decides. |

## Contradictions resolved

Where earlier documents disagree, this table states the PRD position. This PRD wins.

| **\#** | **Topic** | **Earlier position** | **PRD position** | **Why** |
|---|---|---|---|---|
| 1 | Navigation | Blueprint: Home and Documents. Brief: Home, Resumes, Jobs, Practice. | Home and Documents, an account menu and a global New application action. Practice is a step inside each application. | 4 of 8 sidebar items today are job pickers (**FACT**). Reopened by OQ-1. |
| 2 | Evidence vocabulary | Blueprint: internal states Supported, Partially supported, Unsupported, Needs verification, with three UI groups. | Four canonical states named: Backed up, Needs attention, To verify, Unsupported. The Fit screen shows three groups; Unsupported items sit inside "Needs attention" with their own wording. | The brief names the vocabulary. Three groups keep the screen calm. |
| 3 | Score formula | Blueprint: one weighted average over requirements. | Six scoring dimensions with weights that sum to 1.0, requirement weights inside each dimension, and renormalisation when a dimension is absent. | The brief requires dimensions and weights summing to 1.0. It also removes the repo's neutral fill values. |
| 4 | Tailoring and the score | Not stated. | Accepting a rewording never changes the score. The score reads the candidate's evidence, not the tailored text. | Otherwise keyword alignment could raise the score. |
| 5 | ATS | Repo: ATS checklist feeds the match score. Stage 1B: ATS issues list. | No ATS score anywhere in fit. Parse safety comes from template design. An export format check is post-MVP. | ATS formatting is not fit. |
| 6 | Practice and the score | Repo: Final Score = 0.6 x match + 0.4 x an AI-written readiness number. | Removed. Practice gives written feedback only and cannot reach the score function. | The score means fit. |
| 7 | Inferred requirements | Repo: model-guessed requirements enter the score at low weight. | Stored as optional prompts. Never scored, enforced by a database constraint. | Brief: no silent hard requirements. |
| 8 | Free versus paid | Blueprint: first change free, paywall on the finished application. | MVP has no paywall. The boundary stays an experiment. | Payment is last. |
| 9 | Templates | Repo: 4. Blueprint: 7. | 7, all on one data-driven engine, single column. | Direction agreed. |
| 10 | Application statuses | Blueprint: Saved, Applied, Interview, Offer, Closed. | Saved, Applied, Interview, Offer, Rejected, plus an archive flag. | Matches the earlier brief. |
| 11 | LinkedIn | Early extension idea read LinkedIn pages. | No LinkedIn page reading. Paste only for blocked domains. | LinkedIn's terms name browser plug-ins and scrapers. |
| 12 | Truth Guard | Repo: one optional client-triggered check. | Renamed the Claim Validator. Server-enforced on every generated text path. Invisible to users except through states. | Fabrication protection must be a gate. |
