import { z } from 'zod';
import { docText, line, list, longText, optional, shortText } from './common';

// Mirrors ParsedJobDescription and the enums in src/types/job.ts.
export const RequirementCategorySchema = z.enum([
  'hard_skill', 'soft_skill', 'responsibility', 'experience', 'education', 'certification', 'technology',
]);
export const RequirementImportanceSchema = z.enum(['critical', 'high', 'medium', 'low']);
export const JobStatusSchema = z.enum([
  'saved', 'tailoring', 'ready', 'applied', 'recruiter_screen', 'interview', 'offer', 'rejected', 'withdrawn',
]);

const lines = list(line);

export const ParsedJobSchema = z
  .object({
    job_title: shortText,
    company: optional(shortText),
    location: optional(shortText),
    job_type: optional(shortText),
    seniority: optional(shortText),
    summary: optional(longText),
    required_skills: lines,
    preferred_skills: lines,
    responsibilities: lines,
    education_requirements: lines,
    certifications: lines,
    experience_requirements: lines,
    soft_skills: lines,
    technologies: lines,
    keywords: lines,
    salary_range: optional(shortText),
  })
  .strict();

export const RequirementInputSchema = z
  .object({
    requirement_text: line,
    category: RequirementCategorySchema,
    importance: RequirementImportanceSchema,
    is_implied: optional(z.boolean()),
  })
  .strict();

// Users paste links with or without a scheme; anything that is not http(s) is rejected.
const sourceUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() && !/^[a-z][a-z0-9+.-]*:/i.test(v.trim()) ? `https://${v.trim()}` : v),
  z
    .string()
    .max(2_000)
    .url()
    .refine((u) => /^https?:\/\//i.test(u))
);

export const SaveJobBody = z
  .object({
    parsed: ParsedJobSchema,
    requirements: list(RequirementInputSchema),
    rawText: docText.min(1),
    sourceUrl: optional(sourceUrl),
  })
  .strict();

export const UpdateJobBody = z
  .object({
    status: JobStatusSchema.optional(),
    notes: optional(longText),
  })
  .strict()
  .refine((b) => b.status !== undefined || b.notes !== undefined, { message: 'Nothing to update' });
