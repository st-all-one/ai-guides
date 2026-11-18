# 06 - Webhooks and Deployment

## Establishing the webhook

`setWebhook` registers an outgoing HTTPS POST URL; Telegram sends a JSON-serialized `Update` in the body and returns `True` on success (`bots/api/methods/setwebhook.md:5`). Any non-`2XY` response is retried and eventually abandoned after a reasonable number of attempts, so the endpoint should acknowledge quickly and queue work (`bots/api/methods/setwebhook.md:5`). A webhook and `getUpdates` are mutually exclusive: while it is set, polling cannot receive updates (`bots/api/methods/setwebhook.md:21`; `bots/api/methods/getupdates.md:17`). Both certificate types use the same method; a trusted verified certificate needs only the URL, while a self-signed one adds an `InputFile` certificate (`bots/webhooks.md:416`; `bots/webhooks.md:419`; `bots/webhooks.md:424`). Clearing an integration is a call with an empty `url`, after which polling can resume (`bots/api/methods/setwebhook.md:11`; `bots/webhooks.md:431`).

| Parameter | Deployment relevance |
|---|---|
| `url` | HTTPS endpoint; empty string removes the webhook (`bots/api/methods/setwebhook.md:11`) |
| `certificate` | Public-key PEM `InputFile` for self-signed or untrusted-root setups (`bots/api/methods/setwebhook.md:12`) |
| `ip_address` | Fixed source IP instead of DNS-resolved one (`bots/api/methods/setwebhook.md:13`) |
| `max_connections` | 1-100 simultaneous connections, default 40 (`bots/api/methods/setwebhook.md:14`) |
| `allowed_updates` | Update-type filter, not retroactive (`bots/api/methods/setwebhook.md:15`; `bots/api/methods/setwebhook.md:16`) |
| `drop_pending_updates` | Discard queued updates on registration (`bots/api/methods/setwebhook.md:17`) |
| `secret_token` | 1-256 character header secret (`bots/api/methods/setwebhook.md:18`) |

## Certificates and network prerequisites

The server must answer on IPv4 at ports 443, 80, 88 or 8443, speak TLS 1.2 or better, and present a certificate whose CN or SAN matches the configured host (`bots/webhooks.md:25`; `bots/webhooks.md:26`; `bots/api/methods/setwebhook.md:23`; `bots/webhooks.md:60`). If traffic is restricted by firewall, allow the documented subnets `149.154.160.0/20` and `91.108.4.0/22` and revisit them periodically because they may change (`bots/webhooks.md:25`; `bots/webhooks.md:29`). Verified chains require a trusted root and any intermediate certificates to be served (`bots/webhooks.md:68`; `bots/webhooks.md:77`). Self-signed PEM files must contain only the public key, with BEGIN and END markers, and can be generated with the documented OpenSSL invocation (`bots/self-signed.md:3`; `bots/self-signed.md:11`). Untrusted commercial roots can be supplied exactly like a self-signed certificate (`bots/webhooks.md:438`; `bots/webhooks.md:442`). A local Bot API server relaxes these rules to HTTP URLs, arbitrary local IPs, arbitrary ports and up to 100000 connections, but then TLS termination is the operator's responsibility (`bots/api.md:47`; `bots/api.md:48`; `bots/api.md:49`; `bots/api.md:50`; `bots/features.md:1020`).

## Reverse proxies and serverless platforms

Put the application behind a TLS-terminating reverse proxy when it runs on a high port or in a container; configure the proxy to forward the original client address and to preserve the incoming secret header, and verify that the public host matches the certificate rather than the internal one (`bots/webhooks.md:60`; `bots/api/methods/setwebhook.md:7`). `max_connections` should be set from measured capacity: lower values protect a small server, higher values raise throughput (`bots/api/methods/setwebhook.md:14`). On Telegram's own serverless platform the webhook is not pointed by hand at all: the platform manages it, and `npx tgcloud webhook` reports the URL, `allowed_updates`, pending count and last delivery error (`bots/serverless.md:1083`). Deploying or removing a handler can leave the webhook out of sync, and `npx tgcloud webhook sync` rebuilds `allowed_updates` from deployed handlers; `--drop-pending` discards updates queued before the sync (`bots/serverless.md:1085`; `bots/serverless.md:1087`). In that environment the `{ ok: true, result: … }` envelope is unwrapped by the SDK, `BotApiError` is thrown on failure, and the outbound HTTP response cap is 30 MB (`bots/serverless.md:775`; `bots/serverless.md:777`; `bots/serverless.md:868`).

## Health, readiness and verification

Readiness is a compound check: the HTTPS listener answers on the registered host, the secret header is configured, and `getWebhookInfo` reports the expected URL (`bots/api/methods/getwebhookinfo.md:5`). That method returns a `WebhookInfo` object; if the bot is still polling, the `url` field is empty, which makes it a reliable way to detect a failed or cleared registration (`bots/api/methods/getwebhookinfo.md:5`). Include `allowed_updates` and the pending count in the same dashboard where the platform exposes them (`bots/serverless.md:1083`). Keep 2XX responses fast, because non-2XX responses cause Telegram to retry and eventually give up (`bots/api/methods/setwebhook.md:5`). Calls back into the Bot API can be made in the webhook response by naming the method in the `method` parameter, but their result cannot be observed, so they are unsuitable for critical writes (`bots/api.md:36`).

```bash
# register, then verify
curl -F "url=https://bot.example.org/hook" \
     -F "secret_token=$SECRET" \
     -F "max_connections=40" \
     -F "allowed_updates=[\"message\",\"callback_query\"]" \
     https://api.telegram.org/bot"$TOKEN"/setWebhook
curl -s https://api.telegram.org/bot"$TOKEN"/getWebhookInfo
```

## Rotation and rollback

Update the secret in the secret store first, then call `setWebhook` with the new `secret_token` and confirm with `getWebhookInfo`; because a webhook has no version field, rollback is a re-registration with the previous parameters (`bots/api/methods/setwebhook.md:18`; `bots/api/methods/getwebhookinfo.md:5`). Certificate renewal follows the same pattern: re-upload the new public-key PEM as `certificate`, since self-signed files must be supplied as an `InputFile` (`bots/self-signed.md:3`; `bots/api/methods/setwebhook.md:22`). During a deploy, register the new endpoint before draining the old one, and set `drop_pending_updates` only when stale updates would be harmful — queued updates otherwise survive for at most 24 hours (`bots/api/methods/setwebhook.md:17`; `bots/api.md:59`). For a full rollback to polling, call `deleteWebhook`, optionally with `drop_pending_updates`, then start the `getUpdates` loop (`bots/api/methods/deletewebhook.md:5`; `bots/api/methods/deletewebhook.md:9`). The same empty-`url` call clears the registration without changing any other bot state (`bots/api/methods/setwebhook.md:11`).

## Sources

- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/api/methods/deletewebhook
- https://core.telegram.org/bots/api/methods/getwebhookinfo
- https://core.telegram.org/bots/webhooks
- https://core.telegram.org/bots/self-signed
- https://core.telegram.org/bots/serverless
- https://core.telegram.org/bots/api
