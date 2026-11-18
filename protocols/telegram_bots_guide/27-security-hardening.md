# 27 - Security hardening

Operational layer over `05-security-and-tokens.md` (token shape, `secret_token`, TLS baseline, callback opacity); adds mechanisms and commands, not repeated prose. `04` owns 429/backoff, `20` logs, `21` topology.

## Token lifecycle and blast radius

BotFather creation is in `05`. After issuance: store in a secret manager with owner/date/rotation policy, inject at process start, never commit `.env` (the token is in every outbound URL, `bots/api.md:18`). One token = full bot control, no scoped sub-credential: isolate bots per environment, grant minimal default admin rights, revoke first on exposure.

| Phase | Control |
|---|---|
| Rotate | `/revoke` + re-issue in BotFather, update secret, reload atomically |
| CI | Masked secret, deploy job only, no fork PRs or `set -x`, no Git |

FAQ's independent barrier is a secret webhook path such as `www.example.com/your_token` — only you know it, so requests there are very likely Telegram's (`bots/faq.md:86`). Generate with token-grade entropy, allow only `/<slug>/*` at the proxy, and never use the bot token as the slug (URLs get logged). Redaction: `05`, `20`.

## Webhook authenticity

`secret_token` is 1–256 chars from `A-Z a-z 0-9 _ -`, sent as `X-Telegram-Bot-Api-Secret-Token` (`bots/api/methods/setwebhook.md:7,18`; basics `05`). Order: missing/out-of-range header → 401 and stop; constant-time compare (`compare_digest`, `timingSafeEqual`), never `==`; only on match parse JSON and dispatch. Mismatches must not reach the parser or queue. It is a shared secret, not a signature: rotate with the token.

IP allowlisting is supplementary: POSTs come from `149.154.160.0/20` and `91.108.4.0/22` on 443/80/88/8443, and the ranges may change (`bots/webhooks.md:24-32`). A pinned allowlist will eventually block real traffic; watch `WebhookInfo` and review on network changes. The header stays authoritative.

## TLS chain verification

Telegram needs TLS 1.2+, IPv4, ports 443/80/88/8443, CN/SAN matching the domain, all intermediates, trusted root (`bots/webhooks.md:24-32`). Check from outside: `openssl s_client -tls1_2 -connect yourbotdomain:yourbotport -servername yourbotdomain` forces 1.2 and correct SNI (`bots/webhooks.md:185-189`); confirm leaf CN/SAN and every intermediate. `curl --tlsv1.2` tests the same path, `-k` only for self-signed (`bots/webhooks.md:185-189`). Alert on notAfter; unchanged-key renewal needs no `setWebhook`.

Self-signed: upload PEM as InputFile (String fails, `bots/api/methods/setwebhook.md:22-23`) containing only the public key with BEGIN/END; split bundles (`bots/self-signed.md:3`):

```
openssl req -newkey rsa:2048 -sha256 -nodes -keyout YOURPRIVATE.key -x509 -days 365 -out YOURPUBLIC.pem -subj "/C=US/L=Brooklyn/O=Example/CN=YOURDOMAIN.EXAMPLE"
openssl x509 -text -noout -in YOURPUBLIC.pem
```

(`bots/self-signed.md:11,16`); private key stays on the host.

## Web App data validation

Only validated `initData` is trustworthy; `initDataUnsafe` never is (`bots/webapps.md:408-411`). `hash` proves data to your server, `signature` to third parties and excludes `hash` (`bots/webapps.md:998-999`).

First party: `secret_key = HMAC_SHA256(bot_token, "WebAppData")`; data-check-string = all fields sorted alphabetically as `key=value`, joined by `0x0A` (not `&`); compare hex `HMAC_SHA256(data_check_string, secret_key)` to `hash` in constant time (`bots/webapps.md:1030-1051`). Exclude `hash`; reject duplicate/unknown keys.

Third party: share only `initData` + `bot_id`; verify base64url Ed25519 `signature` over `<bot_id>:WebAppData` + `0x0A` + sorted fields except `hash`/`signature`, against Telegram's key — test `40055058a4ee...`, production `e7bf03a2fa46...4caed242d` (`bots/webapps.md:1053-1088`). Pin the key; never fetch at runtime.

Both paths check `auth_date` (Unix receipt time) against a session window plus small skew (`bots/webapps.md:1030-1051`, `bots/webapps.md:1053-1088`); a valid HMAC over stale data is a replay.

## Authorization matrix

Enforce in one middleware; re-evaluate each update so demotion takes effect immediately.

| Actor | Target | Check |
|---|---|---|
| Owner | Admin commands | `from.id` in config allowlist |
| Group admin | Moderation | Bot and caller both hold the right in that chat |
| Member | Public commands | Abuse limits only |
| Callback | State change | Opaque id → server record owned by `from.id`, short TTL |
| Web App | Endpoints | HMAC + `auth_date` + account lookup |
| `/start` payload | Referral/bind | 64-char whitelist, server-issued one-time token |

Callbacks stay opaque (`05`): random id, server state, user binding, TTL. Deep-link payloads are attacker text ≤64 chars: exact-match issued tokens, never parse as SQL/path/URL. Constrain default admin rights at add time; deny actions where the bot lacks the right.

## Abuse controls

Per-user and per-chat token buckets before every handler, separate budgets for uploads/searches/external calls. 429 is also a signal: sustained `Retry-After` means outbound pacing is wrong — feed it to limiter and alerts (`04`, `20`). ≤1 message/s per chat; bursts eventually 429 (`bots/faq.md:124`). Bulk ~30/s, spread over 8–12 h if not paid (`bots/faq.md:134`). Paid broadcasts: up to 1000/s at 0.1 Stars/message above free 30/s, requiring ≥100,000 Stars balance and ≥100,000 MAU (`bots/faq.md:130`). Costly actions: owner allowlist, daily quota, per-call audit.

## Supply chain and local server

Pin version + commit, lockfiles, checksums; review webhook/validation diffs on upgrade. Audited set (`VERSION`): python-telegram-bot 22.8.0 @ `41e3633`, aiogram 3.32.0 @ `63d09d6`, pyTelegramBotAPI 4.37.1 @ `469eece`, grammY 1.46.0 @ `e8b3b1b`, Telegraf 4.100.0 @ `1386cc4`, GramIO 0.15.3 @ `a648763`, teloxide 0.17.0 @ `3c46b96`, carapax 0.40.0 @ `5566d29`, tgbotapi-rs 0.1.0 @ `bd553c1`.

Never expose a local Bot API server: HTTP webhooks on any port/local IP, uploads to 2000 MB, absolute local `file_path` (`bots/api.md:40-55`). Bind to localhost/private interface, firewall, terminate public HTTPS at your proxy with path/header checks. Topology: `21`.

## Incident checklist

1. Revoke token in BotFather; workers fail closed, no cached copies.
2. Rotate `secret_token` via `setWebhook` and the path slug; secret store first.
3. `deleteWebhook` if the endpoint is compromised; re-register clean URL, clear stale `certificate`.
4. Inspect `WebhookInfo` (URL, pending count, last error) before/after; correlate with `20`.
5. Purge tokens/`initData` from logs, traces, crash reports, CI caches; add redaction and verify with a canary.

## Sources

- https://core.telegram.org/bots/faq
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/webhooks
- https://core.telegram.org/bots/self-signed
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/api
