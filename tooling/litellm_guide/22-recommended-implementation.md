# 22 — Recommended community implementation

The smallest **verified** community stack that turns LiteLLM from a demo into a controllable internal gateway.

## 1. Scope and assumptions

One region, one platform team, 2–20 applications, Postgres and Redis allowed, clients speaking OpenAI-compatible or Anthropic-compatible HTTP, and no SSO/audit/Vault requirement yet — if those are hard, budget for Enterprise (`01`). Out of scope: multi-region, SCIM, per-team log routing, enterprise guardrails.

## 2. Phase 1: prove the path locally

The quickstart compose starts the proxy and Postgres 16, sets `STORE_MODEL_IN_DB=True`, and exposes port 4000 (`litellm/deploy/docker/docker-compose.quickstart.yml`):

```bash
curl -sSLO https://github.com/BerriAI/litellm/raw/main/litellm/deploy/docker/docker-compose.quickstart.yml
printf 'LITELLM_MASTER_KEY=sk-%s\nLITELLM_SALT_KEY=sk-%s\n' \
  "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env
docker compose -f docker-compose.quickstart.yml up -d
```

Open `http://localhost:4000/ui`, log in as `admin` with the master key, add a model, create a virtual key, send a request — UI → Postgres → key → router → provider. If it fails, fix that layer using `18` first.

The installer (`quickstart.sh` / `quickstart.ps1`) wraps the same stack, writes credentials to `~/litellm-gateway/.env`, binds to localhost, installs a `litellm-gateway` command (https://docs.litellm.ai/llms.txt).

## 3. Phase 2: the production shape

- TLS ingress/WAF in front of two or more LiteLLM pods, one Uvicorn worker each.
- Postgres primary: keys, spend, config, models, teams. Shared Redis: limits, budgets, cooldowns, cache.
- Pod egress reaches provider APIs; nothing else is public.

Scale with replicas, not worker counts, and point every replica at the same Postgres and Redis (https://docs.litellm.ai/docs/proxy/prod.md); terminate TLS at the ingress; pin the image to a release tag or digest, not `:latest`; run migrations as a job, never from serving pods.

## 4. Minimal `config.yaml`

```yaml
model_list:
  - model_name: gpt-main
    litellm_params:
      model: openai/gpt-5.4-mini
      api_key: os.environ/OPENAI_API_KEY
      rpm: 600
  - model_name: gpt-main
    litellm_params:
      model: azure/gpt-5.4-mini
      api_base: os.environ/AZURE_API_BASE
      api_key: os.environ/AZURE_API_KEY
      api_version: "2025-04-01-preview"

router_settings:
  routing_strategy: simple-shuffle
  num_retries: 2
  timeout: 600
  fallbacks: [{"gpt-main": ["claude-backup"]}]
  redis_host: os.environ/REDIS_HOST
  redis_port: os.environ/REDIS_PORT
  redis_password: os.environ/REDIS_PASSWORD

litellm_settings:
  drop_params: true
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
```

Two deployments under one `model_name` give the router a real choice; one cannot fail over within its group. `simple-shuffle` is the default and predictable; move to latency/usage routing after measuring (`08`). `drop_params: true` buys compatibility with optional-parameter rejections, not security (`litellm/proxy/proxy_server.py:7466-7467`). `proxy_batch_write_at: 60` keeps spend writes off a DB hot spot (`litellm/proxy/proxy_server.py:7738`; https://docs.litellm.ai/docs/proxy/prod.md). `store_model_in_db: true` lets the UI/API manage models without a restart, but YAML keys become file-owned (`05`; `litellm/proxy/proxy_server.py:12003`). `fallbacks` names `claude-backup`: define it, or requests fail (`litellm/router.py:81,89`).

## 5. Keys and budgets

```bash
curl -sS "$PROXY/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "Content-Type: application/json" \
  -d '{"key_alias": "app-billing", "models": ["gpt-main"], "max_budget": 200,
       "budget_duration": "30d", "rpm_limit": 300, "tpm_limit": 300000}'
```

The key is shown once: store it in the app's secret store, not Git. Budgets and rate limits need Postgres; a DB-less proxy accepts only the master key and does **not** enforce budgets (`litellm/proxy/management_endpoints/key_management_endpoints.py:2438-2477`; `litellm/proxy/proxy_server.py:11406-11416`; https://docs.litellm.ai/docs/proxy/users.md).

| Scope | Use |
|---|---|
| Key | Per app/env; hard cap and model allowlist |
| Team | Per product group; shared budget and model access |
| User | Per human; self-serve keys and personal spend |
| Tag | Per cost center/environment, when request tags are trustworthy |
| Customer | End-user spend |

## 6. Observability minimum

- `GET /health/liveliness` for liveness, `GET /health/readiness` for readiness (`litellm/proxy/health_endpoints/_health_endpoints.py:2333,2440`).
- `LITELLM_LOG=ERROR` in production; `json_logs` if the pipeline expects JSON.
- One callback (Langfuse/OTEL/Datadog/S3) instead of scraping `spend_logs` for traces — they answer different questions (`14`).
- Scrape `/metrics`, or run `--prometheus_metrics_port` as a dedicated metrics process.

## 7. Hardening checklist

- [ ] `LITELLM_MASTER_KEY` and `LITELLM_SALT_KEY` from a secret manager.
- [ ] Postgres TLS verified, backups tested, Redis reachable only from proxy pods.
- [ ] Ingress TLS; proxy not exposed; `trusted_proxy_ranges` = ingress CIDRs (or `[]` if direct).
- [ ] `disable_error_logs: true` for noisy providers; `turn_off_message_logging: true` or `store_prompts_in_spend_logs: false` for sensitive prompts.
- [ ] Image pinned and signature verified; one worker per pod, `LITELLM_JOB_ROLE=serving`.
- [ ] Alert on 5xx rate, provider latency, DB connections, Redis errors.

## 8. Sufficiency test

Answer all without adding a column or table:

1. Key with the most spend this month? → `LiteLLM_SpendLogs` / `/key/info`.
2. Which team nears its budget? → team spend + `max_budget`.
3. Which group failed over last night? → router logs + fallback config.
4. Which deployment is cooling down? → router state/Redis + logs.
5. What does alias `gpt-main` resolve to? → `model_list`.
6. May this key call `claude-backup`? → key/team model access.
7. Is the budget enforced without Postgres? → no; docs warning.
8. Does a second worker respect the same RPM? → only with Redis.
9. Provider key rotation without downtime? → DB credential update.
10. Salt key rotation in place? → no; credentials become unreadable.
11. Audit who deleted a key? → not in OSS; Enterprise audit logs.
12. SSO for 10 admins? → no; free up to 5.

## 9. What not to do

- Multiple workers or replicas without Redis, expecting global limits.
- `max_budget` without Postgres, calling it enforced.
- A YAML-declared key the UI is expected to change; `:latest` in production.
- Exposing the proxy without TLS and a master key.
- Rotating `LITELLM_SALT_KEY` without a credential re-entry plan, or trusting docs `latest` numbers for a pinned version.

## Sources

- `litellm/deploy/docker/docker-compose.quickstart.yml`
- `litellm/proxy/health_endpoints/_health_endpoints.py:2333,2440`
- `litellm/scripts/quickstart.sh`
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md
- https://docs.litellm.ai/docs/proxy/users.md
- https://docs.litellm.ai/docs/proxy/prod.md
