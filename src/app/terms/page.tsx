import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — GetJobFit.ai',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <nav className="border-b border-black/[0.06] glass">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GetJobFit.ai</span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: August 31, 2026</p>

        <div className="glass rounded-2xl p-8 md:p-10 border border-black/[0.06] space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p>
              These terms govern your use of GetJobFit.ai (&quot;the app,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account or using
              the app, you agree to them. See our{' '}
              <Link href="/privacy" className="text-brand-green hover:text-brand-green-dark underline">
                Privacy Policy
              </Link>{' '}
              for how we handle your data.
            </p>
          </section>

          <Section title="1. What the service does">
            <p>
              GetJobFit.ai helps you build, evaluate, and tailor your resume against job descriptions using AI. It
              extracts your real achievements into an evidence library, scores how well your resume matches a
              job, suggests reworded bullets and tailoring changes grounded in your own experience, generates
              cover letters and interview preparation content, and lets you export the result as a PDF or DOCX.
            </p>
          </Section>

          <Section title="2. Your account">
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate information when creating an account and keep your login credentials secure.</li>
              <li>You&apos;re responsible for all activity that happens under your account.</li>
              <li>You must be at least 16 years old to use this service.</li>
              <li>One account per person — don&apos;t share credentials or create accounts to evade usage limits.</li>
            </ul>
          </Section>

          <Section title="3. Accuracy is your responsibility">
            <p className="mb-3">
              We built this app around a &quot;Truth Guard&quot; principle: our AI features are designed to only
              rephrase, reorganize, and highlight achievements you&apos;ve actually told us about — never to
              invent skills, employers, metrics, or experience you don&apos;t have.
            </p>
            <p>
              That said, you are ultimately responsible for what you submit to employers. Review every
              AI-generated suggestion — resume bullets, cover letters, tailoring changes, ATS optimizations —
              before using it, and don&apos;t submit anything you can&apos;t honestly stand behind in an interview.
              You must not use this service to misrepresent your qualifications, identity, or work history.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Attempt to bypass rate limits, security controls, or free-tier restrictions.</li>
              <li>Scrape, reverse-engineer, or resell access to the app or its underlying data.</li>
              <li>Upload content that is unlawful, infringing, or belongs to someone else without their permission.</li>
              <li>Use the service to build application materials for someone other than yourself without their knowledge and consent.</li>
              <li>Interfere with the app&apos;s normal operation or attempt to access another user&apos;s data.</li>
            </ul>
            <p className="mt-3">We may suspend or terminate accounts that violate these terms.</p>
          </Section>

          <Section title="5. Plans and billing">
            <p className="mb-3">
              The app offers a free tier with limited usage (a capped number of tracked jobs and one resume
              profile) and paid tiers (weekly, monthly, and yearly) that unlock additional features such as
              JD-specific tailoring, Interview Prep, multiple resume profiles, and cover letter generation.
            </p>
            <p>
              Automated billing is not yet active on this app — paid access is currently granted manually. Once
              automated subscription billing is introduced, this section will be updated to describe renewal,
              cancellation, and refund terms before any payment is collected, and you&apos;ll be asked to agree to
              the updated terms.
            </p>
          </Section>

          <Section title="6. AI-generated and third-party content">
            <p>
              Match scores, rewritten bullets, cover letters, interview questions, and chat answers (including
              anything the Interview Coach finds via web search) are generated by AI and may occasionally be
              incomplete, outdated, or inaccurate — particularly claims about a specific company&apos;s recent
              news or projects. Always independently verify anything you plan to rely on in an actual interview.
            </p>
          </Section>

          <Section title="7. Your content">
            <p>
              You own the resume, job description, and other content you submit. By using the app, you grant us
              a limited license to process that content (including sending it to our AI provider, OpenAI) solely
              to provide the service to you. We don&apos;t use your content to train AI models, and we don&apos;t sell it.
            </p>
          </Section>

          <Section title="8. No warranty">
            <p>
              The app is provided &quot;as is.&quot; We don&apos;t guarantee that using it will result in interviews or job
              offers, that match scores are perfectly accurate, or that the service will be uninterrupted or
              error-free.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the fullest extent permitted by law, we are not liable for indirect, incidental, or
              consequential damages arising from your use of the app, including outcomes of job applications or
              interviews.
            </p>
          </Section>

          <Section title="10. Changes to these terms">
            <p>
              We may update these terms as the app changes. If a change is significant, we&apos;ll update the date
              at the top of this page. Continuing to use the app after a change means you accept the updated terms.
            </p>
          </Section>

          <Section title="11. Governing law">
            <p>
              [Placeholder — the specific jurisdiction/governing law for these terms should be filled in based on
              where this business is legally established, ideally with input from a lawyer before relying on this
              clause.]
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about these terms? Email{' '}
              <a href="mailto:jigish2050@gmail.com" className="text-brand-green hover:text-brand-green-dark underline">
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
