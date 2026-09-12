'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie-notice-acknowledged';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. private browsing edge cases) — skip silently
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto glass rounded-2xl border border-black/[0.08] shadow-2xl shadow-black/20 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed flex-1">
          We only use one essential cookie to keep you signed in — no ads, no tracking, no analytics cookies. See our{' '}
          <Link href="/privacy" className="text-brand-green hover:text-brand-green-dark underline">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-brand-green/20"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
