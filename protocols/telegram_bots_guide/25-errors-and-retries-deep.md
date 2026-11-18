# 25 - Errors and retries in depth

`22` maps symptoms; `04` owns flood limits and backoff. Adds classification,
retry state, idempotency, error records and per-library error models.

## 1. Taxonomy beyond a status class

Classify by origin and whether replaying the same bytes changes the outcome.

| Class | Signal | Repeat? | Mechanism |
|---|---|---|---|
| Parse / schema | `InvalidJson` with raw text (`teloxide/crates/teloxide-core/src/errors.rs:38`) | No | Parser bug; fix code |
| Validation | `BadRequest` (`python-telegram-bot/src/telegram/error.py:158`) | No | Deterministic; validate locally |
| Authorization | `Forbidden`/`InvalidToken` (`python-telegram-bot/src/telegram/error.py:100,113`) | No | Rotate; never retry |
| Transport | `NetworkError`/`TimedOut` (`python-telegram-bot/src/telegram/error.py:138,164`), `HttpError` (`grammY/src/core/error.ts:78`) | Keyed only | Maybe delivered despite timeout |
| Platform 429 | `RetryAfter` (`python-telegram-bot/src/telegram/error.py:207`), `retry_after` (`bots/api/types/responseparameters.md:10`) | After wait | Serialize per chat (`04`) |
| Local warm-up 429 | `close` fails for 10 min after launch (`bots/api/methods/close.md:5`) | Later | Not flood control |
| Webhook delivery | non-`2XY` replayed (`bots/api/methods/setwebhook.md:5`) | Inbound dup | Dedupe; do not re-enqueue |
| Partial fan-out | one envelope per call (`bots/api.md:29`) | Per item | 7 of 10 sent, 3 failed |
| Migration | `migrate_to_chat_id` (`bots/api/types/responseparameters.md:9`) | After rewrite | Terminal for old id |

## 2. Retry state machine

`NEW→IN_FLIGHT→SUCCESS|RETRY_WAIT|TERMINAL|DEAD_LETTER`; persist transitions.

1. **Classify.** Terminal: auth, validation, parse, bad parse mode, duplicate
   side effects. Retryable: transport, timeout, 429, transient 5xx. Unknown →
   one probe, then terminal.
2. **`retry_after` precedence.** Wait at least `parameters.retry_after`
   (`bots/api/types/responseparameters.md:10`); add only *positive* jitter.
   PTB exposes `RetryAfter.retry_after`
   (`python-telegram-bot/src/telegram/error.py:241`). Otherwise use `04`'s
   capped exponential formula.
3. **Budget.** Cap attempts and wall-clock time; retries cannot outlive update
   retention (`04`, `bots/api.md:59`).
4. **Dead letter.** On exhaustion persist method, payload hash, attempts and
   correlation id, then alert; unbounded retries are a self-DoS.
5. **Never retry** `InvalidToken`
   (`python-telegram-bot/src/telegram/error.py:113`) or a send without an
   idempotency key. Timeout = "maybe delivered": replay only behind a key.

## 3. Idempotency and exactly-once effects

**Inbound.** Dedupe on `update_id`; confirmed only by a call with
`offset > update_id` (`bots/api/methods/getupdates.md:9`). Beyond `22`'s advice:
a unique `(update_id, handler)` row committed *before* side effects, with a TTL
longer than the webhook retry window. Ack the POST only after that durable
write: non-`2XY` replays (`bots/api/methods/setwebhook.md:5`).

**Outbound.** Telegram provides no client idempotency key. Build one:
`sha256(op_id + method + canonical_params)`, stored with attempt count and the
returned `message_id`; a replay with the same key returns the stored result.
Use an outbox: insert job and effect marker in one transaction, claim with
`FOR UPDATE SKIP LOCKED`, mark `sent` only on `ok:true` (`bots/api.md:29`).

**Safe to repeat:** `answerCallbackQuery`, `deleteMessage`, state writes.
**Unsafe:** `sendMessage`, payments, counters. Retry only missing fan-out items.

