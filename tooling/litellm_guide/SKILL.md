---
name: litellm
description: >
  LiteLLM 1.111.0 MIT AI Gateway: FastAPI proxy, router, Postgres/Redis,
  quickstart/Compose/Helm, config ownership, aliases, virtual keys, budgets,
  OpenAI/Anthropic APIs, UI, management API, cache, observability, guardrails,
  MCP, production, upgrades, troubleshooting. Marks Enterprise-only features.
  Load when deploying, securing, integrating, tuning or debugging LiteLLM.
category: tooling
version: "1.111.0 (Community)"
tags: [litellm, ai-gateway, proxy, openai-compatible, virtual-keys, budgets, spend-tracking, routing, fallbacks, postgres, redis, docker, observability, guardrails, mcp]
license: MIT (guide); upstream MIT except litellm/enterprise (proprietary)
---

# LiteLLM — Community AI Gateway 1.111.0

**Baseline:** `BerriAI/litellm` @ `bcb1f48` (2026-11-17), `version = "1.111.0"`
(`pyproject.toml:3`). Docs read 2026-11-16/17; every page has a `.md` form.
Root is MIT; `litellm/enterprise/` is proprietary (`LICENSE:1-4`,
`litellm/enterprise/pyproject.toml:7`).

**Load when:** installing or exposing the proxy, writing `config.yaml`, adding
models/providers, issuing keys, enforcing budgets, configuring routing or
fallbacks, calling the API, debugging 401/429/5xx, adding Postgres/Redis, or
deciding whether Enterprise is required.

## Core Rules

1. **Community first.** Virtual keys, budgets, spend, routing, UI, guardrails
   and MCP are MIT. SSO beyond 5 users, audit logs, SCIM, org/team admins,
   secret managers and per-team logging need Enterprise
   (`https://docs.litellm.ai/docs/enterprise.md`).
2. **Master key mandatory.** Unset, empty or publicly known keys refuse boot
   (`litellm/proxy/auth/master_key_boot_check.py:79-108,161-174`).
   `LITELLM_SALT_KEY` encrypts stored credentials; changing it makes them
   unreadable.
3. **Postgres is the control plane.** No DB means master-key-only traffic: no
   virtual keys, budgets or spend tracking; `max_budget` fails open
   (`https://docs.litellm.ai/docs/proxy/users.md`).
