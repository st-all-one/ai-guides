# Page-types: Contexto de Uso e Tipos Adicionais

## Visão Geral

O glossário original (doc 06) lista os page-types. Este documento detalha o **contexto de uso** de cada tipo e adiciona tipos não documentados.

## Page-types Documentados Anteriormente

| page-type | Uso |
|-----------|-----|
| `web-api-overview` | Página raiz de uma API (`api/Nome_API/index.md`) |
| `web-api-interface` | Página de interface (`api/NomeInterface/index.md`) |
| `web-api-method` | Subpágina de método (`api/NomeInterface/nome_metodo/`) |
| `web-api-property` | Subpágina de propriedade (`api/NomeInterface/nome_propriedade/`) |
| `web-api-event` | Subpágina de evento (`api/NomeInterface/nome_evento/`) |
| `web-api-constructor` | Subpágina de construtor (`api/NomeInterface/NomeInterface/`) |
| `webgl-extension` | Extensão WebGL (`api/webgl_*/`) |
| `webgl-extension-method` | Método de extensão WebGL (`api/webgl_*/nome_metodo/`) |
| `guide` | Guia de uso (`api/Nome_API/using_*/`) |
| `landing-page` | Página de aterrissagem (`api/index.md`, `media/index.md`) |
| `listing-page` | Página de listagem (`media/guides/index.md`) |

## Page-types Adicionais (Não Documentados)

### `webgl-extension-method`

Para métodos individuais de extensões WebGL.

**Path**: `api/nome_extensao/nome_metodo/index.md`

**Front matter**:
```yaml
---
title: 'EXT_disjoint_timer_query: beginQueryEXT()'
slug: Web/API/EXT_disjoint_timer_query/beginQueryEXT
page-type: webgl-extension-method
browser-compat: api.EXT_disjoint_timer_query.beginQueryEXT
---
```

**Estrutura**: Similar a `web-api-method`:
- Sintaxe (com parâmetros específicos de WebGL)
- Valor de retorno
- Erros (WebGL-specific)
- Exemplos
- Especificações
- Compatibilidade

**Exemplos no repositório**: 22 arquivos, incluindo:
- `ext_disjoint_timer_query/beginqueryext/`
- `ext_disjoint_timer_query/createqueryext/`
- `oes_vertex_array_object/bindvertexarrayoes/`
- `webgl_multi_draw/multidrawarrayswebgl/`

### Observação sobre `guide` em contextos específicos

O page-type `guide` é usado tanto em `api/` quanto em `media/`:

**Em `api/`** (guia de uso de API específica):
```yaml
---
title: 'Using Fetch'
slug: Web/API/Fetch_API/Using_Fetch
page-type: guide
---
```

**Em `media/`** (guia de tecnologia transversal):
```yaml
---
title: 'Audio and video manipulation'
slug: Web/Media/Guides/Audio_and_video_manipulation
page-type: guide
sidebar: mediasidebar
---
```

## Contexto de Uso: `landing-page` vs `listing-page`

### `landing-page`

Página de **aterrissagem** com resumo editorial, destaques e navegação manual.

| Local | Conteúdo |
|-------|----------|
| `api/index.md` | Visão geral de todas as Web APIs com links para categorias |
| `media/index.md` | Visão geral de tecnologias de mídia com destaques |

**Características**:
- Conteúdo escrito manualmente (não gerado)
- Seções de destaque, links para áreas principais
- Pode conter tabela de conteúdo ou cards
- **Não** usa `{{SubPagesWithSummaries}}`

### `listing-page`

Página de **listagem** com índice gerado automaticamente.

| Local | Conteúdo |
|-------|----------|
| `media/guides/index.md` | Lista automática de todos os guias de mídia |

**Características**:
- Usa `{{SubPagesWithSummaries}}` para gerar lista
- Mínimo conteúdo editorial (apenas introdução curta)
- Links para subpáginas com resumos automáticos
- Atualização automática quando novas subpáginas são adicionadas

### Quando Usar Cada Um

| Use `landing-page` quando... | Use `listing-page` quando... |
|------------------------------|------------------------------|
| Página raiz de seção grande | Índice de subpáginas |
| Conteúdo editorial relevante | Conteúdo é uma lista de links |
| Destaques e navegação são manuais | Lista deve ser automática |
| Precisa de seções/cards personalizados | Precisa de atualização automática |
| Ex: página inicial de API ou seção | Ex: índice de guias ou tutoriais |

## Tabela Completa de Page-types

| page-type | Seção | Descrição |
|-----------|-------|-----------|
| `landing-page` | `api/`, `media/` | Página de aterrissagem editorial |
| `listing-page` | `media/` | Índice automático de subpáginas |
| `guide` | `api/`, `media/` | Guia de uso ou tutorial |
| `web-api-overview` | `api/` | Visão geral de uma Web API |
| `web-api-interface` | `api/` | Interface da Web API |
| `web-api-method` | `api/` | Método de interface |
| `web-api-property` | `api/` | Propriedade de interface |
| `web-api-event` | `api/` | Evento de interface |
| `web-api-constructor` | `api/` | Construtor de interface |
| `webgl-extension` | `api/` | Extensão WebGL |
| `webgl-extension-method` | `api/` | Método de extensão WebGL |
| `svg-element` | `api/` | Elemento SVG (quando aplicável) |
| `css-function` | `api/` | Função CSS (via CSSOM) |
| `css-property` | `api/` | Propriedade CSS (via CSSOM) |

## Validação de Page-types

### Regras

1. **Cada página deve ter exatamente um `page-type`**
2. **O tipo deve corresponder ao conteúdo** — uma página de método não pode ser `web-api-interface`
3. **APIs experimentais** podem ter qualquer page-type combinado com `status: [experimental]`
4. **Slug e page-type devem ser consistentes**:
   - `web-api-method` → slug termina com nome do método
   - `web-api-constructor` → slug é `Interface/Interface`
   - `web-api-event` → slug termina com `_event`
   - `webgl-extension-method` → slug está dentro de extensão WebGL

### Exemplos de Inconsistências a Evitar

```yaml
# ❌ page-type não corresponde ao slug
slug: Web/API/Fetch_API/Using_Fetch
page-type: web-api-method  # Deveria ser 'guide'
```

```yaml
# ❌ page-type não corresponde à estrutura
slug: Web/API/Request/Request
page-type: web-api-method  # Deveria ser 'web-api-constructor'
```

```yaml
# ✅ Correto
slug: Web/API/Request/Request
page-type: web-api-constructor
```
