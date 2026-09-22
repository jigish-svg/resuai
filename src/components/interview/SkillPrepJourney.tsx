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
  Plus,
  ExternalLink,
} from 'lucide-react';
import { SkillPrepPlan, QuizResultItem } from '@/types/skill-prep';

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
  const [addingToResume, setAddingToResume] = useState(false);
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
      if (!res.ok) throw new Error(data.error || 'Failed to build your learning plan');
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
      if (!res.ok) throw new Error(data.error || 'Failed to generate the quiz');
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
      if (!res.ok) throw new Error(data.error || 'Failed to submit the quiz');
      setPlan(data.plan);
      setQuizResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit the quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToResume = async () => {
    if (!plan) return;
    setAddingToResume(true);
    try {
      const res = await fetch('/api/resume/add-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: plan.skill, planId: plan.id, jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add skill to resume');
      setPlan({ ...plan, status: 'added_to_resume' });
      toast.success(data.alreadyPresent ? `${plan.skill} is already on your resume` : `Added "${plan.skill}" to your resume`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add skill to resume');
    } finally {
      setAddingToResume(false);
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
      <div className="glass rounded-2xl p-5 border border-brand-tertiary/40">
        <p className="font-semibold text-gray-900 mb-1">{skill}</p>
        <p className="text-sm text-gray-600 mb-4">{whatItInvolves}</p>
        <button
          onClick={handleStart}
          disabled={starting}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {starting ? 'Building your plan…' : 'Build my learning plan for this skill'}
        </button>
      </div>
    );
  }

  // Step 2: studying — show materials
  if (plan.status === 'studying') {
    return (
      <div className="glass rounded-2xl p-5 border border-brand-tertiary/40">
        <p className="font-semibold text-gray-900 mb-1">{skill}</p>
        <p className="text-sm text-gray-600 mb-4">{whatItInvolves}</p>

        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Study these before moving on</p>
        <div className="space-y-2 mb-4">
          {plan.study_materials.map((m, i) => {
            const Icon = MATERIAL_ICONS[m.type];
            return (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-black/[0.02] hover:bg-black/[0.04] border border-black/[0.04] rounded-lg p-3 transition-colors group"
              >
                <span className="w-8 h-8 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    {m.title}
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                </div>
              </a>
            );
          })}
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={generatingQuiz}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {generatingQuiz ? 'Preparing quiz…' : "I've completed this — test my knowledge"}
        </button>
      </div>
    );
  }

  // Step 3: quiz
  if (plan.status === 'quiz') {
    const allAnswered = answers.length > 0 && answers.every((a) => a !== -1);
    return (
      <div className="glass rounded-2xl p-5 border border-brand-tertiary/40">
        <p className="font-semibold text-gray-900 mb-1">{skill} — Knowledge Check</p>
        <p className="text-sm text-gray-600 mb-4">
          Answer all {plan.quiz_questions.length} questions honestly — this is to confirm you&apos;ve actually learned it, not to trick you.
        </p>
        <div className="space-y-4">
          {plan.quiz_questions.map((q, qi) => (
            <div key={qi} className="bg-black/[0.02] border border-black/[0.04] rounded-lg p-3">
              <p className="text-sm font-medium text-gray-800 mb-2">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswer(qi, oi)}
                      className="accent-[#006d42]"
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
          className="mt-4 flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
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
      <div className="glass rounded-2xl p-5 border border-brand-tertiary/40">
        <p className="font-semibold text-gray-900 mb-1">{skill}</p>
        <p className="text-sm text-gray-600 mb-4">
          Scored {plan.quiz_score}% — not quite there yet. Review what you missed, study a bit more, then try again.
        </p>
        {quizResult && (
          <div className="space-y-2 mb-4">
            {quizResult.results
              .filter((r) => r.selected_index !== r.correct_index)
              .map((r, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-800 mb-1 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" /> {r.question}
                  </p>
                  <p className="text-gray-600">
                    Correct answer: <span className="font-medium">{r.options[r.correct_index]}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{r.explanation}</p>
                </div>
              ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlan({ ...plan, status: 'studying' })}
            className="flex items-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700"
          >
            <BookOpen className="w-4 h-4" /> Review materials
          </button>
          <button
            onClick={handleGenerateQuiz}
            disabled={generatingQuiz}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
          >
            {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Retry Quiz
          </button>
        </div>
      </div>
    );
  }

  // Step 4b: passed
  if (plan.status === 'passed') {
    return (
      <div className="glass rounded-2xl p-6 border border-success/30 text-center relative overflow-hidden">
        <PartyPopper className="w-9 h-9 text-success mx-auto mb-3 relative" />
        <p className="font-bold text-lg text-gray-900 relative">Congratulations!</p>
        <p className="text-sm text-gray-600 mb-4 relative">
          You scored {plan.quiz_score}% on {skill} — you&apos;re ready to talk about this in the interview.
        </p>
        <button
          onClick={handleAddToResume}
          disabled={addingToResume}
          className="relative flex items-center gap-2 mx-auto bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg"
        >
          {addingToResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add these skills to my resume
        </button>
      </div>
    );
  }

  // Step 5: already added
  return (
    <div className="glass rounded-2xl p-5 border border-black/[0.06] flex items-center gap-3">
      <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
      <div>
        <p className="font-medium text-gray-900">{skill}</p>
        <p className="text-sm text-gray-500">Learned, verified, and added to your resume.</p>
      </div>
    </div>
  );
}
