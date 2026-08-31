# AI Resume Matcher — MVP Implementation Plan

## Overview

Build a production-quality AI Resume Matcher that takes a user's master resume and a job description, performs evidence-based matching, tailors the resume intelligently, and exports to PDF/DOCX. The core philosophy: **"We don't invent a better candidate. We find and present the strongest evidence of the candidate you actually are."**

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Auth & DB | Supabase (Auth + PostgreSQL + Storage) |
| AI | OpenAI API (GPT-4o, Structured Outputs, Embeddings) |
| Vector Search | pgvector (via Supabase) |
| PDF Export | `react-pdf` / `@react-pdf/renderer` |
| DOCX Export | `docx` npm package |
| File Parsing | `pdf-parse`, `mammoth` (DOCX) |
| Hosting | Vercel |
| Payments | Stripe (Phase 2) |

---

## User Review Required

> [!IMPORTANT]
> **OpenAI API Key Required**: You will need an OpenAI API key (GPT-4o access recommended) for AI features. Please have this ready.

> [!IMPORTANT]
> **Supabase Project Required**: We'll need to create a Supabase project. You can do this at [supabase.com](https://supabase.com) before or during setup.

> [!WARNING]
> **Costs**: OpenAI API calls cost money per token. GPT-4o is recommended for accuracy. Budget ~$0.01-0.10 per resume analysis. Supabase free tier supports up to 500MB storage and 50MB database, sufficient for MVP.

---

## Open Questions

> [!IMPORTANT]
> **Do you already have a Supabase account and project?** If yes, please share the project URL and anon key. If not, I'll guide you through creating one.

> [!IMPORTANT]
> **Do you have an OpenAI API key?** This is required for the AI parsing/matching/tailoring features.

> [!NOTE]
> **Domain name?** For MVP, we'll deploy to Vercel's free subdomain (e.g., `ai-resume-matcher.vercel.app`). Do you have a custom domain in mind?

---

## Proposed Changes

