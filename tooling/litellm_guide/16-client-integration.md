# 16 — Client Integration

Clients need three values: base URL, virtual key, and a `model_name` from `model_list`. Routing is `[OSS]`; IdP SSO is free up to five users, JWT auth is `[Enterprise]` at any size. Each request authenticates twice — client to LiteLLM, LiteLLM to the provider with its own config — so developers never hold provider keys (`https://docs.litellm.ai/docs/proxy/client_setup/overview.md`).

## 1. The shared contract

| Value | Source | Example |
|---|---|---|
| Base URL | Listen address | `http://localhost:4000` |
| Virtual key | `POST /key/generate` or Admin UI | `sk-...` |
| Model | A `model_name` under `model_list` | `claude-sonnet-5` |

Keys are accepted as `Authorization: Bearer <key>` on inference routes; MCP routes also accept `x-litellm-api-key: Bearer <key>`. `GET /v1/models` lists what the calling key may use (`litellm/proxy/proxy_server.py:13093`; `https://docs.litellm.ai/docs/proxy/client_setup/overview.md`).

Base URL differs by wire format: proxy root for OpenAI chat and Anthropic Messages, `/v1` for Codex and OpenCode, `/cursor` for Cursor.

## 2. OpenAI Python and JS SDKs

The SDK appends `/chat/completions`; LiteLLM serves both `/v1/chat/completions` and `/chat/completions` (`litellm/proxy/proxy_server.py:13562`, `:13567`). The quickstart uses the root URL.

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:4000", api_key="sk-<your-virtual-key>")
response = client.chat.completions.create(model="gpt-6.1-sol",
    messages=[{"role": "user", "content": "Say hello in five words."}])
print(response.choices[0].message.content)
```

The JS SDK mirrors it with `new OpenAI({ baseURL: "http://localhost:4000", apiKey: "sk-<your-virtual-key>" })`. Both verbatim from `https://docs.litellm.ai/docs/proxy/docker_quick_start.md`.

## 3. curl and streaming

```bash
curl http://localhost:4000/v1/chat/completions -H 'Authorization: Bearer sk-<key>' \
  -H 'Content-Type: application/json' \
  -d '{"model": "gpt-6.1-sol", "messages": [{"role": "user", "content": "Hi"}]}'
```

Add `"stream": true` for server-sent events; the chat route returns `text/event-stream` (`litellm/proxy/proxy_server.py:13556`). Budgets, rate limits, and model access are enforced before the provider call, so a stream can fail 401/403/429 before the first chunk.

## 4. Anthropic SDK and Claude Code

The Anthropic SDK points `base_url` at the proxy and sends the virtual key as `api_key`; `client.messages.create(model="claude-sonnet-5", ...)` works as upstream (`https://docs.litellm.ai/docs/simple_proxy.md`). Claude Code uses environment variables and `/v1/messages` (`litellm/proxy/anthropic_endpoints/endpoints.py:159`):

```bash
export LITELLM_API_KEY="sk-<your-virtual-key>" ANTHROPIC_BASE_URL="http://localhost:4000" \
       ANTHROPIC_AUTH_TOKEN="$LITELLM_API_KEY" ANTHROPIC_MODEL="claude-sonnet-5"
claude
```

Unset `ANTHROPIC_API_KEY`, or Claude Code sends it instead of the virtual key. The `/model` picker lists Anthropic's ids and fails with `Invalid model name passed in` unless that exact `model_name` exists (`https://docs.litellm.ai/docs/proxy/client_setup/claude_code.md`).

## 5. Codex CLI

Codex reads `~/.codex/config.toml` and speaks the Responses API; `env_key` names the variable holding the key, so the file holds no secret:

```toml
model = "claude-sonnet-5"
model_provider = "litellm"

[model_providers.litellm]
name = "LiteLLM"
base_url = "http://localhost:4000/v1"
env_key = "LITELLM_API_KEY"
wire_api = "responses"
```

