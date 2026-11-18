# 19 - Errors and Retries Deep Dive

Failure class decides replay, cooldown, fallback, termination or alert.

## Error taxonomy

Synthesis (`derived`).

| class | trigger | retry? | owner | evidence |
|---|---|---|---|---|
| Transient provider | 429, 5xx, overload, timeout | bounded | failover | `pages/concepts/retry.md:38` |
| Permanent provider | auth, billing, 400/422, refusal | no | failover | `pages/concepts/model-failover.md:528` |
| Transport/RPC | disconnect, RPC timeout, lost reply | per request | channel | `pages/concepts/agent-loop.md:444` |
| Tool | recorded failure / unknown outcome | after inspection | agent | `pages/concepts/retry.md:44` |
| Sandbox/cloud worker | node loss, lease conflict | bounded | worker | `pages/gateway/cloud-workers/troubleshooting.md:32` |
| Config/migration | Doctor maintenance, schema mismatch | repair only | Doctor | `pages/cli/doctor/state-migrations.md:151` |
| Session/transcript | validation failure, `DataCloneError` | no rotation | session | `pages/concepts/model-failover.md:504` |
| Automation/scheduler | execution / delivery failure | threshold+cooldown | scheduler | `pages/automation/cron-jobs/delivery.md:195` |

## Retry state machines and backoff

Retries are per request, preserving order and completed steps (`pages/concepts/retry.md:11`). Channels: 3 attempts, 0.1 jitter, 400 ms min / 30 s cap (Discord 500 ms / 30 s or 300 s REST); Gateway WS uses 50 reconnects, 2 s→30 s, no jitter (`pages/concepts/retry.md:19`). Models: 16 attempts (15 retries) per rate-limit outage, two TPM retries in 15 s with fallback, eight in 90 s otherwise (`pages/concepts/retry.md:38`); backoff ~1 s exponential with jitter, capped 60 s / 30 s (`pages/concepts/model-failover.md:496`).

## Idempotency and delivery effects

Only recorded results count as done; unknown outcomes are inspected before replay (`pages/concepts/retry.md:44`). Durable delivery uses 60 s leases renewed every 20 s and, without send proof, resends only ordinary final text once — accepting a rare duplicate over a loss (`pages/concepts/retry.md:141`). Resume warns effects are not exactly-once (`pages/gateway/restart-recovery.md:629`).

## Provider/model failover and exhaustion

Matching failures walk `agents.defaults.model.fallbacks` (incl. `model_not_found` 404s) (`pages/concepts/model-failover.md:490`). Continues-on: auth, rate limits, overload, timeouts, billing, safe overflow; not: aborts, committed effects, refusals (`pages/concepts/model-failover.md:528`). Each candidate gets a fresh timeout and cancel stops the chain (`pages/concepts/model-failover.md:494`). Cooldowns follow provider timing; others scale 30 s/1 min/5 min in SQLite `usageStats` (`pages/concepts/model-failover.md:413`):

`pages/concepts/model-failover.md:423-433`
```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

Exhaustion gives one terminal notice; **Try again** re-checks completed work (`pages/concepts/model-failover.md:647`).

## Restart recovery, cancel and in-flight work

An unclosed predecessor logs `previous Gateway run ended unexpectedly`; a main thread stalled five minutes is `SIGKILL`ed and supervisor-restarted (`pages/gateway/restart-recovery.md:115`, `pages/gateway/restart-recovery.md:147`). Transcripts survive; roots get one resume input, sub-agents fold into roots, queue and cron persist (`pages/gateway/restart-recovery.md:174`). Shutdown fences admission, writes markers (10 s), aborts runs (`pages/gateway/restart-recovery.md:280`); resume revalidates authority and inspects effects before repeating them (`pages/gateway/restart-recovery.md:620`). No resume without a run identity, for cron/ACP or stopped children (`pages/gateway/restart-recovery.md:807`); runs end on timeout, `AbortSignal`, disconnect/RPC or wait-only timeout, with the owner's `finally` closing admission (`repo/src/agents/AGENTS.md:27`).

## Update, rollback and repair

Verification checks service, port, hello identity, health and `/readyz` 200; unchanged `user_version`/config allow restore to `rolled-back` (`pages/gateway/restart-recovery.md:510`). Failed updates open `openclaw triage`; `update repair` refuses under a maintenance lock (`pages/cli/update/repair-and-recovery.md:452`). Reinstall good code before restoring state (`pages/install/update-troubleshooting.md:782`).

## SQLite integrity, migration and compaction

Admission validates format/schema/indexes/integrity per load unless a clean-close seal is reused (`pages/reference/database-schemas/integrity-and-recovery.md:37`). A newer schema refuses start — use a compatible build, never edit markers (`pages/reference/database-schemas/integrity-and-recovery.md:1512`); quarantine fails fast: backup then `doctor --fix`, with index-only corruption `REINDEX`ed (`pages/reference/database-schemas/integrity-and-recovery.md:1537`). Downgrades never lower markers; recovery needs matching package, config and agent databases (`pages/reference/database-schemas/integrity-and-recovery.md:1612`). Auto-compaction compacts then retries on overflow and a failed preflight commits recent history without a summary (`pages/concepts/compaction.md:85`); cancellation is not rollback and attempts are saved as `openclaw.compaction-attempt` entries kept out of context (`pages/concepts/compaction.md:303`).

## Terminal replies, NO_REPLY and automation alerts

One producer owns the terminal reply fact; partial text/media stay separate from one failure notice (`pages/concepts/agent-loop.md:202`). Delivery proof is host-owned — partial sends and dry runs are not proof (`repo/src/agents/AGENTS.md:37`); `NO_REPLY` needs a whole trimmed final and discards unsent text but not delivered messages (`pages/concepts/messages.md:227`). Automations use one threshold, one-hour cooldown and one daily repeat per cause; ambiguous webhooks stay **Unknown** (`pages/automation/cron-jobs/delivery.md:195`). Quick re-runs at 30 s/1 min/5 min precede alerts and recurring jobs auto-disable after 10 failures (`pages/automation/cron-jobs/delivery.md:245`, `pages/automation/cron-jobs/delivery.md:251`).

### Failure mode playbook

| failure mode | symptom | recovery | evidence |
|---|---|---|---|
| Rate-limit storm | `Retrying… n/16` | bounded retry, fallback | `pages/concepts/model-failover.md:500` |
| Wedged thread | `main-thread stall recovery: … SIGKILL` | supervisor restart | `pages/gateway/restart-recovery.md:147` |
| Quarantined DB | opens fail fast | backup, `doctor --fix` | `pages/reference/database-schemas/integrity-and-recovery.md:1537` |

### Egress boundary: log facts, redact content

Structured facts survive while content is removed (`derived`): Git logs operation, attempt, delay, exit code but omit args/URLs/raw output (`pages/concepts/retry.md:80`); cloud diagnostics are bounded and redacted (`pages/gateway/cloud-workers/troubleshooting.md:61`); chat notices show normalized causes while paths, secrets and stack text stay in history (`pages/automation/cron-jobs/delivery.md:223`).

## Sources

- https://docs.openclaw.ai/concepts/retry
- https://docs.openclaw.ai/concepts/model-failover
- https://docs.openclaw.ai/concepts/agent-loop
- https://docs.openclaw.ai/concepts/messages
- https://docs.openclaw.ai/concepts/compaction
- https://docs.openclaw.ai/gateway/restart-recovery
- https://docs.openclaw.ai/reference/database-schemas/integrity-and-recovery
- https://docs.openclaw.ai/cli/doctor/state-migrations
