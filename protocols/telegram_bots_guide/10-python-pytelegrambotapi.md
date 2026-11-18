# 10 - Python: pyTelegramBotAPI

pyTelegramBotAPI 4.37.1 is deliberately thin: "A simple, but extensible Python implementation for the Telegram Bot API" (`pyTelegramBotAPI/README.md:10`) offering "Both synchronous and asynchronous" clients (`pyTelegramBotAPI/README.md:11`). `TeleBot` encapsulates API calls and listeners in one class (`pyTelegramBotAPI/README.md:102`) with snake_case names such as `send_message` (`pyTelegramBotAPI/README.md:170`). There is no dispatcher, router tree or generated filter layer.

## Two clients

`TeleBot.__init__(token, parse_mode=None, threaded=True, skip_pending=False, num_threads=2, ...)` also accepts `state_storage`, `use_class_middlewares` and `exception_handler` (`pyTelegramBotAPI/telebot/__init__.py:164-170`). `AsyncTeleBot` is a separate class (`pyTelegramBotAPI/telebot/async_telebot.py:66`) without `threaded`/`num_threads` but with `state_storage` (`pyTelegramBotAPI/telebot/async_telebot.py:128-130`). It runs API calls as async tasks (`pyTelegramBotAPI/README.md:593`) over `aiohttp` (`pyTelegramBotAPI/README.md:770`), while Bot API calls are HTTPS JSON requests (`bots/api.md:12`).

```python
import telebot
bot = telebot.TeleBot("TOKEN")

@bot.message_handler(commands=["start"])
def start(message):
    bot.reply_to(message, "Ready")

bot.infinity_polling()
```

```python
import asyncio
from telebot.async_telebot import AsyncTeleBot
bot = AsyncTeleBot("TOKEN")

@bot.message_handler(func=lambda m: True)
async def echo(message):
    await bot.reply_to(message, message.text)

asyncio.run(bot.polling())
```

Examples use both shapes (`pyTelegramBotAPI/README.md:741`, `pyTelegramBotAPI/examples/asynchronous_telebot/echo_bot.py:25`). `infinity_polling` wraps `polling` with recovery (`pyTelegramBotAPI/telebot/__init__.py:1122,1186`); async variants are on `AsyncTeleBot` (`pyTelegramBotAPI/telebot/async_telebot.py:274,337`). Both feed `process_new_updates` (`pyTelegramBotAPI/telebot/__init__.py:701`, `pyTelegramBotAPI/telebot/async_telebot.py:617`), a thin counterpart to `getUpdates` (`bots/api/methods/getupdates.md:4`).

## Handler registration and keyword filters

`@bot.message_handler(commands=[...], regexp=..., func=..., content_types=..., chat_types=...)` declares filters as keyword arguments (`pyTelegramBotAPI/telebot/__init__.py:9604-9610`); every listed filter must return true (`pyTelegramBotAPI/README.md:177`). `add_message_handler` registers the built dictionary (`pyTelegramBotAPI/telebot/__init__.py:9697`); sibling decorators cover edited messages, inline queries and callbacks (`pyTelegramBotAPI/telebot/__init__.py:9767,10231,10340`). There is no unified handler/filter object model. Webhook delivery calls `process_new_updates([update])` yourself (`pyTelegramBotAPI/examples/webhook_examples/webhook_flask_echo_bot.py:54`).

## Threading and pooling

By default `threaded=True` creates `util.ThreadPool(self, num_threads=num_threads)` (`pyTelegramBotAPI/telebot/__init__.py:300-302`). `ThreadPool` starts that many `WorkerThread`s (`pyTelegramBotAPI/telebot/util.py:127,132,135`), and `infinity_polling` launches a dedicated `WorkerThread(name="PollingThread")` (`pyTelegramBotAPI/telebot/__init__.py:1282`). Handlers are dispatched via `worker_pool.put(...)` (`pyTelegramBotAPI/telebot/__init__.py:1395-1396`); `stop_polling` closes the pool (`pyTelegramBotAPI/telebot/__init__.py:1406,1420-1421`). This is a real thread model, unlike chapter 08's single event loop or chapter 09's all-async handlers: shared state needs locks even in the sync client. `AsyncTeleBot` uses asyncio tasks instead (`pyTelegramBotAPI/README.md:593`).

