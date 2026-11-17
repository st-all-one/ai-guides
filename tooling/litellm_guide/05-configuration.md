# 05 — Configuration

`config.yaml` declares models, routing, SDK behavior, server settings, and injected env vars.
Recurring incidents: file-vs-database key ownership, and `model_list` never being merged. [OSS]
throughout; only the license key is [Enterprise].

## 1. Five sections

| Section | Purpose |
|---|---|
| `model_list` | deployments: `model_name` + `litellm_params` |
| `router_settings` | routing, retries, cooldowns, fallbacks, Redis |
| `litellm_settings` | callbacks, cache, timeouts, `drop_params` |
| `general_settings` | master key, database, pool limits, alerts |
| `environment_variables` | env vars injected at config load |

Loaded at startup from `CONFIG_FILE_PATH` or `--config`/`-c`
(`litellm/proxy/proxy_server.py:1739-1749`; `litellm/proxy/proxy_cli.py:1090-1095`), or from
S3/GCS via `LITELLM_CONFIG_BUCKET_NAME` (`litellm/proxy/proxy_server.py:1757-1764`).

## 2. `model_list`

`model_name` is what clients send; `litellm_params.model` is the provider-qualified string
passed to `litellm.completion()`. Repeating a `model_name` adds deployments to the group,
load-balanced across them; `model_name: "*"` catches undefined providers.

```yaml
model_list:
  - model_name: gpt-6.1-sol
    litellm_params:
      model: azure/gpt-6.1-sol-eu
      api_key: os.environ/AZURE_API_KEY_EU
      rpm: 6
  - model_name: gpt-6.1-sol
    litellm_params:
      model: azure/gpt-6.1-sol-ca
      api_key: os.environ/AZURE_API_KEY_CA
```

`litellm_params` takes any `litellm.completion()` parameter (e.g. `api_base`) plus deployment
limits such as `rpm` (`https://docs.litellm.ai/docs/proxy/configs.md`).

## 3. Secrets and credentials

- `os.environ/NAME` becomes `os.getenv("NAME")` anywhere in the file.
- `credential_list` defines credentials once; models reference `litellm_credential_name`. YAML
  credentials cannot be edited through the API (PATCH/DELETE return 405) and
  `credential_name` is permanent (`https://docs.litellm.ai/docs/proxy/configs.md`).
- UI-saved credentials are encrypted with `LITELLM_SALT_KEY`; changing it makes them
  unreadable, with no in-place rotation (`https://docs.litellm.ai/docs/proxy/prod.md`).

## 4. File vs database ownership

Since v1.103.0 all keys in `general_settings`, `router_settings`, `litellm_settings`, and
`environment_variables` are owned **key by key**:

- In `config.yaml` = file-owned: the proxy always uses the file value, and the Admin UI,
  `/config/update`, `/config/field/update` refuse changes with HTTP 400.
- Absent = database-owned once `store_model_in_db` is on; values live in `LiteLLM_Config`
  (`litellm/proxy/schema.prisma:808`) and apply at startup and each refresh.
- Equal values are accepted; remove a key from the file to hand it to the UI.

The 400 body names the key, section, ignored value, and the fix
(`https://docs.litellm.ai/docs/proxy/configs.md`, "config.yaml vs database settings"); endpoints
are `litellm/proxy/proxy_server.py:21155` (`/config/update`) and `:21457`
(`/config/field/update`). Pre-v1.103.0 the database deep-merged over the file and won.
`store_model_in_db` comes from the environment or `general_settings`
(`litellm/proxy/proxy_server.py:12003`); off means the database is never read and YAML rules.

### `model_list` is not merged

UI/API models live in `LiteLLM_ProxyModelTable` (`litellm/proxy/schema.prisma:149`) and are
served **alongside** YAML models. One with the same name is an extra deployment in the group,
load-balanced with the YAML entry, never a replacement; edit YAML models in the file, delete
database models via the API, or you debug a group larger than the file shows
(`https://docs.litellm.ai/docs/proxy/model_management.md`).

