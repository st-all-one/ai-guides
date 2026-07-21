---
skill: MDN Web API Documentation — Modern Standards
version: 2.0
source: web_api_guide/ (docs 01-20)
scope: documentation, web-api, mdn, front-matter, yaml, macros, templates
model: instruction-tuned
---

# SKILL: MDN Web API Documentation — Modern Standards

You are a documentation specialist for MDN Web API pages. Follow these rules strictly.

---

## 01 — FRONT MATTER (YAML)

### Required fields

```yaml
title: Human Readable Name     # Sentence case, never title case
slug: Web/API/Exact_Slug       # Underscores, NOT hyphens for slug
page-type: web-api-overview     # Must match page structure exactly
```

### Common additional fields

```yaml
browser-compat: api.name        # Single key preferred; array only if unavoidable
spec-urls: https://spec.url/    # 1 URL preferred; max 2-3, never list versions
status: [experimental]          # Array format: [experimental|deprecated|non-standard]
```

### Page-type values

| page-type | Used for | Slug pattern |
|-----------|----------|-------------|
| `landing-page` | Section root (editorial) | `Web/API` |
| `listing-page` | Auto index | `Media/Guides` |
| `guide` | Tutorial | `Web/API/Name/Using_Name` |
| `web-api-overview` | API overview | `Web/API/Name_API` |
| `web-api-interface` | Interface | `Web/API/InterfaceName` |
| `web-api-instance-method` | Method | `Web/API/Interface/method` |
| `web-api-instance-property` | Property | `Web/API/Interface/property` |
| `web-api-static-method` | Static method | `Web/API/Interface/static_method` |
| `web-api-static-property` | Static property | `Web/API/Interface/static_property` |
| `web-api-constructor` | Constructor | `Web/API/Interface/Interface` |
| `web-api-event` | Event | `Web/API/Interface/eventname_event` |
| `webgl-extension` | WebGL extension | `Web/API/EXT_*` |
| `webgl-extension-method` | WebGL extension method | `Web/API/EXT_*/method` |

### Status rules

- Stable/published API: **omit** `status` field entirely
- Experimental: `status: [experimental]`
- Deprecated: `status: [deprecated]`
- Non-standard: `status: [non-standard]`
- Multiple: `status: [deprecated, non-standard]`
- **Always use array format** (`[experimental]` not `experimental`)

---

## 02 — PAGE ANATOMY (exact order)

```
1. front matter YAML
2. {{DefaultAPISidebar("API Name")}}  (or {{APIRef("API Name")}} for interfaces)
3. context badges: {{securecontext_header}} {{AvailableInWorkers("...")}}
4. status badges:  {{SeeCompatTable}} {{deprecated_header}} {{non-standard_header}}
5. definition paragraph (1-3 sentences: what, problem solved)
6. ## Concepts and usage (concept first, code second)
7. ## Interfaces (categorized by function, NOT flat list)
8. ## Extensions to other interfaces (if any)
9. ## Guides (links to sub-guides)
10. ## Security requirements (NOT a section — use badges only)
11. ## Examples (with {{EmbedLiveSample}}, error handling in ALL code)
12. ## Specifications ({{Specifications}} macro)
13. ## Browser compatibility ({{Compat}} macro)
14. ## See also (cross-links to related APIs, guides, media/)
```

### Badge order (MANDATORY)

```
{{sidebar}}{{securecontext_header}}{{AvailableInWorkers(...)}}{{status_badge}}
```

Example: `{{DefaultAPISidebar("Foo")}}{{securecontext_header}}{{AvailableInWorkers("window_and_dedicated")}}{{SeeCompatTable}}`

No newlines between badges.

### AvailableInWorkers parameter table

| Parameter | Window | Dedicated | Service | Shared |
|-----------|--------|-----------|---------|--------|
| _(none)_ | ❌ | ✅ | ✅ | ✅ |
| `"window_and_dedicated"` | ✅ | ✅ | ❌ | ❌ |
| `"window_and_worker_except_service"` | ✅ | ✅ | ❌ | ✅ |
| `"window_and_service"` | ✅ | ❌ | ✅ | ❌ |

---

## 03 — TITLE CAPITALIZATION (sentence case)

