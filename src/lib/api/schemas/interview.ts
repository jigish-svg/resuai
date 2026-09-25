import { z } from 'zod';
import { id, line, list, longText, optional, shortText } from './common';

// Same bounds the finalize route enforced before schemas existed.
export const MAX_TRANSCRIPT_ENTRIES = 200;
export const MAX_TRANSCRIPT_CHARS = 20_000;

export const TranscriptEntrySchema = z
  .object({ role: z.enum(['interviewer', 'candidate']), text: longText })
  .strict();

export const FinalizeMockInterviewBody = z
  .object({
    sessionId: id,
    transcript: list(TranscriptEntrySchema, MAX_TRANSCRIPT_ENTRIES)
      .min(1)
      .refine((t) => t.reduce((sum, e) => sum + e.text.length, 0) <= MAX_TRANSCRIPT_CHARS, {
        message: 'Transcript is too long',
      }),
  })
  .strict();

export const StartSkillPrepBody = z
  .object({
    jobId: id,
    skill: shortText.refine((s) => s.trim().length > 0),
    whatItInvolves: optional(line),
  })
  .strict();

// -1 means "not answered", which the submit route scores as wrong.
export const SubmitQuizBody = z
  .object({ planId: id, answers: list(z.number().int().min(-1).max(20), 50) })
  .strict();
