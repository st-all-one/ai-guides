---
name: telegram-bots
description: >
  Telegram Bot API 10.4 and production bot construction in Python, JavaScript/TypeScript and Rust:
  official docs snapshot (247 artifacts, 200 API subpages), HTTP/JSON contract, getUpdates vs webhooks,
  flood control, tokens and secret headers, TLS and certificates, keyboards/Web Apps, inline mode,
  Payments/Stars/widgets, local Bot API server, and pinned surfaces for python-telegram-bot, aiogram,
  pyTelegramBotAPI, grammY, Telegraf, GramIO, teloxide, carapax and tgbotapi-rs. Load when designing,
  implementing, securing, integrating, scaling or debugging a Telegram bot.
category: protocols
version: "Bot API 10.4 (2026-11-09)"
tags: [telegram, bot-api, bots, python, javascript, typescript, rust, webhooks, getupdates, grammy, telegraf, teloxide, aiogram, python-telegram-bot]
license: MIT
---

# Telegram Bots — Bot API 10.4

**Baseline:** official docs captured 2026-11-18; Bot API **10.4** dated
2026-11-09 (`bots/api.md:34`). Library facts are pinned to the commits in
`VERSION`. This is a static, line-cited map; no bot was run against the live API.

**Load when:** choosing update transport, writing handlers/keyboards/Web Apps,
handling 429s, securing a webhook, operating replicas, or selecting a library
for Python, JS/TS or Rust.

## Use When

- Decide `getUpdates` vs webhook and make delivery idempotent
- Map Bot API methods/types to a pinned library API
- Configure HTTPS, certificates, `secret_token`, `max_connections`
- Implement keyboards, callback queries, inline mode, Web Apps
- Handle Payments/Stars, widgets, or a local Bot API server
- Log, test, scale and troubleshoot a production bot

## Core Rules

1. **Bot API is HTTP+JSON, not MTProto.** Responses always carry `ok` and
   maybe `description`, `error_code`, `parameters` (`bots/api.md:29`).
2. **Polling and webhook are mutually exclusive.** A webhook makes
   `getUpdates` fail; updates are kept at most 24 hours
   (`bots/api.md:59`, `bots/api/methods/getupdates.md:17`).
3. **Acknowledge by advancing `offset`.** It must be `max(update_id)+1`; a
   stale offset reproduces the same updates
   (`bots/api/methods/getupdates.md:9,18`).
4. **Webhooks need TLS ≥ 1.2** and only ports 443/80/88/8443 on the public
   API (`bots/webhooks.md:24-29,43,52,56`). Use a secret token header.
5. **429 is normal.** Read `retry_after`, back off with jitter, serialize per
   chat; the public API is not an unlimited firehose (`bots/faq.md:124`).
6. **Token in env/secret store.** Never commit it, log it, or place it in a
   webhook URL without treating that URL as a secret.
7. **Pin the API line.** 10.4 added widgets and other surface
   (`bots/api.md:34`); re-check the changelog before upgrading a library.
8. **One language track per task.** PTB/aiogram/pyTelegramBotAPI, grammY/
   Telegraf/GramIO, teloxide/carapax/tgbotapi-rs solve different shapes.
9. **Multiple replicas need idempotency.** Dedupe on `update_id` and keep
   conversation state outside the process.
10. **Local Bot API server is an exception, not a default.** It unlocks 2 GB
    uploads and HTTP webhooks but adds a service to operate
    (`bots/api.md:40-55`).

## Core Patterns

```bash
export TELEGRAM_BOT_TOKEN='...'   # secret store in real deployments
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/telegram","secret_token":"..."}'
```

```python
# python-telegram-bot 22.8.0 - minimal verified shape
import os
from telegram.ext import Application, CommandHandler

async def start(update, context):
    await update.message.reply_text("ok")

app = Application.builder().token(os.environ["TELEGRAM_BOT_TOKEN"]).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
```

```ts
// grammY 1.46.0 — minimal verified shape
import { Bot } from "grammy";
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
bot.command("start", (ctx) => ctx.reply("ok"));
bot.start();
```

```rust
// teloxide 0.17.0 - minimal verified shape
use teloxide::prelude::*;

#[tokio::main]
async fn main() {
    let bot = Bot::from_env();
    teloxide::repl(bot, |bot: Bot, msg: Message| async move {
        bot.send_message(msg.chat.id, "ok").await?;
        Ok(())
    })
    .await;
}
```

## File Map

| File | Content |
|---|---|
| `00-index.md` | Snapshot, citation contract, library matrix, file map |
| `01-api-boundary-and-limits.md` | Bot API vs MTProto, JSON contract |
| `02-architecture-and-update-loop.md` | Update object, polling vs webhook |
| `03-api-reference-map.md` | Navigating 191 method pages and types |
| `04-antiflood-and-limits.md` | 429, retry_after, batching |
| `05-security-and-tokens.md` | Token, secret header, TLS, authz |
| `06-webhooks-and-deployment.md` | setWebhook, certificates, proxy |
| `07-long-polling.md` | getUpdates loop, offset, timeout |
| `08-python-python-telegram-bot.md` | PTB 22.8.0 |
| `09-python-aiogram.md` | aiogram 3.32.0 |
| `10-python-pytelegrambotapi.md` | pyTelegramBotAPI 4.37.1 |
| `11-js-grammy.md` | grammY 1.46.0 |
| `12-js-telegraf.md` | Telegraf 4.100.0 |
| `13-js-gramio-and-typed.md` | GramIO + typed clients |
| `14-rust-teloxide.md` | teloxide 0.17.0 |
| `15-rust-carapax-and-tgbotapi.md` | carapax + thin wrapper |
| `16-keyboards-and-webapps.md` | Keyboards, callbacks, Web Apps |
| `17-inline-mode-and-rich-messages.md` | Inline queries, entities, edits |
| `18-payments-stars-and-widgets.md` | Payments, Stars, widgets |
| `19-local-bot-api-server.md` | Self-hosted server and TLS |
| `20-observability-and-testing.md` | Logs, health, fake updates |
| `21-production-and-scaling.md` | Replicas, queues, shutdown |
| `22-errors-and-troubleshooting.md` | Error taxonomy, WebhookInfo |
| `23-recommended-implementation.md` | Minimum verified stack per language |
| `24-coverage-and-limits.md` | Measured coverage and gaps |
| `25-errors-and-retries-deep.md` | Retry state machines, idempotency, error hooks |
| `26-logging-metrics-and-tracing.md` | Log schema, redaction, metrics, SLOs, spans |
| `27-security-hardening.md` | Token rotation, Web App HMAC, abuse controls |
| `28-performance-and-capacity.md` | Capacity model, flood budget, profiling |
| `samples/` | Verbatim official/library examples with MANIFEST |

## Read Order

`00` → `01` → `02`. Transport: `06`+`07`. API depth: `03`+`04`+`05`.
Python `08`–`10`, JS/TS `11`–`13`, Rust `14`–`15`. Features: `16`–`19`.
Operate: `20`–`22`. Decide: `23`. Limits: `24`. Deep: `25`–`28`.

## Prereqs

A bot token from BotFather; HTTPS host for webhooks; Python ≥3.11 for the
Python track, Node.js for JS/TS, Rust 1.85+ for teloxide
(`teloxide/Cargo.toml:8`). No MTProto/TDLib knowledge required.
