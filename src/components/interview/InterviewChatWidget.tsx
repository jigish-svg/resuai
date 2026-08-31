'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

interface InterviewChatWidgetProps {
  jobId: string;
  jobTitle: string;
  company: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const NUDGE_DELAY_MS = 5000;
const NUDGE_CYCLE_MS = 22000;
const NUDGE_VISIBLE_MS = 9000;

export default function InterviewChatWidget({ jobId, jobTitle, company }: InterviewChatWidgetProps) {
  const companyName = company || 'this company';

  const suggestions = [
    `Want to know more about ${companyName}?`,
    `Curious about ${companyName}'s recent projects or focus areas?`,
    `Want tips on what ${companyName} looks for in candidates?`,
    `Need help figuring out why you want to work at ${companyName}?`,
    `Want a quick refresher on interview basics for a ${jobTitle} role?`,
  ];

  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestionCursor = useRef(0);

  // Ambient nudge bubbles, only until the user discovers the chat for the first time
  useEffect(() => {
    if (hasOpenedOnce) return;

    let hideTimer: ReturnType<typeof setTimeout>;
    const showNext = () => {
      setNudgeIndex(suggestionCursor.current % suggestions.length);
      suggestionCursor.current += 1;
      hideTimer = setTimeout(() => setNudgeIndex(null), NUDGE_VISIBLE_MS);
    };

    const firstTimer = setTimeout(showNext, NUDGE_DELAY_MS);
    const interval = setInterval(showNext, NUDGE_CYCLE_MS);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOpenedOnce]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const openChat = () => {
    setOpen(true);
    setHasOpenedOnce(true);
    setNudgeIndex(null);
  };

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/interview-prep/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, message: text, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get a response');
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: err instanceof Error ? `Sorry — ${err.message}` : "Sorry, something went wrong. Try again?" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleNudgeClick = () => {
    const question = nudgeIndex !== null ? suggestions[nudgeIndex] : null;
    openChat();
    if (question) send(question);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {!open && nudgeIndex !== null && (
        <button
          onClick={handleNudgeClick}
          className="animate-fade-up glass max-w-64 text-left rounded-2xl rounded-br-sm p-3.5 border border-brand-green/20 shadow-xl shadow-black/10 text-sm text-gray-700 hover:border-brand-green/40 transition-colors"
        >
          <span className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
            {suggestions[nudgeIndex]}
          </span>
        </button>
      )}

      {open && (
        <div className="w-80 sm:w-96 h-[28rem] glass rounded-2xl border border-black/[0.08] shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-gradient-to-r from-brand-green to-brand-green-dark">
            <div className="flex items-center gap-2 text-white">
              <MessageCircle className="w-4 h-4" />
              <p className="font-semibold text-sm">Interview Coach</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500 bg-black/[0.03] rounded-xl p-3 leading-relaxed">
                Hi! I&apos;m here to help you get ready for your {jobTitle}
                {company ? ` interview at ${company}` : ' interview'}. Ask me anything — about the company, the role,
                how to answer tricky questions, or what to ask them back.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-br-sm'
                      : 'bg-black/[0.04] text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-black/[0.04] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 p-3 border-t border-black/[0.06]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={sending}
              className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-green/60 focus:bg-white transition-colors disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-brand-green to-brand-green-dark disabled:opacity-40 flex items-center justify-center text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {!open && (
        <button
          onClick={openChat}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark shadow-xl shadow-brand-green/30 flex items-center justify-center text-white hover:shadow-brand-green/50 transition-shadow"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
