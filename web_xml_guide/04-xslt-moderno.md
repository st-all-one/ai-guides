---
title: "XSLT Moderno (1.0) — Guia Prático"
description: "Referência completa de XSLT 1.0: elementos, templates, push vs pull, identity transform, geração HTML, parâmetros, modulação, erros comuns."
---

# XSLT Moderno (1.0) — Guia Prático

> XSLT 1.0 é a versão suportada em browsers. XSLT 2.0/3.0 requerem processadores como Saxon (server-side).
> ⚠️ Chrome tem suporte declinante a XSLT. Teste em todos os browsers alvo.

## 1. Estrutura de uma Stylesheet

```xml
<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <!-- templates aqui -->
</xsl:stylesheet>
```

- Namespace OBRIGATÓRIO: `http://www.w3.org/1999/XSL/Transform`
- `version` OBRIGATÓRIO: `"1.0"`
- Alternativa: `<xsl:transform>` (sinônimo de `<xsl:stylesheet>`)

## 2. Elementos XSLT — Referência Completa

### 2.1 `<xsl:stylesheet>` / `<xsl:transform>` (Elemento Raiz)

```xml
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                id="NAME"
                extension-element-prefixes="LIST"
                exclude-result-prefixes="LIST">
```

| Atributo | Obrigatório | Suporte |
|---|---|---|
| `version` | ✅ Sim | ✅ `"1.0"` |
| `xmlns:xsl` | ✅ Sim | ✅ `http://www.w3.org/1999/XSL/Transform` |
| `id` | ❌ | ✅ |
| `extension-element-prefixes` | ❌ | ✅ |
| `exclude-result-prefixes` | ❌ | ✅ |
| `default-collation` | ❌ | ❌ (XSLT 2.0+) |
| `default-mode` | ❌ | ❌ (XSLT 2.0+) |
| `default-validation` | ❌ | ❌ (XSLT 2.0+) |
| `expand-text` | ❌ | ❌ (XSLT 3.0) |
| `input-type-annotations` | ❌ | ❌ (XSLT 2.0+) |
| `use-when` | ❌ | ❌ (XSLT 2.0+) |
| `xpath-default-namespace` | ❌ | ❌ (XSLT 2.0+) |

### 2.2 Top-Level Elements (filhos de `<xsl:stylesheet>`)

| Elemento | Sintaxe | Suporte |
|---|---|---|
| `<xsl:import>` | `<xsl:import href=URI/>` — deve vir ANTES de qualquer outro filho | ⚠️ Parcial (issues com variáveis/parâmetros top-level) |
| `<xsl:include>` | `<xsl:include href=URI/>` | ✅ |
| `<xsl:key>` | `<xsl:key name=QName match=Pattern use=Expression/>` | ✅ |
| `<xsl:output>` | `<xsl:output method="xml\|html\|text" encoding=STRING .../>` — `standalone`, `indent` e `media-type` NÃO suportados | ⚠️ Parcial |
| `<xsl:param>` | `<xsl:param name=QName select=Expression>` | ✅ |
| `<xsl:preserve-space>` | `<xsl:preserve-space elements=LIST/>` | ✅ |
| `<xsl:strip-space>` | `<xsl:strip-space elements=LIST/>` | ✅ |
| `<xsl:variable>` | `<xsl:variable name=QName select=Expression>` | ✅ |
| `<xsl:attribute-set>` | `<xsl:attribute-set name=QName use-attribute-sets=LIST>` | ✅ |
| `<xsl:decimal-format>` | `<xsl:decimal-format name=QName decimal-separator=CHAR .../>` — 11 atributos opcionais | ✅ |
| `<xsl:namespace-alias>` | `<xsl:namespace-alias stylesheet-prefix=PREFIX result-prefix=PREFIX/>` | ❌ Não suportado |
| `<xsl:template>` | `<xsl:template match=Pattern name=QName mode=QName priority=Number>` | ✅ |

### 2.3 Instructions (dentro de templates)

