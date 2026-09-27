import { openai, MODEL, EMBEDDING_MODEL, delimitUntrusted, UNTRUSTED_DATA_NOTICE } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const BatchMatchSchema = z.object({
  matches: z.array(z.object({
    requirement_id: z.string(),
    status: z.enum(['matched', 'partial', 'no_evidence']),
    confidence: z.enum(['high', 'medium', 'low']),
    evidence_text: z.string().optional(),
    achievement_id: z.string().optional(),
    project_id: z.string().optional(),
    explanation: z.string(),
  })),
});

export interface RequirementToMatch {
  id: string;
  requirement_text: string;
  category: string;
  importance: string;
}

export interface AchievementToSearch {
  id: string;
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
}

export interface CertificationToSearch {
  name: string;
  issuer?: string;
  date?: string;
}

export interface ProjectToSearch {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  metrics: string[];
}

/**
 * Structured hints computed by the caller (from the concept dictionary and a
 * pgvector similarity query) that the LLM is given as extra context, plus a
 * hard exclusion list it cannot override. Building these is the caller's job
 * (match/route.ts) — this module never touches the database or the concept
 * dictionary itself, which keeps it cheap to unit-test.
 */
export interface MatchHints {
  /** requirement_id -> achievement ids with a deterministic (alias/equivalent) concept match */
  conceptMatches?: Map<string, Set<string>>;
  /** requirement_id -> achievement ids that MUST NOT be cited as evidence (never-merge concept conflict) */
  neverMergeExcluded?: Map<string, Set<string>>;
  /** requirement_id -> achievement_id -> cosine similarity (0-1), from pgvector top-K retrieval */
  similarityHints?: Map<string, Map<string, number>>;
  /**
   * requirement_ids where the candidate's skills-list/certifications-list concepts are
   * ONLY concept-incompatible with this requirement (no genuinely equivalent skill or
   * certification exists) — an achievement, if one exists independently, is unaffected.
   * Skills/certifications evidence has no citation id to validate post-hoc the way
   * achievement_id does, so this is enforced both as a prompt exclusion AND as a
   * deterministic downgrade of any skills/certifications-only MATCHED/PARTIAL result.
   */
  skillsCertsNeverMergeBlocked?: Set<string>;
  /**
   * requirement_id -> which of the candidate's skills/certifications/projects lists
   * already contain a deterministic (alias/equivalent) concept match for this
   * requirement — e.g. "Postgres" for a "PostgreSQL" requirement. Purely a positive
   * annotation for the model: it never sets a status by itself, is independent of
   * (and does not override) skillsCertsNeverMergeBlocked, and every existing
   * post-filter (the skills-only PARTIAL cap, never-merge stripping) still applies
   * to whatever status the model returns.
   */
  positiveConceptHints?: Map<string, { skills?: boolean; certifications?: boolean; projects?: boolean }>;
}

export interface NeverMergeViolation {
  requirement_id: string;
  achievement_id?: string;
  source: 'achievement' | 'skills_or_certifications';
}

export interface BatchMatchResult {
  matches: z.infer<typeof BatchMatchSchema>['matches'];
  /** citations/claims the model returned that violated a hard never-merge exclusion and were stripped server-side */
  neverMergeViolationsStripped: NeverMergeViolation[];
}

