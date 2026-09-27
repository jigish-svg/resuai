import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const getResumeForJobMock = vi.fn();
const loadConceptDictionaryMock = vi.fn();
const matchRequirementsToAchievementsMock = vi.fn();
const checkRateLimitMock = vi.fn();
const rpcMock = vi.fn();

let job = { id: 'job-1', resume_id: 'resume-1' };
let requirements: {
  id: string;
  requirement_text: string;
  category: string;
  importance: string;
  is_implied: boolean;
  normalized_concept_id: string | null;
  embedding: null;
}[] = [];
let achievements: { id: string; company: string; job_title: string; achievement_text: string; skills: string[]; metrics: string[]; concept_ids: string[] }[] = [];
let projects: { id: string; name: string; description: string; technologies: string[]; metrics: string[]; concept_ids: string[] }[] = [];
let resumeSections: { section_type: string; content: unknown }[] = [];

function thenable(data: unknown) {
  const node = {
    select: () => thenable(data),
    eq: () => thenable(data),
    single: async () => ({ data, error: null }),
    maybeSingle: async () => ({ data }),
    order: async () => ({ data, error: null }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return node;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'jobs') return thenable(job);
      if (table === 'job_requirements') return thenable(requirements);
      if (table === 'achievements') return thenable(achievements);
      if (table === 'projects') return thenable(projects);
      if (table === 'resume_sections') return thenable(resumeSections);
      throw new Error(`Unexpected table in test: ${table}`);
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  }),
}));

vi.mock('@/lib/resume/get-resume-for-job', () => ({
  getResumeForJob: (...args: unknown[]) => getResumeForJobMock(...args),
}));

vi.mock('@/lib/concepts/dictionary', () => ({
  loadConceptDictionary: (...args: unknown[]) => loadConceptDictionaryMock(...args),
}));

vi.mock('@/lib/openai/evidence-matcher', () => ({
  matchRequirementsToAchievements: (...args: unknown[]) => matchRequirementsToAchievementsMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { match: {} },
}));

import { POST } from '../route';

const JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: JOB_ID }),
  });
}

// A small fixture dictionary: PostgreSQL and MySQL are never-merge incompatible,
// same as the real Phase B seed data.
function buildDictionary() {
  return {
    aliasToConceptId: new Map([
      ['postgresql', 'concept-pg'],
      ['postgres', 'concept-pg'],
      ['mysql', 'concept-mysql'],
    ]),
    conceptIdToName: new Map([
      ['concept-pg', 'PostgreSQL'],
      ['concept-mysql', 'MySQL'],
    ]),
    incompatible: new Map([
      ['concept-pg', new Set(['concept-mysql'])],
      ['concept-mysql', new Set(['concept-pg'])],
    ]),
    equivalent: new Map(),
  };
}

describe('POST /api/match — per-source never-merge (Phase 8.5 fix B)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'text', candidate_name: 'Jane Doe' });
    loadConceptDictionaryMock.mockReset().mockResolvedValue(buildDictionary());
    matchRequirementsToAchievementsMock.mockReset().mockResolvedValue({
      matches: [{ requirement_id: 'req-1', status: 'no_evidence', confidence: 'low', explanation: 'none' }],
      neverMergeViolationsStripped: [],
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'match-1', error: null });

    job = { id: 'job-1', resume_id: 'resume-1' };
    requirements = [
      {
        id: 'req-1',
        requirement_text: 'PostgreSQL experience',
        category: 'hard_skill',
        importance: 'critical',
        is_implied: false,
        normalized_concept_id: 'concept-pg',
        embedding: null,
      },
    ];
    achievements = [{ id: 'ach-1', company: 'X', job_title: 'Y', achievement_text: 'did stuff', skills: [], metrics: [], concept_ids: [] }];
    projects = [];
    resumeSections = [];
  });

  it('an equivalent skill no longer suppresses a block on an incompatible project', async () => {
    resumeSections = [{ section_type: 'skills', content: { skills: ['PostgreSQL'] } }];
    projects = [{ id: 'proj-1', name: 'Inventory', description: 'A MySQL-based service.', technologies: ['MySQL'], metrics: [], concept_ids: ['concept-mysql'] }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.skillsCertsNeverMergeBlocked.has('req-1')).toBe(true);
  });

  it('symmetric: an equivalent project no longer suppresses a block on an incompatible skill', async () => {
    resumeSections = [{ section_type: 'skills', content: { skills: ['MySQL'] } }];
    projects = [{ id: 'proj-1', name: 'Warehouse', description: 'A PostgreSQL-based service.', technologies: ['PostgreSQL'], metrics: [], concept_ids: ['concept-pg'] }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.skillsCertsNeverMergeBlocked.has('req-1')).toBe(true);
  });

  it('does not block when the only relevant concept is genuinely equivalent (valid alias preserved)', async () => {
    resumeSections = [{ section_type: 'skills', content: { skills: ['Postgres'] } }]; // alias of PostgreSQL
    projects = [];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.skillsCertsNeverMergeBlocked.has('req-1')).toBe(false);
  });

  it('does not block when nothing relevant is present at all', async () => {
    resumeSections = [];
    projects = [];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.skillsCertsNeverMergeBlocked.has('req-1')).toBe(false);
  });
});

