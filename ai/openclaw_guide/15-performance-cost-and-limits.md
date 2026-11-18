# 15 - Performance, Cost, and Limits

Cost and throughput emerge from cache stability, queue admission, failover budgets, worker placement, and documented caps. Every knob below is a cited key; arithmetic is marked `derived`.

## Context budget and prompt caching

Stable instructions, tools, and replayed tool results keep the cached prefix byte-identical; changing runtime or workspace can invalidate it (`pages/reference/prompt-caching.md:24-191`). Source — `pages/reference/prompt-caching.md:198-211`:
```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # overrides the global default for this model
  list:
    - id: "alerts"
      params:
        cacheRetention: "none" # overrides both defaults for this agent
```

Merge order is defaults → per-model → agent per-model → agent-wide (`pages/reference/prompt-caching.md:213-220`). Direct Anthropic seeds `"short"` (5 min); `"long"` requests 1 h only on explicit endpoints (`pages/reference/prompt-caching.md:258-274`). Long writes cost 2× input, short 1.25×, reads 0.1× — a long write costs 1.6× a short write (`pages/reference/prompt-caching.md:267-272`, arithmetic `derived`). `contextPruning.mode: "cache-ttl"` prunes old tool results after the window (`pages/reference/prompt-caching.md:222-234`). `diagnostics.cacheTrace.enabled` defaults `false` and writes prompt text to `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl` (`pages/reference/prompt-caching.md:592-610`).

## Queue steering and backpressure

Default queue is `mode: "steer"`, 500 ms debounce, `cap: 20`; `drop: "summarize"` keeps compact summaries of dropped entries (`pages/concepts/queue.md:31-38`, `pages/concepts/queue.md:100-135`). Source — `pages/concepts/queue.md:75-88`:
```json5
{
  messages: {
    queue: {
      mode: "steer",
      allowCollaborativeSteering: false,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect", x: "followup" },
      debounceMsByChannel: { discord: 1000, x: 500 },
    },
  },
}
```

Modes: `steer` injects at model boundaries; `followup` defers; `collect` coalesces a quiet window; `interrupt` aborts the active run (`pages/concepts/queue.md:43-52`). Steering never interrupts a running tool, and parallel batches are never skipped (`pages/concepts/queue-steering.md:17-32`). Lane caps: unconfigured 1, `main` = `max(8, cpus×4)`, sub-agents 8 per session, Swarm collectors 32 per group (`pages/concepts/queue.md:20-26`). Priority has a 15 s / 30 s bounded head start (`pages/concepts/queue.md:21`).

## Rate limiting

Independent limiters protect different boundaries (`pages/gateway/security/rate-limiting.md:11-26`). Source — `pages/gateway/security/rate-limiting.md:112-125`:
```json
{
  "gateway": {
    "auth": {
      "rateLimit": {
        "maxAttempts": 10,
        "windowMs": 60000,
        "lockoutMs": 300000,
        "exemptLoopback": true
      }
    }
  }
}
```

Defaults: 128 unauthenticated sockets per IP (`OPENCLAW_MAX_PREAUTH_CONNECTIONS_PER_IP`), failed auth 10/60 s + 5 min lockout, webhook 20/60 s + 60 s, control-plane writes 30/60 s per method, ACP sessions 120/10 s, restart cooldown 30 s (`pages/gateway/security/rate-limiting.md:17-25`). Limiters are in-memory and per-process; honor `retryAfterMs` (`pages/gateway/security/rate-limiting.md:245-265`).

## Model failover and job budgets

Auth order: stored order → `auth.order` → `auth.profiles` → SQLite profiles, then round-robin by type (OAuth, token, API key) and `usageStats.lastUsed` (`pages/concepts/model-failover.md:299-325`). Rate-limit cooldowns use provider timing; other failures scale 30 s → 1 min → 5 min (`pages/concepts/model-failover.md:365-419`). Budget: 16 attempts = 1 initial + 15 retries (`derived` from `pages/concepts/model-failover.md:496`); backoff caps at 60 s for rate limits. After fallback, later turns prefer it for a 10-minute idle window capped at 30 minutes (`pages/concepts/model-failover.md:435-439`).

