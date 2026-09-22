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
      <div className="glass rounded-2xl p-8 border border-black/[0.06] text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
          <PartyPopper className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Round complete!</h2>
        <p className="text-gray-600 mb-1">You&apos;ve reviewed all {total} questions for this role.</p>
        {gapCount > 0 && (
          <p className="text-sm text-brand-tertiary-dark mb-6">
            {gapCount} of them were gap areas — work through the skill plan on the right to close them.
          </p>
        )}
        <button
          onClick={() => {
            setIndex(0);
            setFinished(false);
          }}
          className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Review again from the start
        </button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="space-y-4">
      {/* Progress bar + streak */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-1">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === index ? 'bg-brand-primary' : reviewed.has(i) ? 'bg-brand-primary/40' : 'bg-black/[0.08]'
              }`}
            />
          ))}
        </div>
        {streak > 1 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-tertiary-dark shrink-0">
            <Flame className="w-3.5 h-3.5" /> {streak} in a row
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Question {index + 1} of {total}
      </p>

      {enteringNewCategory && (
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          New round: {CATEGORY_META[q.category].label} Questions
        </p>
      )}

      <div
        key={index}
        className={`animate-fade-up glass rounded-2xl p-6 border ${q.is_gap ? 'border-brand-tertiary/40' : 'border-black/[0.06]'}`}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full mb-3">
          {CATEGORY_META[q.category].icon}
          {CATEGORY_META[q.category].label}
        </span>
        <p className="font-medium text-gray-900 mb-2 text-lg leading-snug">{q.question}</p>
        {q.related_requirement && <p className="text-xs text-gray-400 mb-3">Targets: {q.related_requirement}</p>}
        {q.is_gap && (
          <div className="flex items-start gap-2 bg-brand-tertiary-light text-amber-800 rounded-lg p-3 mb-3 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">No direct evidence for this — here&apos;s an honest way to answer:</p>
              <p>{q.gap_strategy}</p>
            </div>
          </div>
        )}
        <div className="bg-black/[0.02] border border-black/[0.04] rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
          {q.talking_points}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={index === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={advance}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          {isLast ? 'Finish — see your recap' : 'Got it — next question'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
