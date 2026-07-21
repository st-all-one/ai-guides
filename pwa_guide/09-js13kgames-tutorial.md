# Tutorial: js13kGames — PWA Intermediário com Push e Notificações

## Visão Geral

App que lista jogos submetidos à competição js13kGames 2017 (categoria A-Frame).  
Este tutorial cobre PWA completo com **push notifications**, **performance** e **instalação**.

**Stack:** HTML + CSS + JavaScript (vanilla)  
**Código fonte:** https://github.com/mdn/pwa-examples/tree/main/js13kpwa  
**Live demo:** https://mdn.github.io/pwa-examples/js13kpwa/

---

## Arquitetura do App

```
js13kpwa/
├── index.html          # Shell da aplicação
├── style.css           # Estilos
├── app.js              # Lógica principal (fetch + render)
├── sw.js               # Service worker
├── manifest.json       # Web app manifest
├── js13kgames.json     # Dados dos jogos (mock API)
└── img/                # Ícones e imagens
```

---

## Passo 1: Estrutura do App

### index.html

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>js13kGames A-Frame entries</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="manifest" href="manifest.json" />
  <link rel="icon" href="img/icons/icon-32.png" type="image/png" />
</head>
<body>
  <header>
    <h1>js13kGames A-Frame entries</h1>
    <button id="install-btn" hidden>Install</button>
  </header>
  <main id="content"></main>
  <footer>
    <p>(c) 2024 js13kGames</p>
  </footer>
  <script src="app.js"></script>
</body>
</html>
```

---

## Passo 2: App JavaScript

### app.js — fetch + render + instalação

```js
const contentEl = document.querySelector("#content");
const installBtn = document.querySelector("#install-btn");
let installPrompt = null;

// --- Carregar dados ---
async function loadGames() {
  const res = await fetch("js13kgames.json");
  const games = await res.json();
  renderGames(games);
}

function renderGames(games) {
  contentEl.innerHTML = games
    .map(
      (game) => `
    <article>
      <img src="img/${game.slug}.jpg" alt="${game.name}" loading="lazy" />
      <h2>${game.name}</h2>
      <p>${game.description}</p>
      <a href="${game.url}" target="_blank">Play</a>
    </article>`
    )
    .join("");
}

// --- Instalação customizada ---
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  installBtn.removeAttribute("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  const result = await installPrompt.prompt();
  console.log("Install outcome:", result.outcome);
  installPrompt = null;
  installBtn.setAttribute("hidden", "");
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.setAttribute("hidden", "");
});

// --- Inicializar ---
loadGames();
```

---

## Passo 3: Manifest

### manifest.json

```json
{
  "name": "js13kGames A-Frame entries",
  "short_name": "js13kGames",
  "description": "List of A-Frame entries for the js13kGames 2017 competition",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "theme_color": "#b12a34",
  "background_color": "#b12a34",
  "icons": [
    { "src": "img/icons/icon-32.png", "sizes": "32x32", "type": "image/png" },
    { "src": "img/icons/icon-64.png", "sizes": "64x64", "type": "image/png" },
    { "src": "img/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "img/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "img/icons/icon-168.png", "sizes": "168x168", "type": "image/png" },
    { "src": "img/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "img/icons/icon-256.png", "sizes": "256x256", "type": "image/png" },
    { "src": "img/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Passo 4: Service Worker com Cache First + Network Fallback

### sw.js

```js
const CACHE_NAME = "js13kpwa-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./js13kgames.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Cache first with network fallback para imagens
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
```

### Registro

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
```

---

## Passo 5: Push Notifications

### Inscrição no Push (lado cliente)

```js
async function subscribeToPush() {
  const swReg = await navigator.serviceWorker.ready;
  const sub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array("SUA_CHAVE_PUBLICA_VAPID"),
  });
  // Enviar sub para o servidor
  await fetch("/api/subscribe", {
    method: "POST",
    body: JSON.stringify(sub),
  });
}
```

### Recebendo Push (no service worker)

```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || "Novo conteúdo disponível!",
    icon: "img/icons/icon-192.png",
    badge: "img/icons/icon-96.png",
    data: { url: data.url || "./" },
    actions: [
      { action: "open", title: "Ver agora" },
      { action: "close", title: "Fechar" },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title || "js13kGames", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open") {
    clients.openWindow(event.notification.data.url);
  }
});
```

---

## Passo 6: Performance

### Técnicas aplicadas

| Técnica | Implementação |
|---|---|
| Lazy loading de imagens | `loading="lazy"` nas `<img>` |
| Precaching no install | Cache de HTML, CSS, JS, JSON |
| Cache first para assets | SW serve do cache, evita rede |
| Ícones em múltiplos tamanhos | 8 tamanhos (32px a 512px) |
| `display: standalone` | Sem chrome do navegador |
| Botão de instalação customizado | `beforeinstallprompt` com fallback |
| Defer não necessário | Script no final do `<body>` |

---

## Comparação: CycleTracker vs js13kGames

| Aspecto | CycleTracker | js13kGames |
|---|---|---|
| Nível | Iniciante | Intermediário |
| Dados | localStorage | fetch de JSON externo |
| Cache strategy | Cache only (nunca rede) | Cache first + fallback rede |
| Push notifications | ❌ | ✅ |
| Instalação customizada | ❌ (browser default) | ✅ (beforeinstallprompt) |
| Imagens | Ícones do app | Lazy-loaded game screenshots |
| Scope | Single page | Multi-page (articles) |
