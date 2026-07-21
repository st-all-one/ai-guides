# Macros Adicionais e Variantes de Capitalização

## Visão Geral

O glossário original (doc 06) documenta as macros principais. Este documento complementa com macros e variantes não cobertas, encontradas no repositório real.

## Macros de Conteúdo

### `{{EmbedGHLiveSample}}`

Incorpora um exemplo interativo hospedado em um repositório GitHub (diferente de `{{EmbedLiveSample}}`, que usa código inline na página).

```
{{EmbedGHLiveSample('dom-examples/webgl-examples/tutorial/sample8/index.html', 670, 510)}}
```

**Parâmetros**:
1. Caminho do arquivo no repositório `mdn/` (sem URL completa)
2. Largura (px)
3. Altura (px)

**Uso**: `media/guides/audio_and_video_manipulation/index.md` (linha 114)

**Diferença de `{{EmbedLiveSample}}`**:

| Macro | Origem do Código | Vantagem |
|-------|------------------|----------|
| `{{EmbedLiveSample}}` | Bloco de código inline na página | Autocontido, sem dependência externa |
| `{{EmbedGHLiveSample}}` | Arquivo em repositório GitHub | Código completo (HTML+CSS+JS), reutilizável |

### `{{SubPagesWithSummaries}}`

Gera automaticamente uma lista de subpáginas com seus resumos (primeiro parágrafo). Usado em páginas índice.

```
{{SubPagesWithSummaries}}
```

**Uso**:
- `media/guides/index.md`
- `media/guides/formats/index.md`

**Comportamento**: Varre o diretório atual, lista subdiretórios com links e extrai o resumo de cada página.

## Macros de Badge — Variantes de Capitalização

As macros de badge existem em múltiplas formas de capitalização no repositório. Embora produzam o mesmo resultado visual, é importante documentar as variantes encontradas.

### `{{SecureContext_Header}}` (PascalCase)

```markdown
{{SecureContext_Header}}  <!-- também aceito -->
{{securecontext_header}}  <!-- forma padrão documentada -->
```

**Uso**: `api/web_midi_api/index.md` usa `{{SecureContext_Header}}`.

### `{{Experimental_Inline}}` (PascalCase)

```markdown
{{Experimental_Inline}}   <!-- também aceito -->
{{experimental_inline}}   <!-- forma padrão documentada -->
```

**Uso**: `api/background_fetch_api/index.md` (linha 31) usa `{{Experimental_Inline}}`.

### `{{Non-standard_Inline}}` (PascalCase)

```markdown
{{Non-standard_Inline}}   <!-- forma padrão (já documentada) -->
```

### Tabela de Variantes

| Macro | Formas Encontradas | Padrão Recomendado |
|-------|-------------------|-------------------|
| `securecontext_header` | `securecontext_header`, `SecureContext_Header` | `securecontext_header` |
| `experimental_inline` | `experimental_inline`, `Experimental_Inline` | `experimental_inline` |
| `deprecated_inline` | `deprecated_inline` (consistente) | `deprecated_inline` |
| `non-standard_inline` | `Non-standard_Inline` (consistente) | `Non-standard_Inline` |
| `experimental_badge` | `experimental_badge` (consistente) | `experimental_badge` |
| `deprecated_badge` | `deprecated_badge` (consistente) | `deprecated_badge` |
| `non-standard_badge` | `Non-standard_badge` (consistente) | `Non-standard_badge` |

## Macros de Contexto — Parâmetros de `AvailableInWorkers`

### Parâmetros Documentados Anteriormente

| Macro | Contexto |
|-------|----------|
| `{{AvailableInWorkers}}` | Todos os workers |
| `{{AvailableInWorkers("window_and_dedicated")}}` | Window + dedicated worker |
| `{{AvailableInWorkers("window_and_worker_except_service")}}` | Window + todos exceto service worker |

### Parâmetro Adicional Encontrado

| Macro | Contexto | Exemplo |
|-------|----------|---------|
| `{{AvailableInWorkers("window_and_service")}}` | Window + service worker (exclui dedicated) | `api/cookie_store_api/index.md` |

### Tabela Completa de Parâmetros

| Parâmetro | Window | Dedicated Worker | Service Worker | Shared Worker |
|-----------|--------|-----------------|----------------|---------------|
| _(sem parâmetro)_ | ❌ | ✅ | ✅ | ✅ |
| `"window_and_dedicated"` | ✅ | ✅ | ❌ | ❌ |
| `"window_and_worker_except_service"` | ✅ | ✅ | ❌ | ✅ |
| `"window_and_service"` | ✅ | ❌ | ✅ | ❌ |

## Macros de Badge de Status

### `{{deprecated_badge}}` vs `{{deprecated_inline}}`

| Macro | Aparência | Uso |
|-------|-----------|-----|
| `{{deprecated_badge}}` | Badge grande no topo | Páginas de API obsoleta |
| `{{deprecated_inline}}` | Badge pequeno inline | Ao lado de método/propriedade específica |
| `{{experimental_badge}}` | Badge grande no topo | Páginas de API experimental |
| `{{experimental_inline}}` | Badge pequeno inline | Ao lado de recurso experimental específico |
| `{{Non-standard_badge}}` | Badge grande no topo | Páginas de API não padronizada |
| `{{Non-standard_Inline}}` | Badge pequeno inline | Ao lado de recurso não padronizado específico |

## Convenções

1. **Preferir minúsculas**: Usar `{{securecontext_header}}` em vez de `{{SecureContext_Header}}` para consistência
2. **Badge de página vs inline**: Usar `{{*_badge}}` no topo de páginas dedicadas; `{{*_inline}}` ao lado de itens em listas
3. **Múltiplos badges**: Ordem padrão: `securecontext_header` → `DefaultAPISidebar` → `AvailableInWorkers`
4. **EmbedGHLiveSample**: Preferir `EmbedLiveSample` para exemplos simples; `EmbedGHLiveSample` apenas quando o exemplo requer múltiplos arquivos ou setup complexo
