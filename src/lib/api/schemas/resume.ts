import { z } from 'zod';
import { docText, id, line, list, longText, optional, shortText } from './common';

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
  })
  .strict();

// Multipart text fields. Pasted text length is checked by assertTextWithinLimit,
// which gives the user a specific "too long" message.
export const ParseUploadFields = z.object({ text: optional(z.string()) }).strict();

export const EvidenceUploadFields = z
  .object({ resumeId: id, description: optional(z.string().max(500)) })
  .strict();
