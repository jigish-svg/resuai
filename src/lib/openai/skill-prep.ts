import { openai, MODEL } from './client';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { StudyMaterial } from '@/types/skill-prep';

const StudyMaterialsSchema = z.object({
  materials: z.array(z.object({
    type: z.enum(['video', 'article', 'course', 'docs']),
    title: z.string(),
    description: z.string(),
    url: z.string(),
    estimated_time: z.string().optional(),
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

const STUDY_MATERIALS_INSTRUCTIONS = `You are a sharp, experienced technical mentor helping someone cram for a real job interview happening very soon — tomorrow, or sometime this week. You have a live web search tool. Actually use it to find what's currently out there for this specific skill, then shortlist only the best of it.

Your job is triage, not a reading list. Pick the 3-4 resources — no more — that get someone from "knows nothing about this" to "can speak about it credibly in an interview" the fastest. Prioritize: the official docs' own quickstart/intro page, one well-known free crash course or tutorial (freeCodeCamp, official framework tutorial, a widely-recommended YouTube crash course, etc.), and if relevant one small hands-on exercise. Skip anything niche, paywalled, or slow — this has to be realistically finishable in a few hours, not a multi-week course.

For each resource, give the REAL, SPECIFIC url you found via search (not a generic homepage unless that genuinely is the best entry point, and never an invented or guessed URL — if you can't find a specific enough page, link the most authoritative general page you did find). Also give a realistic "estimated_time" someone would actually need (e.g. "15 min read", "45 min video", "1-2 hr hands-on") so they can judge whether it fits before their interview.

Respond with ONLY strict JSON, no markdown fences, no commentary, matching exactly this shape:
{"materials":[{"type":"video"|"article"|"course"|"docs","title":"...","description":"one honest sentence on why this made the shortlist","url":"...","estimated_time":"..."}]}`;

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function generateStudyMaterials(skill: string, whatItInvolves: string): Promise<StudyMaterial[]> {
  try {
    const response = await openai.responses.create({
      model: MODEL,
      tools: [{ type: 'web_search_preview', search_context_size: 'medium' }],
      instructions: STUDY_MATERIALS_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: `Skill: ${skill}\nWhat it involves: ${whatItInvolves}\n\nSearch for and shortlist the best real study resources now.`,
        },
      ],
    });

    const parsed = StudyMaterialsSchema.parse(extractJson(response.output_text));
    if (parsed.materials.length > 0) {
      return parsed.materials;
    }
  } catch (error) {
    console.error('Study material web search failed, falling back to search links:', error);
  }

  // Fallback: same shape as before this change — a search-query link per resource, no live search.
  const fallback = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a learning-path designer. Given a skill someone needs to genuinely learn before a job interview, suggest 3-4 concrete study resources covering it from fundamentals to being able to speak about it credibly.

For each resource, give a "search_query" — a precise search phrase someone would type to find a great real resource (e.g. "Kubernetes basics tutorial for beginners official"), NOT a URL. Never invent a specific URL. Mix resource types.`,
      },
      { role: 'user', content: `Skill: ${skill}\nWhat it involves: ${whatItInvolves}\n\nSuggest study resources.` },
    ],
    response_format: zodResponseFormat(
      z.object({
        materials: z.array(z.object({
          type: z.enum(['video', 'article', 'course', 'docs']),
          title: z.string(),
          description: z.string(),
          search_query: z.string(),
        })),
      }),
      'study_materials_fallback'
    ),
  });

  const result = fallback.choices[0].message.parsed;
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
