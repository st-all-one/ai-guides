# 26 - Logging, metrics and tracing

Telegram publishes no metrics endpoint: no scrape, no per-method latency, no ack beyond the webhook POST status. Signals are **application-side** — logs, spans, series from your process, API replies, `WebhookInfo`, `getMe`. `20` covers basic logging and fake updates; this adds schema, redaction, spans, metrics, SLOs and library hooks (`04`,`05`,`21`,`22`).

## 1. Structured log field dictionary

One JSON event per line; *(derived)* = computed by you.

| Field | Rule |
|---|---|
| `timestamp` *(derived)* | RFC 3339 UTC, ms. |
| `level` | `DEBUG`/`INFO`/`WARN`/`ERROR` (§6). |
| `service` | `ingress`/`worker`/`scheduler`. |
| `bot_id` *(derived)* | From `getMe`, not token (`bots/api/methods/getme.md`). |
| `update_id` | Platform id; dedupe key. |
| `update_type` *(derived)* | Set `Update` branch. |
| `chat_id`/`user_id` | HMAC-SHA-256 + per-bot salt; raw in trusted store (§2). |
| `correlation_id` *(derived)* | ULID/UUID from ingress. |
| `handler` *(derived)* | Dispatcher route. |
| `method` | Method name, not URL. |
| `status` | HTTP status + `ok` (`bots/api.md:29`). |
| `retry_after` *(derived)* | 429 `ResponseParameters` seconds (`bots/api.md:29`); `04`. |
| `duration_ms` *(derived)* | Measured span length. |
| `outcome` *(derived)* | `ok`/`rate_limited`/`api_error`/`handler_error`/`dropped`. |

Aggregate on derived fields only.

## 2. Redaction rules

Redact in one encoder.

| Value | Rule |
|---|---|
| Bot token | Never: in every URL (`bots/api.md:18`); strip `bot…/`, log `bot_id`. |
| `secret_token`, `X-Telegram-Bot-Api-Secret-Token` | Never: webhook secret (`bots/api/methods/setwebhook.md:7`); log `present:bool`. |
| `initData`/`init_data` | Never: signed credential (`05`); log validation result + `auth_date`. |
| Callback data | Truncate: length + salted prefix (`20`,`05`). |
| Message bodies | Default off: user content; sampled debug (§6), hashed. |
| `file_path` | Never raw: `file_id` presence/size; path can be absolute. |
| Error `description`/`parameters` | Redact: `ok:false` may carry chat/migration ids (`bots/api.md:29`); hash. |

Secrets never persisted; extends `20`/`05`.

## 3. Tracing one update end to end

Path: webhook POST / getUpdates cycle → queue → handler → outbound API call.

- **Root span:** ingress; ids above; end on HTTP response / poll-commit.
- **Queue hop:** ids as message attributes; publish is a child span; consumer extracts context across the async boundary.
- **Handler span:** child, named from `handler`; dispatch→resolve/throw; set `outcome`/errors.
- **API call span:** child `telegram.<method>`; pre-request→post-envelope; set `method`/`status`/`ok`/`retry_after`; retry = sibling with `retry.attempt`.

Keep id in metadata, not payload. Non-2XY retries (`bots/api/methods/setwebhook.md:5`) repeat `update_id` — dedupe, count collisions. Replay example updates (`bots/webhooks.md:494-520`) with a fixed correlation id: one trace id everywhere; the same `update_id` twice gives one dedupe conflict, no effect (`20`).

## 4. Metric catalog

Type decides the legal aggregation.

| Name | Type | Labels | Why |
|---|---|---|---|
| `tg_updates_received_total` | counter | `update_type`,`service` | Volume/mix. |
| `tg_updates_handled_total` | counter | `outcome`,`handler` | Throughput/failure. |
| `tg_handler_duration_seconds` | histogram | `handler`,`outcome` | p95/p99; not averages. |
| `tg_api_calls_total` | counter | `method`,`status`,`ok` | Rate/errors. |
| `tg_api_429_total` | counter | `method`,`bot_id` | Throttling (`04`). |
| `tg_api_retry_after_seconds` | histogram | `method` | Delay spread. |
| `tg_dedupe_conflicts_total` | counter | `update_type` | Retry/offset. |
| `tg_queue_depth` | gauge | `service` | Local backlog. |
| `tg_webhook_pending_updates` | gauge | `bot_id` | `pending_update_count` (`bots/api/types/webhookinfo.md:11`). |
| `tg_webhook_last_error_age_seconds` | gauge | `bot_id` | Age of `last_error_message` (`bots/api/types/webhookinfo.md:14`). |
| `tg_getme_liveness` | gauge | `bot_id` | 1 on `getMe` success (`bots/api/methods/getme.md`). |