4. **Redis for >1 worker.** Rate limits, budgets, cooldowns, cache invalidation
   and dynamic config become per-worker without it. Set both
   `router_settings.redis_*` and `litellm_settings.cache_params`
   (`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).
5. **`model_name` is the client alias; `litellm_params.model` is the provider
   model.** Several deployments with one alias form a load-balanced group; a
   fallback targets a group, not a raw provider string.
6. **Config ownership is key-by-key.** Since v1.103, a YAML key is file-owned
   and UI/API writes return 400. `model_list` is not merged: DB models are
   additional deployments (`https://docs.litellm.ai/docs/proxy/configs.md`).
7. **One worker per pod on Kubernetes.** Scale replicas, not workers; set
   `LITELLM_JOB_ROLE=serving` to avoid duplicate cron jobs
   (`https://docs.litellm.ai/docs/proxy/prod.md`).
8. **Pin the image.** Quickstart uses `:latest`; production uses a release tag
   or digest. Migrations run as a separate job, not from every serving pod.
9. **Budget math is per worker × instances.** `database_connection_pool_limit`
   defaults to 10; 3 instances × 4 workers × 10 = 120 connections.
10. **Spend logs are not traces.** Use callbacks (Langfuse/OTEL/Datadog/S3) for
    request observability; spend logs are for cost/budget accounting.
11. **Enterprise gates live in code.** Enterprise callbacks raise without
    `premium_user` (`litellm/proxy/common_utils/callback_utils.py:225-300`);
    code presence is not a license grant.
12. **Verify docs against the checkout.** Docs `latest` drifts; `num_retries` is
    documented as 2 but declared 0/None in code
    (`litellm/types/router.py:164`, `litellm/router.py:80`).

## Minimal Stack

```bash
curl -sSLO https://github.com/BerriAI/litellm/raw/main/litellm/deploy/docker/docker-compose.quickstart.yml
printf 'LITELLM_MASTER_KEY=sk-%s\nLITELLM_SALT_KEY=sk-%s\n' \
  "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env
docker compose -f docker-compose.quickstart.yml up -d
```

```yaml
model_list:
  - model_name: gpt-main
    litellm_params: {model: openai/gpt-5.4-mini, api_key: os.environ/OPENAI_API_KEY}
  - model_name: gpt-main
    litellm_params: {model: azure/gpt-5.4-mini, api_base: os.environ/AZURE_API_BASE, api_key: os.environ/AZURE_API_KEY}
router_settings:
  routing_strategy: simple-shuffle
  num_retries: 2
  redis_host: os.environ/REDIS_HOST
  redis_port: os.environ/REDIS_PORT
litellm_settings:
  drop_params: true
  cache: true
  cache_params: {type: redis, host: os.environ/REDIS_HOST, port: os.environ/REDIS_PORT}
general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  store_model_in_db: true
  proxy_batch_write_at: 60
```

```bash
curl -sS "$PROXY/key/generate" -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key_alias":"app","models":["gpt-main"],"max_budget":200,"budget_duration":"30d"}'
curl -sS "$PROXY/v1/chat/completions" -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-main","messages":[{"role":"user","content":"hello"}]}'
```

## File Map

| File | Content |
|---|---|
| `00-index.md` | Orientation, measured surface, boundary, map |
| `01-product-and-license.md` | SDK vs gateway, MIT/Enterprise split |
| `02-architecture-and-processes.md` | FastAPI lifecycle, workers, split components |
| `03-source-and-build.md` | Package layout, Python range, tests, builds |
| `04-installation.md` | Quickstart, Compose, docker run, pip/uv, Helm/Terraform |
| `05-configuration.md` | Sections, aliases, precedence, DB ownership, reload |
| `06-database-and-redis.md` | Schema, migrations, pooling, Redis requirements |
| `07-security-and-keys.md` | Master/salt, virtual keys, auth, SSO limit |
| `08-providers-and-routing.md` | Provider strings, strategies, retries, fallbacks |
| `09-api-usage.md` | OpenAI/Anthropic routes, streaming, headers, errors |
| `10-budgets-and-spend.md` | Key/team/user/tag budgets, limits, spend logs |
| `11-admin-ui.md` | `/ui` login, models, keys, teams, usage, limits |
| `12-management-api.md` | `/key`, `/team`, `/user`, `/model`, `/config` |
| `13-caching-and-performance.md` | Cache types, Redis, workers, pool, sizing |
| `14-observability.md` | Callbacks, Prometheus, logs, redaction, retention |
| `15-guardrails-and-mcp.md` | OSS guardrails, Presidio, MCP/A2A |
| `16-client-integration.md` | OpenAI/Anthropic SDKs, Claude Code, Codex, Cursor |
| `17-production-deployment.md` | Helm/Terraform, HPA, probes, drain, secrets |
| `18-operations-and-troubleshooting.md` | Health, logs, 401/429/5xx, DB/Redis |
| `19-upgrade-and-maintenance.md` | Migrations, backup, rotation, retention, rollback |
| `20-decisions-and-pitfalls.md` | OSS/Enterprise, DB/Redis, YAML/UI, traps |
| `21-quick-reference.md` | Config, env, CLI, endpoints, curl, errors |
| `22-recommended-implementation.md` | Minimal community stack + sufficiency test |
| `23-coverage-and-limits.md` | Measured coverage, contradictions, unverified |

## Read Order and Prereqs

`00` -> `01` -> `02` -> `04` -> `05` -> `07` -> `08` -> `09` -> `10` -> `17` ->
`18` -> `22` -> `23`. Use `03`/`06` for internals, `11`-`15` for platform
features, `16` for clients, `19`-`21` for operations and lookup.

Docker/Compose or Python 3.10-3.15; Postgres 16 for keys/budgets/spend; Redis
for multi-worker correctness; provider keys; basic HTTP/OAuth and OpenAI API
knowledge. Kubernetes adds Helm/Terraform, ingress/TLS and a secret store.