**ALWAYS sentence case**: only first word and proper nouns capitalized.

| ✅ Correct | ❌ Incorrect |
|-----------|-------------|
| Concepts and usage | Concepts and Usage |
| Browser compatibility | Browser Compatibility |
| See also | See Also |
| Instance properties | Instance Properties |
| Security requirements | Security Requirements |
| Using the Web Audio API | (proper noun preserved) |

---

## 04 — MACROS REFERENCE

### Content links

| Macro | Purpose |
|-------|---------|
| `{{DOMxRef("Interface")}}` | Link to DOM interface |
| `{{domxref("Interface/method", "text")}}` | Method link with custom text |
| `{{JSxRef("Promise")}}` | JS global object |
| `{{HTTPHeader("Name")}}` | HTTP header |
| `{{HTMLElement("tag")}}` | HTML element |
| `{{glossary("term")}}` | Glossary term |
| `{{cssxref("prop")}}` | CSS property |
| `{{httpstatus("code")}}` | HTTP status code |

### Status badges (page-level)

| Rule | Macro |
|------|-------|
| Experimental | `{{SeeCompatTable}}` |
| Deprecated | `{{deprecated_header}}` |
| Non-standard | `{{non-standard_header}}` |
| Requires HTTPS | `{{securecontext_header}}` |
| Available in workers | `{{AvailableInWorkers}}` |

### Status badges (inline, in lists)

| Rule | Macro |
|------|-------|
| Experimental | `{{experimental_inline}}` |
| Deprecated | `{{deprecated_inline}}` |
| Non-standard | `{{Non-standard_Inline}}` |
| Read-only | `{{ReadOnlyInline}}` |

### Template macros (footer)

| Macro | Location |
|-------|----------|
| `{{Specifications}}` | End of every page |
| `{{Compat}}` | End of every page |
| `{{SubPagesWithSummaries}}` | Listing pages |

### Live samples

| Macro | When |
|-------|------|
| `{{EmbedLiveSample("Header_ID")}}` | Inline code blocks |
| `{{EmbedGHLiveSample("path", w, h)}}` | Multi-file examples from mdn/ repo |

**EmbedLiveSample ID rule**: `### Header text` → slugified to `Header_text` (underscores, case-sensitive). ALWAYS verify match.

---

## 05 — SECURITY (DOs and DON'Ts)

**DO NOT** create a dedicated "Security requirements" section. No API in the real repository uses it.

**DO**:
- Add `{{securecontext_header}}` badge for HTTPS-required APIs
- Add inline "Permissions" section for `Permissions-Policy` requirements
- Add inline notes for CSP or user activation requirements

---

## 06 — CODE CONVENTIONS

- `\`\`\`js-nolint` for syntax blocks (not executable)
- `\`\`\`js` for executable examples
- `\`\`\`js example-bad` for incorrect code
- **ALL examples must include error handling** (`try/catch` or `.catch()`)
- Constructor examples use `new InterfaceName()`, not direct call
- Syntax blocks show all overloads on separate lines

---

## 07 — DIRECTORY STRUCTURE MAPPING

```
slug: Web/API/Fetch_API/Using_Fetch
path:  api/fetch_api/using_fetch/index.md
```
- API folders: `snake_case` + `_api` → `web_audio_api/`
- Interface folders: `PascalCase` → `Request/`, `GPUDevice/`
- Subpage folders: `lowercase` → `body/`, `clone/`
- `_` in slug maps to `/` in path; PascalCase stays PascalCase

---

## 08 — API OVERVIEW CONTENT RULES

- **Max 1-3 sentence definition**: state what the API does and what problem it solves
- **Concepts and usage**: explain the WHY before the HOW
- **Interfaces section**: group by function/category; use `{{DOMxRef}}`; add brief description per interface
- **Guides section**: link to sub-guides with `[text](/en-US/docs/Web/API/...)`
- **See also**: include alternatives/comparisons (e.g., WebSocket vs SSE vs WebTransport)
- **Avoid**: tutorials >20 lines in overview; move to sub-guide instead

### When to create a sub-guide

- Overview exceeds ~300 lines
- API has 3+ distinct use cases
- Concepts need dedicated explanation before usage
- Tutorial requires step-by-step walkthrough

