'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * "Continue with Google" plus an "or" divider. Renders nothing until Google is
 * actually switched on in Supabase (Authentication > Providers), so the app
 * never shows a button that leads to a raw provider error.
 */
export default function GoogleSignInButton({ label = 'Continue with Google' }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (!cancelled && settings?.external?.google) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start Google sign-in.');
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-canvas-band border border-black/[0.12] text-ink disabled:opacity-60 transition-colors px-6 py-3.5 rounded-full font-semibold text-base"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleGlyph />}
        {label}
      </button>
      <div className="flex items-center gap-3 mt-6 text-xs font-semibold tracking-wider text-ink-muted">
        <span className="flex-1 h-px bg-black/[0.08]" />
        OR
        <span className="flex-1 h-px bg-black/[0.08]" />
      </div>
    </div>
  );
}
