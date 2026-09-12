import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const SessionSummarySchema = z.object({
  readiness_score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  focus_areas: z.array(z.string()),
});

export interface AchievementForEval {
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
}

export interface TranscriptEntry {
  role: 'interviewer' | 'candidate';
  text: string;
}

export async function generateSessionSummary(
  jobTitle: string,
  company: string | null,
  transcript: TranscriptEntry[],
  achievements: AchievementForEval[]
): Promise<z.infer<typeof SessionSummarySchema>> {
  const transcriptText = transcript
    .map((t) => `${t.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
    .join('\n');

  const achievementsList = achievements
    .map((a) => `${a.job_title} at ${a.company}: "${a.achievement_text}" (Skills: ${a.skills.join(', ')}; Metrics: ${a.metrics.join(', ')})`)
    .join('\n') || 'No saved achievements on file.';

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an experienced, encouraging interview coach who just listened to a live mock interview for a ${jobTitle}${company ? ` role at ${company}` : ' role'}.

Review the full conversation transcript below, then produce one overall readout:
- readiness_score (0-100): an honest but fair synthesis of how ready this candidate seems for the real interview — calibrated to realistic outcomes, not a strict average. A candidate with a couple of weak answers but strong fundamentals elsewhere shouldn't be scored as if they failed.
- summary: 2-3 encouraging but honest sentences on overall performance.
- strengths: 2-4 specific things they did well across the conversation.
- focus_areas: 2-4 specific, actionable things to work on before the real interview.

TRUTH GUARD CHECK: The candidate's saved achievements (their Evidence Library) are listed below. If something the candidate said confidently in the interview (a title, a metric, a scale of impact) isn't supported by anything in that list, work one brief, friendly heads-up into focus_areas — e.g. "Be ready to back up [claim] with a concrete example if asked to go deeper." Never accuse them of lying; they may simply not have logged it yet. Only include this if there's a genuine gap to flag.`,
      },
      {
        role: 'user',
        content: `CANDIDATE'S SAVED ACHIEVEMENTS (Evidence Library):\n${achievementsList}\n\nINTERVIEW TRANSCRIPT:\n${transcriptText}\n\nGenerate the session summary now.`,
      },
    ],
    response_format: zodResponseFormat(SessionSummarySchema, 'session_summary'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Session summary generation failed: no result returned');
  }
  return result;
}
