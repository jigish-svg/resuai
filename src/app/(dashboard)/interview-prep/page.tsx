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
      <div className="max-w-2xl mx-auto py-8">
        <div className="border border-ink/10 bg-white rounded p-8 text-center">
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
