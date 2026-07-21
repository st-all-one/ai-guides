---
title: "XPath Moderno (1.0) — Guia Prático"
description: "Referência completa de XPath 1.0 para uso em browsers: 13 axes, 27+ funções, uso com JavaScript, comparação com CSS, dicas de performance."
---

# XPath Moderno (1.0) — Guia Prático

> XPath 1.0 é a única versão com suporte nativo em browsers. XPath 2.0/3.0 estão disponíveis apenas via processadores como Saxon (Java/.NET).

## 1. Sintaxe Básica

```
/root/child          → caminho absoluto
//element            → qualquer elemento no documento (descendant axis)
./child              → filho do nó atual
../parent            → pai do nó atual
@attr                → atributo (abreviatura de attribute::attr)
element[1]           → primeiro filho (1-indexed, NÃO zero-based)
element[@id='x']     → filho com atributo id='x'
element[position()<5] → primeiros 4 filhos
```

## 2. Os 13 Axes

| Axis | Abrev. | Descrição |
|---|---|---|
| `child` | *(padrão)* | Filhos diretos do nó |
| `attribute` | `@` | Atributos do nó (só elementos) |
| `descendant` | `//` | Todos os descendentes |
| `descendant-or-self` | — | Nó + descendentes |
| `parent` | `..` | Pai do nó |
| `ancestor` | — | Todos os ancestrais até raiz |
| `ancestor-or-self` | — | Nó + ancestrais |
| `following` | — | Nós após o nó (exceto descendentes) |
| `following-sibling` | — | Irmãos seguintes |
| `preceding` | — | Nós antes do nó (exceto ancestrais) |
| `preceding-sibling` | — | Irmãos anteriores |
| `self` | `.` | O próprio nó |
| `namespace` | — | ❌ NÃO SUPORTADO em browsers |

## 3. Funções Core

### String Functions
| Função | Descrição |
|---|---|
| `concat(s1, s2, ...)` | Concatena strings |
| `contains(haystack, needle)` | Testa substring |
| `normalize-space([s])` | Remove whitespace extra |
| `starts-with(haystack, needle)` | Testa prefixo |
| `string([obj])` | Converte para string |
| `string-length([s])` | Comprimento da string |
| `substring(s, start [, len])` | Extrai substring (1-indexed) |
| `substring-after(haystack, needle)` | Parte após substring |
| `substring-before(haystack, needle)` | Parte antes da substring |
| `translate(s, from, to)` | Substituição carácter-por-carácter |

### Number Functions
| Função | Descrição |
|---|---|
| `number([obj])` | Converte para número |
| `sum(node-set)` | Soma valores numéricos |
| `count(node-set)` | Conta nós |
| `floor(n)` | Maior inteiro ≤ n |
| `ceiling(n)` | Menor inteiro ≥ n |
| `round(n)` | Inteiro mais próximo |

### Boolean Functions
| Função | Descrição |
|---|---|
| `boolean(expr)` | Avalia como booleano |
| `not(expr)` | Negação |
| `true()` | Literal true |
| `false()` | Literal false |
| `lang(string)` | Testa `xml:lang` do nó |

### Node-set Functions
| Função | Descrição |
|---|---|
| `last()` | Última posição no contexto |
| `position()` | Posição atual (1-indexed) |
| `id(expr)` | Busca por ID (DTD-dependente) |
| `local-name([node-set])` | Nome local sem namespace |
| `name([node-set])` | QName completo |
| `namespace-uri([node-set])` | URI do namespace |

### XSLT-Specific Functions (só em contexto XSLT)
| Função | Descrição |
|---|---|
| `current()` | Nó atual do template |
| `document(URI [,node-set])` | Carrega documento externo |
| `key(keyname, value)` | Busca por chave (`xsl:key`) |
| `format-number(n, pattern [, fmt])` | Formata número |
| `generate-id([node-set])` | ID único para nó |
| `system-property(name)` | Propriedade do processador — `xsl:version` (1.0), `xsl:vendor` (string), `xsl:vendor-url` (URL) |
| `element-available(QName)` | Testa disponibilidade de elemento |
| `function-available(name)` | Testa disponibilidade de função |
| `unparsed-entity-url(name)` | URI de entidade (❌ NÃO SUPORTADO) |

> **Nota:** A documentação MDN também lista `choose(boolean, obj1, obj2)` em XPath, mas esta função pertence ao **XForms 1.1**, não ao XPath 1.0 ou XSLT. Não é suportada em browsers para uso XPath genérico. Use `xsl:choose` (XSLT) ou um ternary JS para comportamento equivalente.

## 4. XPath no JavaScript

### document.evaluate() — API completa
```js
const result = document.evaluate(
  xpathExpression,  // string XPath
  contextNode,      // nó raiz da consulta
  namespaceResolver,// null ou função
  resultType,       // constante XPathResult
  result            // null ou XPathResult reutilizado
);
```

### Tipos de Resultado

