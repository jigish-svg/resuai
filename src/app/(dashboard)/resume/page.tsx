import Link from 'next/link';
import { Plus, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import ResumeCreateEntry from '@/components/resume/ResumeCreateEntry';
import ResumeProfileCard from '@/components/resume/ResumeProfileCard';

export default async function ResumePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: resumes } = await supabase
    .from('resumes')
    .select('id, name, updated_at, is_master')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true });

  // First-time users: keep the exact same single-resume create experience
  if (!resumes || resumes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold mb-1">Make a New <span className="gradient-text">Resume</span></h1>
          <p className="text-gray-500">
            Upload once. Every achievement becomes searchable evidence for matching against jobs.
          </p>
        </div>
        <ResumeCreateEntry />
      </div>
    );
  }

  const paid = await isPaidUser(supabase, user!.id);
  const atLimit = !paid && resumes.length >= FREE_TIER_LIMITS.maxResumeProfiles;

  const resumesWithCounts = await Promise.all(
    resumes.map(async (r) => {
      const { count } = await supabase.from('achievements').select('id', { count: 'exact', head: true }).eq('resume_id', r.id);
      return { ...r, achievementCount: count ?? 0 };
    })
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-1">Your <span className="gradient-text">Resumes</span></h1>
          <p className="text-gray-500">Your default resume is used automatically when you add a new job.</p>
        </div>
        <Link
          href={atLimit ? '/account/upgrade' : '/resume/new'}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            atLimit
              ? 'glass glass-hover text-amber-700'
              : 'bg-brand-primary hover:bg-brand-primary-dark text-white shadow-lg'
          }`}
        >
          {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {atLimit ? 'Upgrade for more' : 'Create New Resume'}
        </Link>
      </div>

      <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.06s' }}>
        {resumesWithCounts.map((r) => (
          <ResumeProfileCard
            key={r.id}
            id={r.id}
            name={r.name}
            updatedAt={r.updated_at}
            achievementCount={r.achievementCount}
            isDefault={r.is_master}
          />
        ))}
      </div>

      {atLimit && (
        <p className="text-sm text-gray-500 text-center animate-fade-up" style={{ animationDelay: '0.1s' }}>
          Free plan is limited to {FREE_TIER_LIMITS.maxResumeProfiles} resume profile.{' '}
          <Link href="/account/upgrade" className="text-brand-primary hover:text-brand-primary-dark font-medium">
            Upgrade
          </Link>{' '}
          to maintain separate resumes for different career tracks.
        </p>
      )}
    </div>
  );
}
