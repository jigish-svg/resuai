import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, User } from 'lucide-react';
import DeleteAccountButton from '@/components/account/DeleteAccountButton';

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Account <span className="gradient-text">Settings</span></h1>
        <p className="text-gray-500">Manage your account.</p>
      </div>

      <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]" style={{ animationDelay: '0.06s' }}>
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-4">
          <span className="w-7 h-7 rounded-md bg-brand-green/10 text-brand-green flex items-center justify-center">
            <User className="w-4 h-4" />
          </span>
          Account
        </h2>
        <p className="text-sm text-gray-500">Signed in as</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{user?.email}</p>
      </div>

      <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]" style={{ animationDelay: '0.12s' }}>
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
          <span className="w-7 h-7 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </span>
          Danger Zone
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all data associated with it — resumes, jobs, matches, tailored
          resumes, cover letters, and interview prep history.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