describe('POST /api/match — achievement never-merge requires no co-occurring equivalent (Phase C step 3)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'text', candidate_name: 'Jane Doe' });
    loadConceptDictionaryMock.mockReset().mockResolvedValue(buildDictionary());
    matchRequirementsToAchievementsMock.mockReset().mockResolvedValue({
      matches: [{ requirement_id: 'req-1', status: 'no_evidence', confidence: 'low', explanation: 'none' }],
      neverMergeViolationsStripped: [],
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'match-1', error: null });

    job = { id: 'job-1', resume_id: 'resume-1' };
    requirements = [
      {
        id: 'req-1',
        requirement_text: 'PostgreSQL experience',
        category: 'hard_skill',
        importance: 'critical',
        is_implied: false,
        normalized_concept_id: 'concept-pg',
        embedding: null,
      },
    ];
    projects = [];
    resumeSections = [];
  });

  it('an achievement with both an equivalent and an incompatible concept is not excluded', async () => {
    achievements = [
      {
        id: 'ach-1',
        company: 'X',
        job_title: 'Y',
        achievement_text: 'Migrated our database from MySQL to PostgreSQL',
        skills: [],
        metrics: [],
        concept_ids: ['concept-pg', 'concept-mysql'],
      },
    ];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.neverMergeExcluded.get('req-1')?.has('ach-1')).toBeFalsy();
    expect(hints.conceptMatches.get('req-1')?.has('ach-1')).toBe(true);
  });

  it('an achievement with only an incompatible concept is still excluded', async () => {
    achievements = [
      { id: 'ach-1', company: 'X', job_title: 'Y', achievement_text: 'Built a MySQL database', skills: [], metrics: [], concept_ids: ['concept-mysql'] },
    ];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.neverMergeExcluded.get('req-1')?.has('ach-1')).toBe(true);
  });
});

describe('POST /api/match — implied requirements are excluded from matching (Phase C step 5)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'text', candidate_name: 'Jane Doe' });
    loadConceptDictionaryMock.mockReset().mockResolvedValue(buildDictionary());
    matchRequirementsToAchievementsMock.mockReset().mockResolvedValue({
      matches: [{ requirement_id: 'req-1', status: 'matched', confidence: 'high', explanation: 'stated match' }],
      neverMergeViolationsStripped: [],
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'match-1', error: null });

    job = { id: 'job-1', resume_id: 'resume-1' };
    requirements = [
      {
        id: 'req-1',
        requirement_text: 'PostgreSQL experience',
        category: 'hard_skill',
        importance: 'critical',
        is_implied: false,
        normalized_concept_id: 'concept-pg',
        embedding: null,
      },
      {
        id: 'req-2',
        requirement_text: 'Implied MySQL familiarity',
        category: 'hard_skill',
        importance: 'medium',
        is_implied: true,
        normalized_concept_id: 'concept-mysql',
        embedding: null,
      },
    ];
    achievements = [
      { id: 'ach-1', company: 'X', job_title: 'Y', achievement_text: 'Used PostgreSQL and MySQL', skills: [], metrics: [], concept_ids: ['concept-pg', 'concept-mysql'] },
    ];
    projects = [];
    resumeSections = [];
  });

  it('never sends an implied requirement to the LLM evidence matcher', async () => {
    await POST(makeRequest());

    const sentRequirements = matchRequirementsToAchievementsMock.mock.calls[0][0] as { id: string }[];
    expect(sentRequirements.map((r) => r.id)).toEqual(['req-1']);
  });

  it('never runs concept matching for an implied requirement', async () => {
    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.conceptMatches.has('req-2')).toBe(false);
    expect(hints.neverMergeExcluded.has('req-2')).toBe(false);
    expect(hints.skillsCertsNeverMergeBlocked.has('req-2')).toBe(false);
  });

  it('still saves a match item for the implied requirement, defaulted to no evidence', async () => {
    await POST(makeRequest());

    const items = rpcMock.mock.calls[0][1].p_items as { requirement_id: string; status: string }[];
    const implied = items.find((i) => i.requirement_id === 'req-2');
    expect(implied?.status).toBe('no_evidence');
  });
});

