# 21 - Performance and Capacity

Derived arithmetic is marked `derived`; no live Gateway ran.

## Context-window economics and cache stability
Unchanged prefixes (instructions, tools, context) are cached; model/effort/tool/image changes break reuse (`pages/reference/prompt-caching.md:10-38`, `pages/reference/prompt-caching.md:260-272`). `cacheRetention`: 5-min/1-h, writes 1.25x/2x input, reads 0.1x; `long` = 1.6x `short` (`derived`); `cache-ttl` prunes stale results (`pages/reference/prompt-caching.md:193-270`).

## Queue steering and backpressure
`steer` default injects during tools; running tools are never interrupted, parallel batches never skipped. Modes `steer`/`followup`/`collect`/`interrupt`: `collect` coalesces, `interrupt` aborts (`pages/concepts/queue-steering.md:11-125`).

## Rate limiting and burst behavior
Limits: 128 unauth handshakes/IP, auth 10/60s + 5-min lockout, webhook 20/60s + 60s, writes 30/60s/method, ACP 120/10s, restart 30s (`pages/gateway/security/rate-limiting.md:17-25`). Overflow `503` with no `Retry-After`; tune via `OPENCLAW_MAX_PREAUTH_CONNECTIONS_PER_IP` and `gateway.auth.rateLimit` (`pages/gateway/security/rate-limiting.md:29-125`).

## Worker pools: admission, caps and splits
Code-mode, compaction and file-tool planning share `WorkerTaskPool`: 128 pending tasks, 256 MiB reported input per pool; `sharedCompute` shares one budget per isolate; over-limit `overloaded` bounds reported input, not heap (`pages/agent-runtime-architecture.md:76-122`, `pages/plugins/sdk-overview/infrastructure.md:299-317`).

| pool | cap / behavior | evidence |
| --- | --- | --- |
| compute | `max(1, availableParallelism()-1)` CPUs; 4-worker cap | `pages/agent-runtime-architecture.md:92-99` |
| readers / writers | 2-reader cap; writers serial over 2 broker isolates, per-DB order | `pages/agent-runtime-architecture.md:96-107` |
| file-tool / context read | edit/diff only, authority rechecked; 3-min local deadline | `pages/agent-runtime-architecture.md:109-143` |

## Cloud placement, warm images, native inference
Opt-in; `requiredProfile` forces sessions onto a worker (`pages/gateway/config-cloud-workers.md:17-28`). `worker-turn` runs the loop on the box, Codex `remote-exec` on the Gateway (`pages/gateway/cloud-workers.md:61-67`). Warm images Linux-only, default-on with class; `readyWorkers` 1, `preparedPool.maxTotal` 4; class is a size preference (`pages/gateway/cloud-workers/warm-images.md:12`, `pages/gateway/config-cloud-workers.md:170-171`).

Source — `pages/gateway/cloud-workers/warm-images.md:86-90`:
```json5
          warmImages: {
            refreshAfter: "24h",
            retainUnused: "14d",
            keepPrevious: 1,
          },
```
`settings.inference:"worker"` moves inference off the Gateway (`pages/gateway/cloud-workers/native-inference.md:12-15`).

## Job budgets and scheduling limits
CI ceilings: 96 concurrent Node jobs, 70 push/130 PR rows, 1 MiB outputs, 20-min UI shards, <=3 concurrent; lint <8 CPUs uses soft `GOGC=30`/`GOMEMLIMIT=3GiB` (`docs/ci/scope-and-routing/job-budgets.md:20-103`). Agent `timeoutSeconds` 172800s (48h), `0` unlimited; cron owns its timer (`pages/concepts/agent-loop.md:308-311`).

## Model failover latency and timeouts
Rate limits: 16 attempts (15 retries, `derived`) per outage; backoff 1 s to 60 s (30 s others); SDK waits cap 60 s; cooldowns 30 s → 1 min → 5 min (`pages/concepts/model-failover.md:401-496`). Fallback sticky 10 min idle capped 30 min; `timeoutSeconds` per attempt, idle 120 s cloud / 300 s self-hosted, 2× progress (`pages/concepts/model-failover.md:437-494`, `pages/concepts/agent-loop.md:311-312`).

