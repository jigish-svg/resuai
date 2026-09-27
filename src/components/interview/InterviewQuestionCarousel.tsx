'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Briefcase, Building2, Code, Flame, PartyPopper, Users } from 'lucide-react';
import { InterviewQuestion, InterviewQuestionCategory } from '@/types/interview';

const CATEGORY_META: Record<InterviewQuestionCategory, { label: string; icon: React.ReactNode }> = {
  behavioral: { label: 'Behavioral', icon: <Users className="w-4 h-4" /> },
  technical: { label: 'Technical', icon: <Code className="w-4 h-4" /> },
  role_specific: { label: 'Role-Specific', icon: <Briefcase className="w-4 h-4" /> },
  company: { label: 'Company', icon: <Building2 className="w-4 h-4" /> },
};

interface InterviewQuestionCarouselProps {
  questions: InterviewQuestion[];
}

export default function InterviewQuestionCarousel({ questions }: InterviewQuestionCarouselProps) {
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const q = questions[index];
  const isLast = index === total - 1;
  const enteringNewCategory = index === 0 || questions[index - 1].category !== q?.category;
  const gapCount = questions.filter((item) => item.is_gap).length;

  const goBack = () => {
    setFinished(false);
    setIndex((i) => Math.max(0, i - 1));
  };

  const advance = () => {
    setReviewed((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setStreak((s) => s + 1);
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (finished) {
    return (
      <div className="bg-white border border-ink/10 rounded p-12 text-center">
        <div className="w-12 h-12 rounded bg-brand-sea-green text-white flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-ink mb-2">Round complete!</h2>
        <p className="text-sm text-ink-soft mb-1">You&apos;ve reviewed all {total} questions for this role.</p>
        {gapCount > 0 && (
          <p className="text-sm text-brand-brandy mb-8">
            {gapCount} of them were gap areas — work through the skill plan to close them.
          </p>
        )}
        <button
          onClick={() => {
            setIndex(0);
            setFinished(false);
          }}
          className="inline-flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-6 py-2.5 rounded text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Review again from the start
        </button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="space-y-6">
      {/* Progress bar + streak */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex gap-1">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === index ? 'bg-brand-sea-green' : reviewed.has(i) ? 'bg-brand-sea-green/30' : 'bg-ink/10'
              }`}
            />
          ))}
        </div>
        {streak > 1 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-brandy shrink-0">
            <Flame className="w-3.5 h-3.5" /> {streak} in a row
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          Question {index + 1} of {total}
        </p>
        {enteringNewCategory && (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-sea-green">
            New round: {CATEGORY_META[q.category].label}
          </p>
        )}
      </div>

      <div
        key={index}
        className={`bg-white border rounded p-8 ${q.is_gap ? 'border-brand-brandy/30' : 'border-ink/10'}`}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-sea-green bg-brand-sea-green/10 px-2.5 py-1 rounded mb-4">
          {CATEGORY_META[q.category].icon}
          {CATEGORY_META[q.category].label}
        </span>
        <p className="font-semibold text-ink mb-3 text-lg leading-snug">{q.question}</p>
        {q.related_requirement && <p className="text-xs text-ink-muted mb-4">Targets: {q.related_requirement}</p>}
        {q.is_gap && (
          <div className="flex items-start gap-2 bg-brand-brandy/10 text-brand-brandy rounded p-4 mb-4 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">No direct evidence for this — here&apos;s an honest way to answer:</p>
              <p className="opacity-90">{q.gap_strategy}</p>
            </div>
          </div>
        )}
        <div className="bg-brand-bg/50 border border-ink/10 rounded p-4 text-sm text-ink-soft leading-relaxed">
          {q.talking_points}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={goBack}
          disabled={index === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-30 transition-colors px-3 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={advance}
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-6 py-2.5 rounded font-medium text-sm"
        >
          {isLast ? 'Finish — see your recap' : 'Got it — next question'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
