'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessagesSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/api/client';

export default function GeneratePrepButton({ jobId, label = 'Generate Interview Prep' }: { jobId: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to generate interview prep'));
      toast.success('Interview prep ready');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate interview prep');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessagesSquare className="w-4 h-4" />}
      {loading ? 'Preparing…' : label}
    </button>
  );
}
