# Segurança — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Mudanças de alto impacto em relação ao 12:
> request forgery e serialização de cache/sessão.

---

## 1. Request forgery: `PreventRequestForgery` (mudança crítica)

O middleware `Illuminate\Foundation\Http\Middleware\PreventRequestForgery` substitui
`VerifyCsrfToken`. É incluído no grupo `web` e usa **duas camadas**: primeiro verifica
`Sec-Fetch-Site` (enviado por browsers em HTTPS); se for `same-origin`, libera sem token;
caso contrário, cai para validação do token CSRF tradicional
(`samples/doc-csrf.md:39-43`). `VerifyCsrfToken` e `ValidateCsrfToken` continuam como
aliases deprecados (`samples/doc-upgrade-13.md:400-402`).

samples/doc-csrf.md:85-87
```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->preventRequestForgery(originOnly: true);
})
```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->preventRequestForgery(originOnly: true);
})
```

When using origin-only mode, requests that fail origin verification will receive a `403` HTTP response instead of the `419` response typically associated with CSRF token mismatches.
```

Modos e efeitos:

| Configuração | Efeito | Quando usar | Fonte |
|---|---|---|---|
| padrão | origem OK libera; senão valida token | maioria das apps HTTPS | `samples/doc-csrf.md:39-43` |
| `originOnly: true` | sem fallback de token; falha = `403` (não `419`) | apenas客户端 browser + HTTPS, com CORS explícito | `samples/doc-csrf.md:82-90` |
| `allowSameSite: true` | aceita `same-site` além de `same-origin` | subdomínios conversando | `samples/doc-csrf.md:95-99` |
| `except: [...]` | isenta URIs | webhooks (Stripe etc.) | `samples/doc-csrf.md:105-119` |

> O header `Sec-Fetch-Site` **só é enviado sobre HTTPS**. Sem TLS, a proteção depende
> inteiramente do token (`samples/doc-csrf.md:92-93`). Nunca ative `originOnly: true`
> em HTTP ou em endpoints consumidos por clientes não-browser.

Tokens continuam disponíveis `_token` via `@csrf`, `csrf_token()`, header `X-CSRF-TOKEN`
e cookie criptografado `XSRF-TOKEN` / header `X-XSRF-TOKEN`
(`samples/doc-csrf.md:59-75`, `samples/doc-csrf.md:126-147`). Em testes o middleware é
desabilitado automaticamente (`samples/doc-csrf.md:122-124`); se precisar excluir
explicitamente, use `PreventRequestForgery::class`
(`samples/doc-upgrade-13.md:404-413`).

---

## 2. Endurecimento de serialização (cache e sessão)

Dois defaults do skeleton 13 bloqueiam *gadget chains* caso `APP_KEY` vaze:

- `config/session.php`: `'serialization' => 'json'`, com aviso de que `'php'` permite
  objetos e pode expor a aplicação a ataques de deserialização
  (`samples/samples-config-session.php:219-231`).
- `config/cache.php`: `'serializable_classes' => false`
  (`samples/samples-config-cache.php:131-134`).

**Regras práticas:**

1. Armazene apenas arrays/scalars em sessão e cache. Se precisar de objetos, use DTOs
   allow-listados em `serializable_classes` (`samples/doc-upgrade-13.md:136-146`).
2. Ao migrar do 12, trocar `php` → `json` **invalida sessões ativas**; se isso for
   inaceitável, mantenha `php` até uma janela de reautenticação
   (`samples/doc-upgrade-13.md:370-379`).
3. Custom `Cache\Store` deve implementar `touch($key, $seconds)`
   (`samples/doc-upgrade-13.md:120-129`).
4. Preserve `CACHE_PREFIX`, `REDIS_PREFIX` e `SESSION_COOKIE` se depender dos defaults
   antigos (`samples/doc-upgrade-13.md:103-117`).

---

## 3. Autenticação, autorização e password reset

A documentação oficial cobre guards, providers, Gates, Policies e Sanctum; no 13,
mudanças nessa área são de contrato: `MustVerifyEmail` ganha
`markEmailAsUnverified()` (`samples/doc-upgrade-13.md:190-197`). Implemente esse método
em implementações customizadas; a verificação de e-mail padrão permanece intacta.

O subject padrão do e-mail de reset mudou de `Reset Password Notification` para
`Reset your password` (`samples/doc-upgrade-13.md:282-298`). Atualize testes,
traduções e snapshots. Notificações enfileiradas agora respeitam
`#[DeleteWhenMissingModels]` e `$deleteWhenMissingModels`
(`samples/doc-upgrade-13.md:299-306`) — configure explicitamente se você depende de
limpeza de jobs órfãos.

