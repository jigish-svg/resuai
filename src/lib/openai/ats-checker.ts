import { ATSCheckResult, ATSCheck } from '@/types/match';

interface ResumeForATS {
  candidateName: string;
  contactInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
  };
  sections: Array<{
    type: string;
    content: string;
  }>;
  targetKeywords: string[];
  text: string;
}

export function runATSCheck(resume: ResumeForATS): ATSCheckResult {
  const checks: ATSCheck[] = [];

  // 1. Contact information
  checks.push({
    label: 'Contact information detected',
    passed: !!(resume.contactInfo.email && resume.contactInfo.phone),
    message: !resume.contactInfo.email ? 'Email address is missing' : undefined,
  });

  // 2. Standard section headings
  const sectionTypes = resume.sections.map(s => s.type);
  const hasExperience = sectionTypes.includes('experience');
  const hasSkills = sectionTypes.includes('skills');
  const hasEducation = sectionTypes.includes('education');

  checks.push({
    label: 'Standard section headings (Experience, Skills, Education)',
    passed: hasExperience && hasSkills && hasEducation,
    message: !hasExperience ? 'Experience section missing' : !hasSkills ? 'Skills section missing' : !hasEducation ? 'Education section missing' : undefined,
  });

  // 3. Job keywords present
  const resumeTextLower = resume.text.toLowerCase();
  const keywordsFound = resume.targetKeywords.filter(kw =>
    resumeTextLower.includes(kw.toLowerCase())
  );
  const keywordCoverage = resume.targetKeywords.length > 0
    ? keywordsFound.length / resume.targetKeywords.length
    : 1;

  checks.push({
    label: 'Job keywords naturally included',
    passed: keywordCoverage >= 0.6,
    message: keywordCoverage < 0.6
      ? `Only ${Math.round(keywordCoverage * 100)}% of key terms found`
      : `${keywordsFound.length}/${resume.targetKeywords.length} keywords present`,
  });

  // 4. No keyword stuffing (same keyword repeated more than 5 times)
  const wordCounts: Record<string, number> = {};
  const words = resumeTextLower.split(/\s+/);
  for (const word of words) {
    if (word.length > 4) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  const stuffedKeywords = resume.targetKeywords.filter(kw => {
    const count = wordCounts[kw.toLowerCase()] || 0;
    return count > 5;
  });

  checks.push({
    label: 'No suspicious keyword stuffing',
    passed: stuffedKeywords.length === 0,
    message: stuffedKeywords.length > 0
      ? `Overused terms: ${stuffedKeywords.join(', ')}`
      : undefined,
  });

  // 5. Has professional summary
  const hasSummary = sectionTypes.includes('summary');
  checks.push({
    label: 'Professional summary present',
    passed: hasSummary,
    message: !hasSummary ? 'Consider adding a tailored professional summary' : undefined,
  });

  // 6. Dates consistent (at least has dates in experience)
  const experienceContent = resume.sections
    .filter(s => s.type === 'experience')
    .map(s => s.content)
    .join(' ');
  const hasYears = /20\d{2}/.test(experienceContent);
  checks.push({
    label: 'Dates consistent and present',
    passed: hasYears,
    message: !hasYears ? 'Include dates for work experience' : undefined,
  });

  // 7. No unsupported claims (defer to Truth Guard)
  checks.push({
    label: 'Truth Guard: No unsupported claims',
    passed: true, // updated after Truth Guard runs
    message: 'Verified by Truth Guard',
  });

  // 8. Readable length (not too short, not too long)
  const wordCount = resume.text.split(/\s+/).length;
  const goodLength = wordCount >= 300 && wordCount <= 1200;
  checks.push({
    label: 'Appropriate resume length',
    passed: goodLength,
    message: wordCount < 300
      ? 'Resume is too short — add more detail'
      : wordCount > 1200
      ? 'Resume is very long — consider condensing'
      : `${wordCount} words`,
  });

  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return { score, checks };
}
