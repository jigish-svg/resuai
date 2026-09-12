import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgb(255 255 255)',
              color: 'rgb(40 42 58)',
              border: '1px solid rgba(20,20,43,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(20,20,43,0.08)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: 'rgb(255 255 255)',
              },
            },
            error: {
              iconTheme: {
                primary: '#e11d48',
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
