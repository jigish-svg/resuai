import { openai, MODEL } from './client';
import { ParsedResume } from '@/types/resume';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const CandidateSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

const AchievementSchema = z.object({
  text: z.string(),
  skills: z.array(z.string()),
  metrics: z.array(z.string()),
});

const ExperienceSchema = z.object({
  company: z.string(),
  job_title: z.string(),
  start_date: z.string(),
  end_date: z.string().optional(),
  is_current: z.boolean(),
  location: z.string().optional(),
  achievements: z.array(AchievementSchema),
});

const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  graduation_date: z.string().optional(),
  gpa: z.string().optional(),
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  expiry: z.string().optional(),
});

const ParsedResumeSchema = z.object({
  candidate: CandidateSchema,
  summary: z.string().optional(),
  experience: z.array(ExperienceSchema),
  skills: z.array(z.string()),
  education: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),
});

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert resume parser. Extract structured data from the resume text provided.
        
For achievements, extract:
- The exact achievement text (keep it verbatim where possible)
- Skills demonstrated in the achievement
- Any metrics/numbers mentioned (percentages, dollar amounts, counts, time savings, etc.)

Be precise and accurate. Do not invent or embellish any information. Only extract what is explicitly stated.`,
      },
      {
        role: 'user',
        content: `Parse this resume:\n\n${resumeText}`,
      },
    ],
    response_format: zodResponseFormat(ParsedResumeSchema, 'parsed_resume'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Failed to parse resume: no result returned');
  }

  return {
    candidate: result.candidate,
    summary: result.summary,
    experience: result.experience.map((exp) => ({
      company: exp.company,
      job_title: exp.job_title,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_current: exp.is_current,
      location: exp.location,
      achievements: exp.achievements.map((a) => ({
        text: a.text,
        skills: a.skills,
        metrics: a.metrics,
      })),
    })),
    skills: result.skills,
    education: result.education,
    certifications: result.certifications,
  };
}