| Elemento | Sintaxe | Suporte |
|---|---|---|
| `<xsl:apply-templates>` | `<xsl:apply-templates select=Expr mode=QName>` | ✅ |
| `<xsl:apply-imports>` | `<xsl:apply-imports/>` | ✅ |
| `<xsl:call-template>` | `<xsl:call-template name=QName>` | ✅ |
| `<xsl:if>` | `<xsl:if test=Expression>` | ✅ |
| `<xsl:choose>` | `<xsl:choose> <xsl:when/>+ <xsl:otherwise/>? </xsl:choose>` | ✅ |
| `<xsl:when>` | `<xsl:when test=Expression>` | ✅ |
| `<xsl:otherwise>` | `<xsl:otherwise>` | ✅ |
| `<xsl:for-each>` | `<xsl:for-each select=Expression> <xsl:sort/>? </xsl:for-each>` | ✅ |
| `<xsl:sort>` | `<xsl:sort select=Expr order="asc\|desc" data-type="text\|number" case-order="upper-first\|lower-first" lang=Code/>` | ✅ |
| `<xsl:value-of>` | `<xsl:value-of select=Expression/>` — `disable-output-escaping` é irrelevante (Gecko não serializa) | ⚠️ Parcial |
| `<xsl:copy>` | `<xsl:copy use-attribute-sets=LIST>` (cópia superficial do nó atual) | ✅ |
| `<xsl:copy-of>` | `<xsl:copy-of select=Expression/>` (cópia profunda) | ✅ |
| `<xsl:element>` | `<xsl:element name=QName namespace=URI use-attribute-sets=LIST>` | ✅ |
| `<xsl:attribute>` | `<xsl:attribute name=QName namespace=URI>` | ✅ |
| `<xsl:text>` | `<xsl:text disable-output-escaping="yes\|no">` — `disable-output-escaping` é irrelevante | ⚠️ Parcial |
| `<xsl:comment>` | `<xsl:comment>` | ✅ |
| `<xsl:processing-instruction>` | `<xsl:processing-instruction name=QName>` | ✅ |
| `<xsl:number>` | `<xsl:number count=Expr level="single\|multiple\|any" from=Expr value=Expr format=Str lang=Code .../>` — `level="any"` e `lang` NÃO suportados | ⚠️ Parcial |
| `<xsl:message>` | `<xsl:message terminate="yes\|no">` | ✅ |
| `<xsl:fallback>` | `<xsl:fallback>` | ❌ Não suportado |
| `<xsl:with-param>` | `<xsl:with-param name=QName select=Expression>` | ✅ |

## 3. Modelo de Processamento

### Como XSLT Processa

1. **Parser** cria DOM tree do XML fonte e da stylesheet
2. **Processor** (engine XSLT) aplica templates a nós da árvore fonte
3. **Result tree** é construída a partir dos templates
4. **Serializer** converte result tree para formato de saída (HTML/XML/text)

### O Processor trabalha com 7 tipos de nó:
- Root node (documento inteiro)
- Element nodes
- Text nodes
- Attribute nodes
- Comment nodes
- Processing instruction nodes
- Namespace nodes

## 4. Templates: Coração do XSLT

### Root Template (ponto de entrada)
```xml
<xsl:template match="/">
  <html>
    <head><title><xsl:value-of select="/Article/Title"/></title></head>
    <body><xsl:apply-templates/></body>
  </html>
</xsl:template>
```

### Named Template (reutilização)
```xml
<xsl:template name="header">
  <header><h1><xsl:value-of select="."/></h1></header>
</xsl:template>
<!-- Invocação -->
<xsl:call-template name="header"/>
```

### Template com Mode (múltiplas visões)
```xml
<xsl:template match="book" mode="summary">
  <p><xsl:value-of select="title"/> — <xsl:value-of select="author"/></p>
</xsl:template>
<xsl:template match="book" mode="detail">
  <div class="detail"><xsl:apply-templates select="*"/></div>
</xsl:template>
<!-- Invocação -->
<xsl:apply-templates select="//book" mode="summary"/>
```

### Priority-Based
```xml
<xsl:template match="item" priority="2">...</xsl:template>
<xsl:template match="item[@featured='true']" priority="3">...</xsl:template>
```

## 5. Push vs Pull

