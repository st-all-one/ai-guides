# 09 - Python: aiogram

aiogram 3.32.0 is a fully asynchronous, typed framework for Python 3.11+ on `asyncio` and `aiohttp` (`aiogram/README.rst:37-40`). Its badge tracks Bot API 10.4 (`aiogram/README.rst:55`), matching this snapshot, and its API code is generated from the schema (`aiogram/README.rst:56`). No synchronous mode or built-in job queue.

## Bot, Dispatcher and polling

`Bot` takes a token and optional session (`aiogram/aiogram/client/bot.py:305-309`) and owns the HTTP session released by `close()` (`aiogram/aiogram/client/bot.py:856`). `Dispatcher(Router)` is the root router (`aiogram/aiogram/dispatcher/dispatcher.py:37-39`): its `update` observer splits each Bot API `Update` into typed events (`aiogram/aiogram/dispatcher/dispatcher.py:75,79,260`). `start_polling(*bots, polling_timeout=10, handle_as_tasks=True, allowed_updates=UNSET, ...)` adds concurrency and shutdown controls (`aiogram/aiogram/dispatcher/dispatcher.py:568-575`); `run_polling` is the blocking wrapper (`aiogram/aiogram/dispatcher/dispatcher.py:687`). `resolve_used_update_types()` derives `allowed_updates` from handlers (`aiogram/aiogram/dispatcher/router.py:145`), matching `getUpdates` filters (`bots/api/methods/getupdates.md:11`).

```python
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import CommandStart

router = Router()

@router.message(CommandStart())
async def start(message: Message) -> None:
    await message.answer("Ready")

@router.message(F.text == "ping")
async def ping(message: Message) -> None:
    await message.answer("pong")

dp = Dispatcher()
dp.include_router(router)
async with Bot(token=TOKEN) as bot:
    await dp.start_polling(bot)
```

The shipped example uses this pattern (`aiogram/examples/echo_bot_webhook.py:37,74-78`).

## Routers and observers

`Router` holds one `TelegramEventObserver` per update type — `message`, `callback_query`, errors — plus lifecycle `EventObserver`s for `startup`/`shutdown` (`aiogram/aiogram/dispatcher/router.py:16,38,50,101,103-104`). Handlers are registered by decorator or `register()` (`aiogram/aiogram/dispatcher/router.py:21-23`, `aiogram/aiogram/dispatcher/event/telegram.py:58`); `__call__` enables the decorator form (`aiogram/aiogram/dispatcher/event/telegram.py:132`). `EventObserver` stores plain callbacks (`aiogram/aiogram/dispatcher/event/event.py:9,31`); `TelegramEventObserver` adds filters and middleware (`aiogram/aiogram/dispatcher/event/telegram.py:18,32,39`). `include_router`/`include_routers` build a tree (`aiogram/aiogram/dispatcher/router.py:262,275`) and `propagate_event` walks it (`aiogram/aiogram/dispatcher/router.py:166`); `SkipHandler` and `CancelHandler` control propagation (`aiogram/aiogram/dispatcher/event/bases.py:25,29`).

## Filters and magic filters

`Filter` is the abstract base (`aiogram/aiogram/filters/base.py:9`); exports include `Command`, `CommandStart`, `MagicData`, `StateFilter` and `F` (`aiogram/aiogram/filters/__init__.py:17,20-21`, `aiogram/aiogram/__init__.py:14`). `Command` parses commands (`aiogram/aiogram/filters/command.py:26,110`), `CallbackData` builds typed payloads (`aiogram/aiogram/filters/callback_data.py:33`), `StateFilter` matches FSM states (`aiogram/aiogram/filters/state.py:12`). `F = MagicFilter()` (`aiogram/aiogram/__init__.py:14`) supports chains like `F.text == "hello"` (`aiogram/docs/dispatcher/filters/magic_filters.rst:54`) and `F.data.in_(...)` (`aiogram/docs/dispatcher/filters/magic_filters.rst:66`). Combine filters with `and_f`, `or_f`, `invert_f` (`aiogram/aiogram/filters/logic.py:62,68,74`).

## FSM and storage

