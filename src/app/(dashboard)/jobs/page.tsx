import Link from 'next/link';
import { Plus, Briefcase, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import JobsKanbanBoard, { KanbanJob } from '@/components/jobs/JobsKanbanBoard';

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status, matches(overall_score)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const kanbanJobs: KanbanJob[] = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    matchScore: Array.isArray(job.matches) && job.matches.length > 0
      ? (job.matches[0] as { overall_score: number | null }).overall_score
      : null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-1">Saved <span className="gradient-text">Jobs</span></h1>
          <p className="text-gray-500">Drag cards between stages to track your pipeline.</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Job
        </Link>
      </div>

      {kanbanJobs.length === 0 ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/20 border border-brand-primary/20 flex items-center justify-center mx-auto mb-5 relative">
            <Briefcase className="w-6 h-6 text-brand-primary" />
          </div>
          <p className="text-gray-700 mb-4 relative">No jobs yet. Add your first job to get a match analysis.</p>
          <Link href="/jobs/new" className="relative inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary-dark font-medium transition-colors">
            Add a job <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <JobsKanbanBoard initialJobs={kanbanJobs} />
        </div>
      )}
    </div>
  );
}
