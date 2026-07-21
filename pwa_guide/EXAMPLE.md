# PWA Moderno — Exemplo de Implementação Completa

Este exemplo implementa **todas as boas práticas** do guia em um único app chamado **ModerApp**.

## Estrutura de Arquivos

```
moderapp/
├── index.html
├── offline.html
├── manifest.json
├── sw.js
├── app.js
├── style.css
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon.svg
│   ├── badge.png
│   ├── maskable-192.png
│   └── maskable-512.png
├── screenshots/
│   ├── home-narrow.png
│   └── home-wide.png
└── .well-known/
    └── web-app-origin-association
```

---

## 1. index.html — Shell Semântico e Acessível

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#3367d6" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)" />
  <meta name="description" content="ModerApp — a modern PWA reference implementation" />
  <title>ModerApp</title>

  <link rel="manifest" href="manifest.json" />
  <link rel="icon" href="icons/icon.svg" sizes="any" type="image/svg+xml" />
  <link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png" />
  <link rel="apple-touch-icon" href="icons/icon-192.png" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>ModerApp</h1>
    <nav aria-label="Main navigation">
      <a href="/" aria-current="page">Home</a>
      <a href="/notes">Notes</a>
      <a href="/settings">Settings</a>
    </nav>
  </header>

  <main>
    <section aria-labelledby="welcome-heading">
      <h2 id="welcome-heading">Welcome</h2>
      <p id="status-message">Loading...</p>
      <form id="note-form">
        <label for="note-input">New note</label>
        <div class="input-row">
          <input type="text" id="note-input" required placeholder="Write something..." />
          <button type="submit" aria-label="Save note">Save</button>
        </div>
      </form>
      <ul id="note-list" aria-label="Saved notes"></ul>
    </section>

    <section aria-labelledby="install-heading">
      <h2 id="install-heading">App</h2>
      <button id="install-btn" hidden>Install App</button>
      <button id="share-btn" hidden>Share</button>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 ModerApp — powered by modern PWA standards</p>
  </footer>

  <script src="app.js" defer></script>
</body>
</html>
```

---

## 2. manifest.json — Completo com Todos os Membros Modernos

```json
{
  "id": "https://moderapp.example.com",
  "name": "ModerApp — Modern PWA Reference",
  "short_name": "ModerApp",
  "description": "A production-quality PWA demonstrating all modern web app manifest features and best practices.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "orientation": "any",
  "theme_color": "#3367d6",
  "background_color": "#ffffff",
  "categories": ["productivity", "utilities"],

  "name_localized": {
    "pt-BR": "ModerApp — Referência PWA Moderna",
    "fr": "ModerApp — Référence PWA Moderne",
    "de": "ModerApp — Moderne PWA-Referenz",
    "ja": "ModerApp — モダンPWAリファレンス"
  },
  "short_name_localized": {
    "pt-BR": "ModerApp",
    "fr": "ModerApp",
    "de": "ModerApp",
    "ja": "ModerApp"
  },
  "description_localized": {
    "pt-BR": "Um PWA de qualidade de produção demonstrando todos os recursos modernos do manifesto.",
    "fr": "Un PWA de qualité de production démontrant toutes les fonctionnalités modernes du manifeste.",
    "de": "Eine produktionsreife PWA, die alle modernen Manifestfunktionen demonstriert.",
    "ja": "最新のマニフェスト機能を実演するプロダクション品質のPWA。"
  },

  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ],
  "icons_localized": {
    "ja": [
      { "src": "icons/l10n/ja/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
      { "src": "icons/l10n/ja/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
    ]
  },

  "screenshots": [
    { "src": "screenshots/home-narrow.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow", "label": "ModerApp home screen on mobile" },
    { "src": "screenshots/home-wide.png", "sizes": "1920x1080", "type": "image/png", "form_factor": "wide", "label": "ModerApp home screen on desktop" }
  ],

  "shortcuts": [
    {
      "name": "New Note",
      "short_name": "New",
      "description": "Create a new note",
      "url": "/notes/new",
      "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Settings",
      "short_name": "Settings",
      "description": "Open app settings",
      "url": "/settings",
      "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }]
    }
  ],

  "share_target": {
    "action": "/handle-share",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  },

  "file_handlers": [
    {
      "action": "/",
      "accept": { "text/plain": [".txt", ".md"], "image/png": [".png"] }
    }
  ],

  "protocol_handlers": [
    { "protocol": "mailto", "url": "/handle-mail?to=%s" }
  ],

  "scope_extensions": [
    { "type": "origin", "origin": "https://help.moderapp.example.com" },
    { "type": "origin", "origin": "https://api.moderapp.example.com" }
  ],

  "launch_handler": {
    "client_mode": "focus-existing"
  },

  "prefer_related_applications": false
}
```

---

## 3. sw.js — Service Worker Robusto com Todas as Estratégias

```js
const VERSION = "v2";
const CACHE_NAME = `moderapp-${VERSION}`;

const PRECACHE_RESOURCES = [
  "/",
  "/index.html",
  "/offline.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const RUNTIME_CACHE = "moderapp-runtime";

// Install — Precaching
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_RESOURCES);
    })()
  );
});

