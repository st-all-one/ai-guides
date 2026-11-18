# 14 - Teloxide: the full-featured Rust framework

Teloxide builds an update handler as a `dptree::Handler` from combinators (`teloxide/crates/teloxide/src/dispatching.rs:1`): a typed tree of filters, branches and endpoints instead of a hand-written update loop.

## Bot and the Reqwest transport

`Bot` holds an `Arc<str>` token, an `Arc<reqwest::Url>` API base and a `reqwest::Client` (`teloxide/crates/teloxide-core/src/bot.rs:57`). `Bot::from_env` reads `TELOXIDE_TOKEN`, `TELOXIDE_API_URL` and `TELOXIDE_PROXY` (`teloxide/crates/teloxide-core/src/bot.rs:120`); `set_api_url` targets a local Bot API server and affects only that clone (`teloxide/crates/teloxide-core/src/bot.rs:198`). Reqwest is the transport: default endpoint `https://api.telegram.org` (`teloxide/crates/teloxide-core/src/net.rs:17`), proxy from `TELOXIDE_PROXY` (`teloxide/crates/teloxide-core/src/net.rs:38`), 5 s connect and 17 s total timeout with `tcp_nodelay` (`teloxide/crates/teloxide-core/src/net.rs:72`). No separate `Reqwest` requester type exists; the client is a `Bot` field.

## Dispatcher and handler chain

`UpdateHandler<Err>` is a `dptree::Handler` (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:305`). `Dispatcher::builder` takes a bot and handler (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:316`); `dispatch()` installs long polling plus a listener-error logger (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:358`). Startup calls `get_me`, injects `Me` and `Bot`, and derives `allowed_updates` from the handler description (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:411`).

`branch` tries the next handler if the current one declines, `dptree::case!` matches an enum variant and forwards its payload, and `endpoint` ends the chain (`teloxide/crates/teloxide/src/dispatching.rs:93-100`). The documented schema combines `filter_command`, `Update::filter_message()`, `Update::filter_callback_query()` and `dialogue::enter` (`teloxide/crates/teloxide/src/dispatching.rs:66-85`).

```rust
let schema = dialogue::enter::<Update, InMemStorage<State>, State, _>()
    .branch(Update::filter_message().branch(teloxide::filter_command::<Command, _>()
        .branch(case![Command::Help].endpoint(help))))
    .branch(Update::filter_callback_query().branch(on_callback));
Dispatcher::builder(bot, schema).build().dispatch().await;
```

## Filters and typed commands

Filters reject updates and inject values: `Message` from `Update::filter_message`, `CallbackQuery` from `Update::filter_callback_query`, a state payload from `dptree::case![...]` (`teloxide/crates/teloxide/src/dispatching.rs:144-150`). Extra dependencies arrive via `dependencies(dptree::deps![...])` (`teloxide/crates/teloxide/src/dispatching.rs:166`). Deriving `BotCommands` on an enum gives `parse` (including `/cmd@botname`), `descriptions()` for help and `bot_commands()` for `set_my_commands` (`teloxide/crates/teloxide/src/utils/command.rs:248-264`).

## Dialogue state (FSM)

`Dialogue<D, S>` wraps `Arc<S>` storage and a `ChatId` (`teloxide/crates/teloxide/src/dispatching/dialogue.rs:122`). One enum variant per FSM state is stored per chat: `update` persists a converted state, `reset` writes the default, `exit` removes it (`teloxide/crates/teloxide/src/dispatching/dialogue.rs:185-203`). `dialogue::enter` abbreviates `dptree::entry().enter_dialogue()` (`teloxide/crates/teloxide/src/dispatching/dialogue.rs:215`). Swapping storage backends changes persistence, not handlers.

## Keyboard helpers

An `InlineKeyboardButton` pairs a label with an `InlineKeyboardButtonKind`; constructors include `new`, `url` and `callback` (`teloxide/crates/teloxide-core/src/types/inline_keyboard_button.rs:112-142`). Callback data returns as `CallbackQuery` and joins the same filter tree.

## Polling versus webhooks

`Polling` implements `UpdateListener` (`teloxide/crates/teloxide/src/update_listeners/polling.rs:330`); its builder exposes `timeout`, `allowed_updates`, `drop_pending_updates` and a reconnect `backoff_strategy` (`teloxide/crates/teloxide/src/update_listeners/polling.rs:31-95`). The stream advances `offset` from `update_id` (`teloxide/crates/teloxide/src/update_listeners/polling.rs:432`) and sends offset, limit, timeout and allowed updates on each call (`teloxide/crates/teloxide/src/update_listeners/polling.rs:495`).

Webhook `Options` hold an address, public URL, path, certificate, `max_connections` and secret token (`teloxide/crates/teloxide/src/update_listeners/webhooks.rs:8-60`). Setup calls `set_webhook` with that secret (`teloxide/crates/teloxide/src/update_listeners/webhooks.rs:145-161`). The built-in adapter is axum (`teloxide/crates/teloxide/src/update_listeners/webhooks.rs:135`): `axum` calls `set_webhook` and serves with graceful shutdown (`teloxide/crates/teloxide/src/update_listeners/webhooks/axum.rs:41-60`); `axum_to_router` returns an embeddable `axum::Router` (`teloxide/crates/teloxide/src/update_listeners/webhooks/axum.rs:213`). No actix adapter exists in this snapshot (`teloxide/crates/teloxide/src/update_listeners/webhooks.rs:140`).

## Errors, shutdown and ordering

`error_handler` accepts an `Arc<dyn ErrorHandler<Err> + Send + Sync>`; otherwise `LoggingErrorHandler::new()` is used (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:79`, `teloxide/crates/teloxide/src/dispatching/dispatcher.rs:330`). `enable_ctrlc_handler` maps Ctrl-C to shutdown (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:96`) and `shutdown_token()` exposes a token (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:574`). While stopping, polling sends `getUpdates` with `timeout = 0, limit = 1` to acknowledge the last offset (`teloxide/crates/teloxide/src/update_listeners/polling.rs:474`). By default updates from one chat share a worker and run sequentially (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:140`); `distribution_function` changes the key (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:173`).

## When to choose it

Choose teloxide for many update kinds, stateful FSMs and dependency injection; REPLs suit simple bots and rapid prototyping (`teloxide/crates/teloxide/src/dispatching.rs:201`). The price is a larger type vocabulary and feature-gated storage/webhook dependencies. A thin client is lighter for one-shot scripts.

## Sources

- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/bot.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/net.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/types/inline_keyboard_button.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/dispatching.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/dispatching/dispatcher.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/dispatching/dialogue.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/update_listeners/polling.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/update_listeners/webhooks.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/update_listeners/webhooks/axum.rs
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/utils/command.rs
