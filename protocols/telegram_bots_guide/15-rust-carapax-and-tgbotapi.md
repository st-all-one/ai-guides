# 15 - Carapax and tgbotapi-rs: framework versus thin wrapper

The two Rust libraries at this snapshot sit at opposite ends: carapax 0.40.0 is a bot framework built on `tgbot` (`carapax/README.md:7`), while tgbotapi 0.1.0 makes "no assumptions about how you are using the API" (`tgbotapi-rs/README.md:7`).
Carapax follows ZeroVer and pins `carapax = "0.40.0"` in its installation docs (`carapax/README.md:15`, `carapax/README.md:32`).

## Carapax: handlers and update listeners

Carapax re-exports all of `tgbot` (`carapax/src/lib.rs:4`), so the API client, `LongPoll` and `WebhookServer` come from that dependency. The framework's entry point is `App`, which implements `UpdateHandler` and can be driven by either `LongPoll` or `WebhookServer` (`carapax/src/core/app/mod.rs:16-23`). `App::new(context, handler)` stores a shared `Context` and a handler (`carapax/src/core/app/mod.rs:44`).
The example reads `CARAPAX_TOKEN` from the environment and builds `Client::new(token)` before creating the app (`carapax/examples/echo.rs:81-82`).

Each update is wrapped with the context into `HandlerInput`, converted through `TryFromInput`, dispatched to the handler, and a returned error is logged (`carapax/src/core/app/mod.rs:52-70`). Regular async functions work as handlers because `Handler` is implemented for `Fn` with up to ten arguments (`carapax/examples/echo.rs:17-27`); return types convert into `HandlerResult`, mapping `Err(E)` to `HandlerError` (`carapax/examples/echo.rs:29-37`). This function-as-observer model keeps routing out of the network layer. The example switches between long polling and a webhook server with one conditional (`carapax/examples/echo.rs:93-98`).

## State, filtering and composition

State lives in a `Context` type map: the example inserts a cloned `Client` and receives it as `Ref<Client>` in the handler (`carapax/examples/echo.rs:66-69`, `carapax/examples/echo.rs:86-87`). Filtering is the same conversion mechanism: a handler runs only if every argument can be extracted from the `Update`, so `ChatPeerId` and `Text` gate execution (`carapax/examples/echo.rs:63-68`). Missing context values make `TryFromInput` fail and skip the handler.

`Chain` composes several handlers: `Chain::once()` stops at the first match, `Chain::all()` runs all matches, `with` appends handlers in order, and an error stops later handlers (`carapax/src/core/chain/mod.rs:14-60`). The advanced example builds `Chain::all()`, adds command, dialogue, session and rate-limit steps, and wraps the chain with `on_error(error_handler)` before passing it to `App` (`carapax/examples/app/main.rs:38-56`). Feature flags expose access control, dialogue, ratelimit and session modules (`carapax/src/lib.rs:11-28`); decorators and predicates, not a generic middleware trait, are the composition tools in this snapshot.

## tgbotapi-rs: a thin generated-style wrapper

The crate is an async library of types and wrappers only; its README calls it incomplete but usable for the core experience (`tgbotapi-rs/README.md:3-7`). All requests implement `TelegramRequest`, with an endpoint, JSON values and optional multipart files (`tgbotapi-rs/README.md:9`, `tgbotapi-rs/src/lib.rs:25-44`). The client is `Telegram`, holding an API key, a `reqwest::Client` and an endpoint (`tgbotapi-rs/src/lib.rs:49-66`); `make_request` builds `bot<token>/<method>`, serializes the request and parses a `Response<T>` (`tgbotapi-rs/src/lib.rs:79-90`). Requests carrying files use multipart, others a JSON POST (`tgbotapi-rs/src/lib.rs:90-140`); `download_file` fetches from the file endpoint (`tgbotapi-rs/src/lib.rs:152-158`).

```rust
let telegram = Telegram::new("api_token".into());
let mut updates = GetUpdates { timeout: Some(30), ..Default::default() };
for update in telegram.make_request(&updates).await? {
    updates.offset = Some(update.update_id + 1); // acknowledge
}
```

`values()` defaults to `serde_json::to_value(self)` and the endpoint constant is `https://api.telegram.org/` (`tgbotapi-rs/src/lib.rs:36-38`, `tgbotapi-rs/src/lib.rs:17`); `new_with_endpoint` allows a local Bot API server (`tgbotapi-rs/src/lib.rs:62-66`).

The `requests` module holds declarative structs: `ChatID` (`tgbotapi-rs/src/requests.rs:10`), a `ParseMode` enum (`tgbotapi-rs/src/requests.rs:96`), `GetMe` with endpoint `getMe` (`tgbotapi-rs/src/requests.rs:386-393`), `GetUpdates` with `offset`, `limit` and `timeout` fields (`tgbotapi-rs/src/requests.rs:398-410`), `SendMessage` (`tgbotapi-rs/src/requests.rs:450-481`) and `SetWebhook` (`tgbotapi-rs/src/requests.rs:765-778`). Types such as `Response<T>`, `Update` and `Message` mirror Bot API JSON rather than adding framework behavior (`tgbotapi-rs/src/types.rs:6-37`, `tgbotapi-rs/src/types.rs:155`); `Update` has optional fields for messages, inline queries, callback queries and chat-member changes (`tgbotapi-rs/src/types.rs:37-49`), while `InlineKeyboardMarkup` is a plain serializable type (`tgbotapi-rs/src/types.rs:391`). `From<Response<T>> for Result<T, Error>` turns an unsuccessful response into an error (`tgbotapi-rs/src/types.rs:26-32`). There is no type literally named `API`; `Telegram` and `requests` are the public surface.

There are no framework batteries: the README shows a hand-written `getUpdates` loop that increments `offset`, and a webhook path that deserializes the body into `Update` with `serde_json` (`tgbotapi-rs/README.md:20-30`, `tgbotapi-rs/README.md:51-58`). Routing, state, retries and server setup are the caller's job.

## Decision rule

Choose carapax when an update needs several independent handlers, typed argument extraction, shared state and optional FSM/session/rate-limit modules; its handler chain and adapters replace application plumbing, at the cost of routing all traffic through `App`. Choose tgbotapi-rs when you want typed requests and a small client but own the update loop, storage and HTTP server; its README recommends webhooks for higher-throughput bots while leaving the server to you (`tgbotapi-rs/README.md:51`). Choose raw HTTP when a single script or a tight dependency budget makes even serde structs unnecessary; you then hand-build `bot<token>/<method>` URLs and parse JSON yourself. Moving up this ladder trades control for routing, state and transport handling.

## Sources

- https://github.com/tg-rs/carapax/blob/5566d29/README.md
- https://github.com/tg-rs/carapax/blob/5566d29/src/lib.rs
- https://github.com/tg-rs/carapax/blob/5566d29/src/core/app/mod.rs
- https://github.com/tg-rs/carapax/blob/5566d29/src/core/chain/mod.rs
- https://github.com/tg-rs/carapax/blob/5566d29/examples/echo.rs
- https://github.com/tg-rs/carapax/blob/5566d29/examples/app/main.rs
- https://github.com/Syfaro/tgbotapi-rs/blob/bd553c1/README.md
- https://github.com/Syfaro/tgbotapi-rs/blob/bd553c1/src/lib.rs
- https://github.com/Syfaro/tgbotapi-rs/blob/bd553c1/src/requests.rs
- https://github.com/Syfaro/tgbotapi-rs/blob/bd553c1/src/types.rs
