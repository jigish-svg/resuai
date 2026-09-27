import { describe, expect, it } from 'vitest';
import { buildFullTextFromSections } from '../build-full-text';
import { TailoredSection } from '@/types/match';

describe('buildFullTextFromSections', () => {
  it('joins header name, summary, all bullets, and skills into one text blob', () => {
    const sections: TailoredSection[] = [
      { section_type: 'header', sort_order: -1, content: { name: 'Jane Doe', email: 'jane@example.com' } },
      { section_type: 'summary', sort_order: 0, content: { text: 'Backend engineer.' } },
      {
        section_type: 'experience',
        sort_order: 1,
        content: { experiences: [{ bullets: ['Built APIs', 'Cut latency 40%'] }, { bullets: ['Led migration'] }] },
      },
      { section_type: 'skills', sort_order: 2, content: { skills: ['Python', 'PostgreSQL'] } },
    ];

    const text = buildFullTextFromSections(sections);

    expect(text).toBe('Jane Doe\nBackend engineer.\nBuilt APIs\nCut latency 40%\nLed migration\nPython, PostgreSQL');
  });

  it('handles missing sections gracefully (no crash, empty pieces)', () => {
    const text = buildFullTextFromSections([]);
    expect(text).toBe('\n\n');
  });

  it('handles an experience section with no experiences array', () => {
    const sections: TailoredSection[] = [{ section_type: 'experience', sort_order: 0, content: {} }];
    expect(() => buildFullTextFromSections(sections)).not.toThrow();
  });
});
