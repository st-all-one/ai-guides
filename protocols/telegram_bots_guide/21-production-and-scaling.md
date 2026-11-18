# 21 - Production and scaling

Scaling a Telegram bot is mostly an idempotency and state problem, not a
framework problem. Telegram delivers each update at least once, keeps it for at
most 24 hours, and expects your webhook to accept delivery
(`bots/api.md:59`). Everything else follows from those three facts.

## 1. Make handlers stateless

A handler should be able to run on any replica. Keep conversation state,
dedupe keys, rate-limit counters and pending jobs in an external store (Redis
or a database), keyed by `(bot_id, chat_id, user_id)` where relevant. An
in-memory FSM is fine for a single-process demo and wrong for replicas.

The dedupe key should be `update_id`; it is the only platform identifier that
distinguishes one delivery from its retry. Store it with a short TTL, long
enough to cover redelivery, short enough to avoid unbounded growth. Without
this, a webhook retry or a polling restart repeats side effects.

## 2. Choose the delivery topology deliberately

**Single process, long polling:** simplest; no public endpoint. Good for
internal tools and low volume. `getUpdates` requires a positive `timeout` for
real long polling and accepts 1–100 updates per call
(`bots/api/methods/getupdates.md:10-11`).

**Webhook behind a load balancer:** preferred for user-facing bots. Telegram
POSTs to a fixed URL; your balancer fans out to workers. The public API only
uses ports 443/80/88/8443 and two documented source subnets
(`bots/webhooks.md:24-29,43,45`). Restrict ingress to those subnets if you
want, but re-read the doc when traffic breaks — the range can change
(`bots/webhooks.md:32`).

**Local Bot API server:** add it only for 2 GB uploads, HTTP webhooks, arbitrary
ports, or `max_webhook_connections` up to 100000
(`bots/api.md:40-55`). It is another service to secure, patch and monitor.

## 3. Acknowledge fast, process asynchronously

Webhook delivery and handler work should be decoupled. Validate the
`secret_token`, parse the JSON, enqueue the `update_id`, and return 2xx. Run
slow work (LLM calls, database writes, media processing) in a worker. This
keeps `pending_update_count` from growing; that counter is visible through
`getWebhookInfo` (`bots/api/types/webhookinfo.md:11`).

If you process inline, bound concurrency. A queue with a fixed number of
workers gives you backpressure; an unbounded task set gives you timeouts and
duplicate deliveries. Preserve per-chat ordering where it matters by hashing
the chat id to a worker or by using an ordered per-chat queue. Global ordering
is neither offered nor usually needed.

## 4. Budget for flood control

Telegram advises no more than roughly one message per second in a single chat
and allows only short bursts before 429s appear (`bots/faq.md:124`). Bulk
notifications are capped around 30 users per second (`bots/faq.md:134`). Design
broadcasts as scheduled jobs with a token bucket, not as a loop.

Per-chat serialization is the cheapest protection: one outbound worker per
chat, with `retry_after` applied before the next send. Across chats, a global
budget still matters because limits are enforced on the bot as a whole. On 429,
stop, sleep `retry_after` plus jitter, and retry only the failed call — never
restart the whole batch.

## 5. Run multiple replicas safely

- All replicas share one webhook URL; Telegram does not shard by replica.
- Dedupe on `update_id` before side effects; see section 1.
- `max_connections` is the platform-side ceiling on simultaneous HTTPS
  connections (`bots/api/types/webhookinfo.md:16`); it is not your worker
  count and does not replace a queue.
- Keep library persistence layers (PTB `Persistence`, aiogram storage,
  grammY sessions, teloxide dialogue storage) backed by the same external
  store if replicas must share state.
- Do not run a poller and a webhook at the same time; `getUpdates` fails while
  a webhook is configured (`bots/api/methods/getupdates.md:17`).

## 6. Rollout and shutdown

Rotate a webhook with `setWebhook` to the new URL, verify `getWebhookInfo`
shows it and `pending_update_count` drains, then remove the old route. For a
rollback, point the webhook back before deleting the old deployment. `ip_address`
in `WebhookInfo` tells you which address Telegram currently resolves
(`bots/api/types/webhookinfo.md:12`).

On shutdown, stop accepting new updates first, drain the queue, then close the
API client. A process that exits while holding updates loses them only after
the 24-hour retention window; before that they can still be redelivered, which
is exactly why dedupe must be in place.

## 7. Capacity checklist

| Concern | Minimum answer |
|---|---|
| Duplicate delivery | `update_id` dedupe with TTL |
| Slow handlers | queue + bounded workers, 2xx before work |
| Per-chat ordering | hashed worker or ordered queue |
| Broadcasts | token bucket, ~1/s per chat, scheduled windows |
| Replica state | Redis/DB, never process memory |
| Webhook ingress | TLS 1.2+, allowed ports, source subnets |
| Backlog signal | `pending_update_count` from `getWebhookInfo` |
| File limits | local server only if 50 MB path is insufficient |

## 8. Rollout runbook

```bash
API="https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN"
curl -sS -X POST "$API/setWebhook" -H 'Content-Type: application/json' \
  -d '{"url":"https://bot.example.com/telegram",
       "secret_token":"replace-with-secret",
       "max_connections":40,
       "allowed_updates":["message","callback_query"]}'
curl -sS "$API/getWebhookInfo"
```

`setWebhook` accepts the URL, a secret token, connection ceiling and update
filter (`bots/api/methods/setwebhook.md`). Verify the response from
`getWebhookInfo` before traffic: `url` must match, `has_custom_certificate`
must reflect your setup, and pending updates must drain
(`bots/api/types/webhookinfo.md:9-11,16-17`).

To fall back to polling, call `deleteWebhook`, then start a single poller.
Never leave both paths live; the API will reject `getUpdates` while a webhook
exists (`bots/api/methods/getupdates.md:17`).

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/faq.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/getwebhookinfo.md
- https://core.telegram.org/bots/api/types/webhookinfo.md
- https://core.telegram.org/bots/api/methods/setwebhook.md
