# 23 - Recommended implementation

This is the smallest verified path from a BotFather token to a controllable bot
in each target language. It is a decision recipe, not a second copy of the
reference chapters. Every recipe rests on a verbatim sample in `samples/`.

## 1. Decide before coding

| Question | Recommended answer |
|---|---|
| Public endpoint available? | webhook; otherwise long polling |
| Need files > 50 MB or HTTP webhook? | local Bot API server (`19`) |
| Team writes sync Python? | pyTelegramBotAPI (`10`) |
| Team writes async Python? | aiogram for routers/FSM, PTB for batteries (`08`,`09`) |
| Team wants typed JS/TS middleware? | grammY or GramIO (`11`,`13`) |
| Existing Node middleware conventions? | Telegraf (`12`) |
| Rust with dialogue/state needs? | teloxide; thin wrapper only if you want raw API (`14`,`15`) |
| More than one replica? | external dedupe + state (`21`) |

Do not mix stacks. Pick one language track and one transport; a webhook and
`getUpdates` cannot coexist (`bots/api.md:59`).

## 2. Universal first hour

1. Create the bot with BotFather and store the token in a secret manager.
2. Prove reachability: `curl -sS https://api.telegram.org/bot$TOKEN/getMe`.
3. Start with **long polling**; add a webhook only when the host is ready.
4. Register exactly one command (`/start`) and one error handler.
5. Log `update_id`, method, status and `retry_after`; redact the token.
6. Replay one official fake update before inviting users
   (`bots/webhooks.md:494-520`).
7. Add `update_id` dedupe before adding a second replica.

The API envelope makes step 5 meaningful: `ok:false` plus `description` is the
diagnostic contract (`bots/api.md:29`). Flood control makes step 5 necessary;
429s appear around one message per second per chat (`bots/faq.md:124`).

## 3. Python track

**python-telegram-bot 22.8.0** is the batteries-included choice. The pinned
version is declared at `python-telegram-bot/src/telegram/_version.py:54`. Start
from `samples/ptb_echobot.py`: it defines handler functions, registers them on
an `Application`, and runs until interrupted. Add persistence only when state
must survive restarts; keep the token in the environment, not the source.

**aiogram 3.32.0** targets async code and explicit router hierarchies. Its
build declares API 10.4 at `aiogram/aiogram/__meta__.py:1-2`. Start from
`samples/aiogram_echo_bot.py`, which wires `Bot`, `Dispatcher` and
`CommandStart`; add FSM storage before adding multi-step commands.

**pyTelegramBotAPI 4.37.1** is the simple sync/async option. Use it when the
codebase is threaded and framework opinions are unwanted; see `10` for the
concrete tradeoffs. Its version is in `pyTelegramBotAPI/pyproject.toml`.

Pick exactly one. All three can send the same `sendMessage` call; they differ
in handler topology, middleware and state, not in the API they speak.

## 4. JavaScript / TypeScript track

**grammY 1.46.0** (`grammY/package.json:4`) is the default for new typed
projects: bot construction, middleware and runners stay small. `11` covers the
concrete pipeline and conversation state.

**Telegraf 4.100.0** (`telegraf/package.json:3`) fits teams that already use
Node middleware conventions. `samples/telegraf_readme.md` is the upstream
quickstart verbatim: use it to confirm the handler signature and webhook
callback before writing application code. Stages/scenes are covered in `12`.

**GramIO 0.15.3** (`gramio/package.json:4`) is the strongly typed option
generated from the Bot API schema. `samples/gramio_readme.md` shows the
`new Bot(...)` + `.command(...)` + `.onStart(...)` shape and its multi-runtime
claim. Typing removes parameter mistakes; it does not remove rate limits.

## 5. Rust track

**teloxide 0.17.0** is the default Rust framework
(`teloxide/crates/teloxide/Cargo.toml:3`). `samples/teloxide_command.rs` is a
real upstream example with `Bot::from_env()`, `BotCommands` derivation and
`Command::repl`. Copy that shape for commands; move to `Dispatcher`/dptree
only when multiple update types and middlewares are needed (`14`).

**carapax 0.40.0** (`carapax/Cargo.toml:3`) is the alternative framework with
observers and state. **tgbotapi-rs 0.1.0** (`tgbotapi-rs/Cargo.toml:3`) is a
thin generated wrapper: choose it when you want full control of requests and
are prepared to build your own dispatcher (`15`).

Teloxide's workspace requires Rust 1.85 (`teloxide/Cargo.toml:8`); check the
toolchain before pinning a CI image.

## 6. Transport choice in practice

For a single replica behind NAT, polling is enough: no certificate, no public
IP, no ingress rules. For a public bot, use a webhook with TLS 1.2+, one of the
allowed ports, a secret token, and a path that is itself secret
(`bots/webhooks.md:24-29,43,52,56`). Keep `getMe` and `getWebhookInfo` as the
two smoke checks (`20`,`22`).

Local Bot API server is the exception: it allows HTTP webhooks, arbitrary
ports, uploads up to 2 GB and `max_webhook_connections` up to 100000, at the
cost of operating another service (`bots/api.md:40-55`). Do not adopt it for a
text-only bot.

## 7. Anti-patterns

- Starting both polling and webhook; `getUpdates` then fails.
- Hard-coded token or webhook URL without a secret path.
- `offset` computed once at startup instead of after each response.
- Unbounded async tasks with no per-chat ordering.
- Retrying 429 immediately without `retry_after`.
- Assuming library version tracks API version; pin both (`00`).
- Treating `error_code` as a stable enum (`bots/api.md:29`).

## 8. Acceptance checklist

| Check | Pass condition |
|---|---|
| `getMe` | returns bot identity with pinned token |
| Transport | only one of webhook/polling active |
| `/start` | answers once, no duplicate after replay |
| 429 | backoff uses `retry_after`, no busy loop |
| Secrets | token absent from Git and logs |
| Samples | chosen upstream file copied verbatim |
| Limits | file sizes within public or local-server caps |

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/faq.md
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/examples/echobot.py
- https://github.com/aiogram/aiogram/blob/63d09d6/examples/echo_bot.py
- https://github.com/telegraf/telegraf/blob/1386cc4/README.md
- https://github.com/gramiojs/gramio/blob/a648763/README.md
- https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/examples/command.rs
