import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const SkillSuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
});

export async function suggestRoleSkills(jobTitles: string[], currentSkills: string[]): Promise<string[]> {
  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a career advisor. Given a candidate's job title(s), list skills that are commonly associated with those roles and are NOT already in their current skills list.

This is a SELF-ATTESTATION checklist — the candidate will manually confirm which of these they genuinely have before any are added to their resume. You are not claiming they have these skills; you are only suggesting what to consider checking off.

Rules:
- Only suggest skills genuinely common for the given role(s) — no generic buzzwords like "hard worker" or "team player."
- Do not repeat anything already in the current skills list (case-insensitive, including close synonyms).
- Return 8-15 specific, concrete skills (tools, technologies, methodologies).`,
      },
      {
        role: 'user',
        content: `Job title(s): ${jobTitles.join(', ') || 'Unknown'}

Current skills already listed: ${currentSkills.join(', ') || 'none'}

Suggest additional skills to consider.`,
      },
    ],
    response_format: zodResponseFormat(SkillSuggestionsSchema, 'skill_suggestions'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Skill suggestion failed: no result returned');
  }

  return result.suggestions;
}
