---
description: >-
  Specialized instructions for implementing, reviewing, and maintaining modern
  Progressive Web Apps (PWAs) following post-2023 standards. Covers Web App
  Manifest, Service Worker, offline/background capabilities, and OS integration.
---

# PWA Moderno — Skill para IA

## 1. Arquitetura Fundamental

PWAs têm **arquitetura bipartida**: Main Thread (UI/DOM) e Service Worker (background/thread separada, sem DOM). O SW comunica-se com a UI exclusivamente via `postMessage()`. Todo PWA instalável exige apenas **Web App Manifest + HTTPS** — Service Worker é opcional para instalação, porém fortemente recomendado para qualquer experiência offline ou background.

**Ordem de Progressive Enhancement:** HTML semântico → CSS responsivo → JS interativo → Service Worker → Manifest.

## 2. Web App Manifest (manifest.json)

### Membros obrigatórios para instalação no Chromium
- `name` (ou `short_name`)
- `icons` com 192x192 e 512x512
- `start_url` (same-origin)
- `display` (tipicamente `"standalone"`)
- `prefer_related_applications: false`

### Membros modernos a incluir sempre que aplicável
| Membro | Propósito | Regra |
|---|---|---|
| `id` | ID único do app (nunca mudar após publicação) | Fallback: `start_url` |
| `scope` | Path das páginas do app | Sempre terminar com `/` |
| `display_override` | Substituir cadeia de fallback do display | Ex: `["window-controls-overlay", "standalone"]` |
| `screenshots` | Galeria no prompt de instalação Android | `form_factor`: `narrow` ou `wide`; `label` obrigatório |
| `shortcuts` | Atalhos no menu de contexto do ícone | `name` + `url` obrigatórios; URL dentro do `scope` |
| `share_target` | Receber compartilhamento de outros apps | GET para texto, POST + multipart para arquivos |
| `file_handlers` | Associar tipos de arquivo ao PWA | Processar via `launchQueue` no JS |
| `protocol_handlers` | Registrar protocolos customizados (`mailto:`, etc.) | URL com placeholder `%s` |
| `scope_extensions` | Estender PWA para outras origens | Requer `.well-known/web-app-origin-association` na origem estendida |
| `launch_handler` | Comportamento ao lançar o app | `client_mode`: `"focus-existing"`, `"navigate-new"`, etc. |
| `*_localized` | Internacionalização | Chave BCP 47; fallback: tag genérica → valor não-localizado |

### Regras críticas do manifest
- `id` alterado = browser trata como app **diferente** (pode instalar lado a lado)
- Manifest deve ser referenciado em **todas as páginas** do PWA via `<link rel="manifest">`
- Ícone `maskable`: conteúdo importante dentro dos 80% centrais do diâmetro
- `scope` sem trailing `/` pode capturar paths indesejados (prefix match)

## 3. Service Worker — Padrões de Cache

### Ciclo de vida
```
Byte-diff detectado → Install (precache) → Waiting → Activate (cleanup + clients.claim()) → Idle → Terminate
```
- **Install:** precache resources; se `addAll` falhar para um, todo install falha
- **Activate:** sempre limpar caches de versões anteriores; chamar `clients.claim()`
- **skipWaiting():** forçar ativação imediata (usar em dev; avaliar em prod)

### Estratégias de cache (escolher por tipo de recurso)

| Estratégia | Offline | Frescor | Tipo de recurso |
|---|---|---|---|
| **Cache First** | ✅ Total | ❌ Baixo | CSS, JS, fontes, logos, UI estática |
| **Stale-While-Revalidate** | ✅ Total | ⚠️ Médio | Avatares, listas, imagens |
| **Network First** | ✅ Fallback | ✅ Alto | API calls, dados semi-dinâmicos |
| **Network Only** | ❌ | ✅ Máx | POST, financeiro, inventário |
| **Cache Only** | ✅ Total | ❌ Nenhum | App 100% local (nunca chama rede) |

