# 05 - Security and Tokens

## Token lifecycle

The auth token is the single credential that authorizes every Bot API call; it is created with the bot by BotFather, and the documentation explicitly warns to keep it secure because anyone holding it can control the bot (`bots/api.md:14`; `bots/features.md:1046`). `/newbot` generates it after the name and username are chosen, and its shape is `<numeric id>:<secret>` (`bots/features.md:1040`). Every request URL embeds it after the literal prefix `bot` (`bots/api.md:18`; `bots/features.md:1049`). Consequences follow directly: the token belongs in an environment variable or secret manager, never in source control, client bundles, logs or crash reports. Rotate by asking BotFather for a new token, or, for managed bots, use `getManagedBotToken` and `replaceManagedBotToken`, which revokes the current token and generates a new one (`bots/api.md:303`; `bots/api.md:304`; `bots/features.md:657`; `bots/features.md:658`). Treat rotation as a deployment: update the secret, restart consumers, then invalidate the old value.

## Authenticating inbound webhook traffic

A webhook endpoint is a public HTTP server, so it must authenticate its caller independently of the token used for outbound calls. `setWebhook` accepts `secret_token`, a 1-256 character string restricted to `A-Z`, `a-z`, `0-9`, `_` and `-`; when set, every request carries the value in the `X-Telegram-Bot-Api-Secret-Token` header (`bots/api/methods/setwebhook.md:18`; `bots/api/methods/setwebhook.md:7`). Reject requests whose header is missing or differs, ideally with a constant-time comparison, before parsing the body. The header is a shared secret, not a signature: anyone who learns it can forge updates, so it must be stored with the same care as the bot token and rotated on suspicion. `getWebhookInfo` reports current webhook status and can be used to confirm the secret is configured without exposing it (`bots/api/methods/getwebhookinfo.md:5`).

## HTTPS and certificate rules

Webhook URLs must use HTTPS (`bots/api/methods/setwebhook.md:11`), and Telegram requires TLS 1.2 or better with IPv4 connectivity to ports 443, 80, 88 or 8443 (`bots/webhooks.md:26`; `bots/webhooks.md:25`; `bots/api/methods/setwebhook.md:23`). The certificate's common name or subject alternative name must match the webhook domain, and SNI routing is supported (`bots/webhooks.md:60`). Verified certificates are accepted only when Telegram trusts the issuing root CA, and intermediate certificates must be supplied to complete the chain (`bots/webhooks.md:68`; `bots/webhooks.md:77`). For self-signed setups, upload the public key as a PEM file via the `certificate` parameter; the file must contain only the public key, including BEGIN and END portions, and must be sent as an `InputFile`, not a string (`bots/self-signed.md:3`; `bots/api/methods/setwebhook.md:22`). A local Bot API server may use an HTTP webhook URL, but then a TLS termination proxy is required for remote HTTPS traffic, moving certificate and access-control duties to the operator (`bots/api.md:47`; `bots/features.md:1020`).

## Input validation and authorization

Treat every update as untrusted input even after the secret header check. The `Update` object carries at most one payload field and a sequential `update_id`, so a validator should reject objects with multiple payloads, unknown types outside the configured `allowed_updates`, or nonsensical identifiers (`bots/api/types/update.md:6`; `bots/api/types/update.md:10`; `bots/api/methods/getupdates.md:12`). Authorization is a separate decision: a user identifier appearing in a message is not proof of any application-level right, so map `from.id` to your own account model before granting access. Group actions require the bot to hold the relevant administrator right, and the rights requested when the bot is added can be constrained with `setMyDefaultAdministratorRights` (`bots/api.md:320`; `bots/api.md:280`). Least privilege is the default to aim for: request only the rights the implemented commands need, and re-check `getChatMember` before acting on privileged operations (`bots/api.md:280`). For content that must not be forwarded or saved, `sendMessage` offers `protect_content`, but it is a client-side protection, not encryption (`bots/api/methods/sendmessage.md:19`). Sensitive identity documents belong to Telegram Passport, whose dedicated manual is referenced by the reference, rather than to ordinary message payloads (`bots/api.md:442`).

## Callback data and deep links

Inline keyboard `callback_data` is a 1-64 byte string echoed back from the client, so it is attacker-inspectable and attacker-modifiable (`bots/api/types/inlinekeyboardbutton.md:13`). Keep it an opaque token or a short record identifier; store the real state server-side keyed by that identifier, and validate it against the originating user before acting. Never place a secret, an email address or a raw database key in it, and never interpret it as a command string without a whitelist. `answerCallbackQuery` can open a URL for the user, and the documented alternative form is a `t.me/your_bot?start=XXXX` link (`bots/api/methods/answercallbackquery.md:14`; `bots/api/methods/answercallbackquery.md:16`). Deep-link parameters themselves are limited to 64 characters from `A-Z`, `a-z`, `0-9`, `_` and `-`, with base64url recommended for other content (`bots/features.md:200`). Validate the decoded value as untrusted input and bind it to a short-lived, single-use token if it grants any account linkage.

## Log redaction and observability

The token is part of every request URL (`bots/api.md:18`), so logging full URLs or exception strings from HTTP clients will leak it; redact the segment between `bot` and `/` before emitting anything. Error bodies carry a human-readable `description` and optional `parameters`, which may include chat or migration identifiers, so they deserve the same treatment (`bots/api.md:29`). Logging frameworks capture console output with file and line tags in the serverless environment, which makes accidental secret logging persistent and searchable (`bots/serverless.md:872`; `bots/serverless.md:881`). Log `update_id`, method name, status code and a correlation identifier instead of raw payloads. Combine this with the webhook secret check and the per-chat authorization rules above so that a leaked log cannot become a bot takeover.

## Sources

- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/api/methods/setwebhook
- https://core.telegram.org/bots/self-signed
- https://core.telegram.org/bots/webhooks
- https://core.telegram.org/bots/api/types/inlinekeyboardbutton
- https://core.telegram.org/bots/api/types/responseparameters
- https://core.telegram.org/bots/api