## 5. Reload behavior

File edits need a restart or explicit reload (`litellm/proxy/proxy_server.py:1739-1749`).
Database config is polled per pod every 30 s by default (`proxy_config_reload_interval_seconds`
/ `PROXY_CONFIG_RELOAD_INTERVAL_SECONDS`); no cross-pod push, so convergence takes up to one
interval, and the interval is read at startup
(`https://docs.litellm.ai/docs/proxy/prod.md`, "Tune config reload across pods").

## 6. Router defaults

| Setting | Default | Effect |
|---|---|---|
| `routing_strategy` | `simple-shuffle` | load balancing across deployments |
| `num_retries` | `2` | retries per request |
| `cooldown_time` | `5` s | how long a failing deployment stays out |
| `allowed_fails` | `null` | unset means rate-based cooldown |
| `max_fallbacks` | `5` | fallback attempts before failing |

(`https://docs.litellm.ai/docs/proxy/config_settings.md#router_settings---reference`.) These
also work under `litellm_settings`, but `router_settings` wins. Redis here covers cooldowns and
usage/latency routing; response caching and proxy-wide coordination need the cache block
(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).

## 7. `litellm_settings`

| Setting | Default | Notes |
|---|---|---|
| `drop_params` | unset | unsupported params raise, except Claude Code/Codex, which drop them; `true` drops for all. v1.103.0–v1.108.x ignored `false` for those two |
| `request_timeout` | 6000 s | LLM requests and native passthrough routes |
| `max_budget` | `0` (none) | proxy-wide USD cap; needs a database, else never enforced (`litellm/proxy/proxy_server.py:11406-11416`) |
| `cache`, `cache_params` | off | response caching; `cache_params.type` defaults to `redis` when enabled |

`set_verbose` is deprecated: use `LITELLM_LOG=INFO|DEBUG|ERROR` and `json_logs: true`
(`https://docs.litellm.ai/docs/proxy/prod.md`). Other defaults:
`https://docs.litellm.ai/docs/proxy/config_settings.md`.

## 8. `general_settings`

- `master_key`: required for administration, must start with `sk-`; empty or publicly known
  values refuse startup (`litellm/proxy/auth/master_key_boot_check.py:79-108`).
- `database_connection_pool_limit`: connections **per worker**, default 10; size
  `MAX_DB_CONNECTIONS / (instances × workers)`.
- `proxy_batch_write_at`: spend-write batching; 60 seconds in production.
- `trusted_proxy_ranges`: LB CIDRs, or `[]` for direct clients; unset weakens failed-login
  limiting.
- `disable_error_logs`, `disable_spend_logs`: keep error or request rows out of Postgres.

(`https://docs.litellm.ai/docs/proxy/configs.md`; `https://docs.litellm.ai/docs/proxy/prod.md`;
`https://docs.litellm.ai/docs/proxy/db_info.md`.)

## 9. Common mistakes

| Symptom | Cause |
|---|---|
| UI returns 400 on a setting | key declared in `config.yaml` |
| Extra deployments | DB model plus YAML model, not merged |
| Provider key rejected | `os.environ/NAME` unset |
| Credentials unreadable | `LITELLM_SALT_KEY` changed or missing |
| Budget never triggers | no database, or non-positive `max_budget` |
| Rate limits multiply by pods | no Redis, or only `router_settings.redis_*` |

## Sources

- `litellm/proxy/proxy_server.py`
- `litellm/proxy/proxy_cli.py`
- `litellm/proxy/schema.prisma`
- `litellm/proxy/auth/master_key_boot_check.py`
- https://docs.litellm.ai/docs/proxy/configs.md
- https://docs.litellm.ai/docs/proxy/config_settings.md
- https://docs.litellm.ai/docs/proxy/prod.md
- https://docs.litellm.ai/docs/proxy/redis_requirements.md
