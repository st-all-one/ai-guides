# 18 - Payments, Stars and Widgets

## Two stable payment worlds

Payments 2.0 splits by what is sold. Physical goods and services use a provider token from @BotFather - a bot may hold several tokens for different users or goods (`bots/payments.md:86-91`). Digital goods and services must be sold in Telegram Stars, currency tag `XTR`; users acquire Stars through Apple or Google in-app purchases or @PremiumBot, and no personal or card details are entered in Telegram's checkout (`bots/payments-stars.md:8,40-50`). Both paths are exposed by the same Bot API methods: `sendInvoice`, `createInvoiceLink`, `answerShippingQuery` and `answerPreCheckoutQuery` (`bots/api.md:425-438`). Digital invoices require `provider_token` to be an empty string and `currency` to be `XTR` (`bots/api/methods/sendinvoice.md:15-17`).

## Invoice and checkout flow

`sendInvoice` requires `chat_id`, `title` (1-32 characters), `description` (1-255), `payload` (1-128 bytes) and a `prices` breakdown; Star invoices need exactly one price item (`bots/api/methods/sendinvoice.md:9-17`). `createInvoiceLink` returns a shareable URL with the same core fields (`bots/api/methods/createinvoicelink.md:5-15`). Physical invoices can request name, email, phone and shipping address, offer tips with `max_tip_amount`/`suggested_tip_amounts`, and provide `is_flexible` delivery options; those fields are ignored for Stars (`bots/api/methods/sendinvoice.md:18-29`, `bots/payments.md:120-138`). Subscriptions are constrained: `subscription_period` must currently be 2592000 seconds (30 days), requires `XTR`, and the price may not exceed 10000 Stars (`bots/api/methods/createinvoicelink.md:16`).

Forwarding behavior is chosen with `start_parameter`: empty means forwarded copies keep a Pay button usable by multiple buyers; non-empty means copies show a deep-link URL button instead (`bots/api/methods/sendinvoice.md:20`, `bots/payments-stars.md:112-123`). Inline invoices are always multi-chat (`bots/payments-stars.md:104-106`).

The two answers are different stages. `answerShippingQuery` replies to an optional `shipping_query` raised when a shipping address was requested with `is_flexible`: pass `ok` with `shipping_options`, or an `error_message` explaining why delivery is impossible (`bots/api/methods/answershippingquery.md:5-12`). `answerPreCheckoutQuery` replies to the final `pre_checkout_query` within **10 seconds** or the transaction is cancelled; `error_message` is required when `ok` is false (`bots/api/methods/answerprecheckoutquery.md:5-11`, `bots/payments-stars.md:125-130`). Answering pre-checkout is not delivery: only a `successful_payment` message proves payment succeeded, and goods must be released then (`bots/payments-stars.md:134-137`). Reuse the invoice `payload` to reconcile that message with your order record.

## Refunds, balances and subscriptions

`refundStarPayment` takes `user_id` and the `telegram_payment_charge_id` from the successful payment (`bots/api/methods/refundstarpayment.md:5-10`, `bots/payments-stars.md:190-192`). `getMyStarBalance` returns a `StarAmount` with no parameters, and `getStarTransactions` pages through transactions with `offset` and `limit` of 1-100 (`bots/api/methods/getmystarbalance.md:5`, `bots/api/methods/getstartransactions.md:5-10`). `editUserStarSubscription` cancels or re-enables renewal for an active Star subscription using the same charge identifier (`bots/api/methods/edituserstarsubscription.md:5-11`). Stars may be spent on ads or received as rewards under the bot developer terms (`bots/payments-stars.md:194-198`).

## Gifts and paid media (present in this snapshot)

Paid media lets a bot post photos and videos that viewers unlock by paying, in chats where the bot can send messages including channels with the permission and Business Connection chats (`bots/features.md:441-442`). `sendPaidMedia` takes `star_count` of 1-25000 and up to 10 `InputPaidMedia` items, with an optional hidden 0-128 byte `payload`, caption and entities (`bots/api/methods/sendpaidmedia.md:5-15`). For a channel chat, proceeds go to the channel balance rather than the bot (`bots/api/methods/sendpaidmedia.md:10`). Gifts are available through `sendGift` to a user or channel; the receiver cannot convert that gift back to Stars (`bots/api/methods/sendgift.md:5-11`). Bot API 10.4 added `getUniqueGift` and `deleteBusinessAccountGift`; converting a regular business gift to Stars needs the `can_convert_gifts_to_stars` business right (`bots/api-changelog.md:56-59`, `bots/api/methods/convertgifttostars.md:5-10`).

## Widgets: Bot API 10.4, very new

Widgets were introduced on **November 9, 2026** in Bot API 10.4 and are a different primitive from Mini Apps: a widget is fixed HTML inside the message bubble, sandboxed in QuickJS with no network access, and it talks to the bot only through queries relayed by Telegram (`bots/api-changelog.md:15-32`, `bots/widgets.md:26-33`). A Mini App is a hosted web view with signed `initData`; a widget is at most 32 KB of HTML with code that never changes after sending (`bots/widgets.md:62-77`). The code is immutable; only bot-written `chat_data` and `public_data` state changes (`bots/widgets.md:16-22`).

`sendWidget` sends new HTML (1-32768 bytes, at most 4096 bytes after zlib level 9), with optional `width`, `height`, `public_data`, `chat_data`, `allow_queries` and `is_shared` (`bots/api/methods/sendwidget.md:5-21`). `is_shared` creates one server-side object like a poll; re-send it with `sendSharedWidget` and its `widget_id` (`bots/api/methods/sendsharedwidget.md:5-12`, `bots/widgets.md:258-274`). A request from the widget arrives as a `widget_query`; the bot answers with `answerWidgetQuery` within **15 seconds** with up to 1024 bytes, but that answer does not change state - use the edit-data methods (`bots/api/methods/answerwidgetquery.md:5-10`, `bots/widgets.md:327-329`). Limits are strict: 5 requests per user and bot per 5 seconds, one in flight per widget, 1024-byte states, and a 300 ms/second CPU budget (`bots/widgets.md:653-677`).

## Stability boundary, honestly

Payments, Stars, invoices, refunds and `answerPreCheckoutQuery` are long-standing Bot API surfaces; use them in production. Widgets are brand-new in 10.4 and only partially available: in production they work solely in the private chat with the bot, cannot be forwarded, and group, inline and forwarded-widget requests remain test-server-only (`bots/widgets.md:46-60`, `bots/api-changelog.md:22-31`). `sendWidget` messages are automatically protected from forwarding, and widgets cannot be copied with `copyMessage`/`copyMessages` (`bots/api/methods/sendwidget.md:5`, `bots/api-changelog.md:31`). Plan for changes and gate widget features behind a capability check.

## Sources

- https://core.telegram.org/bots/payments
- https://core.telegram.org/bots/payments-stars
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/api-changelog
- https://core.telegram.org/bots/widgets
- https://core.telegram.org/bots/api/methods/sendinvoice
- https://core.telegram.org/bots/api/methods/answerprecheckoutquery
- https://core.telegram.org/bots/api/methods/refundstarpayment
- https://core.telegram.org/bots/api/methods/sendwidget
