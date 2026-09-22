import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircleQuestion, HelpCircle, AlertTriangle, Briefcase, Users, Code, Building2, GraduationCap, Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import GeneratePrepButton from '@/components/interview/GeneratePrepButton';
import SkillPrepJourney from '@/components/interview/SkillPrepJourney';
import InterviewChatWidget from '@/components/interview/InterviewChatWidget';
import { InterviewQuestion, InterviewQuestionCategory, SkillGapPrep } from '@/types/interview';
import { SkillPrepPlan } from '@/types/skill-prep';

const CATEGORY_META: Record<InterviewQuestionCategory, { label: string; icon: React.ReactNode }> = {
  behavioral: { label: 'Behavioral', icon: <Users className="w-4 h-4" /> },
  technical: { label: 'Technical', icon: <Code className="w-4 h-4" /> },
  role_specific: { label: 'Role-Specific', icon: <Briefcase className="w-4 h-4" /> },
  company: { label: 'Company', icon: <Building2 className="w-4 h-4" /> },
};

export default async function InterviewPrepPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase.from('jobs').select('id, title, company').eq('id', jobId).eq('user_id', user!.id).single();
  if (!job) notFound();

  const paid = await isPaidUser(supabase, user!.id);

  const { data: prep } = await supabase
    .from('interview_prep')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .maybeSingle();

  const questions = (prep?.questions ?? []) as InterviewQuestion[];
  const questionsToAsk = (prep?.questions_to_ask ?? []) as string[];
  const skillGaps = (prep?.skill_gaps ?? []) as SkillGapPrep[];

  const { data: existingPlans } = await supabase
    .from('skill_prep_plans')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user!.id);
  const plansBySkill = new Map((existingPlans ?? []).map((p) => [p.skill, p as SkillPrepPlan]));

  const grouped = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    (acc[q.category] ??= []).push(q);
    return acc;
  }, {});

  const gapCount = questions.filter((q) => q.is_gap).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to match
        </Link>
        <p className="text-sm text-gray-500 mb-1">{job.company || 'Job'}</p>
        <h1 className="text-3xl font-bold">
          Interview Prep — <span className="gradient-text">{job.title}</span>
        </h1>
      </div>

      {!paid ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-tertiary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-tertiary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Interview Prep is a paid feature</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to unlock likely interview questions, a full skill-gap learning journey with quizzes, and smart
            questions to ask the interviewer.
          </p>
          <div className="relative flex justify-center">
            <Link
              href="/account/upgrade"
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Paid
            </Link>
          </div>
        </div>
      ) : !prep ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <MessageCircleQuestion className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Generate likely interview questions and answer ideas built entirely from your real achievements — including
            honest ways to handle topics you don&apos;t have direct experience in.
          </p>
          <div className="relative flex justify-center">
            <GeneratePrepButton jobId={jobId} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between animate-fade-up">
            <p className="text-sm text-gray-500">
              {questions.length} questions
              {gapCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-700 bg-brand-tertiary-light px-2 py-0.5 rounded-md text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" /> {gapCount} gap{gapCount !== 1 ? 's' : ''} to prep for
                </span>
              )}
            </p>
            <GeneratePrepButton jobId={jobId} label="Regenerate" />
          </div>

          {(Object.keys(CATEGORY_META) as InterviewQuestionCategory[]).map((cat, i) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="animate-fade-up space-y-3" style={{ animationDelay: `${0.06 + i * 0.05}s` }}>
                <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                  <span className="w-7 h-7 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    {CATEGORY_META[cat].icon}
                  </span>
                  {CATEGORY_META[cat].label}
                </h2>
                <div className="space-y-3">
                  {items.map((q, idx) => (
                    <div
                      key={idx}
                      className={`glass rounded-2xl p-5 border ${q.is_gap ? 'border-brand-tertiary/40' : 'border-black/[0.06]'}`}
                    >
                      <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                      {q.related_requirement && (
                        <p className="text-xs text-gray-400 mb-3">Targets: {q.related_requirement}</p>
                      )}
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
                  ))}
                </div>
              </div>
            );
          })}

          {skillGaps.length > 0 && (
            <div className="animate-fade-up space-y-3" style={{ animationDelay: '0.26s' }}>
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <span className="w-7 h-7 rounded-md bg-brand-tertiary/20 text-amber-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </span>
                Skill Gap Action Plan
              </h2>
              <p className="text-sm text-gray-500">
                For each one: build a study plan, work through it, then pass a 10-question knowledge check before it
                goes anywhere near your resume.
              </p>
              <div className="space-y-3">
                {skillGaps.map((gap, i) => (
                  <SkillPrepJourney
                    key={i}
                    jobId={jobId}
                    skill={gap.keyword}
                    whatItInvolves={gap.what_it_involves}
                    initialPlan={plansBySkill.get(gap.keyword) ?? null}
                  />
                ))}
              </div>
            </div>
          )}

          {questionsToAsk.length > 0 && (
            <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06]" style={{ animationDelay: '0.3s' }}>
              <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-4">
                <span className="w-7 h-7 rounded-md bg-brand-tertiary/20 text-amber-700 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </span>
                Questions to Ask Them
              </h2>
              <ul className="space-y-2">
                {questionsToAsk.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-brand-primary mt-0.5">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {paid && <InterviewChatWidget jobId={jobId} jobTitle={job.title} company={job.company} />}
    </div>
  );
}
