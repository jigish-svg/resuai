import { openai, MODEL, EMBEDDING_MODEL } from './client';
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

export async function matchRequirementsToAchievements(
  requirements: RequirementToMatch[],
  achievements: AchievementToSearch[],
  candidateName: string,
  skills: string[] = [],
  certifications: CertificationToSearch[] = []
): Promise<z.infer<typeof BatchMatchSchema>> {
  const requirementsList = requirements.map((r) =>
    `ID: ${r.id} | [${r.importance.toUpperCase()}] ${r.requirement_text}`
  ).join('\n');

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

Be strict. The candidate's reputation depends on accurate matching.`,
      },
      {
        role: 'user',
        content: `Candidate: ${candidateName}

JOB REQUIREMENTS:
${requirementsList}

CANDIDATE ACHIEVEMENTS:
${achievementsList}

CANDIDATE SKILLS LIST:
${skillsList}

CANDIDATE CERTIFICATIONS:
${certificationsList}

Match each requirement to the best available evidence from the achievements, skills list, and certifications. Be strict and honest.`,
      },
    ],
    response_format: zodResponseFormat(BatchMatchSchema, 'batch_match'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Evidence matching failed: no result returned');
  }

  return result;
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
