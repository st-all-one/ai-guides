# 02 — Architecture and processes

The gateway is one Python process exposing an OpenAI-compatible API, or the same
image split into gateway, management backend, UI, migration, metrics and
collector processes. Covered here: the FastAPI app, startup order, request path,
worker/scheduler model and where state lives. All OSS unless marked Enterprise.

## 1. One FastAPI app

One ASGI app, created at import time with `lifespan=proxy_startup_event`, stable
operation IDs and docs/OpenAPI URLs from `get_docs_url()`, `get_redoc_url()`,
`get_openapi_url()` (`litellm/proxy/proxy_server.py:2222-2233`). The lifespan
wrapper captures `SIGTERM`, opens an `AsyncExitStack` and runs `_proxy_lifespan`
(`:1644-1648`, `:1671-1692`). State is module-level: `prisma_client`,
`redis_usage_cache`, `user_api_key_cache`, router (`:3258-3271`).

## 2. Process components

Same image everywhere; the first command word, or `LITELLM_COMPONENT`, selects
the process (`litellm/deploy/docker/docker-entrypoint.sh:9-23`):

| Component | Command (`litellm/deploy/docker/docker-entrypoint.sh:96-118`) | Port |
|---|---|---|
| `proxy` | `litellm ARGS` — full proxy (default) | 4000 |
| `gateway` | `python -m gateway.launch` — inference routes | 4000 |
| `backend` | `uvicorn litellm.runtime.backend.main:app` — management routes | 4001 |
| `ui` | nginx serving the static dashboard | 3000 |
| `migrations` | `python -m litellm.runtime.migrations.run`, then exit | — |
| `metrics` | `python -m litellm.proxy.prometheus_metrics_server` | `--port` |
| `collector` | `python -m litellm.proxy.collector` | — |

The image exposes all three ports (`litellm/deploy/docker/Dockerfile:218`). Helm
renders three Deployments, or one monolith when `monolith.enabled: true`
(`litellm/deploy/helm/litellm/values.yaml:10-11`, `:56`). PgBouncer is not a
component: it runs inside `proxy`/`gateway` when enabled
(`litellm/deploy/docker/docker-entrypoint.sh:23-24`).

## 3. Startup order

Sequential, fail-fast; rows cite `litellm/proxy/proxy_server.py` unless a path
is given:

| # | Step | Evidence |
|---|---|---|
| 1 | `CONFIG_FILE_PATH`/`WORKER_CONFIG` resolved; `load_config()` builds router and `general_settings` | `:1739-1749` |
| 2 | Master-key verdict: unset, empty or publicly known key refuses boot unless overridden | `:1775-1792`; `litellm/proxy/auth/master_key_boot_check.py:79-108`, `:159-175` |
| 3 | Prisma client built only when `DATABASE_URL` exists | `:1795-1803` |
| 4 | `migrate_if_requested()` runs `prisma migrate deploy` unless `DISABLE_SCHEMA_UPDATE=true` | `:1807-1813`; `litellm/proxy/db/prisma_client.py:1379` |
| 5 | Coordination Redis block saved in the Admin UI is loaded from the DB as usage cache | `:1866-1877` |
| 6 | Callback presets and OTel provider published before the app serves | `:1890-1920` |
| 7 | Proxy-wide budget with no database logs that it will not be enforced | `:1957-1968`; log text `:11406-11416` |
| 8 | Scheduler: budget resets, spend flush, key rotation, config reload (DB only) | `:1975-1987` |
| 9 | Health checks after models load; model-info refresh interval; shared aiohttp session | `:1998-2000`, `:2028-2042`, `:2020-2023` |

Shutdown stops in-flight scheduler jobs before the spend flush and DB disconnect
(`:2113-2122`, `:1635`). A schema failure is a boot failure, not degraded mode.

## 4. Request lifecycle

1. **Middleware** (`litellm/proxy/proxy_server.py:3055-3120`): decompression, CORS,
   Prometheus/billable metrics, telemetry, budget-reservation release, Redis
   batching, in-flight tracking, security headers, gzip.