`State`/`StatesGroup` define states (`aiogram/aiogram/fsm/state.py:8,160`); `FSMContext` has `set_state`, `get_state`, `set_data`, `get_data`, `update_data`, `clear()` (`aiogram/aiogram/fsm/context.py:7,12,15,18,21,33,42`) — no `finish()`. Storage implements `BaseStorage` (`aiogram/aiogram/fsm/storage/base.py:112`); `MemoryStorage` is the default (`aiogram/aiogram/fsm/storage/memory.py:25`, `aiogram/aiogram/dispatcher/dispatcher.py:91`) and `RedisStorage` supports shared state (`aiogram/aiogram/fsm/storage/redis.py:27`). The dispatcher installs `FSMContextMiddleware` as outer middleware and closes storage on shutdown (`aiogram/aiogram/dispatcher/dispatcher.py:91,100,103`).

```python
class Form(StatesGroup):
    name = State()

@router.message(Command("form"))
async def begin(message: Message, state: FSMContext) -> None:
    await state.set_state(Form.name)

@router.message(Form.name)
async def save(message: Message, state: FSMContext) -> None:
    await state.update_data(name=message.text)
    await state.clear()
```

The shipped FSM example uses the same pattern (`aiogram/examples/finite_state_machine.py:25-26,33,58-59,105`).

## Middlewares, i18n and formatting

`BaseMiddleware` is the async middleware contract (`aiogram/aiogram/dispatcher/middlewares/base.py:10,16`); `MiddlewareManager` stores and wraps them (`aiogram/aiogram/dispatcher/middlewares/manager.py:14,57`). Observers expose inner (`middleware`) and outer (`outer_middleware`) chains (`aiogram/aiogram/dispatcher/event/telegram.py:32-33`); the dispatcher installs `ErrorsMiddleware`, `UserContextMiddleware` and FSM middleware on `update` (`aiogram/aiogram/dispatcher/dispatcher.py:83,87,100`). `I18n` is context-managed (`aiogram/aiogram/utils/i18n/core.py:16,39,50`) with `SimpleI18nMiddleware`/`ConstI18nMiddleware` (`aiogram/aiogram/utils/i18n/middleware.py:97,149`); `gettext`/`lazy_gettext` live in `aiogram/aiogram/utils/i18n/context.py:15,19`. Formatting: `Text.as_html()`/`as_markdown()` (`aiogram/aiogram/utils/formatting.py:24,210,217`) and `html`/`md` (`aiogram/aiogram/__init__.py:11-12`).

## Webhooks and errors

No `Dispatcher.start_webhook` exists: delivery is `feed_webhook_update` (`aiogram/aiogram/dispatcher/dispatcher.py:470`) plus an aiohttp handler. `SimpleRequestHandler` is the common choice (`aiogram/aiogram/webhook/aiohttp_server.py:212,194`) and `setup_application` binds startup/shutdown (`aiogram/aiogram/webhook/aiohttp_server.py:23,39,42`). `Bot.set_webhook(url, secret_token=...)` registers the URL (`aiogram/aiogram/client/bot.py:4012,4020`), as the example shows (`aiogram/examples/echo_bot_webhook.py:71,92-104`); the header is the Bot API secret token (`bots/api/methods/setwebhook.md:7`). Errors are events: `ErrorsMiddleware` turns an exception into an `ErrorEvent` on the `errors` observer (`aiogram/aiogram/dispatcher/middlewares/error.py:30-33`, `aiogram/aiogram/dispatcher/router.py:101`) and re-raises if unhandled (`aiogram/aiogram/dispatcher/middlewares/error.py:36-38`); register with `@dp.errors(...)` (`aiogram/examples/error_handling.py:33`).

## When to choose it

Choose aiogram for a typed async design with composable routers, magic filters, FSM storage and aiohttp webhooks; handlers must be async (`aiogram/README.rst:52`). Versus chapter 08 it spreads handlers over routers; versus chapter 10 it has no thread pool or sync client.

## Sources

- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/setwebhook.md
- https://github.com/aiogram/aiogram/blob/63d09d6/README.rst
- https://github.com/aiogram/aiogram/blob/63d09d6/examples/echo_bot_webhook.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/dispatcher/dispatcher.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/dispatcher/router.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/fsm/context.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/webhook/aiohttp_server.py
