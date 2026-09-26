---
title: "Árvore de Decisão — XML vs JSON, XSLT vs JS, XPath vs CSS"
description: "Guia para decisões arquiteturais sobre quando usar XML, XSLT, XPath, JSON e alternativas modernas em 2024-2026."
---

# Árvore de Decisão Arquitetural

## 1. Formato de Dados: XML vs JSON

```
Precisa transportar dados?
│
├─ Apenas dados estruturados simples?
│  ├─ Sim → ✅ JSON
│  │
│  └─ Não → ❓
│
├─ Precisa de schema validation robusto?
│  ├─ Sim → ✅ XML + XSD
│  │
│  └─ Não → ❓
│
├─ Precisa de namespaces (desambiguação)?
│  ├─ Sim → ✅ XML
│  │
│  └─ Não → ❓
│
├─ Precisa de entidades/DTD?
│  ├─ Sim → ✅ XML (mas ⚠️ DTD tem riscos de segurança)
│  │
│  └─ Não → ❓
│
├─ Precisa de transformação declarativa (XSLT)?
│  ├─ Sim → ✅ XML
│  │
│  └─ Não → ❓
│
├─ Precisa de suporte nativo de browser para parsing?
│  ├─ Sim → ✅ Ambos (DOMParser para XML, JSON.parse para JSON)
│  │
│  └─ → ❓
│
├─ Consumo em API REST?
│  ├─ Sim → ✅ JSON (padrão REST)
│  │
│  └─ → ❓
│
├─ Documentos com marcação semântica (SVG, MathML, DocBook)?
│  ├─ Sim → ✅ XML
│  │
│  └─ → ❓
│
└─ Legado/sistema existente?
    ├─ Sim → ✅ XML (manter consistência)
    └─ Não → ✅ JSON (mais simples, seguro, performático)
```

### Resumo: XML é preferível quando...
- Você precisa de **namespaces** para desambiguação
- O dado é intrinsicamente **hierárquico com marcação semântica**
- Você usa **XSLT** para transformações declarativas
- O formato precisa de **schema validation** (XSD)
- É um formato de documento (SVG, MathML, DocBook)

### JSON é preferível quando...
- Dados para **API REST/GraphQL**
- **Performance de parsing** é crítica
- **Simplicidade** é prioridade
- Desenvolvimento **frontend moderno** (SPA)
- Superfície de **segurança menor** (sem XXE)

---

## 2. Transformação: XSLT vs JavaScript

```
Precisa transformar XML?
│
├─ A transformação roda no browser?
│  ├─ Sim → ❓
│  │  ├─ Precisa suportar Chrome? (XSLT declinante)
│  │  │  ├─ Sim → ✅ JavaScript
│  │  │  └─ Não → ❓
│  │  │
│  │  ├─ Transformação simples/linear?
│  │  │  ├─ Sim → ✅ JavaScript (DOMParser + template literals)
│  │  │  └─ Não → ❓
│  │  │
│  │  └─ Transformação complexa baseada em regras?
│  │     ├─ Sim → ⚠️ XSLT 1.0 (testar compatibilidade)
│  │     └─ Não → ✅ JavaScript
│  │
│  └─ Não (server-side/batch) → ❓
│     ├─ Precisa de XSLT 2.0/3.0?
│     │  ├─ Sim → ✅ Saxon (Java/.NET)
│     │  └─ Não → ❓
│     │
│     └─ Prefere pipeline declarativo?
│        ├─ Sim → ✅ XSLT
│        └─ Não → ✅ JavaScript/Node.js
│
└─ Precisa transformar XML → XML (schema diferente)?
   ├─ Sim → ✅ XSLT (excelente para isso)
   └─ → ❓
```

### Quando usar XSLT (2024-2026):
- ✅ Pipeline XML → XML com schemas diferentes
- ✅ Transformação declarativa sem lógica imperativa
- ✅ Server-side com Saxon (XSLT 2.0/3.0)
- ✅ Batch processing de grandes volumes
- ✅ Sistemas legados que já usam XSLT
- ✅ Documentos com `<?xml-stylesheet type="text/xsl"?>` (mas ⚠️ Chrome)

### Quando usar JavaScript:
- ✅ Transformação client-side moderna
- ✅ Quando Chrome/Safari são browsers alvo
- ✅ Precisa de lógica imperativa complexa
- ✅ Integração com APIs/Promises
- ✅ SPAs e aplicações dinâmicas
- ✅ Template literals + DOMParser para transformação simples

---

## 3. Query: XPath vs CSS Selectors

