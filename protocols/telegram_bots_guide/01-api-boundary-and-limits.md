# 01 - API Boundary and Limits

## Where the Bot API ends

The Bot API is an HTTP-based interface created for developers building Telegram bots; it is a distinct surface from the client MTProto protocol and its TDLib implementation (`bots/api.md:5`). The only TDLib-adjacent artifact a bot author normally touches is the optional local Bot API server: its source is the `telegram-bot-api` project, and using it means sending requests to a local URL instead of `https://api.telegram.org` (`bots/api.md:42`; `bots/features.md:1016`). Raw MTProto calls, TDLib client sessions and client-app internals are deliberately out of scope here; the reference instead defers Passport and Payments-provider setup to separate manuals (`bots/api.md:442`; `bots/api.md:427`). Third-party library internals are covered in later chapters, not here.

## BotFather and the token

Each bot is given a unique authentication token when it is created, and that token is the credential for every request (`bots/api.md:14`). `/newbot` asks for a name and username and then generates the token (`bots/features.md:1040`); the token is a string such as `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`, required to authorize the bot, and must be kept secure because anyone holding it controls the bot (`bots/features.md:1046`). Requests prefix the literal word `bot` to the token (`bots/features.md:1049`). Token handling, rotation and webhook secret tokens are treated in chapter 05.

## Snapshot: Bot API 10.4

This dossier is pinned to Bot API 10.4, dated November 9, 2026 (`bots/api-changelog.md:15`; `bots/api-changelog.md:17`). That release is the Widgets release: it adds the `Widget` class and `widget` field on `Message` (`bots/api-changelog.md:21`), the `sendWidget` and `sendSharedWidget` methods (`bots/api-changelog.md:22`; `bots/api-changelog.md:23`), and the `widget_query` / `shared_widget_query` fields on `Update` (`bots/api-changelog.md:24`; `bots/api-changelog.md:25`). It also permits ephemeral replies to callback queries without `receiver_user_id` (`bots/api-changelog.md:36`). No newer version is assumed anywhere in these chapters.

## HTTP and JSON contract

All queries must be served over HTTPS in the form `https://api.telegram.org/bot<token>/METHOD_NAME` (`bots/api.md:18`). Both GET and POST are accepted, with four parameter encodings: URL query string, `application/x-www-form-urlencoded`, `application/json` (except for file uploads) and `multipart/form-data` for uploads (`bots/api.md:22`; `bots/api.md:24`; `bots/api.md:25`; `bots/api.md:26`; `bots/api.md:27`). Method names are case-insensitive and all queries must be UTF-8 (`bots/api.md:31`; `bots/api.md:32`).

The response is a JSON object that always carries a Boolean `ok` and may carry a String `description`. On success the payload is in `result`; on failure `ok` is false and the reason is in `description`. An Integer `error_code` is returned but its contents may change, and some errors add a `parameters` field of type `ResponseParameters` (`bots/api.md:29`). While answering a webhook, a method can be invoked by putting it in the `method` parameter of the HTTP response, using JSON, urlencoded or multipart content type; the outcome cannot be observed (`bots/api.md:36`).

```http
POST /bot<token>/sendMessage HTTP/1.1
Host: api.telegram.org
Content-Type: application/json

{"chat_id": 12345, "text": "hello"}
---
HTTP/1.1 200 OK
{"ok": true, "result": {"message_id": 7, "text": "hello"}}
```

## Method and type vocabulary

Types are JSON objects (`bots/api.md:71`), listed together at the Bot API types page (`bots/api.md:3`), while callable operations are enumerated under "Available methods" (`bots/api.md:178`). Signed 32-bit integers are safe for all `Integer` fields unless noted, and `Optional` fields may be absent when irrelevant (`bots/api.md:73`; `bots/api.md:75`). Method families are grouped in the reference: sending and chat management (`bots/api.md:221`; `bots/api.md:250`), forum topics (`bots/api.md:285`), stickers (`bots/api.md:393`), payments (`bots/api.md:429`) and games (`bots/api.md:462`).

## Files and errors

`getFile` returns a `File` and prepares a download at `https://api.telegram.org/file/bot<token>/<file_path>`; the link is valid for at least one hour and can be renewed by calling `getFile` again (`bots/api/methods/getfile.md:5`). Bots can download files up to 20 MB this way, and the original filename or MIME type is not preserved (`bots/api/methods/getfile.md:5`; `bots/api/methods/getfile.md:11`). A local server instead yields the absolute local `file_path` with no download step (`bots/api.md:51`). `ResponseParameters` explains failures: `migrate_to_chat_id` for group-to-supergroup migration and `retry_after`, the seconds to wait after a flood-control rejection (`bots/api/types/responseparameters.md:5`; `bots/api/types/responseparameters.md:9`; `bots/api/types/responseparameters.md:10`).

## Local server boundary, concretely

Switching to a local Bot API server lifts cloud-side ceilings but moves operational duty to the operator. The documented gains are unlimited downloads (`bots/api.md:44`), uploads up to 2000 MB (`bots/api.md:45`), local-path and file-URI uploads (`bots/api.md:46`), and HTTP webhooks (`bots/api.md:47`) on any local IP and any port (`bots/api.md:48`; `bots/api.md:49`) with `max_webhook_connections` up to 100000 (`bots/api.md:50`). The default cloud configuration is explicitly said to be adequate for most bots (`bots/api.md:55`), so this is a deliberate tradeoff rather than a default upgrade path.

## Limits visible at the boundary

Even before retry logic, the envelope is concrete. Incoming updates are retained at most 24 hours, after which they are discarded whether or not a bot collected them (`bots/api.md:59`). Outbound, a bot may broadcast about 30 messages per second by default and can raise that to 1000 per second with Paid Broadcasts (`bots/api.md:215`), charged 0.1 Stars per message above the free allowance and requiring at least 10,000 Stars on the balance (`bots/api.md:217`). Per-chat and per-group ceilings are tighter: one message per second in a chat, twenty per minute in a group, with short bursts tolerated until 429 responses begin (`bots/faq.md:124`; `bots/faq.md:125`; `bots/faq.md:126`). Chapter 04 develops the retry behaviour these limits require; chapter 19 covers the local server itself.

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/api-changelog
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/api/methods/getfile
- https://core.telegram.org/bots/api/types/responseparameters
