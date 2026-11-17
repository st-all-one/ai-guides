# 15 — Guardrails and MCP

Scope: guardrail framework, license gates, MCP gateway, A2A. All but the named enterprise integrations are `[OSS]`.

## 1. Guardrail framework (`[OSS]`)

`guardrails:` entries carry a `guardrail_name` plus `litellm_params` (integration, `mode`, provider options).

| `mode` | When it runs | Blocks? |
|---|---|---|
| `pre_call` | Before the model call, input only | Yes — model never called |
| `post_call` | After the call; sees input and output | Yes |
| `during_call` | Parallel to the model call; response waits | Yes |
| `logging_only` | Background logging worker | No; client response untouched |

`stream_scope` limits which request shapes are scanned; `default_on: true` skips per-request opt-in. The legacy initializer builds `GuardrailItem` objects and activates default-on callbacks through the ordinary callback machinery (`litellm/proxy/guardrails/init_guardrails.py:103-145`). `/key/generate`, `/team/new`, and `/user/new` return 400 for a name that is neither in `config.yaml` nor an active DB guardrail (`https://docs.litellm.ai/docs/proxy/guardrails/quick_start.md`).

Built-ins: `guardrail: presidio` runs Microsoft Presidio with per-entity `MASK`/`BLOCK` actions and `presidio_score_thresholds`; legacy `callbacks: ["presidio"]` builds `OPTIONAL_PresidioPIIMasking`, whose `logging_only` mode masks what reaches callbacks while the provider sees the original text (`litellm/proxy/common_utils/callback_utils.py:204-221`); `guardrail: litellm_content_filter` covers banned keywords and patterns (`litellm/types/guardrails.py:131`; `https://docs.litellm.ai/docs/proxy/guardrails/pii_masking_v2.md`).

## 2. Custom guardrails (`[OSS]`)

A custom guardrail subclasses `CustomGuardrail` (a `CustomLogger`) and loads by dotted path — `guardrail: custom_guardrail.PIIFilterA`. Hook: `async_pre_call_hook(user_api_key_dict, cache, data, call_type)`; return `data` to continue, raise `ProxyException` to block. `__init__` adds `default_on`, `mask_request_content`, `mask_response_content`, `run_in_parallel` (`litellm/integrations/custom_guardrail.py:393`, `:417-433`), and `mcp_block_behavior` chooses a raised error vs a tool-result error on MCP (`:394`; `https://docs.litellm.ai/docs/proxy/guardrails/custom_guardrail.md`).

## 3. License-gated integrations (`[Enterprise]`)

Seven callbacks are license-gated per the docs — "the OSS guardrail framework includes custom guardrails and Presidio for PII masking" (`https://docs.litellm.ai/docs/enterprise.md`) — but the loader does not gate all seven identically (`litellm/proxy/common_utils/callback_utils.py`):

| Callback | Branch | `premium_user` check |
|---|---|---|
| `llamaguard_moderations` | `:223` | `:233` |
| `hide_secrets` | `:238` | `:248` |
| `openai_moderations` | `:253` | `:264` |
| `google_text_moderation` | `:288` | `:299` |
| `llmguard_moderations` | `:304` | `:312` |
| `lakera_prompt_injection` | `:269` | none here |
| `aporia_prompt_injection` | `:281` | none here |

The five checked branches raise `Exception(... + CommonProxyErrors.not_premium_user.value)` when `premium_user is not True`; Lakera and Aporia import OSS hook modules ungated. A missing check grants nothing — the documented license boundary still lists them. `hide_secrets` also needs `litellm_enterprise`: its initializer imports `_ENTERPRISE_SecretDetection` and raises `missing_enterprise_package` if absent (`litellm/proxy/guardrails/guardrail_initializers.py:201-216`).

## 4. Blocking semantics