// Activate — Cleanup old caches + take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (!name.startsWith("moderapp-")) return;
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
      await clients.claim();
    })()
  );
});

// Fetch — Multi-strategy routing
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET or cross-origin
  if (request.method !== "GET") return;
  if (url.origin !== location.origin) return;

  // Handle share target POST
  if (request.method === "POST" && url.pathname === "/handle-share") {
    event.respondWith(handleShareTarget(request));
    return;
  }

  // Route by destination
  if (request.destination === "document") {
    event.respondWith(navStrategy(request));
    return;
  }

  if (request.destination === "style" || request.destination === "script" || request.destination === "font") {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // API calls — network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// --- Caching Strategies ---

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Resource unavailable", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  });
  return cached || (await fetchPromise);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function navStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const offline = await caches.match("/offline.html");
    return offline || new Response("Offline", { status: 503 });
  }
}

// Share Target Handler
async function handleShareTarget(request) {
  const formData = await request.formData();
  const text = formData.get("text") || "";
  const title = formData.get("title") || "";
  const url = formData.get("url") || "";

  const db = await openNotesDB();
  await db.add("notes", { title, text, url, createdAt: new Date().toISOString() });

  return Response.redirect("/", 303);
}

// Simple IndexedDB wrapper (minimal)
function openNotesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ModerApp", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("notes", { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Background Sync ---
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notes") {
    event.waitUntil(syncPendingNotes());
  }
});

async function syncPendingNotes() {
  const db = await openNotesDB();
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  const all = await store.getAll();
  for (const note of all) {
    if (note.pending) {
      try {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(note),
        });
        store.delete(note.id);
      } catch {
        // Will retry on next sync event
      }
    }
  }
}

// --- Periodic Background Sync ---
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-content") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const response = await fetch("/api/latest");
        if (response.ok) {
          cache.put("/api/latest", response.clone());
        }
      })()
    );
  }
});

// --- Push Notifications ---
self.addEventListener("push", (event) => {
  let data = { title: "ModerApp", body: "Something new!" };
  try {
    data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      tag: data.tag || "default",
      data: { url: data.url || "/" },
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open") {
    clients.openWindow(event.notification.data.url);
  }
});

// --- Background Fetch ---
self.addEventListener("backgroundfetchsuccess", (event) => {
  event.waitUntil(
    (async () => {
      const records = await event.registration.matchAll();
      const cache = await caches.open("downloads");
      for (const record of records) {
        const response = await record.responseReady;
        cache.put(record.request, response.clone());
      }
      event.updateUI({ title: "Download complete!" });
    })()
  );
});

self.addEventListener("backgroundfetchclick", (event) => {
  clients.openWindow("/downloads");
});
```

---

## 4. app.js — Main Thread com Feature Detection e Todas as APIs

```js
"use strict";

// --- Register Service Worker ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

// --- DOM Refs ---
const statusEl = document.getElementById("status-message");
const installBtn = document.getElementById("install-btn");
const shareBtn = document.getElementById("share-btn");
const noteForm = document.getElementById("note-form");
const noteInput = document.getElementById("note-input");
const noteList = document.getElementById("note-list");

// --- Detect Display Mode ---
const displayMode = window.matchMedia("(display-mode: standalone)").matches
  ? "standalone"
  : "browser";
statusEl.textContent = `Running in ${displayMode} mode`;

// --- Custom Install Button (Chromium) ---
let installPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  const result = await installPrompt.prompt();
  console.log(`Install outcome: ${result.outcome}`);
  installPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.hidden = true;
  statusEl.textContent = "App installed";
});

