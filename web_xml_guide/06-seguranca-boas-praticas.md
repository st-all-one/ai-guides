---
title: "Segurança e Boas Práticas XML"
description: "XXE prevention, CORS, CSP, encoding, error handling, performance, e práticas recomendadas para XML moderno."
---

# Segurança e Boas Práticas XML

## 1. Segurança

### ⚠️ XXE (XML External Entity) — Risco Crítico

DTD pode definir entidades que acessam arquivos do sistema ou URLs externas:

```xml
<!-- ATAQUE XXE: NUNCA processe XML assim de fonte não confiável -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>
```

**Proteção:**
- ❌ NUNCA processe XML de fontes não confiáveis com DTD habilitado
- ✅ Prefira `DOMParser` (parsers modernos geralmente desabilitam DTD entities por padrão)
- ✅ Valide e sanitize input XML antes de processar
- ✅ Use Content Security Policy (CSP) para restringir carregamento de recursos
- ⚠️ Se precisar de DTD, desabilite resolução de entidades externas no parser

### CORS (Cross-Origin Resource Sharing)

- Arquivos XML carregados via `file://` NÃO podem carregar stylesheets XSLT (CORS)
- Sempre use servidor HTTP local para testes
- `fetch()` respeita CORS; configurar `Access-Control-Allow-Origin` no servidor
- Se precisar de transformação XSLT client-side, XSLT e XML devem estar no mesmo origin

### CSP (Content Security Policy)

Restrinja carregamento de XML/XSLT com políticas CSP:

```
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'
```

### Práticas de Segurança Essenciais

1. **Nunca confie em XML de fontes externas** — especialmente se contiver DTD
2. **Prefira JSON** para dados de APIs (menor superfície de ataque)
3. **`document()` function** do XSLT: use apenas com URIs confiáveis
4. **Avoid DTD** em novos projetos — entidades podem vazar dados internos
5. **Valide entrada** antes de parsing: tamanho máximo, encoding esperado

---

## 2. Encoding

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

- **Sempre declare UTF-8** — é o padrão universal para interoperabilidade
- XML Declaration deve estar na primeira linha, sem BOM (Byte Order Mark) na frente
- `InputEncoding` no OpenSearch deve refletir o encoding real do documento
- Unicode permite representar qualquer caractere sem entidades numéricas

---

## 3. Error Handling

### DOMParser (JavaScript)
```js
const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
const errorNode = doc.querySelector("parsererror");
if (errorNode) {
  console.error("Erro de parsing:", errorNode.textContent);
  return;
}
// Processar doc...
```

### XSLT Error Handling
```xml
<!-- Verificar disponibilidade de função/elemento -->
<xsl:if test="function-available('math:max')">
  <xsl:value-of select="math:max(//price)"/>
</xsl:if>

<!-- Logging -->
<xsl:message terminate="yes">Erro fatal: dados inválidos</xsl:message>

<!-- Fallback para conteúdo alternativo -->
<xsl:choose>
  <xsl:when test="$data != ''">
    <xsl:value-of select="$data"/>
  </xsl:when>
  <xsl:otherwise>
    <p>Dados indisponíveis</p>
  </xsl:otherwise>
</xsl:choose>
```

### XPath Iteration Errors
```js
const iterator = doc.evaluate("//book", doc, null,
  XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
try {
  let node;
  while (node = iterator.iterateNext()) { ... }
} catch (e) {
  console.error("DOM mutated during iteration");
}
```

### OpenSearch Troubleshooting
- Servidor deve retornar `Content-Type: application/opensearchdescription+xml`
- Namespace `xmlns="http://a9.com/-/spec/opensearch/1.1/"` obrigatório
- Favicons remotos > 10KB são rejeitados
- Debug: `about:config` → `browser.search.log = true` (Firefox)

---

## 4. Performance

### XPath Performance
| Prática | Impacto |
|---|---|
| ✅ Prefira paths absolutos (`/root/child`) | Evita scan completo do documento |
| ✅ Use predicates específicos (`[@id='x']`) | Mais rápido que `contains()` |
| ❌ Evite `//` desnecessário | Descendant axis é caro |
| ❌ Evite `//*[position() < 5]` sem qualificação | Varre tudo |
| ✅ Prefira snapshot sobre iterator | Se o DOM for mutável |

### XSLT Performance
| Prática | Impacto |
|---|---|
| ✅ Prefira `apply-templates` sobre `for-each` | Permite otimização pelo processador |
| ✅ Use `mode` para múltiplas visões | Evita duplicação de templates |
| ❌ Evite `exsl:node-set()` desnecessário | RTF conversion tem custo |
| ❌ Evite `document()` function em loops | Chamadas de rede são caras |

### XML Parsing Performance
| Prática | Impacto |
|---|---|
| ✅ Use `fetch()` + `DOMParser` | Mais rápido que XMLHttpRequest |
| ✅ Reutilize documentos parseados | Evita re-parsing |
| ❌ Evite processar XMLs muito grandes no browser | Streaming (SAX) não disponível |

---

## 5. Práticas Recomendadas (Checklist)

### ✅ Faça sempre
- [ ] Declare `<?xml version="1.0" encoding="UTF-8"?>`
- [ ] Verifique `parsererror` após DOMParser
- [ ] Use `fetch()` em vez de `XMLHttpRequest`
- [ ] Inclua `<xsl:otherwise>` em todo `<xsl:choose>`
- [ ] Teste XSLT com servidor HTTP (CORS)
- [ ] Use namespace resolver para documentos XML com namespace default

### ❌ Evite sempre
- [ ] DTD com entidades externas em input não confiável
- [ ] `disable-output-escaping` (não funciona)
- [ ] `namespace::` axis (não suportado)
- [ ] `XMLHttpRequest` para novos projetos
- [ ] `xsl:namespace-alias` (não suportado)
- [ ] XSLT `<?xml-stylesheet?>` com `file://` (CORS)

### ⚠️ Cuidado com
- [ ] XSLT em Chrome — suporte pode ser removido
- [ ] `document.evaluate(null, resolver)` — falha silenciosa com namespace default
- [ ] XPath Iterator — invalida se DOM for mutado
- [ ] `xsl:import` — comportamento de precedência pode surpreender
- [ ] Favicons remotos > 10KB no OpenSearch (rejeitados)
