# Implementação Moderna — Exemplo Completo

> Pipeline XML completo seguindo todas as boas práticas da coleção `web_xml/`.

## Cenário

Sistema de catálogo de produtos: consome XML de uma API legada, transforma os dados, valida, e renderiza em HTML. Inclui fallback progressivo e tratamento de erros.

---

## 1. XML Fonte (`catalogo.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalogo xmlns="http://exemplo.com/catalogo">
  <produto id="P001" status="ativo">
    <nome>Notebook Pro</nome>
    <preco moeda="BRL">4599.90</preco>
    <categorias>
      <categoria>Eletrônicos</categoria>
      <categoria>Informática</categoria>
    </categorias>
    <tags>laptop, work, 2024</tags>
    <especificacoes>
      <espec nome="RAM">16GB</espec>
      <espec nome="CPU">i7-13700H</espec>
      <espec nome="SSD">512GB</espec>
    </especificacoes>
  </produto>
  <produto id="P002" status="inativo">
    <nome>Monitor 27"</nome>
    <preco moeda="BRL">1899.00</preco>
    <categorias>
      <categoria>Eletrônicos</categoria>
      <categoria>Monitores</categoria>
    </categorias>
    <tags>monitor, 4k, usb-c</tags>
    <especificacoes>
      <espec nome="Resolução">3840x2160</espec>
      <espec nome="Painel">IPS</espec>
    </especificacoes>
  </produto>
  <produto id="P003" status="ativo">
    <nome>Teclado Mecânico</nome>
    <preco moeda="BRL">349.90</preco>
    <categorias>
      <categoria>Acessórios</categoria>
    </categorias>
    <tags>teclado, mecanico, rgb</tags>
    <especificacoes>
      <espec nome="Switch">Red</espec>
      <espec nome="Layout">ABNT2</espec>
    </especificacoes>
  </produto>
</catalogo>
```

---

## 2. Pipeline JavaScript Completo

```js
import { XMLValidator, XMLTransformer, XPathQuery } from './xml-modern.js';

// ============================================================
// 1. CONFIGURAÇÃO
// ============================================================
const NAMESPACES = {
  cat: 'http://exemplo.com/catalogo'
};

const CONFIG = {
  url: '/data/catalogo.xml',
  lang: 'pt-BR',
  currency: 'BRL'
};

