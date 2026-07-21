---
name: web-performance
description: Instruções precisas para implementar Web Performance moderna seguindo o guia de padrões em web_performance/
---

# SKILL: Web Performance Moderna

## Contexto

Este guia consolida os padrões MDN 2024-2025 para web performance. Use-o sempre que precisar otimizar carregamento, renderização, interatividade ou monitoramento de uma aplicação web.

## Arquivos de Referência

- `web_performance/01-core-concepts.md` — RAIL, métricas, mindset
- `web_performance/02-how-browsers-work.md` — pipeline de navegação, DNS/TCP/TLS/HTTP
- `web_performance/03-critical-rendering-path.md` — DOM → CSSOM → Render Tree → Layout → Paint
- `web_performance/04-loading-strategies.md` — preload, preconnect, dns-prefetch, lazy loading, Speculation Rules, fetchpriority
- `web_performance/05-rendering-and-animation.md` — 60fps, compositor-only properties, CSS vs JS animations
- `web_performance/06-core-web-vitals.md` — LCP, INP (>= FID), CLS — thresholds e otimizações
- `web_performance/07-measurement-and-monitoring.md` — PerformanceObserver, RUM vs Synthetic, budgets
- `web_performance/08-modern-patterns.md` — checklist consolidado de padrões
- `web_performance/09-anti-patterns.md` — o que evitar
- `web_performance/10-startup-performance.md` — Web Workers, code splitting, async scripts
- `web_performance/11-network-deep-dive.md` — TCP slow start, latência, throttling, preload scanner
- `web_performance/12-glossary.md` — definições de todos os termos
- `web_performance/13-performance-apis.md` — bfcache, Font Loading, Beacon, Navigation Preload, requestIdleCallback
- `web_performance/14-adaptive-content.md` — responsive images, Network Information, Client Hints
- `web_performance/15-delivery-and-caching.md` — Brotli, Cache-Control, Service Worker, CDN
- `web_performance/16-profiling-and-tooling.md` — DevTools, flame graphs, workflow
- `web_performance/EXAMPLE.md` — implementação completa de referência

## Regras Obrigatórias

### HTML
- [ ] `preconnect` nos 2-3 origins críticos com `crossorigin` para fonts
- [ ] `dns-prefetch` para demais origins cross-site
- [ ] `preload` com `fetchpriority="high"` para LCP image
- [ ] `preload` para fontes críticas com `crossorigin`
- [ ] critical CSS inline (`<style>` no `<head>`, < 14KB)
- [ ] CSS não-crítico com `rel="preload"` + `onload="this.rel='stylesheet'"`
- [ ] `width` + `height` em TODAS as imagens
- [ ] `loading="lazy"` + `decoding="async"` em imagens abaixo da dobra
- [ ] `fetchpriority="high"` no LCP element, `fetchpriority="low"` nos demais
- [ ] `content-visibility: auto` em seções off-screen
- [ ] `font-display: swap` em todo `@font-face`
- [ ] `<script defer>` para scripts principais, `<script async>` para analytics
- [ ] Speculation Rules API para prefetch/prerender de próxima página
- [ ] `aspect-ratio` ou dimensões explícitas em todo conteúdo dinâmico
- [ ] `<picture>` com AVIF → WebP → JPEG fallback

### CSS
- [ ] Animar APENAS `transform` e `opacity`
- [ ] `will-change` SOMENTE em elementos prestes a animar, remover após
- [ ] `contain: layout style paint` em componentes isolados
- [ ] `font-size-adjust: from-font` para reduzir CLS de font swap
- [ ] Transições CSS > JS para animações simples
- [ ] Evitar `box-shadow`, `filter`, `border-radius` em elementos animados

### JavaScript
- [ ] `PerformanceObserver` com `buffered: true` para LCP/CLS/INP/LoAF
- [ ] `navigator.sendBeacon()` para analytics (nunca `unload`)
- [ ] Batch DOM reads antes de writes (evitar layout thrashing)
- [ ] `requestAnimationFrame` para animações JS (nunca `setInterval`)
- [ ] `requestIdleCallback` para work não-crítico
- [ ] `scheduler.yield()` ou chunking (`setTimeout(0)`) para quebrar long tasks
- [ ] Passive event listeners em scroll/touch (`{ passive: true }`)
- [ ] Web Workers para processamento pesado
- [ ] Dynamic `import()` para code splitting por rota
- [ ] `visibilitychange` para pausar/retomar work pesado

### Service Worker
- [ ] Navigation Preload habilitado no `activate`
- [ ] Cache-first para static assets, stale-while-revalidate para runtime
- [ ] Precaching dos assets críticos no `install`
- [ ] Limpeza de caches antigos no `activate`
- [ ] Fallback offline para navigations

