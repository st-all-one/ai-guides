# 13 - JavaScript: GramIO and typed wrappers

GramIO 0.15.3 (`gramio/package.json:4`) calls itself a type-safe, extensible, multi-runtime framework (`gramio/README.md:17`, `gramio/README.md:15`, `gramio/README.md:19`). The official samples page lists both **GramIO** ("really type-safe") and **typescript-telegram-bot-api** ("wrapper for Node.js written in TypeScript") (`bots/samples.md:149`, `bots/samples.md:146`). No clone of `typescript-telegram-bot-api` was captured, so its API is `not verified`.

## Construction and generated types

GramIO's README advertises code-generated Bot API types (`gramio/README.md:21`). The dependency is `@gramio/types ^10.3.1` (`gramio/package.json:87`), re-exported from the package root (`gramio/src/index.ts:15`). `Bot` carries three type parameters — error kinds, derived context fields, and macros (`gramio/src/bot.ts:85`, `gramio/src/bot.ts:87`). Its constructor requires a token, accepts options, checks the token at runtime, and defaults to the public API base URL (`gramio/src/bot.ts:193`, `gramio/src/bot.ts:213`). The README reads the token from the environment (`gramio/README.md:38`).

```ts
import { Bot } from "gramio";
const bot = new Bot(process.env.TOKEN as string)
  .command("start", (ctx) => ctx.send("Hello!"))
  .onStart(({ info }) => console.log(info.username));
bot.start();
```

The `bot.api` proxy generates typed methods from `APIMethodParams<T>` (`gramio/src/bot.ts:117`, `gramio/src/bot.ts:124`); `_callApi` is generic over `keyof APIMethods` and builds the URL and JSON body (`gramio/src/bot.ts:283`, `gramio/src/bot.ts:290`). `init()` calls `getMe` unless `info` was supplied, which the options docs recommend for serverless or scaled bots (`gramio/src/bot.ts:1699`, `gramio/src/types.ts:27`).

## Handlers, filters, derived context

`bot.on` has overloads for update names, type-narrowing filters, boolean filters, and filter-only registration (`gramio/src/bot.ts:963`); `use` registers catch-all middleware (`gramio/src/bot.ts:1013`). `command` and `hears` delegate to the composer, with `command` exposing `ctx.args: string | null` (`gramio/src/bot.ts:1495`, `gramio/src/bot.ts:1510`). Command metadata can carry descriptions/locales and be pushed with `syncCommands()`, which groups by scope and language and rejects more than 100 commands per group (`gramio/src/bot.ts:1574`, `gramio/src/bot.ts:1638`).

Filters are type guards: the predicate narrows `In` to `Out`, and `.on()` intersects that narrowing with the update context (`gramio/src/filters.ts:25`, `gramio/src/filters.ts:28`). `derive` returns an object whose shape is added to every later handler's context type, globally or per update (`gramio/src/bot.ts:560`, `gramio/src/bot.ts:587`); the README shows `ctx.user` becoming typed this way (`gramio/README.md:87`). `decorate` adds named values (`gramio/src/bot.ts:599`). `callbackQuery` accepts a `CallbackData` schema and types `ctx.queryData` as the unpacked payload (`gramio/src/bot.ts:1261`).

## Plugins, decorators, hooks

`Plugin<Errors, Derives, Macros>` mirrors `Bot`'s handler/hook API and stores dependencies, composer, hooks, decorators, and error definitions (`gramio/src/plugin.ts:68`, `gramio/src/plugin.ts:92`, `gramio/src/plugin.ts:130`). Shorthand methods such as `command` and `hears` are attached to `Plugin.prototype` and declared at the type level (`gramio/src/plugin.ts:681`, `gramio/src/plugin.ts:696`). `bot.extend(plugin)` merges the composer and replays plugin hooks, decorators, errors, and start/stop handlers onto the bot (`gramio/src/bot.ts:1072`, `gramio/src/bot.ts:1165`).

Hooks are typed in `Hooks`: `Derive`, `PreRequest`, `OnError`, plus lifecycle variants (`gramio/src/types.ts:213`, `gramio/src/types.ts:279`). `onStart` and `onError` register them (`gramio/src/bot.ts:720`, `gramio/src/bot.ts:519`). By default `onError` logs; with handlers it dispatches `{context, kind, error}` (`gramio/src/bot.ts:144`, `gramio/src/bot.ts:148`). Registering an error class with `.error(kind, Class)` adds it to the inferred `kind`/`error` union, so `error.needRole` type-checks (`gramio/src/bot.ts:465`, `gramio/src/bot.ts:500`). API hooks `preRequest`, `onResponse`, `onResponseError`, and `onApiCall` can be scoped to method names (`gramio/src/bot.ts:773`).

## Long polling and webhooks

`bot.start()` initializes, resolves `allowedUpdates` (default plus opt-in, or `"strict"` from registered events), then polls unless `webhook` is set (`gramio/src/bot.ts:1729`, `gramio/src/bot.ts:1756`). Polling advances an offset past the last `update_id` and queues batches; failures sleep `retryGetUpdatesWait` (`gramio/src/updates.ts:18`, `gramio/src/updates.ts:113`, `gramio/src/updates.ts:128`, `gramio/src/updates.ts:144`). Each `getUpdates` HTTP deadline is the Telegram `timeout` plus a configurable allowance (default 15 seconds), documented as 45 seconds for the default 30-second poll (`gramio/README.md:49`, `gramio/README.md:51`, `gramio/src/bot.ts:198`). Webhook mode calls `setWebhook` unless `webhook: true`, and fires `onStart` with `updatesFrom: "webhook"` (`gramio/src/bot.ts:1789`, `gramio/src/bot.ts:1803`). `webhookHandler(bot, framework, options)` adapts Elysia/Fastify/Hono/Express/Koa requests, checks `X-Telegram-Bot-Api-Secret-Token`, and either queues or awaits handling with a timeout (`gramio/src/webhook/index.ts:49`, `gramio/src/webhook/index.ts:74`, `gramio/src/webhook/index.ts:79`, `gramio/src/webhook/adapters.ts:5`).

## What typing buys — and what it does not

Typing buys compile-time method/parameter names from generated `APIMethods`, narrowed contexts from filters, propagated `derive`/`decorate` fields, typed callback payloads and error kinds, and start options derived from `getUpdates`/`setWebhook` parameter types (`gramio/src/bot.ts:124`, `gramio/src/filters.ts:28`, `gramio/src/types.ts:418`, `gramio/src/types.ts:423`). It does **not** validate the runtime network exchange: `_callApi` sends JSON with `fetch` and consumes a raw `TelegramAPIResponse`, so bad IDs, 429s, and malformed updates remain runtime concerns (`gramio/src/bot.ts:290`, `gramio/src/bot.ts:303`). The generated types track API 10.3.1 while this snapshot documents 10.4, so newer fields require a dependency bump (`gramio/package.json:87`). Secret-token equality is a runtime string check, and `process.env.TOKEN as string` is only an assertion (`gramio/src/webhook/index.ts:74`, `gramio/README.md:38`).

## Sources

- https://core.telegram.org/bots/samples.md
- https://github.com/gramiojs/gramio/blob/a648763/README.md
- https://github.com/gramiojs/gramio/blob/a648763/package.json
- https://github.com/gramiojs/gramio/blob/a648763/src/index.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/bot.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/plugin.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/filters.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/types.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/webhook/index.ts
- https://github.com/gramiojs/gramio/blob/a648763/src/updates.ts
