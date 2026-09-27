'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <Link href="/">
            <BrandLogo />
          </Link>
        </div>

        <div className="bg-white border border-ink/10 rounded-lg p-8 shadow-sm">
          <h1 className="text-xl font-semibold mb-2 text-ink">Welcome back</h1>
          <p className="text-sm text-ink-soft mb-8">Sign in to your GetJobFit workspace.</p>

          {/* Google OAuth — only renders when enabled in Supabase */}
          <GoogleSignInButton label="Continue with Google" />

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-ink/20 rounded-md pl-10 pr-3 py-2.5 text-ink text-sm focus:outline-none focus:border-brand-sea-green transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-brand-sea-green hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-ink/20 rounded-md pl-10 pr-3 py-2.5 text-ink text-sm focus:outline-none focus:border-brand-sea-green transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-sea-green text-white rounded-md py-2.5 text-sm font-semibold disabled:opacity-60 hover:bg-opacity-90 transition-colors mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-ink-soft">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand-sea-green hover:underline font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
