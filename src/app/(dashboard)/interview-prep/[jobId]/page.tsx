import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircleQuestion, HelpCircle, AlertTriangle, GraduationCap, Lock, Sparkles, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import GeneratePrepButton from '@/components/interview/GeneratePrepButton';
import SkillPrepJourney from '@/components/interview/SkillPrepJourney';
import InterviewChatWidget from '@/components/interview/InterviewChatWidget';
import InterviewQuestionCarousel from '@/components/interview/InterviewQuestionCarousel';
import { InterviewQuestion, SkillGapPrep } from '@/types/interview';
import { SkillPrepPlan } from '@/types/skill-prep';

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

  const categoryOrder = ['behavioral', 'technical', 'role_specific', 'company'];
  const orderedQuestions = [...questions].sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  );

  const gapCount = questions.filter((q) => q.is_gap).length;
  const masteredCount = skillGaps.filter((g) => {
    const status = plansBySkill.get(g.keyword)?.status;
    return status === 'passed' || status === 'added_to_resume';
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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

          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="animate-fade-up" style={{ animationDelay: '0.06s' }}>
              <InterviewQuestionCarousel questions={orderedQuestions} />
            </div>

            <div className="space-y-5 lg:sticky lg:top-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              {skillGaps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-brand-tertiary-light rounded-xl px-3 py-2">
                    <Trophy className="w-4 h-4 text-brand-tertiary-dark shrink-0" />
                    <p className="text-sm font-semibold text-brand-tertiary-dark">
                      {masteredCount}/{skillGaps.length} skills mastered
                    </p>
                  </div>
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                    <GraduationCap className="w-4 h-4 text-brand-tertiary-dark" />
                    Skill Gap Action Plan
                  </h2>
                  <p className="text-xs text-gray-500">
                    Learn it, prove it with a quick quiz, then add it to your resume.
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
                <div className="glass rounded-2xl p-4 border border-black/[0.06]">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 text-sm mb-3">
                    <HelpCircle className="w-4 h-4 text-brand-tertiary-dark" />
                    Questions to Ask Them
                  </h2>
                  <ul className="space-y-2">
                    {questionsToAsk.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="text-brand-primary mt-0.5">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {paid && <InterviewChatWidget jobId={jobId} jobTitle={job.title} company={job.company} />}
    </div>
  );
}