### Push (preferido — idiomático)
```xml
<xsl:template match="/">
  <html><body>
    <xsl:apply-templates select="//book"/>
  </body></html>
</xsl:template>
<xsl:template match="book">
  <div><xsl:value-of select="title"/></div>
</xsl:template>
```

### Pull (controle explícito)
```xml
<xsl:template match="/">
  <html><body>
    <xsl:for-each select="//book">
      <div>
        <xsl:value-of select="title"/> — <xsl:value-of select="author"/>
      </div>
    </xsl:for-each>
  </body></html>
</xsl:template>
```

## 6. Identity Transform (Padrão Essencial)

```xml
<!-- Template coringa: copia tudo -->
<xsl:template match="@*|node()">
  <xsl:copy>
    <xsl:apply-templates select="@*|node()"/>
  </xsl:copy>
</xsl:template>

<!-- Override para modificar apenas elementos específicos -->
<xsl:template match="title">
  <h1><xsl:apply-templates/></h1>
</xsl:template>
```

## 7. Exemplo Completo: XML → HTML

### XML fonte
```xml
<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="article.xsl"?>
<Article>
  <Title>My Article</Title>
  <Authors>
    <Author company="Foopy Corp.">Mr. Foo</Author>
    <Author>Mr. Bar</Author>
  </Authors>
  <Body>The <b>rain</b> in <u>Spain</u>.</Body>
</Article>
```

### XSLT stylesheet
```xml
<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:myNS="http://devedge.netscape.com/2002/de">

  <xsl:output method="html"/>

  <!-- Root → página HTML -->
  <xsl:template match="/">
    <html>
      <head>
        <title><xsl:value-of select="/Article/Title"/></title>
      </head>
      <body>
        <h1><xsl:value-of select="/Article/Title"/></h1>
        <p>Authors:</p>
        <xsl:apply-templates select="/Article/Authors/Author"/>
        <xsl:apply-templates select="/Article/Body"/>
      </body>
    </html>
  </xsl:template>

  <!-- Autor com condicional -->
  <xsl:template match="Author">
    <p><xsl:value-of select="."/>
      <xsl:if test="@company">
        <em> (<xsl:value-of select="@company"/>)</em>
      </xsl:if>
    </p>
  </xsl:template>

  <!-- Body: copiar preservando HTML interno -->
  <xsl:template match="Body">
    <div class="body">
      <xsl:copy-of select="node()"/>
    </div>
  </xsl:template>
</xsl:stylesheet>
```

## 8. Parâmetros em Stylesheets

### No HTML (PI parameters — Firefox)
```xml
<?xslt-param name="color" value="blue"?>
<?xslt-param name="columns" select="2"?>
<?xml-stylesheet type="text/xsl" href="style.xsl"?>
```

### No JavaScript (XSLTProcessor)
```js
const proc = new XSLTProcessor();
proc.setParameter(null, "color", "blue");
proc.setParameter(null, "columns", 2);
const result = proc.transformToFragment(xmlDoc, document);
```

### Namespace resolver para parâmetros (PI)
```xml
<?xslt-param-namespace prefix="my" namespace="http://example.org/ns"?>
<?xslt-param name="books" select="//my:book"?>
```

## 9. Modularização

```xml
<!-- principal.xsl -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="common.xsl"/>   <!-- menor precedência -->
  <xsl:include href="helpers.xsl"/> <!-- mesma precedência -->
</xsl:stylesheet>
```

## 10. Erros Comuns

| Erro | Causa | Solução |
|---|---|---|
| Stylesheet não carrega | MIME type errado | Servir como `application/xslt+xml` ou `text/xml` |
| Namespace não funciona | Namespace antigo (`WD-xsl`) | Usar `http://www.w3.org/1999/XSL/Transform` |
| XML não transforma | CORS — arquivo local `file://` | Usar servidor HTTP local |
| `disable-output-escaping` ignorado | Firefox não serializa | Usar `&#160;` em vez de `&nbsp;` |
| Template não match | Namespace no XML source não declarado na stylesheet | Declarar `xmlns:myNS="..."` na stylesheet |
| Saída vazia | XPath sem namespace resolver | Usar `*[namespace-uri()='...' and local-name()='...']` |
