'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

const MOBILE_BREAKPOINT = 768;

interface DashboardShellProps {
  user: SupabaseUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Start collapsed on phones/small tablets so the drawer doesn't cover the
  // whole screen on first load; stays open by default on larger screens.
  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-close the mobile drawer after navigating to a new page.
  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="min-h-screen bg-hero-gradient flex relative overflow-hidden">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={`flex-1 flex flex-col min-h-screen relative transition-[margin] duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}
      >
        <DashboardHeader user={user} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-8 overflow-auto relative">{children}</main>
      </div>
    </div>
  );
}
