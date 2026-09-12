'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const benefits = [
  'Evidence-based job matching',
  'Truth Guard™ — zero fabrication',
  'ATS optimization & scoring',
  'PDF & DOCX export',
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user && !data.session) {
        toast.success('Check your email to confirm your account!', { duration: 6000 });
      } else {
        toast.success('Account created! Welcome to GetJobFit.ai!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4 py-12">
      <div className="absolute top-20 right-1/3 w-80 h-80 bg-brand-green/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">GetJobFit.ai</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Create your account</h1>
          <p className="text-gray-600">Start matching your resume to jobs for free</p>
        </div>

        {/* Benefits */}
        <div className="glass rounded-2xl p-4 mb-5 border border-brand-green/15">
          <div className="grid grid-cols-2 gap-2">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-8 border border-black/[0.06]">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-green/60 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="signup-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-green/60 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="signup-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl pl-11 pr-12 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-green/60 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="signup-submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all px-6 py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-brand-green/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-xs text-gray-500">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-brand-green hover:text-brand-green-dark underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-brand-green hover:text-brand-green-dark underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center mt-6 text-gray-600 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-green hover:text-brand-green-dark transition-colors font-medium">
            Sign in
          </Link>
        </p>

        <p className="text-center mt-3 text-gray-500 text-xs">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
