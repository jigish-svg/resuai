import { z } from 'zod';
import { id, optional } from './common';
import { TailoredSectionsSchema } from './sections';

export const MAX_COVER_LETTER = 20_000;

const fileName = z.string().max(120);
const letterContent = z.string().max(MAX_COVER_LETTER);

export const SaveCoverLetterBody = z.object({ jobId: id, content: letterContent }).strict();

export const ExportCoverLetterBody = z
  .object({ content: letterContent.min(1), fileName: optional(fileName) })
  .strict();

// jobId is required: the server derives the exported document from its own
// stored state (the job's tailored resume, or the master resume's own saved
// sections) rather than trusting client-submitted content. `sections` stays
// in the request shape for backward compatibility with the existing client
// call, but the route no longer reads it.
export const ExportDocxBody = z
  .object({ sections: TailoredSectionsSchema, fileName: optional(fileName), jobId: id })
  .strict();

/** The name goes into a Content-Disposition header, so only plain characters survive. */
export function toSafeFileName(name: string | null | undefined, fallback: string): string {
  const safe = (name ?? '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|_+$/g, '')
    .slice(0, 100);
  return safe || fallback;
}
