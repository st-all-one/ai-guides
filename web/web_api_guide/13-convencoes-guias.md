# Convenções para Subdiretórios de Guia

## Visão Geral

Subdiretórios de guia (`api/nome_api/using_algo/`) são **opcionais e raros** — apenas ~45 das 1228+ APIs (~3.7%) os possuem. Este documento detalha o padrão real observado.

## Estrutura Esperada vs Real

### Padrão Documentado Originalmente

```
api/nome_da_api/
  index.md                    # Overview
  using_api/                  # Guia de uso
    index.md
  concepts/                   # Conceitos (raro)
    index.md
  security/                   # Segurança (não observado no repo)
    index.md
```

### Realidade do Repositório

A maioria das APIs tem **apenas** `api/nome_api/index.md` (overview) com o conteúdo de guia embutido. Guias em subdiretórios são criados apenas quando:

1. A API é complexa o suficiente para justificar >2 páginas de explicação
2. Existem casos de uso múltiplos que não cabem em um único guia
3. A API tem conceitos avançados que merecem tratamento separado

## Nomenclatura Real de Subdiretórios de Guia

O padrão documentado (`using_api/`) é apenas um entre vários. A nomenclatura real varia:

### `using_*` (mais comum)

| Subdiretório | API |
|-------------|-----|
| `using_fetch/` | Fetch API |
| `using_the_web_audio_api/` | Web Audio API |
| `using_the_gamepad_api/` | Gamepad API |
| `using_the_geolocation_api/` | Geolocation API |
| `using_the_webcodecs_api/` | WebCodecs API |
| `using_screen_capture/` | Screen Capture API |
| `using_data_channels/` | WebRTC API |
| `using_dtmf/` | WebRTC API |
| `using_encoded_transforms/` | WebRTC API |
| `using_deferred_fetch/` | Fetch Later API |
| `using_websocketstream/` | WebSocketStream API |
| `using_audioworklet/` | Web Audio API |
| `using_types/` | CSS Typed OM |
| `using_element-scoped/` | CSS Custom Highlight API |
| `using_secure_payment_confirmation/` | Payment Request API |

### `concepts/` (raro — apenas 3 APIs)

| Subdiretório | API |
|-------------|-----|
| `concepts/` | Payment Request API |
| `concepts/` | Streams API |
| `concepts/` | WebVR API |

### Nomes únicos

| Subdiretório | API |
|-------------|-----|
| `basics/` | Web Audio API |
| `advanced/` | Web Audio API |
| `api_para/` | Canvas API |
| `security/` | **Não encontrado em nenhuma API** |

## Quando Criar um Guia

**Critérios para criar um subdiretório de guia:**

1. **Volume de conteúdo**: Overview excede ~20 parágrafos ou ~300 linhas
2. **Múltiplos casos de uso**: API tem 3+ cenários de uso distintos (ex: Fetch → GET, POST, streaming, uploading)
3. **Conceitos fundamentais**: API requer explicação de conceitos antes do uso (ex: Streams → backpressure, locking, teeing)
4. **Tutorial passo a passo**: Guia de início rápido que não cabe no overview

**Quando NÃO criar:**

1. API simples com 1-2 interfaces (ex: Battery API, Beacon API, Vibration API)
2. API que já tem guia na seção `/media/` (ex: codecs, delivery são cobertos por media guides)
3. Conteúdo que pode ser coberto pela seção de exemplos do overview

## Boas Práticas

### Nomenclatura

- `using_[nome_da_funcionalidade]/` — padrão preferido
- Usar snake_case, nomes descritivos mas concisos
- Evitar artigos (`the`, `a`), exceto quando fizer parte do nome oficial da API
- Exemplos: `using_fetch/`, `using_webcodecs/`, `using_screen_capture/`

### Front Matter do Guia

```yaml
---
title: 'Usando a Fetch API'
slug: Web/API/Fetch_API/Using_Fetch
page-type: guide
browser-compat: api.fetch
---
{{DefaultAPISidebar("Fetch API")}}
```

### Estrutura Interna

1. Breve introdução conectando com o overview
2. Passos ou seções numeradas
3. Exemplos de código executáveis com `{{EmbedLiveSample}}`
4. Seção de "Solução de problemas" se aplicável
5. Referência cruzada para overview da API e interfaces relacionadas

## Anti-patterns

1. **Guia sem overview**: Guia pressupõe conceitos não explicados no overview — adicionar seção introdutória
2. **Overview com conteúdo de guia**: Overview muito longo (>300 linhas) — considerar mover conteúdo para guia
3. **Múltiplos guias sem organização**: Agrupar guias relacionados sob prefixo comum (`using_*`, `concepts/`)
4. **Guia órfão**: Subdiretório de guia sem link no overview da API — adicionar seção "Guias" no overview
5. **Nome inconsistente**: `Using_Fetch` vs `using_fetch` — preferir snake_case no slug e no nome do diretório
