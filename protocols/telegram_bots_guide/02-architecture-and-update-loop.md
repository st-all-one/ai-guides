# 02 - Architecture and Update Loop

## The Update object

Every inbound event is a JSON-serialized `Update` object, regardless of transport (`bots/api.md:61`). It represents one incoming update, and at most one of its optional payload fields is present at a time (`bots/api/types/update.md:5`; `bots/api/types/update.md:6`). The mandatory `update_id` is a positive integer that increases sequentially; it is the mechanism for ignoring repeated updates and restoring sequence after out-of-order delivery, and after a gap of at least a week the next identifier is chosen randomly instead (`bots/api/types/update.md:10`). Common payload fields are `message`, `edited_message`, `channel_post`, `edited_channel_post`, `inline_query`, `chosen_inline_result`, `callback_query` and `poll_answer` (`bots/api/types/update.md:11`; `bots/api/types/update.md:12`; `bots/api/types/update.md:13`; `bots/api/types/update.md:14`; `bots/api/types/update.md:22`; `bots/api/types/update.md:23`; `bots/api/types/update.md:24`; `bots/api/types/update.md:31`). Newer categories include `business_message`, `guest_message`, `message_reaction` and `widget_query` (`bots/api/types/update.md:16`; `bots/api/types/update.md:19`; `bots/api/types/update.md:20`; `bots/api/types/update.md:25`). Several fields require extra setup: `message_reaction` and `chat_member` need administrator rights and an explicit entry in `allowed_updates`, and reaction-count updates are grouped and may arrive minutes late (`bots/api/types/update.md:20`; `bots/api/types/update.md:21`; `bots/api/types/update.md:33`).

## Two mutually exclusive transports

`getUpdates` and webhooks are alternatives, not complements; updates are queued server-side until delivered by either route but are not kept longer than 24 hours (`bots/api.md:59`). `getUpdates` receives them by long polling (`bots/api.md:65`), `setWebhook` registers an outgoing HTTPS POST URL (`bots/api.md:66`), `deleteWebhook` switches back (`bots/api.md:67`), and `getWebhookInfo` reports current status (`bots/api.md:68`). The exclusivity is enforced: `getUpdates` refuses to work while a webhook is configured, and updates cannot be received by polling for as long as one is set (`bots/api/methods/getupdates.md:17`; `bots/api/methods/setwebhook.md:21`). The difference is who opens the connection: the bot polls Telegram, or Telegram connects to the bot's server (`bots/webhooks.md:167`).

## Acknowledgement with offset

`getUpdates` returns an array of updates (`bots/api/methods/getupdates.md:5`). Its `offset` parameter is the identifier of the first update to return and must be one greater than the highest `update_id` already processed; an update is confirmed as soon as `getUpdates` is called with an `offset` above its identifier, and a negative offset selects updates counted from the end of the queue, forgetting earlier ones (`bots/api/methods/getupdates.md:9`). Concretely, after processing `update_id = 41` with `limit = 100` and no potential duplicates, the next call sends `offset = 42`. `limit` accepts 1-100 and defaults to 100; `timeout` defaults to 0 (short polling) and should be positive in production (`bots/api/methods/getupdates.md:10`; `bots/api/methods/getupdates.md:11`). The docs warn that to avoid duplicates the offset must be recalculated after every server response (`bots/api/methods/getupdates.md:18`). A webhook flow has no offset, but `update_id` still lets a consumer skip repeats and reorder bursts (`bots/api/types/update.md:10`).

## Filtering with allowed_updates

Both transports take `allowed_updates`, a JSON list of the update types to receive (`bots/api/methods/getupdates.md:12`; `bots/api/methods/setwebhook.md:15`). An empty list means every type except `chat_member`, `message_reaction` and `message_reaction_count` — that is the default — and omitting the parameter reuses the previous setting (`bots/api/methods/getupdates.md:12`). Filtering is not retroactive: updates created before the call may still be delivered for a short period (`bots/api/methods/getupdates.md:14`; `bots/api/methods/setwebhook.md:16`). On the webhook side this same list is what a platform keeps "in sync" with deployed handlers, and syncing can optionally discard queued updates (`bots/serverless.md:1083`; `bots/serverless.md:1087`).

```python
offset = 0
while True:
    batch = api("getUpdates", offset=offset, timeout=30,
                allowed_updates=["message", "callback_query"])
    for upd in batch:
        handle(upd)                 # idempotent: keyed by upd["update_id"]
        offset = max(offset, upd["update_id"] + 1)
```

## Delivery semantics, duplicates and order

Telegram retries a webhook request when the response status is not `2XY`, giving up after a reasonable number of attempts (`bots/api/methods/setwebhook.md:5`). Therefore a handler may see the same `update_id` more than once, especially if it performs slow work before acknowledging; return a fast 2XX and process asynchronously. `update_id` increases sequentially, but nothing promises strict in-order callback execution once work is parallelized, so restore order with the identifier where it matters (`bots/api/types/update.md:10`). Idempotency should be keyed on `update_id` for dispatch and on the nested query identifier for answers: `callback_query_id` is the unique key for `answerCallbackQuery`, whose answer is a notification or alert shown to the user (`bots/api/methods/answercallbackquery.md:5`; `bots/api/methods/answercallbackquery.md:11`). Repeated calls with the same key must be harmless.

## Decision matrix

| Concern | getUpdates | Webhook | Doc basis |
|---|---|---|---|
| Connection direction | Bot polls Telegram | Telegram POSTs to bot | `bots/webhooks.md:167` |
| Retention ceiling | 24 h queue | 24 h queue | `bots/api.md:59` |
| Transport security | HTTPS outbound | HTTPS inbound, TLS 1.2+ | `bots/api.md:18`; `bots/webhooks.md:26` |
| Port constraints | none | 443, 80, 88, 8443 | `bots/api/methods/setwebhook.md:23` |
| Concurrency control | `limit`, `timeout` | `max_connections` 1-100 | `bots/api/methods/getupdates.md:10`; `bots/api/methods/setwebhook.md:14` |
| Inbound authentication | token in URL | token plus secret header | `bots/api.md:14`; `bots/api/methods/setwebhook.md:7` |
| Local server | works | HTTP URL allowed | `bots/api.md:47` |

Choose polling for isolated development, NAT-bound hosts and simple single-process bots; choose webhooks for latency-sensitive bots and horizontally scaled services, accepting the TLS and public-endpoint obligations documented above.

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api/types/update
- https://core.telegram.org/bots/api/methods/getupdates
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/webhooks
- https://core.telegram.org/bots/api/methods/answercallbackquery