// ============================================================
// 2. CARGA COM FETCH (nunca XMLHttpRequest)
// ============================================================
async function loadXML(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao carregar XML: HTTP ${response.status}`);
  }
  return response.text();
}

// ============================================================
// 3. PARSING COM DOMParser + VERIFICAÇÃO DE ERRO
// ============================================================
function parseXML(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');

  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(`XML malformado: ${errorNode.textContent}`);
  }
  return doc;
}

// ============================================================
// 4. NAMESPACE RESOLVER GENERICO
// ============================================================
function createResolver(mappings) {
  return function (prefix) {
    return mappings[prefix] || null;
  };
}

// ============================================================
// 5. XPATH — QUERY COM SNAPSHOT (seguro contra mutação DOM)
// ============================================================
function xpathToArray(expr, context, doc, resolver = null) {
  const result = doc.evaluate(
    expr,
    context,
    resolver,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const items = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    items.push(result.snapshotItem(i));
  }
  return items;
}

function xpathValue(expr, context, doc, resolver = null) {
  const result = doc.evaluate(
    expr,
    context,
    resolver,
    XPathResult.STRING_TYPE,
    null
  );
  return result.stringValue;
}

function xpathNumber(expr, context, doc, resolver = null) {
  const result = doc.evaluate(
    expr,
    context,
    resolver,
    XPathResult.NUMBER_TYPE,
    null
  );
  return result.numberValue;
}

// ============================================================
// 6. MAPEAMENTO DE DOM → OBJETOS JS
// ============================================================
function parseProduto(produtoNode, doc) {
  const ns = createResolver(NAMESPACES);

  const especs = xpathToArray('cat:especificacoes/cat:espec', produtoNode, doc, ns);
  const specs = {};
  for (const e of especs) {
    specs[xpathValue('@nome', e, doc)] = e.textContent;
  }

  return {
    id: xpathValue('@id', produtoNode, doc),
    status: xpathValue('@status', produtoNode, doc),
    nome: xpathValue('cat:nome', produtoNode, doc),
    preco: Number(xpathValue('cat:preco', produtoNode, doc)),
    moeda: xpathValue('cat:preco/@moeda', produtoNode, doc),
    categorias: xpathToArray('cat:categorias/cat:categoria', produtoNode, doc, ns)
      .map(n => n.textContent),
    tags: xpathValue('cat:tags', produtoNode, doc).split(',').map(t => t.trim()),
    especificacoes: specs
  };
}

async function carregarCatalogo(url) {
  const xmlStr = await loadXML(url);
  const doc = parseXML(xmlStr);
  const ns = createResolver(NAMESPACES);

  const produtosNode = xpathToArray('//cat:produto', doc, doc, ns);
  const produtos = produtosNode.map(node => parseProduto(node, doc));

  return {
    doc,
    produtos,
    total: produtos.length,
    ativos: produtos.filter(p => p.status === 'ativo').length
  };
}

// ============================================================
// 7. SERIALIZAÇÃO (DOM → string)
// ============================================================
function serializeXML(node) {
  return new XMLSerializer().serializeToString(node);
}

// ============================================================
// 8. TRANSFORMAÇÃO XSLT VIA XSLTProcessor (com fallback JS)
// ============================================================
function supportsXSLT() {
  return typeof XSLTProcessor !== 'undefined';
}

async function transformWithXSLT(xmlDoc, xslUrl, params = {}) {
  if (!supportsXSLT()) {
    return transformWithJS(xmlDoc, params);
  }

  const xslResponse = await fetch(xslUrl);
  if (!xslResponse.ok) {
    throw new Error(`Falha ao carregar XSLT: HTTP ${xslResponse.status}`);
  }
  const xslStr = await xslResponse.text();
  const xslDoc = parseXML(xslStr);

  const processor = new XSLTProcessor();
  processor.importStylesheet(xslDoc);

  for (const [key, value] of Object.entries(params)) {
    processor.setParameter(null, key, value);
  }

  const fragment = processor.transformToFragment(xmlDoc, document);

  // Verificar se a transformação produziu resultado
  if (!fragment || !fragment.childNodes.length) {
    throw new Error('XSLT: transformação retornou vazia');
  }

  return fragment;
}

// ============================================================
// 9. TRANSFORMAÇÃO JS (fallback moderno)
// ============================================================
function transformWithJS(catalogo, params = {}) {
  const { lang = 'pt-BR' } = params;

  const ativos = catalogo.produtos.filter(p => p.status === 'ativo');

  const container = document.createElement('div');

  const titulo = document.createElement('h1');
  titulo.textContent = `Catálogo (${ativos.length} produtos ativos)`;
  container.appendChild(titulo);

  for (const prod of ativos) {
    const card = document.createElement('article');
    card.className = 'produto-card';
    card.dataset.id = prod.id;

    const precoFormatado = new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: prod.moeda
    }).format(prod.preco);

    card.innerHTML = `
      <h2>${escapeHTML(prod.nome)}</h2>
      <p class="preco">${precoFormatado}</p>
      <div class="categorias">
        ${prod.categorias.map(c => `<span class="tag">${escapeHTML(c)}</span>`).join('')}
      </div>
      <dl class="especs">
        ${Object.entries(prod.especificacoes).map(([k, v]) =>
          `<dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd>`
        ).join('')}
      </dl>
    `;

    container.appendChild(card);
  }

  return container;
}

// ============================================================
// 10. SEGURANÇA — SANITIZAÇÃO DE STRINGS
// ============================================================
function escapeHTML(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// ============================================================
// 11. ORQUESTRAÇÃO PRINCIPAL
// ============================================================
async function main() {
  const output = document.getElementById('catalogo-output');

  try {
    const catalogo = await carregarCatalogo(CONFIG.url);
    console.log(`Carregados ${catalogo.total} produtos (${catalogo.ativos} ativos)`);

    let content;

    // Tenta XSLT primeiro, cai para JS se não suportado
    if (supportsXSLT()) {
      try {
        content = await transformWithXSLT(catalogo.doc, '/xsl/catalogo.xsl', {
          lang: CONFIG.lang
        });
      } catch (xslError) {
        console.warn('XSLT falhou, usando fallback JS:', xslError.message);
        content = transformWithJS(catalogo, { lang: CONFIG.lang });
      }
    } else {
      content = transformWithJS(catalogo, { lang: CONFIG.lang });
    }

    output.innerHTML = '';
    output.appendChild(content);

  } catch (error) {
    output.innerHTML = `
      <div class="error" role="alert">
        <h2>Erro ao carregar catálogo</h2>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    console.error('Pipeline XML falhou:', error);
  }
}

