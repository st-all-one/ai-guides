# PWA Moderno — Guia de Referência

Compilado otimizado para IA a partir da documentação MDN Web Docs (padrões pós-2023).

## Estrutura

| Documento | Conteúdo |
|---|---|---|
| 01-pwa-essentials | Conceitos, definições, requisitos, arquitetura bipartida |
| 02-web-app-manifest | Referência completa do manifest.json |
| 03-service-worker-patterns | Ciclo de vida, caching, estratégias |
| 04-offline-and-background | Offline, Background Sync, Push, Periodic Sync |
| 05-installation-and-integration | Instalação, Share Target, File Handlers, Badging |
| 06-best-practices | Cross-browser, performance, segurança, o que evitar |
| 07-pwa-minimal-template | Template funcional mínimo |
| 08-cycletracker-tutorial | Tutorial passo-a-passo: PWA do zero (iniciante) |
| 09-js13kgames-tutorial | Tutorial intermediário: push, notificações, performance |
| 10-howto-localize-manifest | How-to: localizar manifest do PWA |
| 11-manifest-scope-extensions | Múltiplos domínios como um único app |
| 12-manifest-serviceworker | Service worker para Payment Handler API |
| 13-pwa-nuances | Nuances, casos de borda, armadilhas comuns |

## Pilares da PWA Moderna

1. **HTTPS** (ou localhost para dev)
2. **Web App Manifest** (`manifest.json`) — instalação
3. **Service Worker** (`sw.js`) — offline e background

Service worker **não** é obrigatório para instalação, mas fortemente recomendado.
