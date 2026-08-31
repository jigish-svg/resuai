'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface DashboardHeaderProps {
  user: SupabaseUser;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  };

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-black/[0.06] bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-30">
      <div />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 glass px-3 py-1.5 rounded-xl hover:bg-black/[0.04] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm text-gray-700 max-w-32 truncate">{displayName}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-black/[0.08] overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-black/[0.06]">
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
