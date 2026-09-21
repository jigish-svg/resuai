import type { Metadata } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GetJobFit.ai — Evidence-Based Resume Tailoring',
  description:
    'Match your resume to any job description with AI-powered evidence matching, Truth Guard verification, and ATS optimization. Never fabricate — only your real achievements, perfectly presented.',
  keywords: 'resume builder, AI resume, job matching, ATS optimization, resume tailoring',
  openGraph: {
    title: 'GetJobFit.ai — Evidence-Based Resume Tailoring',
    description: 'Match your resume to any job with real evidence, not fabrication.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${hanken.variable} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgb(255 255 255)',
              color: 'rgb(29 27 23)',
              border: '1px solid rgba(29,27,23,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(29,27,23,0.08)',
            },
            success: {
              iconTheme: {
                primary: '#00864c',
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
