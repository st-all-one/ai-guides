# 18 — Operations and Troubleshooting

Triage the probe endpoints, then the proxy log, then the dependency the failing request touched. `[OSS]` behavior throughout, with enterprise gates named only where they produce the error.

## 1. Triage order

`GET /health/liveliness` needs no auth and returns `"I'm alive!"`, or 503 `{"status": "shutting_down"}` while draining. `GET /health/readiness` returns `{"status": "healthy", "db": ...}` and 503 when a configured database is unreachable. `GET /health` is authenticated, probes each deployment, and costs a few tokens per deployment unless background checks are on; the protected `/health/readiness/details` adds cache, callbacks, and version (`https://docs.litellm.ai/docs/proxy/health.md`).

## 2. Status codes

| Code | Usual meaning | Where to look |
|---|---|---|
| 401 | Missing, blocked, expired, or unknown key | `Invalid proxy server token passed` (`litellm/proxy/auth/auth_exception_handler.py:163`) |
| 403 | Key, team, user, org, or project lacks the model; or an unlicensed feature | Error `type`, e.g. `key_model_access_denied` |
| 422 | Budget exceeded (`litellm/__init__.py:394`) | Spend against the key/team/user limit |
| 429 | RPM/TPM or `max_parallel_requests` limit | Key limits |
| 503 | Readiness failed, draining, or no healthy targeted deployment | `/health/readiness`, `/health?model=` |

On `/health`, 403 is outside the key's scope, 404 no such deployment, and 503 still carries the normal body (`https://docs.litellm.ai/docs/proxy/health.md`).

## 3. Symptom → cause → fix

| Symptom / error text | Cause | Fix |
|---|---|---|
| `No connected db.` | Virtual key without `DATABASE_URL` | Run Postgres or use the master key (`https://docs.litellm.ai/docs/proxy/users.md`) |
| `FATAL: sorry, too many clients already` | Pool × workers × replicas > `max_connections` | Lower `database_connection_pool_limit`, add PgBouncer, raise the DB limit |
| `Got exception from REDIS No connection available` | Redis pool exhausted | Raise `max_connections` in `cache_params` |
| `Spend update queue is full. Aggregating all entries...` | Traffic outpaces DB spend writes | Raise `LITELLM_ASYNCIO_QUEUE_MAXSIZE`, batch writes, scale out |
| `P1011: Error opening a TLS connection ... certificate verify failed` | Certificate does not chain to the mounted CA | Mount the provider CA and set `sslrootcert` |
| `Permission denied` at startup | Read-only root without writable UI, migration, or cache paths | Set `LITELLM_UI_PATH`, `LITELLM_ASSETS_PATH`, `LITELLM_MIGRATION_DIR`, `PRISMA_BINARY_CACHE_DIR`, `XDG_CACHE_HOME` |
| `... is set in the config file and cannot be changed here.` (400) | Key is YAML-owned | Edit `config.yaml` or drop the key so the DB owns it (`https://docs.litellm.ai/docs/proxy/configs.md`) |
| `Invalid model name passed in` | Model id absent from `model_list` | Add the exact name or use an allowed alias |

## 4. Startup failures

The proxy refuses to start with an unset, empty, whitespace-only, or publicly known unsafe master key, exiting non-zero with remediation (`litellm/proxy/auth/master_key_boot_check.py:79-108`). With `DATABASE_URL` set but the Prisma CLI missing, it also exits rather than serve without a database (`https://docs.litellm.ai/docs/troubleshoot/prisma_migrations.md`).

A pod that boots but never becomes ready is usually a database problem: readiness checks the DB, not providers — a provider outage leaves readiness healthy while `/health?model=...` fails. Exit code 137 means OOM-killed (`https://docs.litellm.ai/docs/troubleshoot.md`).

## 5. Database and migration failures

- `P3018` with PostgreSQL `42P01` — a migration references a missing relation. Stop all instances, restore the pre-upgrade snapshot, repeat with schema updates disabled.
- `New migrations cannot be applied before the error is recovered from` — a failed migration row blocks the ledger. Resolve or delete the failed `_prisma_migrations` row, restart.

A failed migration makes new pods exit instead of serving an old schema, so old pods keep serving during a rolling update. Stop every LiteLLM process on that database before deleting migration rows (`https://docs.litellm.ai/docs/proxy/database_migrations.md`, `https://docs.litellm.ai/docs/troubleshoot/rollback.md`).

## 6. Timeouts, streams, and restarts

`request_timeout` defaults to 6000 seconds (`litellm/constants.py:685`), so a hang is usually a slow provider or a client timeout shorter than the request. During recycling from v1.108.0, a request still running after `GRACEFUL_SHUTDOWN_TIMEOUT` (default 30 seconds) is cancelled: non-streaming calls get a 500, and a stream stops with no `[DONE]` and no error, so a truncated answer can look complete. Raise the timeout above your longest request or stop recycling (`https://docs.litellm.ai/docs/proxy/server_tuning.md`).

## 7. Logs and diagnostics

Export `LITELLM_LOG="ERROR"` in production; debug logging is for reproduction only, with `litellm_settings.json_logs: true` and `set_verbose: False` as steady state. On Kubernetes, `kubectl describe pod` exposes `OOMKilled`, probe failures, and image/volume errors; `kubectl get events --sort-by=.lastTimestamp` orders them.

Probe with `curl` on `http://localhost:4000/health/readiness` and `/health?model=gpt-6.1-sol`, plus the authenticated `/health/backlog`, which reports in-flight requests on the worker; admission control exposes admitted, queued, and rejected counts there (`https://docs.litellm.ai/docs/troubleshoot.md`, `https://docs.litellm.ai/docs/proxy/health.md`).

## 8. Budget and spend mismatches

Budgets read spend from the database, so a DB-less global budget never trips and per-key budgets require resolvable keys. When spend looks wrong rather than absent, separate three causes: the request was not ingested into `LiteLLM_SpendLogs`, the cost formula used different token categories including cache tokens, or the model price map lacks the model. A model with a non-zero price entry but a missing rate is written with `spend = 0` and logged as `pricing entry '<model_id>' has no input_cost_per_token, output_cost_per_token`; the `litellm_zero_cost_requests_total` counter labels the reason (`https://docs.litellm.ai/docs/proxy/cost_tracking.md`).

## 9. What to collect before escalating

Capture the image tag and digest, the secret-free config, worker and replica counts, CPU/memory limits, incident RPS and token rate, Kubernetes events and previous-container logs, DB connections against `max_connections`, and Redis reachability. Undersized pods, synchronized worker recycling, and a stalled dependency are the three causes support checks first (`https://docs.litellm.ai/docs/troubleshoot.md`).

## Sources

- `litellm/proxy/auth/auth_exception_handler.py:163`; `litellm/proxy/auth/master_key_boot_check.py:79-108`; `litellm/constants.py:685`
- https://docs.litellm.ai/docs/proxy/health.md, `prod.md`, `db_sizing.md`, `server_tuning.md`
- https://docs.litellm.ai/docs/proxy/configs.md, `users.md`, `cost_tracking.md`, `database_migrations.md`
- https://docs.litellm.ai/docs/troubleshoot.md, `troubleshoot/rollback.md`, `troubleshoot/prisma_migrations.md`, `troubleshoot/spend_queue_warnings.md`
