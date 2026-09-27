import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, ArrowRight, Clock, Briefcase, FileText, Activity } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-1">Good morning, {displayName}</h1>
          <p className="text-sm text-ink-soft">
            Here's what's happening with your job search today.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-brand-sea-green" />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Applications</p>
            <p className="text-xl font-bold text-ink">{jobCount}</p>
          </div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-aqua/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-brand-aqua" />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Master Resume</p>
            <p className="text-sm font-bold text-ink">{hasMasterResume ? 'Ready' : 'Not setup'}</p>
          </div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-brandy/10 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-brand-brandy" />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Avg Match Score</p>
            <p className="text-xl font-bold text-ink">—</p>
          </div>
        </div>
      </div>

      {/* Continue - Most recent unfinished application */}
      {recentJobs && recentJobs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-ink mb-4">Pick up where you left off</h2>
          {(() => {
            const latestJob = recentJobs[0];
            const hasMatch = Array.isArray(latestJob.matches) && latestJob.matches.length > 0;
            const matchScore = hasMatch
              ? (latestJob.matches[0] as { overall_score: number | null }).overall_score
              : null;
            return (
              <div className="border-2 border-brand-sea-green/20 rounded-xl bg-brand-bg/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-brand-bg/60">
                <div>
                  <p className="font-bold text-ink text-base mb-1">{latestJob.title}</p>
                  <p className="text-sm text-ink-soft flex items-center gap-2">
                    <span className="font-medium text-ink">{latestJob.company || 'Unknown Company'}</span>
                    <span>•</span>
                    <span className="capitalize">{latestJob.status.replace('_', ' ')}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {matchScore !== null && (
                    <div className="text-sm text-ink-soft border border-ink/10 bg-white px-3 py-1.5 rounded-lg font-medium">
                      Fit: <span className="text-brand-sea-green font-bold ml-1">{matchScore}%</span>
                    </div>
                  )}
                  <Link
                    href={hasMatch ? `/match/${latestJob.id}` : `/jobs/${latestJob.id}`}
                    className="flex items-center gap-2 bg-white border border-ink/20 hover:border-brand-sea-green text-sm text-ink font-semibold px-4 py-2 rounded-lg transition-all"
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
        <h2 className="text-sm font-bold text-ink mb-4">Recent Applications</h2>
        {recentJobs && recentJobs.length > 0 ? (
          <div className="border border-ink/10 rounded-xl bg-white overflow-hidden shadow-sm">
            {recentJobs.map((job, idx) => {
              const hasMatch = Array.isArray(job.matches) && job.matches.length > 0;
              const matchScore = hasMatch
                ? (job.matches[0] as { overall_score: number | null }).overall_score
                : null;

              return (
                <Link
                  key={job.id}
                  href={hasMatch ? `/match/${job.id}` : `/jobs/${job.id}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-brand-bg/40 transition-colors group ${
                    idx !== recentJobs.length - 1 ? 'border-b border-ink/5' : ''
                  }`}
                >
                  <div className="flex-[2] min-w-0 mb-2 sm:mb-0">
                    <p className="font-semibold text-sm text-ink truncate mb-0.5 group-hover:text-brand-sea-green transition-colors">{job.title}</p>
                    <p className="text-xs text-ink-soft truncate font-medium">{job.company || 'Unknown Company'}</p>
                  </div>
                  
                  <div className="flex-[1] flex items-center justify-start sm:justify-center">
                    <span className="text-[11px] font-semibold tracking-wide text-ink-soft bg-ink/5 border border-ink/10 px-2.5 py-1 rounded-full capitalize">
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex-[1] flex items-center justify-start sm:justify-center mt-2 sm:mt-0">
                    {matchScore !== null ? (
                      <span className="text-[11px] font-bold text-brand-sea-green bg-brand-sea-green/10 border border-brand-sea-green/20 px-2.5 py-1 rounded-full">
                        Fit: {matchScore}%
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-ink-muted">No fit score</span>
                    )}
                  </div>
                  
                  <div className="flex-[1] flex justify-end mt-2 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-semibold text-brand-aqua flex items-center gap-1">
                      View details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border border-ink/10 rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-5 h-5 text-brand-sea-green" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">No applications yet</p>
            <p className="text-xs text-ink-soft mb-4">Start tracking your jobs to see them here.</p>
            <Link href="/jobs/new" className="inline-flex text-xs font-semibold text-brand-aqua hover:underline">
              Add your first job →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
