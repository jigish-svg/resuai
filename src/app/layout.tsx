import type { Metadata } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

const TITLE = 'GetJobFit.ai — Evidence-Based Resume Tailoring';
const DESCRIPTION =
  'Match your resume to any job description with AI-powered evidence matching, Truth Guard verification, and ATS optimization. Never fabricate — only your real achievements, perfectly presented.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'resume builder',
    'AI resume',
    'resume tailoring',
    'job matching',
    'ATS optimization',
    'ATS resume checker',
    'resume for job description',
    'AI cover letter',
    'mock interview practice',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    title: TITLE,
    description: 'Match your resume to any job with real evidence, not fabrication.',
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'Match your resume to any job with real evidence, not fabrication.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${hanken.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgb(255 255 255)',
              color: 'rgb(22 28 24)',
              border: '1px solid rgba(22,28,24,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(22,28,24,0.08)',
            },
            success: {
              iconTheme: {
                primary: '#006d39',
                secondary: 'rgb(255 255 255)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ba1a1a',
                secondary: 'rgb(255 255 255)',
              },
            },
          }}
        />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
