# GetJobFit.in — Chrome Extension

Detect job postings on any job board and send them directly to your GetJobFit workspace.

## Supported Sites
- LinkedIn Jobs
- Naukri.com
- Indeed
- Glassdoor
- Shine.com
- Instahyre

## How to Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The GetJobFit icon appears in your toolbar

## How to Use

1. Navigate to any job posting on a supported site
2. Click the GetJobFit.in extension icon
3. The job title, company, and description are auto-detected
4. Click **Send to GetJobFit workspace** — it opens a pre-filled new job page

## Structure

```
extension/
├── manifest.json       # Extension config
├── background.js       # Service worker
├── content.js          # Job detection (injected into job sites)
├── popup.html          # The popup UI
├── popup.js            # Popup logic
└── icons/              # Extension icons (16, 48, 128 px)
```

## Building Icons

You need PNG icons at 3 sizes. Generate them from the GetJobFit brand mark SVG:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

Or reuse the `src/app/icon.tsx` design and export as PNG at those sizes.

## Notes

- The extension only reads page content — it never modifies job sites
- Job data is sent to `getjobfit.in/jobs/new` as URL params, not stored locally
- No authentication required for detection; workspace login happens on the GetJobFit site
