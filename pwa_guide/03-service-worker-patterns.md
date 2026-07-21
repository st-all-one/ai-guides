# Service Worker — Padrões e Estratégias de Cache

## Estrutura Base do SW

```js
// sw.js
const VERSION = "v1";
const CACHE_NAME = `myapp-${VERSION}`;
const PRECACHE_RESOURCES = ["/", "/index.html", "/style.css", "/app.js"];
```

## Ciclo de Vida e Eventos

### install — Precaching

```js
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_RESOURCES);
    })()
  );
});
```

- Momento de cachear recursos que o app **certamente** precisará
- Se `addAll` falhar para qualquer recurso, a instalação inteira falha

### activate — Limpeza de Caches Antigos

```js
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
```

- `clients.claim()` faz o SW assumir controle de páginas abertas imediatamente
- **Sempre** limpar caches de versões anteriores

### fetch — Interceptação de Requisições

```js
self.addEventListener("fetch", (event) => {
  event.respondWith(cacheFirst(event.request));
});
```

- Só intercepte requisições que você quer tratar
- **Nunca** intercepte POST requests (semântica de mutação)
- Responses são streams: use `.clone()` antes de `cache.put()`

## Estratégias de Cache

### Cache First

```js
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
    return new Response("Offline", { status: 503 });
  }
}
```

**Quando usar:** UI estática, CSS, JS, fontes, logos.

### Stale-While-Revalidate (Cache First with Refresh)

```js
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || (await fetchPromise);
}
```

**Quando usar:** Recursos onde frescor é moderadamente importante (avatar, listas de conversas).

### Network First

```js
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}
```

**Quando usar:** Dados que precisam ser frescos, mas ter algo é melhor que nada.

### Network Only

Apenas **não intercepte** a requisição (não chame `event.respondWith()`).

**Quando usar:** POST requests, dados financeiros, inventário.

### Cache Only (Máxima Privacidade)

```js
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(caches.match("./"));
    return;
  }
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request.url);
      return cached || new Response(null, { status: 404 });
    })()
  );
});
```

**Quando usar:** Apps que nunca chamam a rede (dados 100% local).

## Tabela de Estratégias

| Estratégia | Offline | Freshness | Uso típico |
|---|---|---|---|
| Cache first | ✅ | ❌ | Assets estáticos |
| Stale-while-revalidate | ✅ | ⚠️ Médio | Avatares, listas |
| Network first | ✅ (fallback) | ✅ | Dados semi-dinâmicos |
| Network only | ❌ | ✅ | POST, financeiro |
| Cache only | ✅ | ❌ | Apps 100% offline |

## Versionamento como Gatilho de Atualização

A única maneira de forçar atualização do service worker é alterar o arquivo `sw.js` (mudança de byte). Padrão:

```
CACHE_NAME = `app-v1`  →  CACHE_NAME = `app-v2`
```

Browser detecta diferença no byte do `sw.js`, instala novo SW em background, ativa quando páginas antigas fecharem.

## Registro do SW na Main Thread

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

Sempre usar feature detection. O registro é assíncrono e não bloqueia a renderização.

## Debugging

| Técnica | Descrição |
|---|---|
| DevTools > Application > Service Workers | Ver, registrar, desregistrar SWs |
| "Update on reload" | Re-registra automático a cada reload |
| "Bypass for network" | Ignora SW, carrega tudo da rede |
| Hard refresh (Ctrl+Shift+R) | Ignora SW naquela requisição |
