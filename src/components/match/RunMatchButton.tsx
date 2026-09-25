'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/api/client';

export default function RunMatchButton({ jobId, label = 'Run Match Analysis' }: { jobId: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to run match analysis'));
      toast.success('Match analysis complete');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run match analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {loading ? 'Analyzing…' : label}
    </button>
  );
}
