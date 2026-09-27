/**
 * GetJobFit.in Chrome Extension — Content Script
 * Detects job postings on supported job boards and extracts structured data.
 */

const SITE_PATTERNS = {
  linkedin: {
    detect: () => window.location.href.includes('linkedin.com/jobs'),
    title: () =>
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('h1.top-card-layout__title')?.textContent?.trim() ||
      '',
    company: () =>
      document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() ||
      document.querySelector('a.topcard__org-name-link')?.textContent?.trim() ||
      '',
    description: () =>
      document.querySelector('.jobs-description__content')?.innerText?.trim() ||
      document.querySelector('.description__text')?.innerText?.trim() ||
      '',
  },
  naukri: {
    detect: () => window.location.href.includes('naukri.com'),
    title: () => document.querySelector('h1.jd-header-title')?.textContent?.trim() || '',
    company: () => document.querySelector('.jd-header-comp-name')?.textContent?.trim() || '',
    description: () => document.querySelector('.job-desc')?.innerText?.trim() || '',
  },
  indeed: {
    detect: () => window.location.href.includes('indeed.com'),
    title: () =>
      document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() || '',
    company: () =>
      document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '',
    description: () =>
      document.querySelector('#jobDescriptionText')?.innerText?.trim() || '',
  },
  glassdoor: {
    detect: () => window.location.href.includes('glassdoor.com'),
    title: () =>
      document.querySelector('[data-test="job-title"]')?.textContent?.trim() || '',
    company: () =>
      document.querySelector('[data-test="employer-name"]')?.textContent?.trim() || '',
    description: () =>
      document.querySelector('.job-description')?.innerText?.trim() || '',
  },
};

function detectJob() {
  for (const [, extractor] of Object.entries(SITE_PATTERNS)) {
    if (extractor.detect()) {
      const title = extractor.title();
      const company = extractor.company();
      const description = extractor.description();
      if (title || description) {
        return { title, company, description, url: window.location.href, source: window.location.hostname };
      }
    }
  }
  return null;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB') {
    const job = detectJob();
    sendResponse({ job });
  }
  return true;
});

// Notify background of detected job
const job = detectJob();
if (job) {
  chrome.runtime.sendMessage({ type: 'JOB_DETECTED', job });
}
