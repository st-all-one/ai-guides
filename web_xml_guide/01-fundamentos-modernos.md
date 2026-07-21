---
title: "Fundamentos XML Modernos"
description: "Sintaxe XML, declaração, well-formedness vs validade, DOM tree, parsing e serialização com APIs modernas (DOMParser, XMLSerializer, fetch)."
---

# Fundamentos XML Modernos

## 1. Estrutura Básica

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <child attribute="value">texto</child>
</root>
```

### XML Declaration (obrigatória)
- `version` — sempre `"1.0"` (a única versão com suporte universal)
- `encoding` — sempre `"UTF-8"` (padrão de interoperabilidade)
- `standalone` — omitir (não suportado em browsers)

### Regras de Well-formedness (obrigatórias)
- Toda tag aberta deve ser fechada
- Tags devem estar propriamente aninhadas (sem sobreposição)
- Valores de atributos sempre entre aspas (simples ou duplas)
- Nomes de elementos/atributos: case-sensitive, começam com letra ou `_`
- Um único elemento raiz
- Entidades escapadas: `&lt;` `<`, `&gt;` `>`, `&amp;` `&`, `&quot;` `"`, `&apos;` `'`

### Validade (opcional)
- Documento **well-formed** é processável mesmo sem ser **valid** contra DTD/Schema
- Browsers NÃO validam — apenas verificam well-formedness
- Use XML Schema (XSD) ou RelaxNG para validação server-side quando necessário

## 2. APIs Modernas para XML no Browser

### Parsing: string → DOM
```js
const parser = new DOMParser();
const doc = parser.parseFromString(xmlStr, "application/xml");
// Verificar erro de parsing
const errorNode = doc.querySelector("parsererror");
if (errorNode) {
  console.error("XML malformed", errorNode.textContent);
}
```

> **Sempre verifique `parsererror`** — DOMParser não lança exceção em XML inválido.

### Serialização: DOM → string
```js
const serializer = new XMLSerializer();
const xmlStr = serializer.serializeToString(doc);
```

### Carregamento remoto (use fetch, NÃO XMLHttpRequest)
```js
fetch("documento.xml")
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  })
  .then(xmlStr => {
    const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
    // processar doc
  });
```

### XPath no DOM
```js
const result = document.evaluate(
  "//book/title",
  doc,
  null,           // namespace resolver (null para HTML/sem namespace)
  XPathResult.ANY_TYPE,
  null
);
// Como iterator
let node;
while (node = result.iterateNext()) {
  console.log(node.textContent);
}
```

## 3. Character References (Entidades)

### Entidades predefinidas (sempre disponíveis)
| Entidade | Caractere | Descrição |
|---|---|---|
| `&lt;` | `<` | Menor que |
| `&gt;` | `>` | Maior que |
| `&amp;` | `&` | E comercial |
| `&quot;` | `"` | Aspas duplas |
| `&apos;` | `'` | Apóstrofo |

### Entidades numéricas
- Decimal: `&#169;` → ©
- Hexadecimal: `&#xA9;` → ©

### ⚠️ DTD Entities (evitar em novos projetos)
```xml
<!-- EVITAR: DTD inline vulnerável a XXE -->
<!DOCTYPE doc [
  <!ENTITY warning "Texto">
]>
<!-- PREFERIR: variável XSLT ou constante JS -->
<xsl:variable name="warning" select="'Texto'"/>
```

## 4. Namespaces XML

### Declaração
```xml
<root xmlns="http://exemplo.com/default"
      xmlns:pref="http://exemplo.com/prefixado">
  <item xmlns:custom="http://exemplo.com/custom">...</item>
</root>
```

### Namespace no XPath
- XPath NÃO reconhece namespace default — elementos sem prefixo são assumidos como namespace vazio
- Solução 1: `*[namespace-uri()='...' and local-name()='...']`
- Solução 2: namespace resolver customizado

```js
// Resolver para namespace default
function nsResolver(prefix) {
  return "http://www.w3.org/2005/Atom"; // namespace do documento
}
doc.evaluate("//myns:entry", doc, nsResolver, XPathResult.ANY_TYPE, null);
```

### Namespace no XSLT
```xml
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:myNS="http://exemplo.com/meu-dominio">
```
- Namespace OBRIGATÓRIO: `http://www.w3.org/1999/XSL/Transform`
- NUNCA use: `http://www.w3.org/TR/WD-xsl` (incompatível)

## 5. CSS para XML (alternativa leve a XSLT)

```xml
<?xml-stylesheet type="text/css" href="estilo.css"?>
```

Útil para apresentação básica de XML sem transformação. CSS pode estilizar elementos XML diretamente, mas não pode reorganizar a estrutura.

## 6. OpenSearch Description

Formato para descrever mecanismos de busca. Suportado por Firefox, Chrome, Safari, Edge.

### Estrutura mínima
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>MDN</ShortName>
  <Description>MDN Web Docs Search</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="16" width="16" type="image/x-icon">https://example.com/favicon.ico</Image>
  <Url type="text/html" template="https://example.com/search?q={searchTerms}"/>
</OpenSearchDescription>
```

### Regras
- `<ShortName>` ≤ 16 caracteres, `<Description>` ≤ 1024 caracteres
- Namespace `http://a9.com/-/spec/opensearch/1.1/` obrigatório
- Favicons remotos > 10KB são rejeitados
- Servidor deve servir com `Content-Type: application/opensearchdescription+xml`

### Autodescoberta
```html
<link rel="search" type="application/opensearchdescription+xml"
      title="Search MDN" href="/opensearch.xml">
```

### Auto-update (OpenSearch)
O arquivo de descrição pode ser atualizado automaticamente incluindo um elemento `Url` com `rel="self"`:

```xml
<Url type="application/opensearchdescription+xml" rel="self"
     template="https://example.com/mysearchdescription.xml"/>
```

### Firefox: Suporte a keyword search
Firefox suporta um tipo de URL adicional para busca direta da barra de endereços:

```xml
<Url type="application/x-moz-keywordsearch"
     template="https://example.com/search?q={searchTerms}"/>
```

A partir do Firefox 63, `type="application/json"` é aceito como alias de `application/x-suggestions+json`.
