# 28 - Performance and capacity

Capacity is queueing plus an external budget. Topology, replicas and rollout
are in `21`; the 429 signal and basic backoff are in `04`. This chapter adds
arithmetic, API knobs and per-library tuning. Formulas and engineering advice
here are **derived** unless a line citation says otherwise.

## 1. Capacity model

λ = update arrivals/s, S = mean handler seconds, W = workers, Q = queue depth.
ρ = λS/W; keep ρ ≤ 0.7. Service rate μ = W/S; when λ > μ,
B(t) = max(0, B₀ + (λ − μ)t), and queue wait Lq ≈ Q/μ (Little's law).
Telegram exposes its side as `pending_update_count`
(`bots/api/types/webhookinfo.md:11`) and keeps undelivered updates at most
24 hours (`bots/api.md:59`) — a deadline, not a buffer. At λ = 50/s a full
day is 4.32M updates. Alert on the slope: your queue fills before that counter
moves.

## 2. Concurrency and ordering

Serialize per `chat_id`: one ordered queue (or hash to one worker) keeps FSM
transitions and replies in order; distinct chats run in parallel until the
bot-wide budget binds. Cap W with a fixed worker pool sized from ρ — one task
per update destroys backpressure. A global mutex wastes capacity; an
unbounded pool breaks per-chat limits. Global ordering is neither offered by
Telegram nor needed: `update_id` is monotonic, but chats are causally
independent, so per-key order suffices. W is not `max_connections` or replica
count (`21`).

## 3. Flood budget as a token bucket

Refill r: ~1 message/s per chat with short tolerated bursts before 429
(`bots/faq.md:124`), ~30/s bulk (`bots/faq.md:134`), up to 1000/s with
paid broadcasts needing 100,000 Stars and 100,000 MAU at 0.1 Stars per
message above 30/s (`bots/faq.md:130`). Derived bucket:
`tokens = min(cap, tokens + r·Δt)`, spend one per message; cap sets burst, r
sets sustained rate. Keep chat cap small — only short bursts are sanctioned.
`retry_after` is seconds left before retry
(`bots/api/types/responseparameters.md:10`) and overrides computed waits: on
429 set the bucket's next-allowed time from it, not from guessed backoff
(mechanics: `04`).

## 4. API knobs

| Knob | Values | Capacity effect |
|---|---|---|
| `getUpdates` `limit` | 1-100, default 100 | poll batch; smaller limits cut ingress bursts (`bots/api/methods/getupdates.md:10`) |
| `getUpdates` `timeout` | positive = long poll; 0 = test only | fewer idle round trips (`bots/api/methods/getupdates.md:11`) |
| `setWebhook` `max_connections` | 1-100, default 40 | delivery connections; raise for throughput (`bots/api/methods/setwebhook.md:14`) |
| `setWebhook` `allowed_updates` | type list | filter before queueing; `drop_pending_updates` clears backlog (`bots/api/methods/setwebhook.md:15-16`) |
| Local `max_webhook_connections` | up to 100000 | self-hosted only (`bots/api.md:40-55`) |

Derived: filter at ingestion, not in handlers; bound `limit` so a poll cycle
cannot enqueue more than W drains.

## 5. Files and media

Three paths: `file_id` reuse (no reupload, no limit), HTTP URL (5 MB photos /
20 MB other), multipart (10 MB photos / 50 MB other)
(`bots/api.md:109-113`). A local server adds unlimited downloads, 2000 MB
uploads, local paths and absolute local `file_path` (`bots/api.md:40-55`).
Derived: cache `file_id` by content key and reuse it; avoid re-downloading a
file whose local path is known; validate size locally to avoid wasted tokens;
keep media work out of handlers so S stays small.

## 6. Persistence and contention

Contention concentrates on dedupe inserts, per-chat FSM rows and broadcast
counters. Derived: bound the connection pool to W, index `(bot_id,
update_id)` uniquely with a TTL, make dedupe one atomic insert, keep session
rows keyed so unrelated chats do not block; long transactions inflate S.
PTB persistence covers bot/chat/user data and callback data
(`python-telegram-bot/src/telegram/ext/_basepersistence.py:29-54`); aiogram
has Redis FSM storage with pools and locks
(`aiogram/aiogram/fsm/storage/redis.py:22-30`); grammY loads session data from
your storage per chat (`grammY/src/convenience/session.ts:10-18`). Untested
backend semantics: `not verified` — measure them.

## 7. Profiling and load tests

Replay the official example updates (`bots/webhooks.md:494-520`) and
generated variants through your handler or queue with a fake API client and a
throwaway token — never production. Derived: drive synthetic load at target
λ, record handler p50/p95/p99, queue-wait p95, 429s and drops, then sweep W
against section 1; replay one `update_id` twice to check dedupe. Testing the
real API costs tokens and can throttle the bot (`04`).

## 8. Per-library knobs

| Library | Knob |
|---|---|
| python-telegram-bot | `concurrent_updates(True)` = 256 tasks, integer sets count, default sequential (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:1023-1061`); pool size / `pool_timeout` (`python-telegram-bot/src/telegram/ext/_applicationbuilder.py:501-517`) |
| aiogram | `tasks_concurrency_limit` works with `handle_as_tasks` (`aiogram/aiogram/dispatcher/dispatcher.py:400-406`) |
| grammY | simple polling ~5K messages/hour; use `@grammyjs/runner` for high load (`grammY/src/bot.ts:410,413`); batches sequential (`grammY/src/bot.ts:326-333`) |
| Telegraf | `handlerTimeout` 90 s default (`telegraf/src/telegraf.ts:22-23`); reads `retry_after` (`telegraf/src/core/network/polling.ts:36-44`) |
| teloxide | `worker_queue_size` default 64 (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:100-105`); `HashMap<Key, Worker>` plus concurrent default worker (`teloxide/crates/teloxide/src/dispatching/dispatcher.rs:282-288`); per-chat Throttle counting (`teloxide/crates/teloxide-core/src/adaptors/throttle/worker.rs:64-92`) |

## Sizing worksheet

| Input | Symbol | Example |
|---|---|---|
| Peak arrivals/s | λ | 50 |
| Mean handler s | S | 0.04 |
| Target utilisation | ρ | 0.7 |
| Workers ⌈λS/ρ⌉ | W | 3 |
| Service rate W/S | μ | 75/s |
| Headroom μ−λ | — | 25/s |
| Burst queue Q / wait Q/μ | Lq | 100 / 1.3 s |
| Chat, bulk bucket | r, cap | 1/s, 3; 30/s, 30 |
| Backlog, replay limit | pending, 24 h | slope alert (`bots/api.md:59`) |

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/faq.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/api/types/webhookinfo.md ; https://core.telegram.org/bots/api/types/responseparameters.md
- https://core.telegram.org/bots/api/methods/getupdates.md ; https://core.telegram.org/bots/api/methods/setwebhook.md
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_applicationbuilder.py
- https://github.com/python-telegram-bot/python-telegram-bot/blob/41e3633/src/telegram/ext/_basepersistence.py
- https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/dispatcher/dispatcher.py ; https://github.com/aiogram/aiogram/blob/63d09d6/aiogram/fsm/storage/redis.py
- https://github.com/grammyjs/grammY/blob/e8b3b1b/src/bot.ts ; https://github.com/grammyjs/grammY/blob/e8b3b1b/src/convenience/session.ts
- https://github.com/telegraf/telegraf/blob/1386cc4/src/telegraf.ts ; https://github.com/telegraf/telegraf/blob/1386cc4/src/core/network/polling.ts ; https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide/src/dispatching/dispatcher.rs ; https://github.com/teloxide/teloxide/blob/3c46b96/crates/teloxide-core/src/adaptors/throttle/worker.rs
