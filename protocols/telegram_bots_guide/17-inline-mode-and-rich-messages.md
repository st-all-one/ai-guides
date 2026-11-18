# 17 - Inline Mode and Rich Messages

## Inline lifecycle

Inline mode lets a user type `@bot query` in the input field of **any** chat; the query reaches the bot as an update and no message is sent until the user picks a result (`bots/inline.md:8`). Enable it with `/setinline` and a placeholder via @BotFather (`bots/inline.md:15`, `bots/api.md:419`). The bot answers with `answerInlineQuery`; on selection the result is immediately sent to the target chat and the input field is cleared (`bots/inline.md:41`). Inline functionality must be enabled in @BotFather or no inline updates arrive (`bots/features.md:182-187`). Optional setup: `/setinlinegeo` asks for location permission (`bots/inline.md:61`); `/setinlinefeedback` delivers chosen-result updates, which can exceed real request counts because of caching, so sample at 1/10 or lower for popular bots (`:80-83`).

## Answering an inline query

`answerInlineQuery` takes `inline_query_id` and a JSON array of results, at most **50 per query** (`bots/api/methods/answerinlinequery.md:5-11`). `cache_time` caps server-side caching in seconds and defaults to **300**; `is_personal` restricts cached results to the requesting user instead of all users with the same text (`:12-13`). `next_offset` tells the client what offset to send for more results; an empty string means no more pages, and the offset is limited to 64 bytes (`:14`). An optional `button` above the results can implement a "Switch to PM" flow for account linking, with a `switch_inline_query` keyboard button returning the user to the original chat (`bots/api/methods/answerinlinequery.md:15`, `bots/inline.md:45-52`). Cache aggressively for deterministic results, set `is_personal` for user-specific data, and keep `cache_time` low where stock or prices change.

## Result shapes and rendering

Inline bots can return all supported content types - stickers, videos, music, locations, documents and more - with vertical or horizontal scrolling depending on type (`bots/inline.md:21-29`). Inline invoices use `inputInvoiceMessageContent` and can be shared into other chats with a reusable Pay button (`bots/payments-stars.md:104-106`). Widget results are an even newer, heavily restricted case and are test-server-only in inline mode (`bots/widgets.md:299-304`). A message sent via the bot shows the bot username next to the sender, and mentioning it inserts the bot name into the input field (`bots/inline.md:66-78`).

Libraries mirror the method directly: grammY exposes `answerInlineQuery(inline_query_id, results, other)` on its API object (`grammY/src/core/api.ts:3745-3751`), while python-telegram-bot's `answer_inline_query` accepts a sequence or a callback computing results for a given offset (`python-telegram-bot/src/telegram/_bot.py:3870-3879`).

## Text formatting: entities versus parse modes

For ordinary text, `sendMessage` accepts `text` of 1-4096 characters after entity parsing and either `parse_mode` or `entities` - a list of `MessageEntity` objects that can be supplied instead of a parse mode (`bots/api/methods/sendmessage.md:14-16`). It also carries `link_preview_options`, `reply_parameters` and `reply_markup` (`:17,23-24`). Regular messages support MarkdownV2 and HTML, which are the right choice for short text, confirmations and simple chat flows (`bots/features.md:900-906`). Rich messages are the structured alternative: Rich Markdown (GitHub Flavored Markdown where possible, with embedded HTML tags) and Rich HTML cover headings, nested inline styles, tables, media blocks, quotes, footnotes, LaTeX and maps or collages (`bots/features.md:872-889`). They also support multiple embedded buttons for interactive flows in one message (`bots/features.md:891`). Choose one style per message and escape user-controlled text rather than concatenating raw markup.

## Media groups

`sendMediaGroup` sends 2-10 photos, live photos, videos, documents or audios as an album (`bots/api/methods/sendmediagroup.md:5-13`). Documents and audio files may only be grouped with messages of the same type, so a mixed photo/document album is invalid (`:5`). The method returns the array of sent messages and accepts the usual `disable_notification`, `protect_content`, `reply_parameters` and other message options (`:5,14-18`). Because an album is several messages, each has its own `message_id`; store all of them if later edits or deletions are needed.

## Editing after delivery

`editMessageText` edits text, rich and game messages, taking `text` or `rich_message` plus `parse_mode`/`entities`, and returns the edited message or `True` for an inline message (`bots/api/methods/editmessagetext.md:5-18`). `editMessageMedia` replaces animation, audio, document, live photo, photo or video content and can turn text or rich messages into media; album members may only be edited within their own type (`:5,13-14`). When editing an inline message, no new file can be uploaded: use a previously uploaded `file_id` or a URL (`bots/api/methods/editmessagemedia.md:5`, `bots/api/methods/editmessagetext.md:17`). Editing a rich inline message likewise cannot directly upload new files (`bots/api/methods/editmessagetext.md:17`). `editMessageReplyMarkup` changes only the inline keyboard, addressed by `chat_id`/`message_id` or `inline_message_id` (`bots/api/methods/editmessagereplymarkup.md:5-13`). Business messages not sent by the bot and without an inline keyboard are editable only within 48 hours (`bots/api/methods/editmessagetext.md:5`).

## Buttons on inline messages

Callbacks originating from a message sent via the bot carry `inline_message_id` instead of `message`, together with `chat_instance` (`bots/api/types/callbackquery.md:5-13`). The `switch_inline_query` button family lets a result send the user into a private chat for setup and back to the original chat to pick again (`bots/api/types/inlinekeyboardbutton.md:16-20`, `bots/inline.md:52`). Rich messages can place buttons inside the content itself, while a normal inline keyboard remains attached below the message (`bots/features.md:891`). For pagination inside an inline result, update the keyboard in place by `inline_message_id` and keep the page index in your own state rather than in `callback_data`.

## Common pitfalls

- Treating 300 seconds of default caching as real-time data; tune `cache_time` (`bots/api/methods/answerinlinequery.md:12`).
- Assuming cached results are private; they are shared unless `is_personal` is set (`:13`).
- Sending more than 50 results or an offset longer than 64 bytes (`:6,14`).
- Mixing media types in a group or trying to upload a fresh file while editing an inline message (`bots/api/methods/sendmediagroup.md:5`, `bots/api/methods/editmessagemedia.md:5`).
- Forgetting that inline feedback volume grows with cache hits (`bots/inline.md:83`).

## Sources

- https://core.telegram.org/bots/inline
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api/methods/answerinlinequery
- https://core.telegram.org/bots/api/methods/sendmessage
- https://core.telegram.org/bots/api/methods/sendmediagroup
- https://core.telegram.org/bots/api/methods/editmessagetext
- https://core.telegram.org/bots/api/methods/editmessagemedia
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/core/api.ts
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/_bot.py
