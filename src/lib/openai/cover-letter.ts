import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const CoverLetterSchema = z.object({
  letter: z.string(),
});

export interface AchievementForLetter {
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
}

export interface RequirementForLetter {
  requirement_text: string;
  importance: string;
}

export async function generateCoverLetter(
  candidateName: string,
  jobTitle: string,
  company: string | null,
  requirements: RequirementForLetter[],
  achievements: AchievementForLetter[]
): Promise<string> {
  const requirementsList = requirements.map((r) => `[${r.importance.toUpperCase()}] ${r.requirement_text}`).join('\n');
  const achievementsList = achievements
    .map((a) => `${a.job_title} at ${a.company}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`)
    .join('\n');

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional cover letter writer. Write a compelling, specific, non-generic cover letter for this candidate and job.

ABSOLUTE RULES — TRUTH GUARD:
1. Every claim, accomplishment, and metric in the letter must come directly from the candidate's real achievements provided below. Never invent experience, employers, metrics, or skills not present in the evidence.
2. Pick the 2-3 strongest, most relevant achievements for this specific job's top requirements and build the letter around them — don't just list everything.
3. Do not use generic filler like "I am a hard worker" or "I am passionate about this opportunity" without tying it to something concrete and real.
4. 3-4 paragraphs: an opening that names the role and a genuine hook, 1-2 body paragraphs with specific evidenced accomplishments mapped to what the job needs, and a closing paragraph.
5. Professional but personable tone. No placeholder text like "[Company Name]" — use the actual company name if given, otherwise refer to "your team" naturally.
6. Do not fabricate a hiring manager's name or a specific date. Do not invent contact information.`,
      },
      {
        role: 'user',
        content: `Candidate: ${candidateName}
Job: ${jobTitle}${company ? ` at ${company}` : ''}

JOB REQUIREMENTS:
${requirementsList}

CANDIDATE'S REAL ACHIEVEMENTS (only source of truth):
${achievementsList}

Write the cover letter now.`,
      },
    ],
    response_format: zodResponseFormat(CoverLetterSchema, 'cover_letter'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Cover letter generation failed: no result returned');
  }

  return result.letter;
}
