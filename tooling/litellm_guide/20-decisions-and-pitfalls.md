# 20 — Decisions and Pitfalls

LiteLLM is a gateway, not a control plane. Decisions below: OSS vs licensed, database or none, Redis or none, config ownership, how far budgets and costs can be believed.

## 1. Fit and license boundary

Fits: many providers behind one OpenAI-compatible surface, virtual keys with model access and budgets, failover, spend logs, self-hosted UI. Not: every route needing provider-native features. FastAPI app (`litellm/proxy/proxy_server.py:2222`); MIT outside `litellm/enterprise/` (`LICENSE:1-4`), which is `LicenseRef-Proprietary` (`litellm/enterprise/pyproject.toml:7`).

## 2. Open source or Enterprise

| Capability | [OSS] | [Enterprise] |
|---|---|---|
| Keys, budgets, rate limits, spend tracking, admin UI, load balancing, guardrails, MCP gateway | Yes | Yes |
| SSO / SCIM | SSO free to 5 users | Beyond 5, SCIM |
| Audit logs, org/team admins, secret managers, IP allowlists, per-team logging, multi-region | No | Yes |
| Support and SLA | Community | Yes |

One image, one version; the license key enables paid features (https://docs.litellm.ai/docs/enterprise.md). Never design around an untested gate: JWT auth returns `403 JWT Auth is an enterprise only feature` (`litellm/rust/crates/gateway-auth-core/src/error.rs:70`), SSO past five users returns 403 (`litellm/proxy/utils.py:7023`), some guardrail callbacks fail closed on a license check (`litellm/proxy/common_utils/callback_utils.py:233-249`).

## 3. Database or no database

| Choice | You get | You give up |
|---|---|---|
| No `DATABASE_URL` | One container, config models, master key only | Virtual keys, budgets, spend logs, UI data, DB models |
| Postgres | Keys, teams, budgets, spend, UI, runtime models | A database to back up, migrate, size |

Budgets enforce against database spend. Without a DB, `litellm_settings.max_budget` fails open (startup warning, then serving past the limit), virtual keys fail with `No connected db.`, the master key has no budget (https://docs.litellm.ai/docs/proxy/users.md; https://docs.litellm.ai/docs/proxy/docker_quick_start.md). Use a database for per-user spend, revocable keys, request audit, or models managed without a redeploy; DB-less only for evaluation.

## 4. Redis or no Redis

Optional with exactly one worker, required for correctness above one (https://docs.litellm.ai/docs/proxy/redis_requirements.md). Without it: a 100 RPM key across four workers admits 400 RPM, each counting locally; budgets overshoot, since spend is reserved per worker and concurrent requests pass a hard limit before the DB catches up; cooldowns, cache hits, revocation, and config changes stay per-worker until local caches expire.

Set both: `router_settings.redis_*` for router state, `litellm_settings.cache_params` for caching and coordination; env vars alone do nothing unless the config points at Redis. `LITELLM_DISABLE_NO_REDIS_WARNING=true` hides the UI banner for a single worker.

## 5. YAML or UI: who owns config

Ownership is per key since v1.103.0: a key in `config.yaml` is file-owned and the Admin UI, `/config/update`, `/config/field/update` refuse it with a 400 naming the key; an omitted key is DB-owned when `store_model_in_db` is on. `model_list` is not merged — a same-named DB model is an extra deployment, not a replacement (https://docs.litellm.ai/docs/proxy/configs.md). Pods poll runtime config every 30 s by default (`litellm/constants.py:2009`).

## 6. Alias or provider model

`model_name` is the public contract, `litellm_params.model` the provider route; clients send the alias. A raw provider string works only if also defined as a `model_name`, and couples clients to naming you may change in failover or a price migration (https://docs.litellm.ai/docs/proxy/configs.md). Cursor rejects a custom name that collides with a built-in; Claude Code's picker sends Anthropic ids that must exist verbatim (https://docs.litellm.ai/docs/tutorials/cursor_integration.md).

## 7. Budgets are not a spend guarantee

A budget is a DB-backed counter, not an invoice. Four gaps: DB-less budgets fail open; per-worker reservation overshoots without Redis; the master key has no budget; spend uses reported usage and the price map, where a missing model or rate records `spend = 0` and logs `pricing entry '<model_id>' has no input_cost_per_token, output_cost_per_token` (https://docs.litellm.ai/docs/proxy/cost_tracking.md). A key without `budget_duration` never resets. Reconcile against provider billing and keep a provider-side cap.

## 8. The cost map goes stale

`model_prices_and_context_window.json` is fetched from `main` at startup, on **Reload Price Data**, and on the optional schedule, falling back to the bundled copy. A missing model logs `This model isn't mapped yet` and records `$0`; a reload only proves the fetch worked. `GET /model/cost_map/source` shows URL and model count, `POST /reload/model_cost_map` forces a refresh (https://docs.litellm.ai/docs/troubleshoot/missing_model.md). Alert on `litellm_zero_cost_requests_total` and on zero spend for paid models; keep the map within weeks of the provider catalog or set rates in `model_info` (https://docs.litellm.ai/docs/proxy/cost_tracking.md).

## 9. Security defaults to verify

- Master key must start with `sk-`; unset, empty, or public values make the proxy refuse to start (`litellm/proxy/auth/master_key_boot_check.py:79-108`).
- Set `LITELLM_SALT_KEY` before adding credentials: no in-place rotation, and changing it makes stored provider keys unreadable (https://docs.litellm.ai/docs/proxy/master_key_rotations.md).
- `LITELLM_MODE=PRODUCTION` stops a stray `.env` load; `trusted_proxy_ranges` lets login throttling see real client IPs (https://docs.litellm.ai/docs/proxy/prod.md).
- A key with no `models` list calls every model; scope keys explicitly (`litellm/proxy/management_endpoints/key_management_endpoints.py:2469`).

## 10. Multi-worker and multi-pod traps

| Trap | Effect | Mitigation |
|---|---|---|
| Scheduler runs per worker | Budget resets and cleanups run replicas × workers times | `LITELLM_JOB_ROLE=serving` plus one `worker` replica |
| `--max_requests_before_restart`, one worker | Whole pod stops serving | Unset it; rely on pod replacement |
| Migrations from every pod | Concurrent schema changes | `DISABLE_SCHEMA_UPDATE=true` plus one job |

Jobs register per Uvicorn process, not per pod (https://docs.litellm.ai/docs/proxy/prod.md); the restart flag is warned against in the server tuning guide (https://docs.litellm.ai/docs/proxy/server_tuning.md).

## Sources

- https://docs.litellm.ai/docs/enterprise.md
- https://docs.litellm.ai/docs/proxy/configs.md
- https://docs.litellm.ai/docs/proxy/redis_requirements.md
- https://docs.litellm.ai/docs/proxy/cost_tracking.md
- https://docs.litellm.ai/docs/proxy/master_key_rotations.md
- `LICENSE:1-4`, `litellm/enterprise/pyproject.toml:7`, `litellm/proxy/proxy_server.py:2222`, `litellm/proxy/utils.py:7023`, `litellm/constants.py:2009`
- `litellm/proxy/auth/master_key_boot_check.py:79-108`, `litellm/proxy/common_utils/callback_utils.py:233-249`, `litellm/proxy/management_endpoints/key_management_endpoints.py:2469`, `litellm/rust/crates/gateway-auth-core/src/error.rs:70`
