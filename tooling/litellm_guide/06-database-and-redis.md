# 06 — Database and Redis

**Postgres holds state**: keys, teams, users, budgets, database models, spend logs. **Redis
coordinates**: counters, cooldowns, invalidation, pod locks. Without Postgres you lose every
database-backed feature; without Redis, correctness beyond one worker. [OSS] throughout;
[Enterprise] reuses the same stores.

## 1. Schema ownership

Postgres only: `litellm/proxy/db/db_url_settings.py:80-82` accepts just the `postgresql` and
`postgres` schemes, matching the datasource in `litellm/proxy/schema.prisma:1-4`. Tables that
matter:

| Table | Purpose | Lines |
|---|---|---|
| `LiteLLM_VerificationToken` | keys, limits, spend | `:597-661` |
| `LiteLLM_BudgetTable` | budgets, rate limits | `:13-51` |
| `LiteLLM_UserTable`, `LiteLLM_TeamTable` | users, teams, memberships | `:393`, `:275` |
| `LiteLLM_ProxyModelTable` | UI/API models | `:149` |
| `LiteLLM_Config` | database-owned settings | `:808` |
| `LiteLLM_SpendLogs` | per-request accounting | `:816` |
| `LiteLLM_ScheduledJobRun` | job coordination | `:1292` |

Inventory: `https://docs.litellm.ai/docs/proxy/db_info.md`. Auth is an indexed read; spend and
budget updates are writes — size for those
(`https://docs.litellm.ai/docs/proxy/db_sizing.md`).

## 2. Enabling the database

`DATABASE_URL` plus the salt key make the proxy build a Prisma client at startup
(`litellm/proxy/proxy_server.py:1795-1803`). `STORE_MODEL_IN_DB=True` or
`general_settings.store_model_in_db: true` also gives the database ownership of models and of
settings the file does not declare (`https://docs.litellm.ai/docs/proxy/configs.md`). Discrete
`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` are assembled into a URL by the entrypoint
before import (`litellm/deploy/docker/docker-entrypoint.sh:66-91`;
`litellm/proxy/db/db_url_settings.py:1-35`).

## 3. Prisma migrations

- `migrate_if_requested()` runs migrations unless `DISABLE_SCHEMA_UPDATE=true`
  (`litellm/proxy/proxy_server.py:1807-1813`; flag read at
  `litellm/proxy/db/prisma_client.py:1379`).
- Default command is `prisma migrate deploy`, not `db push`
  (`litellm/proxy/db/prisma_client.py:1250-1253`); `--use_prisma_db_push` is the fallback
  (`litellm/proxy/proxy_cli.py:1206-1210`).
- 254 migration files ship in `litellm-proxy-extras`; history is in `_prisma_migrations`. An
  unreachable database, exhausted retries, or a failed deploy exits nonzero rather than serve
  an old schema (`https://docs.litellm.ai/docs/troubleshoot/prisma_migrations.md`).
- A read-only root filesystem needs a writable `LITELLM_MIGRATION_DIR`
  (`litellm/proxy-extras/litellm_proxy_extras/utils.py:259-261`).

Kubernetes: migrate in a separate Job and set `DISABLE_SCHEMA_UPDATE=true` on serving pods; the
Helm pre-install/pre-upgrade hook does this by default
(`litellm/deploy/helm/litellm/values.yaml:137-156`). Manual job:
`litellm --skip_server_startup` (`litellm/proxy/proxy_cli.py:1212-1217`;
`https://docs.litellm.ai/docs/proxy/prod.md`).

## 4. Connection pooling

`database_connection_pool_limit` is **per worker process**, default 10, sized as
`MAX_DB_CONNECTIONS / (instances × workers_per_instance)`.

Three instances × four workers × 10 is 120 connections before migrations and rollout overlap
(`https://docs.litellm.ai/docs/proxy/configs.md`; `https://docs.litellm.ai/docs/proxy/prod.md`).
Also under `general_settings`: `database_connection_timeout`, `database_socket_timeout`,
`database_statement_timeout`, `database_lock_timeout`, and
`database_disable_prepared_statements` (appends `pgbouncer=true`)
(`https://docs.litellm.ai/docs/proxy/configs.md`).

