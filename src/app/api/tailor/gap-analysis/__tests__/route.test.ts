import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const getResumeForJobMock = vi.fn();
let requirements: { id: string; requirement_text: string; category: string; importance: string; is_implied: boolean }[] = [];
let match: { id: string; resume_id: string; created_at: string } | null = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
let items: { requirement_id: string; status: string; confidence: string }[] = [];
let tailoredResume: { sections: unknown } | null = null;
let resume: { updated_at: string } | null = { updated_at: '2024-01-01T00:00:00Z' };

function chain(data: unknown) {
  return {
    select: () => chain(data),
    eq: () => chain(data),
    order: () => Promise.resolve({ data, error: null }),
    maybeSingle: async () => ({ data }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'jobs') return chain({ id: 'job-1', resume_id: 'resume-1', keywords: ['Docker', 'FastAPI'] });
      if (table === 'job_requirements') return chain(requirements);
      if (table === 'matches') return chain(match);
      if (table === 'match_items') return chain(items);
      if (table === 'tailored_resumes') return chain(tailoredResume);
      if (table === 'resumes') return chain(resume);
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

vi.mock('@/lib/resume/get-resume-for-job', () => ({
  getResumeForJob: (...args: unknown[]) => getResumeForJobMock(...args),
}));

import { POST } from '../route';

const JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/tailor/gap-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: JOB_ID }),
  });
}

describe('POST /api/tailor/gap-analysis', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Built APIs with Python.' });
    match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
    resume = { updated_at: '2024-01-01T00:00:00Z' };
    tailoredResume = null;
    requirements = [
      { id: 'req-matched', requirement_text: 'Python experience', category: 'hard_skill', importance: 'critical', is_implied: false },
      { id: 'req-none', requirement_text: 'Docker experience', category: 'hard_skill', importance: 'medium', is_implied: false },
    ];
    items = [{ requirement_id: 'req-matched', status: 'matched', confidence: 'high' }];
  });

  it('with no tailored resume yet: hasTailoredResume is false, presentationImproved is empty', async () => {
    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasTailoredResume).toBe(false);
    expect(data.presentationImproved).toEqual([]);
  });

  it('a keyword absent from the master resume but present in the tailored text appears in presentationImproved', async () => {
    tailoredResume = {
      sections: [
        { section_type: 'header', sort_order: -1, content: { name: 'Jane Doe' } },
        { section_type: 'summary', sort_order: 0, content: { text: 'Experienced with FastAPI and Docker deployments.' } },
      ],
    };

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(data.hasTailoredResume).toBe(true);
    expect(data.presentationImproved.sort()).toEqual(['Docker', 'FastAPI']);
  });

  it('THE CORE GUARANTEE: requirement buckets (present/toVerify/notFound) are identical whether or not a tailored resume exists — tailoring cannot resolve a genuine gap', async () => {
    const withoutTailoring = await (await POST(makeRequest())).json();

    tailoredResume = {
      sections: [{ section_type: 'summary', sort_order: 0, content: { text: 'Now mentions Docker and FastAPI everywhere.' } }],
    };
    const withTailoring = await (await POST(makeRequest())).json();

    expect(withTailoring.present).toEqual(withoutTailoring.present);
    expect(withTailoring.toVerify).toEqual(withoutTailoring.toVerify);
    expect(withTailoring.notFound).toEqual(withoutTailoring.notFound);
    // Docker is still a genuine gap (no achievement evidence exists for it) even
    // though the tailored text now mentions the word "Docker" — presentation
    // improved, but the requirement itself is still unsupported.
    expect(withTailoring.notFound.map((r: { requirementId: string }) => r.requirementId)).toContain('req-none');
  });

  it('returns 409 and computes nothing when no match exists yet', async () => {
    match = null;
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
  });

  describe('stale-match freshness (Phase C)', () => {
    it('resume newer than the match -> isStale is true, gap analysis still exposes the existing buckets', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-01T00:00:00Z' };
      resume = { updated_at: '2024-01-02T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(true);
      expect(data.notFound.map((r: { requirementId: string }) => r.requirementId)).toContain('req-none');
    });

    it('match newer than the resume -> isStale is false', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
      resume = { updated_at: '2024-01-01T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(false);
    });
  });
});
