# 17 — Production Deployment

Scope: workload shape, Redis, Postgres, migrations, probes, rollout, image trust, secrets; tooling is `[OSS]`.

## 1. Workload shape and scaling

On Kubernetes run `--num_workers 1` and add pods; on a VM set `NUM_WORKERS` to the vCPU count. Start at 1 vCPU and 4 GiB per worker; the CLI default is one worker (`litellm/proxy/proxy_cli.py:1019`, `litellm/constants.py:140`; `https://docs.litellm.ai/docs/proxy/prod.md`, `https://docs.litellm.ai/docs/proxy/deploy/sizing.md`).

Jobs run once per worker process, not per pod: set `LITELLM_JOB_ROLE=serving` on traffic pods and run a one-replica `worker` on the same database and Redis. `serving` skips single-owner jobs (budget resets, spend cleanup, key rotation, usage exports) but keeps its own spend flush and config reload — without Redis that worker is the only route to single execution.

Never combine `--num_workers 1` with `--max_requests_before_restart`: the limit stops the whole pod, probes included; the flag suits multi-worker containers (`litellm/proxy/proxy_cli.py:1263`; `https://docs.litellm.ai/docs/proxy/server_tuning.md`).

The chart's HPA defaults to 1–10 replicas at 70% CPU and 80% memory; set `minReplicas: 2` so a drain cannot take the last replica, and cap `maxReplicas` at the §3 connection budget (`litellm/deploy/helm/litellm/values.yaml:494-495`).

## 2. Redis

Run Redis when more than one instance serves traffic. The image reads `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`; `general_settings.coordination_redis` overrides them. Router and cache are configured separately: `router_settings.redis_host/redis_port/redis_password`, and `litellm_settings.cache` with `cache_params.type: redis` plus the same host and port.

Above ~1000 RPS, `general_settings.use_redis_transaction_buffer: true` queues spend writes in Redis and flushes from one lock holder; watch the spend-update gauges (`https://docs.litellm.ai/docs/proxy/prod.md`).

## 3. Postgres and pool math

Each worker owns a pool, default limit 10. Budget for autoscaler maximum plus rollout overlap: `database_connection_pool_limit × workers_per_instance × (maximum_instances + rollout_overlap)`.

Pool 10 × 1 worker × (100 maximum + 25 rollout) = 1,250 connections; exceeding `max_connections` yields `FATAL: sorry, too many clients already`. The chart's `database.connectionPool` budget is `maxDbConnections × (max_pods + rollout_overlap)`; count backend and migration connections separately. Set `database_disable_prepared_statements: true` for pooled sessions (`https://docs.litellm.ai/docs/proxy/db_sizing.md`).

Keep it small with `proxy_batch_write_at: 60`, `disable_error_logs: True`, and spend-log retention; `store_prompts_in_spend_logs` writes bodies to every row and raises memory use.

## 4. Migrations

The proxy runs `prisma migrate deploy` on startup unless `DISABLE_SCHEMA_UPDATE=true`. The chart sets that flag on serving pods and runs a migrations Job via `pre-install`/`pre-upgrade` hooks; keep `migrationJob.enabled: true`, and for Argo CD enable `migrationJob.hooks.argocd.enabled` while disabling the Helm hook.

For custom deployments, `DISABLE_SCHEMA_UPDATE=false litellm --skip_server_startup` applies schema migrations and request-log indexing, then exits (`litellm/proxy/proxy_cli.py:1213`). From v1.109.0 dry-run against a restored copy — dry runs take table locks — and an image rollback does not undo migrations (`https://docs.litellm.ai/docs/proxy/database_migrations.md`).

## 5. Probes, drain, and rollout

`/health/liveliness` needs no auth and returns `"I'm alive!"`, or 503 during shutdown. `/health/readiness` needs no auth, returns `{"status": "healthy", "db": ...}`, and 503s when the database is unreachable. `/health/drain` is gated by `X-Drain-Token` and 404s unless `enable_drain_endpoint: true` (`litellm/proxy/health_endpoints/_health_endpoints.py:2440`, `:2333`, `:2392`; `https://docs.litellm.ai/docs/proxy/health.md`).

