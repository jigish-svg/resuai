import { z } from 'zod';

// Caps are generous for real documents and bound cost and storage. The PRD fixes
// only the 50,000-character document cap; the rest are our defaults.
export const MAX_SHORT_TEXT = 300;
export const MAX_LINE = 2_000;
export const MAX_LONG_TEXT = 5_000;
export const MAX_DOC_TEXT = 50_000;
export const MAX_LIST = 200;

export const id = z.string().uuid();
export const shortText = z.string().max(MAX_SHORT_TEXT);
export const line = z.string().max(MAX_LINE);
export const longText = z.string().max(MAX_LONG_TEXT);
export const docText = z.string().max(MAX_DOC_TEXT);

export const list = <T extends z.ZodTypeAny>(item: T, max = MAX_LIST) => z.array(item).max(max);

// Parser output and DB rows use null for "absent", so optional values accept both.
export const optional = <T extends z.ZodTypeAny>(schema: T) => schema.nullish();

export const JobIdBody = z.object({ jobId: id }).strict();
export const ResumeIdBody = z.object({ resumeId: id }).strict();
export const PlanIdBody = z.object({ planId: id }).strict();