## Middleware and custom filters

Class-based middleware is off by default, enabled with `use_class_middlewares=True` (`pyTelegramBotAPI/telebot/__init__.py:170,260`); `BaseMiddleware` defines `pre_process(message, data)` and `post_process(message, data, exception)` (`pyTelegramBotAPI/telebot/handler_backends.py:167,209,212`). `SkipHandler` and `CancelUpdate` are the control signals (`pyTelegramBotAPI/telebot/handler_backends.py:216,228`); `setup_middleware` registers an instance (`pyTelegramBotAPI/telebot/__init__.py:9147`). The async equivalent is in `pyTelegramBotAPI/telebot/asyncio_handler_backends.py:7,45,48`; no `telebot/middleware/` package exists.

Custom filters are classes with a `key` used as a handler keyword: `SimpleCustomFilter.check(message)` and `AdvancedCustomFilter.check(message, text)` (`pyTelegramBotAPI/telebot/custom_filters.py:9,31,38,61`). Built-ins include `TextMatchFilter` and `IsDigitFilter` (`pyTelegramBotAPI/telebot/custom_filters.py:198,443`); register one with `add_custom_filter` (`pyTelegramBotAPI/README.md:400`). These differ from handler keywords (`pyTelegramBotAPI/telebot/__init__.py:9606,9609`).

## Webhooks and state

`set_webhook(url, certificate=None, max_connections=None, ...)` maps to Bot API `setWebhook` (`pyTelegramBotAPI/telebot/__init__.py:425`; `bots/api/methods/setwebhook.md:4`), `remove_webhook` to `deleteWebhook` (`pyTelegramBotAPI/telebot/__init__.py:628`), and `run_webhooks(...)` can run a local `SyncWebhookListener` with TLS (`pyTelegramBotAPI/telebot/__init__.py:484`, `pyTelegramBotAPI/telebot/ext/sync/webhooks.py:22,103`). Framework adapters still call `process_new_updates` (`pyTelegramBotAPI/examples/webhook_examples/webhook_aiohttp_echo_bot.py:74`).

State is separate from dispatch: `State`/`StatesGroup` (`pyTelegramBotAPI/telebot/states/__init__.py:8,26`) with `bot.set_state`/`bot.get_state` (`pyTelegramBotAPI/telebot/__init__.py:9170,9317`). `StateStorageBase` exposes `set_state`, `delete_state`, `get_state`, `set_data` (`pyTelegramBotAPI/telebot/storage/base_storage.py:4,8,24,39,59`); implementations are `StateMemoryStorage`, `StatePickleStorage` and `StateRedisStorage` (`pyTelegramBotAPI/telebot/storage/memory_storage.py:5`, `pyTelegramBotAPI/telebot/storage/pickle_storage.py:16`, `pyTelegramBotAPI/telebot/storage/redis_storage.py:12`). Unlike chapter 08's scoped `user_data`/`chat_data` or chapter 09's FSM middleware, there is no generalized per-chat bag: state keys are `(chat_id, user_id)` (`pyTelegramBotAPI/telebot/storage/base_storage.py:24`).

## When to choose it

Choose pyTelegramBotAPI for small scripts, prototypes and direct calls to arbitrary Bot API methods; sync and async share the decorator style (`pyTelegramBotAPI/README.md:11,177`). Concurrency and storage are manual: there is no router hierarchy or built-in job queue. For one supervised asyncio app prefer chapter 08; for typed routers and magic filters prefer chapter 09.

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/setwebhook.md
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/README.md
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/__init__.py
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/async_telebot.py
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/util.py
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/handler_backends.py
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/custom_filters.py
- https://github.com/eternnoir/pyTelegramBotAPI/blob/469eece/telebot/storage/base_storage.py