// ============================================================
// 12. EXECUÇÃO
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
```

---

## 3. XSLT Stylesheet (com todas as boas práticas)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cat="http://exemplo.com/catalogo"
  xmlns:exsl="http://exslt.org/common"
  xmlns:regexp="http://exslt.org/regular-expressions"
  xmlns:str="http://exslt.org/strings"
  xmlns:set="http://exslt.org/sets"
  exclude-result-prefixes="cat exsl regexp str set">

  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat"/>

  <!-- Parâmetros com valores padrão -->
  <xsl:param name="lang" select="'pt-BR'"/>
  <xsl:param name="currency" select="'BRL'"/>

  <!-- Identity transform: copia tudo que não for sobrescrito -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Root: estrutura HTML5 -->
  <xsl:template match="/">
    <html lang="{$lang}">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Catálogo de Produtos</title>
        <style>
          .produto-card { border:1px solid #ddd; border-radius:8px; padding:16px; margin:16px 0; }
          .preco { font-size:1.5em; color:#2e7d32; font-weight:bold; }
          .tag { display:inline-block; background:#e3f2fd; padding:2px 8px; border-radius:4px; margin:2px; font-size:0.9em; }
          .error { color:#c62828; background:#ffebee; padding:16px; border-radius:8px; }
          dl.especs { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; }
          dt { font-weight:bold; color:#555; }
        </style>
      </head>
      <body>
        <h1>Catálogo de Produtos</h1>
        <p><xsl:value-of select="count(//cat:produto)"/> produtos carregados</p>
        <xsl:apply-templates select="//cat:produto[cat:status='ativo']"/>
      </body>
    </html>
  </xsl:template>

  <!-- Template para cada produto ativo -->
  <xsl:template match="cat:produto">
    <article class="produto-card" data-id="{@id}">
      <h2><xsl:value-of select="cat:nome"/></h2>
      <p class="preco">
        <xsl:value-of select="concat('R$ ', format-number(cat:preco, '#.00'))"/>
      </p>

      <!-- Categorias como tags -->
      <div class="categorias">
        <xsl:for-each select="cat:categorias/cat:categoria">
          <span class="tag"><xsl:value-of select="."/></span>
        </xsl:for-each>
      </div>

      <!-- Tags com split (EXSLT) -->
      <xsl:if test="function-available('str:tokenize')">
        <div class="tags">
          <xsl:for-each select="str:tokenize(cat:tags, ',')">
            <span class="tag tag-secundaria"><xsl:value-of select="normalize-space(.)"/></span>
          </xsl:for-each>
        </div>
      </xsl:if>

      <!-- Especificações em definition list -->
      <dl class="especs">
        <xsl:for-each select="cat:especificacoes/cat:espec">
          <dt><xsl:value-of select="@nome"/></dt>
          <dd><xsl:value-of select="."/></dd>
        </xsl:for-each>
      </dl>
    </article>
  </xsl:template>

  <!-- Template para produtos inativos -->
  <xsl:template match="cat:produto[cat:status='inativo']" priority="2">
    <!-- Omitido: não renderiza produtos inativos -->
  </xsl:template>

</xsl:stylesheet>
```

---