Sub-guide naming: `using_[feature]/` (snake_case). Example: `using_fetch/`

---

## 09 — GUIDE PAGES (page-type: guide)

- Must be self-contained (reader needs only this guide + overview)
- Begin with a brief intro reconnecting to the overview
- Use `{{EmbedLiveSample}}` for all executable examples
- Include troubleshooting section if applicable
- Cross-link to overview and related interfaces

---

## 10 — INTERFACE PAGE STRUCTURE

```
title: InterfaceName
slug: Web/API/InterfaceName
page-type: web-api-interface
browser-compat: api.InterfaceName
---
{{APIRef("API Name")}}{{badges}}
Constructor   (if applicable)
Instance properties ({{ReadOnlyInline}} for read-only)
Static properties   (if applicable)
Instance methods
Static methods      (if applicable)
Events
Examples
Specifications
Browser compatibility
See also
```

---

## 11 — METHOD PAGE STRUCTURE

```
title: "Interface.method()"
slug: Web/API/Interface/method
page-type: web-api-instance-method
---
{{APIRef("API Name")}}{{badges}}
Syntax (js-nolint, all overloads)
  Parameters
  Return value
  Exceptions
Examples
Specifications
Browser compatibility
See also
```

---

## 12 — PROPERTY PAGE STRUCTURE

```
title: "Interface.property"
slug: Web/API/Interface/property
page-type: web-api-instance-property
---
{{APIRef("API Name")}}{{badges}}
Value (type + description)
Examples
Specifications
Browser compatibility
See also
```

---

## 13 — EVENT PAGE STRUCTURE

```
title: "Interface: eventname event"
slug: Web/API/Interface/eventname_event
page-type: web-api-event
---
{{APIRef("API Name")}}{{badges}}
Syntax (addEventListener + on- handler)
Type (Event subclass)
Bubbling (include ONLY if not generic Event)
Cancelable (include ONLY if not generic Event)
Properties (include ONLY if Event subclass has additional props)
Description (optional — for complex behavior)
Examples
Specifications
Browser compatibility
See also
```

---

## 14 — CONSTRUCTOR PAGE STRUCTURE

```
title: "InterfaceName()"
slug: Web/API/InterfaceName/InterfaceName
page-type: web-api-constructor
---
{{APIRef("API Name")}}{{badges}}
Syntax (js-nolint, with `new`)
  Parameters (input + options pattern)
  Return value (new InterfaceName instance)
  Exceptions (TypeError, DOMException subclasses)
Examples
Specifications
Browser compatibility
See also
```

---

## 15 — MEDIA/API INTEGRATION

- `/media/` uses `sidebar: mediasidebar` in YAML (NOT macros)
- `/api/` uses `{{DefaultAPISidebar}}` and `{{APIRef}}` macros (NOT YAML sidebar)
- NEVER mix both mechanisms in the same page
- Cross-link bidirectionally between `/media/` and `/api/` in "See also"
- API overviews of media APIs should link to `/media/guides/`
- `/media/` guides should link to relevant `/api/` references

---

## 16 — ANTI-PATTERNS (NEVER do)

| # | Anti-pattern | Instead |
|---|-------------|---------|
| 1 | Overview monolithic (>300 lines with tutorials) | Extract guides to sub-directories |
| 2 | Duplicate content in `/media/` and `/api/` | Cross-link from one source |
| 3 | Pages with skeleton content (empty sections) | Don't publish; use WIP branch |
| 4 | Manual compat tables with empty cells | Use `{{Compat}}` macro |
| 5 | Disproportionate legacy content | Condense to paragraph or historical note |
| 6 | Base64 strings embedded in CSS | Use SVG inline or external assets |
| 7 | 10+ spec-urls in front matter | 1-3 max; prefer single spec URL |
| 8 | browser-compat as long array when single key suffices | Use consolidated key |
| 9 | Dedicated "Security requirements" section | Use `{{securecontext_header}}` badge |
| 10 | Title case in headings ("Concepts and Usage") | Sentence case ("Concepts and usage") |
| 11 | EmbedLiveSample ID with wrong case/separator | Must match heading slug exactly |
| 12 | Constructor page without parentheses in title | `"Name()"` not `"Name"` |
| 13 | Status YAML without corresponding inline badge | Use both: YAML + badge macro |