PgBouncer in transaction mode needs prepared statements disabled; run one in-container with
`LITELLM_PGBOUNCER_ENABLED=true` (`litellm/deploy/docker/docker-entrypoint.sh:23-24`). Helm
exposes `database.connectionPool` per pod (`https://docs.litellm.ai/docs/proxy/deploy/helm.md`).

## 5. Read replica

- `DATABASE_URL_READ_REPLICA`, or discrete `DATABASE_HOST_READ_REPLICA` and friends; reader
  fields inherit writer user, database, schema, port, password, and pool parameters unless
  overridden (`litellm/proxy/db/db_url_settings.py:26-34`, `:413-422`).
- Prisma routes `find_*`, `count`, `group_by`, and raw reads to the reader; writes stay on the
  writer (`litellm/deploy/helm/litellm/values.yaml:279-281`).
- A replica does not remove write contention on the primary
  (`https://docs.litellm.ai/docs/proxy/db_sizing.md`).

## 6. Redis: two blocks, two jobs

Run Redis beyond one worker or replica
(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).

```yaml
router_settings:
  redis_host: os.environ/REDIS_HOST
  redis_port: os.environ/REDIS_PORT
  redis_password: os.environ/REDIS_PASSWORD
litellm_settings:
  cache: True
  cache_params:
    type: redis
    host: os.environ/REDIS_HOST
    port: os.environ/REDIS_PORT
```

The router block covers cooldowns and usage/latency routing; the cache block covers response
caching and proxy-wide coordination (rate limits, budgets, invalidation, pod lock).
`REDIS_HOST`/`REDIS_PORT` alone are not enough — config must point at Redis.
`general_settings.coordination_redis` can split coordination from the response cache
(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).

## 7. What breaks without Redis

| Feature | Without Redis |
|---|---|
| Key, team, user rate limits | counted per worker; limit × workers |
| Budgets | reserved per worker; can overshoot before Postgres |
| Usage/latency routing | sees one worker's traffic; placement skews |
| Cooldowns | failed deployment stays in rotation elsewhere |
| Response cache | worker-local; semantic caching needs Redis |
| Key/team cache invalidation | revocations wait for TTL expiry |
| Database config changes | other workers wait a poll interval |
| Spend transaction buffer | absent; each worker writes straight to Postgres |
| Shared jobs | no pod lock; every worker runs them |

(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`.)

## 8. Backup, retention, failure behavior

- Back up Postgres before upgrades and test restores; an image rollback does not undo migrations
  (`https://docs.litellm.ai/docs/proxy/upgrade_guide.md`).
- Batched writes (`proxy_batch_write_at: 60`) and retention keep spend logs small; cleanup uses
  `LiteLLM_ScheduledJobRun` and runs once per schedule even without Redis
  (`https://docs.litellm.ai/docs/proxy/spend_logs_deletion.md`).
- Migrating databases: copy the key, user, team, membership, and budget tables; model and log
  tables are optional (`https://docs.litellm.ai/docs/proxy/db_info.md`).
- `allow_requests_on_db_unavailable: true` keeps serving through connection failures as a
  restricted `INTERNAL_USER`; query errors still fail closed and readiness stays 200. Do not
  enable it on a public proxy (`https://docs.litellm.ai/docs/proxy/prod.md`).

## Sources

- `litellm/proxy/schema.prisma`
- `litellm/proxy/db/db_url_settings.py`
- `litellm/proxy/db/prisma_client.py`
- `litellm/proxy/proxy_server.py`
- `litellm/proxy/proxy_cli.py`
- `litellm/deploy/helm/litellm/values.yaml`
- https://docs.litellm.ai/docs/proxy/db_info.md
- https://docs.litellm.ai/docs/proxy/redis_requirements.md
