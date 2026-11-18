# 20 - Observability and testing

Telegram does not publish a metrics endpoint for a bot. What you can observe is
the API's own replies, webhook state, your handler pipeline, and the logs of a
self-hosted Bot API server if you run one. Treat those as the available signals,
not as a substitute for application instrumentation.

## 1. What the platform exposes

`getMe` is the cheapest liveness probe: it needs no parameters and returns the
bot's own identity (`bots/api/methods/getme.md`). It proves the token is valid
and the API is reachable, nothing about your handlers.

`getWebhookInfo` is the webhook health endpoint. It returns `url`,
`has_custom_certificate`, `pending_update_count`, and optional
`last_error_date`, `last_error_message`, `last_synchronization_error_date`,
`ip_address`, `max_connections`, `allowed_updates`
(`bots/api/types/webhookinfo.md:6-15`). A non-empty `url` while your process
uses `getUpdates` is a configuration bug; a rising `pending_update_count` is
delivery backpressure (`bots/api/methods/getwebhookinfo.md:5`).

There is no per-method latency histogram, no queue-depth metric for the public
API, and no delivery receipt beyond the HTTP status of your webhook. Emit your
own counters for updates received, updates handled, API methods called, 429s,
and handler failures.

## 2. Logging contract

Log `update_id`, update type, chat id, method name, HTTP status, `retry_after`,
and a request/correlation id. Never log the bot token, `secret_token`, full
authorization headers, or raw Web App `init_data` — those are credentials.

Callback data is user-controlled and often carries state; truncate it in logs.
The API error body is safe to log after redaction: `ok:false` carries
`description`, `error_code` and sometimes `ResponseParameters`
(`bots/api.md:29`). Keep `error_code` as diagnostic only, since its contents
may change (`bots/api.md:29`).

A useful split: one structured line on update ingress, one on handler exit,
one on each outbound API call with status and latency, and one on retry. Avoid
logging message bodies by default; they are user content.

## 3. Readiness and liveness

Liveness: can the process answer its own HTTP health route? Readiness for a
webhook bot additionally requires a reachable HTTPS endpoint and a matching
`setWebhook` URL. The public API accepts webhooks only on 443, 80, 88 or 8443,
requires TLS 1.2+, and accepts POSTs from two documented subnets
(`bots/webhooks.md:24-29,43,52,56`). A pod that is alive but not reachable on
one of those ports is not ready.

For polling bots, readiness is the ability to call `getUpdates` with a positive
`timeout`; short polling is for testing only
(`bots/api/methods/getupdates.md:11`). Do not mark ready until the first
successful long-poll cycle has completed.

If you restrict inbound traffic to Telegram's subnets, re-read the webhook
documentation on every incident: Telegram warns the range can change
(`bots/webhooks.md:32`).

## 4. Fake updates from the official docs

The webhook guide ships example update payloads for exactly this purpose
(`bots/webhooks.md:494-496`). A local test can POST one to your handler without
a bot token:

```bash
curl -v -k -X POST -H 'Content-Type: application/json' \
  -H 'Cache-Control: no-cache' \
  -d '{"update_id":10000,"message":{"date":1441645532,
        "chat":{"id":1111111,"type":"private","first_name":"Test"},
        "message_id":1365,"from":{"id":1111111,"is_bot":false,
        "first_name":"Test"},"text":"/start"}}' \
  https://localhost:8443/telegram
```

The `-k` flag is for the local self-signed test only; public webhooks need a
real verification chain (`bots/webhooks.md:494-520`, `bots/webhooks.md:56-60`).
Replay the same `update_id` twice: a correct handler is idempotent or dedupes.

## 5. Test layers

- **Unit:** feed typed/generated `Update` objects into one handler with a fake
  API client. Assert the outbound method name and parameters.
- **Contract:** replay the official example updates through the real
  deserializer of your pinned library. This catches field renames across API
  versions.
- **Integration:** use a dedicated bot token from BotFather in a private chat.
  Never point tests at a production token.
- **Transport:** for webhooks, verify TLS version, CN/SAN, intermediate chain,
  and `secret_token` rejection; for polling, verify `offset` advance and that a
  restart does not replay old updates.
- **Load:** generate events through your own queue, not by spamming Telegram.
  Public flood limits return 429 and may throttle the whole bot
  (`bots/faq.md:124,134`).

## 6. Failure signals to alert on

| Signal | Likely meaning | First check |
|---|---|---|
| Rising `pending_update_count` | handler or webhook slower than delivery | `getWebhookInfo`, worker saturation |
| `last_error_message` changes | TLS/DNS/route problem at Telegram side | certificate chain and port |
| Repeated 429 | burst or broadcast abuse | per-chat serialization, `retry_after` |
| Duplicate effects | `offset` not advanced or webhook retried | dedupe key on `update_id` |
| `ok:false` on `getMe` | bad token or API outage | secret store, status |

## 7. Minimal instrumentation checklist

Export at least these series from the bot process itself: `updates_received`
by type, `updates_handled` by outcome, `api_calls` by method and status,
`api_retry_after_seconds`, `handler_duration_seconds`, and
`dedupe_conflicts_total`. Add `webhook_pending_updates` by polling
`getWebhookInfo` on a slow interval; it is the only platform-side backlog
signal available (`bots/api/types/webhookinfo.md:11`).

Use histograms for latency, not averages. Alert on sustained
`pending_update_count` growth, on any `last_error_message` that persists past
one scrape, and on a 429 rate that does not decay after backoff. Keep raw logs
short-lived and redacted; keep aggregates longer. A bot with no metrics is a
bot that discovers outages through user complaints.

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/api/methods/getme.md
- https://core.telegram.org/bots/api/methods/getwebhookinfo.md
- https://core.telegram.org/bots/api/types/webhookinfo.md
- https://core.telegram.org/bots/faq.md