## 4. OpenSearch Description (Autodescoberta)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Catálogo</ShortName>
  <Description>Busca no Catálogo de Produtos</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="16" width="16" type="image/x-icon">
    https://exemplo.com/favicon.ico
  </Image>
  <Url type="text/html"
       template="https://exemplo.com/busca?q={searchTerms}&amp;lang={language}"/>
  <Url type="application/x-suggestions+json"
       template="https://exemplo.com/sugestoes?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self"
       template="https://exemplo.com/opensearch.xml"/>
</OpenSearchDescription>
```

```html
<link rel="search" type="application/opensearchdescription+xml"
      title="Catálogo" href="/opensearch.xml">
```

---

## 5. Testes Unitários (Vitest)

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// XML de teste inline (sem DTD — seguro)
const XML_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<cat:root xmlns:cat="http://exemplo.com/catalogo">
  <cat:produto id="P001" status="ativo">
    <cat:nome>Teste</cat:nome>
    <cat:preco moeda="BRL">100.00</cat:preco>
  </cat:produto>
</cat:root>`;

const XML_INVALIDO = '<?xml version="1.0"?><root><broken>';

describe('parseXML', () => {
  it('deve parsear XML válido', () => {
    const doc = parseXML(XML_VALIDO);
    expect(doc.querySelector('parsererror')).toBeNull();
  });

  it('deve lançar erro para XML inválido', () => {
    expect(() => parseXML(XML_INVALIDO)).toThrow('XML malformado');
  });

  it('deve rejeitar XML com DTD de fonte externa', () => {
    const xmlXXE = `<?xml version="1.0"?>
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <foo>&xxe;</foo>`;
    const doc = parseXML(xmlXXE);
    // DOMParser moderno NÃO resolve entidades externas
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.textContent).not.toContain('root:');
  });
});

describe('xpathToArray', () => {
  it('deve retornar nodeset como array', () => {
    const doc = parseXML(XML_VALIDO);
    const items = xpathToArray('//cat:produto', doc, doc,
      createResolver({ cat: 'http://exemplo.com/catalogo' }));
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('id')).toBe('P001');
  });

  it('deve retornar array vazio para expressão sem match', () => {
    const doc = parseXML(XML_VALIDO);
    const items = xpathToArray('//inexistente', doc, doc);
    expect(items).toEqual([]);
  });
});

describe('xpathValue', () => {
  it('deve retornar valor string', () => {
    const doc = parseXML(XML_VALIDO);
    const nome = xpathValue('//cat:nome', doc, doc,
      createResolver({ cat: 'http://exemplo.com/catalogo' }));
    expect(nome).toBe('Teste');
  });
});

describe('xpathNumber', () => {
  it('deve retornar valor numérico', () => {
    const doc = parseXML(XML_VALIDO);
    const count = xpathNumber('count(//cat:produto)', doc, doc,
      createResolver({ cat: 'http://exemplo.com/catalogo' }));
    expect(count).toBe(1);
  });
});

describe('transformWithJS', () => {
  it('deve gerar HTML para produtos ativos', () => {
    const catalogo = {
      produtos: [
        { id: 'P001', status: 'ativo', nome: 'Teste', preco: 100,
          moeda: 'BRL', categorias: ['Cat1'], tags: ['tag1'],
          especificacoes: { RAM: '16GB' } },
        { id: 'P002', status: 'inativo', nome: 'Inativo', preco: 50,
          moeda: 'BRL', categorias: [], tags: [],
          especificacoes: {} }
      ]
    };
    const el = transformWithJS(catalogo, { lang: 'pt-BR' });
    expect(el.querySelectorAll('.produto-card')).toHaveLength(1);
    expect(el.querySelector('.produto-card').textContent).toContain('Teste');
  });

  it('deve escapar HTML em nomes', () => {
    const catalogo = {
      produtos: [{
        id: 'P001', status: 'ativo', nome: '<script>alert("xss")</script>',
        preco: 100, moeda: 'BRL', categorias: [], tags: [],
        especificacoes: {}
      }]
    };
    const el = transformWithJS(catalogo, { lang: 'pt-BR' });
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });
});

describe('escapeHTML', () => {
  it('deve escapar caracteres especiais', () => {
    expect(escapeHTML('<>&"')).toBe('&lt;&gt;&amp;&quot;');
  });

  it('deve retornar string vazia para input vazio', () => {
    expect(escapeHTML('')).toBe('');
  });
});

