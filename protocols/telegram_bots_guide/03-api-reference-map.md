# 03 - API Reference Map

## Measured shape of the reference

The captured snapshot contains 191 per-method subpages and 9 per-type subpages under `/bots/api/methods/` and `/bots/api/types/`; this count is measured from the 2026-11-18 capture (`bots/api.md:3`; `bots/api.md:178`). The nine type pages are `update`, `photosize`, `video`, `callbackquery`, `inlinekeyboardbutton`, `inlinequeryresultgame`, `botcommand`, `game` and `responseparameters`. The parent page states that all types are listed at the Bot API types page and that all response types are JSON objects (`bots/api.md:3`; `bots/api.md:71`). Because only a small subset of types has its own captured page, most type definitions live inline in the full reference.

The parent page is organized by feature area rather than alphabetically. Its section headers include Available types (`bots/api.md:70`), Available methods (`bots/api.md:178`), Formatting options (`bots/api.md:188`), Paid Broadcasts (`bots/api.md:213`), Inline mode methods (`bots/api.md:355`), Updating messages (`bots/api.md:359`), Stickers (`bots/api.md:387`), Rich messages (`bots/api.md:410`), Inline mode (`bots/api.md:414`), Payments (`bots/api.md:425`), Telegram Passport (`bots/api.md:440`) and Games (`bots/api.md:448`). A reader looking for a send operation starts at Available methods; a reader debugging an inbound payload starts at `Update`.

## Anatomy of a method subpage

Every per-method page follows the same template: a level-one title, a canonical-location note linking back to the full reference, a description with the return type, a parameter table with the columns Parameter, Type, Required and Description, and optional Notes at the end. `sendMessage` illustrates all of these: title and canonical note (`bots/api/methods/sendmessage.md:1`; `bots/api/methods/sendmessage.md:3`), description and `Message` return type (`bots/api/methods/sendmessage.md:5`), parameter header (`bots/api/methods/sendmessage.md:7`) and the `text` row (`bots/api/methods/sendmessage.md:14`). `getUpdates` adds two numbered notes about webhook exclusivity and duplicate avoidance (`bots/api/methods/getupdates.md:16`; `bots/api/methods/getupdates.md:17`; `bots/api/methods/getupdates.md:18`). Type pages use a Field / Type / Description table instead, as `Update` demonstrates (`bots/api/types/update.md:8`; `bots/api/types/update.md:10`).

## Parameter conventions

Parameters use snake_case names and carry explicit types such as `Integer`, `String`, `Boolean`, `Array of String` or a linked object (`bots/api/methods/getupdates.md:7`; `bots/api/methods/getupdates.md:12`). `Required` is Yes or Optional, and optional fields may be omitted when irrelevant (`bots/api/methods/sendmessage.md:10`; `bots/api.md:75`). Composite values are sent as JSON-serialized arrays or objects: `entities` is an array of `MessageEntity`, `reply_parameters` is a `ReplyParameters` object, and `reply_markup` is a union of four markup objects (`bots/api/methods/sendmessage.md:16`; `bots/api/methods/sendmessage.md:23`; `bots/api/methods/sendmessage.md:24`). `chat_id` accepts either an integer or an `@username` string (`bots/api/methods/sendmessage.md:10`). All methods are case-insensitive, and parameters may be passed by query string, urlencoded form, JSON or multipart depending on whether a file is present (`bots/api.md:180`).

## Uploads: multipart, file_id or URL

There are exactly three ways to send a file (`bots/api.md:109`). Reuse a `file_id` already stored on Telegram: no re-upload, no size limit, but the type cannot change and the identifier is bound to one bot (`bots/api.md:111`; `bots/api.md:117`; `bots/api.md:120`; `bots/api.md:121`). Supply an HTTP URL, which Telegram fetches: 5 MB for photos and 20 MB for other content, with a correct MIME type required (`bots/api.md:112`; `bots/api.md:125`). Post raw bytes as `multipart/form-data`: 10 MB for photos and 50 MB for other files (`bots/api.md:113`). Local servers raise the upload ceiling to 2000 MB (`bots/api.md:45`). The `certificate` parameter of `setWebhook` must be an `InputFile`, so a string will not work (`bots/api/methods/setwebhook.md:12`; `bots/api/methods/setwebhook.md:22`). The serverless SDK exposes the same distinction through `InputFile` byte holders and streams uploads as real multipart data (`bots/serverless.md:797`; `bots/serverless.md:812`).

## Return types

Read the return type from the first sentence of each method page. Plain acknowledgement methods return `True`: `setWebhook`, `deleteWebhook`, `answerCallbackQuery` and `logOut` (`bots/api/methods/setwebhook.md:5`; `bots/api/methods/deletewebhook.md:5`; `bots/api/methods/answercallbackquery.md:5`; `bots/api/methods/logout.md:5`). Object results include `Message` from `sendMessage`, `File` from `getFile`, `WebhookInfo` from `getWebhookInfo`, and arrays such as the `Array of Update` from `getUpdates` or the `Array of Message` from `sendMediaGroup` (`bots/api/methods/sendmessage.md:5`; `bots/api/methods/getfile.md:5`; `bots/api/methods/getwebhookinfo.md:5`; `bots/api/methods/getupdates.md:5`; `bots/api/methods/sendmediagroup.md:5`). Code should branch on the JSON `ok` flag before touching `result` (`bots/api.md:29`).

## Text formatting

`sendMessage` accepts 1-4096 characters after entities parsing and offers two ways to mark up text: `parse_mode` delegating parsing to Telegram, or `entities` supplying a JSON list of `MessageEntity` objects (`bots/api/methods/sendmessage.md:14`; `bots/api/methods/sendmessage.md:15`; `bots/api/methods/sendmessage.md:16`). The full formatting rules live on a dedicated page referenced by the parent reference (`bots/api.md:190`). Link preview behaviour is separate, via `link_preview_options` (`bots/api/methods/sendmessage.md:17`).

## Method families to navigate

| Family | Representative methods | Anchor |
|---|---|---|
| Updates | `getUpdates`, `setWebhook`, `deleteWebhook`, `getWebhookInfo` | `bots/api.md:65` |
| Messaging | `sendMessage`, `sendPhoto`, `sendDocument`, `sendMediaGroup` | `bots/api.md:186`; `bots/api.md:225` |
| Chat administration | `banChatMember`, `setChatPermissions`, `getChatMember` | `bots/api.md:250`; `bots/api.md:280` |
| Message editing | `editMessageText`, `editMessageMedia`, `deleteMessage` | `bots/api.md:365`; `bots/api.md:381` |
| Forum and business | `createForumTopic`, `readBusinessMessage` | `bots/api.md:286`; `bots/api.md:329` |
| Stickers | `sendSticker`, `createNewStickerSet` | `bots/api.md:393` |
| Inline and payments | `answerInlineQuery`, `sendInvoice` | `bots/api.md:423`; `bots/api.md:429` |

## Sources

- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/api/methods/sendmessage
- https://core.telegram.org/bots/api/methods/sendmediagroup
- https://core.telegram.org/bots/api/methods/getupdates
- https://core.telegram.org/bots/api/types/update
- https://core.telegram.org/bots/api/methods/getfile
