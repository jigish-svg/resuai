'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  PlusCircle,
  Target,
  MessageCircleQuestion,
  Mic,
  Mail,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/resume', label: 'Resume & Docs', icon: FileText },
      { href: '/jobs', label: 'Saved Jobs', icon: Briefcase },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/jobs/new', label: 'Add Job / JD', icon: PlusCircle, highlight: true },
      { href: '/jd-tailoring', label: 'JD Tailoring', icon: Target },
      { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
    ],
  },
  {
    label: 'Preparation',
    items: [
      { href: '/interview-prep', label: 'Interview Prep', icon: MessageCircleQuestion },
      { href: '/mock-interview', label: 'Mock Interview', icon: Mic },
    ],
  },
];

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 w-60 bg-[#f5faf8] border-r border-ink/10 flex flex-col z-50 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-ink/10 shrink-0">
          <Link href="/dashboard" aria-label="GetJobFit.in dashboard">
            <BrandLogo markClassName="w-7 h-7" textClassName="text-sm" />
          </Link>
          <button
            onClick={onClose}
            className="md:hidden text-ink-muted hover:text-ink transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted px-2 mb-2">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  if (item.highlight) {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold bg-brand-sea-green text-white hover:bg-opacity-90 transition-colors"
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-sea-green/10 text-brand-sea-green'
                            : 'text-ink-soft hover:text-ink hover:bg-ink/5'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            isActive ? 'text-brand-sea-green' : 'text-ink-muted'
                          )}
                        />
                        {item.label}
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-sea-green" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-ink/10 p-3">
          <Link
            href="/account/settings"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith('/account')
                ? 'bg-ink/5 text-ink'
                : 'text-ink-muted hover:text-ink hover:bg-ink/5'
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
