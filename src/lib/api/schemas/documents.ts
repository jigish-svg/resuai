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

// jobId is sent by the tailor editor; export does not need it but accepts it.
export const ExportDocxBody = z
  .object({ sections: TailoredSectionsSchema, fileName: optional(fileName), jobId: optional(id) })
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