export async function matchRequirementsToAchievements(
  requirements: RequirementToMatch[],
  achievements: AchievementToSearch[],
  candidateName: string,
  skills: string[] = [],
  certifications: CertificationToSearch[] = [],
  projects: ProjectToSearch[] = [],
  hints: MatchHints = {}
): Promise<BatchMatchResult> {
  const neverMergeExcluded = hints.neverMergeExcluded ?? new Map<string, Set<string>>();
  const conceptMatches = hints.conceptMatches ?? new Map<string, Set<string>>();
  const similarityHints = hints.similarityHints ?? new Map<string, Map<string, number>>();
  const skillsCertsNeverMergeBlocked = hints.skillsCertsNeverMergeBlocked ?? new Set<string>();
  const positiveConceptHints = hints.positiveConceptHints ?? new Map<string, { skills?: boolean; certifications?: boolean; projects?: boolean }>();

  const requirementsList = requirements.map((r) => {
    const excluded = neverMergeExcluded.get(r.id);
    const conceptHit = conceptMatches.get(r.id);
    const similar = similarityHints.get(r.id);
    const skillsCertsBlocked = skillsCertsNeverMergeBlocked.has(r.id);
    const positiveHit = positiveConceptHints.get(r.id);

    const annotations: string[] = [];
    if (conceptHit?.size) annotations.push(`concept-equivalent achievement(s): ${[...conceptHit].join(', ')}`);
    if (positiveHit?.skills) annotations.push('concept-equivalent entry in the skills list (deterministic alias/equivalence match, e.g. "Postgres" for "PostgreSQL")');
    if (positiveHit?.certifications) annotations.push('concept-equivalent entry in the certifications list (deterministic alias/equivalence match)');
    if (positiveHit?.projects) annotations.push('concept-equivalent technology in a project (deterministic alias/equivalence match)');
    if (similar?.size) {
      const ranked = [...similar.entries()].sort((a, b) => b[1] - a[1]);
      annotations.push(`embedding-similar achievement(s): ${ranked.map(([id, sim]) => `${id}=${sim.toFixed(2)}`).join(', ')} (similarity alone never proves hands-on experience — it only tells you where to look)`);
    }
    if (excluded?.size) {
      annotations.push(`EXCLUDED achievement(s), do not cite even if they seem related: ${[...excluded].join(', ')} (concept-incompatible with this requirement)`);
    }
    if (skillsCertsBlocked) {
      annotations.push('candidate skills/certifications/projects list contains ONLY concept-incompatible entries for this requirement — never mark MATCHED or PARTIAL based on the skills list, certifications list, or projects list for this requirement (an independently-supporting achievement, if any, is unaffected)');
    }

    return `ID: ${r.id} | [${r.importance.toUpperCase()}] ${r.requirement_text}${annotations.length ? ` | ${annotations.join(' | ')}` : ''}`;
  }).join('\n');

  const achievementsList = achievements.map((a) =>
    `ID: ${a.id} | ${a.company} - ${a.job_title}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`
  ).join('\n');

  const skillsList = skills.length > 0 ? skills.join(', ') : 'None listed';

  const certificationsList = certifications.length > 0
    ? certifications.map((c) => `${c.name}${c.issuer ? ` (issued by ${c.issuer})` : ''}${c.date ? `, ${c.date}` : ''}`).join('\n')
    : 'None listed';

  const projectsList = projects.length > 0
    ? projects.map((p) => `ID: ${p.id} | "${p.name}": ${p.description} (Technologies: ${p.technologies.join(', ')}; Metrics: ${p.metrics.join(', ')})`).join('\n')
    : 'None listed';

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert career consultant performing evidence-based resume matching.

For each job requirement, search the candidate's achievements for evidence.

Rules:
- MATCHED: Clear, direct evidence exists in the achievements
- PARTIAL: Related or adjacent evidence exists (transferable skill, similar domain)
- NO_EVIDENCE: No evidence found in the achievements

CRITICAL RULES:
1. Never infer skills that are not explicitly stated
2. Never assume experience that is not documented
3. Be honest about missing evidence - this protects the candidate
4. Only use evidence from the provided achievements list, skills list, certifications list, and projects list below
5. SKILLS LIST: if a requirement is satisfied by a skill in the candidate's skills list but no achievement bullet demonstrates it being used, mark it PARTIAL (not NO_EVIDENCE) — being listed as a skill is real but weaker evidence than a demonstrated achievement. Only upgrade to MATCHED when an achievement also shows that skill in use.
6. CERTIFICATIONS LIST: for a requirement with category "certification", check the candidate's certifications list — mark MATCHED if a listed certification clearly satisfies it (by name or a close, well-known synonym/equivalent), PARTIAL if a related-but-not-exact certification exists (e.g. an adjacent vendor cert), and NO_EVIDENCE only if nothing relevant is listed there or in achievements.
7. PROJECTS LIST: the candidate's own projects are real evidence, exactly like achievements — a project whose description or technologies clearly demonstrate a requirement can be MATCHED, and a related-but-not-exact project can be PARTIAL. Do not treat a project as weaker evidence than an achievement bullet just because it's listed separately.
8. When status is MATCHED or PARTIAL and an achievement or project supports it, set achievement_id or project_id (never both) to the exact ID (shown before the "|") of the single best supporting achievement or project. Never invent an ID that isn't listed. Leave both achievement_id and project_id unset when the evidence comes only from the skills list, certifications list, or for NO_EVIDENCE.
9. Some requirement lines carry annotations after a "|": a concept-equivalent achievement hint (a deterministic alias match — strong signal), a concept-equivalent skills/certifications/projects-list hint (the candidate's own list already contains a deterministic alias or equivalent term for this requirement, e.g. "Postgres" for "PostgreSQL" or "React.js" for "React" — treat that entry as if it were worded exactly like the requirement, but this hint alone does not create MATCHED: you still decide the status using rules 5-7 as normal, and an unrelated or absent achievement/skill is still NO_EVIDENCE regardless of any hint), an embedding-similarity hint (topically related, but similarity by itself proves nothing about hands-on experience level — e.g. "AWS course completed" or "familiar with FastAPI" must never be upgraded to MATCHED for a requirement asking for years of production experience just because it's semantically close), an EXCLUDED list you must never cite as achievement_id for that requirement under any circumstance, no matter how related it looks, and a "skills/certifications/projects list contains ONLY concept-incompatible entries" warning meaning you must not use the skills list, certifications list, or projects list as the basis for MATCHED or PARTIAL on that requirement (a genuinely supporting achievement, if one exists, is still fine to use).

Be strict. The candidate's reputation depends on accurate matching.

${UNTRUSTED_DATA_NOTICE}`,
      },
      {
        role: 'user',
        content: `Candidate: ${candidateName}

JOB REQUIREMENTS:
${delimitUntrusted('job_requirements', requirementsList)}

CANDIDATE ACHIEVEMENTS:
${delimitUntrusted('candidate_achievements', achievementsList)}

CANDIDATE SKILLS LIST:
${delimitUntrusted('candidate_skills', skillsList)}

CANDIDATE CERTIFICATIONS:
${delimitUntrusted('candidate_certifications', certificationsList)}

CANDIDATE PROJECTS:
${delimitUntrusted('candidate_projects', projectsList)}

Match each requirement to the best available evidence from the achievements, skills list, certifications, and projects. Be strict and honest.`,
      },
    ],
    response_format: zodResponseFormat(BatchMatchSchema, 'batch_match'),
    // Same saved inputs must give the same score (CLAUDE.md rule 2): fixed
    // temperature/seed so re-running a match on unchanged data reproduces the
    // same evidence judgment rather than drifting between calls.
    temperature: 0,
    seed: 0,
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Evidence matching failed: no result returned');
  }

  // Never-merge is a hard server-side constraint: even if the model ignores the
  // annotations above, a citation of an excluded achievement — or a MATCHED/PARTIAL
  // verdict resting only on the skills/certifications list when that list has no
  // genuinely equivalent concept for this requirement — is stripped here and the
  // match is downgraded, never left standing.
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const neverMergeViolationsStripped: NeverMergeViolation[] = [];
  const matches = result.matches.map((m) => {
    const excluded = neverMergeExcluded.get(m.requirement_id);
    if (m.achievement_id && excluded?.has(m.achievement_id)) {
      neverMergeViolationsStripped.push({ requirement_id: m.requirement_id, achievement_id: m.achievement_id, source: 'achievement' });
      return {
        ...m,
        achievement_id: undefined,
        status: 'no_evidence' as const,
        evidence_text: undefined,
        explanation: 'The only cited evidence used an incompatible/never-merge concept and was rejected server-side.',
      };
    }

    // No achievement_id means (per rule 8) the model's evidence, if any, came only
    // from the skills/certifications/projects list. If that list has no concept genuinely
    // equivalent to this requirement — only an incompatible one — a MATCHED/PARTIAL
    // verdict here cannot be trusted, regardless of what the model wrote.
    if (!m.achievement_id && (m.status === 'matched' || m.status === 'partial') && skillsCertsNeverMergeBlocked.has(m.requirement_id)) {
      neverMergeViolationsStripped.push({ requirement_id: m.requirement_id, source: 'skills_or_certifications' });
      return {
        ...m,
        status: 'no_evidence' as const,
        evidence_text: undefined,
        explanation: 'The only cited evidence relied on a skill/certification with an incompatible/never-merge concept and was rejected server-side.',
      };
    }

    // Rule 5, code-enforced: a MATCHED verdict resting on neither achievement_id
    // nor project_id can only rest on the skills list (certifications may
    // legitimately reach MATCHED on their own per rule 6, so they're exempt).
    // Being listed as a skill is real but weaker evidence than a demonstrated
    // achievement or project, so it's deterministically capped at PARTIAL
    // rather than trusting the model to self-cap it every time.
    if (
      m.status === 'matched' &&
      !m.achievement_id &&
      !m.project_id &&
      requirementById.get(m.requirement_id)?.category !== 'certification'
    ) {
      return { ...m, status: 'partial' as const };
    }

    return m;
  });

  return { matches, neverMergeViolationsStripped };
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}
