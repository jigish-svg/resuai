import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { JobIdBody } from '@/lib/api/schemas/common';
import { SaveResumeBody, RewriteTextBody, SuggestSkillsBody, EvidenceUploadFields } from '@/lib/api/schemas/resume';
import { TailoredSectionsSchema } from '@/lib/api/schemas/sections';
import { SaveJobBody, UpdateJobBody } from '@/lib/api/schemas/jobs';
import { TailorSectionsBody, SaveTailoredBody, RewriteBulletBody, TruthGuardBody } from '@/lib/api/schemas/tailor';
import { FinalizeMockInterviewBody, StartSkillPrepBody, SubmitQuizBody } from '@/lib/api/schemas/interview';
import { SaveCoverLetterBody, ExportCoverLetterBody, ExportDocxBody, toSafeFileName } from '@/lib/api/schemas/documents';

const ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

const ok = (schema: z.ZodTypeAny, value: unknown) => expect(schema.safeParse(value).success).toBe(true);
const bad = (schema: z.ZodTypeAny, value: unknown) => expect(schema.safeParse(value).success).toBe(false);

// Shapes as the parser, the editor and the DB actually produce them (nulls included).
const parsedResume = {
  candidate: { name: 'Ana Silva', email: 'ana@example.com', phone: null, linkedin: 'linkedin.com/in/ana' },
  summary: 'Backend engineer.',
  experience: [
    {
      company: 'Acme',
      job_title: 'Engineer',
      start_date: '2020-01',
      end_date: null,
      is_current: true,
      location: null,
      achievements: [{ text: 'Cut p95 latency by 40%', skills: ['Go'], metrics: ['40%'] }],
    },
  ],
  skills: ['Go', 'Postgres'],
  education: [{ institution: 'Uni', degree: 'BSc', field: 'CS', graduation_date: null, gpa: null }],
  certifications: [{ name: 'CKA', issuer: 'CNCF', date: null, expiry: null }],
};

const sections = [
  {
    section_type: 'header',
    sort_order: -1,
    content: { name: 'Ana Silva', email: 'ana@example.com', phone: null, location: null, linkedin: null, website: null },
  },
  { section_type: 'summary', sort_order: 0, content: { text: 'Backend engineer.' } },
  {
    section_type: 'experience',
    sort_order: 1,
    content: {
      experiences: [
        { company: 'Acme', job_title: 'Engineer', start_date: '2020-01', end_date: null, is_current: true, bullets: ['Cut latency'] },
      ],
    },
  },
  { section_type: 'skills', sort_order: 2, content: { skills: ['Go'] } },
  { section_type: 'education', sort_order: 3, content: { items: parsedResume.education } },
  { section_type: 'certifications', sort_order: 4, content: { items: parsedResume.certifications } },
];

const parsedJob = {
  job_title: 'Backend Engineer',
  company: 'Beta',
  location: null,
  job_type: null,
  seniority: 'Senior',
  summary: null,
  required_skills: ['Go'],
  preferred_skills: [],
  responsibilities: ['Build APIs'],
  education_requirements: [],
  certifications: [],
  experience_requirements: ['5+ years'],
  soft_skills: [],
  technologies: ['Postgres'],
  keywords: ['Go'],
  salary_range: null,
};

describe('common bodies', () => {
  it('accepts a uuid jobId and rejects anything else', () => {
    ok(JobIdBody, { jobId: ID });
    bad(JobIdBody, { jobId: 'abc' });
    bad(JobIdBody, {});
    bad(JobIdBody, { jobId: ID, userId: ID });
  });
});

describe('SaveResumeBody', () => {
  const body = { parsed: parsedResume, rawText: 'Ana Silva ...', resumeId: ID, template: 'classic' };

  it('accepts real parser output with nulls', () => ok(SaveResumeBody, body));
  it('rejects unknown fields at any depth', () => {
    bad(SaveResumeBody, { ...body, user_id: ID });
    bad(SaveResumeBody, { ...body, parsed: { ...parsedResume, verified: true } });
    bad(SaveResumeBody, {
      ...body,
      parsed: { ...parsedResume, experience: [{ ...parsedResume.experience[0], employer_verified: true }] },
    });
  });
  it('rejects a missing rawText and an unknown template', () => {
    bad(SaveResumeBody, { parsed: parsedResume });
    bad(SaveResumeBody, { ...body, template: 'fancy' });
  });
  it('rejects over-cap values', () => {
    bad(SaveResumeBody, { ...body, rawText: 'x'.repeat(50_001) });
    bad(SaveResumeBody, { ...body, parsed: { ...parsedResume, skills: new Array(201).fill('Go') } });
  });
});

describe('small resume bodies', () => {
  it('rewrite-text needs non-blank text and a known field type', () => {
    ok(RewriteTextBody, { text: 'Led a team', fieldType: 'bullet', jobTitle: null });
    bad(RewriteTextBody, { text: '   ', fieldType: 'bullet' });
    bad(RewriteTextBody, { text: 'Led a team', fieldType: 'headline' });
  });
  it('suggest-skills accepts an empty title list', () => {
    ok(SuggestSkillsBody, { jobTitles: [], currentSkills: ['Go'] });
    bad(SuggestSkillsBody, { jobTitles: new Array(21).fill('Engineer') });
  });
  it('evidence upload fields need an owned-looking resume id', () => {
    ok(EvidenceUploadFields, { resumeId: ID, description: 'Offer letter' });
    bad(EvidenceUploadFields, { resumeId: ID, description: 'x'.repeat(501) });
    bad(EvidenceUploadFields, { description: 'x' });
  });
});

