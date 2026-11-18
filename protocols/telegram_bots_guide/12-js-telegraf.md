# 12 - JavaScript: Telegraf

Telegraf 4.100.0 (`telegraf/package.json:3`) is a Node.js bot framework in JavaScript or TypeScript (`telegraf/README.md:36`). Its README claims Bot API 7.1 support, typings, low install size, serverless readiness, and http/express/fastify-compatible webhooks (`telegraf/README.md:40`, `telegraf/README.md:41`, `telegraf/README.md:42`, `telegraf/README.md:48`). That badge predates this snapshot's API 10.4, so verify new fields against the raw API (`telegraf/README.md:10`).

## Telegraf class and context

`new Telegraf(token, options)` stores defaults (`contextType: Context`, `handlerTimeout: 90_000`) and builds a `Telegram` client for raw API calls (`telegraf/src/telegraf.ts:20`, `telegraf/src/telegraf.ts:160`, `telegraf/src/telegraf.ts:169`). Providing `botInfo` avoids the implicit `getMe` on launch (`telegraf/src/telegraf.ts:115`). Each update gets a `Context` with `update`, `botInfo`, `telegram`, and shorthands `reply`, `answerCbQuery`, `sendMessage` (`telegraf/README.md:132`, `telegraf/README.md:134`, `telegraf/src/context.ts:439`). Keep the token in an environment variable (`telegraf/README.md:57`).

```js
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.start((ctx) => ctx.reply('Welcome'))
bot.on(message('sticker'), (ctx) => ctx.reply('sticker'))
bot.command('ping', (ctx) => ctx.reply('pong'))
bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
```

This follows the README example and its SIGINT/SIGTERM graceful stop (`telegraf/README.md:54`, `telegraf/README.md:60`, `telegraf/README.md:62`, `telegraf/README.md:65`). Handlers can use `ctx.reply(...)` or `ctx.telegram.sendMessage(ctx.message.chat.id, ...)`; callback queries offer `ctx.answerCbQuery()` and the explicit API call (`telegraf/README.md:173`, `telegraf/README.md:181`, `telegraf/README.md:189`).

## Handler registration and filters

`Telegraf` extends `Composer`, whose `on`, `hears`, `command`, `action`, `inlineQuery`, `start`, and `help` methods delegate to `use` (`telegraf/src/telegraf.ts:110`, `telegraf/src/composer.ts:92`, `telegraf/src/composer.ts:137`, `telegraf/src/composer.ts:264`). `on` accepts an update type, a message subtype, or a type guard from `telegraf/filters` (`telegraf/src/composer.ts:101`). `message('sticker')` checks the `message` key and requested message keys, yielding a narrowed context (`telegraf/src/filters.ts:29`, `telegraf/src/filters.ts:31`); `anyOf` and `allOf` compose guards (`telegraf/src/filters.ts:92`, `telegraf/src/filters.ts:102`).

`hears` combines the text guard with a string/RegExp matcher, exposing `ctx.match` (`telegraf/src/composer.ts:692`, `telegraf/src/composer.ts:700`). `command` filters text, requires a leading `bot_command` entity at offset zero, and handles `/cmd@botname` (`telegraf/src/composer.ts:708`, `telegraf/src/composer.ts:731`). `Composer.compose` runs handlers in order and throws if `next()` is called twice (`telegraf/src/composer.ts:924`, `telegraf/src/composer.ts:940`, `telegraf/src/composer.ts:946`); `bot.use(...)` appends to that chain (`telegraf/src/composer.ts:72`).

## Sessions and scenes

`session()` adds `ctx.session`; the default key is `${ctx.from.id}:${ctx.chat.id}`, so a missing `from` or `chat` means no session (`telegraf/src/session.ts:35`, `telegraf/src/session.ts:37`, `telegraf/src/session.ts:38`). Options cover `property`, `getSessionKey`, `store`, and `defaultSession` (`telegraf/src/session.ts:24`). The default store is memory-only and lost on restart; persist via `@telegraf/session` or a custom `store` (`telegraf/src/session.ts:40`, `telegraf/src/session.ts:42`, `telegraf/src/session.ts:57`). Writes occur only when the session was touched (`telegraf/src/session.ts:152`).

For multi-step flows, `BaseScene` is a `Composer` with `id`, optional `ttl`, and separate `enter`/`leave` middleware (`telegraf/src/scenes/base.ts:14`, `telegraf/src/scenes/base.ts:33`). `Stage` maps scenes, injects `ctx.scene`, delegates lazily to the current scene, and is gated on session context (`telegraf/src/scenes/stage.ts:11`, `telegraf/src/scenes/stage.ts:44`, `telegraf/src/scenes/stage.ts:49`). Scene state lives under `ctx.session.__scenes`; `enter`, `reenter`, and `leave` are the transitions (`telegraf/src/scenes/context.ts:53`, `telegraf/src/scenes/context.ts:85`, `telegraf/src/scenes/context.ts:110`, `telegraf/src/scenes/context.ts:117`). Session, `Markup`, and `Scenes` are root exports (`telegraf/src/index.ts:11`, `telegraf/src/index.ts:17`, `telegraf/src/index.ts:19`).

## Polling, webhooks, errors

`bot.launch()` calls `getMe`, then either deletes the webhook and starts `Polling`, or calls `setWebhook` and starts an http/https server on the configured path/port/host (`telegraf/src/telegraf.ts:306`, `telegraf/src/telegraf.ts:313`, `telegraf/src/telegraf.ts:324`, `telegraf/src/telegraf.ts:326`). Options include `allowedUpdates`, `dropPendingUpdates`, `secretToken`, `certificate`, and `maxConnections` (`telegraf/src/telegraf.ts:61`, `telegraf/src/telegraf.ts:99`); the default path is hashed from the token (`telegraf/src/telegraf.ts:223`, `telegraf/src/telegraf.ts:278`). For an existing server, `createWebhook({domain,...})` sets the webhook and returns an express-style callback; `webhookCallback` can be mounted directly (`telegraf/src/telegraf.ts:203`, `telegraf/src/telegraf.ts:233`, `telegraf/src/telegraf.ts:240`). `bot.stop()` closes the server or stops polling and throws if nothing runs (`telegraf/src/telegraf.ts:338`).

Each update is wrapped in a context and run under a 90-second `pTimeout`; errors reach `handleError`, and an unfinished webhook response is ended in `finally` (`telegraf/src/telegraf.ts:349`, `telegraf/src/telegraf.ts:362`, `telegraf/src/telegraf.ts:367`, `telegraf/src/telegraf.ts:369`). The default handler logs, sets `process.exitCode = 1`, and rethrows; `bot.catch` replaces it, but the README warns against swallowing unknown errors and recommends `systemd`/`pm2` restarts (`telegraf/src/telegraf.ts:151`, `telegraf/src/telegraf.ts:194`, `telegraf/README.md:267`, `telegraf/README.md:273`).

Tradeoffs: sessions and scenes ship in core, with webhook adapters for several Node frameworks; the README still claims API 7.1, and the `telegram` option is deprecated in favor of `api`/`webhookReply` for v6 (`telegraf/src/telegraf.ts:37`). Versus grammY, Telegraf centralizes launch/webhook setup in `launch()` and keeps scenes in the main package, while grammY's concurrent runner is separate.

## Sources

- https://github.com/telegraf/telegraf/blob/1386cc4/README.md
- https://github.com/telegraf/telegraf/blob/1386cc4/package.json
- https://github.com/telegraf/telegraf/blob/1386cc4/src/telegraf.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/composer.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/filters.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/session.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/scenes/stage.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/scenes/context.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/context.ts
