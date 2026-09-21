'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Target,
  MessageCircleQuestion,
  Wand2,
  Mail,
  Crown,
  ArrowRight,
  Mic,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/brand/BrandLogo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resume', label: 'Resumes', icon: FileText },
  { href: '/jobs', label: 'Saved Jobs', icon: Briefcase },
  { href: '/jobs/new', label: 'Add Job', icon: Target },
  { href: '/jd-tailoring', label: 'JD-Specific Tailoring', icon: Wand2 },
  { href: '/interview-prep', label: 'Interview Prep', icon: MessageCircleQuestion },
  { href: '/mock-interview', label: 'Mock Interview', icon: Mic },
  { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
];

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 w-64 bg-white/90 backdrop-blur-xl border-r border-black/[0.06] flex flex-col z-50 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-black/[0.06]">
        <Link href="/dashboard" aria-label="GetJobFit.ai dashboard">
          <BrandLogo textClassName="text-base" />
        </Link>
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary-dark border border-brand-primary/20'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black/[0.03]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-brand-primary" />
              )}
              <item.icon className={cn('w-4.5 h-4.5 shrink-0', isActive ? 'text-brand-primary' : '')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-black/[0.06]">
        <Link
          href="/account/upgrade"
          className="group block glass rounded-xl p-4 text-sm gradient-border relative overflow-hidden bg-brand-primary/[0.06] hover:bg-brand-primary/[0.1] transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-md bg-brand-primary flex items-center justify-center shrink-0">
              <Crown className="w-3.5 h-3.5 text-white" />
            </span>
            <p className="text-gray-900 font-semibold">Go Premium</p>
          </div>
          <p className="text-gray-500 text-xs mb-3 leading-relaxed">
            Unlimited jobs, multiple resumes, JD tailoring, interview prep &amp; cover letters
          </p>
          <span className="flex items-center gap-1 text-brand-primary group-hover:text-brand-primary-dark transition-colors text-xs font-medium">
            View plans
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