`SIGTERM` drains in-flight requests; from v1.108.0 it waits at most `GRACEFUL_SHUTDOWN_TIMEOUT` seconds (default 30) — raise it above your longest request, keep `terminationGracePeriodSeconds` above it, and add a 10-second `preStop` sleep so ingress routing updates. `maxUnavailable: 0` preserves capacity; add a startup probe for slow model loading (`https://docs.litellm.ai/docs/proxy/upgrade_guide.md`).

## 6. Image pinning and signing

Pin a release tag or digest; the chart leaves `image.tag` empty to inherit `appVersion` and appends `image.digest` as `repository:tag@digest` (`litellm/deploy/helm/litellm/values.yaml:33-37`); the quickstart compose's `:latest` is no production pin (`litellm/deploy/docker/docker-compose.quickstart.yml:14`).

GHCR images are cosign-signed since v1.83.0; verify before rollout:

```bash
cosign verify \
  --key https://raw.githubusercontent.com/BerriAI/litellm/e82a3c646908ba0a6ee0beddc4310d7a6cac4065/cosign.pub \
  ghcr.io/berriai/litellm:v1.106.6
```

The key is checked in at `cosign.pub:1-3`; the docs publish its fingerprint and a Sigstore policy example (`https://docs.litellm.ai/docs/proxy/docker_image_security.md`).

## 7. Secrets, exposure, and filesystem

Set `LITELLM_MASTER_KEY` (must start with `sk-`) and `LITELLM_SALT_KEY` from a secret manager; `general_settings.master_key` overrides the variable. `LITELLM_MODE=PRODUCTION` disables `load_dotenv()`; `trusted_proxy_ranges` must match the ingress CIDRs for the UI login limiter. The master key is the admin credential and UI password — rotating it signs everyone out; the salt key encrypts stored provider credentials and must not change after models are added (`https://docs.litellm.ai/docs/proxy/master_key_rotations.md`).

The image runs as uid 65532 and supports `readOnlyRootFilesystem`; runtime writes belong under `/app/.cache`, `/var/lib/litellm`, `/tmp` (`litellm/deploy/docker/README.md:62`). Compose proves it with `read_only: true`, `cap_drop: ALL`, `no-new-privileges`, tmpfs (`litellm/deploy/compose/docker-compose.yml:42-49`). Mount emptyDirs and set `LITELLM_UI_PATH`, `LITELLM_ASSETS_PATH`, `LITELLM_MIGRATION_DIR`, `PRISMA_BINARY_CACHE_DIR`, `XDG_CACHE_HOME`, else the proxy logs `Permission denied` (`https://docs.litellm.ai/docs/proxy/prod.md`).

## 8. Go-live checklist

| Area | Required |
|---|---|
| Scale, data | One worker per pod; `maxReplicas` within the connection budget; Redis 7.0+ in router and cache; pool × max replicas under `max_connections` |
| Rollout | Migration job green; liveliness and readiness pass; `maxUnavailable: 0` |

Alert externally on LLM exceptions, budget crossings, and database errors — a stopped gateway cannot alert on itself (`https://docs.litellm.ai/docs/proxy/prod.md`).

## Sources

- `litellm/proxy/proxy_cli.py:1019`, `:1213`, `:1263`; `litellm/constants.py:140`; `litellm/proxy/health_endpoints/_health_endpoints.py:2333`, `:2392`, `:2440`
- `litellm/deploy/helm/litellm/values.yaml:33-37`, `:494-495`; `litellm/deploy/compose/docker-compose.yml:42-49`
- `litellm/deploy/docker/README.md:62`; `litellm/deploy/docker/docker-compose.quickstart.yml:14`; `cosign.pub:1-3`
- https://docs.litellm.ai/docs/proxy/prod.md, `health.md`, `deploy/helm.md`, `db_sizing.md`
