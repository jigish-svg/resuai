/**
 * GetJobFit.in Chrome Extension — Background Service Worker
 */

const GETJOBFIT_ORIGIN = 'https://getjobfit.in';

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'JOB_DETECTED') {
    // Show the extension icon as active
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#48845A' });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && /linkedin\.com\/jobs|naukri\.com|indeed\.com|glassdoor\.com|shine\.com|instahyre\.com/.test(tab.url)) {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (_) {
    // Tab may have been closed
  }
});

// Handle sending job to GetJobFit.in
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SEND_JOB_TO_GETJOBFIT') {
    const { job } = message;
    const params = new URLSearchParams({
      title: job.title || '',
      company: job.company || '',
      description: job.description || '',
      source_url: job.url || '',
    });
    chrome.tabs.create({ url: `${GETJOBFIT_ORIGIN}/jobs/new?${params.toString()}` });
  }
});
