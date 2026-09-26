# Front Matter: Campo `sidebar:` e Mecanismos de Sidebar

## Visão Geral

Existem **dois mecanismos distintos** para controlar sidebars no repositório MDN, usados em seções diferentes sem sobreposição:

| Seção | Mecanismo | Exemplo |
|-------|-----------|---------|
| `/media/` | Campo `sidebar:` no front matter YAML | `sidebar: mediasidebar` |
| `/api/` | Macros KumaScript no corpo | `{{DefaultAPISidebar("...")}}` ou `{{APIRef("...")}}` |

## Mecanismo 1: `sidebar:` (YAML) — usado em `/media/`

Toda página em `/media/` usa o campo `sidebar:` no front matter:

```yaml
---
title: 'Media guides'
slug: Web/Media
page-type: landing-page
sidebar: mediasidebar
---
```

### Valores de `sidebar:` encontrados

| Valor | Local de Uso |
|-------|-------------|
| `mediasidebar` | Todas as páginas em `/media/` (guia, index, subpáginas) |

### Funcionamento

- O valor referencia um template de sidebar pré-definido (ex: `mediasidebar` → sidebar com links para todos os guias de mídia)
- A sidebar é **fixa** para toda a seção — todas as páginas usam o mesmo valor
- A sidebar é renderizada automaticamente pelo sistema de template MDN com base no valor do campo YAML
- Não requer macros adicionais no corpo da página

### Estrutura do front matter para `/media/`

```yaml
---
title: 'Título da Página'
slug: Web/Media/algum/caminho
page-type: guide  # ou listing-page, landing-page
sidebar: mediasidebar
---
```

## Mecanismo 2: Macros de Sidebar — usado em `/api/`

Nenhuma página em `/api/` usa `sidebar:` no front matter. Em vez disso, usam macros KumaScript:

### `{{DefaultAPISidebar("NomeDaAPI")}}`

Usado em **páginas de overview/guide** de uma API.

```markdown
---
title: 'Fetch API'
slug: Web/API/Fetch_API
page-type: web-api-overview
browser-compat: api.fetch
---
{{DefaultAPISidebar("Fetch API")}}
```

- Gera uma sidebar com links para todas as interfaces, métodos, propriedades e guias da API
- O parâmetro é o nome da API (deve corresponder ao sidebar config)
- Sidebar é populada automaticamente com base no `browser-compat` e na estrutura de diretórios

### `{{APIRef("NomeDaAPI")}}`

Usado em **páginas de interface, método, propriedade, evento, construtor**.

```markdown
---
title: 'Request()'
slug: Web/API/Request/Request
page-type: web-api-constructor
browser-compat: api.Request.Request
---
{{APIRef("Fetch API")}}
```

- Gera sidebar mais compacta focada nas subpáginas da API pai
- Parâmetro indica qual definição de sidebar usar
- Serve como navegação contextual para a API específica

### Outros tipos de sidebar em `/api/`

| Macro | Uso |
|-------|-----|
| `{{CSSRef}}` | Para APIs CSS (CSS Object Model, CSS Typed OM) |
| `{{SVGRef}}` | Para a API SVG |
| `{{HTMLSidebar}}` | Para APIs HTML (HTML DOM, elementos HTML) |
| `{{WebExtAPISidebar}}` | Para APIs de extensões (não presente neste repo) |

## Diferenças Arquiteturais

| Aspecto | `/media/` (`sidebar:`) | `/api/` (macros) |
|---------|----------------------|------------------|
| Controle | Centralizado (valor fixo no YAML) | Distribuído (macro em cada página) |
| Flexibilidade | Sidebar fixa para toda seção | Sidebar varia por API |
| Manutenção | Mudança no template afeta todas as páginas | Cada página pode ter sidebar diferente |
| Relação slug | Sidebar independe do slug | Sidebar pode ser inferida do `browser-compat` |
| Customização | Não permite sidebar diferente por subpágina | Páginas filhas usam `{{APIRef}}` com nome diferente |

## Implicações para Integração Media/API

Ao integrar conteúdo entre `/media/` e `/api/`:

1. **Cross-linking**: Páginas em `/media/` que referenciam APIs podem usar `{{DefaultAPISidebar}}` no corpo OU manter `sidebar: mediasidebar` com links manuais — não devem usar ambos
2. **Sidebar unificada**: Se criar páginas híbridas, decida qual mecanismo usar:
   - `sidebar: mediasidebar` + links manuais para APIs (simples, sem macros)
   - `{{DefaultAPISidebar}}` + sem `sidebar:` no YAML (requer configurar sidebar para incluir guias de mídia)
3. **Páginas de guia em `/media/`**: Não devem usar `{{APIRef}}` pois não têm `browser-compat` — a sidebar seria vazia
4. **Consistência**: Dentro de uma mesma seção, usar apenas UM mecanismo. Misturar causa sidebars duplicadas ou conflitantes

## Boas Práticas

- **Para novas seções de documentação**: Preferir o mecanismo `sidebar:` se a seção tiver sidebar homogênea; preferir macros se cada API precisar de sidebar específica
- **Ao migrar conteúdo**: Remover o campo `sidebar:` ao adicionar macros de sidebar (e vice-versa)
- **Verificação**: Sempre verificar se a sidebar renderizada corresponde ao esperado — macros com parâmetros incorretos geram sidebars vazias
