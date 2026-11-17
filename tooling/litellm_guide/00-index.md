# 00 — Orientation and map

Scope: the **free/open-source LiteLLM AI Gateway** — the self-hosted proxy that
puts one OpenAI-compatible API in front of 100+ providers, with virtual keys,
budgets, routing, fallbacks, logging, guardrails and an Admin UI. It is written
for the operator who must install, configure, secure, integrate and debug that
gateway without buying an Enterprise license: choosing quickstart vs Compose vs
Helm, writing `config.yaml`, issuing keys, adding Redis/Postgres, debugging
401/429/5xx, or deciding whether an Enterprise feature is required.

**Baseline:** `BerriAI/litellm` @ `bcb1f48` (2026-11-17), `version = "1.111.0"`
(`pyproject.toml:3`). Docs were read 2026-11-16/17; every docs page also exists as
`<url>.md`. The source tree is authoritative when docs and code disagree.

## 1. What is inside the box

| Layer | What it is | License |
|---|---|---|
| Python SDK | `litellm.completion()` / `acompletion()` over provider adapters | MIT |
| AI Gateway | FastAPI proxy on port 4000, OpenAI + Anthropic compatible | MIT |
| Admin UI | React dashboard served at `/ui` | MIT |
| Enterprise package | SSO/SCIM, audit logs, org/team admins, secret managers, multi-region | Proprietary |

One Python process holds the router, the auth layer, the spend/budget layer and
the management API. Postgres stores keys, teams, users, models, spend logs and
config overrides; Redis is optional for one worker and required for correct
multi-worker behavior. The same image can also run split components — `gateway`
(inference), `backend` (management), `ui`, `migrations`, `metrics`, `collector`
(`litellm/deploy/docker/docker-entrypoint.sh:1-26`).

## 2. Measured surface

| Surface | Value | How measured |
|---|---:|---|
| Python files under `litellm/` | 3,580 | `find litellm -name '*.py' \| wc -l` |
| Python LOC under `litellm/` | 1,158,033 | same, `cat \| wc -l` |
| Proxy LOC | 460,585 | `litellm/proxy` |
| Provider adapter directories | 159 | `litellm/llms/*` |
| Prisma schema | 2,383 lines | `litellm/proxy/schema.prisma` |
| Files under `tests/` | 6,237 (5,921 `.py`) | `find tests -type f` |
| Docs dump | 10,068,412 bytes | `https://docs.litellm.ai/llms-full.txt` |

The repository is large because it vendors every provider adapter and a full
management plane. `02`-`03` isolate the files that answer operational questions.

## 3. Community boundary in one table

| Capability | Community (MIT) | Enterprise license |
|---|---|---|
| OpenAI-compatible proxy, 100+ providers | yes | same |
| Virtual keys, model access, expiry | yes | same |
| Budgets, TPM/RPM limits, spend logs | yes | same |
| Load balancing, retries, cooldowns, fallbacks | yes | same |
| Admin UI, management API, `/ui` playground | yes | same |
| Custom guardrails, Presidio PII | yes | same |
| MCP gateway / A2A agent gateway | yes | same |
| SSO for Admin UI | up to 5 users | unlimited / SCIM |
| Audit logs, org/team admin roles | no | yes |
| Secret managers (Vault/KMS), IP allowlists | no | yes |
| Per-team logging, multi-region, spend reports | no | yes |
| Built-in LlamaGuard/LLMGuard/OpenAI moderation hooks | no | yes |

`litellm/enterprise/` is proprietary (`litellm/enterprise/pyproject.toml:7`) but
ships inside the proxy extra and stays gated at runtime; see `01` for the full
matrix, `LITELLM_LICENSE` handling and per-feature evidence
(`LICENSE:1-4`, `https://docs.litellm.ai/docs/enterprise.md`).

## 4. The four layers to keep separate

```text
client (OpenAI/Anthropic SDK, Claude Code, Codex, curl)
  -> proxy HTTP layer (FastAPI, auth, spend, guardrails)
    -> router (model group -> deployment, retries, fallbacks, cooldowns)
      -> provider adapter (OpenAI, Anthropic, Bedrock, Azure, Gemini, vLLM, ...)
```

Control plane beside the data plane: Postgres holds keys, users, teams, models,
spend logs and config overrides; Redis holds rate limits, budgets, cooldowns,
response cache and config invalidation; the Admin UI and `/key/*`, `/team/*`,
`/user/*`, `/model/*`, `/config/*` do CRUD on the same Postgres rows.

A request can fail at any layer. Diagnose in that order — client auth, proxy
auth, router selection, provider call, spend write; `18` maps each failure to
its layer.

## 5. Key terms

| Term | Meaning |
|---|---|
| `model_name` | Public alias the client sends, e.g. `gpt-4-team1` |
| `litellm_params.model` | Real provider/model string, e.g. `azure/gpt-4` |
| deployment | One `model_list` entry; several can share a `model_name` |
| model group | All deployments sharing one `model_name`; the router balances them |
| master key | Admin credential, `sk-` prefixed; not a virtual key |
| salt key | Encrypts provider credentials in the DB; never rotate casually |
| virtual key | Per-app/user key with optional budget, limits, model allowlist |
| fallback | A different model group tried after a retryable failure |
| spend log | Per-request row used for cost reporting and budgets |

## 6. How to read this guide

| Chapters | Purpose |
|---|---|
| `01` | License, product boundary, what "free" costs |
| `02`-`03` | Runtime process model, source tree, build |
| `04`-`06` | Install, `config.yaml`, Postgres/Redis |
| `07`-`10` | Keys/security, routing, API usage, budgets and spend |
| `11`-`15` | Admin UI, management API, caching, observability, guardrails |
| `16`-`17` | Client integration, production deployment |
| `18`-`21` | Incidents, upgrades, decisions, lookup tables |
| `22`-`23` | Recommended community stack, coverage limits |

## 7. What this guide is not

- Not a Python SDK tutorial; the SDK appears only where the proxy exposes it.
- Not an Enterprise deployment manual; Enterprise features are described only
  far enough to decide whether a license is needed.
- Not a provider-by-provider credential catalog; each console is out of scope.
- No live runtime was executed. Runtime claims come from code and docs, not a
  load test or a provider call (see `23`).

## Sources

- `LICENSE:1-4`
- `pyproject.toml:3,6-7`
- `litellm/enterprise/pyproject.toml:7`
- `litellm/deploy/docker/docker-entrypoint.sh:1-26`
- `litellm/proxy/schema.prisma`
- https://docs.litellm.ai/docs/enterprise.md
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md
- https://docs.litellm.ai/llms-full.txt
