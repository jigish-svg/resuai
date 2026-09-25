import { describe, expect, it } from 'vitest';
import { buildResumeSavePayload } from '@/lib/resume/save-payload';
import type { ParsedResume } from '@/types/resume';

const parsed: ParsedResume = {
  candidate: { name: 'Ana Silva', email: 'ana@example.com', phone: '555', linkedin: 'linkedin.com/in/ana' },
  summary: 'Backend engineer.',
  experience: [
    {
      company: 'Acme',
      job_title: 'Engineer',
      start_date: '2020-01',
      is_current: true,
      achievements: [
        { text: 'Cut p95 latency by 40%', skills: ['Go'], metrics: ['40%'] },
        { text: 'Led migration to Postgres', skills: ['Postgres'], metrics: [] },
      ],
    },
    {
      company: 'Beta',
      job_title: 'Intern',
      start_date: '2018-06',
      end_date: '2019-08',
      is_current: false,
      location: 'Lisbon',
      achievements: [{ text: 'Wrote tests', skills: [], metrics: [] }],
    },
  ],
  skills: ['Go', 'Postgres'],
  education: [{ institution: 'Uni', degree: 'BSc' }],
  certifications: [{ name: 'CKA', issuer: 'CNCF' }],
};

describe('buildResumeSavePayload', () => {
  const payload = buildResumeSavePayload(parsed, 'raw text', { name: null, template: null });

  it('builds the resume row from the candidate block', () => {
    expect(payload.resume).toEqual({
      name: null,
      default_name: 'Engineer Resume',
      raw_text: 'raw text',
      template: null,
      candidate_name: 'Ana Silva',
      candidate_email: 'ana@example.com',
      candidate_phone: '555',
      candidate_location: null,
      candidate_linkedin: 'linkedin.com/in/ana',
      candidate_website: null,
    });
  });

  it('keeps an explicit name and template', () => {
    const named = buildResumeSavePayload(parsed, 'raw', { name: 'Mine', template: 'modern' });
    expect(named.resume.name).toBe('Mine');
    expect(named.resume.template).toBe('modern');
  });

  it('falls back to "Resume" when there is no experience', () => {
    expect(buildResumeSavePayload({ ...parsed, experience: [] }, 'raw', {}).resume.default_name).toBe('Resume');
  });

  it('builds the five editor sections in order', () => {
    expect(payload.sections.map((s) => [s.section_type, s.sort_order])).toEqual([
      ['summary', 0],
      ['experience', 1],
      ['skills', 2],
      ['education', 3],
      ['certifications', 4],
    ]);
    expect(payload.sections[0].content).toEqual({ text: 'Backend engineer.' });
    expect(payload.sections[1].content).toEqual({
      experiences: [
        { company: 'Acme', job_title: 'Engineer', start_date: '2020-01', end_date: undefined, is_current: true, location: undefined, bullets: ['Cut p95 latency by 40%', 'Led migration to Postgres'] },
        { company: 'Beta', job_title: 'Intern', start_date: '2018-06', end_date: '2019-08', is_current: false, location: 'Lisbon', bullets: ['Wrote tests'] },
      ],
    });
    expect(payload.sections[2].content).toEqual({ skills: ['Go', 'Postgres'] });
  });

  it('uses an empty summary when there is none', () => {
    expect(buildResumeSavePayload({ ...parsed, summary: undefined }, 'raw', {}).sections[0].content).toEqual({ text: '' });
  });

  it('flattens every achievement with its role and date range', () => {
    expect(payload.achievements).toEqual([
      { company: 'Acme', job_title: 'Engineer', achievement_text: 'Cut p95 latency by 40%', skills: ['Go'], metrics: ['40%'], dates: '2020-01 - Present' },
      { company: 'Acme', job_title: 'Engineer', achievement_text: 'Led migration to Postgres', skills: ['Postgres'], metrics: [], dates: '2020-01 - Present' },
      { company: 'Beta', job_title: 'Intern', achievement_text: 'Wrote tests', skills: [], metrics: [], dates: '2018-06 - 2019-08' },
    ]);
  });

  it('keeps an open end date empty rather than inventing one', () => {
    const noEnd = buildResumeSavePayload(
      { ...parsed, experience: [{ ...parsed.experience[1], end_date: undefined }] },
      'raw',
      {}
    );
    expect(noEnd.achievements[0].dates).toBe('2018-06 - ');
  });
});
