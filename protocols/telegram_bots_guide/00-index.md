# 00 - Index, snapshot and citation contract

This guide maps the **official Telegram Bot API** and the Python,
JavaScript/TypeScript and Rust ecosystems listed on Telegram's own library
page. Static reference; no live bot was executed.

## 1. Measured snapshot

| Item | Value | Basis |
|---|---|---|
| Capture date | 2026-11-18 | local crawl manifest |
| Bot API version | **10.4** (2026-11-09) | `bots/api.md:34` |
| Official artifacts captured | 247 | 24 HTML + 23 whole-page `.md` + 200 API subpages |
| Raw capture size | ~3.09 MB | `manifest.json` byte sums |
| API reference | 472-line `.md`, 19,390-line extracted text | `bots/api.md` |
| Per-method pages | 191 | links enumerated from `bots/api.md` |
| Per-type pages captured | 10 | 9 linked + `WebhookInfo` fetched explicitly |
| Library clones | 9, pinned commits | see `VERSION` and section 4 |
| Live API calls | **none** | no token, no network calls to `api.telegram.org` |

The four roots and every internal `/bots/*` link were crawled, including the
advertised `.md` twins and 191 method pages. Raw graph and bytes stay outside
the repository.

## 2. Scope

**Included:** Bot HTTP API 10.4, update transport, security, flood control,
Web Apps, inline mode, Payments/Stars, local server, and pinned
Python/JS-TS/Rust libraries.

**Excluded:** MTProto/TDLib client API, other languages, pricing, availability,
future versions. The C++ local-server source is cited but not analysed.

## 3. Citation contract

Point facts carry a backticked reference inline:

| Form | Meaning |
|---|---|
| `bots/api.md:34` | line 34 of `https://core.telegram.org/bots/api.md` |
| `bots/webhooks.md:24-29` | lines 24-29 of `https://core.telegram.org/bots/webhooks.md` |
| `bots/api/methods/getupdates.md:9` | line 9 of that method's own page |
| `python-telegram-bot/src/telegram/_version.py:54` | file/line in the pinned clone (full URL in `## Sources`) |
| `path/to/file` without line | whole-file fact |
| `not verified` | deliberately not checked; do not promote to fact |

Docs prefixes expand to `https://core.telegram.org/`; repo prefixes to section 4
commits. Lines are snapshot-specific; ranges inclusive.

## 4. Library matrix

| Prefix | Upstream | Commit | Version | Role in this guide |
|---|---|---|---|---|
| `python-telegram-bot` | python-telegram-bot/python-telegram-bot | `41e3633` | 22.8.0 (`python-telegram-bot/src/telegram/_version.py:54`) | batteries-included Python |
| `aiogram` | aiogram/aiogram | `63d09d6` | 3.32.0, API 10.4 (`aiogram/aiogram/__meta__.py:1`) | async/router Python |
| `pyTelegramBotAPI` | eternnoir/pyTelegramBotAPI | `469eece` | 4.37.1 (`pyTelegramBotAPI/pyproject.toml`) | simple sync/async Python |
| `grammY` | grammyjs/grammY | `e8b3b1b` | 1.46.0 (`grammY/package.json:4`) | modern TS-first JS |
| `telegraf` | telegraf/telegraf | `1386cc4` | 4.100.0 (`telegraf/package.json:3`) | mature JS middleware |
| `gramio` | gramiojs/gramio | `a648763` | 0.15.3 (`gramio/package.json:4`) | typed TS framework |
| `teloxide` | teloxide/teloxide | `3c46b96` | 0.17.0 (`teloxide/crates/teloxide/Cargo.toml:3`) | full Rust framework |
| `carapax` | tg-rs/carapax | `5566d29` | 0.40.0 (`carapax/Cargo.toml:3`) | Rust handler framework |
| `tgbotapi-rs` | Syfaro/tgbotapi-rs | `bd553c1` | 0.1.0 (`tgbotapi-rs/Cargo.toml:3`) | thin Rust API wrapper |


## 5. File map

