# 19 - Local Bot API Server

## What a local server changes

Telegram publishes the Bot API server source at `tdlib/telegram-bot-api` and permits pointing requests at your own instance instead of `https://api.telegram.org` (`bots/api.md:40-42`). That implementation is C++ and lies outside this guide's pinned Python/JavaScript/Rust source scope, so the behavior below is cited from the official docs only. Relative to the cloud API, a local server can download files with no size limit, upload up to 2000 MB, upload by local path or `file://` URI, use an HTTP webhook URL, use any local IP and any port, raise `max_webhook_connections` to 100000, and return an absolute local `file_path` from `getFile` without downloading the file (`bots/api.md:44-51`). The cloud baseline is a 20 MB download limit and a download link valid for at least an hour (`bots/api/methods/getfile.md:5`). The feature-compression table lists cloud download 20 MB / upload 50 MB / HTTPS / ports 443, 80, 88, 8443 / 1-100 connections against local unlimited / 2000 MB / HTTP / any port / 1-100000 (`bots/features.md:1024-1029`).

Most bots are fine on the default cloud configuration; switch only if one of those upgrades matters (`bots/api.md:53-55`). Typical reasons are large media pipelines, keeping traffic and files inside a private network, and removing the cloud API hop for speed. Per-call latency and file handling improve, but you now own availability, disk, TLS, certificate rotation and upgrades.

## Cutover procedure

Call `logOut` **before** launching locally: without it there is no guarantee the bot receives updates, and after a successful call you cannot log back into the cloud API for 10 minutes (`bots/api/methods/logout.md:5`, `bots/features.md:1018`). Plan a short maintenance window and do not flip traffic back and forth casually. A local instance accepts HTTP requests, so a TLS termination proxy is required for remote HTTPS clients (`bots/features.md:1020`). All Bot API traffic is normally HTTPS with the token embedded in the URL path, for example `https://api.telegram.org/bot<token>/METHOD_NAME`; treat that URL as a secret in logs and proxies (`bots/api.md:16-20`).

Client libraries expose the endpoint override. python-telegram-bot's file helper has an explicit `local_mode` flag for servers started in `--local` mode and refuses `file://` inputs unless it is enabled (`python-telegram-bot/src/telegram/_utils/files.py:131-149`). teloxide's `Bot::set_api_url` redirects all methods to a custom base URL, documented with a `https://localhost/tbas` example (`teloxide/crates/teloxide-core/src/bot.rs:175-178`).

## Webhooks against a local server

`setWebhook` installs an outgoing HTTPS POST URL; non-2xx responses cause retries until Telegram gives up after a reasonable number of attempts (`bots/api/methods/setwebhook.md:5`). An empty `url` removes the integration (`:11`). `secret_token` adds the `X-Telegram-Bot-Api-Secret-Token` header, 1-256 characters of `A-Z`, `a-z`, `0-9`, `_` and `-`, so your handler can reject forged requests (`:7,18`). `allowed_updates` filters update types, `drop_pending_updates` clears the backlog, and `ip_address` pins the source IP (`:13,15,17`). While a webhook is set, `getUpdates` cannot be used (`:20-21`).

The cloud API restricts webhook ports to 443, 80, 88 and 8443 and `max_connections` to 1-100 (`bots/api/methods/setwebhook.md:14,23`); the local server lifts both restrictions, which is why it is attractive for internal endpoints. Webhook hosts must supply a supported, verified or self-signed certificate and complete the chain (`bots/webhooks.md:27-29`). A local HTTP webhook needs no public certificate only because Telegram is not making the delivery over the internet; any externally reachable listener still needs TLS.

## Self-signed certificates

For a cloud webhook without a CA-backed certificate, upload the **public key only** in the `certificate` parameter of `setWebhook`, PEM encoded (ASCII Base64) with BEGIN and END lines; split bundles so no private key is included (`bots/self-signed.md:3`, `bots/api/methods/setwebhook.md:12,22`). A generated pair uses OpenSSL, for example `openssl req -newkey rsa:2048 -sha256 -nodes -keyout YOURPRIVATE.key -x509 -days 365 -out YOURPUBLIC.pem ...`; only `YOURPUBLIC.pem` goes to the API (`bots/self-signed.md:11-13`). Inspect with `openssl x509 -text -noout -in YOURPUBLIC.pem`, or convert DER with `openssl x509 -inform der ...` and PKCS12 with `openssl pkcs12 -in ... -out ...` (`:15-22`). The certificate's Common Name or a SAN must match the webhook domain, or an IP may be used as CN for self-signed certificates (`bots/webhooks.md:59-60`). The file must be sent as an InputFile multipart upload; a plain string is rejected (`bots/api/methods/setwebhook.md:22`).

## 503 behavior and operational limits

The captured snapshot of the official docs does **not** define a local-server-specific `503` overload semantic: 503 behavior is `not verified` here. What is documented is that any non-2xx webhook response is retried (`bots/api/methods/setwebhook.md:5`), so treat 503 from your own listener as a retryable failure, return 2xx only after the update is durably accepted, and cap concurrency with `max_connections` (`:14`). Docker-specific deployment guidance is also `not verified` in this snapshot; derived ops duties are the TLS proxy, persistent storage for the local server's data, certificate/token rotation, and monitoring of webhook response codes.

## Security exposure

Local means you inherit the network perimeter. Keep the server and its HTTP listener on a private interface, terminate TLS at a trusted proxy, restrict which IPs can reach the token-bearing API path, and rotate the token if it leaks (`bots/api.md:18-20`). Validate inbound webhook headers with `secret_token` (`bots/api/methods/setwebhook.md:7,18`). Because local mode permits arbitrary local IPs and ports and unbounded downloads, a misconfigured proxy can turn a privacy feature into an open relay; allowlist the intended webhook route and never expose the raw server to the public internet.

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/self-signed
- https://core.telegram.org/bots/webhooks
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/api/methods/logout
- https://core.telegram.org/bots/api/methods/getfile
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/_utils/files.py
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/bot.rs
