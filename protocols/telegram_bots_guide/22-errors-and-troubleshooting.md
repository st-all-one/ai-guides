# 22 - Errors and troubleshooting

Debug from the outside in: first the HTTP/transport layer, then the API
envelope, then update delivery, then your handler. Most "bot is broken" reports
are one of four things: bad token, wrong transport mode, TLS/route failure, or
flood control.

## 1. The API envelope

Every Bot API response is JSON with a Boolean `ok`. Success puts the value in
`result`; failure sets `ok:false`, puts a human-readable reason in
`description`, and usually an `error_code`. Some failures add
`ResponseParameters`, which is the only part of an error you should branch on
automatically (`bots/api.md:29`).

`ResponseParameters` has two fields: `migrate_to_chat_id` (a group became a
supergroup; 52-bit safe, use 64-bit or double) and `retry_after` (seconds to
wait before repeating) (`bots/api/types/responseparameters.md:9-10`). Treat
`error_code` as diagnostic text, not a stable contract (`bots/api.md:29`).

## 2. Failure classes

| Class | Typical cause | Action |
|---|---|---|
| Transport failure | DNS/TLS/timeout, wrong base URL | check host, certificate chain, port |
| `401`-style auth error | invalid or revoked token | re-read secret store, reissue with BotFather |
| `400`-style bad request | malformed JSON, bad parse mode, oversized file | read `description` literally; fix parameter |
| Forbidden / not found | bot not admin, user blocked bot, wrong chat id | check membership and permissions |
| `429` | flood control exceeded | sleep `retry_after` + jitter, serialize per chat |
| `5xx`-style server error | upstream/local server problem | retry with bounded backoff; inspect local logs |

The docs explicitly warn about 429 for more than roughly one message per second
in one chat (`bots/faq.md:124`) and for bulk notification above about 30 users
per second (`bots/faq.md:134`). They do not publish a stable 5xx contract; do
not invent one.

## 3. Symptom → cause → action

| Symptom | Likely cause | First action |
|---|---|---|
| `getMe` returns `ok:false` | bad token or revoked token | verify token source, call BotFather |
| `getUpdates` returns an error | a webhook is configured | `getWebhookInfo`, then `deleteWebhook` |
| No updates at all | wrong `allowed_updates`, stale `offset` | check filter, reset offset carefully |
| Same update processed repeatedly | offset not advanced or webhook retried | dedupe on `update_id` |
| `pending_update_count` grows | webhook slow/unreachable | inspect route, TLS, workers |
| `last_error_message` set | Telegram failed delivery | check cert chain, CN/SAN, intermediates |
| 429 storm | loops, broadcasts, retries without backoff | token bucket, `retry_after`, jitter |
| "Message is too long" | text > API limit | split into chunks, respect parse mode |
| "File too big" | public upload cap | URL 5/20 MB, multipart 10/50 MB, or local server |
| "Chat not found" | stale id or migration | use `migrate_to_chat_id` when present |
| Callback query errors | callback not answered in time | call `answerCallbackQuery` first |

Public upload limits are 5 MB (photos) / 20 MB (other) by URL and 10 MB /
50 MB by multipart (`bots/api.md:112-113`). A local Bot API server changes the
ceiling to 2 GB uploads (`bots/api.md:44-45`).

## 4. Webhook diagnosis

Start with `getWebhookInfo`. An empty `url` means no webhook is set; a non-empty
one means `getUpdates` cannot work (`bots/api/methods/getwebhookinfo.md:5`,
`bots/api/methods/getupdates.md:17`). Check `has_custom_certificate`,
`pending_update_count`, `last_error_date`, `last_error_message`,
`ip_address`, `max_connections`, and `allowed_updates`
(`bots/api/types/webhookinfo.md:9-17`).

Then verify the transport contract: only ports 443/80/88/8443, TLS 1.2 or
newer, no SSLv2/3/TLS1.0/1.1, and CN or SAN matching the webhook domain
(`bots/webhooks.md:24-29,43,52,56,60`). Self-signed certificates need the
certificate supplied when setting the webhook; verified certificates may need
intermediates (`bots/webhooks.md:63-78`).

If you allowlisted Telegram's subnets, re-check the two ranges in the docs —
Telegram says they can change (`bots/webhooks.md:24-32`). A working endpoint
that suddenly stops reacting is often a stale allowlist, not a bot bug.

## 5. Polling diagnosis

`getUpdates` returns updates starting at the earliest unconfirmed one. An
update is confirmed only when a call uses `offset > update_id`
(`bots/api/methods/getupdates.md:9`). Recompute offset after **every** response;
a fixed offset is the classic duplicate loop (`bots/api/methods/getupdates.md:18`).

`limit` accepts 1–100 and defaults to 100; `timeout` defaults to 0, which is
short polling and intended for testing (`bots/api/methods/getupdates.md:10-11`).
A positive timeout is required for a real polling loop. `allowed_updates`
filters only updates created after the call that sets it, so unwanted types
can still arrive briefly (`bots/api/methods/getupdates.md:12-14`).

Updates are retained no longer than 24 hours (`bots/api.md:59`). A poller that
has been down longer than that cannot recover them; alert on downtime rather
than assuming replay will fix it.

## 6. Debugging sequence

1. `getMe` — token and reachability.
2. `getWebhookInfo` — which transport is actually active.
3. Replay an official fake update locally (`bots/webhooks.md:494-520`).
4. Check one failing outbound call: status, `description`, `parameters`.
5. Inspect logs for duplicate `update_id` and 429 timing.
6. Only then change code. Most incidents are configuration drift. Keep the
   failing `update_id`, request id and raw redacted error body together; that
   triple makes the next incident reproducible instead of anecdotal.

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/faq.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/api/types/responseparameters.md
- https://core.telegram.org/bots/api/types/webhookinfo.md
- https://core.telegram.org/bots/api/methods/getme.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/getwebhookinfo.md
