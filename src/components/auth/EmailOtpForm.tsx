'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const RESEND_COOLDOWN_SECONDS = 60;

const inputClass =
  'w-full bg-black/[0.02] border border-black/[0.08] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-all';
const primaryButtonClass =
  'w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all px-6 py-3.5 rounded-full font-semibold text-base shadow-lg';

/** Passwordless sign-in: request a one-time code by email, then enter it. Also creates the account for new emails. */
export default function EmailOtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setStep('code');
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('We emailed you a code. It can take a minute to arrive.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Welcome!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendCode();
        }}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="otp-email">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              id="otp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`${inputClass} pl-11 pr-4`}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            We&apos;ll email you a one-time code. No password needed, and new emails get an account automatically.
          </p>
        </div>

        <button type="submit" disabled={loading || !email.trim()} className={primaryButtonClass}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Email me a code
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="otp-code">
          Enter the code we sent to {email}
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="123456"
            required
            autoFocus
            className={`${inputClass} pl-11 pr-4 tracking-[0.4em] text-lg font-semibold tabular-nums`}
          />
        </div>
      </div>

      <button type="submit" disabled={loading || code.length < 6} className={primaryButtonClass}>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Verify and sign in
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setCode('');
          }}
          className="text-gray-500 hover:text-gray-800 transition-colors"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={sendCode}
          disabled={loading || cooldown > 0}
          className="text-brand-primary hover:text-brand-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