### Regras obrigatórias no fetch handler
1. Sempre filtrar `request.method !== "GET"` — **nunca** interceptar POST
2. `Response` é stream readable-once: sempre `.clone()` antes de `cache.put()`
3. Se não chamar `event.respondWith()`, o browser faz fallthrough para a rede (network-only implícito)
4. Opacidade: respostas opacas (cross-origin sem CORS) não têm body legível; usar com cautela

### Versionamento
- Única forma de forçar update: alterar bytes do `sw.js`
- Padrão: `CACHE_NAME = \`app-v1\`` → `\`app-v2\``
- Browser baixa novo SW em background; ativa quando páginas antigas fecharem (ou via `skipWaiting()`)

## 4. Operação Offline e Background

### Hierarquia de APIs
```
Service Worker (base)
├── Background Sync       — Tarefas curtas (~5min), tipo: enviar formulário pendente
├── Periodic Background Sync — Intervalos (browser decide frequência), tipo: atualizar cache
├── Background Fetch      — Downloads longos (horas), tipo: filme de 2GB
└── Push API + Notifications API — Notificações do servidor com VAPID
```

### Background Sync
- Registrar na main thread: `navigator.serviceWorker.ready → sw.sync.register("tag")`
- Executar no SW: `self.addEventListener("sync", event => event.waitUntil(...))`
- SW pode ser morto se ocioso >30s; promise rejeitada = browser pode retentar

### Periodic Background Sync
- Requer permissão `"periodic-background-sync"`
- `minInterval` é **sugestão**; browser decide frequência real baseada no uso
- Apps mais usados recebem mais eventos

### Background Fetch
- Requer permissão `"background-fetch"`
- UI persistente do navegador; usuário pode cancelar
- Eventos: `backgroundfetchsuccess`, `backgroundfetchclick`, `backgroundfetchfail`

### Push API
- **Obrigatório:** `userVisibleOnly: true` (silent push não é suportado)
- Usar VAPID (par de chaves pública/privada) para criptografia e assinatura
- Fluxo: Servidor gera VAPID → App subscribe com applicationServerKey → Servidor envia para endpoint HTTP Push
- Badging via `navigator.setAppBadge(count)` (Windows/macOS/iOS 16.4+)

## 5. Instalação e Integração com SO

### beforeinstallprompt (Chromium-only)
```js
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  // Armazenar event e mostrar botão customizado
});
```
- `event.prompt()` só pode ser chamado **uma vez** por evento
- Não funciona no iOS — fallback necessário (Share > Add to Home Screen)
- Pode nunca disparar (app já instalado ou critérios não atendidos)

### Web Share API
- Compartilhar do PWA: `navigator.share({ title, text, url })`
- Verificar suporte: `if (navigator.share)` + `navigator.canShare({ files })` para arquivos

### File Handlers (launchQueue)
```js
if ("launchQueue" in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const handle of launchParams.files) { ... }
  });
}
```

### App Stores
- Google Play: Trusted Web Activity / PWABuilder
- iOS: PWABuilder ou wrapper
- Microsoft Store: direto
- Meta Quest Store: PWA pode ser publicado

## 6. Boas Práticas Obrigatórias

### Cross-browser
- **Feature detection sempre** (nunca user-agent sniffing)
- Testar em Chrome, Safari, Firefox, Edge
- Safari tem suporte parcial: sem beforeinstallprompt, sem Background Sync, sem File Handlers

### Performance
- `font-family: system-ui` — zero download, performance nativa
- Precaching da UI principal no install
- `loading="lazy"` em imagens + Intersection Observer
- Dynamic import para módulos pesados
- Atributo `defer` em scripts não-críticos

### Deep Links
- **Cada view do app deve ter URL única** — isso é um superpoder da web que PWAs não devem abandonar

### Acessibilidade
- HTML semântico (`<button>`, `<form>`, `<nav>`) — já suporta todos os inputs nativamente
- ARIA quando necessário
- Acessibilidade é requisito legal em muitas jurisdições

