---
name: eta-templates
description: >
  Eta v4.6.0 — lightweight ESM template engine for JS/TS: syntax, partials,
  helpers, layouts/blocks, custom tags, configuration, API, security, Deno and
  browser usage. Load when rendering HTML/text server-side or migrating from
  EJS/Handlebars.
category: libraries
version: "4.6.0"
tags: [eta, templates, javascript, esm, ssr, partials, layouts, security]
license: MIT
---

# Eta v4.6.0

## Use When
- Rendering HTML/text server-side (Node ≥20.11, Deno, Bun) or in the browser
- Generating strings from `.eta` templates
- Needing layouts, blocks, partials, and composition helpers
- Migrating from EJS/Handlebars to a minimal, typed engine

## Core Rules
- Instantiate `Eta` **once** per module (singleton); never `new Eta()` per request.
- `views` must be an **absolute** path (`import.meta.dirname` on Node, `Deno.cwd()` on Deno).
- `cache: true` in production; `debug: true` only in dev.
- Use `<%=` for **all** dynamic/untrusted data; `<%~` only for trusted HTML (partials, `it.body`, blocks).
- Pass data via `it`; never interpolate user input as a template.
- Never disable auto-escaping globally; escape per-site when required.
- Async only via `Eta.renderAsync` / async helpers.

## Core Patterns
```ts
import { Eta } from "eta";
const eta = new Eta({ views: `${import.meta.dirname}/views`, cache: true });

// template: views/user.eta
// <h1><%= it.name %></h1>
// <%- await eta.renderStringAsync("<%= it.name %>", { name }) %>
const html = eta.render("user", { name: "Ana", items: [] });

// layout + block
// views/layout.eta: <body><%~ it.body %></body>
// views/page.eta:   <% layout("layout") %> <p>Hi</p>
// partial
// views/partials/nav.eta: <nav>…</nav>
// <% include("partials/nav") %>
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, canonical example, conventions |
| `01-quickstart.md` | Install, instance, first render |
| `02-sintaxe.md` | Tags, interpolation, control flow, comments |
| `03-partials.md` | Includes, data passing |
| `04-helpers.md` | Built-in and custom helpers |
| `05-layouts-blocks.md` | Layouts and blocks |
| `06-custom-tags.md` | Custom tag delimiters/parsers |
| `07-configuracao.md` | Options (`views`, `cache`, `debug`, `autoEscape`) |
| `08-api.md` | Render/renderString, async API |
| `09-seguranca.md` | Escaping, XSS, CSP |
| `10-deno-browser.md` | Deno and browser (`eta/core`) |
| `11-cheatsheet.md` | Quick reference |
| `12-faq-troubleshooting.md` | FAQ and pitfalls |
| `13-padroes-avancados.md` | Advanced patterns |
| `14-integracoes.md` | Fresh/Deno and other integrations |

## Read Order
`00`→`01`→`02`; composition `03`–`05`; security `09`; integrations `14`.

## Prereqs
Modern JS/TS and ESM.