| File | Content |
|---|---|
| `00-index.md` | This document: snapshot, scope, citation contract, library matrix |
| `01-api-boundary-and-limits.md` | Bot API vs MTProto, JSON contract, version boundary |
| `02-architecture-and-update-loop.md` | Update object, polling vs webhook, idempotency |
| `03-api-reference-map.md` | How to navigate 191 method pages and the type model |
| `04-antiflood-and-limits.md` | 429, `retry_after`, batching, backoff |
| `05-security-and-tokens.md` | Token, secret header, TLS, authorization, redaction |
| `06-webhooks-and-deployment.md` | `setWebhook`, certificates, proxy, serverless |
| `07-long-polling.md` | `getUpdates` loop, offset, timeout, local server |
| `08-python-python-telegram-bot.md` | PTB 22.8.0 Application/handlers/persistence |
| `09-python-aiogram.md` | aiogram 3.32.0 Dispatcher/routers/FSM |
| `10-python-pytelegrambotapi.md` | pyTelegramBotAPI 4.37.1 sync vs async |
| `11-js-grammy.md` | grammY 1.46.0 middleware/conversations/runners |
| `12-js-telegraf.md` | Telegraf 4.100.0 middleware/stages/webhook |
| `13-js-gramio-and-typed.md` | GramIO and typed API clients |
| `14-rust-teloxide.md` | teloxide 0.17.0 dptree/dialogue |
| `15-rust-carapax-and-tgbotapi.md` | carapax vs thin wrapper |
| `16-keyboards-and-webapps.md` | keyboards, callback data, Web Apps |
| `17-inline-mode-and-rich-messages.md` | inline queries, entities, editing |
| `18-payments-stars-and-widgets.md` | Payments, Stars, gifts, widgets |
| `19-local-bot-api-server.md` | self-hosted server, limits, self-signed TLS |
| `20-observability-and-testing.md` | logs, health, fake updates, test strategy |
| `21-production-and-scaling.md` | stateless workers, queues, replicas, shutdown |
| `22-errors-and-troubleshooting.md` | error taxonomy, `WebhookInfo`, symptom table |
| `23-recommended-implementation.md` | minimum verified recipe per language |
| `24-coverage-and-limits.md` | what was measured, inferred, or not executed |
| `25-errors-and-retries-deep.md` | retry state machines, idempotency, per-library errors |
| `26-logging-metrics-and-tracing.md` | log schema, redaction, metrics, SLOs, spans |
| `27-security-hardening.md` | token rotation, Web App HMAC, abuse controls, incidents |
| `28-performance-and-capacity.md` | capacity model, flood budget, files, profiling |

## 6. Read order

Always `00` → `01` → `02`. Transport: `06`+`07`. API depth: `03`+`04`+`05`.
Pick one language track: Python `08`–`10`, JS/TS `11`–`13`, Rust `14`–`15`.
Features: `16`–`19`. Operate: `20`–`22`. Decide: `23`. Limits: `24`. Deep: `25`–`28`.

## 7. Hard rules

1. Two update mechanisms are mutually exclusive; a webhook makes `getUpdates`
   fail (`bots/api.md:59`, `bots/api/methods/getupdates.md:17`).
2. Updates are retained at most 24 hours (`bots/api.md:59`): a dead worker is
   data loss after that window.
3. `getUpdates` must advance `offset` past the highest `update_id`, otherwise
   duplicates repeat (`bots/api/methods/getupdates.md:9,18`).
4. Webhooks require HTTPS, TLS ≥ 1.2, and only ports 443/80/88/8443 on the
   public API (`bots/webhooks.md:24-29,43,52,56`).
5. `ok:false` responses carry `description`, `error_code` and sometimes
   `ResponseParameters`; do not rely on `error_code` being stable
   (`bots/api.md:29`).
6. Uploads by URL are capped at 5 MB for photos / 20 MB otherwise; multipart
   at 10 MB / 50 MB (`bots/api.md:112-113`). The local server changes this.
7. Bot API 10.4 is new; re-check the changelog before pinning a deployment
   (`bots/api.md:34`, `bots/api-changelog.md:1`).

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/samples.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/_version.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/__meta__.py
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/Cargo.toml
