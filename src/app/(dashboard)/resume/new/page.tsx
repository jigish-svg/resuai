import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import ResumeCreateEntry from '@/components/resume/ResumeCreateEntry';

export default async function NewResumePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count } = await supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user!.id);
  const existingCount = count ?? 0;
  const paid = await isPaidUser(supabase, user!.id);

  if (existingCount > 0 && !paid) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-up glass rounded-2xl p-16 border border-brand-tertiary/40 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-brand-tertiary-dark flex items-center justify-center mx-auto mb-5 shadow-lg relative">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative">
            Free plan is limited to {FREE_TIER_LIMITS.maxResumeProfiles} resume profile
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
            Upgrade to maintain separate resumes for different career tracks — each with its own Evidence Library.
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Create a New <span className="gradient-text">Resume</span></h1>
        <p className="text-gray-500">Upload or paste a resume to build a new profile with its own Evidence Library.</p>
      </div>
      <ResumeCreateEntry redirectOnSaveTo="/resume" />
    </div>
  );
}
