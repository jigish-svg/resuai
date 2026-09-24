# 13. Cover letter

| **Item** | **Definition** |
|---|---|
| Inputs | Job title, company, requirements. The Backed up results with their evidence. Optional user-provided text (for example why they want the role). Nothing else. |
| Plan | Rules choose up to three Backed up requirements by weight, and the strongest evidence for each. |
| Generation | A model writes short paragraphs and marks every factual sentence with the evidence ids it uses. Greeting, closing and "I am applying for {title} at {company}" are allowed unmarked. |
| Company facts | Only from the job text, quoted, or from user-provided text. No outside claims about the company. |
| Forbidden | A hiring manager name, dates, contact details, invented motivation ("I am passionate about…") unless the user provided it, any skill or experience not in evidence, any claim about a requirement that is Unsupported or To verify. |
| Validation | The Claim Validator runs on each sentence. A sentence with no evidence and a factual atom is removed. Needs-confirmation sentences are shown as prompts. |
| Edits | Re-validated on save. New factual claims need "Yes, this is true" and become user_statement evidence. |
| Export | Requires validation status pass or every prompt resolved. |
| Storage | CoverLetter with segments (id, text, claim_type, evidence_ids), validator result, confirmed atoms, version. |
| Language | English in the MVP (OQ-6). |
