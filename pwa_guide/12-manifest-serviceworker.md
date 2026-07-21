# Manifest: `serviceworker` — Payment Handler API

**Status:** Experimental + Non-standard  
**Compat:** https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/serviceworker#browser_compatibility

## O Que É

O membro `serviceworker` no manifest especifica um service worker que é **instalado e registrado Just-In-Time (JIT)** para suportar o **Web-based Payment Handler API**.  
Não é o service worker geral do PWA — é um service worker específico para processar pagamentos.

## Estrutura

```json
{
  "serviceworker": {
    "src": "sw.js",
    "scope": "/",
    "use_cache": false
  }
}
```

### Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `src` | String | Sim | URL do script do service worker |
| `scope` | String | Não | Escopo de registro |
| `use_cache` | Boolean | Não | Como usar HTTP cache durante atualizações |

### `use_cache`

| Valor | Efeito | Equivalente JS |
|---|---|---|
| `true` | Cache para imports, script principal sempre da rede | `updateViaCache: "imports"` |
| `false` | Sem cache para script nem imports | `updateViaCache: "none"` |

## Diferença do Service Worker Normal

| Aspecto | SW Normal | `serviceworker` no Manifest |
|---|---|---|
| Registro | `navigator.serviceWorker.register()` | JIT pelo browser |
| Propósito | Offline, cache, push, sync | Payment Handler |
| Escopo | Definido no register | Definido no manifest |
| Status | Standard | Experimental + Non-standard |

## Quando Usar

Apenas quando seu PWA precisa atuar como um **método de pagamento** em sites de terceiros (ex: "Pagar com MeuApp").  
Veja [Web-based Payment Handler API](https://developer.mozilla.org/en-US/docs/Web/API/Web-Based_Payment_Handler_API).

## Exemplo

```json
{
  "name": "My Payment App",
  "short_name": "PayApp",
  "icons": [{ "src": "icon.png", "sizes": "192x192" }],
  "display": "standalone",
  "serviceworker": {
    "src": "payment-sw.js",
    "scope": "/",
    "use_cache": false
  }
}
```

> ⚠️ Este membro não deve ser confundido com o service worker de funcionalidade geral do PWA. Para a maioria dos PWAs, ele **não é necessário**.
