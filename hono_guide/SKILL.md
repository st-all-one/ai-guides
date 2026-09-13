# SKILL: Hono Guide

## Description
Hono v4.13.7 — framework web minimalista, ultrafast, sem dependências e construído sobre os Web Standards (`Request`/`Response`/`fetch`). Roda no mesmo código em Cloudflare Workers, Deno, Bun, Node.js, Vercel, Netlify, AWS Lambda e outros. Inclui roteamento por `RegExpRouter`, middleware nativo, helpers, validação, RPC tipado (`hc`) e JSX.

## When to Use
- Criar APIs HTTP/JSON ou apps web no edge/Deno/Bun/Node
- Rotear requisições com path params, wildcards, regex e sub-apps
- Compor middleware (auth, CORS, logger, cache, security headers...)
- Validar entrada com Zod/Valibot/TypeBox e compartilhar tipos
- Cliente type-safe end-to-end com `hono/client` (`hc`)
- Renderizar HTML com JSX ou `html` tagged template
- Substituir Express com código portável entre runtimes

## Files
| File | Covers |
|------|--------|
| `00-index.md` | Navegação, exemplo canônico (raiz) e modelo mental |
| `01-quickstart.md` | Instalação, `create-hono`, estrutura, primeiro app, entry points |
| `02-roteamento.md` | Métodos, params, wildcards, regex, `app.route`, routers |
| `03-contexto.md` | Objeto `Context` (`c`), respostas, `c.set/get`, `c.env` |
| `04-request-response.md` | `HonoRequest`, body parsing, headers, `Response` |
| `05-middleware.md` | Conceito, ordem, `next`, middleware custom |
| `06-middleware-embutidos.md` | Os 24 middlewares nativos (`hono/<nome>`) |
| `07-helpers.md` | `cookie`, `jwt`, `proxy`, `streaming`, `ssg`, `websocket`, `factory`, `html`... |
| `08-validacao.md` | `hono/validator`, Zod, Valibot, TypeBox, ArkType |
| `09-rpc-client.md` | `hc`, tipos compartilhados, Hono Stacks |
| `10-jsx.md` | JSX, `html`, `jsxRenderer`, `hono/jsx/dom` |
| `11-testing.md` | `app.request()`, `testClient`, Deno/Vitest |
| `12-api-reference.md` | Classe `Hono`, presets, `HTTPException` |
| `13-melhores-praticas.md` | Boas práticas e DX |
| `14-deploy-runtimes.md` | Deploy e entry points por runtime |
| `15-seguranca.md` | Headers, CORS, CSRF, auth, cookies, limites |
| `16-exemplos.md` | Receitas oficiais (upload, webhook, OpenAPI, htmx...) |
| `17-cheatsheet.md` | Referência rápida de tudo |
| `18-faq-troubleshooting.md` | FAQ, armadilhas e erros comuns |
| `19-padroes-avancados.md` | Arquitetura, tipagem, Fresh/Deno, performance |

## How to Read
- Comece por `00-index.md` (exemplo canônico) e `01-quickstart.md`
- Para escrever handlers: `02-roteamento.md` → `03-contexto.md` → `04-request-response.md`
- Para middleware/segurança: `05-middleware.md` → `06-middleware-embutidos.md` → `15-seguranca.md`
- Para API tipada: `08-validacao.md` → `09-rpc-client.md`
- Consulte `17-cheatsheet.md` para referência rápida e `18-faq` para erros

## Prerequisites
- TypeScript/JavaScript (ESM)
- Deno 2+, Bun, Node 18+ (via `@hono/node-server`) ou runtime edge
- `npm install hono` / `deno add jsr:@hono/hono` (ou `npm:hono`)

## Related Guides
- `ai-guides/fresh_guide/` — Fresh 2 usa Hono internamente (projeto raiz)
- `ai-guides/http_uri_guide/` — HTTP, caching, CORS, cookies
- `ai-guides/web_security_guide/` — CSP, HSTS, autenticação
- `ai-guides/javascript_guide/` — JS/TS moderno
- `ai-guides/html_guide/` — HTML gerado por JSX/`html`