A `pre_call` rejection raises HTTP 400 with `{"error": message}` (`litellm/proxy/guardrails/exception_utils.py:36-46`); `post_call` evaluates after the call; `logging_only` never blocks. On `/mcp` a blocked tool returns an MCP tool error (`result.isError: true`), possibly with HTTP 200; `/v1/responses` auto-execution hands the model a tool error and still returns 200, unless the guardrail sets `mcp_block_behavior: raise`, which fails the request with the guardrail's error (HTTP 400) (`https://docs.litellm.ai/docs/mcp_guardrail.md`).

## 5. MCP gateway (`[OSS]`)

One URL fronts many MCP servers: a streamable-HTTP handler at `/mcp` (`litellm/proxy/mcp_server/server.py:3110`) plus REST `/mcp-rest/tools/list` and `/mcp-rest/tools/call` (`litellm/proxy/mcp_server/rest_endpoints.py:108`). Transports are Streamable HTTP, SSE, and stdio; tools are namespaced `<server>_<tool>`. `auth_type` selects the upstream header; YAML defaults to `http` transport, management-API request models to `sse`. DB storage needs `store_model_in_db: true`, and `general_settings.supported_db_objects: ["mcp"]` limits storage to MCP servers alone; management routes sit under `/mcp/server` (`litellm/proxy/management_endpoints/mcp_management_endpoints.py:1388`; `https://docs.litellm.ai/docs/mcp.md`).

Access control — defaults are the risk (`https://docs.litellm.ai/docs/mcp_control.md`):

| Behavior | Default / control |
|---|---|
| stdio | Off; needs `LITELLM_ENABLE_MCP_STDIO=true`, else creation fails and direct calls 403. Runs arbitrary container commands |
| Visibility | Open: no list at any level means every server is reachable |
| Inheritance | An empty key list inherits the team's, so new keys silently gain servers the team later gains; `general_settings.require_key_mcp_access_defined: true` makes the team a ceiling (recommended) |
| `allow_all_keys: true` | Bypasses key and team lists unless `general_settings.mcp_allow_all_keys_respects_mcp_scope: true` (`https://docs.litellm.ai/docs/proxy/access_management/inheritance.md`) |
| `no-mcp-servers` | Denies every server, overriding inheritance and access groups; key create/update 403 on a server the team disallows |
| Bridge token flow | JWT identity mapping; needs `enable_jwt_auth`, a database, `premium_user` (`litellm/proxy/mcp_server/bridge_token_flow.py:516`) — `[Enterprise]` |

## 6. A2A (`[OSS]`)

Agents register through `POST /v1/agents`; `POST /v1/a2a/discover` fetches an upstream agent card for the UI (`litellm/proxy/a2a/endpoints.py:1-8`). Access mirrors MCP: team and key lists intersect, an empty key list inherits the team, and `general_settings.agent_access_default_deny: true` closes inheritance for non-admin keys (`https://docs.litellm.ai/docs/proxy/access_management/agents.md`).

## Sources

- `litellm/proxy/guardrails/init_guardrails.py:103-145`; `litellm/proxy/common_utils/callback_utils.py:204-221`, `:223-312`
- `litellm/proxy/guardrails/guardrail_initializers.py:201-216`; `litellm/proxy/guardrails/exception_utils.py:36-46`
- `litellm/integrations/custom_guardrail.py:393-433`; `litellm/types/guardrails.py:131`
- `litellm/proxy/mcp_server/server.py:3110`, `rest_endpoints.py:108`, `bridge_token_flow.py:516`; `litellm/proxy/a2a/endpoints.py:1-8`
- https://docs.litellm.ai/docs/proxy/guardrails/quick_start.md, `custom_guardrail.md`, `pii_masking_v2.md`
- https://docs.litellm.ai/docs/mcp.md, `mcp_guardrail.md`, `mcp_control.md`
- https://docs.litellm.ai/docs/proxy/access_management/inheritance.md, `agents.md`
- https://docs.litellm.ai/docs/enterprise.md
