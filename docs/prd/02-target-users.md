# 2. Target users

| **Attribute** | **Primary: targeted applicant** | **Secondary: interview soon** | **Also served, no separate flow** |
|---|---|---|---|
| Situation | Has found a specific job and has a resume (or can paste one). About to apply. | Has an interview scheduled or likely soon. | Students and freshers, career switchers, experienced professionals in any field. |
| Problem | Does not know if they fit, why, or what to change without exaggerating. | Does not know what will be asked or how to use their own experience in answers. | Same, with less experience, different fields, or a change of direction. |
| Current alternatives | Teal, Kickresume, Jobscan, a free chatbot. | Interview tools, a free chatbot, friends. | Free plans and chatbots. |
| Motivation | Send a stronger application to this job today. | Feel prepared and avoid being caught out. | Get a first job or a new direction. |
| Trust concerns | AI inventing skills. Scores that can be gamed. Being charged unexpectedly. | Made-up talking points they cannot defend. | Same. |
| Desired outcome | A resume and letter they can defend line by line. | Answers built from things they really did. | Honest framing of limited or different experience. |
| Tag | INFERENCE. Several products charge for job-specific tailoring. | INFERENCE. Highest price tolerance in the category. | INFERENCE. Weak evidence of willingness to pay. |

## Role-adaptive design

**DECISION:** one product flow for every profession. Professions differ through configuration.

| **Aspect** | **Definition** | **Tag** |
|---|---|---|
| Role family config | Data, not code: label overrides ("Projects", "Portfolio", "Clinical experience"), default section order, example bullets, concept seeds, recommended templates. Chosen from the target job title. | DECISION |
| What adapts | Terminology, examples, default sections, template suggestions, concept vocabulary. | DECISION |
| What does not adapt | Journey, screens, evidence states, score dimensions and weights, validation rules. | DECISION |
| Coverage for MVP | Config for at least 12 profession families, matching the evaluation set. Language: English first. | DECISION |
| Sufficiency | Config-only adaptation is enough to serve non-technical professions. | HYPOTHESIS |
