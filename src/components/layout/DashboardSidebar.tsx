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
import { BrandMark } from '@/components/brand/BrandLogo';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    emoji: '🗂️',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/resume', label: 'Resume & Docs', icon: FileText },
      { href: '/jobs', label: 'Saved Jobs', icon: Briefcase },
    ],
  },
  {
    label: 'Applications',
    emoji: '🚀',
    items: [
      { href: '/jobs/new', label: 'Add Job / JD', icon: PlusCircle, highlight: true },
      { href: '/jd-tailoring', label: 'JD Tailoring', icon: Target },
      { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
    ],
  },
  {
    label: 'Preparation',
    emoji: '🎯',
    items: [
      { href: '/interview-prep', label: 'Interview Prep', icon: MessageCircleQuestion },
      { href: '/mock-interview', label: 'Mock Interview', icon: Mic },
    ],
  },
];

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function DashboardSidebar({ open, onClose, isCollapsed = false, onToggleCollapse }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 bg-[#f5faf8] border-r border-ink/10 flex flex-col z-50 transition-all duration-300 overflow-hidden',
          isCollapsed ? 'w-20' : 'w-60',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo / Toggle button */}
        <div 
          className={cn(
            "h-16 flex items-center px-5 border-b border-ink/10 shrink-0 cursor-pointer hover:bg-ink/5 transition-colors",
            isCollapsed ? "justify-center px-0" : "justify-between"
          )}
          onClick={onToggleCollapse}
          title="Toggle Sidebar"
        >
          {isCollapsed ? (
            <BrandMark className="w-8 h-8" />
          ) : (
            <BrandLogo markClassName="w-7 h-7" textClassName="text-sm" />
          )}
          
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="md:hidden text-ink-muted hover:text-ink transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 overflow-x-hidden">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {isCollapsed ? (
                <div className="flex justify-center mb-3">
                  <span className="text-lg opacity-70" title={section.label}>{section.emoji}</span>
                </div>
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted px-2 mb-2 flex items-center gap-1.5">
                  <span>{section.emoji}</span> {section.label}
                </p>
              )}
              
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  if (item.highlight) {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => { if (!isCollapsed) onClose(); }}
                          title={item.label}
                          className={cn(
                            "flex items-center rounded-md font-semibold bg-brand-sea-green text-white hover:bg-opacity-90 transition-colors",
                            isCollapsed ? "justify-center p-3 mx-auto w-12" : "gap-2.5 px-3 py-2 text-sm"
                          )}
                        >
                          <item.icon className="w-4.5 h-4.5 shrink-0" />
                          {!isCollapsed && (
                            <>
                              {item.label}
                              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => { if (!isCollapsed) onClose(); }}
                        title={item.label}
                        className={cn(
                          'flex items-center rounded-md font-medium transition-colors relative',
                          isCollapsed ? "justify-center p-3 mx-auto w-12" : "gap-2.5 px-3 py-2 text-sm",
                          isActive
                            ? 'bg-brand-sea-green/10 text-brand-sea-green'
                            : 'text-ink-soft hover:text-ink hover:bg-ink/5'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'w-4.5 h-4.5 shrink-0',
                            isActive ? 'text-brand-sea-green' : 'text-ink-muted'
                          )}
                        />
                        {!isCollapsed && item.label}
                        
                        {/* Active Indicator dot */}
                        {isActive && (
                          <div className={cn(
                            "absolute rounded-full bg-brand-sea-green",
                            isCollapsed ? "w-1.5 h-1.5 right-1.5 top-1.5" : "w-1.5 h-1.5 ml-auto right-3"
                          )} />
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
        <div className="shrink-0 border-t border-ink/10 p-3 flex justify-center">
          <Link
            href="/account/settings"
            title="Settings"
            className={cn(
              'flex items-center rounded-md font-medium transition-colors w-full',
              isCollapsed ? "justify-center p-3" : "gap-2.5 px-3 py-2 text-sm",
              pathname.startsWith('/account')
                ? 'bg-ink/5 text-ink'
                : 'text-ink-muted hover:text-ink hover:bg-ink/5'
            )}
          >
            <Settings className="w-4.5 h-4.5 shrink-0" />
            {!isCollapsed && 'Settings'}
          </Link>
        </div>
      </aside>
    </>
  );
}
