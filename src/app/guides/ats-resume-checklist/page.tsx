import { SITE_URL } from '@/lib/seo';
import GuideShell from '@/components/guides/GuideShell';

export const metadata = {
  title: 'ATS Resume Checklist: What Applicant Tracking Systems Actually Check',
  description:
    'The specific formatting, structure, and content rules Applicant Tracking Systems check for, and how to pass them without keyword-stuffing.',
  alternates: { canonical: '/guides/ats-resume-checklist' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'ATS Resume Checklist: What Applicant Tracking Systems Actually Check',
  description: metadata.description,
  author: { '@type': 'Organization', name: 'GetJobFit.ai' },
  publisher: { '@type': 'Organization', name: 'GetJobFit.ai' },
  mainEntityOfPage: `${SITE_URL}/guides/ats-resume-checklist`,
  datePublished: '2026-09-22',
  dateModified: '2026-09-22',
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GuideShell
        title="ATS Resume Checklist: What Applicant Tracking Systems Actually Check"
        dek="Most ATS rejections come from a handful of fixable formatting mistakes, not a lack of qualifications."
        updated="September 22, 2026"
        related={[
          { href: '/guides/how-to-tailor-your-resume-for-each-job', label: 'How to Tailor Your Resume for Each Job Application' },
          { href: '/guides/is-ai-resume-tailoring-safe', label: 'Is It Safe to Use AI to Tailor Your Resume?' },
        ]}
      >
        <section>
          <h2>What an ATS actually does</h2>
          <p>
            An Applicant Tracking System (ATS) is software recruiters use to collect, parse, and search applications.
            Modern ATS platforms rarely auto-reject candidates outright, but they do two things that affect whether a
            human ever reads your resume: they parse your resume into structured fields (name, title, dates, skills),
            and they let recruiters search and filter that parsed data by keyword. A resume that parses badly, or
            doesn&apos;t contain a recruiter&apos;s search terms, is much less likely to surface.
          </p>
        </section>

        <section>
          <h2>Formatting checklist</h2>
          <ul>
            <li>Use standard section headings: &quot;Experience,&quot; &quot;Education,&quot; &quot;Skills&quot; — not creative alternatives like &quot;My Journey.&quot;</li>
            <li>Avoid tables, text boxes, and multi-column layouts for core content; many parsers read these out of order or drop them entirely.</li>
            <li>Use a standard, ATS-readable font and avoid embedding key details (like your job title) only inside images or graphics.</li>
            <li>Include your contact information as plain text, not inside a header/footer some parsers skip.</li>
            <li>Use consistent date formats (e.g. &quot;Jan 2023 – Present&quot;) so employment gaps and durations parse correctly.</li>
            <li>Save as a standard .docx or a text-based (not scanned-image) PDF.</li>
          </ul>
        </section>

        <section>
          <h2>Content checklist</h2>
          <ul>
            <li>Mirror the exact terminology from the job description for your real skills (e.g. if you know &quot;Node.js,&quot; write &quot;Node.js,&quot; not just &quot;JavaScript backend&quot;).</li>
            <li>Include both the spelled-out term and the acronym where relevant (&quot;Search Engine Optimization (SEO)&quot;).</li>
            <li>List required skills you genuinely have — don&apos;t add ones from the posting that you don&apos;t, since that surfaces as a real gap the moment a human reads the resume or asks about it.</li>
            <li>Keep it to a reasonable length (typically one page for under ~8 years of experience, two pages beyond that).</li>
          </ul>
        </section>

        <section>
          <h2>The keyword-stuffing trap</h2>
          <p>
            A common mistake is dumping every keyword from a job posting into a resume regardless of whether it&apos;s
            true, sometimes in invisible white text. This doesn&apos;t work reliably against modern ATS software and
            creates the exact fabrication risk described in{' '}
            <a href="/guides/is-ai-resume-tailoring-safe">our guide on AI resume tailoring safety</a>: even if it gets
            you past a keyword filter, it fails the moment a human reads the resume or asks a follow-up question.
          </p>
        </section>

        <section>
          <h2>How GetJobFit.ai checks this for you</h2>
          <p>
            GetJobFit.ai&apos;s ATS Check reviews your resume against a job&apos;s specific terms — checking contact details,
            standard section headers, keyword coverage, date formatting, and length — as part of its overall match
            score, so formatting problems surface before you apply instead of after a silent rejection.
          </p>
        </section>
      </GuideShell>
    </>
  );
}
