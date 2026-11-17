# 14 — Observability

Scope: three planes answering different questions — callbacks (where a payload goes), spend logs (what it cost, in Postgres), Prometheus (aggregate behaviour). Callbacks and Prometheus are `[OSS]`; per-team routing, audit logs, and log export are `[Enterprise]`.

## 1. The three planes

| Plane | Configured by | Stored in | Answers |
| --- | --- | --- | --- |
| Callbacks | `callbacks`, `success_callback`, `failure_callback` | Your observability backend | What was sent/received, traces |
| Spend logs | Database (`DATABASE_URL`) | `LiteLLM_SpendLogs` | Who spent what, per request |
| Prometheus | `callbacks: [prometheus]` | Scraped from `/metrics` | Rates, latencies, queue depth |

They are independent: with no callbacks a gateway still writes spend logs and serves `/metrics`; callbacks ship payloads spend logs never contain.

## 2. Callbacks

`litellm_settings.callbacks` registers the same object for success and failure; `success_callback`/`failure_callback` register one side only (`litellm/proxy/proxy_server.py:6145`, `:7280-7360`). `initialize_callbacks_on_proxy` resolves string names, custom logger paths, and enterprise-gated names (`litellm/proxy/common_utils/callback_utils.py:144-159`).

Shape: `callbacks: ["langfuse", "otel", "datadog", "s3_v2"]`. Accepted string names span ~28 providers — `langfuse`, `langfuse_otel`, `otel`, `datadog`, `langsmith`, `arize`, `braintrust`, `galileo`, `mlflow`, `gcs_bucket`, `azure_storage`, `s3_v2`, `aws_sqs`, `clickhouse`, `newrelic`, `signoz`, `prometheus`, `posthog`, `generic_api`, and more (`litellm/__init__.py:100-158`). The same list backs `_known_custom_logger_compatible_callbacks` (`:161`), so a typo fails at startup rather than silently dropping logs.

Callbacks get a standard payload (request, response, model, usage, cost, metadata); schema at `https://docs.litellm.ai/docs/proxy/logging_spec.md`. Custom code subclasses `CustomLogger` and is referenced by dotted path in the same list. Correlation uses the `x-litellm-call-id` response header — the id callbacks log (`https://docs.litellm.ai/docs/proxy/logging.md`).

## 3. Spend logs are not logging

Spend logs are Postgres rows from the proxy's DB logger, an async success callback at startup (`litellm/proxy/proxy_server.py:3453`). The table is `LiteLLM_SpendLogs` (`litellm/proxy/schema.prisma:816`), keyed by `request_id`, with `api_key` holding the hashed token, not the virtual key (`:819`), plus `spend`, token counts, `model`, `model_group`, `cache_hit`, `cache_key`, `team_id`, `organization_id`, `end_user`, `status`, `litellm_call_id` (`:816-850`).

Default privacy: `messages` and `response` are JSON columns that stay empty unless `general_settings.store_prompts_in_spend_logs` is on — with it off, prompt-carrying fields are redacted before the row is written (`litellm/proxy/proxy_server.py:8823`, `litellm/proxy/spend_tracking/spend_tracking_utils.py:1770`); `general_settings.disable_spend_logs: true` stops the writes entirely (`litellm/proxy/proxy_server.py:7744`), and `disable_error_logs` stops error rows (`litellm/proxy/hooks/proxy_track_cost_callback.py:1126`). Leave `store_prompts_in_spend_logs` unset unless compliance requires content in the database.

Read via `GET /spend/logs` (deprecated, unpaginated, capped at 10,000 rows) or `/spend/logs/v2` (paginated) (`litellm/proxy/spend_tracking/spend_management_endpoints.py:3479`, `:2570`). Cleanup is a scheduled job that coordinates through `LiteLLM_ScheduledJobRun` and runs once per schedule with or without Redis (`https://docs.litellm.ai/docs/proxy/spend_logs_deletion.md`).

## 4. Prometheus

Enable `litellm_settings.callbacks: ["prometheus"]`, then scrape `/metrics`.

