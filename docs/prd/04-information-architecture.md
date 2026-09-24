# 4. Information architecture

| **Item** | **Definition** | **Tag** |
|---|---|---|
| Desktop | Top bar: logo left, Home, Documents, "New application" button, avatar menu right. No sidebar. | DECISION |
| Mobile | Bottom bar with three targets: Home, a central plus (New application), Documents. Avatar in the top bar. | DECISION |
| Account menu | Settings, Privacy and data, Subscription (placeholder, no purchase in MVP), Help, Sign out. | DECISION |
| Primary CTA | New application, always visible. On Home it becomes the main button when no application is in progress. | DECISION |
| New application flow | Sheet or route with two steps: resume (skipped when a default exists and the user has one resume), then job. Ends on the confirmation screen, then Analyze. | DECISION |
| Practice | A step inside each application. Not a top-level item. Reopen as a top-level item only if usage shows repeat practice (OQ-1). | HYPOTHESIS |
| Applications list | Lives on Home. A full list route exists only for "See all". | DECISION |
| Removed from navigation | JD Tailoring, Cover Letter, Interview Prep, Mock Interview, Add Job, Saved Jobs, Resources, Upgrade. Each is either a step in an application, a Home element, a footer link, or the account menu. | DECISION |

## Which requested screens are kept

Only justified screens stay. Competitor presence is not a justification.

| **Requested screen** | **Decision** |
|---|---|
| A Landing | Kept. |
| B Authentication | Kept, one screen. |
| C Home | Kept. |
| D Resume upload | Kept as a reusable sheet (used in New application and Documents). |
| E Resume editor | Kept. |
| F Template selection | Merged into E as a panel. No separate screen. |
| G New application | Kept as a two-step flow container. |
| H Job URL input and I Job description paste | Merged into one Job input screen with automatic detection. |
| J Job extraction confirmation | Kept. |
| K Fit analysis | Kept. Default tab of the Application page. |
| L Evidence view | Kept as a side sheet. |
| M Requirement view | Kept as the "See why" list. |
| N Tailoring | Kept. |
| O Tailored resume | Kept as a short review screen. |
| P Cover letter | Kept. |
| Q Interview preparation | Kept. |
| R Application tracker | Reduced to a plain status list. No board, no CRM. |
| S Documents and evidence | Kept. |
| T Settings | Kept, six short groups. |
| U Application page | Added. Needed as the parent of K, N, O, P, Q. Not a competitor-driven addition. |
