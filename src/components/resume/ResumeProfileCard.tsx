'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, Pencil, Star, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api/client';

interface ResumeProfileCardProps {
  id: string;
  name: string;
  updatedAt: string;
  achievementCount: number;
  isDefault: boolean;
}

export default function ResumeProfileCard({ id, name, updatedAt, achievementCount, isDefault }: ResumeProfileCardProps) {
  const router = useRouter();
  const [settingDefault, setSettingDefault] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSetDefault = async () => {
    setSettingDefault(true);
    try {
      const res = await fetch('/api/resume/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to set default'));
      toast.success(`${name} is now your default resume`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default');
    } finally {
      setSettingDefault(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${name}"? This removes its Evidence Library too. This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/resume/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to delete resume'));
      toast.success(`Deleted ${name}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete resume');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-black/[0.06] flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isDefault ? 'bg-brand-primary shadow-lg' : 'bg-black/[0.04]'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 ${isDefault ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 flex items-center gap-2 truncate">
            {name}
            {isDefault && (
              <span className="shrink-0 text-[10px] uppercase tracking-wide bg-brand-primary-light text-brand-primary-dark px-1.5 py-0.5 rounded-md font-medium">
                Default
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {achievementCount} achievements · Updated {formatDate(updatedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={settingDefault}
            title="Set as default"
            className="flex items-center gap-1.5 glass glass-hover px-3 py-2 rounded-lg text-xs font-medium text-gray-700 disabled:opacity-60"
          >
            {settingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
          </button>
        )}
        <Link href={`/resume/${id}`} className="flex items-center gap-1.5 glass glass-hover px-3 py-2 rounded-lg text-xs font-medium text-gray-700">
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 glass glass-hover px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
