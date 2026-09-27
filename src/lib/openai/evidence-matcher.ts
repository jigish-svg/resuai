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
}

export interface BatchMatchResult {
  matches: z.infer<typeof BatchMatchSchema>['matches'];
  /** requirement/achievement_id pairs the model returned that violated a hard never-merge exclusion and were stripped server-side */
  neverMergeViolationsStripped: { requirement_id: string; achievement_id: string }[];
}

export async function matchRequirementsToAchievements(
  requirements: RequirementToMatch[],
  achievements: AchievementToSearch[],
  candidateName: string,
  skills: string[] = [],
  certifications: CertificationToSearch[] = [],
  hints: MatchHints = {}
): Promise<BatchMatchResult> {
  const neverMergeExcluded = hints.neverMergeExcluded ?? new Map<string, Set<string>>();
  const conceptMatches = hints.conceptMatches ?? new Map<string, Set<string>>();
  const similarityHints = hints.similarityHints ?? new Map<string, Map<string, number>>();

  const requirementsList = requirements.map((r) => {
    const excluded = neverMergeExcluded.get(r.id);
    const conceptHit = conceptMatches.get(r.id);
    const similar = similarityHints.get(r.id);

    const annotations: string[] = [];
    if (conceptHit?.size) annotations.push(`concept-equivalent achievement(s): ${[...conceptHit].join(', ')}`);
    if (similar?.size) {
      const ranked = [...similar.entries()].sort((a, b) => b[1] - a[1]);
      annotations.push(`embedding-similar achievement(s): ${ranked.map(([id, sim]) => `${id}=${sim.toFixed(2)}`).join(', ')} (similarity alone never proves hands-on experience — it only tells you where to look)`);
    }
    if (excluded?.size) {
      annotations.push(`EXCLUDED achievement(s), do not cite even if they seem related: ${[...excluded].join(', ')} (concept-incompatible with this requirement)`);
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
4. Only use evidence from the provided achievements list, skills list, and certifications list below
5. SKILLS LIST: if a requirement is satisfied by a skill in the candidate's skills list but no achievement bullet demonstrates it being used, mark it PARTIAL (not NO_EVIDENCE) — being listed as a skill is real but weaker evidence than a demonstrated achievement. Only upgrade to MATCHED when an achievement also shows that skill in use.
6. CERTIFICATIONS LIST: for a requirement with category "certification", check the candidate's certifications list — mark MATCHED if a listed certification clearly satisfies it (by name or a close, well-known synonym/equivalent), PARTIAL if a related-but-not-exact certification exists (e.g. an adjacent vendor cert), and NO_EVIDENCE only if nothing relevant is listed there or in achievements.
7. When status is MATCHED or PARTIAL and an achievement supports it, set achievement_id to the exact ID (shown before the "|") of the single best supporting achievement. Never invent an ID that isn't listed. Leave achievement_id unset when the evidence comes only from the skills or certifications list, or for NO_EVIDENCE.
8. Some requirement lines carry annotations after a "|": a concept-equivalent achievement hint (a deterministic alias match — strong signal), an embedding-similarity hint (topically related, but similarity by itself proves nothing about hands-on experience level — e.g. "AWS course completed" or "familiar with FastAPI" must never be upgraded to MATCHED for a requirement asking for years of production experience just because it's semantically close), and an EXCLUDED list you must never cite as achievement_id for that requirement under any circumstance, no matter how related it looks.

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

Match each requirement to the best available evidence from the achievements, skills list, and certifications. Be strict and honest.`,
      },
    ],
    response_format: zodResponseFormat(BatchMatchSchema, 'batch_match'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Evidence matching failed: no result returned');
  }

  // Never-merge is a hard server-side constraint: even if the model ignores the
  // EXCLUDED annotation above, a citation of an excluded achievement is stripped
  // here and the match is downgraded, never left standing.
  const neverMergeViolationsStripped: { requirement_id: string; achievement_id: string }[] = [];
  const matches = result.matches.map((m) => {
    const excluded = neverMergeExcluded.get(m.requirement_id);
    if (m.achievement_id && excluded?.has(m.achievement_id)) {
      neverMergeViolationsStripped.push({ requirement_id: m.requirement_id, achievement_id: m.achievement_id });
      return {
        ...m,
        achievement_id: undefined,
        status: 'no_evidence' as const,
        evidence_text: undefined,
        explanation: 'The only cited evidence used an incompatible/never-merge concept and was rejected server-side.',
      };
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