The project will be scaffolded as a **new Next.js 15 app** in `c:\Users\USER\Documents\ai RESUME builder\ai-resume-matcher\`.

### Phase 1: Project Scaffold & Auth (Days 1–2)

#### [NEW] `ai-resume-matcher/` — Next.js project via `create-next-app`

Full directory structure:
```
ai-resume-matcher/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── resume/
│   │   │   │   ├── page.tsx          ← Master Resume
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx          ← Saved Jobs
│   │   │   │   └── new/page.tsx      ← Add Job
│   │   │   ├── match/[jobId]/page.tsx  ← Match Analysis
│   │   │   └── tailor/[jobId]/page.tsx ← Resume Editor
│   │   ├── api/
│   │   │   ├── resume/parse/route.ts
│   │   │   ├── jobs/parse/route.ts
│   │   │   ├── match/route.ts
│   │   │   ├── tailor/rewrite/route.ts
│   │   │   ├── export/pdf/route.ts
│   │   │   └── export/docx/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                  ← Landing page
│   ├── components/
│   │   ├── ui/                       ← Shared UI primitives
│   │   ├── resume/
│   │   ├── jobs/
│   │   ├── match/
│   │   └── export/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── openai/
│   │   │   ├── client.ts
│   │   │   ├── resume-parser.ts
│   │   │   ├── jd-parser.ts
│   │   │   ├── evidence-matcher.ts
│   │   │   ├── match-scorer.ts
│   │   │   ├── tailoring-engine.ts
│   │   │   ├── truth-guard.ts
│   │   │   └── ats-checker.ts
│   │   ├── parsers/
│   │   │   ├── pdf-extractor.ts
│   │   │   └── docx-extractor.ts
│   │   └── export/
│   │       ├── pdf-generator.ts
│   │       └── docx-generator.ts
│   ├── types/
│   │   ├── resume.ts
│   │   ├── job.ts
│   │   ├── match.ts
│   │   └── database.ts
│   └── prompts/
│       ├── resume-parser.ts
│       ├── jd-parser.ts
│       ├── evidence-matcher.ts
│       └── tailoring.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
├── .env.local.example
└── package.json
```

---

### Phase 2: Database Schema (Day 3)

#### [NEW] `supabase/migrations/001_initial_schema.sql`

Tables: `profiles`, `resumes`, `resume_sections`, `achievements`, `jobs`, `job_requirements`, `matches`, `match_items`, `tailored_resumes`, `applications`

All tables with RLS enabled. Users can only access their own records.

---

### Phase 3: Landing Page (Day 1)

#### [NEW] `src/app/page.tsx` + supporting components

**Landing page sections:**
- Hero with animated gradient + CTA
- How it works (3-step visual)
- Feature highlights (Match Analysis, Truth Guard, ATS Check)
- Testimonials placeholder
- Footer

**Design:** Dark mode, glassmorphism cards, animated gradient backgrounds, Inter/Outfit fonts

---

### Phase 4: Authentication (Day 2)

#### [NEW] `src/app/(auth)/login/page.tsx`
#### [NEW] `src/app/(auth)/signup/page.tsx`

Email/password auth via Supabase. Magic link support. Protected routes via middleware.

---

### Phase 5: Dashboard (Day 4)

#### [NEW] `src/app/(dashboard)/dashboard/page.tsx`

Shows:
- Quick stats (resumes, jobs analyzed, match scores)
- Recent jobs with match scores
- "Upload your master resume" CTA if none exists
- Activity timeline

---

### Phase 6: Master Resume (Days 5–7)

#### [NEW] `src/app/(dashboard)/resume/page.tsx`

- Upload PDF/DOCX or paste text
- AI parsing with structured output (Zod schema)
- Human verification step before saving
- Editable sections: Personal Info, Summary, Experience + Achievements, Skills, Education, Certifications

---

### Phase 7: Job Description Input & Parsing (Days 8–10)

#### [NEW] `src/app/(dashboard)/jobs/new/page.tsx`

- Paste JD text or upload PDF/DOCX
- AI parses: title, company, seniority, required skills, preferred skills, responsibilities, keywords
- Human review before saving
- Auto-extracts individual requirements with importance levels (Critical/High/Medium/Low)

---

### Phase 8: Evidence Matching Engine (Days 11–13)

#### [NEW] `src/lib/openai/evidence-matcher.ts`

For each JD requirement, searches achievement database and evaluates evidence. Returns:
- MATCHED / PARTIAL / NO EVIDENCE
- Confidence level
- Specific evidence reference

Semantic search via pgvector embeddings for conceptual similarity beyond keyword matching.

---

### Phase 9: Match Dashboard (Day 14)

#### [NEW] `src/app/(dashboard)/match/[jobId]/page.tsx`

- Overall match score (deterministic weighted formula, NOT just "give me a score")
- Score breakdown: Hard Skills 35%, Responsibilities 25%, Experience 15%, Education 10%, Semantic 10%, ATS 5%
- Strong Matches / Partial Matches / Missing sections
- Evidence graph: Requirement → Experience → Resume Bullet
- Score explanation in plain English

---

### Phase 10: Tailoring Engine + Editor (Days 15–18)

#### [NEW] `src/app/(dashboard)/tailor/[jobId]/page.tsx`

Split-screen 3-panel design:
- Left: Section navigation
- Center: Live resume editor
- Right: Real-time match score panel

Features:
- Per-requirement evidence selection (Use / Don't Use / Rewrite / Ask Me)
- AI bullet rewriting (only using verified facts from master resume)
- **Truth Guard**: Flags any unsupported claims before export
- Live match score updates as user makes changes

---

### Phase 11: ATS Checker + Export (Days 19–23)

#### [NEW] ATS validation with checklist display
#### [NEW] PDF export (3 templates: ATS Professional, Modern, Executive)
#### [NEW] DOCX export

---

### Phase 12: Job Tracker (Days 23–24)

#### [NEW] `src/app/(dashboard)/jobs/page.tsx`

Kanban-style pipeline:
`Saved → Tailoring → Ready → Applied → Recruiter Screen → Interview → Offer`

---

## Screens Summary

| Screen | Route | Status |
|---|---|---|
| Landing Page | `/` | Phase 3 |
| Sign Up | `/signup` | Phase 4 |
| Login | `/login` | Phase 4 |
| Dashboard | `/dashboard` | Phase 5 |
| Master Resume | `/resume` | Phase 6 |
| Add Job | `/jobs/new` | Phase 7 |
| Match Analysis | `/match/[jobId]` | Phase 9 |
| Resume Tailor Editor | `/tailor/[jobId]` | Phase 10 |
| Saved Jobs (Tracker) | `/jobs` | Phase 12 |

---

## Verification Plan

### Automated Tests
- `npm run build` — ensure no TypeScript errors
- Test resume parsing with 3 sample resumes (software, finance, marketing)
- Test the "dangerous failure" scenario: weak resume vs. strong JD — verify no skill fabrication

### Manual Verification
- Upload a PDF resume → confirm parsing accuracy
- Paste a job description → confirm requirement extraction
- Run match analysis → verify score is deterministic and explainable
- Use tailoring editor → confirm Truth Guard fires on fabricated claims
- Export PDF and DOCX → open and verify formatting
- Test auth flow: signup → verify email → login → dashboard

---

## Development Order (4 Weeks)

**Week 1**: Project setup → Auth → DB → Dashboard → Resume upload → Resume parser → Master resume editor  
**Week 2**: JD input → JD parser → Requirement extraction → Achievement extraction → Evidence matching → Match scoring → Match dashboard  
**Week 3**: Tailoring engine → AI bullet rewriting → Truth Guard → Resume editor → ATS checker → PDF export → DOCX export  
**Week 4**: Resume versioning → Job tracker → Application pipeline → Security hardening → Testing + bug fixing  