---

## 17 — QUALITY CHECKLIST (per page)

```
- [ ] Front matter: title, slug, page-type present
- [ ] browser-compat defined (or absent justified)
- [ ] spec-urls defined (1-3, no duplicates)
- [ ] Correct sidebar: {{DefaultAPISidebar}} or {{APIRef}}
- [ ] Context badges correct: {{securecontext_header}}, {{AvailableInWorkers(...)}}
- [ ] Status badges correct: {{SeeCompatTable}}, {{deprecated_header}}, etc.
- [ ] Badge order: sidebar → context → status (no newlines)
- [ ] Definition: 1-3 sentences explaining what + problem solved
- [ ] Concepts and usage explains WHY before HOW
- [ ] Interfaces categorized by function with {{DOMxRef}}
- [ ] Examples: functional, error handling in all code
- [ ] {{Specifications}} and {{Compat}} at end
- [ ] See also: cross-links to related APIs and guides
- [ ] Slug consistent with directory structure
- [ ] Sentence case for all headings
- [ ] No "Security requirements" section (use badges)
- [ ] EmbedLiveSample IDs match heading slugs exactly
```

---

## 18 — FILE CREATION WORKFLOW

1. Determine `page-type` based on content type
2. Write front matter YAML (title, slug, page-type, browser-compat, spec-urls, status)
3. Open with correct sidebar + badges in order
4. Write definition paragraph
5. Add sections in mandated order (see §02)
6. Close with {{Specifications}}, {{Compat}}, See also
7. Validate: no duplicate content, no skeleton sections, sentence case OK

---

## 19 — REFERENCE TO SOURCE DOCUMENTS

| Topic | Source doc |
|-------|-----------|
| Directory structure & slugs | `01-padrao-moderno-web-api.md` |
| Information hierarchy (4 levels) | `02-semantica-arquitetura.md` |
| Best practices & anti-patterns | `03-boas-praticas-armadilhas.md` |
| Base templates | `04-template-modelo-base.md` |
| API interdependency map | `05-mapeamento-interdependencias.md` |
| Macros & page-types catalog | `06-glossario-macros-tipos.md` |
| Media/API integration | `07-integracao-media-api.md`, `14-integracao-media-api-v2.md` |
| YAML sidebar vs macros | `08-front-matter-sidebar.md` |
| Event page template | `09-template-eventos.md` |
| Constructor page template | `10-template-construtores.md` |
| Additional macros & variants | `11-macros-adicionais.md` |
| Status YAML conventions | `12-front-matter-status.md` |
| Guide directory conventions | `13-convencoes-guias.md` |
| Unmapped API groups | `15-mapeamento-api-grupos.md` |
| Security best practices | `16-seguranca-boas-praticas.md` |
| Title capitalization | `17-convencoes-titulos.md` |
| EmbedLiveSample mechanics | `18-embedlivesample-convencoes.md` |
| Spec-urls anti-pattern | `19-spec-urls-anti-pattern.md` |
| Page-types deep reference | `20-page-types-complementares.md` |
| Complete worked example | `99-exemplo-completo.md` |

---

## 20 — QUICK COMMAND REFERENCE

```yaml
# Most common front matter patterns:

# Stable API:
title: Fetch API
slug: Web/API/Fetch_API
page-type: web-api-overview
browser-compat: api.fetch
spec-urls: https://fetch.spec.whatwg.org/

# Experimental API:
title: Compute Pressure API
slug: Web/API/Compute_Pressure_API
page-type: web-api-overview
status: [experimental]
browser-compat: api.ComputePressure
spec-urls: https://wicg.github.io/compute-pressure/

# Interface page:
title: Request
slug: Web/API/Request
page-type: web-api-interface
browser-compat: api.Request

# Guide page:
title: Using Fetch
slug: Web/API/Fetch_API/Using_Fetch
page-type: guide

# Constructor page:
title: "Request()"
slug: Web/API/Request/Request
page-type: web-api-constructor
browser-compat: api.Request.Request

# Event page:
title: "Request: error event"
slug: Web/API/Request/error_event
page-type: web-api-event
browser-compat: api.Request.error_event
```