Each fallback gets a fresh `agents.defaults.timeoutSeconds` budget, so total run time can exceed the setting (`pages/concepts/model-failover.md:494`). Default 172800 s (48 h), `0` = unlimited; cron owns its own deadline, command jobs default 10 min, scripts 5 min (`pages/concepts/agent-loop.md:308-310`, `pages/automation/cron-jobs/how-it-works.md:26`). Model idle timeout is 120 s cloud / 300 s self-hosted, with a 2× idle progress deadline (`pages/concepts/agent-loop.md:311`).

## Cloud worker placement and warm images

Cloud workers are opt-in; absent `cloudWorkers` or empty `profiles` accepts no new creation (`pages/gateway/config-cloud-workers.md:15-17`). `requiredProfile` forces every session onto a worker and is a server policy (`pages/gateway/config-cloud-workers.md:23-28`). In `worker-turn` the loop runs on the box; Codex `remote-exec` keeps it on the Gateway (`pages/gateway/cloud-workers.md:59-71`). `settings.warmImage` reuses Linux snapshots, on by default with a machine class; warm images are Linux-only (`pages/gateway/config-cloud-workers.md:165`, `pages/gateway/cloud-workers.md:113`). `readyWorkers` defaults `1`, `preparedPool.maxTotal` `4`, and reserves incur charges (`pages/gateway/config-cloud-workers.md:170-171`). A lease ends at the earlier of TTL or idle timeout; suggested `4h`/`45m`, policy up to 24 h (`pages/gateway/cloud-workers.md:127-131`).

## Usage, cost controls, and documented limits

`/usage cost` aggregates local session logs; `openclaw status --usage` prints provider quotas; usage is cached 60 s and tunable with `models.usage.cacheTtlMs` (`pages/concepts/usage-tracking.md:37-57`). Subscription-billed sessions hide per-token estimates while API-billed sessions show estimated cost (`pages/concepts/usage-tracking.md:46-47`). Session reports have a 15-second data-read budget and can return partial results (`pages/concepts/usage-tracking.md:71-75`).

| knob | effect | tradeoff | evidence |
| --- | --- | --- | --- |
| `cacheRetention` | 5-min or 1-h prefix reuse | long writes cost 1.6× short (`derived`) | `pages/reference/prompt-caching.md:193-272` |
| `contextPruning.mode: "cache-ttl"` | prunes stale tool results after TTL | less replay context after idle | `pages/reference/prompt-caching.md:222-234` |
| `messages.queue.cap` / `drop` | bounds messages; summarizes drops | lost detail in summaries | `pages/concepts/queue.md:100-135` |
| `gateway.auth.rateLimit` | brute-force guard | lockout blocks legitimate retries | `pages/gateway/security/rate-limiting.md:110-128` |
| `agents.defaults.model.fallbacks` | advances on rated failures | fresh timeout per candidate extends runs | `pages/concepts/model-failover.md:488-494` |
| `cloudWorkers.preparedPool.maxTotal` | caps warm reserves | fewer instant placements | `pages/gateway/config-cloud-workers.md:170-171` |
| `agents.defaults.timeoutSeconds` | per-attempt execution budget | fallback multiplies wall time | `pages/concepts/agent-loop.md:308` |

## Sources

- https://docs.openclaw.ai/reference/prompt-caching
- https://docs.openclaw.ai/concepts/queue
- https://docs.openclaw.ai/concepts/queue-steering
- https://docs.openclaw.ai/gateway/security/rate-limiting
- https://docs.openclaw.ai/concepts/model-failover
- https://docs.openclaw.ai/gateway/cloud-workers
- https://docs.openclaw.ai/gateway/config-cloud-workers
- https://docs.openclaw.ai/concepts/agent-loop
- https://docs.openclaw.ai/concepts/usage-tracking
- https://docs.openclaw.ai/automation/cron-jobs/how-it-works