## 4. Structured error records

Fields: `ts`, `correlation_id`, `update_id`, `job_id`, `method`, `attempt`,
`error_class`, `error_code`, `description`, `parameters.retry_after`,
`parameters.migrate_to_chat_id`, `library_type`, `raw_hash`, next state.
Correlation id is minted at webhook entry and follows the queue job (`20`).

- `error_code` is unstable (`bots/api.md:29`): branch on class and
  `ResponseParameters`; keep the number for humans only.
- Redact token, `secret_token`, `initData`, phones, paths; retain `raw_hash`.
- `migrate_to_chat_id` (`bots/api/types/responseparameters.md:9`): store
  old→new, terminate old-id jobs, rewrite queued ones; use 64-bit.

## 5. Per-library error models

| Library | Source | Hook / consequence |
|---|---|---|
| python-telegram-bot | `TelegramError` and subclasses (`python-telegram-bot/src/telegram/error.py:46,100,113,138,158,164,182,207`); `add_error_handler` (`python-telegram-bot/src/telegram/ext/_application.py:1789`) | Handler gets update + context; PTB may raise `RetryAfter` — do not sleep twice |
| aiogram | errors middleware emits `error` event (`aiogram/aiogram/dispatcher/middlewares/error.py:30-33`); `ErrorEvent` holds update + exception (`aiogram/aiogram/types/error_event.py:18,20`) | `@router.error()`; unhandled re-raise at `aiogram/aiogram/dispatcher/middlewares/error.py:38` → webhook replay |
| grammY | `GrammyError` carries code, description, `parameters`, method, payload (`grammY/src/core/error.ts:16,20,22,24,29,31`); `HttpError` (`:78`) | `bot.catch` (`grammY/src/bot.ts:537`); no public `onError` in this snapshot |
| Telegraf | `TelegramError` wraps code / description / `parameters` (`telegraf/src/core/network/error.ts:8,20,24`) | `Composer.catch` error middleware (`telegraf/src/composer.ts:310-316`); must resolve the promise |
| teloxide | `RequestError` variants (`teloxide/crates/teloxide-core/src/errors.rs:11,19,24,29,38`), `retry_after` helper (`:66`) | `ErrorHandler` (`teloxide/crates/teloxide/src/error_handlers.rs:10`), `OnError`/`log_on_error` (`:54,:64`) |

## 6. Decision table

| Error | Retry? | Wait | Side-effect risk | Hook |
|---|---|---|---|---|
| Parse / validation | No | — | None | `InvalidJson`, `BadRequest`, aiogram error event |
| Auth / bad parse mode | No | — | None | `InvalidToken`, `bot.catch`, `ErrorHandler` |
| `retry_after` 429 | Yes, bounded | ≥ `retry_after` + positive jitter | Duplicate send without key | PTB `RetryAfter`, grammY `parameters` |
| Transport timeout | Yes, keyed | capped exponential + jitter | Maybe delivered | `HttpError`, `NetworkError`, `OnError` |
| Warm-up 429 | Yes | minutes, not seconds | Low | `close:5`, outside flood budget |
| Webhook non-2XY | No | dedupe | Duplicate inbound | `setwebhook:5`, unique `update_id` |
| Partial fan-out | Missing items | per item | Mixed; keep ids | `bots/api.md:29`, outbox state |

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api/types/responseparameters
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/api/methods/close
- https://core.telegram.org/bots/api/methods/getupdates
- python-telegram-bot: https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/error.py , https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_application.py
- aiogram: https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/dispatcher/middlewares/error.py , https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/types/error_event.py
- grammY: https://github.com/grammyjs/grammY/blob/e8b3b1b/src/core/error.ts , https://github.com/grammyjs/grammY/blob/e8b3b1b/src/bot.ts
- Telegraf: https://github.com/telegraf/telegraf/blob/1386cc4/src/core/network/error.ts , https://github.com/telegraf/telegraf/blob/1386cc4/src/composer.ts
- teloxide: https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/errors.rs , https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/error_handlers.rs
