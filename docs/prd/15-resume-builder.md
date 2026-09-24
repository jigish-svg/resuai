# 15. Resume builder

## 15A. Architecture

| **Topic** | **Requirement** |
|---|---|
| One canonical model | The canonical resume model (section 9) is the only source for preview, PDF and Word. No renderer reads anything else. |
| Layout pipeline | Canonical model + template tokens produce a layout description. Three emitters read it: live preview, PDF, Word. A change to layout logic changes all three. |
| Current state | **FACT:** the preview and PDF share one renderer. **FACT:** the Word export has no template logic. **FACT:** only built-in PDF fonts (Helvetica, Times) are used. **FACT:** PDF is built in the browser because server rendering crashed. |
| Export authorisation | The client asks the server to authorise an export. The server runs the Claim Validator over changed lines, seals the version and returns a single-use token. Where the file is rendered (browser or server) is a technical decision (OQ-7). Either way the authorisation and audit record are server-side. |
| Versions | Base resume versions and tailored derived versions (section 19). Export always uses a sealed version. |
| Import | Upload reads automatically into the canonical model. No "Parse" button. |
| Controls | Three only: Template, Accent colour (6 presets, only for templates that use one), Density (Comfortable or Compact). |
| Page handling | Automatic breaks. A text note "1 page" or "2 pages". Density can shrink spacing, never delete content. |

## 15B. Template tokens

| **Token group** | **Contents** |
|---|---|
| id, name, category, version | Identity. |
| fonts | heading and body families (two open-licence families embedded), weights. |
| sizes | name, section title, body, small. |
| colors | text, muted, accent (optional). |
| spacing | page margins, section gap, item gap, line height. |
| header | alignment, contact layout. |
| section_title | case, rule style, accent bar. |
| dates | alignment, format. |
| sections | default order, skills layout (inline or list), bullet style. |
| density | two presets that scale spacing and sizes. |

## 15C. The seven templates

| **Template** | **Purpose** | **Character** |
|---|---|---|
| Classic | Traditional roles (finance, legal, government). | Serif, centred name, ruled headings. |
| Modern | General professional use. | Sans-serif, one accent on headings. |
| Minimal | Maximum parse safety. | Plain black and white. |
| Compact | Experienced people who need one page. | Tighter spacing, smaller type. |
| Executive | Senior roles. | Spacious, summary first, selected achievements block. |
| Academic | Research and teaching. | Multi-page CV, publications, grants, teaching. |
| Early career | Students and first jobs. | Education and projects first. |

## 15D. Template requirements

| **Requirement** | **Definition** |
|---|---|
| Single column | All seven. **SOURCE CLAIM:** two-column templates parse poorly in some systems (Teal teardown). |
| Real text only | No images of text, no text boxes, no tables for layout. |
| Standard headings | Experience, Education, Skills, Projects, Certifications. |
| Fonts | Two open-licence families, embedded. |
| Consistency | Preview, PDF and Word are checked against the same snapshot expectations. |
| Tests | A snapshot per template per fixture resume. A text-extraction test that reading order matches the model. |
| Adding a template | A token file and a snapshot. No editor code change. |
| Claims | "Parse-safe by design". Never "ATS-proof". |
| Discovery | Featured row then categories. Never a wall of thumbnails. |