### Server / Infra
- [ ] Brotli compression (nível 6) com gzip fallback
- [ ] HTTP/2 ou HTTP/3 habilitado
- [ ] CDN com edge caching
- [ ] `Cache-Control: public, immutable, max-age=31536000` para versionados
- [ ] `Cache-Control: no-cache` para HTML
- [ ] ETag validation
- [ ] `Accept-CH` com DPR, Width, ECT, Device-Memory
- [ ] `Server-Timing` header para métricas server-side
- [ ] `103 Early Hints` com Link headers

### CI / Processo
- [ ] Lighthouse CI em todo PR com budgets de performance
- [ ] Bundle size check (< 300KB initial JS)
- [ ] Testar em "Regular 3G" (750kbps, 100ms RTT)
- [ ] Testar em dispositivo mid-range (Moto G4 / CPU throttling 4x)
- [ ] RUM em produção (CrUX + próprio endpoint)
- [ ] Medir + otimizar + verificar (nunca otimizar sem baseline)

## Anti-Patterns (NUNCA FAZER)

| Proibido | Motivo | Substituir Por |
|----------|--------|----------------|
| `@import` em CSS | Serializa carregamento | `<link rel="stylesheet">` |
| `<script>` sem `defer`/`async` no `<head>` | Bloqueia parser | `defer` ou `async` |
| `loading="lazy"` no LCP image | Atrasa LCP | `fetchpriority="high"` |
| Imagens sem `width`+`height` | #1 causa de CLS | Sempre definir dimensões |
| `font-display: block` (default) | FOIT de 3s | `font-display: swap` |
| `translateZ(0)` em tudo | Cria layers desnecessários | Usar `will-change` só quando for animar |
| `setTimeout`/`setInterval` para animações | Sem sync de frame | `requestAnimationFrame` |
| Animação de `top`/`left`/`width`/`height` | Trigger layout por frame | `transform: translate()`/`scale()` |
| Domain sharding | Anti-pattern desde HTTP/2 | HTTP/2 multiplexing |
| Server Push | Chrome removeu suporte | `103 Early Hints` ou `<link rel="preload">` |
| CSR sem SSR | LCP péssimo (tela branca) | SSR, streaming SSR, static generation |
| `performance.timing` (deprecated) | Não suporta HTTP/2 | `performance.getEntriesByType('navigation')` |
| FastClick library | Tap delay não existe mais desde Chrome 32 | Remover |
| jQuery `.animate()` | Usa setInterval | CSS transitions/animations |

## Fluxo de Decisão para Cada Recurso

```
Para CADA recurso da página:
├─ É crítico para o first paint (LCP)?
│   └─ SIM → <link rel="preload"> + fetchpriority="high"
│
├─ É de third-party?
│   └─ SIM → <3 origins críticos? → preconnect crossorigin
│            >=3 origins? → dns-prefetch
│
├─ Está abaixo da dobra?
│   └─ SIM → loading="lazy" (img/iframe) ou content-visibility: auto (seções)
│
├─ Será necessário na próxima página?
│   └─ SIM → Speculation Rules API (prefetch/prerender)
│
└─ Senão → carregar normally (deferido no fim do <body>)

Para animações:
├─ Transição simples (hover, toggle)?
│   └─ CSS transition (transform/opacity apenas)
├─ Keyframes loop?
│   └─ CSS @keyframes (transform/opacity apenas)
├─ Complexa/state-driven/physics?
│   └─ requestAnimationFrame + JS
└─ Scroll-driven?
    └─ animation-timeline: scroll() (moderno)
```

## Métricas e Thresholds

| Métrica | Bom | Precisa Melhorar | Ruim |
|---------|-----|------------------|------|
| LCP | ≤ 2.5s | 2.5s–4.0s | > 4.0s |
| INP | ≤ 200ms | 200ms–500ms | > 500ms |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| FCP | ≤ 1.8s | 1.8s–3.0s | > 3.0s |
| TTFB | ≤ 800ms | 800ms–1.8s | > 1.8s |
| TBT | ≤ 200ms | 200ms–600ms | > 600ms |

## Lembretes-Chave

- O navegador é seu aliado, não seu inimigo — prefira soluções nativas (HTML/CSS) a JS
- 60fps = 16.7ms/frame. Scripts + Style + Layout + Paint cabem nessa janela
- Interações precisam de feedback em ≤ 50ms (acima de 100ms = lag perceptível)
- Primeiros 14KB cabem no CWND inicial do TCP — critical CSS/HTML deve caber aqui
- INP substituiu FID como Core Web Vital em Março 2024 — otimize para todas as interações
- Performance budget no CI previne regressões — imperativo em time multidisciplinar
- Sempre use `buffered: true` no PerformanceObserver para não perder métricas iniciais
