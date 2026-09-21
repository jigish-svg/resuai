import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const InterviewPrepSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    category: z.enum(['behavioral', 'technical', 'role_specific', 'company']),
    related_requirement: z.string().optional(),
    talking_points: z.string(),
    is_gap: z.boolean(),
    gap_strategy: z.string().optional(),
  })),
  questions_to_ask: z.array(z.string()),
  skill_gaps: z.array(z.object({
    keyword: z.string(),
    what_it_involves: z.string(),
    how_to_prepare: z.array(z.string()),
    honest_talking_point: z.string(),
  })),
});

export interface RequirementForPrep {
  requirement_text: string;
  category: string;
  importance: string;
}

export interface MatchItemForPrep {
  requirement_text: string;
  status: 'matched' | 'partial' | 'no_evidence';
  evidence_text?: string;
}

export interface AchievementForPrep {
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
}

export async function generateInterviewPrep(
  jobTitle: string,
  company: string | null,
  requirements: RequirementForPrep[],
  matchItems: MatchItemForPrep[],
  achievements: AchievementForPrep[],
  candidateName: string
): Promise<z.infer<typeof InterviewPrepSchema>> {
  const requirementsList = requirements
    .map((r) => `[${r.importance.toUpperCase()}] (category: ${r.category}) ${r.requirement_text}`)
    .join('\n');

  const matchSummary = matchItems
    .map((m) => `- "${m.requirement_text}" — ${m.status.toUpperCase()}${m.evidence_text ? `: ${m.evidence_text}` : ''}`)
    .join('\n');

  const achievementsList = achievements
    .map((a) => `${a.job_title} at ${a.company}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`)
    .join('\n');

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert interview coach preparing a candidate for a specific job interview.

Generate 8-12 realistic interview questions for this role: a mix of behavioral questions, technical/role-specific questions, and questions that probe the job's most important (critical/high importance) requirements.

For EACH question, provide talking points the candidate can actually use — written in first person, STAR-style (Situation, Task, Action, Result) where relevant.

ABSOLUTE RULES — TRUTH GUARD:
1. Talking points may ONLY reference achievements, skills, and metrics explicitly present in the candidate's evidence provided below. Never invent experience, metrics, or accomplishments.
2. If a question targets a requirement where the evidence shows PARTIAL or NO_EVIDENCE, set is_gap to true. Instead of fabricating direct experience, write a gap_strategy: an honest way to answer using transferable skills, adjacent experience, or a genuine plan to grow into it. Never suggest the candidate claim experience they don't have.
3. If a question is fully supported by MATCHED evidence, set is_gap to false and gap_strategy should be omitted.
4. Prefer specific, real achievements over generic advice — reference actual companies, projects, and metrics from the evidence when relevant.

Also generate 5 smart, specific questions the candidate should ask the interviewer — tailored to this role and company, not generic filler.

SKILL GAP ACTION PLAN: For each CRITICAL or HIGH importance requirement where the evidence shows PARTIAL or NO_EVIDENCE, produce a skill_gaps entry that helps the candidate genuinely close or credibly address the gap before the interview — this is real preparation, never a script for claiming false experience:
- what_it_involves: a plain-language explanation of what this skill/requirement actually means in practice, so the candidate understands what they're walking into.
- how_to_prepare: 2-4 concrete, specific, doable-before-an-interview actions — e.g. a specific free course/doc/tutorial to complete, core concepts to read up on and be able to explain, a small practice exercise, or a way to practice articulating adjacent experience. Be specific (name real, well-known resources like official docs, freeCodeCamp, official framework tutorials) rather than vague advice like "learn more about X."
- honest_talking_point: how to answer honestly if asked directly — acknowledging the gap, showing the genuine understanding gained from the prep above, connecting to real transferable experience if any exists, and expressing genuine interest in growing into it. This must never claim hands-on experience the candidate doesn't have.
Skip requirements that are already MATCHED — only include genuine gaps here. Only produce a skill_gaps entry for requirements in the "hard_skill", "technology", or "certification" categories — never for "education", "experience", "responsibility", or "soft_skill" categories, even when their evidence is PARTIAL or NO_EVIDENCE. Those aren't gaps a certification or short prep can close (an in-progress degree, for instance, should never be presented as something wrong with the candidate).`,
      },
      {
        role: 'user',
        content: `Candidate: ${candidateName}
Job: ${jobTitle}${company ? ` at ${company}` : ''}

JOB REQUIREMENTS:
${requirementsList}

EVIDENCE MATCH RESULTS (from prior analysis):
${matchSummary || 'No match analysis available yet.'}

CANDIDATE'S REAL ACHIEVEMENTS (only source of truth for talking points):
${achievementsList}

Generate the interview prep now.`,
      },
    ],
    response_format: zodResponseFormat(InterviewPrepSchema, 'interview_prep'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Interview prep generation failed: no result returned');
  }

  return result;
}
