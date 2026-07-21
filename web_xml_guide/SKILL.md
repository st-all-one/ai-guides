# SKILL: XML Moderno (2024-2026)

> Instruções para IA trabalharem com XML, XPath, XSLT, EXSLT e OpenSearch seguindo padrões web modernos.

## 1. Premissas

- **Browser**: único runtime relevante para XML client-side
- **XPath 1.0**: única versão disponível em browsers (XPath 2.0/3.0 só via Saxon)
- **XSLT 1.0**: suporte declinante em Chrome. Prefira JS para transformações
- **DOMParser**: API nativa e segura. Nunca use regex para parsear XML
- **fetch()**: sempre prefira a `XMLHttpRequest` (legado)
- **Sem DTD**: risco XXE. Use `xsl:variable` ou constantes JS

## 2. Regras Obrigatórias

### R1 — Parsing
```js
const parser = new DOMParser();
const doc = parser.parseFromString(xmlStr, "application/xml");
if (doc.querySelector("parsererror")) throw new Error("XML malformado");
```

### R2 — Fetch (nunca XMLHttpRequest)
```js
const xmlStr = await fetch(url).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.text(); });
```

### R3 — XPath com Snapshot (nunca Iterator se DOM for mutável)
```js
const result = doc.evaluate(expr, context, resolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
for (let i = 0; i < result.snapshotLength; i++) { result.snapshotItem(i); }
```

### R4 — Namespace Resolver (obrigatório se XML tiver namespace default)
```js
function nsResolver(prefix) { return { atom: "http://www.w3.org/2005/Atom" }[prefix] || null; }
// Ou use *[namespace-uri()='...' and local-name()='...']
```

### R5 — Sempre declare XML com UTF-8
```xml
<?xml version="1.0" encoding="UTF-8"?>
```

### R6 — XSLT: namespace correto
```xml
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
```
NUNCA use: `http://www.w3.org/TR/WD-xsl`

### R7 — Security
- NUNCA processe XML com DTD de fonte não confiável
- escapeHTML() para todo texto injetado: `String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#x27;"})[ch])`
- `exclude-result-prefixes` em XSLT para não vazar namespaces internos

## 3. Árvores de Decisão

### XML vs JSON
```
Dados simples                  → JSON
Namespaces/schema/XSLT         → XML
API REST                       → JSON
Documento semântico (SVG, etc) → XML
Sistema legado já em XML       → XML
```

### XPath vs CSS
```
HTML, query simples      → CSS (querySelectorAll)
HTML, query por texto    → XPath (contains(text(),'...'))
XML puro                 → XPath
XML com namespace        → XPath + namespace resolver
Performance crítica      → CSS (mais rápido em browsers)
```

### XSLT vs JavaScript
```
Browser + Chrome alvo        → JS (XSLT declinante)
Server-side + Saxon          → XSLT 2.0/3.0
XML → XML schema diferente   → XSLT
Transformação simples        → JS + template literals
Batch processing             → XSLT + Saxon
```

## 4. Padrões de Código

### Identity Transform (sempre incluir em toda stylesheet XSLT)
```xml
<xsl:template match="@*|node()">
  <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
</xsl:template>
```

### Pipeline completo (JS)
```js
fetch(url) → DOMParser → parsererror check → document.evaluate() OR XSLTProcessor → output
```

### OpenSearch mínimo
```xml
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName max16>...</ShortName>
  <Description max1024>...</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" template="https://...?q={searchTerms}"/>
</OpenSearchDescription>
```

## 5. Elementos Proibidos

| Elemento/Função | Motivo | Alternativa |
|---|---|---|
| `XMLHttpRequest` | Legado | `fetch()` |
| `namespace::` axis | Não suportado | `namespace-uri()` |
| `disable-output-escaping` | Gecko não serializa | `&#160;` |
| `xsl:namespace-alias` | Não suportado | `exclude-result-prefixes` |
| `xsl:fallback` | Não suportado | `function-available()` |
| DTD entities | XXE risk | `xsl:variable` |
| Namespace `WD-xsl` | Incompatível | `http://www.w3.org/1999/XSL/Transform` |
| `choose()` XForms | Não é XPath | `xsl:choose` ou ternário JS |
| `<xsl:number level="any">` | Não suportado | `generate-id()` |
| `document.evaluate(..., null, null)` with ns-default | Falha silenciosa | Usar resolver |

## 6. EXSLT — Namespaces e Uso

| Módulo | Namespace | Funções Úteis |
|---|---|---|
| Common | `http://exslt.org/common` | `node-set()`, `object-type()` |
| Math | `http://exslt.org/math` | `max()`, `min()`, `highest()`, `lowest()` |
| Regexp | `http://exslt.org/regular-expressions` | `test()`, `match()`, `replace()` |
| Sets | `http://exslt.org/sets` | `difference()`, `intersection()`, `distinct()` |
| Strings | `http://exslt.org/strings` | `concat()`, `split()`, `tokenize()` |

> ⚠️ EXSLT só funciona em Firefox. Sempre use `function-available()` como guarda.

## 7. Performance

- Prefira paths absolutos (`/root/child`) sobre `//` (descendant axis é caro)
- Use predicates específicos (`[@id='x']`) sobre `contains()`
- Snapshot XPath > Iterator (se DOM for mutável)
- `apply-templates` > `for-each` (permite otimização do processador)
- Reutilize documentos parseados (evite re-parsing)
- XML > 50MB: processe server-side (browser não tem SAX)

## 8. Testes

```js
// Padrão de teste para parsing
const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
expect(doc.querySelector("parsererror")).toBeNull();

// XPath com namespace
const items = doc.evaluate("//ns:item", doc, p => ({ns: "uri"}[p]), 7, null);
expect(items.snapshotLength).toBeGreaterThan(0);

// Verificar que DTD entities NÃO são resolvidas
expect(doc.documentElement.textContent).not.toContain("file://");
```