### Aparência Nativa
- `display: standalone` — janela própria sem chrome
- `theme_color` + `background_color` combinando com CSS
- Suporte a `prefers-color-scheme` (claro/escuro)
- Badge no ícone via Badging API
- Headers/footers compactos

### Experiência Offline
- **Mínimo:** página offline customizada (em vez do erro genérico do browser)
- **Ideal:** app funciona offline com dados cacheados (Cache API + IndexedDB)
- **Avançado:** background sync para ações pendentes

## 7. O Que Evitar (Armadilhas Comuns)

| Prática errada | Alternativa correta |
|---|---|
| SW acessando DOM | Comunicação via `postMessage()` |
| Cache sem `event.waitUntil()` | SW pode ser morto antes da operação terminar |
| Cache de POST requests | POST não é idempotente |
| `prefer_related_applications: true` | Impede instalação PWA no Chromium |
| Faltar ícone 192/512px | Chromium não instala sem ambos |
| Manifest em uma página só | Referenciar em **todas** as páginas |
| Assumir periodic sync roda no intervalo | Browser decide frequência |
| Background Sync para downloads grandes | Background Fetch |
| `start_url` com fingerprinting (`?user=123`) | Viola segurança e quebra cache |
| Response sem `.clone()` antes de `cache.put()` | Stream é consumido uma vez só |

## 8. Debugging

| Técnica | Descrição |
|---|---|
| DevTools > Application > Service Workers | Ver, registrar, desregistrar, debug |
| "Update on reload" | Re-registra SW a cada reload automático |
| "Bypass for network" | Ignora SW, carrega tudo da rede |
| Hard refresh (Ctrl+Shift+R) | Ignora SW naquela requisição |
| DevTools > Application > Manifest | Validar manifest, ver icons maskable safe-area |
| `npx pwa-validator manifest.json` | Validar manifest via CLI |

## 9. Regras de Ouro

1. **Service Worker instalado ≠ PWA instalado.** SW é instalado em qualquer visita; PWA instalado requer ação do usuário.
2. **Cache pode ser limpo pelo browser** (disco cheio, quota excedida). Sempre ter fallback para rede nas estratégias.
3. **ID do manifest nunca deve mudar** após publicação, ou o browser tratará como app diferente.
4. **Respostas de streams são single-use.** Sempre clonar antes de colocar no cache.
5. **POST nunca é cacheado.** Filtrar por `request.method !== "GET"` no fetch handler.
6. **scope_extensions requer opt-in** via `.well-known/web-app-origin-association` na origem estendida.
7. **Navegadores isolam instalações.** Mesmo PWA em Chrome vs Edge = duas instâncias independentes com dados separados.

## 10. Checklist de Verificação Rápida

- [ ] Manifest: `id`, `name`, `short_name`, `icons` (192+512+maskable), `start_url`, `scope`, `display`, `prefer_related_applications: false`
- [ ] Manifest: `screenshots` (narrow + wide), `shortcuts`, `share_target`, `display_override` (se aplicável)
- [ ] Manifest referenciado em **todas as páginas** HTML
- [ ] SW: precaching no install, cleanup no activate, `clients.claim()`
- [ ] SW: estratégia de cache por tipo de recurso (cache-first, stale-while-revalidate, network-first)
- [ ] SW: nunca interceptar POST; sempre `.clone()` antes de `cache.put()`
- [ ] SW: offline page customizada como fallback de navegação
- [ ] Main thread: feature detection em todas as APIs
- [ ] Main thread: `beforeinstallprompt` com botão customizado + fallback iOS
- [ ] Main thread: Web Share API, Badging API, launchQueue
- [ ] CSS: `prefers-color-scheme`, `system-ui`, `@media (display-mode: standalone)`
- [ ] HTML: semântico, ARIA, deep links, theme-color com media queries
- [ ] HTTPS obrigatório (ou localhost para dev)