describe('TailoredSectionsSchema', () => {
  it('accepts the editor and DB shapes', () => ok(TailoredSectionsSchema, sections));
  it('rejects unknown section types and duplicate sections', () => {
    bad(TailoredSectionsSchema, [...sections, { section_type: 'custom', sort_order: 5, content: {} }]);
    bad(TailoredSectionsSchema, [...sections, sections[1]]);
  });
  it('rejects extra keys inside section content', () => {
    bad(TailoredSectionsSchema, [{ section_type: 'summary', sort_order: 0, content: { text: 'x', html: '<b>' } }]);
  });
});

describe('job bodies', () => {
  const body = {
    parsed: parsedJob,
    requirements: [{ requirement_text: 'Go', category: 'hard_skill', importance: 'critical', is_implied: false }],
    rawText: 'We are hiring ...',
    sourceUrl: 'jobs.example.com/123',
  };

  it('accepts a job save and a scheme-less source link', () => ok(SaveJobBody, body));
  it('rejects non-http links and bad enums', () => {
    bad(SaveJobBody, { ...body, sourceUrl: 'javascript:alert(1)' });
    bad(SaveJobBody, { ...body, requirements: [{ ...body.requirements[0], importance: 'urgent' }] });
  });
  it('job PATCH needs at least one known field', () => {
    ok(UpdateJobBody, { status: 'applied' });
    ok(UpdateJobBody, { notes: null });
    bad(UpdateJobBody, {});
    bad(UpdateJobBody, { status: 'hired' });
    bad(UpdateJobBody, { status: 'applied', applied_at: '2020-01-01' });
  });
});

describe('tailor bodies', () => {
  it('validates sections and ids', () => {
    ok(TailorSectionsBody, { jobId: ID, sections });
    ok(SaveTailoredBody, { jobId: ID, sections, name: 'Backend — Tailored' });
    bad(SaveTailoredBody, { jobId: ID, sections, truth_guard_passed: true });
  });
  it('rewrite needs both texts; achievementId is optional', () => {
    ok(RewriteBulletBody, { originalText: 'Built APIs', requirementText: 'REST APIs' });
    bad(RewriteBulletBody, { originalText: '', requirementText: 'REST APIs' });
    bad(RewriteBulletBody, { originalText: 'Built APIs', requirementText: 'REST', achievementId: 'a1' });
  });
  it('truth guard caps the text', () => {
    ok(TruthGuardBody, { tailoredText: 'text', jobId: ID });
    bad(TruthGuardBody, { tailoredText: 'x'.repeat(50_001) });
  });
});

describe('interview bodies', () => {
  const transcript = [
    { role: 'interviewer', text: 'Tell me about yourself.' },
    { role: 'candidate', text: 'I build backends.' },
  ];

  it('finalize keeps the old transcript bounds', () => {
    ok(FinalizeMockInterviewBody, { sessionId: ID, transcript });
    bad(FinalizeMockInterviewBody, { sessionId: ID, transcript: [] });
    bad(FinalizeMockInterviewBody, { sessionId: ID, transcript: new Array(201).fill(transcript[0]) });
    bad(FinalizeMockInterviewBody, { sessionId: ID, transcript: new Array(5).fill({ role: 'candidate', text: 'x'.repeat(4_500) }) });
    bad(FinalizeMockInterviewBody, { sessionId: ID, transcript: [{ role: 'system', text: 'hi' }] });
  });
  it('skill prep start needs a skill', () => {
    ok(StartSkillPrepBody, { jobId: ID, skill: 'Kubernetes', whatItInvolves: 'Running clusters' });
    bad(StartSkillPrepBody, { jobId: ID, skill: ' ' });
  });
  it('quiz answers are small integers', () => {
    ok(SubmitQuizBody, { planId: ID, answers: [0, 2, -1] });
    bad(SubmitQuizBody, { planId: ID, answers: [0.5] });
    bad(SubmitQuizBody, { planId: ID, answers: new Array(51).fill(0) });
  });
});

describe('document bodies', () => {
  it('cover letter content is capped', () => {
    ok(SaveCoverLetterBody, { jobId: ID, content: '' });
    bad(SaveCoverLetterBody, { jobId: ID, content: 'x'.repeat(20_001) });
    bad(ExportCoverLetterBody, { content: '' });
  });
  it('docx export accepts the jobId the editor sends', () => {
    ok(ExportDocxBody, { sections, jobId: ID, fileName: 'Ana_Silva_Resume' });
  });
  it('file names are reduced to header-safe characters', () => {
    expect(toSafeFileName('José_O\'Neil "x"\r\nSet-Cookie: a', 'resume')).toBe('Jos_O_Neil_x_Set-Cookie_a');
    expect(toSafeFileName('', 'resume')).toBe('resume');
    expect(toSafeFileName('...', 'resume')).toBe('resume');
  });
});
