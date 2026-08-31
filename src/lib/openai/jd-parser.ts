import { openai, MODEL } from './client';
import { ParsedJobDescription } from '@/types/job';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const ParsedJDSchema = z.object({
  job_title: z.string(),
  company: z.string().optional(),
  location: z.string().optional(),
  job_type: z.string().optional(),
  seniority: z.string().optional(),
  summary: z.string().optional(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  education_requirements: z.array(z.string()),
  certifications: z.array(z.string()),
  experience_requirements: z.array(z.string()),
  soft_skills: z.array(z.string()),
  technologies: z.array(z.string()),
  keywords: z.array(z.string()),
  salary_range: z.string().optional(),
});

const RequirementSchema = z.object({
  requirement_text: z.string(),
  category: z.enum(['hard_skill', 'soft_skill', 'responsibility', 'experience', 'education', 'certification', 'technology']),
  importance: z.enum(['critical', 'high', 'medium', 'low']),
  is_implied: z.boolean(),
});

const RequirementsListSchema = z.object({
  requirements: z.array(RequirementSchema),
});

export async function parseJobDescription(jdText: string): Promise<ParsedJobDescription> {
  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert job description analyst. Extract all relevant requirements and information from this job posting.

Be thorough in identifying:
- Required vs preferred skills
- Technical skills and technologies
- Years of experience requirements
- Soft skills and behavioral requirements
- Responsibilities and duties
- Education requirements
- Important keywords for ATS matching

Be precise - only extract what is explicitly stated.`,
      },
      {
        role: 'user',
        content: `Parse this job description:\n\n${jdText}`,
      },
    ],
    response_format: zodResponseFormat(ParsedJDSchema, 'parsed_jd'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Failed to parse job description: no result returned');
  }

  return result;
}

export async function extractRequirements(parsedJD: ParsedJobDescription): Promise<z.infer<typeof RequirementsListSchema>> {
  const jdSummary = JSON.stringify(parsedJD, null, 2);

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing job requirements. Convert the structured job description into individual, atomic requirements.

For each requirement explicitly stated or clearly implied by the JD text:
- Make it specific and measurable where possible
- Assign the correct category
- Assign importance based on:
  * critical: explicitly required, deal-breaker if missing
  * high: strongly preferred, mentioned multiple times or emphasized
  * medium: preferred but not essential
  * low: nice-to-have
- Set is_implied to false.

THEN, separately, add a small number of additional requirements for skills/tools that are conventionally expected for this exact role and seniority (based on the job title and responsibilities) even though the posting itself never mentions them — real ATS systems and interviewers often probe for these "obvious for the role" basics even when the JD is silent on them. Real example: a "Data Scientist" posting that never says "Python" or "SQL" almost certainly still expects them. For these:
- Set is_implied to true
- Set importance to "low" (they are inferred, not stated — never mark an inferred item as critical or high)
- Only add ones genuinely standard for this specific role/seniority — do not pad with generic buzzwords, and add at most 5-6 of these.

Do not duplicate requirements. Aim for 8-20 explicitly-stated requirements plus up to 5-6 implied ones.`,
      },
      {
        role: 'user',
        content: `Extract individual requirements from this parsed job description:\n\n${jdSummary}`,
      },
    ],
    response_format: zodResponseFormat(RequirementsListSchema, 'requirements_list'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Failed to extract requirements: no result returned');
  }

  return result;
}
