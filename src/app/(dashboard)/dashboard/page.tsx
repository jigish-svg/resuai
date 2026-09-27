import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, ArrowRight, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch stats and resumes
  const [resumesResult, jobsResult] = await Promise.all([
    supabase.from('resumes').select('id, name, updated_at').eq('user_id', user!.id).eq('is_master', true).maybeSingle(),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user!.id)
  ]);

  const masterResume = resumesResult.data;
  const hasMasterResume = !!masterResume;
  const jobCount = jobsResult.count ?? 0;

  // Fetch recent jobs with match scores
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select(`
      id, title, company, status, created_at, updated_at,
      matches(overall_score)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Good morning, {displayName}</h1>
          <p className="text-sm text-ink-soft">
            {jobCount} application{jobCount !== 1 ? 's' : ''} tracked.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-4 py-2 rounded text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {/* Continue - Most recent unfinished application */}
      {recentJobs && recentJobs.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">Continue</h2>
          {(() => {
            const latestJob = recentJobs[0];
            const hasMatch = Array.isArray(latestJob.matches) && latestJob.matches.length > 0;
            const matchScore = hasMatch
              ? (latestJob.matches[0] as { overall_score: number | null }).overall_score
              : null;
            return (
              <div className="border border-ink/10 rounded bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink text-sm">{latestJob.title}</p>
                  <p className="text-xs text-ink-soft">{latestJob.company || 'Unknown Company'}</p>
                </div>
                <div className="flex items-center gap-6">
                  {matchScore !== null && (
                    <div className="text-sm text-ink">
                      Fit <span className="font-semibold">{matchScore}</span>
                    </div>
                  )}
                  <div className="text-sm text-ink-soft capitalize">
                    {latestJob.status.replace('_', ' ')}
                  </div>
                  <Link
                    href={hasMatch ? `/match/${latestJob.id}` : `/jobs/${latestJob.id}`}
                    className="flex items-center gap-1 text-sm text-brand-aqua hover:underline font-medium"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Recent Applications */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">Recent Applications</h2>
        {recentJobs && recentJobs.length > 0 ? (
          <div className="border-t border-ink/10">
            {recentJobs.map((job) => {
              const hasMatch = Array.isArray(job.matches) && job.matches.length > 0;
              const matchScore = hasMatch
                ? (job.matches[0] as { overall_score: number | null }).overall_score
                : null;

              return (
                <Link
                  key={job.id}
                  href={hasMatch ? `/match/${job.id}` : `/jobs/${job.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-ink/5 hover:bg-brand-bg/50 transition-colors group"
                >
                  <div className="flex-[2] min-w-0">
                    <p className="font-medium text-sm text-ink truncate">{job.title}</p>
                    <p className="text-xs text-ink-soft truncate">{job.company || 'Unknown Company'}</p>
                  </div>
                  <div className="flex-[1] flex items-center gap-2 mt-2 sm:mt-0">
                    {matchScore !== null ? (
                      <span className="text-xs text-ink bg-brand-cream px-2 py-0.5 rounded">
                        Fit {matchScore}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">No fit score</span>
                    )}
                  </div>
                  <div className="flex-[1] flex items-center mt-2 sm:mt-0">
                    <span className="text-xs text-brand-sea-green bg-brand-sea-green/10 px-2 py-0.5 rounded capitalize">
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex-[1] flex justify-end mt-2 sm:mt-0">
                    <span className="text-xs text-ink-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(job.updated_at || job.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-ink-soft py-4 border-t border-ink/10">
            No applications found. <Link href="/jobs/new" className="text-brand-aqua hover:underline">Start a new application.</Link>
          </div>
        )}
      </div>

      {/* Optional tiny summary */}
      <div className="flex gap-4 mt-12 text-xs text-ink-muted">
        <span>{jobCount} Applications</span>
        <span>·</span>
        <span>{hasMasterResume ? 'Document ready' : 'No master document'}</span>
      </div>
    </div>
  );
}
