/**
 * GetJobFit.in Chrome Extension — Popup Script
 */

const content = document.getElementById('content');

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showNoJob('Open a job posting on LinkedIn, Naukri, Indeed, or Glassdoor.');
      return;
    }

    // Inject content script if not already there (for manually opened popups)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch (_) {
      // Already injected, fine
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });

    if (response?.job && (response.job.title || response.job.description)) {
      showJob(response.job);
    } else {
      showNoJob('No job detected on this page. Try opening a specific job listing.');
    }
  } catch (err) {
    showNoJob('Navigate to a job posting on a supported site.');
  }
}

function showJob(job) {
  content.innerHTML = `
    <div class="job-card">
      <div class="job-title">${escHtml(job.title || 'Untitled Job')}</div>
      ${job.company ? `<div class="job-company">${escHtml(job.company)}</div>` : ''}
      <div class="job-source"><span class="dot"></span>${escHtml(job.source || '')}</div>
    </div>
    <button class="btn btn-primary" id="sendBtn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      Send to GetJobFit workspace
    </button>
    <button class="btn btn-secondary" id="dashBtn">Open dashboard</button>
  `;

  document.getElementById('sendBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SEND_JOB_TO_GETJOBFIT', job });
    window.close();
  });

  document.getElementById('dashBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://getjobfit.in/dashboard' });
    window.close();
  });
}

function showNoJob(msg) {
  content.innerHTML = `
    <div class="no-job">
      <div style="font-size:24px;margin-bottom:8px;">📋</div>
      <strong>No job detected</strong>
      ${escHtml(msg)}
    </div>
    <button class="btn btn-secondary" id="dashBtn" style="margin-top:0">Open workspace manually</button>
  `;
  document.getElementById('dashBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://getjobfit.in/jobs/new' });
    window.close();
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
