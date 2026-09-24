# 9. Resume parsing

## 9A. Canonical resume model

| **Section** | **Fields** | **Notes** |
|---|---|---|
| schema_version | string | Increment on breaking change. |
| identity | name, email, phone?, location?, links\[\] (label, url) | No placeholder values. Empty stays empty. |
| summary | item_id, text | Optional. |
| experience\[\] | item_id, company, title, employment_type?, start (YYYY-MM or YYYY), end (or null), is_current, location?, bullets\[\] (item_id, text) | Dates normalised, raw string kept. |
| education\[\] | item_id, institution, degree, field?, level (enum), start?, end?, grade?, bullets\[\]? | level feeds education requirements. |
| projects\[\] | item_id, name, role?, description?, tools\[\], outcome?, link?, start?, end?, bullets\[\] | First-class evidence. |
| skills\[\] | item_id, name, concept_id?, group? | Always strength claimed. |
| certifications\[\] | item_id, name, issuer?, date?, expiry?, credential_url?, proof_document_id?, verification (none, document, issuer_link) | A recommendation is never stored here. |
| awards\[\] | item_id, text, date? | Other achievements are bullets. |
| languages\[\] | item_id, name, level? | |
| sections\[\] | item_id, title, text | Custom sections. |
| Per-item meta | source (document_id, path, char_start, char_end), extraction_method (rule or model), confidence tier, user_edited | Preserves source location. |

## 9B. Rules

| **Rule** | **Definition** |
|---|---|
| Verbatim text | Every bullet and description must appear in the source text (fuzzy match with a configurable threshold). Otherwise it is flagged unverified_text and shown for review. |
| Skills | Skills attached to a bullet come from concept matching on the bullet text, not from the model. **FACT:** today the model assigns skills per bullet and edits leave them stale. |
| Dates | Parsed by rules. Ambiguous dates are flagged, not guessed. |
| Source text | The original extracted text is kept as source_text. After edits, evidence paths point to the new version's item text. There is no separate raw text that can drift (**FACT:** today it can). |
| Versions | A ResumeVersion is a mutable draft until it is sealed (an analysis starts or an export happens). Sealed versions are immutable. New edits make a new draft. |
| Schema check | Server-side validation of every write. The client is never trusted (**FACT:** today it is). |
| Failure | Unreadable file, no text, or no sections: stop and ask for pasted text. |

**Evidence mapping.** Each item with text creates an evidence item whose source_ref points to its path and character span in the version's canonical text. Editing an item creates a new evidence row with the same lineage_id and a new hash.
