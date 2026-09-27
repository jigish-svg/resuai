'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  CheckCircle2,
  XCircle,
  PartyPopper,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { SkillPrepPlan, QuizResultItem } from '@/types/skill-prep';
import { apiErrorMessage } from '@/lib/api/client';

interface SkillPrepJourneyProps {
  jobId: string;
  skill: string;
  whatItInvolves: string;
  initialPlan?: SkillPrepPlan | null;
}

const MATERIAL_ICONS = {
  video: Video,
  article: FileText,
  course: GraduationCap,
  docs: BookOpen,
};

interface SubmitResponse {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: QuizResultItem[];
}

export default function SkillPrepJourney({ jobId, skill, whatItInvolves, initialPlan = null }: SkillPrepJourneyProps) {
  const [plan, setPlan] = useState<SkillPrepPlan | null>(initialPlan);
  const [starting, setStarting] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<number[]>(
    initialPlan?.status === 'quiz' ? new Array(initialPlan.quiz_questions.length).fill(-1) : []
  );
  const [quizResult, setQuizResult] = useState<SubmitResponse | null>(null);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/skill-prep/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, skill, whatItInvolves }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to build your learning plan'));
      setPlan(data.plan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build your learning plan');
    } finally {
      setStarting(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!plan) return;
    setGeneratingQuiz(true);
    try {
      const res = await fetch('/api/skill-prep/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to generate the quiz'));
      setPlan(data.plan);
      setAnswers(new Array(data.plan.quiz_questions.length).fill(-1));
      setQuizResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate the quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!plan) return;
    if (answers.some((a) => a === -1)) {
      toast.error('Answer every question before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/skill-prep/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to submit the quiz'));
      setPlan(data.plan);
      setQuizResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit the quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (qIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optionIndex;
      return next;
    });
  };

  // Step 1: no plan started yet
  if (!plan) {
    return (
      <div className="bg-white border border-brand-brandy/20 rounded p-5">
        <p className="font-semibold text-ink mb-1">{skill}</p>
        <p className="text-sm text-ink-soft mb-5">{whatItInvolves}</p>
        <button
          onClick={handleStart}
          disabled={starting}
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white disabled:opacity-60 transition-colors px-4 py-2 rounded text-sm font-medium"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {starting ? 'Building your plan…' : 'Build my learning plan'}
        </button>
      </div>
    );
  }

  // Step 2: studying — show materials
  if (plan.status === 'studying') {
    return (
      <div className="bg-white border border-brand-brandy/20 rounded p-5">
        <p className="font-semibold text-ink mb-1">{skill}</p>
        <p className="text-sm text-ink-soft mb-4">{whatItInvolves}</p>

        <p className="text-xs text-ink-muted mb-3">
          A short, real-world-checked shortlist — not a reading list.
        </p>
        <div className="space-y-2 mb-5">
          {plan.study_materials.map((m, i) => {
            const Icon = MATERIAL_ICONS[m.type];
            return (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-brand-bg/50 hover:bg-ink/5 border border-ink/10 rounded p-3 transition-colors group"
              >
                <span className="w-8 h-8 rounded bg-brand-sea-green/10 text-brand-sea-green flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                    {m.title}
                    <ExternalLink className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">{m.description}</p>
                  {m.estimated_time && (
                    <span className="inline-block mt-1.5 text-[10px] font-medium text-brand-brandy bg-brand-brandy/10 px-1.5 py-0.5 rounded">
                      {m.estimated_time}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={generatingQuiz}
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white disabled:opacity-60 transition-colors px-4 py-2 rounded text-sm font-medium"
        >
          {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {generatingQuiz ? 'Preparing quiz…' : "I've completed this — test me"}
        </button>
      </div>
    );
  }

  // Step 3: quiz
  if (plan.status === 'quiz') {
    const allAnswered = answers.length > 0 && answers.every((a) => a !== -1);
    return (
      <div className="bg-white border border-brand-brandy/20 rounded p-5">
        <p className="font-semibold text-ink mb-1">{skill} — Knowledge Check</p>
        <p className="text-sm text-ink-soft mb-5">
          Answer all {plan.quiz_questions.length} questions honestly.
        </p>
        <div className="space-y-4">
          {plan.quiz_questions.map((q, qi) => (
            <div key={qi} className="bg-brand-bg/50 border border-ink/10 rounded p-4">
              <p className="text-sm font-medium text-ink mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-3 text-sm text-ink-soft cursor-pointer hover:text-ink">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswer(qi, oi)}
                      className="accent-brand-sea-green"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmitQuiz}
          disabled={submitting || !allAnswered}
          className="mt-5 flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white disabled:opacity-60 transition-colors px-4 py-2 rounded text-sm font-medium"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Submit Quiz
        </button>
      </div>
    );
  }

  // Step 4a: failed
  if (plan.status === 'failed') {
    return (
      <div className="bg-white border border-brand-brandy/20 rounded p-5">
        <p className="font-semibold text-ink mb-1">{skill}</p>
        <p className="text-sm text-ink-soft mb-5">
          Scored {plan.quiz_score}% — not quite there yet. Review what you missed and try again.
        </p>
        {quizResult && (
          <div className="space-y-3 mb-5">
            {quizResult.results
              .filter((r) => r.selected_index !== r.correct_index)
              .map((r, i) => (
                <div key={i} className="bg-brand-brandy/5 border border-brand-brandy/20 rounded p-4 text-sm">
                  <p className="font-medium text-ink mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-brand-brandy shrink-0" /> {r.question}
                  </p>
                  <p className="text-ink-soft">
                    Correct answer: <span className="font-medium text-ink">{r.options[r.correct_index]}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-2">{r.explanation}</p>
                </div>
              ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setPlan({ ...plan, status: 'studying' })}
            className="flex items-center gap-2 border border-ink/10 hover:bg-ink/5 transition-colors px-4 py-2 rounded text-sm font-medium text-ink"
          >
            <BookOpen className="w-4 h-4" /> Review materials
          </button>
          <button
            onClick={handleGenerateQuiz}
            disabled={generatingQuiz}
            className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white disabled:opacity-60 transition-colors px-4 py-2 rounded text-sm font-medium"
          >
            {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Retry Quiz
          </button>
        </div>
      </div>
    );
  }

  // Step 4b: passed
  return (
    <div className="bg-brand-sea-green/5 border border-brand-sea-green/20 rounded p-6 text-center">
      <PartyPopper className="w-8 h-8 text-brand-sea-green mx-auto mb-3" />
      <p className="font-semibold text-ink mb-1">Practice complete</p>
      <p className="text-sm text-ink-soft">
        You scored {plan.quiz_score}% on the {skill} practice quiz. This is practice only and does not change your fit score.
      </p>
    </div>
  );
}
