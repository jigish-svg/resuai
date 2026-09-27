import { TailoredSection } from '@/types/match';

function getContent<T extends object>(sections: TailoredSection[], type: string, fallback: T): T {
  return (sections.find((s) => s.section_type === type)?.content as T) ?? fallback;
}

/**
 * Builds one plain-text blob from a tailored resume's sections, for Truth Guard
 * comparison against the master resume. Mirrors the joining logic that used to
 * live only in the client's "Run Truth Guard" button, now shared so the server
 * can compute it itself from validated `sections` rather than trusting whatever
 * free text a client might send.
 */
export function buildFullTextFromSections(sections: TailoredSection[]): string {
  const header = getContent<{ name?: string }>(sections, 'header', {});
  const summary = getContent<{ text?: string }>(sections, 'summary', {});
  const experience = getContent<{ experiences?: { bullets?: string[] }[] }>(sections, 'experience', {});
  const skills = getContent<{ skills?: string[] }>(sections, 'skills', {});

  return [
    header.name ?? '',
    summary.text ?? '',
    ...(experience.experiences ?? []).flatMap((e) => e.bullets ?? []),
    (skills.skills ?? []).join(', '),
  ].join('\n');
}