// A dictionary covering the concept pairs this Phase C step is explicitly
// required to get right: PostgreSQL<->Postgres and React<->React.js as
// aliases of the same concept (equivalent), Java/JavaScript and AWS/Azure as
// distinct concepts with no equivalence relation between them at all (so a
// positive hint can never fire for them), plus the pre-existing
// PostgreSQL/MySQL never-merge incompatibility.
function buildPositiveHintDictionary() {
  return {
    aliasToConceptId: new Map([
      ['postgresql', 'concept-pg'],
      ['postgres', 'concept-pg'],
      ['mysql', 'concept-mysql'],
      ['react', 'concept-react'],
      ['react.js', 'concept-react'],
      ['java', 'concept-java'],
      ['javascript', 'concept-js'],
      ['aws', 'concept-aws'],
      ['azure', 'concept-azure'],
    ]),
    conceptIdToName: new Map([
      ['concept-pg', 'PostgreSQL'],
      ['concept-mysql', 'MySQL'],
      ['concept-react', 'React'],
      ['concept-java', 'Java'],
      ['concept-js', 'JavaScript'],
      ['concept-aws', 'AWS'],
      ['concept-azure', 'Azure'],
    ]),
    incompatible: new Map([
      ['concept-pg', new Set(['concept-mysql'])],
      ['concept-mysql', new Set(['concept-pg'])],
    ]),
    equivalent: new Map(),
  };
}

describe('POST /api/match — positive concept-equivalence hints (Phase C)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'text', candidate_name: 'Jane Doe' });
    loadConceptDictionaryMock.mockReset().mockResolvedValue(buildPositiveHintDictionary());
    matchRequirementsToAchievementsMock.mockReset().mockResolvedValue({
      matches: [{ requirement_id: 'req-1', status: 'no_evidence', confidence: 'low', explanation: 'none' }],
      neverMergeViolationsStripped: [],
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'match-1', error: null });

    job = { id: 'job-1', resume_id: 'resume-1' };
    achievements = [{ id: 'ach-1', company: 'X', job_title: 'Y', achievement_text: 'did stuff', skills: [], metrics: [], concept_ids: [] }];
    projects = [];
    resumeSections = [];
  });

  function requirement(text: string, conceptId: string) {
    return [
      {
        id: 'req-1',
        requirement_text: text,
        category: 'hard_skill',
        importance: 'critical',
        is_implied: false,
        normalized_concept_id: conceptId,
        embedding: null,
      },
    ];
  }

  it('1. an equivalent skill (Postgres) produces a positive hint for a PostgreSQL requirement', async () => {
    requirements = requirement('PostgreSQL experience', 'concept-pg');
    resumeSections = [{ section_type: 'skills', content: { skills: ['Postgres'] } }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.positiveConceptHints.get('req-1')?.skills).toBe(true);
  });

  it('2. an equivalent certification (React.js) produces a positive hint for a React requirement', async () => {
    requirements = requirement('React experience', 'concept-react');
    resumeSections = [{ section_type: 'certifications', content: { items: [{ name: 'React.js' }] } }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.positiveConceptHints.get('req-1')?.certifications).toBe(true);
  });

  it('3. an equivalent project technology produces a positive hint for a React requirement', async () => {
    requirements = requirement('React experience', 'concept-react');
    projects = [{ id: 'proj-1', name: 'Dashboard', description: 'Built with React.js.', technologies: ['React.js'], metrics: [], concept_ids: ['concept-react'] }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.positiveConceptHints.get('req-1')?.projects).toBe(true);
  });

  it.each([
    ['Java requirement vs a JavaScript-only skill', 'Java experience', 'concept-java', 'JavaScript'],
    ['PostgreSQL requirement vs a MySQL-only skill', 'PostgreSQL experience', 'concept-pg', 'MySQL'],
    ['AWS requirement vs an Azure-only skill', 'AWS experience', 'concept-aws', 'Azure'],
  ])('4. %s produces no positive hint', async (_label, text, conceptId, skill) => {
    requirements = requirement(text, conceptId);
    resumeSections = [{ section_type: 'skills', content: { skills: [skill] } }];

    await POST(makeRequest());

    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.positiveConceptHints.has('req-1')).toBe(false);
  });

  it('a positive hint alone never appears without the model result being used as-is: the route only forwards the hint, matched status still comes from the mocked matcher', async () => {
    requirements = requirement('PostgreSQL experience', 'concept-pg');
    resumeSections = [{ section_type: 'skills', content: { skills: ['Postgres'] } }];
    matchRequirementsToAchievementsMock.mockResolvedValueOnce({
      matches: [{ requirement_id: 'req-1', status: 'no_evidence', confidence: 'low', explanation: 'none' }],
      neverMergeViolationsStripped: [],
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.fit).toBeDefined();
    const hints = matchRequirementsToAchievementsMock.mock.calls[0][6];
    expect(hints.positiveConceptHints.get('req-1')?.skills).toBe(true);
  });
});