Long agent turns idle for minutes; raise `stream_idle_timeout_ms`, `stream_max_retries`, and `request_max_retries` in the same block. Until `model_catalog_url = "http://localhost:4000/v1/models"` and `api_key_model_discovery = true` are set under `[features]`, Codex prints `Model metadata for ... not found. Defaulting to fallback metadata` and its `/model` picker shows only built-in OpenAI models (`https://docs.litellm.ai/docs/proxy/client_setup/codex_cli.md`).

## 6. Cursor

"Override OpenAI Base URL" takes the proxy URL plus `/cursor`; paste the virtual key into the OpenAI API Key field and add the LiteLLM `model_name` as a custom model. Cursor verifies with `GET /cursor/models` (`litellm/proxy/response_api_endpoints/endpoints.py:582`) and sends chat to `/cursor/chat/completions` (`:620`). A custom name colliding with a built-in fails with `The model "X" is already available as "Y"`; use a distinct alias. Cursor's servers, not your machine, must reach the proxy — a private address returns `Provider returned error: Access to private networks is forbidden` (`https://docs.litellm.ai/docs/tutorials/cursor_integration.md`).

## 7. OpenCode

OpenCode takes an OpenAI-compatible provider block; keys under `models` must equal LiteLLM `model_name` values:

```json
{"provider": {"litellm": {"npm": "@ai-sdk/openai-compatible", "name": "LiteLLM",
  "options": {"baseURL": "http://localhost:4000/v1"},
  "models": {"gpt-6.1-sol": {"name": "GPT-5.6 Terra"}, "claude-sonnet-5": {"name": "Claude Sonnet 5"}}}}}
```

Run `/connect`, enter provider name `LiteLLM` exactly as in `name`, then the virtual key (`https://docs.litellm.ai/docs/tutorials/opencode_integration.md`).

## 8. Model naming rules that break integrations

- A request may name only a `model_name`; provider ids such as `openai/gpt-6.1-sol` are `litellm_params.model`, not the public name (`https://docs.litellm.ai/docs/proxy/configs.md`).
- `openai/*` wildcards grant no wildcard `/v1/models` or health-check access; a wildcard-only key list returns empty (`https://docs.litellm.ai/docs/proxy/health.md`).
- Codex caches the catalog for five minutes, so a new alias needs a restart or cache expiry to appear (`https://docs.litellm.ai/docs/proxy/client_setup/codex_cli.md`).

## 9. Common integration failures

| Symptom | Cause | Fix |
|---|---|---|
| `Invalid API key` / `Unauthorized User API key` (Cursor) | Proxy answered 401; field holds a non-LiteLLM value | Use the virtual key (`sk-...`) |
| `User API Key Rate limit exceeded` (Cursor) | 429/5xx, or no answer from a blocked network | Test `/cursor/models` from outside; read gateway logs |
| `Invalid model name passed in` (Claude Code) | Picker sent an Anthropic id absent from `model_list` | Pin `ANTHROPIC_MODEL` to an allowed alias |
| 401 `Authentication Error, Invalid proxy server token passed` | Key not in the database | Create one with `/key/generate` (`litellm/proxy/auth/auth_exception_handler.py:163`) |
| `No connected db.` | Virtual key sent to a proxy without `DATABASE_URL` | Run with Postgres; the master key is the DB-less credential |

## Sources

- https://docs.litellm.ai/docs/proxy/client_setup/overview.md
- https://docs.litellm.ai/docs/proxy/client_setup/claude_code.md, `client_setup/codex_cli.md`
- https://docs.litellm.ai/docs/tutorials/cursor_integration.md, `tutorials/opencode_integration.md`
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md, `simple_proxy.md`, `configs.md`, `health.md`
- `litellm/proxy/proxy_server.py:13093`, `:13556`, `:13562`, `:13567`; `anthropic_endpoints/endpoints.py:159`
- `litellm/proxy/response_api_endpoints/endpoints.py:582`, `:620`; `auth/auth_exception_handler.py:163`