Autorização declarativa em controllers é nova no 13: `#[Authorize('create', [...])]`
colocado sobre o método (`samples/doc-releases-13.md:134-164`). Continue usando
Form Requests + Policies para regras complexas; atributos são para ações simples e
colocadas junto do código.

samples/doc-releases-13.md:152-161
```php
#[Middleware('auth')]
class CommentController
{
    #[Middleware('subscribed')]
    #[Authorize('create', [Comment::class, 'post'])]
    public function store(Post $post)
    {
        // ...
    }
}
```

---

## 4. Criptografia, hashing e segredos

- **Criptografia:** AES-256-CBC com `APP_KEY`; rotacione usando `APP_PREVIOUS_KEYS`
  sem invalidar dados já cifrados. Nunca logue `APP_KEY` ou tokens.
- **Hashing:** bcrypt (`BCRYPT_ROUNDS=12` no skeleton) ou argon2id
  (`samples/samples-env.example:11`). Ajuste o custo ao hardware e meça; o padrão é
  ponto de partida, não promessa de desempenho.
- **Secrets:** mantenha em `.env` e leia **somente** em `config/*`. O skeleton traz
  `APP_KEY=` vazio e `APP_DEBUG=true` para desenvolvimento
  (`samples/samples-env.example:1-5`); em produção, `APP_DEBUG=false`.
- **Assinatura de URL e cookies:** use os helpers do framework (`URL::signedRoute`,
  cookie encryption) em vez de implementar HMAC próprio.

---

## 5. Validação, mass assignment e upload

Form Requests continuam sendo a fronteira canônica: `authorize()`, `rules()` e
`messages()` no mesmo objeto. Use `->validated()` no controller para evitar mass
assignment acidental. Em modelos, `$fillable` explícito (ou `GuardsAttributes`) —
nunca `$guarded = []` em modelos que aceitam input do usuário.

Para uploads: `mimes`/`mimetypes`, limites de tamanho, storage privado por padrão e
`Storage::url()` apenas para disk público. Sanitize nomes de arquivo e nunca confie no
nome original para decidir permissão.

---

## 6. Rate limiting, trusted proxies e hosts

O grupo `api` aplica throttle por padrão quando instalado via `install:api`. Defina
limites por rota/grupo (`RateLimiter::for(...)`) e use Redis como backend para limites
distribuídos. Atrás de load balancer, configure `trustProxies(at: [...])` e
`trustHosts(at: [...])` em `withMiddleware` — sem isso, `$request->ip()` e
`$request->isSecure()` refletem o proxy, não o cliente, e o throttle errado é aplicado.

---

## 7. Checklist de ameaças mapeadas

| Ameaça | Controle no 13 | Evidência |
|---|---|---|
| CSRF | `PreventRequestForgery` + `Sec-Fetch-Site` + token | `samples/doc-csrf.md:39-43` |
| Gadget chain via cache | `serializable_classes: false` | `samples/samples-config-cache.php:131-134` |
| Gadget chain via sessão | `serialization: json` | `samples/samples-config-session.php:219-231` |
| Vazamento de `APP_KEY` | Rotação com `APP_PREVIOUS_KEYS`, sem logar segredos | `samples/samples-env.example:1-5` |
| Força bruta em login | Rate limiter por IP/credencial | documentação de `authentication` |
| XSS em Blade | escaping automático `{{ }}`; `{!! !!}` só com HTML sanitizado | `samples/doc-blade.md` |
| SQL injection | Query Builder/Eloquent com bindings; nunca concatene input | `samples/doc-database.md` |
| Mass assignment | `$fillable` + `validated()` | `samples/doc-installation.md`, `samples/doc-database.md` |
| Host header injection | `trustHosts(at:)` em `withMiddleware` | `samples/doc-installation.md` |

## Resumo de Pontos-Chave

- **`PreventRequestForgery` é o novo nome e comportamento padrão**; aliases antigos são deprecados.
- **`originOnly: true` só faz sentido com HTTPS e clientes browser**; sem TLS, use token.
- **`serializable_classes: false` e sessão JSON** são defesas contra deserialização maliciosa.
- **`MustVerifyEmail::markEmailAsUnverified()`** é obrigatório em implementações customizadas.
- **Subject de reset e `#[DeleteWhenMissingModels]`** podem quebrar testes e limpeza de filas.
- **`#[Authorize]` complementa Policies**; não substitua autorização complexa por atributo.
- **Proxies e hosts confiáveis são pré-requisito** para IP, HTTPS e rate limiting corretos.
