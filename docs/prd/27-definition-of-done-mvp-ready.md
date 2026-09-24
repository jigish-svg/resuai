# 27. Definition of done (MVP-ready)

## Product

- A new user can go from sign-in to an exported tailored resume, a validated letter and interview preparation for a real job, on desktop and phone.

- Job link input works for pages with structured job data and falls back cleanly for blocked, login and empty pages. Paste always works.

- Navigation is two destinations and the Application page. No removed screen remains reachable except by redirect.

- Home, Fit, Evidence, Improve, Letter, Interview and Documents match the specifications.

## Correctness

- Score tests pass. The score reads only validated results. Practice, quizzes, clicks and tailoring cannot change it.

- Four evidence states with reason codes on every result. Wording rules followed. No "you do not have this" for absent evidence.

- Inferred requirements are unscored, by constraint and test.

- The Claim Validator runs on every generated-text path and at export. The adversarial suite has zero accepted unsupported changes.

## Security

- Cross-user, upload, SSRF, robots and injection tests pass. Fail-closed limits on AI routes. Audit log complete.

- Provider data-use terms confirmed and reflected in the privacy policy.

## Quality

- The evaluation harness runs in CI with a stated case count and baseline. Thresholds agreed and met.

- Unit, integration and end-to-end suites green. No open blocking defect.

- Experiments 1, 2 and 6 run, with results recorded.

## Data and operations

- Data migrated from the old tables. Analytics events firing. Cost per analysis, letter, interview prep and voice minute measured.

- Error monitoring and runbooks in place.

## Explicitly not required

- Payment. A browser extension. LinkedIn analysis. Additional languages. An ATS score.
