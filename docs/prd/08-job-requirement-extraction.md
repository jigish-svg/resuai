# 8. Job requirement extraction

## 8A. Kinds

| **Kind** | **Examples** | **Extracted by** | **Scoring dimension** | **Scored?** |
|---|---|---|---|---|
| hard_skill | financial modelling, clinical triage | Dictionary, then model with quote | Skills and tools | Yes |
| tool | Excel, Salesforce, Figma | Dictionary | Skills and tools | Yes |
| technology | PostgreSQL, Kubernetes | Dictionary | Skills and tools | Yes |
| responsibility | manage a team of 5, prepare monthly reports | Model with quote | Responsibilities and domain | Yes |
| domain | healthcare, fintech | Dictionary and model | Responsibilities and domain | Yes |
| experience | 5+ years in sales | Numeric rules | Experience and seniority | Yes |
| seniority | Senior, Lead | Title and text rules | Experience and seniority | Yes |
| education | Bachelor's in Nursing | Level rules | Education | Yes |
| certification | CPA, RN licence, PMP | Dictionary and rules | Certifications and licences | Yes |
| soft_skill | stakeholder communication | Dictionary and model with quote | Soft skills and languages | Yes |
| language | fluent German | Rules | Soft skills and languages | Yes |
| location | Berlin, hybrid | Rules | None | No. To verify by design. |
| work_authorization | authorised to work in the US | Rules | None | No. To verify by design. |
| other | security clearance, travel, shifts | Rules | None | No. To verify by design. |

## 8B. Necessity, importance and must-haves

| **Item** | **Rule** | **Value** |
|---|---|---|
| required | Cues: required, must have, must, mandatory, minimum, essential. Or an unmarked item under headings such as Requirements, Qualifications, What you need, Minimum qualifications. | Weight 1.0 |
| preferred | Cues: preferred, ideally, desired, familiarity with. Or items under Preferred or Desired headings. Also the default for an item with no cue outside a requirements section. | Weight 0.5 |
| nice_to_have | Cues: nice to have, a plus, bonus. | Weight 0.25 |
| unspecified | Responsibilities without cues. Treated as preferred. | Weight 0.5 |
| Must-have flag | necessity is required AND kind is hard_skill, tool, technology, experience, education or certification. Responsibilities and soft skills are never must-haves. | DECISION |
| Importance (display only) | high for required, medium for preferred, low for nice-to-have, raised one level if mentioned in the title or two or more times. Used to order lists. Not used in the score. | DECISION |

## 8C. Numeric requirements

| **Pattern** | **Normalised form** |
|---|---|
| "5+ years", "at least 3 years", "minimum of 2 years" | comparator \>=, value, unit years. |
| "3-5 years" | comparator \>=, value 3 (the lower bound). |
| "up to 3 years" | Informational. Not scored. |
| "team of 5", "10+ direct reports" | comparator \>=, value, unit count, of_concept. |
| "Bachelor's degree" | Education level from an ordinal ladder: secondary, associate, bachelor, master, doctorate. |
| Seniority words | Mapped to a years band by a configurable table (proposed). Treated as a numeric requirement. |

## 8D. Structure, origin and confidence

| **Item** | **Rule** |
|---|---|
| AND lists | Split into separate requirements ("Python and SQL" becomes two). |
| OR groups | One requirement with alternatives. Satisfied if any alternative is. The result names which one. |
| "or equivalent" | The named item plus an equivalent flag. If the named item is absent and equivalence is unclear, the result is To verify (ambiguous_requirement). |
| Origin | stated: has a source quote with positions in the job text. inferred: no quote. **DECISION:** inferred items are stored as optional prompts (at most 5), shown collapsed under "Not in the job post", and never scored. A database constraint forbids origin = inferred with affects_score = true. The feature can be switched off by configuration. |
| Confidence | high: rule cue plus exact quote. medium: model with exact quote. low: model with fuzzy quote or an unclear cue. Low items appear in the Review list and default to preferred. |

## 8E. Acceptance

- Every stated requirement has a source quote found in the job text (checked in code). **DECISION.**

- No inferred requirement affects the score (database constraint and test). **DECISION.**

- Extraction precision and recall on the labelled set are measured, then thresholds are set from the baseline. No number is promised here.
