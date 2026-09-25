import { z } from 'zod';
import { line, list, longText, optional, shortText } from './common';
import { CandidateSchema, ParsedCertificationSchema, ParsedEducationSchema } from './resume';

// Shapes follow src/lib/export/build-document.ts and src/types/export.ts.
const ExperienceEntrySchema = z
  .object({
    company: shortText,
    job_title: shortText,
    start_date: shortText,
    end_date: optional(shortText),
    is_current: z.boolean(),
    location: optional(shortText),
    bullets: list(line, 100),
  })
  .strict();

const sortOrder = z.number().int().min(-1).max(100);

const section = <T extends string, C extends z.ZodTypeAny>(type: T, content: C) =>
  z.object({ section_type: z.literal(type), sort_order: sortOrder, content }).strict();

export const TailoredSectionSchema = z.discriminatedUnion('section_type', [
  section('header', CandidateSchema),
  section('summary', z.object({ text: longText }).strict()),
  section('experience', z.object({ experiences: list(ExperienceEntrySchema, 50) }).strict()),
  section('skills', z.object({ skills: list(shortText) }).strict()),
  section('education', z.object({ items: list(ParsedEducationSchema, 50) }).strict()),
  section('certifications', z.object({ items: list(ParsedCertificationSchema, 100) }).strict()),
]);

export const TailoredSectionsSchema = z
  .array(TailoredSectionSchema)
  .max(12)
  .refine((sections) => new Set(sections.map((s) => s.section_type)).size === sections.length, {
    message: 'Each section type may appear once',
  });
