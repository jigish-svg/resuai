import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — GetJobFit.ai',
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: August 31, 2026</p>

        <div className="glass rounded-2xl p-8 md:p-10 border border-black/[0.06] space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p>
              This policy explains what information GetJobFit.ai collects, how it&apos;s used, and who it&apos;s shared with. We
              built this app to help you land a job — not to profit from your data — so this is written to be
              plain and specific about what actually happens to what you give us, not generic boilerplate.
            </p>
          </section>

          <Section title="1. What we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information:</strong> your name and email address when you sign up. Your password
                is handled entirely by our authentication provider (Supabase) and is never visible to us in
                plain text.
              </li>
              <li>
                <strong>Contact details:</strong> phone number, location, LinkedIn URL, and website, if you choose
                to add them to a resume profile.
              </li>
              <li>
                <strong>Resume content:</strong> your work history, education, skills, certifications, and
                achievement bullet points — whichever way you provide them (uploading a PDF/DOCX, pasting text,
                or typing them into the template builder). We also keep the full text of what you uploaded or
                pasted, since our AI fact-checking feature (&quot;Truth Guard&quot;) needs the original source
                text to verify that tailored suggestions don&apos;t go beyond what you actually wrote.
              </li>
              <li>
                <strong>Job description content:</strong> the text of any job posting you paste or upload for
                matching or tailoring.
              </li>
              <li>
                <strong>Product activity:</strong> the jobs you track, match scores, tailored resume versions,
                cover letters, interview prep content, and messages you send to the Interview Coach chat feature.
              </li>
              <li>
                <strong>Basic technical data:</strong> standard request metadata (like IP address and browser
                type) that our hosting provider (Vercel) processes automatically to serve the app and protect it
                against abuse.
              </li>
            </ul>
          </Section>

          <Section title="2. How we use it">
            <ul className="list-disc pl-5 space-y-2">
              <li>To extract structured information from your resume and job descriptions.</li>
              <li>To generate evidence-based match scores between your resume and a job.</li>
              <li>
                To generate tailored resume suggestions, ATS scoring, cover letters, and interview preparation
                content — always built from what you&apos;ve actually provided, never invented.
              </li>
              <li>
                To answer questions you ask the Interview Coach chat feature, which may include performing a web
                search on your behalf (see Section 3) to answer questions about a specific company.
              </li>
              <li>To operate core account features: authentication, saving your jobs and resumes, and your plan status.</li>
            </ul>
            <p className="mt-3">We do not sell your data, and we do not use it for advertising.</p>
          </Section>

          <Section title="3. Who we share it with">
            <p className="mb-3">
              We use a small number of service providers to run the app. Each only receives what it needs to do
              its job:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>OpenAI</strong> — resume text, job description text, and Interview Coach chat messages are
                sent to OpenAI&apos;s API to power every AI feature in the app (parsing, matching, tailoring,
                cover letters, interview prep, and chat). Some Interview Coach questions may trigger OpenAI to
                perform a live web search to answer questions about a company. Data sent through OpenAI&apos;s API
                is governed by{' '}
                <a href="https://openai.com/policies" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-primary-dark underline">
                  OpenAI&apos;s own API data usage policies
                </a>
                .
              </li>
              <li>
                <strong>Supabase</strong> — our database, authentication, and storage provider. All app data
                (your account, resumes, jobs, matches, etc.) is stored in a Supabase-hosted database, protected by
                row-level security so only your own account can access it.
              </li>
              <li>
                <strong>Vercel</strong> — hosts the application itself and processes standard web request
                metadata to serve pages and protect against abuse.
              </li>
            </ul>
            <p className="mt-3">
              We do not otherwise share, sell, or rent your personal information to third parties. Billing is not
              yet enabled on this app; if we add paid subscriptions with a payment processor in the future, this
              policy will be updated before that processor receives any of your information.
            </p>
          </Section>

          <Section title="4. How we protect it">
            <ul className="list-disc pl-5 space-y-2">
              <li>Every table in our database enforces row-level security — your data is only ever readable by your own account.</li>
              <li>Passwords are never stored or seen by us in plain text; that&apos;s handled entirely by Supabase Auth.</li>
              <li>All traffic to and from the app is encrypted in transit (HTTPS).</li>
              <li>Sensitive account actions are protected by rate limiting to reduce the risk of automated abuse.</li>
            </ul>
          </Section>

          <Section title="5. Cookies">
            <p>
              We use a single essential cookie set by our authentication provider to keep you signed in. We do
              not use advertising or third-party tracking cookies.
            </p>
          </Section>

          <Section title="6. Your choices and rights">
            <p className="mb-3">
              You can view, edit, or delete individual resumes and jobs directly within the app at any time. You
              can also permanently delete your entire account and all associated data yourself, at any time,
              from <strong>Account Settings</strong> — this immediately and permanently removes your profile,
              resumes, jobs, matches, tailored resumes, cover letters, and interview prep history. This action
              can&apos;t be undone.
            </p>
            <p>
              Depending on where you live, you may have additional rights over your data (for example, under
              GDPR or CCPA). For anything the in-app deletion doesn&apos;t cover, email{' '}
              <a href="mailto:jigish2050@gmail.com" className="text-brand-primary hover:text-brand-primary-dark underline">
                jigish2050@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section title="7. Children's privacy">
            <p>This app is not directed at children under 16, and we do not knowingly collect data from them.</p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>
              If this policy changes in a meaningful way, we&apos;ll update the date at the top of this page.
              Continuing to use the app after a change means you accept the updated policy.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about this policy or your data? Email{' '}
              <a href="mailto:jigish2050@gmail.com" className="text-brand-primary hover:text-brand-primary-dark underline">
                jigish2050@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
