# 04 - Antiflood and Limits

## The flood signal

Exceeding flood control produces an HTTP 429 whose JSON body has `ok: false` and may include a `parameters` object (`bots/api.md:29`). That object is a `ResponseParameters` with an optional `retry_after` field defined as the number of seconds left to wait before the request can be repeated (`bots/api/types/responseparameters.md:5`; `bots/api/types/responseparameters.md:10`). The sibling field `migrate_to_chat_id` handles group-to-supergroup migration and is not a rate-limit signal; it may exceed 32 bits, so store identifiers in 64-bit integers (`bots/api/types/responseparameters.md:9`). A client must therefore inspect `parameters.retry_after`, not just the status code. The serverless SDK surfaces the same data as `BotApiError.parameters`, explicitly documented to contain `retry_after` on a 429 (`bots/serverless.md:777`). No interval value should be assumed: Telegram's test-environment note explicitly warns that flood limits are not raised there, may be stricter, and that bots should handle errors with retry policies rather than depend on hardcoded limit values (`bots/features.md:968`).

## Documented ceilings

| Scope | Limit | Source |
|---|---|---|
| One chat | about one message per second; bursts tolerated until 429 | `bots/faq.md:124` |
| One group | no more than 20 messages per minute | `bots/faq.md:125` |
| Bulk broadcast | about 30 messages per second by default | `bots/faq.md:126` |
| Paid broadcast | up to 1000 messages per second | `bots/api.md:215` |
| Paid broadcast cost | 0.1 Stars per message above the free allowance | `bots/api.md:217` |
| Sticker upload via URL | 5 MB photos, 20 MB other | `bots/api.md:112` |
| Multipart upload | 10 MB photos, 50 MB other | `bots/api.md:113` |

There is a documented discrepancy in the paid-broadcast prerequisites: the API reference says a bot needs at least 10,000 Stars on its balance (`bots/api.md:217`), while the FAQ states at least 100,000 Stars and 100,000 monthly active users (`bots/faq.md:131`). Both lines are captured; do not treat either threshold as a verified requirement for your bot without checking the live answer from BotFather. Only successfully delivered paid broadcasts are charged (`bots/api.md:219`). Local Bot API servers remove some file limits but introduce their own startup ramp: `close` returns 429 during the first ten minutes after a local instance is launched, and a cloud logout blocks re-login for ten minutes (`bots/api/methods/close.md:5`; `bots/api/methods/logout.md:5`).

## Backoff, jitter and retry storms

The only sanctioned waiting time is `retry_after`; when it is present, sleep at least that long. When it is absent, use exponential backoff with full jitter, for example `sleep = min(cap, base * 2**attempt) * random(0.5, 1.5)`, because the docs ask for retry policies rather than fixed values (`bots/features.md:968`). Cap attempts and give up on a dead letter queue: unbounded retries turn a transient flood into a self-inflicted denial of service. Do not retry deterministic 4xx failures such as a malformed `chat_id` or text over 4096 characters (`bots/api/methods/sendmessage.md:14`); retry only 429 and transient transport failures. Jitter matters most when many workers share one bot: synchronized timers create a retry storm that re-triggers the same limit. Spread bulk notifications over longer intervals when paid broadcasts are not enabled — the FAQ suggests eight to twelve hours for large audiences (`bots/faq.md:134`).

Because webhook delivery is retried by Telegram for any non-`2XY` response before eventually giving up, a slow endpoint can amplify load on both sides (`bots/api/methods/setwebhook.md:5`). Acknowledge the POST quickly and move work to a queue. Gateway-style 502 and 503 replies are transport statuses, not documented Bot API error codes in this snapshot (`not verified`); treat them as transient non-2XX responses with the same bounded, jittered backoff rather than as sources of a `retry_after` value.

## Serialize and batch

The per-chat ceiling of roughly one message per second means a per-`chat_id` queue is the simplest correct design: one worker drains each chat serially, while different chats proceed in parallel up to the global broadcast limit (`bots/faq.md:124`; `bots/faq.md:126`). A single global mutex would needlessly serialize unrelated chats; a single unbounded pool would violate the per-chat rule. Batch methods reduce request count: `sendMediaGroup` takes 2-10 items (`bots/api/methods/sendmediagroup.md:13`), while `forwardMessages` and `copyMessages` each take 1-100 identifiers in strictly increasing order (`bots/api/methods/forwardmessages.md:13`; `bots/api/methods/copymessages.md:13`) and `deleteMessages` takes 1-100 identifiers (`bots/api/methods/deletemessages.md:10`). `setMyCommands` accepts at most 100 commands, and `deleteAllMessageReactions` can remove up to 10000 recent reactions (`bots/api/methods/setmycommands.md:9`; `bots/api.md:385`). Chunk larger inputs to these documented sizes rather than discovering the boundary through 429s.

```python
async def call(method, params, chat_key=None):
    for attempt in range(6):
        r = await post(method, params)          # serialized per chat_key upstream
        if r.get("ok"):
            return r["result"]
        wait = r.get("parameters", {}).get("retry_after")
        if r.get("error_code") != 429:
            raise ApiError(r)
        await sleep(wait or jitter(attempt))
    raise FloodExhausted(method)
```

## Queues and retention

Undelivered updates are held for at most 24 hours (`bots/api.md:59`). A durable queue with bounded retries should therefore record `update_id`, the intended method and attempt count; anything older than the retention window cannot be replayed from Telegram. File transfers have their own ceilings — the URL path allows 5 MB for photos and 20 MB otherwise, multipart allows 10 MB and 50 MB, and a local server permits uploads up to 2000 MB (`bots/api.md:112`; `bots/api.md:113`; `bots/api.md:45`). Exceeding them fails before flood control is involved, so validate sizes locally to avoid wasted requests.

## Sources

- https://core.telegram.org/bots/faq
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/api/types/responseparameters
- https://core.telegram.org/bots/api/methods/sendmediagroup
- https://core.telegram.org/bots/api/methods/close
- https://core.telegram.org/bots/api/methods/forwardmessages
- https://core.telegram.org/bots/api
