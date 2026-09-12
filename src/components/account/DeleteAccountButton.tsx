'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Your account and all associated data have been deleted');
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors px-4 py-2.5 rounded-xl text-sm font-medium"
      >
        <Trash2 className="w-4 h-4" />
        Delete my account
      </button>
    );
  }

  return (
    <div className="border border-rose-200 bg-rose-50/60 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-rose-900">This permanently deletes everything</p>
          <p className="text-sm text-rose-700 mt-1">
            Your account, every resume profile, saved jobs, match history, tailored resumes, cover letters, and
            interview prep will be permanently deleted. This cannot be undone.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-rose-800 mb-1.5">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={deleting}
          className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400 disabled:opacity-60"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || deleting}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Permanently delete my account
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setConfirmText('');
          }}
          disabled={deleting}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-2.5 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
