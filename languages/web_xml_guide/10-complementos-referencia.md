---
title: "Complementos de Referência — Funções XPath e Recursos Externos"
description: "Assinaturas completas de funções XPath 1.0, propriedades system-property, função choose (XForms), e referências externas consolidadas da documentação MDN oficial."
---

# Complementos de Referência

Este documento completa os gaps de cobertura identificados entre a documentação fonte MDN e os guias compilados. Contém assinaturas detalhadas de funções, notas de implementação e referências externas.

---

## 1. Funções XPath 1.0 — Assinaturas Completas

### 1.1 Core Node-set Functions

| Função | Assinatura | Retorno |
|---|---|---|
| `last` | `last()` | `number` — posição do último nó no contexto |
| `position` | `position()` | `number` — posição do nó atual (1-indexed) |
| `count` | `count(node-set)` | `number` |
| `id` | `id(object)` | `node-set` — busca por ID (requer DTD com atributo ID declarado; suporte parcial) |
| `local-name` | `local-name(node-set?)` | `string` |
| `namespace-uri` | `namespace-uri(node-set?)` | `string` |
| `name` | `name(node-set?)` | `string` — QName completo com prefixo |

> `id()` requer DTD que declare um atributo como tipo `ID`. Sem DTD, retorna node-set vazio. Suporte Gecko: ⚠️ Parcial.

### 1.2 Core String Functions

| Função | Assinatura | Retorno |
|---|---|---|
| `string` | `string(object?)` | `string` — converte qualquer tipo para string |
| `concat` | `concat(string, string, string*)` | `string` |
| `substring` | `substring(string, number, number?)` | `string` — 1-indexed |
| `substring-before` | `substring-before(string, string)` | `string` |
| `substring-after` | `substring-after(string, string)` | `string` |
| `string-length` | `string-length(string?)` | `number` |
| `normalize-space` | `normalize-space(string?)` | `string` — remove leading/trailing whitespace, colapsa espaços internos |
| `contains` | `contains(string, string)` | `boolean` |
| `starts-with` | `starts-with(string, string)` | `boolean` |
| `translate` | `translate(string, string, string)` | `string` — substituição caracter-por-caracter (não regex) |

### 1.3 Core Number Functions

| Função | Assinatura | Retorno |
|---|---|---|
| `number` | `number(object?)` | `number` |
| `sum` | `sum(node-set)` | `number` |
| `floor` | `floor(number)` | `number` — maior inteiro ≤ argumento |
| `ceiling` | `ceiling(number)` | `number` — menor inteiro ≥ argumento |
| `round` | `round(number)` | `number` — inteiro mais próximo |

### 1.4 Core Boolean Functions

| Função | Assinatura | Retorno |
|---|---|---|
| `boolean` | `boolean(object)` | `boolean` |
| `not` | `not(boolean)` | `boolean` |
| `true` | `true()` | `boolean` — literal `true` |
| `false` | `false()` | `boolean` — literal `false` |
| `lang` | `lang(string)` | `boolean` — testa idioma via `xml:lang` do nó ou ancestral mais próximo |

### 1.5 XSLT-Specific Functions (contexto XSLT apenas)

| Função | Assinatura | Retorno | Suporte |
|---|---|---|---|
| `current` | `current()` | `node-set` — nó atual do template (diferente de `.` em predicates) | ✅ |
| `document` | `document(object, node-set?)` | `node-set` — carrega documento(s) externo(s) | ✅ |
| `key` | `key(string, object)` | `node-set` — lookup por chave (`xsl:key`) | ✅ |
| `format-number` | `format-number(number, string, string?)` | `string` — formata número com padrão Java DecimalFormat | ✅ |
| `generate-id` | `generate-id(node-set?)` | `string` — ID único consistente durante a transformação | ✅ |
| `system-property` | `system-property(string)` | `object` — propriedade do processador | ✅ |
| `element-available` | `element-available(string)` | `boolean` — testa se elemento XSLT está disponível | ✅ |
| `function-available` | `function-available(string)` | `boolean` — testa se função está disponível | ✅ |
| `unparsed-entity-url` | `unparsed-entity-url(string)` | `string` — URI de entidade não-parseada do DTD | ❌ Não suportado |

#### `system-property()` — Valores Padrão

| Nome | Tipo | Descrição |
|---|---|---|
| `xsl:version` | `number` | Versão do XSLT implementada (sempre `1.0` em browsers) |
| `xsl:vendor` | `string` | Identificação do vendor do processador (ex: `"Mozilla"`) |
| `xsl:vendor-url` | `string` | URL do vendor (ex: `"http://www.mozilla.org/"`) |

---

## 2. Função `choose()` — XForms (não XPath)

Documentada em MDN sob XPath Functions, mas **pertence ao XForms 1.1**, não ao XPath 1.0 ou XSLT.

```
choose(boolean, object1, object2)
```

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `boolean` | `boolean` | Determina qual objeto retornar |
| `object1` | `object` | Retornado se `boolean` for true |
| `object2` | `object` | Retornado se `boolean` for false |

**⚠️ Notas:**
- Todos os parâmetros são avaliados mesmo o não-retornado (diferente de if ternário)
- Suportada no Gecko mas sem uso prático em contextos XPath/XSLT padrão
- **Alternativas:** `xsl:choose` (XSLT), operador ternário `cond ? a : b` (JS)

---

## 3. Referências Externas (Consolidadas da Documentação MDN)

