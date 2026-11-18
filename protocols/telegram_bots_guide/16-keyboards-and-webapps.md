# 16 - Keyboards and Web Apps

## Two keyboard families

A reply keyboard is attached to a message and replaces the input area with predefined options: text buttons send their label, while other buttons request a user, chat, location, contact or poll, or open a Mini App (`bots/features.md:104-107`). `one_time_keyboard` hides it after one use and `input_field_placeholder` labels the input field (`bots/features.md:113-115`). An inline keyboard sits below its message; pressing its buttons does not send a chat message, but fires a callback, opens a link, switches to inline mode, launches a game, pays an invoice, copies text, or does nothing (`bots/features.md:117-120`). `sendMessage` takes either family, or `ReplyKeyboardRemove`/`ForceReply`, in `reply_markup` (`bots/api/methods/sendmessage.md:24`).

## Button types and their constraints

An `InlineKeyboardButton` must use exactly one action field besides `text`, `icon_custom_emoji_id` and `style` (`bots/api/types/inlinekeyboardbutton.md:5`). `url` accepts HTTP or `tg://`, including `tg://user?id=<user_id>` mentions where privacy settings allow it (`:12`). `callback_data` is 1-64 **bytes** (`:13`). `web_app` launches a Mini App, is available only in private chats with the bot, and is unsupported for business-account messages and ephemeral messages (`:14`). `login_url` is an HTTPS URL for implicit authorization (`:15`). Three `switch_inline_query` variants insert the bot's username plus a query into a chosen chat, the current chat, or a chat of a selected type (`:16-20`). `copy_text` copies to the clipboard (`:21`); `callback_game` and `pay` must each be the first button in the first row, with `pay` valid only in invoice messages (`:22-27`); `disabled` renders an inert button (`:28`).

## `callback_data` design and handling

Because only 64 bytes fit, treat `callback_data` as an opaque token, not a payload: keep the button's real state in your database and encode a short command plus identifier. Arbitrary Python objects need a cache; python-telegram-bot ships `CallbackDataCache` and raises `InvalidCallbackData` for tampered or expired values (`python-telegram-bot/src/telegram/ext/_callbackdatacache.py:47-49`). grammY provides fluent row builders for both keyboard families (`grammY/src/convenience/keyboard.ts:712-728`). A callback query carries `id`, `from`, `data` or `game_short_name`, and either `message` or `inline_message_id`, so the same handler must cover bot-sent and inline messages (`bots/api/types/callbackquery.md:5-15`). Never trust `data` as authoritative: the source message may contain no button with that value (`:14`).

## Answering callbacks

Clients show a progress bar after a callback button is pressed until `answerCallbackQuery` is called, so answer even when no notification is wanted (`bots/api/types/callbackquery.md:17`). The method accepts `callback_query_id`, optional `text` of 0-200 characters, `show_alert`, `url`, and `cache_time` (default 0) that lets the client cache the answer (`bots/api/methods/answercallbackquery.md:5-17`). A `url` answer can open a game URL or a `t.me/your_bot?start=XXXX` deep link (`:7,14-16`).

## Keyboard state and editing

Reply keyboards are replaced by sending another message with new markup or by `ReplyKeyboardRemove`; they are not remotely mutated in place. Inline keyboards should be updated on the same message: edit the markup instead of sending a replacement and deleting the old message, which is faster and smoother (`bots/features.md:126`). `editMessageReplyMarkup` takes `chat_id` + `message_id` or `inline_message_id` and a new `InlineKeyboardMarkup`; it returns the edited message for normal messages and `True` for inline ones (`bots/api/methods/editmessagereplymarkup.md:5-13`). Treat the keyboard as a view of server-side state: recompute it from the same state the callback handler updated, and accept that concurrent taps can deliver stale views.

## Web Apps

Telegram lists seven launch paths for Mini Apps: profile button, reply-keyboard button, inline button, menu button, inline mode, direct link and attachment menu (`bots/webapps.md:242`). A `web_app` reply button opens the URL and the app returns data with `Telegram.WebApp.sendData`, delivered as a service message with no external server in the loop (`:250-256`). An inline `web_app` button additionally receives theme settings, basic user data and a session `query_id`; the bot calls `answerWebAppQuery` to send an inline message on behalf of the user and close the app (`:265-271`, `bots/api/methods/answerwebappquery.md:5`). Include the script before other scripts; `Telegram.WebApp.initData` is the raw string to validate, while `initDataUnsafe` is a parsed convenience object that must not be trusted (`bots/webapps.md:398-411`).

`WebAppInitData` carries optional `query_id`, `user`, `receiver`, `chat`, `chat_type`, `chat_instance`, `start_param`, `can_send_after`, plus `auth_date`, `hash` and `signature` (`bots/webapps.md:980-999`). `query_id` is required by `answerWebAppQuery` and `can_send_after` gives the delay before a message may be sent (`:986,996`). Validation is HMAC-SHA-256: derive the secret from HMAC(bot token, `WebAppData`), build the alphabetically sorted `key=value` data-check-string joined by newline, and compare its hex HMAC to `hash`; also check `auth_date` to reject stale data (`bots/webapps.md:1032-1051`). For third parties, verify the base64url Ed25519 `signature` against the Telegram public key over a string prefixed with `<bot_id>:WebAppData`, still excluding `hash` and `signature` (`bots/webapps.md:1055-1086`).

## Common pitfalls

- `callback_data` is byte-limited, not character-limited: UTF-8 non-ASCII text consumes more bytes (`bots/api/types/inlinekeyboardbutton.md:13`).
- Setting two action fields on one button is invalid; use two buttons (`bots/api/types/inlinekeyboardbutton.md:5`).
- Forgetting to answer a callback leaves the client spinner running (`bots/api/types/callbackquery.md:17`).
- Using `initDataUnsafe` as proof of identity, or skipping `auth_date`, defeats validation (`bots/webapps.md:410-411,1049`).
- `web_app` inline buttons are unavailable in groups, channels and business messages; use a reply-keyboard Mini App or a link there (`bots/api/types/inlinekeyboardbutton.md:14`).
- `answerWebAppQuery` needs the session `query_id` and may be rate-limited by `can_send_after` (`bots/webapps.md:986,996`).

## Sources

- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/api/methods/sendmessage
- https://core.telegram.org/bots/api/methods/answercallbackquery
- https://core.telegram.org/bots/api/methods/answerwebappquery
- https://core.telegram.org/bots/api/methods/editmessagereplymarkup
- https://core.telegram.org/bots/api/types/inlinekeyboardbutton
- https://core.telegram.org/bots/api/types/callbackquery
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/keyboard.ts
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_callbackdatacache.py
