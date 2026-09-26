---
title: "Modelo Básico — Templates Práticos de XML/XPath/XSLT/JS"
description: "Modelos reutilizáveis e templates básicos para uso de XML moderno: parsing, serialização, XPath, XSLT, EXSLT e OpenSearch."
---

# Modelo Básico — Templates Práticos

## 1. XML Puro: Documento Mínimo

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dados>
  <registro id="1">
    <nome>João Silva</nome>
    <email>joao@exemplo.com</email>
  </registro>
  <registro id="2">
    <nome>Maria Santos</nome>
    <email>maria@exemplo.com</email>
  </registro>
</dados>
```

---

## 2. JavaScript: Pipeline Completo de XML

```js
async function processarXML(url) {
  try {
    // 1. Carregar
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xmlStr = await response.text();

    // 2. Parsear
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "application/xml");

    // 3. Verificar erro
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) throw new Error("XML malformed: " + errorNode.textContent);

    // 4. Consultar com XPath (snapshot — seguro)
    const result = doc.evaluate(
      "//registro/nome",
      doc,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const nomes = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      nomes.push(result.snapshotItem(i).textContent);
    }

    // 5. Serializar de volta
    const serializer = new XMLSerializer();
    const xmlOut = serializer.serializeToString(doc);

    return { nomes, xmlOut };
  } catch (err) {
    console.error("Erro no processamento XML:", err);
    throw err;
  }
}
```

---

## 3. XPath: Funções Utilitárias Reutilizáveis

```js
// Query XPath → array (snapshot mode, seguro)
function xpathToArray(expr, context, doc = context?.ownerDocument ?? document) {
  const result = doc.evaluate(
    expr, context ?? doc, null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
  );
  return Array.from(
    { length: result.snapshotLength },
    (_, i) => result.snapshotItem(i)
  );
}

// Query XPath → valor único
function xpathValue(expr, context, doc = context?.ownerDocument ?? document) {
  const result = doc.evaluate(
    expr, context ?? doc, null,
    XPathResult.STRING_TYPE, null
  );
  return result.stringValue;
}

// Query XPath → número
function xpathNumber(expr, context, doc = context?.ownerDocument ?? document) {
  const result = doc.evaluate(
    expr, context ?? doc, null,
    XPathResult.NUMBER_TYPE, null
  );
  return result.numberValue;
}

// Namespace resolver genérico
function makeNamespaceResolver(mappings) {
  return prefix => mappings[prefix] || null;
}
```

### Uso:
```js
const doc = new DOMParser().parseFromString(xmlStr, "application/xml");

const books = xpathToArray("//book", doc);
console.log(books.length, "books found");

const title = xpathValue("//book[1]/title", doc);
console.log("First title:", title);

const count = xpathNumber("count(//book)", doc);
console.log("Count:", count);

