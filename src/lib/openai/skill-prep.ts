import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { StudyMaterial } from '@/types/skill-prep';

const StudyMaterialsSchema = z.object({
  materials: z.array(z.object({
    type: z.enum(['video', 'article', 'course', 'docs']),
    title: z.string(),
    description: z.string(),
    search_query: z.string(),
  })),
});

const QuizSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correct_index: z.number().int().min(0).max(3),
    explanation: z.string(),
  })),
});

export async function generateStudyMaterials(skill: string, whatItInvolves: string): Promise<StudyMaterial[]> {
  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a learning-path designer. Given a skill someone needs to genuinely learn before a job interview, suggest 4-6 concrete study resources covering it from beginner fundamentals to being able to speak about it credibly.

For each resource, give a "search_query" — a precise search phrase someone would type to find a great real resource (e.g. "Kubernetes basics tutorial for beginners official"), NOT a URL. Never invent a specific URL, video ID, or article link — only the search phrase. Mix resource types: official documentation/docs, a well-known free course or tutorial series, a solid explainer video, and a hands-on practice exercise.`,
      },
      {
        role: 'user',
        content: `Skill: ${skill}
What it involves: ${whatItInvolves}

Suggest study resources.`,
      },
    ],
    response_format: zodResponseFormat(StudyMaterialsSchema, 'study_materials'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Study material generation failed: no result returned');
  }

  return result.materials.map((m) => ({
    type: m.type,
    title: m.title,
    description: m.description,
    url:
      m.type === 'video'
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(m.search_query)}`
        : `https://www.google.com/search?q=${encodeURIComponent(m.search_query)}`,
  }));
}

export async function generateSkillQuiz(
  skill: string,
  whatItInvolves: string,
  previousQuestions: string[] = []
): Promise<z.infer<typeof QuizSchema>> {
  const avoidList = previousQuestions.length > 0
    ? `\n\nThe candidate has already been asked these questions in a previous attempt — write 10 DIFFERENT questions that do not repeat or closely rephrase any of these (you may cover a different angle of the same underlying concept, but the question itself must be genuinely new):\n${previousQuestions.map((q) => `- ${q}`).join('\n')}`
    : '';

  const response = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are writing a knowledge-check quiz for someone who just studied a skill in order to be able to discuss it credibly in a job interview.

Write exactly 10 multiple-choice questions that test real conceptual understanding of the skill — not trivia, not memorization of exact syntax, but "would someone who actually learned this fundamentals-level topic know this." Cover a good spread of the skill's core concepts. Each question has exactly 4 options with exactly one correct answer. Include a short explanation of why the correct answer is right (shown after they answer, for learning).`,
      },
      {
        role: 'user',
        content: `Skill: ${skill}
What it involves: ${whatItInvolves}${avoidList}

Write the 10-question quiz now.`,
      },
    ],
    response_format: zodResponseFormat(QuizSchema, 'skill_quiz'),
  });

  const result = response.choices[0].message.parsed;
  if (!result) {
    throw new Error('Quiz generation failed: no result returned');
  }

  return result;
}
