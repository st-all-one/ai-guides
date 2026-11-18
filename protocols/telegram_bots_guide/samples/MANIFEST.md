# Samples

Verbatim copies from the pinned upstream checkouts. No header, no edit, no
normalisation: the verifier compares bytes with `cmp` semantics. Paths in
`Origin` are the research snapshot used on 2026-11-18.

| Sample | Origin | Why critical |
|---|---|---|
| `samples/ptb_echobot.py` | `/tmp/telegram-research/repos/python-telegram-bot/examples/echobot.py` | Canonical python-telegram-bot Application/handler loop at commit `41e3633`. |
| `samples/aiogram_echo_bot.py` | `/tmp/telegram-research/repos/aiogram/examples/echo_bot.py` | Minimal aiogram Dispatcher/CommandStart wiring at commit `63d09d6`. |
| `samples/telegraf_readme.md` | `/tmp/telegram-research/repos/telegraf/README.md` | Official Telegraf quickstart and middleware contract at commit `1386cc4`. |
| `samples/gramio_readme.md` | `/tmp/telegram-research/repos/gramio/README.md` | Official typed TS framework setup and example at commit `a648763`. |
| `samples/teloxide_command.rs` | `/tmp/telegram-research/repos/teloxide/crates/teloxide/examples/command.rs` | Real teloxide command/dialogue shape with `BotCommands` at commit `3c46b96`. |

Every sample is cited from `23-recommended-implementation.md` or from its
language chapter. Do not reformat these files; update the whole sample when the
pinned upstream changes.
