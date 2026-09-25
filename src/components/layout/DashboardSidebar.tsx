'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/brand/BrandLogo';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/resume', label: 'Documents', icon: FileText },
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
        'fixed left-0 top-0 bottom-0 w-64 bg-brand-ivory border-r border-ink/10 flex flex-col z-50 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-ink/10">
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
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-6">
          <Link
            href="/jobs/new"
            className="flex items-center justify-center gap-2 w-full bg-brand-primary hover:bg-brand-primary-dark text-white rounded-[6px] px-4 py-2 text-sm font-semibold transition-colors"
          >
            New Application
          </Link>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors',
                isActive
                  ? 'bg-ink/5 text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/5'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5 shrink-0', isActive ? 'text-brand-primary' : '')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-ink/10">
        {/* Placeholder for future non-marketing actions */}
      </div>
    </aside>
  );
}
