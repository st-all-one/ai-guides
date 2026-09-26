---
name: webmcp
description: >
  WebMCP (experimental; Chrome origin trial): let web pages expose structured
  tools to AI agents via document.modelContext. Imperative and declarative APIs,
  JSON Schema, security (prompt injection), testing/evals, Cloudflare WebMCP,
  service workers. Load when implementing or evaluating browser-exposed tools
  for agents.
category: protocols
version: "experimental (Chrome 146–150)"
tags: [webmcp, mcp, ai-agents, tools, browser, imperative-api, declarative-api, security, prompt-injection]
license: MIT
---

# WebMCP — Web Model Context Protocol

Experimental standard (W3C Web Machine Learning CG, Chrome origin trial). The spec can change; verify official docs before production.

## Use When
- Exposing page functionality as tools to AI agents
- Choosing between the imperative (JS) and declarative (HTML attributes) APIs
- Defining JSON Schema for tool parameters
- Mitigating prompt injection / intent misrepresentation
- Writing deterministic and probabilistic tests/evals
- Understanding service-worker integration and browser support

## Core Rules
- Expose typed tools (JSON Schema) instead of relying on DOM clicking.
- Describe tool intent precisely to avoid misrepresentation.
- Treat agent input as untrusted: prompt injection is the primary risk.
- Limit parameters and character budgets (avoid over-parameterization).
- Prefer declarative API for simple forms; imperative for dynamic logic.
- Restrict exposure with `exposedTo` / `fromOrigins`.
- Test with deterministic scenarios plus probabilistic evals.
- Track browser implementation status; standard is evolving.

## Core Patterns
```html
<!-- Declarative: HTML attributes synthesize JSON Schema -->
<form toolname="createBooking"
      tooldescription="Create a table booking"
      toolautosubmit>
  <input name="date" type="date"
         toolparamdescription="Reservation date (YYYY-MM-DD)" required>
  <input name="party" type="number"
         toolparamdescription="Number of guests" min="1" required>
  <button type="submit">Book</button>
</form>
```

```js
// Imperative
const controller = new AbortController();
document.modelContext.registerTool({
  name: "searchFlights",
  description: "Search flights between two airports",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "IATA origin" },
      to:   { type: "string", description: "IATA destination" },
      date: { type: "string", format: "date" },
    },
    required: ["from", "to", "date"],
  },
  exposedTo: { fromOrigins: ["https://agent.example"] },
}, async ({ from, to, date }, signal) => {
  return await api.search({ from, to, date, signal });
}, { signal: controller.signal });

// Declarative submit
form.addEventListener("submit", (e) => {
  e.respondWith(handleBooking(Object.fromEntries(new FormData(form))));
});
```

## File Map
| File | Content |
|---|---|
| `README.md` | Overview, status, index, sources |
| `01-introducao.md` | What it is, `document.modelContext`, agent types |
| `02-motivacao-atuacao-vs-tools.md` | DOM actuation vs typed tools |
| `03-conceitos-glossario.md` | Tool, discovery, JSON Schema, CUJ, annotations |
| `04-como-comecar.md` | Origin trial, flags, requirements |
| `05-api-imperativa.md` | `registerTool`, `getTools`, `executeTool`, events |
| `06-api-declarativa.md` | HTML attributes, schema synthesis, `respondWith` |
| `07-especificacao-tecnica.md` | IDL, registration algorithm, event loop |
| `08-casos-de-uso.md` | Commerce, forms, filters, travel, dev workflows |
| `09-seguranca.md` | Prompt injection vectors, mitigations, budgets |
| `10-testes-e-avaliacoes.md` | Failure modes, deterministic vs probabilistic tests |
| `11-cloudflare-webmcp.md` | Cloudflare bridge, packs, C2PA |
| `12-service-workers-e-futuro.md` | Background WebMCP, session ID, status |
| `examples/` | TS, PHP, Python, Rust, Dart demos |

## Read Order
`01`→`02`→`03`→`04`; API `05` or `06`; security `09`; tests `10`.

## Prereqs
Modern HTML/JS/TS; JSON Schema; a browser with origin-trial support.
