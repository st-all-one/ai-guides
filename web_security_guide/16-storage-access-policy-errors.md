# Storage Access Policy — Erros e Diagnóstico (Firefox)

## 1. Todos os Erros

| Erro | Causa | Resolução |
|------|-------|-----------|
| **CookieBlockedAll** | Blocking ALL storage access | Settings → ETP → Custom: Cookies ≠ All Cookies |
| **CookieBlockedByPermission** | Custom cookie permission setada pelo usuário | Settings → Privacy → Cookies → Manage Exceptions |
| **CookieBlockedForeign** | Blocking all third-party storage | Settings → ETP → Manage Exceptions, ou `crossorigin="anonymous"` |
| **CookieBlockedTracker** | Identified as tracker + content blocking ativo | Settings → ETP → Manage Exceptions, ou unchecked Tracking Content |
| **CookiePartitionedForeign** | Dynamic State Partitioning ativo (não é erro, é aviso) | Storage Access API, ou desabilitar partitioning |

## 2. Detalhamento

### CookieBlockedAll
**Mensagem:**
```
CookieBlockedAll=Request to access cookies or storage on "X" was blocked because we are blocking all storage access requests.
```

**Causa:** Configuração de "All Cookies" no ETP Custom.
**Fix:** Settings → Privacy & Security → Enhanced Tracking Protection → Custom → Cookies ≠ "All Cookies".

Se o recurso não precisa de autenticação, adicionar `crossorigin="anonymous"` ao elemento resolve o warning.

---

### CookieBlockedByPermission
**Mensagem:**
```
CookieBlockedByPermission=Request to access cookies or storage on "X" was blocked because of custom cookie permission.
```

**Causa:** Usuário adicionou exceção manual bloqueando cookies para o site.
**Fix:** Settings → Privacy & Security → Cookies and Site Data → Manage Exceptions.

---

### CookieBlockedForeign
**Mensagem:**
```
CookieBlockedForeign=Request to access cookies or storage on "X" was blocked because we are blocking all third-party storage access requests and content blocking is enabled.
```

**Causa:** Terceira parte (cross-origin) tentando acessar storage.
**Fix:** Settings → ETP → Manage Exceptions, ou adicionar `crossorigin="anonymous"` se o recurso não precisa de autenticação.

---

### CookieBlockedTracker
**Mensagem:**
```
Request to access cookie or storage on "X" was blocked because it came from a tracker and content blocking is enabled.
```

**Causa:** Recurso identificado como tracker pela lista do Firefox.
**Fix:**
1. Settings → ETP → Manage Exceptions (adicionar exceção)
2. Ou: Custom Content Blocking → desmarcar "Tracking content"
3. Ou: `crossorigin="anonymous"` se não precisa de auth

---

### CookiePartitionedForeign ⚠️ (Aviso, não Erro)
**Mensagem:**
```
CookiePartitionedForeign=Partitioned cookie or storage access was provided to "<URL>" because it is loaded in the third-party context and storage partitioning is enabled.
```

**Causa:** Dynamic State Partitioning particionou o storage — normal, não é bloqueio.
**Implicação:** Recurso tem storage particionado por top-level site.

**O que fazer:**
- Se precisa de acesso cross-site: usar [Storage Access API](/en-US/docs/Web/Privacy/Guides/State_Partitioning#storage_access_api)
- Se quer desabilitar: `network.cookie.cookieBehavior` pref (não recomendado)

## 3. Resumo de Resoluções

| Técnica | Aplicável Quando |
|---------|-----------------|
| `crossorigin="anonymous"` | Recurso não precisa de cookies/auth |
| Manage Exceptions (Settings) | Site específico precisa funcionar |
| Storage Access API | Embedded precisa de acesso cross-site |
| CHIPS (`Partitioned` cookie) | Third-party cookie com particionamento explícito |
| Desabilitar ETP para o site | Último recurso (UX prejudicada) |
