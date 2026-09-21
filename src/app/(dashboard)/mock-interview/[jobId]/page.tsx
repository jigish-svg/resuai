import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock, Sparkles, Clock, CheckCircle2, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import { getScoreColor, formatDate } from '@/lib/utils';
import MockInterviewSession from '@/components/interview/MockInterviewSession';
import { MockInterviewSession as MockInterviewSessionType } from '@/types/mock-interview';
import { MOCK_INTERVIEW_UNLOCK_SCORE } from '@/components/match/ReadinessJourney';

export default async function MockInterviewJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase.from('jobs').select('id, title, company').eq('id', jobId).eq('user_id', user!.id).single();
  if (!job) notFound();

  const paid = await isPaidUser(supabase, user!.id);

  if (!paid) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-secondary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-secondary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Mock Interview Practice is a paid feature</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to rehearse real interview questions for this job and get instant, honest feedback on every answer.
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
      </div>
    );
  }

  const { data: match } = await supabase
    .from('matches')
    .select('overall_score')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .maybeSingle();

  const matchScore = match?.overall_score ?? 0;

  if (matchScore < MOCK_INTERVIEW_UNLOCK_SCORE) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-secondary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-secondary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Mock Interview unlocks at {MOCK_INTERVIEW_UNLOCK_SCORE}% match score</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            You&apos;re currently at {matchScore}% for this job. Strengthen your match — add certifications, close
            evidence gaps, re-run the analysis — then come back to unlock a live practice interview.
          </p>
          <div className="relative flex justify-center">
            <Link
              href={`/match/${jobId}`}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
            >
              <Target className="w-4 h-4" />
              Go to Match
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from('mock_interview_sessions')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const pastSessions = (sessions ?? []) as MockInterviewSessionType[];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to match
        </Link>
        <p className="text-sm text-gray-500 mb-1">{job.company || 'Job'}</p>
        <h1 className="text-3xl font-bold">
          Mock Interview — <span className="gradient-text">{job.title}</span>
        </h1>
      </div>

      <MockInterviewSession jobId={jobId} jobTitle={job.title} company={job.company} />

      {pastSessions.length > 0 && (
        <div className="animate-fade-up glass rounded-2xl overflow-hidden border border-black/[0.06]" style={{ animationDelay: '0.1s' }}>
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <h2 className="font-semibold">Past Sessions</h2>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {pastSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-sm font-medium">{s.questions.length}-question live interview</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {formatDate(s.created_at)}
                    </p>
                  </div>
                </div>
                {s.overall_feedback && (
                  <div className={`text-sm font-bold ${getScoreColor(s.overall_feedback.readiness_score)}`}>
                    {s.overall_feedback.readiness_score}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
