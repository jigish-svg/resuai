import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import JobsListBoard from '@/components/jobs/JobsListBoard';

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status, matches(overall_score)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const listJobs = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    matchScore: Array.isArray(job.matches) && job.matches.length > 0
      ? (job.matches[0] as { overall_score: number | null }).overall_score
      : null,
  }));

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Applications</h1>
          <p className="text-sm text-ink-soft">Track your active applications</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-4 py-2 rounded text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {listJobs.length === 0 ? (
        <div className="text-sm text-ink-soft border-t border-ink/10 py-6">
          No applications yet.{' '}
          <Link href="/jobs/new" className="text-brand-aqua hover:underline font-medium">
            Start a new application <ArrowRight className="w-3.5 h-3.5 inline" />
          </Link>
        </div>
      ) : (
        <JobsListBoard initialJobs={listJobs} />
      )}
    </div>
  );
}
