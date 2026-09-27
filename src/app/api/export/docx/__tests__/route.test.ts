import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const getResumeForJobMock = vi.fn();
const buildResumeDocumentFromSectionsMock = vi.fn();
const generateResumeDOCXMock = vi.fn();
let tailoredResume: { sections: unknown } | null = null;
let resumeSections: { section_type: string; content: unknown; sort_order: number }[] = [];

function chain(data: unknown) {
  return {
    select: () => chain(data),
    eq: () => chain(data),
    maybeSingle: async () => ({ data }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'jobs') return chain({ resume_id: 'resume-1' });
      if (table === 'tailored_resumes') return chain(tailoredResume);
      if (table === 'resume_sections') return chain(resumeSections);
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

vi.mock('@/lib/resume/get-resume-for-job', () => ({
  getResumeForJob: (...args: unknown[]) => getResumeForJobMock(...args),
}));

vi.mock('@/lib/export/build-document', () => ({
  buildResumeDocumentFromSections: (...args: unknown[]) => buildResumeDocumentFromSectionsMock(...args),
}));

vi.mock('@/lib/export/docx-generator', () => ({
  generateResumeDOCX: (...args: unknown[]) => generateResumeDOCXMock(...args),
}));

import { POST } from '../route';

const JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

const CLIENT_SECTIONS = [{ section_type: 'summary', sort_order: 0, content: { text: 'FABRICATED CONTENT NEVER STORED ANYWHERE' } }];

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections: CLIENT_SECTIONS, jobId: JOB_ID, ...overrides }),
  });
}

describe('POST /api/export/docx — exports stored state, not client-submitted content', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    getResumeForJobMock.mockReset().mockResolvedValue({
      id: 'resume-1',
      raw_text: 'text',
      candidate_name: 'Jane Doe',
      candidate_email: 'jane@example.com',
      candidate_phone: null,
      candidate_location: null,
      candidate_linkedin: null,
      candidate_website: null,
    });
    buildResumeDocumentFromSectionsMock.mockReset().mockReturnValue({ candidate: { name: 'Jane Doe', email: 'jane@example.com' } });
    generateResumeDOCXMock.mockReset().mockResolvedValue(Buffer.from('docx-bytes'));
    tailoredResume = null;
    resumeSections = [];
  });

  it('rejects a request with no jobId', async () => {
    const req = new NextRequest('http://localhost/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: CLIENT_SECTIONS }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('exports the stored tailored_resumes.sections when one exists — never the client payload', async () => {
    const storedSections = [{ section_type: 'summary', sort_order: 0, content: { text: 'REAL STORED TAILORED CONTENT' } }];
    tailoredResume = { sections: storedSections };

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(buildResumeDocumentFromSectionsMock).toHaveBeenCalledWith(storedSections);
  });

  it('falls back to the master resume\'s own stored sections when no tailored resume exists', async () => {
    resumeSections = [{ section_type: 'summary', content: { text: 'REAL MASTER RESUME CONTENT' }, sort_order: 0 }];

    await POST(makeRequest());

    const passedSections = buildResumeDocumentFromSectionsMock.mock.calls[0][0];
    expect(passedSections).toEqual([
      { section_type: 'header', sort_order: -1, content: { name: 'Jane Doe', email: 'jane@example.com', phone: undefined, location: undefined, linkedin: undefined, website: undefined } },
      { section_type: 'summary', content: { text: 'REAL MASTER RESUME CONTENT' }, sort_order: 0 },
    ]);
  });

  it('never passes the client-submitted sections to document generation, in either case', async () => {
    tailoredResume = { sections: [{ section_type: 'summary', sort_order: 0, content: { text: 'stored' } }] };
    await POST(makeRequest());
    const passedSections = JSON.stringify(buildResumeDocumentFromSectionsMock.mock.calls[0][0]);
    expect(passedSections).not.toContain('FABRICATED CONTENT');
  });
});
