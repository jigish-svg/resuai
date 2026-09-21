import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FileText, Plus, Target, TrendingUp, ArrowRight, Sparkles, Clock, CheckCircle2, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch stats
  const [resumesResult, jobsResult, matchesResult] = await Promise.all([
    supabase.from('resumes').select('id, name, updated_at').eq('user_id', user!.id).eq('is_master', true).maybeSingle(),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('matches').select('overall_score').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
  ]);

  const masterResume = resumesResult.data;
  let achievementCount = 0;
  if (masterResume) {
    const { count } = await supabase
      .from('achievements')
      .select('id', { count: 'exact', head: true })
      .eq('resume_id', masterResume.id);
    achievementCount = count ?? 0;
  }

  // Fetch recent jobs with match scores
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select(`
      id, title, company, status, created_at,
      matches(overall_score)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const hasMasterResume = !!masterResume;
  const jobCount = jobsResult.count ?? 0;
  const avgScore = matchesResult.data && matchesResult.data.length > 0
    ? Math.round(matchesResult.data.reduce((sum, m) => sum + m.overall_score, 0) / matchesResult.data.length)
    : null;

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const stats = [
    {
      label: 'Default Resume',
      value: hasMasterResume ? '✓ Ready' : 'Not set up',
      icon: FileText,
      color: hasMasterResume ? 'text-success' : 'text-orange-600',
      bg: hasMasterResume ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
      href: '/resume',
    },
    {
      label: 'Jobs Analyzed',
      value: jobCount.toString(),
      icon: Target,
      color: 'text-brand-primary',
      bg: 'from-brand-primary/10 to-brand-secondary/10 border-brand-primary/20',
      href: '/jobs',
    },
    {
      label: 'Avg. Match Score',
      value: avgScore !== null ? `${avgScore}%` : '—',
      icon: TrendingUp,
      color: 'text-sky-600',
      bg: 'from-sky-500/10 to-blue-500/10 border-sky-500/20',
      href: '/jobs',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-1">Good to see you, <span className="gradient-text">{displayName}</span> 👋</h1>
          <p className="text-gray-500">
            {!hasMasterResume
              ? 'Start by uploading your master resume to unlock AI matching.'
              : `You have ${jobCount} job${jobCount !== 1 ? 's' : ''} tracked.`}
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            style={{ animationDelay: `${0.08 + i * 0.06}s` }}
            className={`group bg-gradient-to-br ${stat.bg} border rounded-2xl p-6 card-hover hover:shadow-xl hover:shadow-black/20 animate-fade-up`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-black/[0.04] flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Master Resume section — always visible */}
      {!hasMasterResume ? (
        <div className="animate-fade-up glass rounded-2xl p-8 border border-brand-primary/20 text-center bg-brand-primary/5 relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
          <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg animate-float relative">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">Make a New Resume</h2>
          <p className="text-gray-700 mb-6 max-w-md mx-auto relative">
            Upload or paste your resume once. AI extracts every achievement into your personal Evidence Library — ready to match against any job.
          </p>
          <Link
            href="/resume"
            className="relative inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-7 py-3 rounded-full font-semibold shadow-lg"
          >
            <FileText className="w-4 h-4" />
            Create Resume
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] flex items-center justify-between gap-4 relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center shrink-0 shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{masterResume.name}</p>
              <p className="text-sm text-gray-500">
                {achievementCount} achievements in your Evidence Library · Updated {formatDate(masterResume.updated_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/resume/${masterResume.id}`}
              className="flex items-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
            <Link
              href="/resume/new"
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
            >
              <FileText className="w-4 h-4" />
              Make a New Resume
            </Link>
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      {recentJobs && recentJobs.length > 0 && (
        <div className="animate-fade-up glass rounded-2xl overflow-hidden border border-black/[0.06]" style={{ animationDelay: '0.28s' }}>
          <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
            <h2 className="font-semibold">Recent Jobs</h2>
            <Link href="/jobs" className="text-sm text-brand-primary hover:text-brand-primary-dark transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {recentJobs.map((job) => {
              const matchScore = Array.isArray(job.matches) && job.matches.length > 0
                ? (job.matches[0] as { overall_score: number }).overall_score
                : null;

              return (
                <Link
                  key={job.id}
                  href={matchScore ? `/match/${job.id}` : `/jobs/${job.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-black/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                      <Target className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        {job.company && <span>{job.company}</span>}
                        <span className="text-gray-400">·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(job.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {matchScore !== null && (
                      <div className={`text-sm font-bold ${matchScore >= 60 ? 'text-success' : matchScore >= 45 ? 'text-amber-600' : 'text-orange-600'}`}>
                        {matchScore}%
                      </div>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      job.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                      job.status === 'interview' ? 'bg-success/10 text-success-dark' :
                      job.status === 'offer' ? 'bg-brand-secondary-light text-amber-700' :
                      'bg-black/[0.04] text-gray-600'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
