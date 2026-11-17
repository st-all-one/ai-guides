# 19 — Upgrade and Maintenance

OSS and Enterprise share one image, cadence, support window.

## 1. Cadence and support

Nightlies (`1.x.x-dev.N`) pass CI only; `rc` adds review and a test window; stable is a promoted `rc`, released Tuesday mornings with a MINOR bump; PATCH is hotfix-only. The `-stable`/`-nightly` suffixes are gone since 1.84.0; Docker publishes `1.84.0` and `v1.84.0` for one image (https://docs.litellm.ai/docs/proxy/release_cycle.md).

The four newest stable minor lines get patches; older lines are EOL; the policy is paused during the LTS pilot (https://docs.litellm.ai/docs/enterprise/version_support.md). Pin one line, take its latest patch, migrate before it leaves the window.

## 2. Pre-upgrade checklist

- Two healthy instances, autoscaler ≥ 2, spare compute and DB connections.
- Target image and chart pinned and cosign-verified (https://docs.litellm.ai/docs/proxy/docker_image_security.md); release notes read per version crossed.
- Same database, Redis, auth settings, and `LITELLM_SALT_KEY` on old and new pods.
- Backup plus a rehearsal on a production-sized copy, including a long stream.

The backup is not optional: migrations are not reversed by an image rollback (https://docs.litellm.ai/docs/proxy/upgrade_guide.md).

## 3. Migrations

The proxy runs `prisma migrate deploy` at startup unless `DISABLE_SCHEMA_UPDATE=true`. Helm runs a `pre-install`/`pre-upgrade` hooks Job (`migrationJob.enabled: true`, `litellm/deploy/helm/litellm/values.yaml:137`) and sets `DISABLE_SCHEMA_UPDATE=true` on serving pods, so the schema changes once, under the target image (https://docs.litellm.ai/docs/proxy/prod.md).

Custom deployments: run the job, require exit 0.

```bash
DISABLE_SCHEMA_UPDATE=false litellm --skip_server_startup
```

It applies schema migrations and request-log indexing, then exits (`litellm/proxy/proxy_cli.py:1213`; https://docs.litellm.ai/docs/proxy/database_migrations.md). From v1.109.0 dry-run on a restored copy first: it executes real SQL and takes table locks. From before v1.104.0, set `DISABLE_SCHEMA_UPDATE=true` on every old deployment before the new image starts — the legacy resolver can drop tables and columns the old image does not know.

`prisma migrate deploy` detects no drift and never warns that an applied migration is missing from history. `P3018` with `42P01` leaves the schema at the old version and stops new pods; old pods keep serving (https://docs.litellm.ai/docs/troubleshoot/prisma_migrations.md).

## 4. Backup and restore

Dump before every upgrade, key rotation, and rollback:

```bash
pg_dump -h <host> -U <user> -d <database> -F c \
  -f litellm_backup_$(date +%Y%m%d_%H%M%S).dump
```

Managed Postgres: snapshot instead. A restore loses later writes and needs downtime — disaster recovery, not rollback (https://docs.litellm.ai/docs/troubleshoot/rollback.md). Back up before master-key re-encryption: model re-encryption deletes and recreates rows, credential re-encryption skips failing rows (https://docs.litellm.ai/docs/proxy/master_key_rotations.md).

## 5. Salt key and master key

The salt key encrypts stored provider credentials, model `litellm_params`, MCP credentials, and DB-stored env vars. No in-place rotation: changing it makes stored credentials unreadable — do not rotate it.

| Setup | Master-key rotation |
|---|---|
| `LITELLM_SALT_KEY` set (recommended) | Replace `LITELLM_MASTER_KEY` everywhere, restart. Do **not** call `/key/regenerate` with `new_master_key` |
| No salt key | Master key is the encryption key: `POST /key/regenerate` with `key` and `new_master_key`, or `LITELLM_MIGRATE_FROM_MASTER_KEY` = old key, restart |

The boot migration re-encrypts models, credentials, config, SSO/cache settings, MCP credentials, identity assertions, and callback variables; it is idempotent and safe with concurrent replica boots (https://docs.litellm.ai/docs/proxy/master_key_rotations.md). Virtual keys are hashed and keep working. `LITELLM_MIGRATE_FROM_MASTER_KEY` needs a safe new master key, or the proxy refuses to start.

## 6. Virtual key rotation

`POST /key/{key}/regenerate` rotates a key and optionally updates its parameters. `grace_period` (`24h`, `2d`, `1w`) keeps the old key valid during cutover; omitted or empty revokes immediately. Automatic rotation needs `auto_rotate: true` plus `rotation_interval` on the key, `LITELLM_KEY_ROTATION_ENABLED=true`, optionally `LITELLM_KEY_ROTATION_CHECK_INTERVAL_SECONDS` (default 86400) and `LITELLM_KEY_ROTATION_GRACE_PERIOD`. Docs label key rotation Enterprise (https://docs.litellm.ai/docs/proxy/virtual_keys.md); the route exists in OSS code (`litellm/proxy/management_endpoints/key_management_endpoints.py:6641`).

## 7. Spend-log retention

No retention period configured, no cleanup job: nothing is deleted, whatever the batch settings. It registers when any of `maximum_spend_logs_retention_period`, `maximum_autorouter_session_retention_period`, `maximum_health_check_retention_period`, `maximum_daily_tag_spend_retention_period` is set (https://docs.litellm.ai/docs/proxy/spend_logs_deletion.md).

```yaml
general_settings:
  maximum_spend_logs_retention_period: "30d"
  maximum_spend_logs_cleanup_cron: "0 4 * * *"
  maximum_spend_logs_cleanup_max_batches: 500
```

Runs are bounded by rows per `DELETE`, statements per table, and wall clock: at defaults ≤ 500,000 rows per table and five minutes. `maximum_spend_logs_size` is independent of age; either rule deletes. Cron takes day names, never numeric weekdays — APScheduler numbers Monday 0, cron numbers Sunday 0, and LiteLLM does not translate.

## 8. Rollback

An image rollback does not undo migrations. Roll back only to a version tested against the current schema, else stop and use the tested DB recovery plan (https://docs.litellm.ai/docs/proxy/upgrade_guide.md). Helm: `helm rollback <release> [revision]`; review `config.yaml` for settings the old version rejects, keep `LITELLM_SALT_KEY`, restore the snapshot if the old version cannot use the schema. Stale `_prisma_migrations` rows block it with `New migrations cannot be applied before the error is recovered from` — fix or delete that row, restart (https://docs.litellm.ai/docs/troubleshoot/rollback.md). Clear the Redis cache if the newer version changed cache-key structure.

## 9. Verify

Every new instance must pass `/health/readiness` (https://docs.litellm.ai/docs/proxy/health.md). Through ingress, send an authenticated model request and a streaming request with an existing virtual key; check streams, permissions, spend, callbacks. Readiness and a clean Helm exit do not test provider calls.

## Sources

- https://docs.litellm.ai/docs/proxy/release_cycle.md
- https://docs.litellm.ai/docs/enterprise/version_support.md
- https://docs.litellm.ai/docs/proxy/upgrade_guide.md
- https://docs.litellm.ai/docs/proxy/database_migrations.md
- https://docs.litellm.ai/docs/proxy/master_key_rotations.md
- https://docs.litellm.ai/docs/proxy/virtual_keys.md
- https://docs.litellm.ai/docs/proxy/spend_logs_deletion.md
- https://docs.litellm.ai/docs/troubleshoot/rollback.md
- `litellm/proxy/proxy_cli.py:1213`, `litellm/deploy/helm/litellm/values.yaml:137`
