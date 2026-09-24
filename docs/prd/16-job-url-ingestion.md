# 16. Job URL ingestion

## 16A. Pipeline

| **Step** | **Rule** | **Note** |
|---|---|---|
| 1 Accept | Input is a link or text. Link mode only if it starts with http or https. | Reject other schemes. |
| 2 Policy check | Check the host against a configurable no-fetch list (starts with LinkedIn, whose terms name browser plug-ins and scrapers). Listed hosts return status needs_paste immediately with the paste message. | The list is reviewed (OQ-10). |
| 3 Network safety | Resolve DNS. Block private, loopback, link-local and cloud-metadata ranges. Only ports 80 and 443. At most 3 redirects, each re-checked. Total time and size caps (proposed: 15 s, 2 MB). HTML content types only. No cookies sent. Identifiable user agent. | Server-side request forgery protection. |
| 4 robots.txt | Fetch and respect robots.txt for the path (cache up to 24 h). Disallowed: status needs_paste. | |
| 5 Stop conditions | Status 401, 403 or 429. A login redirect. Bot-check markers. Empty or near-empty body. A page that needs script to show content. | Never work around any of these. |
| 6 Structured data | Parse JobPosting markup (JSON-LD). Map title, company, location, employment type, description, dates, salary. | Employers publish this for Google Jobs (Google Search Central). |
| 7 Visible text fallback | Extract the readable text, remove navigation and boilerplate. If both exist, use the structured description and cross-check with the text. | |
| 8 Extraction | Requirement extraction (section 8) on plain text only. The fetched content is untrusted. | |
| 9 Confirmation | The user sees title, company, location and requirement count, and confirms. | No analysis without confirmation. |
| 10 Store | source_url, fetched_at, method, content_hash, raw_text (plain text, never HTML), robots result. | |

## 16B. Ingest states

| **State** | **Meaning and copy** |
|---|---|
| queued, fetching, extracting | In progress. The client polls. |
| ready | Draft job available for confirmation. |
| needs_paste | Blocked, no-fetch, empty or script-only. Show: "This site will not let us read the page. Paste the job description instead." Keep the link. |
| failed | Unexpected error. "We could not read that. Paste the job description instead." |

## 16C. Acceptance

- Paste always works and is never removed.

- A request to a private or metadata address is refused in tests.

- A disallowed robots path never triggers a page request.

- A login wall, bot check or empty page ends in needs_paste, with no retry loops.

- Stored text is plain text. A page containing instructions to the model cannot change any result (section 21 tests).

- The list of sites known to work is published only after testing. Until then the promise is "Paste always works".
