import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import CoverLetterEditor from '@/components/cover-letter/CoverLetterEditor';

export default async function CoverLetterPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase.from('jobs').select('id, title, company, resume_id').eq('id', jobId).eq('user_id', user!.id).single();
  if (!job) notFound();

  const paid = await isPaidUser(supabase, user!.id);

  const resume = await getResumeForJob(supabase, user!.id, job.resume_id);
  const { data: coverLetter } = await supabase
    .from('cover_letters')
    .select('content')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to match
        </Link>
        <p className="text-sm text-gray-500 mb-1">{job.company || 'Job'}</p>
        <h1 className="text-3xl font-bold">
          Cover Letter — <span className="gradient-text">{job.title}</span>
        </h1>
      </div>

      {!paid ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-secondary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-secondary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Cover letters are a paid feature</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to generate evidence-based, job-specific cover letters — built from your real achievements, same as
            everything else here.
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
      ) : (
        <CoverLetterEditor
          jobId={jobId}
          candidateName={resume?.candidate_name || 'resume'}
          initialContent={coverLetter?.content ?? ''}
        />
      )}
    </div>
  );
}
