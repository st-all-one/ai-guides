# 01 — Product, license and community boundary

LiteLLM is two products in one repository: a **Python SDK** that normalizes
provider calls and an **AI Gateway** that exposes them over HTTP. This guide is
about the gateway, because keys, budgets, routing and the Admin UI live there.
Gateway code is MIT outside `litellm/enterprise/`, which is proprietary
(`LICENSE:1-4`).

## 1. What the proxy is

A FastAPI application (`litellm/proxy/proxy_server.py:2222`) bundling:

- OpenAI-compatible inference (`/v1/chat/completions`, `/v1/responses`,
  `/v1/embeddings`, `/v1/models`) plus Anthropic `/v1/messages`.
- A management plane: `/key/*`, `/team/*`, `/user/*`, `/model/*`, `/config/*`.
- An auth/budget/spend layer that runs before the router.
- A router mapping a public `model_name` to deployments, with retries,
  cooldowns and fallbacks.
- Optional Postgres control plane; optional Redis coordination and cache.
- A React Admin UI served at `/ui`.

One image runs the monolith or split components (`proxy`, `gateway`, `backend`,
`ui`, `migrations`, `metrics`, `collector`); the first word of the container
command selects the process (`litellm/deploy/docker/docker-entrypoint.sh:1-26`).

## 2. License map

| Path | License | Practical rule |
|---|---|---|
| `litellm/*` outside `litellm/enterprise/` | MIT | Use, modify, self-host, resell services |
| `litellm/enterprise/` | `LicenseRef-Proprietary` (`litellm/enterprise/pyproject.toml:7`) | Production use needs a paid subscription |
| Docker image | Both | Ships both; enterprise features gate at runtime |
| Docs and examples | Doc terms | Do not reuse enterprise code as MIT |

Root `LICENSE:3` places `litellm/enterprise/` under the license shipped in that
directory. `litellm/enterprise/LICENSE.md` permits copying and modifying for
development and testing without a subscription (`:19-21`), but production use
requires a valid BerriAI subscription (`:7-12`), and copying, distribution,
sublicensing or sale is otherwise forbidden (`:23-25`). The enterprise package is
pinned into the proxy extra as `litellm-enterprise==0.1.86` (`pyproject.toml:99`),
so `pip install "litellm[proxy]"` ships dormant enterprise code: present in the
image, inactive without a license — "the code is in the repo" is not a grant.

## 3. Community vs Enterprise

The official split is a single list (`https://docs.litellm.ai/docs/enterprise.md`):

| Area | Community (no license) | Enterprise-only |
|---|---|---|
| Providers | 100+ adapters, OpenAI-compatible I/O | — |
| Keys | Virtual keys, expiry, model allowlists, aliases, blocking | — |
| Money | Budgets, TPM/RPM limits, spend tracking and logs | Tag/provider budgets at scale, temporary budget raises, spend reports |
| Routing | Load balancing, retries, cooldowns, fallbacks, context-window fallbacks | — |
| UI / API | Admin UI and management API for models, keys, teams, usage, playground | Org/team admin roles, custom branding |
| Safety | Custom guardrails, Presidio PII masking | `llmguard_moderations`, `llamaguard_moderations`, `openai_moderations`, `google_text_moderation`, `lakera_prompt_injection`, `aporia_prompt_injection`, `hide_secrets` |
| Agents | MCP gateway, A2A agent gateway | — |
| Identity | SSO up to 5 users | SSO/SCIM beyond 5 users, JWT/IdP mappings |
| Governance | — | Audit logs, route allow/deny controls, IP allowlists, enforced params |
| Secrets | — | AWS KMS/Secrets Manager, Azure Key Vault, GCP KMS/Secret Manager, Vault, CyberArk |
| Observability | — | Per-team logging, log export to GCS/Azure Blob |
| Operations | — | Multi-region, global control plane, support SLAs |
| Clients | Any OpenAI/Anthropic SDK, Claude Code, Codex, Cursor, curl | — |

Community is enough for a real internal gateway: one key per app or team, spend
caps, several providers, failover, usage visibility. **SSO is free for up to 5
users only** (`https://docs.litellm.ai/docs/enterprise.md`, "Who is Enterprise
for?"); a 50-person team needs a license.

## 4. How the code gates features

`premium_user` is computed once from the license at startup
(`litellm/proxy/proxy_server.py:1258`) and checked at the feature boundary, not
in the UI:

- Enterprise callbacks/guardrails raise when `premium_user is not True`
  (`litellm/proxy/common_utils/callback_utils.py:225-300`).
- Request/response size limits are skipped without a license
  (`litellm/proxy/auth/auth_utils.py:1542-1612`).
- Admin-only and allowed-route checks delegate to `EnterpriseRouteChecks`
  (`litellm/proxy/auth/route_checks.py:129`) and enforce the gate at
  `:440-464`.
- Hosted admin MCP calls `require_enterprise_license`
  (`litellm/proxy/admin_mcp.py:186-217`).

An unlicensed deployment starts and serves OSS features; it never silently
enables paid ones.

## 5. What "free" costs

No license fee and no per-token markup, but you own the operation:

- Postgres and Redis (or single-worker limits — see `02`, `06`).
- Upgrades, migrations, backups, TLS, ingress, secrets, on-call.
- Provider credentials and their spend; LiteLLM only tracks what it sees.
- No vendor support, audit reports, SSO at scale or managed multi-region.

Minimum realistic production footprint: two proxy replicas, one backed-up
Postgres, one Redis, a TLS-terminating ingress, and a secret store for
`LITELLM_MASTER_KEY`, `LITELLM_SALT_KEY` and provider keys.

## 6. When the proxy is the right tool

| Situation | Use |
|---|---|
| One Python app, one provider | SDK directly; the proxy adds a hop |
| Several apps/teams share providers and need keys/budgets | Proxy |
| Non-Python clients need one OpenAI-compatible endpoint | Proxy |
| Failover between providers or deployments | Proxy router |
| Cost per key/team per request | Proxy with Postgres |
| SSO for 100 admins, audit logs, Vault | Enterprise license, or build around OSS |
| Managed service, no ops | Hosted LiteLLM or another gateway |

Start OSS (proxy + Postgres + Redis) and add Enterprise only for a named
requirement: SSO/SCIM beyond 5 users, immutable audit logs, central secret
manager with rotation, per-team log routing or multi-region, vendor SLA.
Everything else in this guide runs without `LITELLM_LICENSE`.

## Sources

- `LICENSE:1-4`, `litellm/enterprise/LICENSE.md:7-25`, `litellm/enterprise/pyproject.toml:7`
- `pyproject.toml:3,6-7,99`
- `litellm/proxy/proxy_server.py:1258,2222`
- `litellm/proxy/common_utils/callback_utils.py:225-300`
- `litellm/proxy/auth/auth_utils.py:1542-1612`
- `litellm/proxy/auth/route_checks.py:129,440-464`
- `litellm/proxy/admin_mcp.py:186-217`
- `litellm/deploy/docker/docker-entrypoint.sh:1-26`
- https://docs.litellm.ai/docs/enterprise.md
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md
