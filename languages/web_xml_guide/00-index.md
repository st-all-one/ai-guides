---
title: "XML Moderno: Padrão, Semântica e Boas Práticas"
description: "Guia de referência completo sobre XML moderno (2024-2026), cobrindo padrões atuais, interdependências XPath/XSLT/EXSLT, segurança e modelos de uso. Otimizado para consulta por IA."
---

# XML Moderno — Índice da Coleção

## Escopo

Esta coleção sintetiza o conhecimento do ecossistema XML (incluindo XPath, XSLT, EXSLT, OpenSearch) extraído da documentação MDN, filtrado e reorganizado para o contexto moderno (2024-2026). O foco é uso web/client-side, com notas sobre server-side quando relevante.

## Documentos

| # | Documento | Conteúdo |
|---|---|---|
| 00 | **`00-index.md`** *(este)* | Índice e mapa de navegação |
| 01 | **`01-fundamentos-modernos.md`** | Fundamentos XML: sintaxe, DOM, parsing, serialização, APIs modernas |
| 02 | **`02-padroes-arquiteturais.md`** | Mapa de interdependências (XML↔XPath↔XSLT↔EXSLT) e padrões de projeto |
| 03 | **`03-xpath-moderno.md`** | XPath 1.0 na prática: axes, funções, uso com JavaScript, comparação com CSS |
| 04 | **`04-xslt-moderno.md`** | XSLT 1.0+: elementos, templates, push vs pull, identity transform, geração HTML |
| 05 | **`05-exslt-referencia.md`** | EXSLT: common, math, regexp, set, str — namespaces e funções |
| 06 | **`06-seguranca-boas-praticas.md`** | Segurança (XXE, CORS, CSP), encoding, error handling, performance |
| 07 | **`07-elementos-evitados.md`** | Elementos, funções e práticas para evitar (deprecados, não suportados, inseguros) |
| 08 | **`08-modelo-basico.md`** | Modelo básico de uso: templates práticos para XML+XPath+XSLT+JS |
| 09 | **`09-decisao-arquitetural.md`** | Árvore de decisão: XML vs JSON, XSLT vs JS, XPath vs CSS, quando usar cada tecnologia |
| 10 | **`10-complementos-referencia.md`** | Assinaturas detalhadas de funções XPath, `system-property()`, `choose()` (XForms), referências externas da MDN |

## Como usar esta coleção

- **Iniciantes**: comece por `01-fundamentos-modernos.md` e `08-modelo-basico.md`
- **Arquitetura/Design**: `02-padroes-arquiteturais.md` e `09-decisao-arquitetural.md`
- **Implementação XPath**: `03-xpath-moderno.md`
- **Implementação XSLT**: `04-xslt-moderno.md` e `05-exslt-referencia.md`
- **Revisão de código**: `06-seguranca-boas-praticas.md` e `07-elementos-evitados.md`
- **Consulta rápida de funções**: `10-complementos-referencia.md`

## Legado vs Moderno: Mapa Rápido

| Tecnologia | Status (2024-2026) | Alternativa Moderna |
|---|---|---|
| XML puro | ✅ Essencial | — |
| DTD | ⚠️ Legado (XXE risk) | XML Schema, RelaxNG, ou validação programática |
| XPath 1.0 | ✅ Padrão web (único suportado em browsers) | — |
| XPath 2.0/3.0 | ❌ Sem suporte nativo em browsers | Saxon (server-side) |
| XSLT 1.0 | ⚠️ Suporte declinante em browsers | JavaScript + template literals |
| XSLT 2.0/3.0 | ❌ Sem suporte nativo em browsers | Saxon (server-side) |
| EXSLT | ✅ Extensão útil para XSLT 1.0 | Funções JS equivalentes |
| `XMLHttpRequest` | ❌ Deprecado | `fetch()` |
| `DOMParser` | ✅ Padrão moderno | — |
| `XMLSerializer` | ✅ Padrão moderno | — |
| OpenSearch 1.1 | ✅ Suportado por Firefox, Chrome, Safari, Edge | — |

## Recursos Externos

### Especificações
- [W3C XML](https://www.w3.org/XML/)
- [XPath 1.0 Spec](https://www.w3.org/TR/xpath-10/)
- [XSLT 1.0 Spec](https://www.w3.org/TR/xslt-10/)
- [EXSLT](https://exslt.github.io/)
- [OpenSearch](https://github.com/dewitt/opensearch)

### Processadores
- [Saxon XSLT/XPath Processor](https://www.saxonica.com/) — XSLT 2.0/3.0 server-side

### Tutoriais e Ferramentas
- [XPath Tester Online](https://extendsclass.com/xpath-tester.html)
- [Zvon XPath Tutorial](https://zvon.org/xxl/XPathTutorial/General/examples.html)
- [Zvon XSLT Tutorial](https://zvon.org/xxl/XSLTutorial/Books/Book1/index.html)
- [Jeni's XSLT Pages](https://www.jenitennison.com/xslt/)
- [Ready2Search](https://ready.to/search/en/) — Criar plugins OpenSearch

### Leitura Complementar
- [XML.com — What is XSLT?](https://www.xml.com/pub/a/2000/08/holman/index.html)
- [XSLT: Programmer's Reference](https://www.amazon.com/XSLT-Programmers-Reference-Programmer/dp/0764543814) — Michael H. Kay
- [XSLT](https://www.amazon.com/Xslt-Doug-Tidwell/dp/0596000537) — Doug Tidwell (O'Reilly)
- [Using XML: A List Apart](https://alistapart.com/article/usingxml/)

Para lista completa, veja `10-complementos-referencia.md` (seção 3).
