# 21 — Quick Reference

Values are code defaults unless marked. Routes and flags exist in the OSS image; license limits are noted where they apply.

## 1. Minimal production-shaped config

```yaml
model_list:
  - model_name: gpt-6.1-sol
    litellm_params:
      model: openai/gpt-6.1-sol
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-sonnet-5
    litellm_params:
      model: anthropic/claude-sonnet-5
      api_key: os.environ/ANTHROPIC_API_KEY

router_settings:
  routing_strategy: simple-shuffle
  num_retries: 2
  redis_host: os.environ/REDIS_HOST
  redis_port: os.environ/REDIS_PORT
  redis_password: os.environ/REDIS_PASSWORD

litellm_settings:
  json_logs: true
  cache: true
  cache_params:
    type: redis
    host: os.environ/REDIS_HOST
    port: os.environ/REDIS_PORT
    password: os.environ/REDIS_PASSWORD

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  store_model_in_db: true
  proxy_batch_write_at: 60
  database_connection_pool_limit: 10
  disable_error_logs: true
  trusted_proxy_ranges: ["10.0.0.0/8"]
```

Sections: `model_list`, `router_settings`, `litellm_settings`, `general_settings`, `environment_variables` (https://docs.litellm.ai/docs/proxy/configs.md). `simple-shuffle` and `num_retries: 2` are the documented router defaults (https://docs.litellm.ai/docs/proxy/config_settings.md).

## 2. Environment variables

| Variable | Purpose | Default / note |
|---|---|---|
| `LITELLM_MASTER_KEY` | Admin credential, `sk-` prefix | Required |
| `LITELLM_SALT_KEY` | Encrypts stored provider credentials | Never rotate after use |
| `DATABASE_URL` | Postgres for keys, spend, config | No DB, no budgets |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Coordination and cache | Required multi-worker |
| `STORE_MODEL_IN_DB` | DB-owned models and config | Off |
| `NUM_WORKERS` | Uvicorn workers | `1` (`litellm/constants.py:140`) |
| `LITELLM_JOB_ROLE` | `all`, `worker`, or `serving` | `all` |
| `LITELLM_LOG` | Log level | `ERROR` in production |
| `LITELLM_MODE` | `PRODUCTION` disables `load_dotenv()` | Unset |
| `DISABLE_SCHEMA_UPDATE` | Skip startup migrations | Set on serving pods |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | Drain bound, seconds | `30` since v1.108.0 |
| `LITELLM_MIGRATION_DIR` | Writable migration directory | Needed with read-only root |

Batch defaults: `litellm/constants.py:2008`; production set: https://docs.litellm.ai/docs/proxy/prod.md.

## 3. CLI flags

All in `litellm/proxy/proxy_cli.py`.

| Flag | Default | Notes |
|---|---|---|
| `--host` | `0.0.0.0` | Env `HOST` (`:1016`) |
| `--port` | `4000` | Env `PORT` (`:1017`) |
| `--num_workers` | `1` | Env `NUM_WORKERS` (`:1019`) |
| `--config` / `-c` | none | Path to `config.yaml` (`:1091`) |
| `--run_gunicorn` | off | Multi-worker container (`:1165`) |
| `--run_hypercorn` | off | HTTP/2 (`:1171`) |
| `--run_granian` | off | Rust ASGI server (`:1177`) |
| `--skip_server_startup` | off | Migrations only (`:1213`) |
| `--max_requests_before_restart` | unset | Never with one worker (`:1263`) |

## 4. Endpoints

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /v1/chat/completions`, `/chat/completions` | Key | Chat, streaming (`litellm/proxy/proxy_server.py:13562`, `:13567`) |
| `POST /v1/messages` | Key | Anthropic Messages (`litellm/proxy/anthropic_endpoints/endpoints.py:159`) |
| `POST /v1/responses` | Key | OpenAI Responses (`litellm/proxy/response_api_endpoints/endpoints.py:319`) |
| `POST /v1/embeddings` | Key | Embeddings (`litellm/proxy/proxy_server.py:13855`) |
| `GET /v1/models` | Key | Model list (`litellm/proxy/proxy_server.py:13093`) |
| `GET /health/liveliness` | None | `"I'm alive!"`, 503 on drain |
| `GET /health/readiness` | None | `{"status","db"}`, 503 if DB down |
| `GET /health/readiness/details` | Key | Cache, callbacks, version |
| `GET /health?model=NAME` | Key | Real probe per deployment |
| `POST /key/generate` | Master/admin | Create key (`litellm/proxy/management_endpoints/key_management_endpoints.py:2439`) |
| `GET /key/info` | Master/admin | Key details (`:5174`) |
| `POST /key/update` | Master/admin | Edit key (`:4155`) |
| `POST /key/delete` | Master/admin | Delete key (`:4897`) |
| `POST /key/{key}/regenerate` | Master/admin | Rotate key (`:6641`, Enterprise per docs) |
| `GET /ui` | Browser | Admin UI login (https://docs.litellm.ai/docs/proxy/ui.md) |

Health semantics: https://docs.litellm.ai/docs/proxy/health.md.

## 5. Curl recipes

Create a scoped key, then chat:

```bash
curl -s http://localhost:4000/key/generate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' \
  -d '{"models": ["gpt-6.1-sol"], "max_budget": 50, "budget_duration": "30d"}'

curl -s http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"gpt-6.1-sol","messages":[{"role":"user","content":"hello"}]}'
```

Durations accept `30s`, `30m`, `30h`, `30d`; a key without `budget_duration` never resets (https://docs.litellm.ai/docs/proxy/virtual_keys.md).

## 6. Errors

| Error | Meaning | First fix |
|---|---|---|
| 401 `Invalid proxy server token passed` | Unknown, blocked, or expired key | Create one with `/key/generate` |
| 403 `key_model_access_denied` | Key's `models` list excludes it | Add the alias or use another key |
| 403 `JWT Auth is an enterprise only feature` | Unlicensed JWT auth | Virtual keys, or license it |
| 422 | Budget exceeded (`litellm/__init__.py:394`) | Inspect key/team/user spend |
| 429 | RPM/TPM or parallel-request limit | Inspect key limits |
| 503 readiness | Database unreachable or draining | `/health/readiness`, DB status |
| `No connected db.` | Virtual key without `DATABASE_URL` | Run Postgres |
| `FATAL: sorry, too many clients already` | Connections exhausted | Lower pool or add PgBouncer |

## 7. Production checklist

- [ ] Master key and salt key from a secret manager
- [ ] Postgres private; pool × replicas within `max_connections`
- [ ] Redis configured in both router and cache blocks
- [ ] Migrations run once with the target image
- [ ] Readiness and liveness probes on `/health/*`; drain above the longest request; `maxUnavailable: 0`
- [ ] Image pinned by digest and cosign-verified
- [ ] Read-only root, with writable cache, UI, migration paths
- [ ] `LITELLM_JOB_ROLE=serving` plus one worker deployment
- [ ] Spend-log retention and zero-cost alerting enabled

## Sources

- https://docs.litellm.ai/docs/proxy/configs.md
- https://docs.litellm.ai/docs/proxy/config_settings.md
- https://docs.litellm.ai/docs/proxy/prod.md
- https://docs.litellm.ai/docs/proxy/health.md
- https://docs.litellm.ai/docs/proxy/virtual_keys.md
- `litellm/proxy/proxy_cli.py:1016-1019`, `:1091`, `:1165-1177`, `:1213`, `:1263`; `litellm/constants.py:140`, `:2008`; `litellm/__init__.py:394`
- `litellm/proxy/proxy_server.py:13093`, `:13562`, `:13567`, `:13855`; `litellm/proxy/anthropic_endpoints/endpoints.py:159`; `litellm/proxy/response_api_endpoints/endpoints.py:319`; `litellm/proxy/management_endpoints/key_management_endpoints.py:2439`, `:4155`, `:4897`, `:5174`, `:6641`
