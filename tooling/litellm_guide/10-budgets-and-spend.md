# 10 — Budgets and Spend

Budgets are checked against spend in Postgres; the hot path uses a shared Redis counter reconciled in
the background. All scopes here are [OSS]. Without a database nothing is capped:
`litellm_settings.max_budget` fails **open** (global check skipped) and keys fail with
`No connected db.` (`https://docs.litellm.ai/docs/proxy/users.md`).

## 1. Budget scopes

| Scope | Set by | Behavior |
|---|---|---|
| Global | `litellm_settings.max_budget` | Whole proxy; fails open |
| Key | `max_budget`, `budget_duration` on `/key/generate` | Enforced on the key row |
| Team | `max_budget`, `budget_duration` on the team | All keys with that `team_id` |
| Team member | `budget_id` on the membership | Per-member cap in the team |
| Internal user | `max_budget` on `/user/new` | Personal, non-team keys |
| Org / project | `budget_id` | Shared across members |
| Reusable budget | `/budget/new`, then `budget_id` | Attach to keys/teams/orgs/projects |
| End user | `/customer/new`, `max_end_user_budget_id` | By customer id; shared across keys/teams |
| Tag | Tag object with a `budget_id` | Caps spend carrying that tag |
| Per model | `model_max_budget` | `{"gpt-4": {"budget_limit": 0.0005, "time_period": "30d"}}` |
| Per window | `budget_limits` | Concurrent windows, e.g. `7d` $50 plus `24h` $5 |

Columns: `litellm/proxy/schema.prisma:13-52` (budget), `:275-292` (team), `:393-415` (user),
`:597-640` (key), `:794-807` (tag), `:897-906` (membership); also
`https://docs.litellm.ai/docs/proxy/users.md`. A key in a team ignores its owner's personal budget —
only team and team-member budgets apply. Customer budgets are global per deployment: spend is keyed by
customer id, so one customer shares a budget across keys and teams.

## 2. Duration and reset semantics

`budget_duration` accepts `<number>s|m|h|d|w|mo` and returns seconds until reset
(`litellm/litellm_core_utils/duration_parser.py:51-82`). Resets are standardized, not "now + duration":
`30d`/`Nmo` land on the 1st of the month, `7d` on Monday, `1h` on the hour
(`litellm/litellm_core_utils/duration_parser.py:102-160`; `/key/info` reports the same boundary at
`litellm/proxy/management_endpoints/key_management_endpoints.py:5205-5210`). Timezone is
`litellm_settings.timezone`, default UTC; `budget_reset_time` shifts wall-clock time for day/week/month
windows only (`https://docs.litellm.ai/docs/proxy/budget_reset_and_tz.md`).

The reset job runs every 10 minutes; `proxy_budget_rescheduler_min_time`/`max_time` change that. A
reset advances `budget_reset_at` and zeroes current `spend` but keeps historical daily usage
(`litellm/proxy/common_utils/reset_budget_job.py:1104`;
`https://docs.litellm.ai/docs/proxy/users.md`). With `budget_duration` set, `/key/info` `spend` covers
only the current window (`litellm/proxy/management_endpoints/key_management_endpoints.py:5201-5205`);
without it the budget never resets. `soft_budget` only warns; `max_budget` blocks (same file, `:4193`).

## 3. Reservation and fail-closed enforcement

Reservation is on by default: LiteLLM estimates the request's maximum cost from body and pricing,
reserves it against every applicable budget, rejects before the provider call if it would exceed a cap,
then replaces the reservation with the actual cost (`https://docs.litellm.ai/docs/proxy/users.md`). The
estimate uses `max_tokens`/`max_completion_tokens` when present, else the model's configured limits;
routes without token pricing fall back to recorded spend
(`litellm/proxy/spend_tracking/budget_reservation.py:240-310`). Batch submissions release their
reservation and record final cost at completion (users page).

`disable_budget_reservation: true` is temporary mitigation only: concurrent requests are judged
against recorded spend and can exceed the cap. Because the counter lives in Redis with background
reconciliation, a Redis restart from an older snapshot can under-report spend until corrected.
`fail_closed_budget_enforcement: true` validates every budgeted request against the authoritative
database and returns `503` when spend can be verified against neither, logging
`Budget enforcement unavailable: the budget reservation could not be written...`
(`litellm/proxy/spend_tracking/budget_reservation.py:165-180`). `fail_closed_rate_limit_enforcement` is
the analogue for TPM/RPM/parallel counters, inert without Redis.

## 4. Rate limits are separate from budgets

`tpm_limit`, `rpm_limit`, `max_parallel_requests`, `tpd_limit`, and per-model `model_tpm_limit` /
`model_rpm_limit` cap throughput, not dollars, and return `429` before the call
(`litellm/proxy/schema.prisma:613-620`; `https://docs.litellm.ai/docs/proxy/users.md`). TPM counts total
tokens by default; `token_rate_limit_type: input|output|total` changes that. Without Redis each worker
counts separately, so the effective limit is the configured limit times the worker count
(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`). Budget excess and throttling both return
`429`, but only the budget error has `error.type: budget_exceeded`
(`https://docs.litellm.ai/docs/proxy/error_reference.md`).

## 5. Spend logs and cost calculation

Each request writes a `LiteLLM_SpendLogs` row keyed by `request_id`, with `api_key` holding the
**hashed** token (the key table's `token`), plus `spend`, token counts, `model`, `model_group`,
`custom_llm_provider`, `user`, `team_id`, `organization_id`, `end_user`, `request_tags`, `metadata`,
`status`, `litellm_call_id` (`litellm/proxy/schema.prisma:816-860`). `model_group` is the routed public
group, `model` the resolved deployment model. A fallback can change `model_group`, so use
`metadata.original_model_group` to attribute fallback traffic to the requested route
(`https://docs.litellm.ai/docs/proxy/cost_tracking.md`).

Prices come from `model_prices_and_context_window.json`: the proxy fetches the latest map from GitHub
at startup and falls back to the bundled copy; `LITELLM_LOCAL_MODEL_COST_MAP=True` pins the bundled copy
(`https://docs.litellm.ai/docs/proxy/model_cost_map.md`). `completion_cost()` raises when no candidate
model name resolves to pricing (`litellm/cost_calculator.py:1845-1855`); `get_model_info` returns zero
for missing input/output prices — not evidence the model is free. Two traps:

- Pricing looks up the model name in the **response**, not only the request; a dated response variant can
  miss custom pricing (`https://docs.litellm.ai/docs/proxy/custom_pricing.md`).
- Routing a third-party model through `custom_llm_provider: openai` prices it in OpenAI's namespace and
  can bill `$0`; use `model_info.pricing_provider` or custom pricing (same page).

## Sources

- https://docs.litellm.ai/docs/proxy/users.md
- https://docs.litellm.ai/docs/proxy/budget_reset_and_tz.md
- https://docs.litellm.ai/docs/proxy/cost_tracking.md
- https://docs.litellm.ai/docs/proxy/custom_pricing.md
- repo bcb1f486: `litellm/proxy/schema.prisma`; `litellm/proxy/spend_tracking/budget_reservation.py`;
  `litellm/litellm_core_utils/duration_parser.py`; `litellm/proxy/common_utils/reset_budget_job.py`;
  `litellm/proxy/management_endpoints/key_management_endpoints.py`; `litellm/cost_calculator.py`.
