# Operação Offline e em Background

## Hierarquia de APIs

```
Service Worker (base)
├── Background Sync (tarefas curtas, ~5min)
├── Periodic Background Sync (intervalos, browser decide)
├── Background Fetch (downloads longos, horas)
└── Push API (notificações do servidor)
    └── Notifications API (exibição ao usuário)
```

## Background Sync — Tarefas Pendentes

**Problema:** Usuário envia formulário, perde conexão, fecha o app.

**Main thread (registro):**
```js
async function registerSync() {
  const sw = await navigator.serviceWorker.ready;
  await sw.sync.register("send-message");
}
```

**Service worker (execução):**
```js
self.addEventListener("sync", (event) => {
  if (event.tag === "send-message") {
    event.waitUntil(sendMessage());
  }
});
```

**Regras:**
- Tarefa deve ser curta (~5min no Chrome)
- SW é parado se ocioso por 30s
- Se a promise rejeitar, browser pode retentar
- SW parado = operação abortada (recomeça do início)

## Periodic Background Sync — Atualização Periódica

**Problema:** App de notícias que o usuário abre offline com conteúdo desatualizado.

**Main thread (registro):**
```js
async function registerPeriodicSync() {
  const sw = await navigator.serviceWorker.ready;
  await sw.periodicSync.register("update-news", {
    minInterval: 24 * 60 * 60 * 1000, // 24h
  });
}
```

**Service worker (execução):**
```js
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-news") {
    event.waitUntil(updateNews());
  }
});
```

**Regras:**
- `minInterval` é **sugestão** — o browser decide a frequência real
- Apps mais usados recebem mais eventos
- Requer permissão `"periodic-background-sync"`
- Usuário pode desabilitar globalmente

## Background Fetch — Downloads Longos

**Problema:** Download de filme de 2GB. Background Sync é interrompido após 5min.

**Main thread:**
```js
async function downloadMovie() {
  const sw = await navigator.serviceWorker.ready;
  await sw.backgroundFetch.fetch("download-movie", [
    "/my-movie-part-1.webm",
    "/my-movie-part-2.webm",
  ], {
    title: "Downloading my movie",
    icons: movieIcons,
    downloadTotal: 60 * 1024 * 1024,
  });
}
```

**Service worker (eventos):**
```js
self.addEventListener("backgroundfetchsuccess", (event) => {
  event.waitUntil(async () => {
    const records = await event.registration.matchAll();
    // Armazenar no cache
    event.updateUI({ title: "Download concluído!" });
  });
});

self.addEventListener("backgroundfetchclick", (event) => {
  clients.openWindow("/download-progress");
});
```

**Características:**
- UI persistente do navegador mostra progresso
- Usuário pode cancelar
- Requer permissão `"background-fetch"`
- Executa mesmo com app e SW fechados

## Push API + Notifications — Notificações do Servidor

### Fluxo Completo

```
1. Servidor gera par de chaves VAPID (pública/privada)
2. App → PushManager.subscribe(serverPublicKey)
3. App recebe PushSubscription (endpoint + chave)
4. App envia subscription para o servidor
5. Servidor encripta mensagem e envia ao endpoint HTTP Push
6. Push service valida e entrega ao dispositivo
7. Browser descriptografa → evento `push` no SW
8. SW → registration.showNotification()
```

### Service Worker (recepção)

```js
self.addEventListener("push", (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      badge: "/badge.png",
      data: { url: data.url },
      actions: [
        { action: "open", title: "Abrir" },
        { action: "dismiss", title: "Fechar" },
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
```

### Main Thread (inscrição)

```js
async function subscribe(swRegistration, serverPublicKey) {
  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(serverPublicKey),
  });
  // Enviar subscription para o servidor
  await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
}
```

### Badge no Ícone do App

```js
// Main thread
navigator.setAppBadge(unreadCount);
navigator.clearAppBadge();

// SW (via push)
self.addEventListener("push", (event) => {
  const data = event.data.json();
  if (data.unreadCount > 0) {
    navigator.setAppBadge(data.unreadCount);
  } else {
    navigator.clearAppBadge();
  }
});
```

**Platforma:** Windows/macOS ✅, iOS 16.4+ (requer permissão notificação), Android ❌.

## O Que Evitar em Background

| O que evitar | Alternativa correta |
|---|---|
| Background Sync para downloads grandes | Background Fetch |
| Background Fetch para tarefas curtas | Background Sync |
| Silent push (push sem notificação) | Nenhum browser suporta |
| Assumir que periodic sync roda no intervalo pedido | O browser decide a frequência |
| Operações longas dentro de `periodicsync` | Mantenha rápido; use Background Fetch |
| Cache sem `clone()` de Response | Response é stream: clone antes de cache.put |
