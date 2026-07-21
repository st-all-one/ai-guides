---
title: "Elementos a Evitar em XML/XSLT/XPath Moderno"
description: "Lista completa de elementos, funções, APIs e práticas deprecados, não suportados ou problemáticos, com alternativas modernas."
---

# Elementos a Evitar

## 1. Não Suportados em Browsers (Firefox/Gecko)

| Elemento/Função | Problema | Alternativa |
|---|---|---|
| `<xsl:namespace-alias>` | ❌ Não suportado | Use `exclude-result-prefixes` + LREs |
| `disable-output-escaping` | ❌ Irrelevante (Gecko não serializa) | Use entidades numéricas (`&#160;` para `&nbsp;`) |
| `namespace::` axis | ❌ Não suportado | Use `namespace-uri()` + predicates |
| `unparsed-entity-url()` | ❌ Não suportado | Processamento server-side |
| `<xsl:fallback>` | ❌ Não suportado | Use `function-available()` como guarda |
| `<xsl:number level="any">` | ❌ Não suportado — Firefox não implementa | Use level `single` ou `multiple` |
| `<xsl:number lang>` | ❌ Não suportado — ignorado | Default de locale do sistema apenas |
| `<xsl:output standalone>` | ❌ Não suportado — ignorado | Omita completamente |
| `<xsl:output indent>` | ❌ Não suportado — ignorado | Pretty-print server-side (xmllint, Saxon) |
| `<xsl:output media-type>` | ❌ Não suportado — ignorado | Configure Content-Type no servidor HTTP |
| `<xsl:stylesheet default-collation>` | ❌ Atributo XSLT 2.0 — ignorado | Não use em stylesheets para browsers |
| `<xsl:stylesheet xpath-default-namespace>` | ❌ Atributo XSLT 2.0 — ignorado | Use `namespace-uri()` + `local-name()` |
| `<xsl:import>` com variáveis/parâmetros top-level | ⚠️ Problemas conhecidos no Gecko | Prefira `<xsl:include>` |
| `xsl:output cdata-section-elements` | ⚠️ Não testado em browsers modernos | Use processamento server-side |
| `xsl:output standalone` | ❌ Não suportado | Omita |
| `xsl:output indent` | ❌ Não suportado | Pretty-print server-side |
| `xsl:output media-type` | ❌ Não suportado | Configure MIME type no servidor |

```xml
<!-- ❌ EVITAR -->
<xsl:text disable-output-escaping="yes">&nbsp;</xsl:text>
<xsl:value-of select="namespace::*"/>
<xsl:namespace-alias stylesheet-prefix="..." result-prefix="..."/>
<xsl:fallback><p>Não suportado</p></xsl:fallback>

<!-- ✅ ALTERNATIVA -->
<xsl:text>&#160;</xsl:text>
<xsl:value-of select="namespace-uri(.)"/>
<!-- Omita namespace-alias completamente -->
<xsl:if test="function-available('math:max')">
  <xsl:value-of select="math:max(//price)"/>
</xsl:if>
```

## 2. Deprecados ou Obsoletos

| API/Prática | Status | Alternativa |
|---|---|---|
| `XMLHttpRequest` | ❌ Legado | `fetch()` |
| Namespace XSLT antigo (`WD-xsl`) | ❌ Incompatível | `http://www.w3.org/1999/XSL/Transform` |
| DTD para dados/constantes | ⚠️ Risco XXE | `xsl:variable` ou constantes JS |
| XSLT 1.0 `for-each-group` ausente | ⚠️ Limitação | EXSLT `set:distinct()` ou JS |
| `xsl:choose` sem `otherwise` | ⚠️ Comportamento indefinido | Sempre inclua `<xsl:otherwise>` |
| `xsl:import` | ⚠️ Precedência confusa | Prefira `xsl:include` |
| `exsl:object-type()` | ⚠️ Diagnostic only | Uso desnecessário em produção |
| `choose(boolean, obj1, obj2)` | ⚠️ Função do **XForms 1.1**, não XPath | Use `xsl:choose` (XSLT) ou operador ternário (JS) |

## 3. Práticas Problemáticas

### ❌ Usar XPath onde CSS Selectors Bastam
```js
// ❌ Excessivo para HTML simples
doc.evaluate("//div[@class='foo']", doc, null, XPathResult.ANY_TYPE, null);
// ✅ Mais simples e rápido
doc.querySelectorAll("div.foo");
```

### ❌ Descendant Axis sem Qualificação
```xpath
// ❌ Caro e impreciso
//*[position() < 5]
// ✅ Específico
//div[@class='item'][position() < 5]
```

### ❌ XSLT Client-side para SPAs Modernos
```html
<!-- ❌ Depende de suporte do browser a XSLT -->
<?xml-stylesheet type="text/xsl" href="transform.xsl"?>
<!-- ✅ Processamento JS no cliente -->
<script>fetch('data.xml').then(r=>r.text()).then(xml=>{...})</script>
```

### ❌ DTD Inline para Dados Constantes
```xml
<!-- ❌ Vulnerável a XXE, verboso -->
<!DOCTYPE doc [
  <!ENTITY warning "Something bad">
]>
<body>&warning;</body>

<!-- ✅ Simples e seguro -->
<xsl:variable name="warning" select="'Something bad'"/>
```

## 4. Tabela de Decisão Rápida

| Cenário | Faça | Não Faça |
|---|---|---|
| Carregar XML remoto | `fetch()` | `XMLHttpRequest` |
| Parsear XML string | `DOMParser` | Regex ou string manipulation |
| Query HTML | `querySelectorAll` | `document.evaluate` |
| Query XML complexo | `document.evaluate` | CSS selectors |
| Transformar XML → HTML | JavaScript + template literals | XSLT client-side (suporte declinante) |
| Transformar XML → XML | XSLT (server-side com Saxon) | XSLT 1.0 browser |
| Constantes em XSLT | `xsl:variable` | DTD entities |
| Formatação numérica | `format-number()` | Java DecimalFormat patterns |
| Regex em XSLT | EXSLT `regexp:*` | String XPath functions |
| Namespace sem prefixo | `namespace-uri()` + `local-name()` | `namespace::` axis |
| Fallback para extensões | `function-available()` guard | `xsl:fallback` |
| IDs únicos | `generate-id()` | `xsl:number` com level="any" |

## 5. Resumo: O que NÃO Usar em Projetos Novos

```xml
<!-- ❌ NÃO USE em novos projetos -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/TR/WD-xsl"> ... </xsl:stylesheet>
<xsl:namespace-alias ... />
<xsl:fallback>...</xsl:fallback>
<xsl:output indent="yes" standalone="yes" media-type="..."/>
<xsl:text disable-output-escaping="yes">...</xsl:text>
<xsl:number level="any" lang="..."/>
<xsl:import href="..."/>

<!-- ✅ USE em vez disso -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:include href="..."/>
<xsl:output method="html" encoding="UTF-8"/>
<xsl:text>&#160;</xsl:text>
<xsl:if test="function-available('...')">...</xsl:if>
```