- Authenticated by default: `require_auth_for_metrics_endpoint` defaults to `True` (`litellm/__init__.py:172`) and the middleware enforces it (`litellm/proxy/middleware/prometheus_auth_middleware.py:51`); the logger is `PrometheusLogger` (`litellm/integrations/prometheus.py:616`).
- Multi-worker aggregation needs `PROMETHEUS_MULTIPROC_DIR` pointing at a directory writable and shared by workers (`https://docs.litellm.ai/docs/proxy/prometheus.md`).
- Since v1.101.0 a dedicated process serves the registry on its own port (`--prometheus_metrics_port`, or `PROMETHEUS_METRICS_PORT`) so "a scrape never runs on an inference worker" (`litellm/proxy/prometheus_metrics_server.py:1-6`); it serves `METRICS_PATH = "/metrics"` (`:33`).
- That listener skips virtual-key auth (the flag covers only `/metrics` on the proxy port), so it must not sit behind a public ingress (`https://docs.litellm.ai/docs/proxy/prometheus.md`).

## 5. Application logs and redaction

`litellm_settings.json_logs: true` emits structured JSON lines; `LITELLM_LOG=INFO|DEBUG|ERROR` sets verbosity; `--detailed_debug` prints full request detail (`https://docs.litellm.ai/docs/proxy/debugging.md`). Keep debug off in production: it prints prompts.

| Setting | Effect | Default |
| --- | --- | --- |
| `turn_off_message_logging` | Callbacks get metadata and cost, not messages or response content | `false` |
| `redact_user_api_key_info` | Strips key/user detail from logged auth objects (`litellm/__init__.py:198`) | `false` |
| `redact_messages_in_exceptions` | Removes messages from alert payloads (`litellm/__init__.py:197`) | `false` |

With all three off, callbacks receive full prompts and responses (`https://docs.litellm.ai/docs/proxy/security_owasp_llm_top10.md`); enable `turn_off_message_logging` before pointing a third-party backend at production traffic.

## 6. What is enterprise

- **Per-team / per-key logging** `[Enterprise]`: route a team's logs to its own Langfuse project, or disable them for GDPR. Supported: `langfuse`, `gcs_bucket`, `langsmith`, `arize` (`https://docs.litellm.ai/docs/proxy/team_logging.md`). Routes exist on the OSS app — `POST/GET/DELETE /team/{team_id:path}/callback`, `POST /team/{team_id}/disable_logging` (`litellm/proxy/management_endpoints/team_callback_endpoints.py:275-276`, `:628`) — but the feature is licensed.
- **Audit logs** `[Enterprise]`: admin actions with retention policies, plus log export to GCS/Azure Blob (`https://docs.litellm.ai/docs/enterprise.md`).
- **Guardrails per key/team** `[Enterprise]` per the same feature table.

## Sources

- `litellm/__init__.py:100-161`, `:172`, `:197-198`
- `litellm/proxy/proxy_server.py:3453`, `:6145`, `:7280-7360`, `:7744`, `:8823`
- `litellm/proxy/common_utils/callback_utils.py:144-159`
- `litellm/proxy/schema.prisma:816-850`
- `litellm/proxy/spend_tracking/spend_tracking_utils.py:1770`, `spend_management_endpoints.py:2570`, `:3479`
- `litellm/proxy/hooks/proxy_track_cost_callback.py:1126`
- `litellm/proxy/middleware/prometheus_auth_middleware.py:51`; `litellm/proxy/prometheus_metrics_server.py:1-6`, `:33`
- `litellm/integrations/prometheus.py:616`
- `litellm/proxy/management_endpoints/team_callback_endpoints.py:275-276`
- https://docs.litellm.ai/docs/proxy/logging.md, `/logging_spec.md`, `/prometheus.md`, `/debugging.md`, `/spend_logs_deletion.md`, `/team_logging.md`, `/security_owasp_llm_top10.md`, https://docs.litellm.ai/docs/enterprise.md
