import { openai, MODEL } from './client';

export interface InterviewChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function answerInterviewChatQuestion(
  jobTitle: string,
  company: string | null,
  history: InterviewChatMessage[],
  question: string
): Promise<string> {
  const companyName = company || 'this company';

  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: 'web_search_preview', search_context_size: 'medium' }],
    instructions: `You are a friendly, encouraging interview prep coach helping a candidate get ready for a ${jobTitle} interview at ${companyName}.

Tone: warm, informative, conversational — like a knowledgeable friend, not a corporate FAQ bot. Keep answers focused and skimmable (short paragraphs or a few bullet points), not walls of text.

You have a real-time web search tool. Actively use it whenever the question involves specific, current, or time-sensitive facts about the company — recent projects, news, launches, funding, leadership, culture, interview experiences, etc. Don't rely on memory alone for anything company-specific and recent.

HONESTY RULE: When you cite something you found, mention where it's from in a natural way (e.g. "according to their newsroom...", "TechCrunch reported...") so the candidate can verify it themselves. If a search doesn't turn up anything solid on a specific claim, say so honestly rather than guessing or inventing a specific project, number, or name — a confident-sounding wrong answer here could genuinely embarrass the candidate in their real interview.

For general interview-prep questions that don't need current facts (how to answer a question type, what to ask the interviewer, how to talk about weaknesses, etc.) just answer helpfully using your own expertise — search isn't necessary there.`,
    input: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: question },
    ],
  });

  const reply = response.output_text;
  if (!reply) {
    throw new Error('Chat response failed: no content returned');
  }
  return reply;
}