// --- Web Share API ---
if (navigator.share) {
  shareBtn.hidden = false;
  shareBtn.addEventListener("click", async () => {
    try {
      await navigator.share({
        title: "ModerApp",
        text: "Check out ModerApp — a modern PWA!",
        url: "https://moderapp.example.com",
      });
    } catch {
      // User cancelled
    }
  });
}

// --- App Badge ---
async function updateBadge(count) {
  if (navigator.setAppBadge) {
    await navigator.setAppBadge(count);
  }
}
async function clearBadge() {
  if (navigator.clearAppBadge) {
    await navigator.clearAppBadge();
  }
}

// --- File Handlers (launchQueue) ---
if ("launchQueue" in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      const text = await file.text();
      noteInput.value = `[Imported] ${file.name}\n${text}`;
    }
  });
}

// --- Notes CRUD with IndexedDB ---
async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ModerApp", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const req = tx.objectStore("notes").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addNote(text) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const req = tx.objectStore("notes").add({
      text,
      createdAt: new Date().toISOString(),
      pending: navigator.onLine === false,
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function renderNotes() {
  const notes = await getAllNotes();
  noteList.innerHTML = notes
    .map((n, i) => `<li>${n.text} <small>${new Date(n.createdAt).toLocaleString()}</small></li>`)
    .join("");
  updateBadge(notes.length);
}

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = noteInput.value.trim();
  if (!text) return;

  await addNote(text);
  noteInput.value = "";
  await renderNotes();

  // Register background sync if offline
  if (!navigator.onLine && "serviceWorker" in navigator) {
    const sw = await navigator.serviceWorker.ready;
    try {
      await sw.sync.register("sync-notes");
    } catch {
      // Sync registration failed — data is safely in IndexedDB
    }
  }
});

// --- Periodic Background Sync Registration ---
async function registerPeriodicSync() {
  if (!("periodicSync" in navigator.serviceWorker)) return;
  const sw = await navigator.serviceWorker.ready;
  try {
    await sw.periodicSync.register("update-content", {
      minInterval: 24 * 60 * 60 * 1000,
    });
  } catch {
    // Permission denied or not supported
  }
}

