---
name: pwa
description: >
  Modern Progressive Web Apps (post-2023): Web App Manifest, Service Worker
  patterns, offline/background, push, installation/OS integration, best
  practices, templates, localization. Load when implementing, reviewing, or
  maintaining a PWA.
category: web
version: "2.0"
tags: [pwa, service-worker, manifest, offline, push, background-sync, installation]
license: MIT
---

# Modern PWA (post-2023)

## Use When
- Making an app installable and offline-capable
- Configuring the Web App Manifest
- Designing Service Worker caching/update strategies
- Background sync, periodic sync, background fetch, push
- OS integration (badging, file handlers, share target, window controls)

## Core Rules
- Installability requires **Manifest + HTTPS**; a Service Worker is optional for install but needed for offline/background.
- Progressive enhancement order: semantic HTML → responsive CSS → JS → Service Worker → Manifest.
- SW is separate from the DOM; communicate only via `postMessage`.
- Never cache opaque/cross-origin responses blindly; define explicit runtime strategies.
- Version caches; activate with `skipWaiting()` + `clients.claim()` only when safe (avoid broken sessions).
- Serve SW from the scope root; `Service-Worker-Allowed` for wider scopes.
- Manifest must include `name`/`short_name`, 192+512 icons, `start_url`, `display`, `prefer_related_applications:false`.
- Always provide an offline fallback; never leave users on a dead page.
- Handle update flows (prompt user on `updatefound`).
- Test install, offline, update, and background on real devices.

## Core Patterns
```json
// manifest.webmanifest
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0b0b0b",
  "theme_color": "#0b0b0b",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "prefer_related_applications": false
}
```

```js
// sw.js
const V = "v3";
const CORE = ["/", "/app.css", "/app.js", "/offline.html"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.mode === "navigate") {
    e.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  e.respondWith(caches.match(request).then((r) => r || fetch(request)));
});
```

## File Map
| File | Content |
|---|---|
| `index.md` | Overview and index |
| `01-pwa-essentials.md` | Core concepts, installability |
| `02-web-app-manifest.md` | Manifest members and icons |
| `03-service-worker-patterns.md` | Cache strategies, lifecycle |
| `04-offline-and-background.md` | Offline, background sync/fetch |
| `05-installation-and-integration.md` | Install prompt, OS integration |
| `06-best-practices.md` | Update, security, testing |
| `07-pwa-minimal-template.md` | Minimal working template |
| `08-cycletracker-tutorial.md` | Tutorial app |
| `09-js13kgames-tutorial.md` | Offline game tutorial |
| `10-howto-localize-manifest.md` | Manifest localization |
| `11-manifest-scope-extensions.md` | Scope extensions |
| `12-manifest-serviceworker.md` | Manifest ↔ SW coordination |
| `13-pwa-nuances.md` | Edge cases and gotchas |
| `EXAMPLE.md` | Reference implementation |

## Read Order
`index.md`→`01`→`02`→`03`→`04`; install `05`; best practices `06`.

## Prereqs
HTML/JS, HTTPS hosting; browser devtools.
