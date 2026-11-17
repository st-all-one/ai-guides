# 09 — API Usage

OpenAI-compatible, plus the Anthropic Messages format; every route below is [OSS]. Point an SDK at the
proxy root (`http://host:4000`) and authenticate with a virtual or master key. `model` must be a
`model_name` from `config.yaml`, not a provider string (see 08). The `/v1` prefix is accepted on every
OpenAI route; unprefixed aliases serve clients that append paths to a base URL.

## 1. Routes

| Method and path | Format |
|---|---|
| `POST /v1/chat/completions`, `/chat/completions` | OpenAI Chat Completions |
| `POST /openai/deployments/{model}/chat/completions` | Azure-style alias |
| `POST /v1/completions`, `/completions` | OpenAI legacy text completions |
| `POST /v1/responses`, `/responses`, `/openai/v1/responses` | OpenAI Responses |
| `POST /v1/embeddings`, `/embeddings` | OpenAI Embeddings |
| `GET /v1/models`, `/models` | Models visible to the calling key |
| `GET /v1/models/{model_id}` | One model, `404` if unavailable |
| `POST /v1/messages` | Anthropic Messages |

Route definitions: `litellm/proxy/proxy_server.py:13561-13585` (chat and `/engines` aliases),
`:13702-13704` (completions), `:13854-13872` (embeddings), `:13093-13110` (models),
`:13347-13360` (one model), `litellm/proxy/response_api_endpoints/endpoints.py:317-333` (responses),
`litellm/proxy/anthropic_endpoints/endpoints.py:158-162` (messages). `/engines/...` and
`/openai/deployments/...` are Azure-compatible aliases. Management routes (`/key/*`, `/team/*`,
`/model/*`) are in 12.

## 2. Chat Completions

```bash
curl http://localhost:4000/v1/chat/completions \
  -H 'Authorization: Bearer sk-<your-virtual-key>' \
  -H 'Content-Type: application/json' \
  -d '{"model": "gpt-6.1-sol", "messages": [{"role": "user", "content": "Hello"}]}'
```

The response is the OpenAI shape: `id`, `model`, `choices[].message`, `finish_reason`, `usage`
(`https://docs.litellm.ai/docs/proxy/quick_start.md`). SDKs use that root as `base_url`/`baseURL` and a
LiteLLM key as `api_key`/`apiKey`. Provider parameters OpenAI does not define go through `extra_body`
and reach the deployment.

## 3. Responses and Anthropic Messages

`/v1/responses` takes `input` (string or item list), not `messages`, and accepts `tools`, `tool_choice`,
and other Responses fields; LiteLLM translates them for providers without a native Responses API
(`https://docs.litellm.ai/docs/response_api.md`).

`POST /v1/messages` speaks the Anthropic format and accepts any chat model in the config, not only
Anthropic models (`https://docs.litellm.ai/docs/anthropic_unified/index.md`); `max_tokens` is required
by that schema. The Anthropic SDK works by setting `ANTHROPIC_BASE_URL` to the proxy root and its auth
token to a LiteLLM key. Do not send a provider `x-api-key` unless you intend BYOK forwarding:
`x-api-key` is also an accepted LiteLLM credential header, and with both `Authorization` and `x-api-key`
present the latter can be forwarded upstream (same page).

## 4. Embeddings

`POST /v1/embeddings` takes `input` (string or list) and a `model_name`; the response follows OpenAI:
`data[].embedding` plus `usage`
(`https://docs.litellm.ai/docs/proxy/model_discovery.md`). Embedding deployments answer here even when
hidden from `/v1/models`; model access checks still apply at request time.

## 5. Listing models