### XML Geral

- [W3C XML](https://www.w3.org/XML/)
- [XML.com](https://www.xml.com/)
- [Extensible Markup Language (XML) @ W3.org](https://www.w3.org/XML/)
- [Using XML: A List Apart](https://alistapart.com/article/usingxml/)
- [Learning XML, Second Edition](https://www.amazon.com/gp/product/0596004206) — Erik T. Ray (O'Reilly)

### XPath

- [XPath 1.0 Specification](https://www.w3.org/TR/xpath-10/)
- [XPath Tester Online](https://extendsclass.com/xpath-tester.html)
- [XPath Tutorial](https://zvon.org/xxl/XPathTutorial/General/examples.html) — Miloslav Nic
- [What is XSLT? (XPath section)](https://www.xml.com/pub/a/2000/08/holman/index.html?page=2#xpath-info) — G. Ken Holman

### XSLT

- [XSLT 1.0 Specification](https://www.w3.org/TR/xslt-10/)
- [W3C XSL Page](https://www.w3.org/Style/XSL/)
- [XSL Transformations](https://www.ibiblio.org/xml/books/bible3/chapters/ch15.html) — Elliotte Rusty Harold
- [What is XSLT?](https://www.xml.com/pub/a/2000/08/holman/index.html) — G. Ken Holman
- [Jeni's XSLT Pages](https://www.jenitennison.com/xslt/)
- [XSLT: Programmer's Reference, 2nd Ed](https://www.amazon.com/XSLT-Programmers-Reference-Programmer/dp/0764543814) — Michael H. Kay (Wrox)
- [XSLT](https://www.amazon.com/Xslt-Doug-Tidwell/dp/0596000537) — Doug Tidwell (O'Reilly)
- [XSL Tutorial](https://nwalsh.com/docs/tutorials/xsl/) — Paul Grosso, Norman Walsh
- [XSLT Tutorial](https://zvon.org/xxl/XSLTutorial/Books/Book1/index.html) — Miloslav Nic

### EXSLT

- [EXSLT Website](https://exslt.github.io/)
- [EXSLT exsl:node-set](https://exslt.github.io/exsl/functions/node-set/index.html)
- [EXSLT math:max](https://exslt.github.io/math/functions/max/index.html)
- [EXSLT regexp:match](https://exslt.github.io/regexp/functions/match/index.html)
- [EXSLT set:difference](https://exslt.github.io/set/functions/difference/index.html)
- [EXSLT str:split](https://exslt.github.io/str/functions/split/index.html)

### OpenSearch

- [OpenSearch GitHub Repository](https://github.com/dewitt/opensearch)
- [OpenSearch 1.1 Draft Parameters](https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#opensearch-11-parameters)
- [Safari 8.0 Release Notes: Quick Website Search](https://developer.apple.com/library/archive/releasenotes/General/WhatsNewInSafari/Articles/Safari_8_0.html)
- [Microsoft Edge Dev Guide: Search provider discovery](https://learn.microsoft.com/en-us/archive/microsoft-edge/legacy/developer/)
- [The Chromium Projects: Tab to Search](https://www.chromium.org/tab-to-search/)
- [Ready2Search — Create OpenSearch plugins](https://ready.to/search/en/)

### Ferramentas

- [Saxon XSLT/XPath Processor](https://www.saxonica.com/) — Processador XSLT 2.0/3.0 (server-side)
- [XMLPitstop.com](https://web.archive.org/web/20211209064736/https://www.xmlpitstop.com/default_datatype_SSC.html) — Tutoriais e exemplos (arquivado)
- [The data: URL kitchen](https://software.hixie.ch/utilities/cgi/data/data) — Gerador de data: URLs para favicons

---

## 4. Mapa de Documentação Fonte vs. Compilado

| Documento Fonte (xml/) | Coberto em (web_xml/) |
|---|---|
| `xml/guides/xml_introduction/` | 01-fundamentos-modernos.md |
| `xml/guides/parsing_and_serializing_xml/` | 01-fundamentos-modernos.md |
| `xml/guides/opensearch/` | 01-fundamentos-modernos.md, 06-seguranca-boas-praticas.md |
| `xml/xpath/guides/introduction_to_using_xpath_in_javascript/` | 03-xpath-moderno.md |
| `xml/xpath/guides/comparison_with_css_selectors/` | 03-xpath-moderno.md |
| `xml/xpath/guides/snippets/` | 03-xpath-moderno.md, 08-modelo-basico.md |
| `xml/xpath/reference/axes/` | 03-xpath-moderno.md |
| `xml/xpath/reference/functions/` (37 páginas) | 03-xpath-moderno.md, 10-complementos-referencia.md |
| `xml/xslt/guides/transforming_xml_with_xslt/` | 04-xslt-moderno.md |
| `xml/xslt/guides/pi_parameters/` | 04-xslt-moderno.md |
| `xml/xslt/guides/common_errors/` | 04-xslt-moderno.md, 07-elementos-evitados.md |
| `xml/xslt/reference/element/` (35 páginas) | 04-xslt-moderno.md |
| `xml/exslt/` (16 páginas) | 05-exslt-referencia.md |
| — (conteúdo original) | 02-padroes-arquiteturais.md |
| — (conteúdo original) | 06-seguranca-boas-praticas.md |
| — (conteúdo original) | 08-modelo-basico.md |
| — (conteúdo original) | 09-decisao-arquitetural.md |
