import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircleQuestion, HelpCircle, AlertTriangle, GraduationCap, Lock, Sparkles, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import GeneratePrepButton from '@/components/interview/GeneratePrepButton';
import SkillPrepJourney from '@/components/interview/SkillPrepJourney';
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div>
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to match
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">{job.company || 'Unknown Company'}</p>
        <h1 className="text-2xl font-bold text-ink mb-1">
          Interview Prep
        </h1>
        <p className="text-sm text-ink-soft">For {job.title}</p>
      </div>

      {!paid ? (
        <div className="border border-ink/10 bg-white rounded p-16 text-center">
          <div className="w-12 h-12 rounded bg-brand-cream flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-ink" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-ink">Interview Prep is a paid feature</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            Upgrade to unlock likely interview questions, a full skill-gap learning journey with quizzes, and smart questions to ask the interviewer.
          </p>
          <div className="flex justify-center">
            <Link
              href="/account/upgrade"
              className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-6 py-2.5 rounded text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Paid
            </Link>
          </div>
        </div>
      ) : !prep ? (
        <div className="border border-ink/10 bg-white rounded p-16 text-center">
          <div className="w-12 h-12 rounded bg-brand-cream text-ink flex items-center justify-center mx-auto mb-4">
            <MessageCircleQuestion className="w-5 h-5" />
          </div>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            Generate likely interview questions and answer ideas built entirely from your real achievements — including
            honest ways to handle topics you don&apos;t have direct experience in.
          </p>
          <div className="flex justify-center">
            <GeneratePrepButton jobId={jobId} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pb-4 border-b border-ink/10">
            <div className="text-sm text-ink-soft flex items-center gap-3">
              <span>{questions.length} questions</span>
              {gapCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-brand-brandy bg-brand-brandy/10 px-2 py-1 rounded text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> {gapCount} gap{gapCount !== 1 ? 's' : ''} to prep for
                </span>
              )}
            </div>
            <GeneratePrepButton jobId={jobId} label="Regenerate" />
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div>
              <InterviewQuestionCarousel questions={orderedQuestions} />
            </div>

            <div className="space-y-6 lg:sticky lg:top-8">
              {skillGaps.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 bg-brand-brandy/10 rounded p-3">
                    <Trophy className="w-4 h-4 text-brand-brandy shrink-0" />
                    <p className="text-sm font-semibold text-brand-brandy">
                      {masteredCount}/{skillGaps.length} skills mastered
                    </p>
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold text-ink text-sm mb-1">
                      <GraduationCap className="w-4 h-4 text-brand-sea-green" />
                      Skill Gap Action Plan
                    </h2>
                    <p className="text-xs text-ink-soft">
                      Learn it, prove it with a quick quiz, then add it to your resume.
                    </p>
                  </div>
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
                <div className="bg-white rounded p-5 border border-ink/10">
                  <h2 className="flex items-center gap-2 font-semibold text-ink text-sm mb-4">
                    <HelpCircle className="w-4 h-4 text-brand-sea-green" />
                    Questions to Ask Them
                  </h2>
                  <ul className="space-y-3">
                    {questionsToAsk.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-soft leading-snug">
                        <span className="text-brand-sea-green mt-1">•</span>
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
    </div>
  );
}
