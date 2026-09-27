import { z } from 'zod';
import { docText, id, line, list, longText, optional, shortText } from './common';
import { sourceUrl } from './jobs';

// Mirrors ParsedResume in src/types/resume.ts.
export const ParsedAchievementSchema = z
  .object({ text: line, skills: list(shortText), metrics: list(shortText) })
  .strict();

export const ParsedExperienceSchema = z
  .object({
    company: shortText,
    job_title: shortText,
    start_date: shortText,
    end_date: optional(shortText),
    is_current: z.boolean(),
    location: optional(shortText),
    achievements: list(ParsedAchievementSchema, 100),
  })
  .strict();

export const ParsedEducationSchema = z
  .object({
    institution: shortText,
    degree: shortText,
    field: optional(shortText),
    graduation_date: optional(shortText),
    gpa: optional(shortText),
  })
  .strict();

export const ParsedCertificationSchema = z
  .object({
    name: shortText,
    issuer: optional(shortText),
    date: optional(shortText),
    expiry: optional(shortText),
  })
  .strict();

export const ParsedProjectSchema = z
  .object({
    name: shortText,
    description: longText,
    role: optional(shortText),
    technologies: list(shortText),
    metrics: list(shortText),
    start_date: optional(shortText),
    end_date: optional(shortText),
    link: optional(shortText),
  })
  .strict();

export const CandidateSchema = z
  .object({
    name: shortText,
    email: shortText,
    phone: optional(shortText),
    location: optional(shortText),
    linkedin: optional(shortText),
    website: optional(shortText),
  })
  .strict();

export const ParsedResumeSchema = z
  .object({
    candidate: CandidateSchema,
    summary: optional(longText),
    experience: list(ParsedExperienceSchema, 50),
    skills: list(shortText),
    education: list(ParsedEducationSchema, 50),
    certifications: list(ParsedCertificationSchema, 100),
    projects: list(ParsedProjectSchema, 50),
  })
  .strict();

export const ResumeTemplateSchema = z.enum(['classic', 'modern', 'minimal', 'compact']);

export const SaveResumeBody = z
  .object({
    parsed: ParsedResumeSchema,
    rawText: docText.min(1),
    name: optional(shortText),
    resumeId: optional(id),
    template: optional(ResumeTemplateSchema),
    // Set only after the server already returned a needs_review/unsupported
    // Truth Guard verdict for this exact save and the user chose to save
    // anyway. Truth Guard runs fresh on every save regardless of this flag.
    confirmUnsupported: optional(z.boolean()),
  })
  .strict();

export const RewriteTextBody = z
  .object({
    text: longText.refine((t) => t.trim().length > 0),
    fieldType: z.enum(['summary', 'bullet']),
    jobTitle: optional(shortText),
    company: optional(shortText),
  })
  .strict();

export const SuggestSkillsBody = z
  .object({
    jobTitles: list(shortText, 20),
    currentSkills: optional(list(shortText)),
    // When provided, suggestions are persisted as pending ai_suggestions rows
    // scoped to this resume. Omitting it keeps the response purely ephemeral.
    resumeId: optional(id),
  })
  .strict();

// Multipart text fields. Pasted text length is checked by assertTextWithinLimit,
// which gives the user a specific "too long" message. `url` is only used by
// /api/jobs/parse (fetch a job posting server-side); it's harmless to declare
// here too rather than fork a near-identical schema.
export const ParseUploadFields = z.object({ text: optional(z.string()), url: optional(sourceUrl) }).strict();

export const EvidenceUploadFields = z
  .object({ resumeId: id, description: optional(z.string().max(500)) })
  .strict();

export const RestoreVersionBody = z
  .object({ resumeId: id, versionId: id, confirmUnsupported: optional(z.boolean()) })
  .strict();

// A draft is deliberately not validated against ParsedResumeSchema — it's
// expected to be mid-edit and may be incomplete or momentarily invalid-shaped.
// That's exactly why autosave state is a separate table from real candidate
// data (Step 8). The size cap mirrors MAX_DOC_TEXT's intent for a JSON blob.
export const AutosaveBody = z
  .object({
    resumeId: id,
    draft: z.record(z.string(), z.unknown()).refine((d) => JSON.stringify(d).length <= 100_000, {
      message: 'Draft is too large.',
    }),
  })
  .strict();
