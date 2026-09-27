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
    <div className="flex items-center justify-between py-4 border-b border-ink/5 hover:bg-brand-bg/50 transition-colors">
      <div className="flex-[2] flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
            isDefault ? 'bg-brand-sea-green text-white' : 'bg-ink/5 text-ink-muted'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm text-ink flex items-center gap-2 truncate">
            {name}
            {isDefault && (
              <span className="shrink-0 text-[10px] uppercase tracking-wide bg-brand-sea-green/10 text-brand-sea-green px-1.5 py-0.5 rounded font-medium">
                Default
              </span>
            )}
          </p>
          <p className="text-xs text-ink-soft truncate">
            {achievementCount} achievements
          </p>
        </div>
      </div>
      
      <div className="flex-[1] flex justify-center mt-2 sm:mt-0 text-xs text-ink-muted">
        Updated {formatDate(updatedAt)}
      </div>

      <div className="flex-[1] flex justify-end gap-2 shrink-0">
        {!isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={settingDefault}
            title="Set as default"
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-ink/5 text-ink-muted hover:text-ink disabled:opacity-60 transition-colors"
          >
            {settingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
          </button>
        )}
        <Link 
          href={`/resume/${id}`} 
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-ink/5 text-ink-muted hover:text-ink transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-red-400 hover:text-red-500 disabled:opacity-60 transition-colors"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
