'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How do I improve my fit score?',
  'What is Truth Guard?',
  'How does JD tailoring work?',
  'How do I add a job from LinkedIn?',
  'What does the match score mean?',
];

const CANNED: Record<string, string> = {
  'fit score': 'Your fit score is calculated by matching your documented achievements against each job requirement across 4 dimensions: hard skills, soft skills, experience, and role-specific criteria. A score above 70% is a strong match.',
  'truth guard': 'Truth Guard is our AI integrity layer. It checks every suggested resume change against your actual documented experience and refuses to add anything fabricated. It keeps your application honest.',
  'jd tailoring': 'JD Tailoring shows your current resume side-by-side with AI suggestions for each job. You approve or reject each change. Nothing is applied without your review.',
  'linkedin': 'Install the GetJobFit Chrome Extension (extension/ folder). When you open a job on LinkedIn, click the extension icon → "Send to GetJobFit workspace". The JD is auto-fetched and pre-filled.',
  'match score': 'The match score (0–100%) shows how well your resume evidence covers the job requirements. It is broken into sub-scores by dimension so you can see exactly where you are strong or weak.',
  'cover letter': 'Go to Cover Letter in the sidebar. Pick a template for your domain, select a job you\'ve analysed, and GetJobFit generates a letter grounded in your actual match evidence — not generic filler.',
  'resume template': 'Go to Resume & Docs → New Resume. You can pick from multiple resume templates (ATS, two-column, minimal, etc.) and import your existing resume or build from scratch.',
  'interview': 'Go to Interview Prep in the sidebar. After running a match, you get role-specific questions, gap strategies, and a skill-gap learning plan with quizzes.',
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, answer] of Object.entries(CANNED)) {
    if (lower.includes(key)) return answer;
  }
  return "I'm a GetJobFit help assistant. I can answer questions about fit scores, resume tailoring, cover letters, interview prep, the Chrome extension, and how the platform works. Try one of the suggestions above!";
}

export default function HelpChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your GetJobFit helper. Ask me anything about how the platform works.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    // Simulate a brief pause then respond
    await new Promise((r) => setTimeout(r, 600));
    const reply = getResponse(userMsg);
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 shadow-xl rounded-xl overflow-hidden border border-ink/10 bg-white flex flex-col"
          style={{ maxHeight: '480px' }}>
          {/* Header */}
          <div className="bg-brand-sea-green text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold leading-none">GetJobFit Help</p>
                <p className="text-[10px] text-white/70 mt-0.5">Ask me anything</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-brand-bg/30">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-sea-green text-white rounded-br-sm'
                      : 'bg-white border border-ink/10 text-ink rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-ink/10 rounded-xl px-3 py-2">
                  <Loader2 className="w-4 h-4 text-ink-muted animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap shrink-0 bg-white border-t border-ink/5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] bg-brand-bg border border-ink/10 text-ink-soft hover:text-ink hover:border-brand-sea-green/40 px-2 py-1 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 px-3 py-3 border-t border-ink/10 bg-white shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 text-sm bg-brand-bg/50 border border-ink/10 rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand-sea-green transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-brand-sea-green hover:bg-opacity-90 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Bubble toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Help chat"
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-brand-sea-green hover:bg-opacity-90 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
}
