# Nuances e Casos de Borda

## 1. "SW Instalado" ≠ "PWA Instalado"

Confusão comum: o service worker é instalado (evento `install`) assim que o usuário **visita o site**, independentemente de instalar o PWA no dispositivo.

```
Usuário visita site → SW baixado → install event → cache populado
                                                              ↓
Usuário NUNCA instalou o PWA → SW continua rodando (cache, push, etc.)
```

**Consequência:** mesmo sem instalar, o usuário tem cache offline se o SW foi configurado.

---

## 2. Cache Pode Ser Limpo pelo Browser

O cache da Cache API não é eterno. Browsers podem limpar caches quando:
- Espaço em disco está baixo
- O storage quota da origem foi excedido
- O usuário limpa dados do navegador

**Impacto nas estratégias de cache:**

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

O fallback `fetch(request)` na estratégia **cache first** não é redundante — ele salva o app se o cache foi limpo entre versões.

---

## 3. `respondWith()` Não Chamado = Fallthrough para Rede

No `fetch` event do SW, se você **não** chamar `event.respondWith()`, o browser trata a requisição normalmente (vai para a rede).

```js
self.addEventListener("fetch", (event) => {
  // Só intercepta requisições de imagens
  if (event.request.destination === "image") {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  // Não chamou respondWith → vai para a rede normalmente
});
```

Útil para implementar **network only** sem código extra.

---

## 4. Browser Promove Instalação Mesmo Sem Manifest

Nem todo "app instalado" no dispositivo precisa de manifest:

| Situação | Manifest necessário? | Comportamento |
|---|---|---|
| Chrome "Install" na URL bar | Sim | Só aparece se critérios PWA são atendidos |
| Safari "Add to Dock" (macOS Sonoma+) | Não | Qualquer site pode ser adicionado |
| Chrome "Create Shortcut" | Não | Apenas cria atalho (não é PWA) |
| Safari iOS "Add to Home Screen" | Não | Funciona sem manifest, mas sem superpoderes PWA |

A diferença: com manifest, o browser **promove ativamente** a instalação. Sem manifest, o usuário precisa descobrir manualmente.

---

## 5. `description` + `screenshots` Melhoram o Install Prompt no Android

No Chromium Android, se o manifest incluir `description` e `screenshots`, o install prompt nativo mostra:

- Nome + ícone (sempre)
- Descrição do app (se presente)
- Screenshots em galeria (se presentes)

```json
{
  "name": "Meu App",
  "description": "Descrição que aparece no prompt de instalação no Android",
  "screenshots": [
    { "src": "ss-home.png", "sizes": "1080x1920", "form_factor": "narrow", "label": "Home screen" }
  ]
}
```

Isso não funciona em outras plataformas (Windows, macOS).

---

## 6. Display Mode Fallback Chain

O `display` member segue uma cadeia de fallback:

```
fullscreen → standalone → minimal-ui → browser
```

`display_override` permite redefinir essa cadeia:

```json
{
  "display": "browser",
  "display_override": ["window-controls-overlay", "standalone", "fullscreen"]
}
```

Nesse caso, a ordem de preferência vira:
```
window-controls-overlay → standalone → fullscreen → browser
```

Útil para apps que querem usar Window Controls Overlay no desktop.

---

## 7. Service Worker Scope

O escopo do service worker é determinado pelo diretório onde o `sw.js` está:

```
/sw.js                  → scope: /
/app/sw.js              → scope: /app/
/sub/pwa/sw.js          → scope: /sub/pwa/
```

O escopo pode ser expandido via `Service-Worker-Allowed` header HTTP:

```
Service-Worker-Allowed: /
```

Mas **nunca** pode ser mais restritivo que a localização do script.

---

## 8. Ciclo de Vida Detalhado do SW Update

```
1. Browser detecta byte-diff no sw.js
2. Novo SW baixado → install event dispara
3. Novo SW entra em "waiting" (não ativa ainda)
4. Se páginas abertas usam SW antigo → espera
5. Quando todas as abas fecham → activate
6. activate → caches antigos deletados + clients.claim()
```

**Forçar ativação imediata:** No install event:

```js
self.addEventListener("install", () => {
  self.skipWaiting(); // Pula a fase "waiting"
});
```

---

## 9. Response Objects São Streams (Use `.clone()`)

```js
// ERRADO: response consumido duas vezes
cache.put(request, response);
return response; // Erro: body stream já foi lido

// CERTO
cache.put(request, response.clone());
return response;
```

`Response` é um stream readable-only-once. Sempre clone antes de `cache.put()`.

---

## 10. POST Nunca Deve Ser Cacheado

Requisições POST não são idempotentes. Nunca:

```js
// ERRADO
self.addEventListener("fetch", (event) => {
  event.respondWith(cacheFirst(event.request)); // POST → cache.put → corrompe dados
});
```

Sempre filtre:

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // fallthrough para rede
  event.respondWith(cacheFirst(event.request));
});
```

---

## Checklist de Verificação

- [ ] SW install ⏤ certifique-se que não confunde com PWA install
- [ ] Cache clearing ⏤ sempre tenha fallback para rede
- [ ] `respondWith()` ⏤ só intercepte o que precisa tratar
- [ ] Response.clone() ⏤ antes de cache.put()
- [ ] POST requests ⏤ nunca interceptar
- [ ] `display_override` ⏤ considere para desktop
- [ ] SW scope ⏤ verifique se o caminho do sw.js está correto
- [ ] skipWaiting ⏤ use em dev, avalie em prod
