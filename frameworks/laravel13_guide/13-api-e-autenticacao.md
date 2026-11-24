# API e autenticação — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. `routes/api.php` só existe após
> `php artisan install:api`; JSON rendering já configurado no skeleton.

---

## 1. Instalação da API e formato de resposta

O skeleton 13 **não** traz `routes/api.php` por padrão: execute `php artisan install:api`
para instalar Sanctum e criar a rota. O `bootstrap/app.php` já trata `api`, `api/*` e
`expectsJson()` como JSON (`samples/samples-bootstrap-app.php:17-21`).

```bash
php artisan install:api
```

Para customizar a decisão HTML vs JSON, use `shouldRenderJsonWhen`
(`samples/doc-errors.md:269-288`). Para customizar o corpo de erro, `respond()`
(`samples/doc-errors.md:289-309`). Em erros JSON:API, implemente `errors[]` na camada
de resposta — o framework não gera esse payload automaticamente (ver capítulo 10).

---

## 2. Autenticação

- **Sessão (web):** guard `web`, `Auth::attempt()`, `session()->regenerate()` no login
  e logout invalidando a sessão. `SESSION_DRIVER=database` no skeleton
  (`samples/samples-env.example:26`).
- **Sanctum (SPA/mobile):** `HasApiTokens`, `/sanctum/csrf-cookie` para SPA e
  `auth:sanctum` nas rotas API. Tokens com `createToken(...)->plainTextToken` exibidos
  **uma** vez, nunca logados.
- **Fortify / Passport / Socialite:** documentação oficial cobre fluxos completos
  (`samples/doc-authentication.md`, `samples/doc-fortify.md`,
  `samples/doc-passport.md`, `samples/doc-socialite.md`).

Mudanças 13: `MustVerifyEmail` ganha `markEmailAsUnverified()`
(`samples/doc-upgrade-13.md:190-197`); o subject padrão do reset é
`Reset your password` (`samples/doc-upgrade-13.md:282-298`).

---

## 3. Autorização declarativa

`#[Authorize('create', [Comment::class, 'post'])]` e `#[Middleware('auth')]` são
novos no 13 (`samples/doc-releases-13.md:134-164`). Use para verificações curtas e
colocadas no método; Polices permanecem a fonte de verdade para regras complexas.
Gates via `Gate::define()` continuam válidos para ações globais.

---

## 4. Rate limiting e CSRF em API

- Ratelimiters: `RateLimiter::for('api', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()))`.
  Use Redis para contadores compartilhados entre instâncias.
- `PreventRequestForgery` pertence ao grupo `web`; rotas `api` normalmente ficam fora
  dele. Se uma rota API precisar de token CSRF (SPA híbrida), use o cookie
  `XSRF-TOKEN` / header `X-XSRF-TOKEN` (`samples/doc-csrf.md:126-147`).
- Em webhooks, prefira manter a rota fora do grupo `web` a usar `except:`
  (`samples/doc-csrf.md:105-119`).

---

## 5. Resources e versionamento

Use Resources (JSON:API quando fizer sentido, capítulo 10) como contrato de saída;
nunca serialize `$model` diretamente. Versionamento por prefixo (`/api/v1`) é mais
simples que negociação de header; mantenha um Resource por versão quando o formato
muda. Documente com OpenAPI gerado a partir de testes de feature — o contrato é a
resposta real, não anotações perdidas.

---

## 6. Segurança de transporte

HTTPS obrigatório: além de proteger tokens, é pré-requisito para verificação de origem
via `Sec-Fetch-Site` (`samples/doc-csrf.md:92-93`). Configure proxies confiáveis
antes de aplicar rate limit por IP, senão todos os clientes compartilham o IP do LB.

## Resumo de Pontos-Chave

- **`install:api` cria rotas API + Sanctum**; não assuma `routes/api.php` no skeleton.
- **`shouldRenderJsonWhen` já cobre `api*`** no skeleton 13.
- **Sanctum: token em plain text uma única vez**; nunca em logs.
- **`#[Authorize]` é novo no 13**; Polices continuam sendo a fonte de verdade.
- **`MustVerifyEmail::markEmailAsUnverified()`** é obrigatório em implementações próprias.
- **Rate limiting com Redis** e proxies confiáveis para IP correto.
- **Resources são o contrato de saída**; versionamento por prefixo é o mais simples.
