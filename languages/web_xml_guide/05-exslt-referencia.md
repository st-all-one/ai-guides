---
title: "EXSLT — Extensões para XSLT 1.0"
description: "Referência completa dos 5 módulos EXSLT (Common, Math, Regexp, Set, Str) com namespaces, funções e exemplos."
---

# EXSLT — Extensões para XSLT 1.0

EXSLT estende XSLT 1.0 com funcionalidades que só estariam disponíveis nativamente em XSLT 2.0+. Cada módulo tem seu próprio namespace.

## Declaração dos Namespaces

```xml
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:exsl="http://exslt.org/common"
  xmlns:math="http://exslt.org/math"
  xmlns:regexp="http://exslt.org/regular-expressions"
  xmlns:set="http://exslt.org/sets"
  xmlns:str="http://exslt.org/strings">
```

---

## 1. Common Package — `http://exslt.org/common`

### `exsl:node-set(node-set)`
Converte um Result Tree Fragment (RTF) em node-set processável.

**Por que necessário:** Em XSLT 1.0, variáveis com conteúdo não-trivial (tags internas) criam RTF, que não pode ser consultado com XPath. `exsl:node-set()` converte para node-set normal.

```xml
<xsl:variable name="rtf">
  <item id="1">Foo</item>
  <item id="2">Bar</item>
</xsl:variable>

<!-- Sem exsl:node-set() → erro -->
<xsl:value-of select="$rtf/item"/>  <!-- RTF não suporta XPath -->

<!-- Com exsl:node-set() → funciona -->
<xsl:value-of select="exsl:node-set($rtf)/item[1]"/>
```

### `exsl:object-type(object)`
Retorna o tipo do objeto como string: `"string"`, `"number"`, `"boolean"`, `"node-set"`, `"RTF"`, ou `"external"`.

```xml
<xsl:if test="exsl:object-type($var) = 'node-set'">
  <xsl:value-of select="$var[1]"/>
</xsl:if>
```

---

## 2. Math Package — `http://exslt.org/math`

| Função | Descrição |
|---|---|
| `math:max(node-set)` | Maior valor numérico no node-set |
| `math:min(node-set)` | Menor valor numérico no node-set |
| `math:highest(node-set)` | Nós com o maior valor |
| `math:lowest(node-set)` | Nós com o menor valor |

```xml
<xsl:value-of select="math:max(//price)"/>   <!-- maior preço -->
<xsl:value-of select="math:min(//price)"/>   <!-- menor preço -->
<xsl:for-each select="math:highest(//price)">
  Product: <xsl:value-of select="../name"/>
</xsl:for-each>
```

---

## 3. Regular Expressions Package — `http://exslt.org/regular-expressions`

### `regexp:test(string, regexp [, flags])`
Testa se a string corresponde ao padrão.

```xml
<xsl:if test="regexp:test(@email, '^.+@.+\\..+$')">
  Email válido
</xsl:if>
```

### `regexp:match(string, regexp [, flags])`
Retorna node-set com os matches. O primeiro nó é o match completo, seguido pelos grupos de captura.

```xml
<xsl:for-each select="regexp:match(@data, '(\d+)-(\d+)')">
  <xsl:value-of select="."/>
</xsl:for-each>
```

### `regexp:replace(string, regexp, flags, replacement)`
Substitui ocorrências do padrão.

```xml
<xsl:value-of select="regexp:replace(/root/@value, 'before', 'gi', 'AFTER')"/>
```

**Flags suportadas:** `g` (global), `i` (case-insensitive)

---

## 4. Sets Package — `http://exslt.org/sets`

| Função | Descrição |
|---|---|
| `set:difference(node-set1, node-set2)` | Nós em 1 que não estão em 2 |
| `set:intersection(node-set1, node-set2)` | Nós em ambos os sets |
| `set:distinct(node-set)` | Remove duplicatas (por string value) |
| `set:has-same-node(node-set1, node-set2)` | True se compartilham algum nó |
| `set:leading(node-set1, node-set2)` | Nós em 1 antes do primeiro nó de 2 |
| `set:trailing(node-set1, node-set2)` | Nós em 1 após o último nó de 2 |

```xml
<!-- Produtos em promoção mas NÃO em estoque -->
<xsl:copy-of select="set:difference($promocoes, $estoque)"/>

<!-- Tags únicas -->
<xsl:for-each select="set:distinct(//tag)">
  <xsl:value-of select="."/>
</xsl:for-each>

<!-- Se compartilham algum nó -->
<xsl:if test="set:has-same-node($setA, $setB)">
  <p>Overlap encontrado</p>
</xsl:if>
```

---

## 5. Strings Package — `http://exslt.org/strings`

### `str:concat(node-set)`
Concatena os string values de todos os nós no node-set (diferente de `concat()` do XPath, que concatena strings individuais).

```xml
<xsl:value-of select="str:concat(//paragraph)"/>
<!-- Resultado: "Primeiro paragrafoSegundo paragrafo..." -->
```

### `str:split(string [, delimiter])`
Divide string em node-set de nós `<token>`, usando delimiter (padrão: espaço).

```xml
<xsl:for-each select="str:split('a,b,c', ',')">
  Token: <xsl:value-of select="."/>
</xsl:for-each>
```

### `str:tokenize(string [, delimiter])`
Similar a `split()` mas remove tokens vazios.

```xml
<xsl:for-each select="str:tokenize($date, '-')">
  <xsl:value-of select="."/><br/>
</xsl:for-each>
<!-- Para "2024-12-25": 2024, 12, 25 -->
```

---

## 6. Tabela Rápida

| Módulo | Namespace | Funções |
|---|---|---|
| Common | `http://exslt.org/common` | `node-set()`, `object-type()` |
| Math | `http://exslt.org/math` | `max()`, `min()`, `highest()`, `lowest()` |
| Regexp | `http://exslt.org/regular-expressions` | `test()`, `match()`, `replace()` |
| Sets | `http://exslt.org/sets` | `difference()`, `intersection()`, `distinct()`, `has-same-node()`, `leading()`, `trailing()` |
| Strings | `http://exslt.org/strings` | `concat()`, `split()`, `tokenize()` |
