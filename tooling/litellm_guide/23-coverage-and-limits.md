# 23 — Coverage, verification and limits

What was measured, what was inferred, what was **not** executed, and where docs and checkout disagree. Read this before treating any statement here as a guarantee.

## 1. Research surface

| Surface | Value | How measured |
|---|---:|---|
| Source commit | `bcb1f48` (2026-11-17) | `git rev-parse HEAD` |
| Package version | `1.111.0` | `pyproject.toml:3` |
| Python files / LOC | 3,580 / 1,158,033 | `find litellm -name '*.py'`, `wc -l` |
| Proxy LOC | 460,585 | `litellm/proxy/**/*.py` |
| Provider adapters | 159 directories | `litellm/llms/*` |
| Prisma schema | 2,383 lines | `litellm/proxy/schema.prisma` |
| Test files | 6,237 | `tests/` |
| Docs dump | 10,068,412 bytes / 250,252 lines | `llms-full.txt` |

Docs pages were read as markdown (`<url>.md`) and through the full dump. The guide cites the pages it uses; it does not claim to summarize all 10 MB.

## 2. Coverage by topic

| Topic | Depth | Basis |
|---|---|---|
| Product/license boundary | high | LICENSE, enterprise package, enterprise docs |
| Architecture/processes | high | proxy source, Docker entrypoint, docs |
| Install/topologies | high | quickstart and full compose, Dockerfile, deploy docs |
| Configuration | high | `configs.md`, `config_settings.md`, code |
| Postgres/Redis | high | Prisma schema, Redis requirements, prod docs |
| Keys/auth | high | key endpoints, auth code, virtual-key docs |
| Routing/fallbacks | high | Router code, routing/reliability docs |
| API usage and clients | high | OpenAPI/proxy routes, client docs |
| Budgets/spend, management API | high | users/cost docs, spend tables, endpoint code |
| Observability | high | callback docs, code, Prometheus process |
| Admin UI | medium | docs + static UI source; no browser run |
| Caching/performance | medium | docs + code; no load test |
| Guardrails/MCP | medium | docs + code; no provider execution |
| Production/ops | high | prod, deploy, health, upgrade docs |
| Enterprise features | boundary only | docs; no license tested |

## 3. What was not verified

- Starting the proxy, pulling the image, or running a container.
- Calling any real LLM provider through the gateway.
- Rendering the Admin UI in a browser.
- Running Prisma migrations against a real Postgres.
- Exercising Redis failover, multi-worker limits, or cache behavior.
- Triggering guardrails, MCP tools, or an A2A agent.
- Testing an Enterprise license or any gated feature.
- Load, latency, throughput, or capacity measurements.

Claims in those areas come from source code and docs, not observation — implementation reading, not a test report.

## 4. Contradictions and moving targets

1. **Docs `latest` vs code version.** Docs describe a moving `latest` (pages updated 2026-11-16/17); the checkout is `1.111.0` (`pyproject.toml:3`). Provider/model examples may be newer than the code's cost map.
2. **Retry default.** The config reference says `num_retries` 2 (https://docs.litellm.ai/docs/proxy/config_settings.md), while `RouterConfig` declares `num_retries: int | None = 0` (`litellm/types/router.py:164`) and `Router.__init__` declares `None` (`litellm/router.py:80`). Check the effective value at startup.
3. **SSO "free" vs "Enterprise".** SSO is free to 5 users; beyond that a license is required (https://docs.litellm.ai/docs/enterprise.md). Both statements hold at different scales.
4. **Image tags.** Quickstart compose uses `:latest` (`litellm/deploy/docker/docker-compose.quickstart.yml`), full compose `:main-stable` (`litellm/deploy/compose/docker-compose.yml`), production docs a pinned tag or digest. Treat compose tags as convenience.
5. **DB-less budgets.** `litellm_settings.max_budget` is accepted without a DB but fails open; key/team/user budgets need virtual keys, which need a DB (https://docs.litellm.ai/docs/proxy/users.md).
6. **Redis "optional".** One worker can run without it, but rate limits, budgets, cooldowns, cache invalidation, and dynamic config become per-worker (https://docs.litellm.ai/docs/proxy/redis_requirements.md).
7. **Config ownership.** From v1.103 a key declared in `config.yaml` is file-owned and UI/API writes are refused; `model_list` is not merged the same way — DB models are additional deployments (https://docs.litellm.ai/docs/proxy/configs.md).
8. **Salt key rotation.** None in place; changing `LITELLM_SALT_KEY` makes stored provider credentials unreadable until re-entered (https://docs.litellm.ai/docs/proxy/prod.md).

## 5. Documented surprises

- The proxy starts with a config file and no database; only the master key works and virtual keys fail with `No connected db.` (https://docs.litellm.ai/docs/proxy/docker_quick_start.md).
- The master key is the default Admin UI password when `UI_PASSWORD` is unset; `disable_env_credential_login` turns that path off (https://docs.litellm.ai/docs/proxy/ui.md).
- One image runs every component; the first word selects `proxy`, `gateway`, `backend`, `ui`, `migrations`, `metrics`, or `collector` (`litellm/deploy/docker/docker-entrypoint.sh:1-26`).
- The UI is a static React build served by the proxy (`litellm/ui/litellm-dashboard`), not a separate backend service.
- A `fallback` must reference a **model group** (`model_name`), not a provider model string; a typo fails at request time, not config load.

## 6. Sufficiency verdict

The guide answers what a community operator asks: what to run and which parts need Postgres/Redis; how to add a model, issue a key, cap spend, and call the gateway; how routing and failover behave; where to look when auth, budget, routing, or provider calls fail; what is free and what needs a license. It does **not** guarantee coverage of every provider, Enterprise gate, or edge case: the source is 1.16M LOC and the docs 10 MB. There is no completeness percentage — it is a verified map of the community path, not a substitute for testing your provider/config combination.

## 7. Maintenance contract

- Re-check the baseline commit and `pyproject.toml:3` before trusting version claims.
- Re-run the citation resolver after edits; a line range that no longer resolves is a broken fact.
- Re-read the enterprise docs page when adding a feature claim; the boundary moves.
- Keep examples on the `1.111.0` line; do not mix `latest` docs defaults into a pinned deployment.

## Sources

- `pyproject.toml:3`, `litellm/types/router.py:164`, `litellm/router.py:80`, `litellm/proxy/schema.prisma`
- `litellm/deploy/docker/docker-compose.quickstart.yml`, `litellm/deploy/compose/docker-compose.yml`, `litellm/deploy/docker/docker-entrypoint.sh:1-26`
- https://docs.litellm.ai/docs/enterprise.md
- https://docs.litellm.ai/docs/proxy/configs.md
- https://docs.litellm.ai/docs/proxy/config_settings.md
- https://docs.litellm.ai/docs/proxy/users.md
- https://docs.litellm.ai/docs/proxy/redis_requirements.md
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md
- https://docs.litellm.ai/docs/proxy/prod.md
- https://docs.litellm.ai/llms-full.txt
