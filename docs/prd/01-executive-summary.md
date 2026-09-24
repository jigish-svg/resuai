# 1. Executive summary

| **Field** | **Detail** |
|---|---|
| What it is | A web product that, for one specific job, shows a candidate what their own documents back up, what needs attention, and what to verify, then helps them produce an honest application: a tailored resume, a cover letter, and interview preparation. |
| Who it is for | Primary: a job seeker who has found a specific job and has a resume. Secondary: someone with an interview soon. Everyone else uses the same flow. |
| Core problem | Candidates cannot tell whether they fit a job, why, or what they can honestly change. Existing tools score keywords, meter AI text by credits, or write text that is not traceable to the candidate's facts. |
| Core JTBD | "When I find a job I want, help me decide if I fit and send an application I can stand behind." |
| Product thesis (WORKING HYPOTHESIS) | A fit result that shows the evidence behind every decision, and improvements that come only from that evidence, will be trusted and used more than a keyword score or free-form AI rewriting. Unvalidated. |
| What makes it different | Evidence for every decision. Changes limited to existing facts. Must-haves and unknowns flagged instead of guessed. A score computed in code that means fit only. A quiet interface. |
| What it deliberately does not do | Be a generic resume builder with 100+ templates, a job board, a job tracker or CRM, an auto-apply tool, a career chatbot, an interview copilot, or a keyword-score generator. Charge money in the MVP. |

## Statements by confidence

| **Statement** | **Tag** | **Basis** |
|---|---|---|
| A working product exists: upload, parse, job parsing, match, tailoring plan, cover letters, interview prep, kanban, PDF and DOCX export. | FACT | Repository audit. |
| The applied score weights sum to 0.95, capping the score at 95. A Final Score mixes in an AI-written interview number. A passed quiz can add a skill to the resume. | FACT | match-scorer.ts, match page, add-skill route. |
| Teal charges for intensity: full keyword list, Match Score, unlimited AI, design controls. Free is a tracker plus an extension with metered AI credits. | FACT | Teal pricing page, 24 Sep 2026. |
| The evidence-first model replaces the score-first model for this product. | DECISION | This PRD. |
| The score is computed in code from validated per-requirement results, and no practice, quiz, click or purchase can reach it. | DECISION | Section 10. |
| Free chatbots substitute for diagnosis, so the finished application, not the diagnosis, is the likelier place for eventual payment. | INFERENCE | Strategy report. |
| Users trust an evidence-shown fit more than a keyword list. | HYPOTHESIS | Experiment 1. |
| The first evidence-backed change is a stronger first "aha" than the score. | HYPOTHESIS | Experiment 2. |
| Users will pay for a finished application pack, per job or as a time-boxed pass. | HYPOTHESIS | Experiments 3 and 4. |
