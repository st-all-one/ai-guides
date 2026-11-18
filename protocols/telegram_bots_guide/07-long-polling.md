# 07 - Long Polling

## Loop mechanics

`getUpdates` is the long-polling transport: it returns an array of `Update` objects and is mutually exclusive with an outgoing webhook (`bots/api/methods/getupdates.md:5`; `bots/api/methods/getupdates.md:17`). A correct loop has four settings. `offset` is the identifier of the first update to return and must be one greater than the highest `update_id` already handled (`bots/api/methods/getupdates.md:9`). `limit` bounds each response to 1-100 updates and defaults to 100 (`bots/api/methods/getupdates.md:10`). `timeout` enables long polling when positive and defaults to 0, i.e. short polling intended only for testing (`bots/api/methods/getupdates.md:11`). `allowed_updates` selects the update types and, when omitted, reuses the previous setting (`bots/api/methods/getupdates.md:12`). Updates are stored server-side but never longer than 24 hours, so a stopped bot can safely resume within that window and not beyond it (`bots/api.md:59`).

```python
offset = store.load("update_id", default=0)
while running:
    try:
        batch = api("getUpdates", offset=offset, limit=100, timeout=30,
                    allowed_updates=["message", "callback_query"])
    except TransportError:
        backoff_sleep(); continue          # offset unchanged: same batch returns
    for upd in batch:
        if upd["update_id"] < offset:      # duplicate after a lost acknowledgement
            continue
        process(upd)                       # idempotent, keyed by update_id
        store.save("update_id", upd["update_id"] + 1)
        offset = upd["update_id"] + 1
```

## Offset is the commit point

The API confirms an update only when a later call arrives with a higher `offset` (`bots/api/methods/getupdates.md:9`). That makes delivery at-least-once: if the process crashes after handling an update but before persisting the new offset, the same `update_id` is returned again. The docs state this directly and require recalculating the offset after every response to avoid duplicates (`bots/api/methods/getupdates.md:18`). Persist the offset only after the update has been fully processed and any side effects committed; do not advance it on a merely received batch. A negative offset is a diagnostic tool that selects updates from the end of the queue and forgets everything before them, so it should never appear in production code (`bots/api/methods/getupdates.md:9`). `update_id` itself grows sequentially and may be chosen randomly after at least a week without updates, so treat it as an opaque increasing token rather than a timestamp (`bots/api/types/update.md:10`).

## Network errors, 429 and 502

A failed or timed-out `getUpdates` call has not acknowledged anything, so the safe reaction is to keep the offset and retry with bounded, jittered backoff; the same batch will be returned. Flood-control responses carry `retry_after` in `ResponseParameters`, and the value is the authoritative wait (`bots/api/types/responseparameters.md:10`; `bots/api.md:29`). A 502 Bad Gateway reply from a proxy is a transport status, not a documented Bot API error code in this snapshot (`not verified`); treat it like any other transient non-2XX response and retry without changing the offset. A local Bot API server has its own warm-up behaviour: `close` returns 429 during the first ten minutes after launch (`bots/api/methods/close.md:5`). Avoid tight retry loops, which compound floods; the guidance to use retry policies rather than hardcoded limits applies here as much as to outgoing messages (`bots/features.md:968`). If an update is answered inside the polling process, remember that this transport has no equivalent of the webhook-response `method` shortcut, whose result is unobservable (`bots/api.md:36`).

## Local Bot API server tradeoffs

A local server is built from the open-source `telegram-bot-api` project and receives requests at a local URL instead of `https://api.telegram.org` (`bots/api.md:42`; `bots/features.md:1016`). Its documented gains are unlimited downloads, 2000 MB uploads, HTTP webhooks on any port and up to 100000 connections (`bots/api.md:44`; `bots/api.md:45`; `bots/api.md:47`; `bots/api.md:49`; `bots/api.md:50`). The cost is operational: call `logOut` before redirecting traffic to the local instance, or updates may not arrive, and a cloud re-login is blocked for ten minutes (`bots/api/methods/logout.md:5`). Moving between local servers requires `close` after deleting the webhook (`bots/api/methods/close.md:5`). Because a local instance accepts HTTP, remote HTTPS clients need a TLS-terminating proxy (`bots/features.md:1020`). Most bots are fine on the default cloud servers (`bots/api.md:55`).

## Containers and backpressure

Run exactly one poller per bot identity. Two processes sharing a token and offset store will race: both can fetch the same batch, and a stale write can move the offset backwards. In containers, put the offset in a durable volume or external store rather than the image layer, and lower `limit` when workers are slow (`bots/api/methods/getupdates.md:10`). A positive `timeout` reduces busy looping (`bots/api/methods/getupdates.md:11`). Bound the processing queue: if workers fall behind, stop fetching and let Telegram retain updates for the rest of the 24-hour window (`bots/api.md:59`). Scale by splitting distinct bots into distinct processes, never by multiplying pollers for one bot.

## Graceful shutdown

On SIGTERM, stop initiating new `getUpdates` calls, drain the in-flight batch, persist each `update_id + 1` only after its work commits, and exit (`bots/api/methods/getupdates.md:9`). There is no explicit "release" call: the next process simply resumes from the stored offset, and any unacknowledged updates are redelivered (`bots/api/methods/getupdates.md:18`). Because updates are retained for at most 24 hours, a deployment outage longer than that loses events permanently (`bots/api.md:59`). Keep shutdown paths idempotent and avoid acknowledging on cancellation: a half-processed update should be replayed, not skipped.

## When polling beats webhooks

Choose polling when the bot runs behind NAT without a public HTTPS endpoint, during local development, in single-process deployments, or when the operational surface of certificates and reverse proxies is not justified (`bots/webhooks.md:167`). It also avoids the webhook retry behaviour in which Telegram repeats any non-`2XY` delivery and eventually gives up (`bots/api/methods/setwebhook.md:5`). Choose webhooks for low latency, high fan-out and platform-managed hosting, where Telegram connects to the bot instead (`bots/webhooks.md:167`; `bots/serverless.md:1083`). Switching between the two is a deployment operation: `deleteWebhook` removes the integration so polling can resume, and `setWebhook` takes it back (`bots/api/methods/deletewebhook.md:5`; `bots/api/methods/setwebhook.md:21`).

## Sources

- https://core.telegram.org/bots/api/methods/getupdates
- https://core.telegram.org/bots/api/methods/deletewebhook
- https://core.telegram.org/bots/api/types/update
- https://core.telegram.org/bots/api/types/responseparameters
- https://core.telegram.org/bots/api/methods/logout
- https://core.telegram.org/bots/api/methods/close
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/webhooks
