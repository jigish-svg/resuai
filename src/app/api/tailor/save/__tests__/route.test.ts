import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const runTruthGuardMock = vi.fn();
const getResumeForJobMock = vi.fn();
const versionInsertMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      const chain = (data: unknown) => ({
        select: () => chain(data),
        eq: () => chain(data),
        maybeSingle: async () => ({ data }),
      });
      if (table === 'jobs') return chain({ resume_id: 'resume-1' });
      if (table === 'matches') return chain(null);
      if (table === 'resume_versions') {
        return {
          insert: (row: unknown) => {
            versionInsertMock(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  }),
}));

vi.mock('@/lib/resume/get-resume-for-job', () => ({
  getResumeForJob: (...args: unknown[]) => getResumeForJobMock(...args),
}));

vi.mock('@/lib/openai/tailoring-engine', () => ({
  runTruthGuard: (...args: unknown[]) => runTruthGuardMock(...args),
}));

import { POST } from '../route';

const VALID_JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

const VALID_SECTIONS = [
  { section_type: 'header', sort_order: -1, content: { name: 'Jane Doe', email: 'jane@example.com' } },
  { section_type: 'summary', sort_order: 0, content: { text: 'Backend engineer.' } },
];

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/tailor/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tailor/save — Truth Guard gate', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    rpcMock.mockReset().mockResolvedValue({ data: 'tailored-resume-1', error: null });
    runTruthGuardMock.mockReset();
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Jane Doe, Backend engineer.' });
    versionInsertMock.mockReset();
  });

  it('1. supported result saves and calls the RPC', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tailoredResumeId).toBe('tailored-resume-1');
    expect(rpcMock).toHaveBeenCalledWith(
      'save_tailored_resume',
      expect.objectContaining({
        p_truth_guard_status: 'supported',
        p_truth_guard_passed: true,
        p_truth_guard_confirmed_unsupported: false,
        p_source: 'user_stated',
        p_provenance: null,
      })
    );
  });

  it('2. needs_review result without confirmation is not saved', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'ai_generated' }], passed: true });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.code).toBe('needs_confirmation');
    expect(data.error.details.truthGuardStatus).toBe('needs_review');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('3. unsupported result without confirmation is not saved', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.code).toBe('needs_confirmation');
    expect(data.error.details.truthGuardStatus).toBe('unsupported');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('4. unsupported result + confirmUnsupported:true saves with the confirmed-override audit trail', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS, confirmUnsupported: true }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tailoredResumeId).toBe('tailored-resume-1');
    expect(rpcMock).toHaveBeenCalledWith(
      'save_tailored_resume',
      expect.objectContaining({
        p_truth_guard_status: 'unsupported',
        p_truth_guard_passed: false,
        p_truth_guard_confirmed_unsupported: true,
        p_source: 'user_stated',
        p_provenance: { origin: 'ai_draft_confirmed_unsupported', truth_guard_status: 'unsupported', truth_guard_flags: expect.any(Array) },
      })
    );
  });

  it('5. persisted status/flags are always the server-computed result, never client-supplied', async () => {
    const serverFlags = [{ text: 'server-computed flag', reason: 'r', source: 'not_in_resume' }];
    runTruthGuardMock.mockResolvedValue({ flags: serverFlags, passed: false });

    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS, confirmUnsupported: true }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_truth_guard_flags).toEqual(serverFlags);
    expect(rpcArgs.p_truth_guard_status).toBe('unsupported');
  });

  it('6. a client cannot bypass validation by sending an accepted/passed status directly — the field is rejected before the handler runs', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });

    const res = await POST(
      makeRequest({
        jobId: VALID_JOB_ID,
        sections: VALID_SECTIONS,
        truthGuardStatus: 'supported', // not a real field on SaveTailoredBody
        truth_guard_passed: true, // not a real field either
      })
    );
    const data = await res.json();

    // .strict() rejects the unknown fields outright — the request never even reaches runTruthGuard.
    expect(res.status).toBe(422);
    expect(data.error.code).toBe('validation_failed');
    expect(runTruthGuardMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('9. existing valid flow: ordinary supported content still saves exactly as before', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS, name: 'My Tailored Resume' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tailoredResumeId).toBe('tailored-resume-1');
    expect(rpcMock).toHaveBeenCalledWith(
      'save_tailored_resume',
      expect.objectContaining({ p_job_id: VALID_JOB_ID, p_base_resume_id: 'resume-1', p_name: 'My Tailored Resume', p_sections: VALID_SECTIONS })
    );
  });
});

describe('POST /api/tailor/save — provenance (Step 2)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    rpcMock.mockReset().mockResolvedValue({ data: 'tailored-resume-1', error: null });
    runTruthGuardMock.mockReset();
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Jane Doe, Backend engineer.' });
    versionInsertMock.mockReset();
  });

  it('a supported save is always user_stated with no provenance — the user is the one who saved it', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });
    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_source).toBe('user_stated');
    expect(rpcArgs.p_provenance).toBeNull();
  });

  it('a rejected/blocked draft (no confirmation) is never persisted — nothing to carry a source or provenance', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });
    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    expect(res.status).toBe(422);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('tailoring saves never touch the achievements/evidence tables or trigger a rescore — the mocked client throws on any unexpected table/RPC, and only save_tailored_resume is ever called', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });
    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('save_tailored_resume', expect.anything());
    // If the route ever queried `achievements` or called `save_match`, the shared
    // supabase mock's `from()` throws or this call count would differ — proving
    // AI-generated tailoring content structurally cannot reach evidence/score.
  });
});

describe('POST /api/tailor/save — versioning (Step 8)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    rpcMock.mockReset().mockResolvedValue({ data: 'tailored-resume-1', error: null });
    runTruthGuardMock.mockReset();
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Jane Doe, Backend engineer.' });
    versionInsertMock.mockReset();
  });

  it('a successful (supported) save records a resume_versions row tagged tailor_accept', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });
    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));

    expect(versionInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ resume_id: 'resume-1', created_by_action: 'tailor_accept' })
    );
  });

  it('a confirmed-override save also records a version (it did genuinely get accepted)', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });
    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS, confirmUnsupported: true }));

    expect(versionInsertMock).toHaveBeenCalledWith(expect.objectContaining({ created_by_action: 'tailor_accept' }));
  });

  it('a blocked (unconfirmed) save records no version at all — nothing was accepted', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });
    await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));

    expect(versionInsertMock).not.toHaveBeenCalled();
  });
});