2. **Auth.** `/v1/chat/completions`, `/chat/completions` and Azure-style
   deployment routes depend on `user_api_key_auth` (`:13561-13587`); the builder
   handles key extraction, custom auth and the Rust auth plan
   (`litellm/proxy/auth/user_api_key_auth.py:2022-2109`).
3. **Pre-call hooks** run in the endpoint before dispatch (`:14025`) via
   `ProxyLogging.pre_call_hook` (`litellm/proxy/utils.py:3569-3580`); guardrails
   may modify or reject the body here.
4. **Route.** `route_request()` picks a deployment through the router
   (`litellm/proxy/route_llm_request.py:833-846`).
5. **Post-call.** Callbacks and spend accounting run on success or failure;
   failure hooks fire from endpoint exception paths (e.g. `:13663`). Spend is
   queued, not written per request.

## 5. Workers and scheduled work

`--num_workers` defaults to `1` (`litellm/proxy/proxy_cli.py:1018-1027`;
`litellm/constants.py:140`). The scheduler registers once per worker process,
not per pod, so `--num_workers 4` runs four copies of every job.
`LITELLM_JOB_ROLE=serving` skips single-owner jobs (budget resets, spend-log
cleanup, key rotation, usage exports); `worker` registers everything. Ownership
is elected through Redis, so without Redis every process runs the shared jobs
(`https://docs.litellm.ai/docs/proxy/prod.md`). Spend writes batch every 10 s by
default (`litellm/constants.py:2008`); production guidance is
`proxy_batch_write_at: 60`. The DB config reload poll is 30 s
(`litellm/constants.py:2009`).

## 6. Where state lives

- **Postgres** — source of truth for virtual keys, teams, users, budgets,
  DB-stored models, spend logs (`https://docs.litellm.ai/docs/proxy/db_info.md`).
- **Redis** — optional for one worker, required for correctness with several:
  rate limits, budgets, cooldowns, cache invalidation, pod locks
  (`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).
- **Process memory** — router, auth cache
  (`litellm/proxy/proxy_server.py:3262`), spend counters (`:3265`), scheduler
  (`:3372`); per worker, lost on restart.

Three Redis clients can exist (response cache, coordination, router), each with
its own pool
(`https://docs.litellm.ai/docs/proxy/caching_redis.md#redis-max_connections`);
one working client does not prove rate limits are shared.

## 7. Enterprise boundary

`premium_user` comes from the license check at import
(`litellm/proxy/proxy_server.py:1257-1258`); enterprise callbacks and routes check
it and reject unlicensed use. Everything else in this chapter is OSS: keys, budgets,
spend tracking, Admin UI, routing and guardrails; Enterprise adds identity,
audit, secret-manager, allowlist and multi-region features only
(`https://docs.litellm.ai/docs/enterprise.md`, full matrix in `01`). Licensing
changes behavior inside the same processes; it adds no service to the topology.
With several replicas, run Redis and one scheduler owner, or accept duplicated
jobs and per-worker limits.

## Sources

- `litellm/proxy/proxy_server.py`, `litellm/proxy/auth/user_api_key_auth.py`
- `litellm/proxy/auth/master_key_boot_check.py`, `litellm/proxy/utils.py`
- `litellm/proxy/route_llm_request.py`, `litellm/proxy/db/prisma_client.py`
- `litellm/proxy/proxy_cli.py`, `litellm/constants.py`
- `litellm/deploy/docker/docker-entrypoint.sh`, `litellm/deploy/docker/Dockerfile`
- `litellm/deploy/helm/litellm/values.yaml`
- https://docs.litellm.ai/docs/proxy/prod.md
- https://docs.litellm.ai/docs/proxy/redis_requirements.md
- https://docs.litellm.ai/docs/proxy/db_info.md
- https://docs.litellm.ai/docs/proxy/caching_redis.md
- https://docs.litellm.ai/docs/enterprise.md

