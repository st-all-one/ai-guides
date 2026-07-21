# Cookie Security & Privacy

## 1. Cookie Attributes — O Padrão Moderno

### Template de Cookie Seguro
```
Set-Cookie: __Host-SESSIONID=<random>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000
```

| Atributo | Obrigatório? | Valor Padrão Moderno |
|----------|-------------|----------------------|
| `Secure` | SIM | Presente — apenas HTTPS |
| `HttpOnly` | SIM (se JS não precisa acessar) | Presente |
| `SameSite` | SIM | `Lax` (padrão navegadores Chromium) |
| `Path` | SIM | Mais restritivo possível |
| `Domain` | NÃO | Omitir (default = host atual) |
| `Max-Age` | Recomendado | Preferível a `Expires` |
| `__Host-` prefix | Recomendado | Bind ao domínio + Path=/ |
| `__Secure-` prefix | Alternativo | Bind sem Path fixo |

### Navegadores: blocking de third-party cookies por default

| Browser | Comportamento |
|---------|--------------|
| Firefox | Total Cookie Protection (cookie jar particionado por site) — ETP padrão |
| Safari | Intelligent Tracking Prevention (ITP) |
| Chrome | Apenas Incognito (por enquanto) |
| Edge | Bloqueia trackers não visitados |
| Brave | Bloqueia tracking cookies por padrão |

## 2. SameSite em Detalhe

| Valor | Comportamento | Uso |
|-------|--------------|-----|
| `Strict` | NUNCA envia em cross-site | Session cookies críticos |
| `Lax` | Envia em top-level navigations GET | Default recomendado |
| `None` | Envia em todos contextos | Exige `Secure` — usar apenas quando necessário |

**Third-party cookie legítimo:**
```
Set-Cookie: widget_session=7yjgj57e4n3d; SameSite=None; Secure; HttpOnly
```

## 3. CHIPS — Cookies Having Independent Partitioned State

**Propósito:** Alternativa a third-party cookies — opt-in partitioned storage.

### Sintaxe
```
Set-Cookie: __Host-example=34d8g; SameSite=None; Secure; Path=/; Partitioned;
```

### Como Funciona
- Cookie duplamente keyed: `{top-level-site, 3rd-party-origin}`
- `site-a.example` embeda `chat.example` → cookie acessível apenas nessa combinação
- `site-b.example` NAO acessa o mesmo cookie
- `Partitioned` exige `Secure`
- Recomendado usar `__Host` prefix

### Relação com State Partitioning (Firefox)
| Abordagem | CHIPS | Firefox State Partitioning |
|-----------|-------|---------------------------|
| Natureza | Opt-in (Partitioned attribute) | Default (automático) |
| Controle | Dev escolhe | Browser aplica |
| Compatibilidade | Cross-browser | Firefox-only |

## 4. State Partitioning (Firefox)

- **Static partitioning** (permanente): localStorage, sessionStorage, IndexedDB, Cache API, Service Workers, HTTP cache, DNS cache, HSTS, TLS session IDs, etc.
- **Dynamic partitioning** (cookies): cookies particionados por default; acesso unpartitioned via Storage Access API

### Storage Access API
```js
// Embedded iframe solicita acesso a cookies não-particionados
document.requestStorageAccess().then(() => {
  // Cookie access granted
}).catch(() => {
  // Denied
});
```

### Heurísticas de Acesso (transicionais — não confiar)
- **Opener heuristic:** popup com opener access + user interaction → 30 dias de acesso
- **Navigation heuristic:** navegação cross-site + interação → 30 dias

## 5. Debugging (Firefox)

| Console Message | Significado |
|----------------|-------------|
| "Partitioned cookie or storage access was provided to 'X'" | Storage particionado (aviso, não erro) |
| "Storage access automatically granted for 'X' on 'Y'" | Heurística ativou |
| "Storage access granted for origin 'X' on 'Y'" | Storage Access API concedeu |

## 6. Storage Access Policy (Firefox)

**Blocking de trackers no Firefox:**

| Categoria | Efeito |
|-----------|--------|
| **Cookies** | `Cookie` header bloqueado; `Set-Cookie` ignorado; `document.cookie` vazio |
| **localStorage** | `SecurityError` |
| **IndexedDB** | `SecurityError` |
| **Service Workers** | `SecurityError` |
| **Broadcast Channel** | `SecurityError` |
| **HTTP cache** | Particionado por top-level origin |
| **TLS sessions** | Sem resumption para trackers |

**Não bloqueado:** recursos não-classificados como trackers, scripts em first-party scope, mesma registrable domain.

## 7. Transição de Third-Party Cookies

1. **Auditar** uso (`SameSite=None`, DevTools, Chrome cookie deprecation labels)
2. **Testar** com third-party cookies bloqueados
3. **Graceful degradation** — experiência menos personalizada ao invés de quebrada
4. **Alternativas:**
   - CHIPS (Partitioned cookies)
   - Storage Access API
   - First-party storage (server-side)
   - Web Storage (se o caso de uso permitir)
   - Server-side session
