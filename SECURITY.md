# Security Policy & Incident Response Plan

This document is for the operator of this app (not end users — see [Privacy Policy](src/app/privacy/page.tsx) for
what's shared with users). It exists so that if something goes wrong, there's already a plan instead of a scramble.

## Reporting a vulnerability

If you find a security issue in this codebase, email **jigish2050@gmail.com** with details. Please don't open a
public GitHub issue for anything that could be actively exploited.

## Application safeguards

What the code does to prevent incidents, and how to check it still does. Keep this current when any of it changes.

- **Row-level security everywhere.** Every user table is scoped to `auth.uid()`, directly or through its parent row.
  Routes also check ownership explicitly and never take a user id from the request.
- **Atomic saves** (migration 019). Resume, job, match, tailored-resume, default-resume and delete-resume writes
  each run in one database function, so a failure part-way changes nothing. The functions are `security invoker`
  (RLS still applies), check `auth.uid()` themselves, and reject match items that point at another job's
  requirements or another resume's achievements (foreign keys alone would allow that).
- **Strict request schemas.** Every API body is validated with zod (`src/lib/api/schemas/`); unknown fields are
  rejected, lengths and list sizes are capped, and bodies over 1 MB are refused.
- **No exception text reaches users.** Errors use `{ error: { code, message } }` with fixed, human messages;
  details are logged server-side. Validation errors list field paths only, never submitted values.
- **Uploads checked by content** (`src/lib/validation/file-type.ts`). Resume and job parsing accept PDF or Word;
  evidence uploads accept PDF, Word, PNG or JPEG. The type, the stored content type and the storage key all come
  from the bytes and a generated name, never from the browser. PDFs over 20 pages are refused.
- **AI routes fail closed.** If the rate limiter errors, every model-calling route refuses the request
  (`src/lib/rate-limit.ts`). Only evidence uploads, which call no model, still allow.

### Checking it

- `npm test` runs the unit tests (score, schemas, upload detection, rate limiter).
- `npm run test:db` starts a throwaway local Postgres in Docker, applies every migration, and runs the SQL tests
  in `supabase/tests/`: saves under forced failure, and cross-user access through tables and save functions.
  It needs Docker Desktop running and never connects to a real Supabase project.

### Known gaps

- Parsing has a 15-second limit, but it only stops the request waiting; a hostile PDF could keep using CPU.
  A hard CPU/memory limit needs parsing in a worker or separate process.
- No daily caps or per-request cost records on AI routes yet (PRD 21), and no per-IP limits (there are no
  anonymous routes yet).
- Evidence files uploaded before content checks existed keep their original storage names and content types.
- `npm run test:db` uses a minimal stand-in for Supabase's auth and storage schemas
  (`supabase/tests/_setup/supabase_stub.sql`), not Supabase itself.

## What counts as a security incident here

- Unauthorized access to user data beyond what row-level security should allow (a user seeing another user's
  resume, job, match, or contact info).
- A leaked credential: Supabase service role key, OpenAI API key, Sentry auth token, or any `.env.local` value.
- A vulnerability that lets a user escalate privileges (e.g., a repeat of the `profiles.plan` issue fixed in
  migration 012) or bypass a paid-feature gate.
- Compromise of the GitHub repo, Vercel project, or Supabase project itself (e.g., unauthorized commits, a
  stolen account session for any of these dashboards).

## Detection

- **Sentry** (`src/instrumentation.ts`, `src/instrumentation-client.ts`) — catches unhandled exceptions across
  client, server, and edge runtimes. An unexplained spike in errors, especially auth or database errors, is
  often the first visible sign something is wrong. Requires `NEXT_PUBLIC_SENTRY_DSN` to be set — see
  `.env.local.example`.
- **Supabase dashboard logs** (Auth logs, Postgres logs, API logs) — check these periodically, and always after
  a Sentry alert. Sentry only sees errors that surface through this app's own code; Supabase's logs will show
  things Sentry can't, like unusual auth patterns or direct API calls that never touch this app's code.
- **GitHub** — if the repo is public, enable secret scanning (Settings → Code security) so an accidentally
  committed key gets flagged automatically. Worth enabling even on a private repo.
- **User reports** — someone telling you something looks wrong is a valid detection source; take it seriously
  even before you've confirmed it yourself.

## Immediate response (first 24 hours of confirming something happened)

1. **Contain first.** Rotate any credential that may be compromised immediately, before anything else:
   - Supabase: Project Settings → API → regenerate the anon key and/or service role key if either is suspected leaked.
   - OpenAI: revoke and reissue the API key from the OpenAI dashboard.
   - If a specific code vulnerability is being actively exploited, ship a fix or temporarily disable the
     affected feature/route rather than waiting for a full fix.
2. **Assess scope.** Which tables, users, and time window were affected? Row-level security means most issues
   are scoped to specific users rather than everyone — confirm which.
3. **Preserve evidence.** Export or screenshot the relevant Supabase/Sentry logs before their retention window
   rolls them off, in case you need them later.

## Deciding whether — and when — to notify users

If personal data was actually accessed or exposed (not just a close call that was caught in time), you likely
have a legal obligation to notify someone. The specifics depend on where your affected users are, and this is
the part that genuinely needs a lawyer to confirm — but the general shape, across most modern privacy laws
(GDPR, most US state laws, India's DPDP Act), is:

- Regulators (where applicable) are often expected to be notified within a short fixed window — 72 hours is the
  GDPR standard and a reasonable default to plan around even where the exact number differs.
- Affected individuals are typically owed notification "without undue delay," especially where the exposure
  creates real risk to them (e.g., anything that could let someone impersonate them or access other accounts).

**Working default until a lawyer confirms otherwise for this business:** treat any confirmed unauthorized access
to user data as something to notify affected users about within 72 hours of confirming it happened. Don't let
"we should ask a lawyer first" become a reason to delay past that — get the lawyer's input in parallel with
containment, not instead of timely notification.

## Known gap: there is currently no way to bulk-email users

This app has no transactional email system integrated — Supabase Auth sends its own emails (signup
confirmation, password reset), but there's no way to message all affected users at once today. If this plan
ever needs to be executed for real, that gap needs to be closed first (e.g., a service like Resend or Postmark),
or affected users would need to be contacted individually via whatever emails are on file. Worth setting this up
before it's needed, not during an incident.

## Draft user notification template

```
Subject: Important security update about your ResumeAI account

Hi [name],

We're writing to let you know about a security issue that affected your ResumeAI account.

What happened: [plain description of the incident]
What data was involved: [specific — e.g., "your resume content and contact information," not vague language]
What we've done: [containment/fix already completed]
What you should do: [e.g., "change your password," "watch for phishing attempts referencing this," or "no action needed" if genuinely true]

We take this seriously and are sorry this happened. Questions: jigish2050@gmail.com
```

## After the incident

- Write down what actually happened and the timeline, while it's fresh.
- Fix the root cause, not just the symptom that was noticed first.
- Check whether the same class of bug exists anywhere else in the codebase.
- Update this document if the response process itself had gaps.