## SQLite contention and database worker ordering
DB access uses workers via a SQLite writer broker, never the main thread; admission follows each worker's ordered cursor over two writer isolates (`pages/reference/database-schemas/worker-access.md:49-170`). `runSqliteImmediateTransaction` retries preparation via `busy_timeout` (not a total deadline), never replays a commit; UI reads use two-task-per-reader headroom (`pages/plugins/sdk-overview/infrastructure.md:170-190`, `pages/reference/database-schemas/worker-access.md:247-252`).

## Profiling method and bottleneck taxonomy
Baseline `pnpm test:perf:groups --full-suite --allow-failures`; isolate with `/usr/bin/time -l pnpm test <file> --maxWorkers=1 --reporter=verbose`; compare wall/RSS/CPU (`repo/.agents/skills/openclaw-test-performance/SKILL.md:23-116`). `openclaw.worker.task` and authenticated `GET /api/diagnostics/prometheus` (`operator.read`) expose queue, event-loop, GC and model/tool timings (`pages/agent-runtime-architecture.md:131-136`, `pages/gateway/prometheus.md:11-219`).

| bottleneck | signal | mitigation | evidence |
| --- | --- | --- | --- |
| cache misses | low `cacheRead` after model change | keep model and tools stable | `pages/reference/prompt-caching.md:26-38` |
| queue backlog | `openclaw_queue_lane_size`, `*_wait` | reduce arrivals, use `collect` | `pages/gateway/prometheus.md:175-180` |
| pool saturation | `overloaded`, `openclaw_worker_queue_depth` | raise pending limits | `pages/plugins/sdk-overview/infrastructure.md:299-312` |
| DB contention | `busy_timeout` retries | repeatable preparation, shorter writes | `pages/plugins/sdk-overview/infrastructure.md:174-190` |

## Sizing worksheet (documented knobs only)
Measured signals only; none guarantee capacity.

| knob | effect | tradeoff | evidence |
| --- | --- | --- | --- |
| `cacheRetention: short/long` | 5-min/1-h prefix reuse | long write 1.6× short (`derived`) | `pages/reference/prompt-caching.md:265-272` |
| `maxPendingTasks`/`maxPendingBytes` | pool admission ceilings | more queued work and bytes | `pages/plugins/sdk-overview/infrastructure.md:299-301` |
| `readyWorkers`/`preparedPool.maxTotal` | warm reserve count | running-machine charges | `pages/gateway/config-cloud-workers.md:170-171` |
| `settings.inference:"worker"` | moves inference off Gateway | no fallback; Windows deferred | `pages/gateway/cloud-workers/native-inference.md:291-294` |
| `agents.defaults.timeoutSeconds` | per-attempt budget | fallback multiplies wall time | `pages/concepts/agent-loop.md:308` |

## Cost and usage controls
Counters normalize to `cacheRead`/`cacheWrite`; absence proves nothing (`pages/reference/prompt-caching.md:12-17`). `openclaw_model_tokens_total`/`openclaw_model_cost_usd_total` support chargeback (`pages/gateway/prometheus.md:150-153`). Spend is `unverified` without billing telemetry.

## What cannot be claimed without a benchmark
- Admission bounds *reported* input, not heap (`pages/agent-runtime-architecture.md:120-122`); machine class is a size preference, not capacity (`pages/gateway/cloud-workers/placement-and-machine-selection.md:114`).
- Event intervals are not admission times; receipts do not prove cache hits (`docs/ci/scope-and-routing/job-budgets.md:26-32`); raising a cap proves no improvement (`docs/ci/capacity.md:153`). End-to-end throughput is `unverified`: no live Gateway ran.

## Sources

- https://docs.openclaw.ai/reference/prompt-caching
- https://docs.openclaw.ai/concepts/queue-steering
- https://docs.openclaw.ai/gateway/security/rate-limiting
- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/gateway/config-cloud-workers
- https://docs.openclaw.ai/gateway/cloud-workers/warm-images
- https://docs.openclaw.ai/gateway/cloud-workers/native-inference
- https://docs.openclaw.ai/concepts/model-failover
- https://docs.openclaw.ai/gateway/prometheus
