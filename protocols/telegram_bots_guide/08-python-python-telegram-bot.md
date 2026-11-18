# 08 - Python: python-telegram-bot

PTB 22.8.0 is the batteries-included asyncio framework: "a pure Python, asynchronous interface" to the Bot API (`python-telegram-bot/README.rst:67`) plus the `telegram.ext` layer (`python-telegram-bot/README.rst:71`). Its badge claims API 10.0 (`python-telegram-bot/README.rst:14`), below this guide's 10.4 snapshot. Since v20 it is asyncio-only and not thread-safe (`python-telegram-bot/README.rst:204-205`); use `Application.create_task` for background work (`python-telegram-bot/src/telegram/ext/_application.py:1085`).

## Construction and run loop

`Application.builder()` returns `ApplicationBuilder` (`python-telegram-bot/src/telegram/ext/_application.py:451`, `python-telegram-bot/src/telegram/ext/_applicationbuilder.py:99`). `.token()` stores the credential (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:376`) — keep it in an environment variable: the API authenticates with `bot<token>` in the URL (`bots/api.md:14`). `get_updates_request()` gives long polling its own request object (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:692`); timeouts are also builder options. `.concurrent_updates()` enables parallel dispatch (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:1023`); `run_polling()` defaults to a 10-second long poll and accepts `allowed_updates` (`python-telegram-bot/src/telegram/ext/_application.py:741-749`). The updater advances `offset` past the last `update_id` (`python-telegram-bot/src/telegram/ext/_updater.py:341,366`), as `getUpdates` requires (`bots/api/methods/getupdates.md:9`).

```python
import os
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text("Ready")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await context.bot.send_message(update.effective_chat.id, update.message.text)

app = Application.builder().token(os.environ["BOT_TOKEN"]).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
app.run_polling(allowed_updates=Update.ALL_TYPES)
```

Same shape as the shipped echo bot (`python-telegram-bot/examples/echobot.py:57,60,64,67`); `Update.ALL_TYPES` is the type list (`python-telegram-bot/src/telegram/_update.py:438`).

## Handlers and filters

`add_handler(handler, group=0)` registers a base handler (`python-telegram-bot/src/telegram/ext/_application.py:1334`). Constructors: `CommandHandler(command, callback, filters=None)` (`python-telegram-bot/src/telegram/ext/_handlers/commandhandler.py:127-131`), `MessageHandler(filters, callback)` (`python-telegram-bot/src/telegram/ext/_handlers/messagehandler.py:78-82`), `CallbackQueryHandler(callback, pattern=None)` (`python-telegram-bot/src/telegram/ext/_handlers/callbackqueryhandler.py:130-133`) and `InlineQueryHandler` (`python-telegram-bot/src/telegram/ext/_handlers/inlinequeryhandler.py:37`). No `EditedMessageHandler` exists: use `MessageHandler(filters.UpdateType.EDITED_MESSAGE, ...)` (`python-telegram-bot/src/telegram/ext/filters.py:2849,2855`). Filters compose via `BaseFilter.__and__`/`__or__` (`python-telegram-bot/src/telegram/ext/filters.py:134,197,208`); leaves include `ALL`, `TEXT`, `COMMAND`, `Regex`, `ChatType.PRIVATE` and `UpdateType` (`python-telegram-bot/src/telegram/ext/filters.py:538,2777,985,1800,921,2786`).

## Context, jobs and persistence

Handlers get `(update, context)`; `ContextTypes.DEFAULT_TYPE` aliases `CallbackContext` (`python-telegram-bot/src/telegram/ext/_contexttypes.py:30,63`). The context holds `bot`, `args`, `error`, `job`, `match` and `job_queue` (`python-telegram-bot/src/telegram/ext/_callbackcontext.py:133-136,381,386,412`). Three scopes: `bot_data` global, `chat_data` per chat, `user_data` per user (`python-telegram-bot/src/telegram/ext/_callbackcontext.py:145,161,188`); the application exposes read-only proxies of the latter two (`python-telegram-bot/src/telegram/ext/_application.py:327-328`), so mutate via `context`. Enable `.job_queue()` (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:1068`): an `AsyncIOScheduler` wrapper with `run_once`/`run_repeating` returning `Job` (`python-telegram-bot/src/telegram/ext/_jobqueue.py:67,125,260,344,753`). Enable `.persistence(BasePersistence)` separately (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:1101`): async `get_*`/`update_*` and `flush` (`python-telegram-bot/src/telegram/ext/_basepersistence.py:57,188,207,226,286,308,435`), implemented by `PicklePersistence` and `DictPersistence` (`python-telegram-bot/src/telegram/ext/_picklepersistence.py:122`, `python-telegram-bot/src/telegram/ext/_dictpersistence.py:32`). Startup loads and shutdown flushes data (`python-telegram-bot/src/telegram/ext/_application.py:561-565,517`); use a shared store for replicas.

## Keyboards, errors and shutdown

Inline buttons are `InlineKeyboardMarkup(inline_keyboard=...)` with `InlineKeyboardButton(callback_data=...)` (`python-telegram-bot/src/telegram/_inline/inlinekeyboardmarkup.py:30,72`, `python-telegram-bot/src/telegram/_inline/inlinekeyboardbutton.py:33,290`); reply keyboards use `ReplyKeyboardMarkup`/`KeyboardButton` (`python-telegram-bot/src/telegram/_replykeyboardmarkup.py:31`, `python-telegram-bot/src/telegram/_keyboardbutton.py:32`). Clients must answer callbacks (`bots/api.md:298`) via `answer_callback_query` (`python-telegram-bot/src/telegram/_bot.py:4304`). `add_error_handler` receives `(update, context)` with `context.error` set (`python-telegram-bot/src/telegram/ext/_application.py:1789`); `RetryAfter`/`Conflict` live in `telegram.error` (`python-telegram-bot/src/telegram/error.py:207,253`), so back off on 429. Both run methods install SIGINT/SIGTERM/SIGABRT handlers off Windows and shut down updater, persistence and scheduler (`python-telegram-bot/src/telegram/ext/_application.py:1037-1043,517-573`). `run_webhook(...)` requires the `webhooks` extra (`python-telegram-bot/src/telegram/ext/_application.py:852-900`) and maps to `setWebhook` plus its secret header (`bots/api/methods/setwebhook.md:7`).

## When to choose it

Choose PTB for a typed, batteries-included asyncio app with jobs and persistence in one package; the cost is a large surface and single-loop concurrency discipline (`python-telegram-bot/README.rst:204-212`). Unlike aiogram (chapter 09) it centralises dispatch in `Application`; unlike pyTelegramBotAPI (chapter 10) it has no synchronous mode.

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/setwebhook.md
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/README.rst
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/examples/echobot.py
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_application.py
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_applicationbuilder.py
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/filters.py
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_jobqueue.py
