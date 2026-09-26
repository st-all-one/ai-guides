---
title: "Padrões Arquiteturais e Interdependências XML/XPath/XSLT/EXSLT"
description: "Mapa completo de dependências entre XML, XPath, XSLT e EXSLT. Padrões de projeto: identity transform, push vs pull, template matching, function composition."
---

# Padrões Arquiteturais e Interdependências

## 1. Mapa de Dependências

```
XML (base)
 ├── DTD ──► entities, atributos ID, validade
 ├── XPath 1.0
 │    ├── Usado por XSLT para seleção de nós
 │    ├── Usado por JavaScript via document.evaluate()
 │    ├── 13 axes, ~27 funções core + funções XSLT-specific
 │    └── Única versão suportada nativamente em browsers
 ├── XSLT 1.0
 │    ├── Depende de XPath para seleção de nós
 │    ├── Depende de namespaces XML
 │    ├── Depende de DOM tree (não trabalha em string bruta)
 │    ├── Pode usar CSS como estilo complementar
 │    ├── Pode usar EXSLT como extensão
 │    └── 36 elementos documentados (alguns não suportados)
 └── EXSLT
      ├── Extensão do XSLT 1.0 (não substitui versões superiores)
      ├── 5 módulos: Common, Math, Regexp, Set, Str
      └── Depende de namespaces específicos (http://exslt.org/*)
```

## 2. Dependências Específicas

| Componente | Depende de | É usado por |
|---|---|---|
| XML declaration | Nada | Todos os parsers |
| DTD | XML | `id()`, `unparsed-entity-url()`, validade |
| XPath `document()` | XSLT stylesheet | Consultas cross-document |
| XPath `key()` | `<xsl:key>` declaration | Tabelas de lookup |
| XPath `current()` | Contexto XSLT | Template matching |
| XSLT `<xsl:import>` | Outra stylesheet | Modularização |
| XSLT `<xsl:include>` | Outra stylesheet | Modularização |
| EXSLT `exsl:node-set()` | RTF (Result Tree Fragment) | Processamento multi-passo |

## 3. Fluxo de Dados

``` 
[XML Source] ──► [Parser] ──► [DOM Tree]
                                   │
                    [XPath Expression] ←── [XSLT Stylesheet]
                              │                   │
                              ▼                   │
                    [Node Selection]              │
                              │                   │
                              └───────────────────┤
                                                  ▼
                                        [XSLT Processor]
                                                  │
                                                  ▼
                                        [Result Tree] ──► Serialização
                                                              │
                                                    ┌─────────┼─────────┐
                                                    ▼         ▼         ▼
                                                  HTML      XML       Text
```

## 4. Padrões de Projeto

### 4.1 Identity Transform Pattern
Propósito: copiar documento/subárvore intacta, modificando apenas partes específicas.

```xml
<xsl:template match="@*|node()">
  <xsl:copy>
    <xsl:apply-templates select="@*|node()"/>
  </xsl:copy>
</xsl:template>
```

**Variações:**
- Identity + override para elementos específicos
- `match="myNS:Body"` sobrescreve identity para processamento diferenciado
- `mode` attribute permite múltiplos identity patterns simultâneos

### 4.2 Push vs Pull Processing

| Padrão | Mecanismo | Quando usar |
|---|---|---|
| **Push** | `<xsl:apply-templates>` — processador decide qual template aplicar | Dados bem estruturados, transformações baseadas em regras |
| **Pull** | `<xsl:for-each>` + `<xsl:value-of>` — controle explícito | Dados tabulares, transformações lineares, controle fino |

**Regra prática:** prefira push (apply-templates) para código mais idiomático e manutenível. Use pull (for-each) quando precisar de controle procedural explícito.

### 4.3 Template Matching Patterns

| Padrão | Match | Uso |
|---|---|---|
| Root template | `match="/"` | Ponto de entrada, gera estrutura base |
| Named template | `name="header"` | Invocado via `<xsl:call-template>` |
| Mode-based | `match="h1" mode="toc"` | Múltiplas visões do mesmo nó |
| Priority-based | `match="item" priority="2"` | Resolução de conflitos |
| Pattern with predicates | `match="person[address/@city='denver']"` | Seleção condicional |

**Resolução de conflitos:**
1. Template mais específico vence
2. Em igualdade, o último no documento vence
3. Atributo `priority` permite definição explícita

### 4.4 XPath Function Composition

| Composição | Exemplo |
|---|---|
| count + condição | `count(//p[lang('en')])` |
| Chain de string | `substring(substring-before(@attr, '.'), 1, 3)` |
| Namespace-uri + local-name | `*[namespace-uri()='...' and local-name()='p']` |
| Position + predicate | `//div[@class='foo']/bar[position()=1]` |
| Not + condição | `//a[not(@name and @name='badname')]` |
| Sum + node-set | `sum(//price)` |
| Key + value | `key('people', 'Smith')` |

### 4.5 EXSLT Extension Patterns

```xml
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:regexp="http://exslt.org/regular-expressions"
                xmlns:math="http://exslt.org/math">

  <!-- Regexp -->
  <xsl:value-of select="regexp:replace(/root/@value, 'before', 'gi', 'AFTER')"/>

  <!-- Math -->
  <xsl:value-of select="math:max(//price)"/>

  <!-- Set -->
  <xsl:copy-of select="set:difference($setA, $setB)"/>

  <!-- String -->
  <xsl:for-each select="str:tokenize($data, '-')">...</xsl:for-each>
</xsl:stylesheet>
```

### 4.6 OpenSearch Pattern

```xml
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>SNK</ShortName>
  <Description>...</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="16" width="16" type="image/x-icon">...</Image>
  <Url type="text/html" template="https://...?q={searchTerms}"/>
  <Url type="application/x-suggestions+json" template="https://...?s={searchTerms}"/>
</OpenSearchDescription>
```

## 5. Limitações Conhecidas do Ecossistema

### Browser XSLT (client-side)
- Apenas XSLT 1.0 é suportado
- Chrome tem suporte declinante — teste antes de usar em produção
- `<?xml-stylesheet type="text/xsl"?>` requer servidor HTTP (CORS) — não funciona com `file://`
- `disable-output-escaping` não funciona (Gecko não serializa)
- `<xsl:namespace-alias>` não suportado
- `namespace::` axis não suportado
- MIME type correto: `application/xslt+xml` (Firefox 6+)

### XPath (client-side)
- Apenas XPath 1.0 disponível em browsers
- Namespace default não é reconhecido — requer workaround
- `document.evaluate()` com `null` resolver para documentos com namespace default retorna set vazio (sem erro)
- Iterator invalida se o DOM for mutado durante iteração
