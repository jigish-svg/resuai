import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface RelatedLink {
  href: string;
  label: string;
}

interface GuideShellProps {
  title: string;
  dek: string;
  updated: string;
  children: React.ReactNode;
  related?: RelatedLink[];
}

export default function GuideShell({ title, dek, updated, children, related = [] }: GuideShellProps) {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <nav className="border-b border-black/[0.06] glass">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo markClassName="w-8 h-8" textClassName="text-lg" />
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/guides" className="text-sm font-medium text-brand-primary hover:text-brand-primary-dark mb-6 inline-block">
          ← All guides
        </Link>
        <h1 className="text-4xl font-bold mb-3 text-gray-900 tracking-tight">{title}</h1>
        <p className="text-lg text-gray-500 mb-3 leading-relaxed">{dek}</p>
        <p className="text-sm text-gray-400 mb-12">Last updated: {updated}</p>

        <article className="glass rounded-2xl p-8 md:p-10 border border-black/[0.06] space-y-8 text-gray-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-brand-primary [&_a]:hover:text-brand-primary-dark [&_a]:underline">
          {children}
        </article>

        <div className="mt-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 p-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-medium text-gray-800">See your own match score against a real job in a couple of minutes.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-colors px-5 py-2.5 rounded-full font-semibold text-sm shrink-0"
          >
            Try it free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <p className="text-sm font-semibold text-gray-500 mb-3">Related guides</p>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="text-brand-primary hover:text-brand-primary-dark underline text-sm">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