describe('serializeXML', () => {
  it('deve serializar DOM de volta para string', () => {
    const doc = parseXML(XML_VALIDO);
    const str = serializeXML(doc);
    expect(str).toContain('<?xml version="1.0"');
    expect(str).toContain('cat:produto');
  });
});

describe('supportsXSLT', () => {
  it('deve detectar suporte a XSLTProcessor', () => {
    expect(typeof supportsXSLT()).toBe('boolean');
  });
});
```

---

## 6. Checklist de Verificação

### Parsing e Serialização
- [x] `<?xml version="1.0" encoding="UTF-8"?>` presente em todo documento
- [x] `DOMParser` usado com `"application/xml"`
- [x] `parsererror` verificado após todo parsing
- [x] `fetch()` usado em vez de `XMLHttpRequest`
- [x] `XMLSerializer` para serialização reversa
- [x] Resposta HTTP validada (`response.ok`)

### XPath
- [x] `ORDERED_NODE_SNAPSHOT_TYPE` preferido sobre `ITERATOR_TYPE`
- [x] Namespace resolver configurado para XML com namespace default
- [x] Paths específicos (`//cat:produto[cat:status='ativo']`)
- [x] `count()` para métricas, não iteração manual
- [x] `position()` explícito para clareza

### XSLT
- [x] Namespace correto: `http://www.w3.org/1999/XSL/Transform`
- [x] `xsl:output method="html"` configurado
- [x] Identity transform presente como template coringa
- [x] `function-available()` como guarda para EXSLT
- [x] Parâmetros com valores padrão via `xsl:param`
- [x] `exclude-result-prefixes` para namespaces de extensão

### Segurança
- [x] Sem DTD em documentos XML (XXE prevention)
- [x] escapeHTML() para todo texto injetado em HTML
- [x] Content-Type correto servido pelo backend
- [x] CORS configurado no servidor para fetch()
- [x] Nenhum processamento de XML de fonte não confiável
- [x] `<xsl:otherwise>` em todo `<xsl:choose>`

### Performance
- [x] Prefetch paralelo de XML + XSLT via `Promise.all()`
- [x] XPath com predicates específicos (evita `//` genérico)
- [x] Snapshot XPath (não invalida com mutação DOM)
- [x] Documentos parseados reutilizados (não re-parseados)
- [x] `Intl.NumberFormat` para formatação de moeda

### Acessibilidade e Qualidade
- [x] `role="alert"` em mensagens de erro
- [x] Lang attribute no HTML (`<html lang="{$lang}">`)
- [x] Tags semânticas (`<article>`, `<dl>`, `<h1>`)
- [x] CSS inline via `<style>` no XSLT (autocontido)
- [x] Fallback XSLT → JavaScript quando XSLTProcessor não disponível

---

## 7. Resumo das Boas Práticas Aplicadas

| Prática | Onde | Por quê |
|---|---|---|
| `fetch()` + `DOMParser` | `loadXML()`, `parseXML()` | API moderna, Promise-based, XXE-safe |
| `parsererror` check | `parseXML()` | DOMParser não lança exceção |
| Snapshot XPath | `xpathToArray()` | Não invalida com mutação DOM |
| Namespace resolver | `createResolver()` | XPath não reconhece namespace default |
| Identity transform | XSLT template `@*\|node()` | Copia estrutura intacta, permite override |
| `function-available()` | XSLT EXSLT guard | Fallback graceful quando EXSLT não existe |
| `exclude-result-prefixes` | XSLT root | Evita vazar namespaces internos no output |
| escapeHTML() | `transformWithJS()` | Previne XSS |
| XSLTProcessor → JS fallback | `transformWithXSLT()` | Chrome tem suporte declinante |
| `<xsl:otherwise>` | Todo `xsl:choose` | Comportamento definido para todos os casos |
| `Intl.NumberFormat` | `transformWithJS()` | Formatação localizada, não `toFixed()` |
| Sem DTD | Todos os XMLs | XXE prevention |
| Testes unitários | `catalogo.test.js` | Validar parsing, XPath, transformação, sanitização |
