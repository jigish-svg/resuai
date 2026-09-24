# 18. Certifications

| **Topic** | **Rule** |
|---|---|
| Trigger | A requirement result is Needs attention or Unsupported; necessity is required or preferred; kind is hard_skill, tool, technology or certification; the concept has at least one registry resource with status ok. Never for by-design kinds. |
| Where it appears | Inside the evidence sheet of that requirement, one line: "Learn: {provider}". At most two links. No Learning page. |
| Status | A suggestion. It never changes the score, the resume, evidence or the Skills list. |
| Completion | "I finished this" asks for proof: a file, a verifiable link, or a project. Without proof it stays a suggestion. |
| Proof | Creates an evidence item (kind certification), strength evidenced for a file, verified only when an issuer link matches name, issuer and date. |
| Registry | ResourceRegistry rows with concept, provider, title, url, status (ok, broken, unchecked) and last_checked_at. A scheduled job checks links. Users see only status ok. AI never writes a URL. Placeholder links exist only in development. |
| Quizzes | **FACT:** today a passed quiz can add a skill to the resume. **DECISION:** a quiz result is a practice note only. |
| Verification of issuer links | Whether a public badge page can be read automatically, and under what terms, is untested (OQ-9). Until tested, "Verified link" is not offered. |