// --- Push Subscription ---
async function subscribeToPush(serverPublicKey) {
  if (!("PushManager" in window)) return;
  const sw = await navigator.serviceWorker.ready;
  try {
    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(serverPublicKey),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  } catch {
    // Permission denied
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// --- Register Background Fetch ---
async function downloadFile(urls, title) {
  if (!("backgroundFetch" in navigator.serviceWorker)) return;
  const sw = await navigator.serviceWorker.ready;
  try {
    await sw.backgroundFetch.fetch("download", urls, {
      title,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
    });
  } catch {
    // Not supported or denied
  }
}

// --- Online/Offline Detection ---
window.addEventListener("online", () => {
  statusEl.textContent = `Online — ${displayMode} mode`;
});
window.addEventListener("offline", () => {
  statusEl.textContent = `Offline — ${displayMode} mode`;
});

// --- Init ---
renderNotes();
registerPeriodicSync();
```

---

## 5. style.css — Design Responsivo com Suporte a Temas

```css
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --bg-secondary: #f5f5f5;
  --text: #1a1a1a;
  --text-secondary: #555555;
  --accent: #3367d6;
  --accent-hover: #2850a7;
  --border: #dddddd;
  --radius: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --bg-secondary: #16213e;
    --text: #e0e0e0;
    --text-secondary: #a0a0a0;
    --accent: #5b8def;
    --accent-hover: #7aa3f0;
    --border: #2a2a4a;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 1rem;
  max-width: 48rem;
  margin: 0 auto;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

nav { display: flex; gap: 1rem; }
nav a { color: var(--accent); text-decoration: none; }
nav a[aria-current] { font-weight: 700; text-decoration: underline; }

section { margin-bottom: 2rem; }
h2 { margin-bottom: 0.75rem; color: var(--accent); }

.input-row { display: flex; gap: 0.5rem; }
input[type="text"] {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 1rem;
}

button {
  background: var(--accent);
  color: #ffffff;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover { background: var(--accent-hover); }
button[hidden] { display: none; }

ul { list-style: none; padding: 0; }
li {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
}
li small { color: var(--text-secondary); font-size: 0.75rem; }

footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Standalone mode adjustment */
@media (display-mode: standalone) {
  body { padding-top: 2rem; }
  header { border-bottom-width: 2px; }
}
```

---

## 6. offline.html — Página Offline Customizada

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline — ModerApp</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main style="text-align:center;padding:4rem 1rem;">
    <h1>You're offline</h1>
    <p>Some features may be limited until you reconnect.</p>
    <p>Your notes are safely stored and will sync when you're back online.</p>
    <button onclick="window.location.reload()">Try again</button>
  </main>
</body>
</html>
```

---

## 7. .well-known/web-app-origin-association

```json
{
  "https://moderapp.example.com": {
    "scope": "/"
  },
  "https://beta.moderapp.example.com": {
    "scope": "/"
  }
}
```

---

## Mapa: O Que Cada Boa Prática do Guia Este Exemplo Cobre

| # | Boa Prática | Onde |
|---|---|---|
| 01 | Progressive Enhancement | HTML funcional sem JS (index.html) |
| 02 | HTTPS requirement | Todas as URLs usam `https://` |
| 03 | Manifest mínimo (name, icons, start_url, display) | manifest.json |
| 04 | `prefer_related_applications: false` | manifest.json |
| 05 | Ícones 192px + 512px + maskable | manifest.json "icons" |
| 06 | `display_override` para desktop | manifest.json |
| 07 | `screenshots` para Android install prompt | manifest.json |
| 08 | `shortcuts` para menu de contexto | manifest.json |
| 09 | `share_target` (receber compartilhamento) | manifest.json + sw.js handleShareTarget |
| 10 | `file_handlers` (abrir arquivos do SO) | manifest.json + app.js launchQueue |
| 11 | `protocol_handlers` | manifest.json |
| 12 | `scope_extensions` (múltiplos domínios) | manifest.json + .well-known |
| 13 | `launch_handler` (focus-existing) | manifest.json |
| 14 | Localização do manifest (`*_localized`) | manifest.json |
| 15 | SW com versionamento | sw.js VERSION/CACHE_NAME |
| 16 | Precaching no install | sw.js install event |
| 17 | Limpeza de cache no activate | sw.js activate event |
| 18 | `clients.claim()` no activate | sw.js |
| 19 | `skipWaiting()` no install | sw.js |
| 20 | Cache-first para assets estáticos | sw.js cacheFirst |
| 21 | Stale-while-revalidate para imagens | sw.js staleWhileRevalidate |
| 22 | Network-first para API calls | sw.js networkFirst |
| 23 | Página offline customizada | sw.js navStrategy fallback + offline.html |
| 24 | Filtrar POST / não interceptar | sw.js fetch check `request.method !== "GET"` |
| 25 | `response.clone()` antes de cache.put | sw.js todas as estratégias |
| 26 | Background Sync para ações pendentes | sw.js sync event + app.js sync.register |
| 27 | Periodic Background Sync | sw.js periodicsync + app.js registerPeriodicSync |
| 28 | Push notifications com VAPID | sw.js push + notificationclick |
| 29 | Background Fetch para downloads grandes | sw.js backgroundfetch* + app.js downloadFile |
| 30 | Badging API (app badge) | app.js updateBadge/clearBadge |
| 31 | Web Share API | app.js shareBtn |
| 32 | `beforeinstallprompt` customizado | app.js installBtn |
| 33 | Feature detection em todas as APIs | app.js checks: if ("serviceWorker" in navigator), etc. |
| 34 | `prefers-color-scheme` (tema claro/escuro) | style.css @media + index.html meta theme-color |
| 35 | `system-ui` font-family | style.css |
| 36 | HTML semântico + ARIA | index.html `<nav>`, `aria-label`, `aria-current` |
| 37 | Deep links para cada view | start_url "/", shortcuts URLs |
| 38 | Offline detection na UI | app.js online/offline listeners |
| 39 | IndexedDB para dados offline | app.js + sw.js openNotesDB |
| 40 | `name_localized` + `description_localized` | manifest.json |

---

## Comandos de Desenvolvimento

```bash
# Servir localmente com HTTPS (recomendado)
npx serve . --ssl-cert ./cert.pem --ssl-key ./key.pem -p 443

# Ou via localhost (tratado como seguro)
python3 -m http.server 8080

# Validar manifest
npx pwa-validator manifest.json

# Build para production
# Use workbox-cli ou vite-plugin-pwa para automatizar precaching
```
