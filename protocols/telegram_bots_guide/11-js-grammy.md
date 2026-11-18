# 11 - JavaScript: grammY

grammY 1.46.0 (`grammY/package.json:4`) is TypeScript-first, running on Node.js and Deno (`grammY/README.md:30`), with a web bundle (`grammY/README.md:130`). One bot object works under polling or webhooks.

## Construction and token

`Bot` extends `Composer` (`grammY/src/bot.ts:162`). Its constructor takes the token, rejects an empty string, and accepts cached `botInfo` (`grammY/src/bot.ts:227`, `grammY/src/bot.ts:229`). Read the token from the environment or a secret store; the README's inline token is only a demo (`grammY/README.md:50`). `bot.api` suits calls outside middleware; inside handlers prefer the per-update `ctx.api`, which can answer through a webhook envelope (`grammY/src/bot.ts:174`, `grammY/src/bot.ts:384`).

```ts
import { Bot } from "grammy";
const bot = new Bot(process.env.BOT_TOKEN!);
bot.on("message:text", (ctx) => ctx.reply("Echo: " + ctx.message.text));
bot.catch((err) => console.error(err.ctx.update.update_id, err.error));
bot.start();
```

The README quickstart has the same shape (`grammY/README.md:47`, `grammY/README.md:53`). Startup calls `api.getMe()` with retries and caches `botInfo` (`grammY/src/bot.ts:306`, `grammY/src/bot.ts:310`); serverless bots can pre-seed it (`grammY/src/bot.ts:130`). Reading it too early throws (`grammY/src/bot.ts:257`).

## Update loop and runner choice

`bot.start()` initializes, calls `deleteWebhook`, fires `onStart`, validates update types, then freezes `bot.use` (`grammY/src/bot.ts:428`, `grammY/src/bot.ts:443`, `grammY/src/bot.ts:463`, `grammY/src/bot.ts:468`). The loop uses `offset = lastTriedUpdateId + 1` and a default 30-second timeout (`grammY/src/bot.ts:547`, `grammY/src/bot.ts:585`). Batches are handled **sequentially**; `stop()` makes a final `getUpdates` with the advanced offset (`grammY/src/bot.ts:334`, `grammY/src/bot.ts:494`). On polling errors 401/409 rethrow, 429 sleeps for `retry_after`, others retry after three seconds (`grammY/src/bot.ts:609`, `grammY/src/bot.ts:611`, `grammY/src/bot.ts:613`, `grammY/src/bot.ts:619`).

The source limits this runner to small bots (~5K messages/hour) and recommends `@grammyjs/runner` for high load or long handlers (`grammY/src/bot.ts:410`, `grammY/src/bot.ts:413`); that package is outside the snapshot: `not verified`. `isRunning()` reports only built-in polling, not webhooks or an external runner (`grammY/src/bot.ts:521`).

`webhookCallback(bot, adapter, options)` returns a framework handler (`grammY/src/convenience/webhook.ts:106`). It rejects polling by replacing `bot.start()` with a throwing stub (`grammY/src/convenience/webhook.ts:146`). Each request initializes once, checks the secret-token header by constant-time comparison, then calls `bot.handleUpdate` with a reply envelope; default timeout is 10 seconds (`grammY/src/convenience/webhook.ts:167`, `grammY/src/convenience/webhook.ts:170`, `grammY/src/convenience/webhook.ts:182`, `grammY/src/convenience/webhook.ts:29`). Webhooks suit an existing HTTP host; polling a standalone process.

## Middleware and matching

Middleware is flattened and concatenated (`grammY/src/composer.ts:198`, `grammY/src/composer.ts:201`); `bot.use(...)` appends it and returns a composer for chaining (`grammY/src/composer.ts:227`). `handleUpdate` builds a fresh `Context`, runs the stack, and wraps rejections in a `BotError` with the context (`grammY/src/bot.ts:384`, `grammY/src/bot.ts:387`, `grammY/src/bot.ts:390`).

`bot.on` compiles a colon-separated query to a type-narrowing predicate (`grammY/src/composer.ts:283`, `grammY/src/composer.ts:287`): `message:text`, `:text`, or `::url` for text/caption (`grammY/src/composer.ts:244`, `grammY/src/composer.ts:250`, `grammY/src/composer.ts:256`). Arrays mean OR, chained `.on` calls AND (`grammY/src/composer.ts:267`, `grammY/src/composer.ts:277`); predicates are cached (`grammY/src/filter.ts:40`). `bot.hears` matches strings or regexes in text and captions (`grammY/src/composer.ts:325`). `bot.command` matches a leading `/command`, not mid-text or captions, exposing the remainder as `ctx.match` (`grammY/src/composer.ts:339`, `grammY/src/composer.ts:354`). Commands also fire in channel posts: use `ctx.msg` when `ctx.message` must exist (`grammY/src/composer.ts:364`). `bot.reaction` needs `message_reaction` enabled (`grammY/src/bot.ts:282`).

## Sessions and conversations

Session middleware loads per-chat data into `ctx.session` before downstream middleware and writes it back afterwards (`grammY/src/convenience/session.ts:175`, `grammY/src/convenience/session.ts:197`). The default key is `ctx.chatId`; override with `getSessionKey` (`grammY/src/convenience/session.ts:139`). Always pass `initial`, and use a `storage` adapter in production: the default memory store dies with the process (`grammY/src/convenience/session.ts:120`, `grammY/src/convenience/session.ts:152`). `SessionFlavor<S>` types `ctx.session` (`grammY/src/convenience/session.ts:19`). Multi-step flows can store a step in the session; the conversations plugin is outside this snapshot: `not verified` (`grammY/src/mod.ts:25`).

## Helpers, errors, deployment

`Keyboard` and `InlineKeyboard` are fluent builders over two-dimensional button arrays (`grammY/src/convenience/keyboard.ts:55`, `grammY/src/convenience/keyboard.ts:712`); `row()`, `url()`, `text()` add rows and buttons, and callbacks can be caught with `bot.on("callback_query:data", ...)` (`grammY/src/convenience/keyboard.ts:752`, `grammY/src/convenience/keyboard.ts:817`). `InlineQueryResultBuilder` builds typed inline results whose content is chained with `.text(...)` or `.rich(...)`, then passed to `ctx.answerInlineQuery` (`grammY/src/convenience/inline_query.ts:172`, `grammY/src/convenience/inline_query.ts:176`).

Telegram errors expose `error_code`, `description`, `parameters`, method, and payload (`grammY/src/core/error.ts:16`, `grammY/src/core/error.ts:20`, `grammY/src/core/error.ts:24`); transport failures use `HttpError` (`grammY/src/core/error.ts:78`). The default handler logs, stops polling, and rethrows; `bot.catch` replaces it but has no effect under webhooks or an external runner (`grammY/src/bot.ts:195`, `grammY/src/bot.ts:533`). Use a supervisor for fatal errors.

## Sources

- https://github.com/grammyjs/grammY/blob/e8b3b1b/README.md
- https://github.com/grammyjs/grammY/blob/e8b3b1b/package.json
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/bot.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/composer.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/filter.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/webhook.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/session.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/keyboard.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/inline_query.ts
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/core/error.ts
