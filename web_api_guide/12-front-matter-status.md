# Front Matter: Campo `status:`

## Visão Geral

O campo `status` no front matter YAML sinaliza o estado de padronização e implementação de uma API. É usado em páginas de overview e interface para complementar os badges inline.

## Sintaxe

### Formato Array (recomendado)

```yaml
status: [experimental]
status: [deprecated, non-standard]
status: [experimental, non-standard]
```

### Formato String (menos comum)

```yaml
status: experimental
```

**⚠️ Preferir formato array** — é mais explícito quando múltiplos status se aplicam e é o formato mais usado no repositório.

## Valores Válidos

| Valor | Significado | Badge Correspondente |
|-------|-------------|---------------------|
| `experimental` | Recurso experimental, pode mudar | `{{experimental_badge}}` ou `{{experimental_inline}}` |
| `deprecated` | Recurso obsoleto, evitar uso | `{{deprecated_badge}}` ou `{{deprecated_inline}}` |
| `non-standard` | Não faz parte de especificação oficial | `{{Non-standard_badge}}` ou `{{Non-standard_Inline}}` |

## Exemplos no Repositório

### Experimental (único)

```yaml
---
title: 'Compute Pressure API'
slug: Web/API/Compute_Pressure_API
page-type: web-api-overview
status: [experimental]
browser-compat: api.ComputePressure
---
```

Usado em: `api/compute_pressure_api/index.md`, `api/fenced_frame_api/index.md`, `api/background_fetch_api/index.md`, `api/editcontext_api/index.md`, `api/keyboard_api/index.md`

### Deprecated + non-standard

```yaml
---
title: 'Shared Storage API'
slug: Web/API/Shared_Storage_API
page-type: web-api-overview
status: [deprecated, non-standard]
browser-compat: api.SharedStorage
---
```

Usado em: `api/shared_storage_api/index.md`, `api/attribution_reporting_api/index.md`, `api/topics_api/index.md`

### Experimentais específicas

```yaml
---
title: 'Speculation Rules API'
slug: Web/API/Speculation_Rules_API
page-type: web-api-overview
status: experimental
browser-compat: api.SpeculationRules
---
```

Usado em: `api/speculation_rules_api/index.md` (formato string — menos comum)

### Sem `status:`

A maioria das APIs estáveis e padronizadas (Fetch, WebSocket, DOM, Canvas, Web Audio, WebRTC, Streams) **não** usa o campo `status:` — a ausência indica padrão estável.

## Quando Usar

| Situação | Uso |
|----------|-----|
| API estável e padronizada | **Não incluir** `status:` |
| API experimental | `status: [experimental]` |
| API obsoleta | `status: [deprecated]` |
| API não padronizada (ex: Chrome-only) | `status: [non-standard]` |
| API obsoleta e não padronizada | `status: [deprecated, non-standard]` |
| API experimental e não padronizada | `status: [experimental, non-standard]` |

## Relação com Badges Inline

O campo `status:` no front matter **não** substitui os badges inline — ambos devem ser usados:

- `status: [experimental]` no YAML → metadado para ferramentas e SEO
- `{{experimental_badge}}` ou `{{experimental_inline}}` no corpo → badge visual para leitores

## Anti-patterns

1. **Formato inconsistente**: String vs array — escolher array (`[experimental]`) e manter consistência
2. **Status conflitante**: `status: [deprecated]` combinado com badges de "novo" ou sem badge de deprecated
3. **Status ausente em APIs experimentais**: APIs raspando em spec ou com `browser-compat` parcial DEVEM ter `status: [experimental]`
4. **Status duplicado**: Usar `status: [experimental, experimental]` — YAML permite mas é semanticamente errado
5. **Badge sem status YAML**: Pode ter badge visual sem `status:` no YAML (para menções inline), mas o inverso (YAML sem badge) é aceitável se o badge estiver implícito