// Com namespace
const resolver = makeNamespaceResolver({
  atom: "http://www.w3.org/2005/Atom"
});
const entries = doc.evaluate("//atom:entry", doc, resolver,
  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
```

---

## 4. XSLT: Stylesheet Base Reutilizável

```xml
<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:exsl="http://exslt.org/common"
                xmlns:math="http://exslt.org/math"
                xmlns:regexp="http://exslt.org/regular-expressions"
                xmlns:str="http://exslt.org/strings"
                exclude-result-prefixes="exsl math regexp str">

  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat"/>

  <!-- Identity transform (coringa) -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Template de erro padrão -->
  <xsl:template name="show-error">
    <div class="error">
      <xsl:message terminate="no">
        Erro: <xsl:value-of select="$message"/>
      </xsl:message>
      <p>Erro: <xsl:value-of select="$message"/></p>
    </div>
  </xsl:template>

</xsl:stylesheet>
```

---

## 5. XSLT: Transformação XML → HTML (Template Completo)

```xml
<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" encoding="UTF-8"/>

  <!-- Root → estrutura HTML -->
  <xsl:template match="/">
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title><xsl:value-of select="/dados/titulo"/></title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1><xsl:value-of select="/dados/titulo"/></h1>
        <table>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Email</th>
          </tr>
          <xsl:apply-templates select="/dados/registro"/>
        </table>
      </body>
    </html>
  </xsl:template>

  <!-- Template para cada registro -->
  <xsl:template match="registro">
    <tr>
      <td><xsl:value-of select="@id"/></td>
      <td><xsl:value-of select="nome"/></td>
      <td><xsl:value-of select="email"/></td>
    </tr>
  </xsl:template>

</xsl:stylesheet>
```

---

## 6. XSLT: Aplicar via JavaScript (XSLTProcessor)

```js
async function transformXML(xmlUrl, xslUrl) {
  const [xmlText, xslText] = await Promise.all([
    fetch(xmlUrl).then(r => r.text()),
    fetch(xslUrl).then(r => r.text())
  ]);

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const xslDoc = parser.parseFromString(xslText, "application/xml");

  // Verificar erros de parsing
  if (xmlDoc.querySelector("parsererror") || xslDoc.querySelector("parsererror")) {
    throw new Error("Erro de parsing XML ou XSLT");
  }

  const processor = new XSLTProcessor();
  processor.importStylesheet(xslDoc);

  // Parâmetros
  processor.setParameter(null, "paramName", "paramValue");

  const fragment = processor.transformToFragment(xmlDoc, document);
  return fragment;
}

// Uso:
// const html = await transformXML('dados.xml', 'template.xsl');
// document.getElementById('output').appendChild(html);
```

---

## 7. EXSLT: Exemplos Práticos

### node-set() — Processar RTF
```xml
<xsl:variable name="dados">
  <item><nome>A</nome><valor>10</valor></item>
  <item><nome>B</nome><valor>20</valor></item>
</xsl:variable>

<!-- Processar RTF convertido para node-set -->
<xsl:for-each select="exsl:node-set($dados)/item">
  <p><xsl:value-of select="nome"/>: <xsl:value-of select="valor"/></p>
</xsl:for-each>
```

### regexp — Validação
```xml
<xsl:if test="regexp:test(@email, '^[\\w.+-]+@[\\w-]+\\.[\\w.]+$')">
  <xsl:value-of select="@email"/>
</xsl:if>
```

### set:distinct — Valores Únicos
```xml
<xsl:for-each select="set:distinct(//categoria)">
  <li><xsl:value-of select="."/></li>
</xsl:for-each>
```

### str:tokenize — Dividir String
```xml
<xsl:for-each select="str:tokenize(@tags, ',')">
  <span class="tag"><xsl:value-of select="."/></span>
</xsl:for-each>
```

---

## 8. OpenSearch: Template Completo

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>MeuSite</ShortName>
  <Description>Busca no MeuSite</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="16" width="16" type="image/x-icon">
    https://meusite.com/favicon.ico
  </Image>
  <Url type="text/html"
       template="https://meusite.com/busca?q={searchTerms}&amp;lang={language}"/>
  <Url type="application/x-suggestions+json"
       template="https://meusite.com/sugestoes?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml"
       rel="self"
       template="https://meusite.com/opensearch.xml"/>
</OpenSearchDescription>
```

### Autodescoberta (HTML)
```html
<link rel="search" type="application/opensearchdescription+xml"
      title="MeuSite" href="/opensearch.xml">
```

---

## 9. Checklist de Verificação Rápida

- [ ] XML: `<?xml version="1.0" encoding="UTF-8"?>` presente
- [ ] XML: bem formado (tags fechadas, aninhamento correto)
- [ ] JS: `parsererror` verificado após DOMParser
- [ ] JS: `fetch()` usado, não `XMLHttpRequest`
- [ ] XPath: namespace resolver configurado para documentos com namespace
- [ ] XPath: `SNAPSHOT_TYPE` preferido sobre `ITERATOR_TYPE` para segurança
- [ ] XSLT: namespace `http://www.w3.org/1999/XSL/Transform`
- [ ] XSLT: `xsl:output` configurado (method, encoding)
- [ ] XSLT: servidor HTTP usado para testes (CORS)
- [ ] Segurança: sem DTD com entidades externas
- [ ] Performance: paths XPath específicos, evitar `//` genérico
