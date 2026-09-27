import { z } from 'zod';
import { docText, id, line, optional, shortText } from './common';
import { TailoredSectionsSchema } from './sections';

export const TailorSectionsBody = z.object({ jobId: id, sections: TailoredSectionsSchema }).strict();

export const SaveTailoredBody = z
  .object({
    jobId: id,
    sections: TailoredSectionsSchema,
    name: optional(shortText),
    // Set only after the server has already returned a needs_review/unsupported
    // Truth Guard verdict for this exact save attempt and the user chose to save
    // anyway. It never lets a client skip or fake the server's own check — Truth
    // Guard runs fresh on every save regardless of this flag.
    confirmUnsupported: optional(z.boolean()),
  })
  .strict();

export const RewriteBulletBody = z
  .object({
    originalText: line.min(1),
    requirementText: line.min(1),
    achievementId: optional(id),
  })
  .strict();

export const TruthGuardBody = z
  .object({ tailoredText: docText.min(1), jobId: optional(id) })
  .strict();
