import { z } from 'zod';
import { docText, id, line, optional, shortText } from './common';
import { TailoredSectionsSchema } from './sections';

export const TailorSectionsBody = z.object({ jobId: id, sections: TailoredSectionsSchema }).strict();

export const SaveTailoredBody = z
  .object({ jobId: id, sections: TailoredSectionsSchema, name: optional(shortText) })
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