```
Precisa consultar/navegar documento?
│
├─ O documento é HTML?
│  ├─ Sim → ❓
│  │  ├─ Query simples (classe, id, tag)?
│  │  │  ├─ Sim → ✅ CSS Selectors (querySelectorAll)
│  │  │  └─ Não → ❓
│  │  │
│  │  ├─ Query baseada em texto?
│  │  │  ├─ Sim → ✅ XPath (contains(text(),'...'))
│  │  │  └─ Não → ❓
│  │  │
│  │  ├─ Query por posição/contexto complexo?
│  │  │  ├─ Sim → ✅ XPath
│  │  │  └─ Não → ✅ CSS Selectors
│  │  │
│  │  └─ Precisa navegar para ancestrais/following?
│  │     ├─ Sim → ✅ XPath (ou CSS :has())
│  │     └─ Não → ✅ CSS Selectors
│  │
│  └─ Não (XML puro) → ❓
│     ├─ Documento com namespace?
│     │  ├─ Sim → ✅ XPath (com resolver)
│     │  └─ Não → ✅ XPath ou querySelectorAll
│     │
│     └─ Query complexa com funções (count, sum, concat)?
│        ├─ Sim → ✅ XPath
│        └─ Não → ✅ querySelectorAll (mais simples)
│
└─ Performance é crítica?
   ├─ Sim → ✅ CSS Selectors (mais rápidos em browsers)
   └─ → ✅ XPath (mais expressivo)
```

### Resumo:
- **CSS Selectors**: Consultas simples em HTML, melhor performance
- **XPath**: Consultas complexas, XML com namespaces, queries baseadas em texto, navegação estrutural

---

## 4. Parsing: DOMParser vs Outros

```
Precisa processar XML em JavaScript?
│
├─ Precisa parsear string XML?
│  ├─ Sim → ✅ DOMParser (única API nativa)
│  │
│  └─ Não → ❓
│
├─ Precisa carregar de URL?
│  ├─ Sim → ✅ fetch() + DOMParser
│  │
│  └─ Não → ❓
│
├─ Precisa suporte a XPath no resultado?
│  ├─ Sim → ✅ DOMParser + document.evaluate()
│  │
│  └─ Não → ❓
│
└─ XML muito grande (> 50MB)?
   ├─ Sim → ⚠️ DOMParser não escala (SAX/streaming não disponível em browser)
   │        Considere Web Workers ou processamento server-side
   └─ Não → ✅ DOMParser
```

---

## 5. Extensões: EXSLT vs Alternativas

```
Precisa de funcionalidade além do XSLT 1.0?
│
├─ Regex em XSLT?
│  ├─ Sim → ✅ EXSLT regexp ou JavaScript
│  │
│  └─ Não → ❓
│
├─ Operações de conjunto (union, difference)?
│  ├─ Sim → ✅ EXSLT set
│  │
│  └─ Não → ❓
│
├─ Funções matemáticas (max, min)?
│  ├─ Sim → ✅ EXSLT math
│  │
│  └─ Não → ❓
│
├─ Processar RTF (variáveis com conteúdo)?
│  ├─ Sim → ✅ EXSLT exsl:node-set()
│  │
│  └─ Não → ❓
│
└─ Split/tokenize de strings?
   ├─ Sim → ✅ EXSLT str
   └─ → ✅ JavaScript
```

---

## 6. Compatibilidade entre Browsers (2024-2026)

| Tecnologia | Firefox | Chrome | Safari | Edge |
|---|---|---|---|---|
| XSLTProcessor | ✅ Completo | ⚠️ Legado | ✅ | ⚠️ Legado |
| `<?xml-stylesheet type="text/xsl"?>` | ✅ | ⚠️ Declinante | ✅ | ⚠️ Declinante |
| `document.evaluate()` | ✅ | ✅ | ✅ | ✅ |
| XPath 1.0 | ✅ Completo | ✅ | ✅ | ✅ |
| XPath 2.0+ | ❌ | ❌ | ❌ | ❌ |
| DOMParser | ✅ | ✅ | ✅ | ✅ |
| XMLSerializer | ✅ | ✅ | ✅ | ✅ |
| EXSLT | ✅ Parcial | ❌ | ❌ | ❌ |
| OpenSearch | ✅ | ✅ | ✅ | ✅ |

> ⚠️ XSLT como tecnologia client-side está em declínio. Chrome reduziu significativamente o suporte. Prefira JavaScript para transformações client-side em projetos novos.

---

## 7. Matriz de Risco

| Tecnologia | Risco Segurança | Risco Compatibilidade | Risco Performance | Recomendação |
|---|---|---|---|---|
| DTD com entidades externas | 🔴 ALTO | 🟢 Baixo | 🟢 Bom | EVITE |
| XSLT client-side | 🟢 Baixo | 🔴 ALTO (Chrome) | 🟢 Bom | EVITE para novos projetos |
| XPath complexo | 🟢 Baixo | 🟢 Baixo | 🟡 Médio | USE com moderação |
| XMLHttpRequest | 🟡 Médio | 🟢 Baixo | 🟡 Médio | EVITE (fetch) |
| DOMParser + fetch | 🟢 Baixo | 🟢 Baixo | 🟢 Bom | ✅ PREFERIDO |
| JSON APIs | 🟢 Baixo | 🟢 Baixo | 🟢 Bom | ✅ PREFERIDO |
| EXSLT | 🟢 Baixo | 🔴 ALTO (só Firefox) | 🟢 Bom | USE com fallback |