| Constante | Valor | Uso |
|---|---|---|
| `ANY_TYPE` | 0 | Tipo natural — node-set vira UNORDERED_NODE_ITERATOR |
| `NUMBER_TYPE` | 1 | Acesso via `.numberValue` |
| `STRING_TYPE` | 2 | Acesso via `.stringValue` |
| `BOOLEAN_TYPE` | 3 | Acesso via `.booleanValue` |
| `UNORDERED_NODE_ITERATOR_TYPE` | 4 | `.iterateNext()` — invalida se DOM mudar |
| `ORDERED_NODE_ITERATOR_TYPE` | 5 | `.iterateNext()` — ordem documental |
| `UNORDERED_NODE_SNAPSHOT_TYPE` | 6 | `.snapshotItem(i)` — não invalida |
| `ORDERED_NODE_SNAPSHOT_TYPE` | 7 | `.snapshotItem(i)` — ordem documental |
| `ANY_UNORDERED_NODE_TYPE` | 8 | Qualquer nó match |
| `FIRST_ORDERED_NODE_TYPE` | 9 | Primeiro nó match |

### Padrões de Uso

**Iterator (cuidado: invalida com mutação DOM)**
```js
const iter = doc.evaluate("//book", doc, null,
  XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
try {
  let node;
  while (node = iter.iterateNext()) {
    console.log(node.textContent);
  }
} catch (e) {
  console.error("DOM mutated during iteration");
}
```

**Snapshot (seguro, recomendado)**
```js
const snap = doc.evaluate("//book", doc, null,
  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
for (let i = 0; i < snap.snapshotLength; i++) {
  console.log(snap.snapshotItem(i).textContent);
}
```

**Valor único**
```js
const count = doc.evaluate("count(//book)", doc, null,
  XPathResult.NUMBER_TYPE, null);
console.log(count.numberValue);
```

### Namespace Resolver
```js
// Para HTML ou XML sem namespace
doc.evaluate("//div", doc, null, XPathResult.ANY_TYPE, null);

// Para XML com namespace default (ex: Atom)
function resolver(prefix) {
  return "http://www.w3.org/2005/Atom";
}
doc.evaluate("//myns:entry", doc, resolver, XPathResult.ANY_TYPE, null);

// Resolver automático a partir do documento
const nsResolver = contextNode.ownerDocument === null
  ? contextNode.documentElement
  : contextNode.ownerDocument.documentElement;
```

## 5. XPath vs CSS Selectors

| Operação | XPath | CSS |
|---|---|---|
| Filho direto | `div/p` | `div > p` |
| Descendente | `//p` | `p` (descendant implícito) |
| Atributo | `//*[@id='x']` | `#x` |
| Posição | `//p[1]` | `p:first-child` |
| Irmão seguinte | `//h1/following-sibling::h2` | `h1 ~ h2` |
| Ancestral | `//h2/ancestor::section` | `:has()` (CSS moderno) |
| Texto | `//p[contains(text(),'foo')]` | ❌ Não disponível |
| Regex | `//*[matches(@id,'pattern')]` | `[id~="pattern"]` (limitado) |

**Performance:** CSS selectors são geralmente mais rápidos que XPath em HTML. Use CSS para queries simples em HTML, XPath para queries complexas ou documentos XML.

## 6. Funções Utilitárias (Snippets)

```js
// Avaliar XPath e retornar array de nós
function evaluateXPath(node, expr) {
  const xpe = new XPathEvaluator();
  const nsResolver = node.ownerDocument === null
    ? node.documentElement
    : node.ownerDocument.documentElement;
  const result = xpe.evaluate(expr, node, nsResolver, 0, null);
  const found = [];
  let res;
  while ((res = result.iterateNext())) found.push(res);
  return found;
}

// XPath para array com snapshot (mais seguro)
function docEvaluateArray(expr, context, doc = context?.ownerDocument ?? document) {
  const result = doc.evaluate(expr, context ?? doc, null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  return Array.from({ length: result.snapshotLength },
    (_, i) => result.snapshotItem(i));
}

// Gerar caminho XPath único para um elemento
function getXPathForElement(el, xml) {
  let xpath = "";
  while (el !== xml.documentElement) {
    let pos = 0;
    let sibling = el;
    while (sibling) {
      if (sibling.nodeType === 1 && sibling.nodeName === el.nodeName) pos++;
      sibling = sibling.previousSibling;
    }
    xpath = `*[name()='${el.nodeName}' and namespace-uri()='${el.namespaceURI ?? ""}'][${pos}]/${xpath}`;
    el = el.parentNode;
  }
  xpath = `/*[name()='${xml.documentElement.nodeName}' and namespace-uri()='${xml.documentElement.namespaceURI ?? ""}']/${xpath}`;
  return xpath.replace(/\/$/, "");
}
```

## 7. Boas Práticas XPath

- ✅ Prefira paths absolutos (`/root/child`) sobre `//` (descendant axis é mais caro)
- ✅ Use `ORDERED_NODE_SNAPSHOT_TYPE` em vez de `*_ITERATOR_TYPE` se o DOM for mutável
- ✅ Sempre use `position()` explicitamente para clareza (apesar de `[1]` ser equivalente)
- ❌ Evite `//*[position() < 5]` sem qualificação — é caro e impreciso
- ❌ Evite `namespace::` axis (não suportado)
- ⚠️ XPath `id()` só funciona se o documento tiver DTD com atributo ID declarado
