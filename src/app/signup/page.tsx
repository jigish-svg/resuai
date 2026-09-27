'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user && !data.session) {
        toast.success('Check your email to confirm your account!', { duration: 6000 });
      } else {
        toast.success('Account created!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
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
          <h1 className="text-xl font-semibold mb-2 text-ink">Create your account</h1>
          <p className="text-sm text-ink-soft mb-8">Start building applications you can stand behind.</p>

          {/* Google OAuth — only renders when enabled in Supabase */}
          <GoogleSignInButton label="Sign up with Google" />

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5" htmlFor="name">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white border border-ink/20 rounded-md pl-10 pr-3 py-2.5 text-ink text-sm focus:outline-none focus:border-brand-sea-green transition-colors"
                  required
                />
              </div>
            </div>

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-white border border-ink/20 rounded-md pl-10 pr-3 py-2.5 text-ink text-sm focus:outline-none focus:border-brand-sea-green transition-colors"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-sea-green text-white rounded-md py-2.5 text-sm font-semibold disabled:opacity-60 hover:bg-opacity-90 transition-colors mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
            </button>
          </form>

          <p className="text-center mt-4 text-xs text-ink-muted">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-center mt-6 text-sm text-ink-soft">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-sea-green hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
