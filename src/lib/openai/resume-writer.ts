import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const RewriteTextSchema = z.object({
  rewritten: z.string(),
});

export type RewriteFieldType = 'summary' | 'bullet';

export async function rewriteResumeText(
  text: string,
  fieldType: RewriteFieldType,
  context?: { jobTitle?: string; company?: string }
): Promise<string> {
  const roleContext = context?.jobTitle
    ? `\nThis is for the candidate's role as ${context.jobTitle}${context.company ? ` at ${context.company}` : ''}.`
    : '';

  const fieldGuidance =
    fieldType === 'summary'
      ? 'This is a professional summary (2-4 sentences) at the top of a resume. Make it punchy, confident, and specific.'
      : 'This is a single achievement bullet point under a job entry. Start with a strong action verb, keep it to one line of impact.';

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional resume writer. Improve the wording of resume text the candidate wrote themselves: fix grammar, tighten phrasing, use strong action verbs, and make it sound professional and impactful.

${fieldGuidance}

ABSOLUTE RULE — TRUTH GUARD: never add any new fact, employer, project, responsibility, skill, or metric (number, percentage, dollar amount) that is not already present in the original text. You may only reword, clarify, and sharpen what the candidate already wrote — never invent specifics they didn't provide, even if the original is vague or short.`,
      },
      {
        role: 'user',
        content: `Original text: "${text}"${roleContext}\n\nRewrite this now.`,
      },
    ],
    response_format: zodResponseFormat(RewriteTextSchema, 'rewrite_text'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Rewrite failed: no result returned');
  }
  return result.rewritten;
}
