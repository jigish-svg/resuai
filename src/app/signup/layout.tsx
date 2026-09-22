import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up Free',
  description:
    'Create your free GetJobFit.ai account and start matching your resume to job descriptions with evidence-based AI in minutes.',
  alternates: { canonical: '/signup' },
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
