# Anti-pattern: Múltiplos `spec-urls` no Front Matter

## Visão Geral

O campo `spec-urls` no front matter YAML lista URLs de especificações que uma API abrange. O anti-pattern ocorre quando muitas URLs são listadas sem critério claro, dificultando a manutenção e navegação.

## O Problema

Quando uma página lista múltiplas `spec-urls`, fica ambíguo qual especificação cobre qual parte da API. Isso é especialmente problemático para APIs que consolidam funcionalidades de múltiplas specs.

## Exemplos no Repositório

### Exemplo Excessivo — Performance API (14 spec-urls)

```yaml
---
title: 'Performance API'
slug: Web/API/Performance_API
page-type: web-api-overview
spec-urls:
  - https://www.w3.org/TR/navigation-timing/
  - https://www.w3.org/TR/resource-timing/
  - https://www.w3.org/TR/user-timing/
  - https://www.w3.org/TR/hr-time/
  - https://www.w3.org/TR/performance-timeline/
  - https://www.w3.org/TR/requestidlecallback/
  - https://www.w3.org/TR/longtasks-1/
  - https://www.w3.org/TR/element-timing/
  - https://www.w3.org/TR/event-timing/
  - https://www.w3.org/TR/largest-contentful-paint/
  - https://w3c.github.io/server-timing/
  - https://www.w3.org/TR/2018/WD-navigation-timing-2-20180110/
  - https://w3c.github.io/paint-timing/
  - https://wicg.github.io/responsive-image-measurement/
```

**Problema**: Mistura specs W3C TR atuais, rascunhos do W3C GitHub, e uma versão antiga (2018). Difícil saber qual é a spec principal.

### Exemplo Moderado — Reporting API (7 spec-urls)

```yaml
---
title: 'Reporting API'
slug: Web/API/Reporting_API
page-type: web-api-overview
spec-urls:
  - https://www.w3.org/TR/reporting-1/
  - https://www.w3.org/TR/CSP3/
  - https://www.w3.org/TR/permissions-policy-1/
  - https://w3c.github.io/reporting/
  - https://w3c.github.io/webappsec-csp/
  - https://w3c.github.io/webappsec-permissions-policy/
  - https://www.w3.org/TR/network-error-logging/
```

**Problema**: Mistura a spec principal (Reporting) com specs relacionadas (CSP, Permissions-Policy, NEL), criando overlap.

### Exemplo Mínimo Aceitável — Keyboard API (2 spec-urls)

```yaml
---
title: 'Keyboard API'
slug: Web/API/Keyboard_API
page-type: web-api-overview
spec-urls:
  - https://wicg.github.io/keyboard-map/
  - https://wicg.github.io/keyboard-lock/
```

**Aceitável**: Duas specs distintas que cobrem diferentes aspectos da API, sem overlap.

## Critérios para `spec-urls`

### Aceitável

| Situação | Exemplo | Motivo |
|----------|---------|--------|
| API definida em spec única | `Fetch API` → 1 URL | Spec única cobre toda a API |
| API com partes em specs separadas sem overlap | `Keyboard API` → 2 URLs | Cada spec cobre parte disjunta |
| API que referencia spec de interoperabilidade | `WebSocket API` → 1 URL + spec de protocolo | Specs complementares |

### Excesso (anti-pattern)

| Situação | Exemplo | Problema |
|----------|---------|----------|
| Listar versões antigas de specs | navigation-timing-2-20180110 | Spec desatualizada |
| Listar specs relacionadas mas não da API | CSP3, Permissions-Policy em Reporting API | Overlap com docs de outras APIs |
| Listar rascunhos e TRs da mesma spec | reporting-1 + w3c.github.io/reporting | Duplicação (TR já cobre) |
| Listar specs de responsabilidade de outras APIs | Server-Timing em Performance API | Server-Timing é header HTTP, não parte da API |

## Boas Práticas

### 1. Uma spec principal por API

```yaml
# Fetch API
spec-urls: https://fetch.spec.whatwg.org/
```

### 2. Máximo 2-3 specs justificáveis

```yaml
# Keyboard API (duas features distintas)
spec-urls:
  - https://wicg.github.io/keyboard-map/
  - https://wicg.github.io/keyboard-lock/
```

```yaml
# Web Audio API (core + específica de contexto)
spec-urls:
  - https://webaudio.github.io/web-audio-api/
  - https://webaudio.github.io/web-audio-api/#AudioContext
```

### 3. Preferir TR (W3C Recommendation) sobre rascunho

```yaml
# ✅ Preferir TR
spec-urls: https://www.w3.org/TR/reporting-1/

# ❌ Evitar rascunho se TR existe
spec-urls: https://w3c.github.io/reporting/
```

### 4. Remover specs que não definem a API

```yaml
# ❌ Incorreto para Reporting API:
# - CSP3 define CSP, não Reporting
# - Permissions-Policy define PP, não Reporting

# ✅ Correto:
spec-urls: https://www.w3.org/TR/reporting-1/
```

## Quando É Justificável Ter Múltiplas spec-urls

1. **API consolidada**: Performance API agrega várias specs de timing — cada uma define uma parte distinta. Neste caso, justifica-se listar todas as specs-filhas, mas sem duplicar versões ou incluir specs tangenciais.
2. **API com múltiplos módulos**: APIs que são guarda-chuva de submódulos com specs independentes.
3. **API que cruza specs**: Ex: APIs que têm parte na spec HTML e parte em spec própria.

## Recomendação

- APIs consolidadas como Performance API: listar specs **distintas e ativas**, sem duplicar TR/rascunho
- APIs com overlap: usar **apenas a spec principal** no `spec-urls` e mencionar specs relacionadas no corpo da página
- APIs simples: manter **1 spec-url** (ou 0 se a especificação não for publicada)
