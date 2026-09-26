---
name: xml-moderno
description: >
  Modern XML: safe DOMParser parsing, XMLSerializer, XPath 1.0, XSLT 1.0,
  EXSLT, OpenSearch, namespaces, XXE prevention, architectural decision
  XML vs JSON. Load when generating, parsing, transforming, or validating XML,
  or when choosing between XML and JSON.
category: languages
version: "1.0.0 (2025)"
tags: [xml, xpath, xslt, exslt, opensearch, domparser, xxe, security]
license: MIT
---

# Modern XML (2024–2026)

## Use When
- Parsing/generating XML in the browser (`DOMParser`, `XMLSerializer`)
- Querying with XPath 1.0 or transforming with XSLT 1.0 / EXSLT
- Building OpenSearch descriptions or namespace-aware documents
- Deciding XML vs JSON for an API or config

## Core Rules
- Never parse XML with regex. Use `DOMParser` and check for `parsererror`.
- Browser XPath = **1.0 only**; XPath 2.0/3.0 requires Saxon (server).
- XSLT 1.0 support is declining (esp. Chrome) — prefer JS transforms for new work.
- **No DTD / external entities** in untrusted input: prevents XXE / billion-laughs.
- Always declare and use namespaces; never rely on prefixes alone.
- Use `fetch()` over `XMLHttpRequest`; parse the response text explicitly.
- Prefer JSON for new APIs unless XML/XSLT is mandated.
- Escape output; never inject untrusted text into XPath/XSLT expressions.

## Core Patterns
```js
const doc = new DOMParser().parseFromString(xml, "application/xml");
if (doc.querySelector("parsererror")) throw new Error("malformed XML");

const serializer = new XMLSerializer();
const str = serializer.serializeToString(doc);

// XPath 1.0 (namespace-aware)
const ns = { x: "urn:example" };
const r = doc.evaluate("//x:item[@id='1']", doc, (p) => ns[p] || null,
  XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

// XSLT (legacy, non-standard)
const proc = new XSLTProcessor();
proc.importStylesheet(xsltDoc);
const out = proc.transformToFragment(doc, document);
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Feed</title>
    <atom:link href="https://example.com/feed" rel="self" type="application/rss+xml"/>
    <item><title>Item</title><link>https://example.com/1</link></item>
  </channel>
</rss>
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Index, decision matrix, TOC |
| `01-fundamentos-modernos.md` | XML syntax, prolog, well-formedness, namespaces |
| `02-padroes-arquiteturais.md` | XML vs JSON, schema, document patterns |
| `03-xpath-moderno.md` | XPath 1.0 axes, functions, browser usage |
| `04-xslt-moderno.md` | XSLT 1.0 templates, apply-templates, sorting |
| `05-exslt-referencia.md` | EXSLT namespaces and functions |
| `06-seguranca-boas-praticas.md` | XXE, entity expansion, sanitization |
| `07-elementos-evitados.md` | Deprecated/unsafe constructs |
| `08-modelo-basico.md` | Minimal safe document template |
| `09-decisao-arquitetural.md` | XML vs JSON vs other formats |
| `10-complementos-referencia.md` | OpenSearch, extra references |
| `modern-implementation-example.md` | End-to-end example |

## Read Order
1. `00-index.md` → `01-fundamentos-modernos.md`
2. Parsing/security: `06-seguranca-boas-praticas.md`
3. Queries/transforms: `03`, `04`, `05`
4. Decision/patterns: `02`, `09`
5. `modern-implementation-example.md`

## Prereqs
Basic markup and JavaScript; a modern browser for DOMParser/XPath.
