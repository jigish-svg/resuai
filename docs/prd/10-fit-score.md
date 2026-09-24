# 10. Fit score

**DECISION.** The score represents job fit and nothing else. Every number below is a **starting value, not empirically validated**.

## 10A. Dimensions and weights

| **Dimension** | **Requirement kinds** | **Weight (starting value)** |
|---|---|---|
| D1 Skills and tools | hard_skill, tool, technology | 0.35 |
| D2 Responsibilities and domain | responsibility, domain | 0.25 |
| D3 Experience and seniority | experience, seniority | 0.20 |
| D4 Education | education | 0.10 |
| D5 Certifications and licences | certification | 0.05 |
| D6 Soft skills and languages | soft_skill, language | 0.05 |
| Total | | 1.00 (asserted by a test) |

## 10B. Credit table

| **Result** | **Credit (starting values)** |
|---|---|
| Backed up, verified | 1.00 |
| Backed up, evidenced (including user-confirmed with context) | 0.85 |
| Needs attention: claimed_not_shown | 0.50 |
| Needs attention: adjacent_concept | 0.40 |
| Needs attention: judge_partial | 0.50 |
| Needs attention: years_short | min(1, actual years / required years) |
| Unsupported (all reasons) | 0 |
| To verify | Excluded |

## 10C. Calculation

| **Step** | **Rule** |
|---|---|
| 1 | Take the requirements of scored kinds (section 8) with origin = stated. |
| 2 | Give each a weight from necessity: required 1.0, preferred 0.5, nice-to-have 0.25, unspecified 0.5. |
| 3 | Give each a credit from the table. Exclude To verify items. |
| 4 | For each dimension with at least one evaluated requirement: S_d = sum(weight x credit) / sum(weight). |
| 5 | Renormalise dimension weights over active dimensions: W'\_d = W_d / sum of W over active dimensions. A dimension the job does not use never lowers the score and never gets a neutral fill. |
| 6 | Score = 100 x sum(W'\_d x S_d), rounded half up to a whole number. |
| 7 | If no dimension is active, or fewer than a minimum number of requirements were evaluated (placeholder: 3), the score is null and the screen says "Not enough to score yet." |
| 8 | Coverage = evaluated scored requirements / all scored-kind requirements. Displayed as "9 of 11 requirements checked". |
| 9 | Range: only for To verify items with reasons engine_gap, thin_evidence, judge_disagreement, ambiguous_requirement or low_confidence_extraction. Low = the score if all were Unsupported. High = the score if all were Backed up, verified. Shown only when High minus Low is at least a threshold (placeholder: 10 points). By-design items are never in the range. |
| 10 | Label: a band from the score (placeholders: 80 and above Strong fit, 65 to 79 Good fit, 45 to 64 Partial fit, below 45 Weak fit). Cap: if any must-have is Unsupported, the label cannot exceed Partial fit. |

## 10D. Inputs and special cases

| **Topic** | **Rule** |
|---|---|
| Allowed inputs | Requirement results (state, reason, strength). Requirement kind, necessity and numeric target. Computed years and education level. Score configuration version. |
| Never allowed | Quizzes, practice sessions, interview feedback, clicks, counts of documents or certifications, product engagement, plan or purchase, ATS or formatting, resume length, template, tailored text, time on site. |
| Tailoring | **DECISION:** accepting a rewording never changes the score. The score reads the candidate's evidence, not the tailored text. Only new or corrected evidence changes it. |
| Numeric requirements | Years are computed as the union of date ranges of roles and projects where the concept appears (overlaps merged). Total experience uses all roles. Internships count in full (assumption, OQ-11). Education uses the ordinal ladder: at or above the level is Backed up; below it is Unsupported (below_required_level) with credit 0. |
| Contradictions | Unsupported with credit 0. A model cannot override a rule-based contradiction. |
| Transferable skills | Only through the curated adjacency table (credit 0.40). A model cannot create adjacency. Example: mentoring one person maps to a mentoring concept and is adjacent to, not equal to, team leadership. |
| Inferred requirements | Never scored. |
| Explanation | For each requirement, contribution = W'\_d x (weight / sum of weights in d) x credit x 100, and loss = the same with (1 - credit). The screen names up to three biggest gaps and three biggest contributors. Computed, not written by a model. |
| Determinism | The score is a pure, versioned function of saved results. A stored analysis never changes. A correction creates a new revision of that analysis with only the affected requirement re-evaluated. |
| Confidence | Coverage and range are shown. The share of results decided by rules versus model is stored for QA, not shown. |
| User corrections | Change that user's results on the next revision. They change shared rules only after human review of logged corrections. |

## 10E. Tests

| **Test** | **Requirement** |
|---|---|
| Perfect candidate | All requirements Backed up, verified, scores 100. Weights sum to 1.0. |
| Cap removed | No fixture scores above 100 or is capped below it by construction. |
| Determinism | The same saved results give the same score across runs and machines. |
| Monotonic in evidence | Moving one requirement up the order Unsupported \< Needs attention \< Backed up, with all else fixed, never lowers the score. Moving a requirement from To verify into the score can lower it, because it adds information (expected). |
| Unrelated text | Adding an unrelated hobby paragraph or unrelated document leaves the score identical on deterministic fixtures. On fixtures that reach the model judge, the change must not exceed the run-to-run variance measured at baseline. |
| Order invariance | Reordering requirements or evidence changes nothing. |
| Signature | The score function accepts only results and configuration, so practice, quiz, click and purchase data cannot be passed in. |
| Boundaries | Years exactly equal to, one month below, and far below the target. |
| Fixture classes | Strong match; weak match; career switch; missing required skill; transferable skill; misleading similarity (Java and JavaScript, React and React Native, AWS and Azure, PostgreSQL and MySQL); multi-word skills; synonyms; seniority mismatch; sparse resume; exaggerated resume; OR groups; non-technical professions (for example nursing licence, teaching, finance certification); injection text in the job. |

## 10F. Validation status

- **FACT:** the repository's current weights (0.35, 0.25, 0.15, 0.10, 0.05, 0.05, 0.05) sum to 1.0 but the formula applies 0.95 of them. Its neutral fill of 0.75 for empty categories and default ATS score of 85 are removed here.

- **HYPOTHESIS:** these dimension weights, credits and label bands reflect fit. They are unvalidated.

- **Validation plan:** on the evaluation set, compare scores with human fit ratings (rank correlation and band agreement), inspect failures, then change weights only through the versioned configuration with a change log. The product never states a probability of being hired.
