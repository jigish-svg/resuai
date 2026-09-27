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

  if (!resumes || resumes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink mb-1">Make a New Resume</h1>
          <p className="text-sm text-ink-soft">
            Upload once. Every achievement becomes searchable evidence.
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
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Your Resumes</h1>
          <p className="text-sm text-ink-soft">Manage your master documents</p>
        </div>
        <Link
          href={atLimit ? '/account/upgrade' : '/resume/new'}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            atLimit
              ? 'bg-brand-cream text-ink border border-ink/10'
              : 'bg-brand-sea-green hover:bg-opacity-90 text-white'
          }`}
        >
          {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {atLimit ? 'Upgrade for more' : 'Create New'}
        </Link>
      </div>

      <div className="border-t border-ink/10">
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
        <p className="text-xs text-ink-soft mt-6 text-center">
          Free plan is limited to {FREE_TIER_LIMITS.maxResumeProfiles} resume profile.{' '}
          <Link href="/account/upgrade" className="text-brand-aqua hover:underline font-medium">
            Upgrade
          </Link>{' '}
          for more.
        </p>
      )}
    </div>
  );
}
