# 6. UX and design system

## Type scale

| **Style** | **Size / line** | **Use** |
|---|---|---|
| Display | 40 / 44 | Landing headline only. |
| Heading 1 | 28 / 34 | One per screen. |
| Heading 2 | 20 / 28 | Section titles. |
| Body | 15 / 24 | Default text. |
| Small | 13 / 20 | Helper text, coverage line, source labels. |

## System rules

| **Area** | **Rule** | **Tag** |
|---|---|---|
| Principles | Minimal, spacious, calm, professional, content-first, low cognitive load, progressive disclosure. One primary decision per screen. | DECISION |
| Font | Hanken Grotesk (**FACT:** current). Two weights in the interface. | DECISION |
| Spacing | Scale 4, 8, 12, 16, 24, 32, 48, 64. Generous outer margins. One content column. | DECISION |
| Radius and elevation | Two radii (controls 10, panels 16). No shadows except sheets and menus. | DECISION |
| Colour | Neutral canvas. Current green as the single accent for the primary action (**FACT:** brand primary \#006d42). Status colours limited to the four evidence states plus danger. No gradients. | DECISION |
| Cards | Only three: ContinueCard, ChangeCard, EvidenceCard. Everything else is a list on the canvas. At most two card containers per screen (**FACT:** today 8 to 15 on work screens). | DECISION |
| Buttons | One filled primary per screen. Secondary actions are text buttons. Labels 1 to 3 words. | DECISION |
| Forms | Labels above fields. Errors inline in plain words. No placeholder-only labels. No field is required unless the flow cannot continue without it. | DECISION |
| Evidence states | Always icon plus text, never colour alone. Backed up: check icon, green. Needs attention: triangle, amber. Unsupported: minus icon, slate. To verify: question icon, teal. Red is reserved for errors and destructive actions, because an absent fact is not a failure. | DECISION |
| Score presentation | A number and a one-word label in neutral text. Below it, "9 of 11 requirements checked". No ring, gauge, bar, badge, streak or colour-coded number. Range shown when coverage is low. | DECISION |
| Tables | Avoided. Lists only. A table appears only for the Applications list on wide screens. | DECISION |
| Modals | Sheets for tasks. Confirm dialogs only for destructive actions and export confirmations. | DECISION |
| Motion | Fades under 200 ms. No floating or lifting effects. Respect reduced-motion. | DECISION |
| Loading | Step text ("Reading your resume…", "Analyzing the job…", "Finding evidence…", "Building your suggestions…"). No fake percentages. | DECISION |
| Empty states | Three lines: what is missing, why it matters, what to do. | DECISION |
| Errors | Short, human, actionable. Never technical text. **FACT:** today raw exception text reaches users. | DECISION |
| Mobile | Stacked sections, tabs, sticky primary action, bottom bar. No desktop grids. | DECISION |
| Accessibility | Keyboard reachable, visible focus, labels on icons, contrast at least WCAG AA, states not colour-only, reduced motion. Code comments state the primary green passes on white; verify in test. | DECISION |
| Copy | Headings up to 6 words. Helper lines up to 12 words. Never "AI generated", credits, model names or confidence numbers. | DECISION |
