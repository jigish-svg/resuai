import Link from 'next/link';
import { MessageCircleQuestion, Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import JobPickerHub from '@/components/jobs/JobPickerHub';

export default async function InterviewPrepHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const paid = await isPaidUser(supabase, user!.id);

  if (!paid) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-tertiary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-tertiary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Interview Prep is a paid feature</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to unlock likely interview questions, a full skill-gap learning journey with quizzes, and smart
            questions to ask the interviewer — for every job you&apos;re tracking.
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

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <JobPickerHub
      title="Interview Prep"
      description="Pick a job to build likely questions, a skill-gap learning plan, and questions to ask."
      icon={<MessageCircleQuestion className="w-4.5 h-4.5" />}
      jobs={jobs ?? []}
      hrefPrefix="/interview-prep"
      emptyMessage="No jobs yet. Add one to start prepping for its interview."
    />
  );
}
