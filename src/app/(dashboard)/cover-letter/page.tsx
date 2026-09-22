import Link from 'next/link';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import JobPickerHub from '@/components/jobs/JobPickerHub';

export default async function CoverLetterHubPage() {
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
          <h2 className="text-xl font-bold mb-2 relative">Cover Letters are a paid feature</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to generate an AI-written, evidence-based cover letter for every job you&apos;re tracking, built
            around your strongest real achievements.
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
      title="Cover Letter"
      description="Pick a job to generate an evidence-based cover letter tailored to its description."
      icon={<Mail className="w-4.5 h-4.5" />}
      jobs={jobs ?? []}
      hrefPrefix="/cover-letter"
      emptyMessage="No jobs yet. Add one to generate a cover letter for it."
    />
  );
}
