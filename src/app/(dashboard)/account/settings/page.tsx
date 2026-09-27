import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, User, CreditCard, Mail } from 'lucide-react';
import DeleteAccountButton from '@/components/account/DeleteAccountButton';
import { isPaidUser } from '@/lib/plan';
import Link from 'next/link';

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const paid = await isPaidUser(supabase, user!.id);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
        <p className="text-sm text-ink-soft">Manage your account preferences and billing.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="border border-ink/10 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-ink/5 bg-brand-bg/30">
            <h2 className="flex items-center gap-2 font-semibold text-ink text-sm">
              <User className="w-4 h-4 text-brand-sea-green" />
              Profile details
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-medium text-ink flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ink-muted" />
                  {user?.email}
                </p>
              </div>
              <span className="text-xs font-semibold bg-brand-cream text-ink px-2 py-1 rounded-full border border-ink/10">
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Plan & Billing Card */}
        <div className="border border-ink/10 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-ink/5 bg-brand-bg/30 flex justify-between items-center">
            <h2 className="flex items-center gap-2 font-semibold text-ink text-sm">
              <CreditCard className="w-4 h-4 text-brand-sea-green" />
              Plan & Billing
            </h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${paid ? 'bg-brand-sea-green/10 text-brand-sea-green border-brand-sea-green/20' : 'bg-ink/5 text-ink-soft border-ink/10'}`}>
              {paid ? 'Premium Plan' : 'Free Plan'}
            </span>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-ink mb-1">
                {paid ? 'You have access to all Premium features.' : 'You are currently on the Free plan.'}
              </p>
              <p className="text-xs text-ink-soft max-w-sm">
                {paid ? 'Your subscription is active and renews automatically.' : 'Upgrade to unlock cover letters, mock interviews, and advanced ATS optimization.'}
              </p>
            </div>
            {!paid && (
              <Link href="/account/upgrade" className="bg-brand-sea-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
            <h2 className="flex items-center gap-2 font-semibold text-red-700 text-sm">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
            </h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink mb-1">Delete Account</p>
              <p className="text-xs text-ink-soft max-w-md">
                Permanently delete your account and all data (resumes, jobs, tailored documents). This action cannot be undone.
              </p>
            </div>
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}
