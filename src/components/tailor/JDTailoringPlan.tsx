'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { TailoredSection } from '@/types/match';
import { ResumeDocumentExperience } from '@/types/export';
import { TailoringPlan } from '@/types/tailoring-plan';

function getContent<T>(sections: TailoredSection[], type: string, fallback: T): T {
  return (sections.find((s) => s.section_type === type)?.content as T) ?? fallback;
}

function setContent(sections: TailoredSection[], type: string, content: unknown): TailoredSection[] {
  const exists = sections.some((s) => s.section_type === type);
  if (exists) {
    return sections.map((s) => (s.section_type === type ? { ...s, content } : s));
  }
  return [...sections, { section_type: type, content, sort_order: sections.length }];
}

interface JDTailoringPlanProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string | null;
  initialSections: TailoredSection[];
}

export default function JDTailoringPlan({ jobId, jobTitle, jobCompany, initialSections }: JDTailoringPlanProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState<TailoringPlan | null>(null);
  const [acceptSummary, setAcceptSummary] = useState(true);
  const [acceptedBullets, setAcceptedBullets] = useState<Set<string>>(new Set());
  const [acceptedSkills, setAcceptedSkills] = useState<Set<number>>(new Set());
  const [acceptedRemovals, setAcceptedRemovals] = useState<Set<number>>(new Set());

  const summary = getContent<{ text: string }>(initialSections, 'summary', { text: '' });
  const experienceContent = getContent<{ experiences: ResumeDocumentExperience[] }>(initialSections, 'experience', { experiences: [] });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/tailor/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sections: initialSections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate tailoring plan');
      const newPlan: TailoringPlan = data.plan;
      setPlan(newPlan);
      setAcceptSummary(!!newPlan.summary_change);
      setAcceptedBullets(new Set(newPlan.bullet_changes.map((c) => `${c.experience_index}-${c.bullet_index}`)));
      setAcceptedSkills(new Set(newPlan.skills_to_add.map((_, i) => i)));
      setAcceptedRemovals(new Set(newPlan.skills_to_remove.map((_, i) => i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate tailoring plan');
    } finally {
      setGenerating(false);
    }
  };

  const toggleBullet = (key: string) => {
    setAcceptedBullets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSkill = (i: number) => {
    setAcceptedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleRemoval = (i: number) => {
    setAcceptedRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const totalSelected =
    (acceptSummary && plan?.summary_change ? 1 : 0) + acceptedBullets.size + acceptedSkills.size + acceptedRemovals.size;

  const handleApply = async () => {
    if (!plan) return;
    setApplying(true);
    try {
      let sections = initialSections;

      if (acceptSummary && plan.summary_change) {
        sections = setContent(sections, 'summary', { text: plan.summary_change.proposed });
      }

      const experiences = experienceContent.experiences.map((e) => ({ ...e, bullets: [...e.bullets] }));
      for (const change of plan.bullet_changes) {
        const key = `${change.experience_index}-${change.bullet_index}`;
        if (acceptedBullets.has(key) && experiences[change.experience_index]) {
          experiences[change.experience_index].bullets[change.bullet_index] = change.proposed;
        }
      }
      sections = setContent(sections, 'experience', { experiences });

      const skillsContent = getContent<{ skills: string[] }>(sections, 'skills', { skills: [] });
      const skillsToRemove = new Set(
        plan.skills_to_remove.filter((_, i) => acceptedRemovals.has(i)).map((s) => s.skill.toLowerCase())
      );
      let mergedSkills = skillsContent.skills.filter((s) => !skillsToRemove.has(s.toLowerCase()));
      plan.skills_to_add.forEach((s, i) => {
        if (acceptedSkills.has(i) && !mergedSkills.some((existing) => existing.toLowerCase() === s.skill.toLowerCase())) {
          mergedSkills = [...mergedSkills, s.skill];
        }
      });
      sections = setContent(sections, 'skills', { skills: mergedSkills });

      const res = await fetch('/api/tailor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sections, name: `${jobTitle} — Tailored` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply changes');

      toast.success('Applied — opening the full editor');
      router.push(`/tailor/${jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to match
        </Link>
        <p className="text-sm text-gray-500 mb-1">{jobCompany || 'Job'}</p>
        <h1 className="text-3xl font-bold">
          JD-Specific <span className="gradient-text">Tailoring</span>
        </h1>
        <p className="text-gray-500 mt-1">Review each proposed change for {jobTitle} before anything touches your resume.</p>
      </div>

      {!plan ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            We&apos;ll propose specific, individually-reviewable changes — reworded bullets, skills to add, a tailored
            summary — each grounded in your real achievements. Nothing is applied until you approve it.
          </p>
          <div className="relative flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Analyzing…' : 'Generate Tailoring Plan'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {plan.summary_change && (
            <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptSummary}
                  onChange={(e) => setAcceptSummary(e.target.checked)}
                  className="mt-1 accent-[#006d42]"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800 mb-2">Tailored Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="bg-black/[0.02] border border-black/[0.04] rounded-lg p-3 text-gray-400 line-through decoration-gray-300">
                      {summary.text || '(no current summary)'}
                    </div>
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-success-dark">
                      {plan.summary_change.proposed}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{plan.summary_change.rationale}</p>
                </div>
              </label>
            </div>
          )}

          {plan.bullet_changes.length > 0 && (
            <div className="animate-fade-up space-y-3" style={{ animationDelay: '0.06s' }}>
              <h2 className="font-semibold text-gray-800">Bullet Rewrites ({plan.bullet_changes.length})</h2>
              {plan.bullet_changes.map((change, i) => {
                const key = `${change.experience_index}-${change.bullet_index}`;
                const exp = experienceContent.experiences[change.experience_index];
                const original = exp?.bullets[change.bullet_index] ?? '';
                return (
                  <div key={i} className="glass rounded-2xl p-5 border border-black/[0.06]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedBullets.has(key)}
                        onChange={() => toggleBullet(key)}
                        className="mt-1 accent-[#006d42]"
                      />
                      <div className="flex-1">
                        {exp && <p className="text-xs text-gray-400 mb-2">{exp.job_title} at {exp.company}</p>}
                        {change.requirement_text && (
                          <p className="text-xs text-gray-400 mb-2">Targets: {change.requirement_text}</p>
                        )}
                        <div className="space-y-2 text-sm">
                          <div className="bg-black/[0.02] border border-black/[0.04] rounded-lg p-3 text-gray-400 line-through decoration-gray-300">
                            {original}
                          </div>
                          <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-success-dark">
                            {change.proposed}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{change.rationale}</p>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {plan.skills_to_add.length > 0 && (
            <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06]" style={{ animationDelay: '0.12s' }}>
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-success" /> Skills to Add ({plan.skills_to_add.length})
              </h2>
              <div className="space-y-2">
                {plan.skills_to_add.map((s, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer bg-black/[0.02] border border-black/[0.04] rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={acceptedSkills.has(i)}
                      onChange={() => toggleSkill(i)}
                      className="mt-1 accent-[#006d42]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.skill}</p>
                      <p className="text-xs text-gray-400">{s.rationale}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {plan.skills_to_remove.length > 0 && (
            <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06]" style={{ animationDelay: '0.16s' }}>
              <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <Minus className="w-4 h-4 text-gray-400" /> Skills to Remove for This Job ({plan.skills_to_remove.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Still on your master resume — just trimmed from this tailored copy since they&apos;re not relevant here.
              </p>
              <div className="space-y-2">
                {plan.skills_to_remove.map((s, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer bg-black/[0.02] border border-black/[0.04] rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={acceptedRemovals.has(i)}
                      onChange={() => toggleRemoval(i)}
                      className="mt-1 accent-[#006d42]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 line-through decoration-gray-400">{s.skill}</p>
                      <p className="text-xs text-gray-400">{s.rationale}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {plan.bullet_changes.length === 0 && plan.skills_to_add.length === 0 && plan.skills_to_remove.length === 0 && !plan.summary_change && (
            <div className="animate-fade-up glass rounded-2xl p-8 border border-black/[0.06] text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
              <p className="text-gray-600">Your resume is already well-aligned for this job — nothing worth changing.</p>
            </div>
          )}

          <div className="flex items-center gap-3 sticky bottom-4 glass rounded-2xl p-3 border border-black/[0.08] shadow-2xl shadow-black/10 w-fit">
            <button
              onClick={handleApply}
              disabled={applying || totalSelected === 0}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Apply {totalSelected > 0 ? `${totalSelected} ` : ''}Selected Change{totalSelected !== 1 ? 's' : ''}
            </button>
            <button onClick={handleGenerate} disabled={generating} className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4">
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