Last three are polled platform gauges; rest application-side. `20` is a subset.

## 5. SLOs and alert thresholds

Alert on quantiles and sustained trends, not averages — means hide the tail.

| Signal | Starting threshold | Window/action |
|---|---|---|
| Backlog | `tg_webhook_pending_updates` rising 3 scrapes, or queue above worker capacity | Sustained; workers (`21`). |
| 429 rate | `tg_api_429_total` not decaying after backoff | 5 min; serialization (`04`). |
| Handler latency | p95 < target, p99 < 4x | Duration histogram; page p99. |
| Webhook errors | `last_error_message` non-empty >1 scrape (`bots/api/types/webhookinfo.md:14`) | TLS/DNS/route (`22`). |
| Duplicates | `tg_dedupe_conflicts_total` >1% received | Replay/offset (`20`). |
| Liveness | `tg_getme_liveness == 0` for 2 intervals | Token/API (`bots/api/methods/getme.md`). |

Burn-rate on `tg_updates_handled_total{outcome!="ok"}` beats fixed percentages.

## 6. Sampling and retention

- **Audit logs** (ingress, exit, call, retry, outcome): all, full window, non-PII fields of §1.
- **Debug logs** (bodies, headers, dumps): off by default, per `service`/`bot_id`, bounded; sample (e.g. 1/100 busy chats), shortest retention, then drop.
- **Busy chats:** sample on salted `chat_id` hash, not raw id — deterministic, private. Never sample errors: keep `outcome != ok` at full rate.
- **PII minimization:** rotating salt, omit unqueried fields, drop bodies at encoder. Aggregates outlive raw logs; sampling affects debug only.

## 7. Per-library logging hooks

Use the framework's hook; inject `correlation_id` into PTB `context`, aiogram `data`, grammY/Telegraf `ctx`, teloxide spans.

| Library | Hook | Citation |
|---|---|---|
| python-telegram-bot | `logging.basicConfig(format=..., level=INFO)`; `httpx`→`WARNING`; error handler logs `exc_info`. | `python-telegram-bot/examples/echobot.py:24-28`, `python-telegram-bot/examples/errorhandlerbot.py:30-33` |
| aiogram | Named loggers (`dispatcher`,`event`,`middlewares`); `RequestLogging` logs calls; `ErrorsMiddleware` propagates. | `aiogram/aiogram/loggers.py:3-7`, `aiogram/aiogram/client/session/middlewares/request_logging.py:31-36`, `aiogram/aiogram/dispatcher/middlewares/error.py:30-38` |
| grammY | `bot.api.config.use(...)` transformer wraps calls; `bot.catch(...)` logs `err.ctx.update.update_id`. | `grammY/src/core/api.ts:92`, `grammY/src/bot.ts:382`, `grammY/src/bot.ts:195-199,537-538` |
| Telegraf | `bot.catch((err,ctx)=>...)` overrides `handleError`; `debug` logs `update_id`. | `telegraf/src/telegraf.ts:194-196`, `telegraf/src/telegraf.ts:356,372` |
| teloxide | `pretty_env_logger::init()`/`tracing_subscriber`; `instrument_with` attaches a `tracing::Span`. | `teloxide/crates/teloxide/examples/command.rs:5`, `teloxide/crates/teloxide/src/dispatching/tracing.rs:9,13` |

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/api/methods/getme
- https://core.telegram.org/bots/api/types/webhookinfo
- https://core.telegram.org/bots/webhooks
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/examples/echobot.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/loggers.py
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/bot.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/telegraf.ts
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/dispatching/tracing.rs
