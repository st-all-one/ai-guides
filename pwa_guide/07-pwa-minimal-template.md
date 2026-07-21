# PWA — Template Mínimo Funcional

Este template cobre o essencial para uma PWA instalável com experiência offline básica.

## Estrutura de Arquivos

```
📁 my-pwa/
├── index.html
├── style.css
├── app.js
├── sw.js
├── manifest.json
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
```

## 1. index.html

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <meta name="theme-color" content="#663399" />
  <title>My PWA</title>
  <link rel="manifest" href="manifest.json" />
  <link rel="icon" href="icons/icon-192.png" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>Hello, PWA!</h1>
  <button id="install" hidden>Install App</button>
  <p id="status"></p>
  <script src="app.js" defer></script>
</body>
</html>
```

## 2. manifest.json

```json
{
  "name": "My PWA",
  "short_name": "MyPWA",
  "description": "A minimal progressive web app",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#663399",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 3. sw.js

```js
const VERSION = "v1";
const CACHE_NAME = `my-pwa-${VERSION}`;
const PRECACHE = [".", "./index.html", "./style.css", "./app.js", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
      await clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return new Response("You are offline", { status: 503 });
      }
    })()
  );
});
```

## 4. app.js

```js
// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// Detect standalone mode
const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
document.getElementById("status").textContent = isStandalone
  ? "Running as installed app"
  : "Running in browser";

// Custom install button (Chromium only)
let installPrompt = null;
const installBtn = document.getElementById("install");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  const result = await installPrompt.prompt();
  console.log(`Install: ${result.outcome}`);
  installPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.hidden = true;
  document.getElementById("status").textContent = "App installed";
});
```

## 5. style.css

```css
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --text: #1a1a1a;
  --accent: #663399;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #ffffff;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 2rem;
  line-height: 1.6;
}

h1 { color: var(--accent); margin-bottom: 1rem; }

button {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button[hidden] { display: none; }
```

## Próximos Passos (Aprimoramentos)

Após o template básico funcionar, adicione na ordem:

1. **Background Sync** — para ações pendentes (envio de formulário offline)
2. **Push Notifications** — re-engajamento (requer servidor com VAPID)
3. **Share Target** — receber dados de outros apps
4. **Periodic Sync** — atualizar conteúdo em background
5. **File Handlers** — associar tipos de arquivo ao PWA
6. **Badging API** — badge no ícone do app
7. **App Store packaging** — via PWABuilder
