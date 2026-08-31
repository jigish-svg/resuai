'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  Briefcase,
  Target,
  MessageCircleQuestion,
  Wand2,
  Mail,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resume', label: 'Resumes', icon: FileText },
  { href: '/jobs', label: 'Saved Jobs', icon: Briefcase },
  { href: '/jobs/new', label: 'Add Job', icon: Target },
  { href: '/jd-tailoring', label: 'JD-Specific Tailoring', icon: Wand2 },
  { href: '/interview-prep', label: 'Interview Prep', icon: MessageCircleQuestion },
  { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/90 backdrop-blur-xl border-r border-black/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-black/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center shadow-lg shadow-brand-green/20 group-hover:shadow-brand-green/40 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">ResumeAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-brand-green/20 to-brand-yellow/10 text-brand-green-dark border border-brand-green/20 shadow-[0_0_20px_rgba(0,155,77,0.1)]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black/[0.03]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-brand-green to-brand-yellow" />
              )}
              <item.icon className={cn('w-4.5 h-4.5', isActive ? 'text-brand-green' : '')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-black/[0.06]">
        <Link
          href="/account/upgrade"
          className="group block glass rounded-xl p-4 text-sm gradient-border relative overflow-hidden bg-gradient-to-br from-brand-green/[0.06] to-brand-yellow/[0.08] hover:from-brand-green/[0.1] hover:to-brand-yellow/[0.12] transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center shrink-0">
              <Crown className="w-3.5 h-3.5 text-white" />
            </span>
            <p className="text-gray-900 font-semibold">Go Premium</p>
          </div>
          <p className="text-gray-500 text-xs mb-3 leading-relaxed">
            Unlimited jobs, multiple resumes, JD tailoring, interview prep &amp; cover letters
          </p>
          <span className="flex items-center gap-1 text-brand-green group-hover:text-brand-green-dark transition-colors text-xs font-medium">
            View plans
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