`GET /v1/models` returns only what the calling key may see: an admin sees every deployment unless its
own `models` list restricts it; a normal key sees its allowed `model_name` values
(`https://docs.litellm.ai/docs/proxy/model_discovery.md`). `GET /v1/models/{model_id}` returns `404`
when the model does not exist or is not accessible (`litellm/proxy/proxy_server.py:13356-13360`).
Optional parameters: `include_metadata`, `fallback_type=general|context_window|content_policy`,
`healthy_only`, and `scope` (`litellm/proxy/proxy_server.py:13096-13110`).

## 6. Streaming

Set `"stream": true`; the proxy answers `text/event-stream` and forwards provider chunks as SSE `data:`
lines (`litellm/proxy/proxy_server.py:13527-13535`), and the OpenAI SDK exposes it as an iterator. Set
a per-request timeout with `x-litellm-timeout` instead of relying on the client default
(`litellm/proxy/litellm_pre_call_utils.py:1850`).

## 7. Request and response headers

A client may send `x-litellm-call-id` to choose the request id; the proxy echoes it and uses it in logs
(`litellm/proxy/proxy_server.py:14005`). `x-litellm-tags` adds request tags and
`x-litellm-spend-logs-metadata` adds metadata to the spend log row
(`litellm/proxy/litellm_pre_call_utils.py:1895,2314`). Responses carry:

| Header | Meaning |
|---|---|
| `x-litellm-call-id` | Request id for log correlation |
| `x-litellm-model-id` | Deployment id that served the request |
| `x-litellm-model-api-base` | Upstream base URL used |
| `x-litellm-response-cost` | Calculated USD cost |
| `x-litellm-key-spend` | Key's total spend after the request |
| `x-litellm-key-max-budget`, `x-litellm-key-tpm-limit` | Key limits, `None` when unset |
| `x-litellm-attempted-retries`, `x-litellm-attempted-fallbacks` | Routing attempts |

Sources: `litellm/proxy/common_request_processing.py:2294-2304,2903-2917` and
`https://docs.litellm.ai/docs/proxy/response_headers.md`. Cost component headers (`-input`, `-output`,
`-cache-read`, `-cache-creation`, `-reasoning`, `-tool-usage`) appear only when nonzero and only on
non-streaming responses.

## 8. Errors

Errors use the OpenAI envelope with `error.message`, `error.type`, `error.param`, `error.code`; LiteLLM
adds routing and budget detail in the message
(`https://docs.litellm.ai/docs/proxy/error_reference.md`).

| Status | `error.type` | Cause |
|---|---|---|
| 401 | `auth_error` | Missing, malformed, unknown, or expired key |
| 403 | `key_model_access_denied` | Key's `models` list excludes the model |
| 404 | `not_found_error` | Unknown object or model id |
| 429 | `budget_exceeded` | Key/team/user spend cap reached |
| 429 | `throttling_error` | RPM/TPM/parallel limit, or provider 429 |
| 503 | `no_db_connection` | Route needs the database and cannot reach it |
| 500 | `internal_server_error` | Unhandled gateway exception |

A gateway rate limit carries `retry-after`, `rate_limit_type`, `rate_limited_by`, and `reset_at`; a
budget cap reports spend against the cap; a routing cooldown starts with
`No deployments available for selected model` (error reference). A model that exists but is not allowed
is a `403`, not a `404` — keep that distinction in client fallbacks. Error responses carry
`x-litellm-call-id`; log it before parsing text.

## Sources

- https://docs.litellm.ai/docs/proxy/quick_start.md
- https://docs.litellm.ai/docs/proxy/model_discovery.md
- https://docs.litellm.ai/docs/proxy/response_headers.md
- https://docs.litellm.ai/docs/proxy/error_reference.md
- https://docs.litellm.ai/docs/response_api.md
- https://docs.litellm.ai/docs/anthropic_unified/index.md
- repo bcb1f486: `litellm/proxy/proxy_server.py:13093-14005`;
  `litellm/proxy/response_api_endpoints/endpoints.py:317-333`;
  `litellm/proxy/anthropic_endpoints/endpoints.py:158-162`.
