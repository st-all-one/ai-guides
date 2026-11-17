# 08 — Providers and Routing

Routing, retries, cooldowns, fallbacks, and health checks are [OSS]; provider credentials are [OSS],
secret-manager credentials and multi-region routing [Enterprise].

## 1. Two names, two jobs

`model_name` is what clients send in `model`; `litellm_params.model` is the string passed to
`litellm.completion()` and carries the provider prefix
(`https://docs.litellm.ai/docs/proxy/configs.md`). Entries sharing a `model_name` form a model group that
the router load-balances; one entry is a deployment (`https://docs.litellm.ai/docs/routing.md`).

```yaml
model_list:
  - model_name: product-chat          # clients call this
    litellm_params:
      model: openai/gpt-6-luna        # provider/model sent upstream
      api_key: os.environ/OPENAI_API_KEY
  - model_name: product-chat          # same group, second deployment
    litellm_params:
      model: azure/gpt-6-luna-eu
      api_base: https://eu.openai.azure.com/
      api_key: os.environ/AZURE_API_KEY_EU
```

`get_llm_provider` parses `<provider>/<model>` and returns the provider plus the stripped model
(`litellm/litellm_core_utils/get_llm_provider_logic.py:211-220`). `openai/` is the escape hatch for any
OpenAI-compatible server: point `api_base` at vLLM or Ollama. 100+ provider prefixes exist
(`https://docs.litellm.ai/docs/providers`).

## 2. Aliases, priority, weight

`model_group_alias` routes a requested name to another group without touching `model_list`; aliases
appear in `/v1/models` unless marked `hidden: true`
(`https://docs.litellm.ai/docs/proxy/load_balancing.md`). `order` creates priority tiers: lower values
first, strategy picks within a tier, and the router advances only when every deployment there failed or
is cooling (`https://docs.litellm.ai/docs/routing.md`). `weight` biases `simple-shuffle`: weight 2 is
picked twice as often as weight 1 (same page).

## 3. Routing strategies

`router_settings.routing_strategy` defaults to `simple-shuffle` (`litellm/router.py:106`); accepted
literals are `simple-shuffle`, `least-busy`, `usage-based-routing`, `usage-based-routing-v2`,
`latency-based-routing`, `cost-based-routing`, and `lar1`
(`litellm/types/litellm_params.py:46-54`).

| Strategy | Picks | Notes |
|---|---|---|
| `simple-shuffle` | Randomly, weighted | Default; best throughput |
| `least-busy` | Fewest active requests | High concurrency |
| `usage-based-routing-v2` | Lowest RPM/TPM usage | Needs shared counters |
| `latency-based-routing` | Fastest recent responses | `routing_strategy_args` |
| `cost-based-routing` | Lowest cost | Cost-sensitive |

The older `usage-based-routing` is discouraged for performance, and per-strategy arguments go in
`routing_strategy_args` (`https://docs.litellm.ai/docs/proxy/load_balancing.md`;
`https://docs.litellm.ai/docs/proxy/config_settings.md`). Deployment `rpm`/`tpm` only inform routing;
add `optional_pre_call_checks: [enforce_model_rate_limits]` to make them hard `429` limits before the
provider call.

## 4. Retries

Docs default `num_retries` to 2; the constructor signature is `None` while its docstring says
"Defaults to 2" (`litellm/router.py:80,144`;
`https://docs.litellm.ai/docs/proxy/config_settings.md`). Precedence, highest first:
`x-litellm-num-retries` header, body `num_retries`, deployment `litellm_params`, `litellm_settings`
(`https://docs.litellm.ai/docs/routing.md`). `num_retries` is LiteLLM's own loop; provider SDK
`max_retries` is pinned to 0 through the router, so retries never double. `RateLimitError` backs off
exponentially, other errors retry immediately, `retry_after` sets a minimum wait (same page), and
`retry_policy` sets per-exception budgets (`litellm/types/router.py:179-189`).

## 5. Cooldowns

Cooldowns are per deployment, not per model group. `cooldown_time` defaults to 5 seconds
(`litellm/constants.py:164`; `litellm/router_utils/cooldown_handlers.py:794-797`).
`allowed_fails` is unset by default (`litellm/router.py:101`): docs describe a rate-based rule, and an
explicit value switches to counting failures within `cooldown_time`
(`https://docs.litellm.ai/docs/routing.md`). Per deployment, override with `model_info.allowed_fails`
and `model_info.cooldown_time`; `cooldown_time: 0` disables cooldown there, `disable_cooldowns: true`
disables all. When every deployment is cooling, callers get
`429 No deployments available for selected model, Try again in 60 seconds...`
(`https://docs.litellm.ai/docs/proxy/error_reference.md`).

## 6. Fallbacks

A fallback is cross-group failover after retries are exhausted
(`https://docs.litellm.ai/docs/proxy/reliability.md`). Four knobs: `fallbacks` for general errors such
as 429/500, `context_window_fallbacks` for `ContextWindowExceededError`,
`content_policy_fallbacks` for `ContentPolicyViolationError`, `default_fallbacks` for groups with no
entry. `max_fallbacks` defaults to 5 (`https://docs.litellm.ai/docs/proxy/config_settings.md`).

```yaml
litellm_settings:
  num_retries: 3
  fallbacks: [{zephyr-beta: [gpt-6-luna]}]
router_settings:
  allowed_fails: 3
  cooldown_time: 30
```

A matching `context_window_fallbacks` chain runs before later `order` tiers or generic `fallbacks`; once
exhausted the request errors instead of continuing through the group's order (reliability page).
Fallback targets still pass access, health, and budget checks via `fallback_access_check` and
`fallback_budget_check`, exposed as `general_settings.enforce_fallback_model_access` and
`enforce_fallback_budget` (config-settings page).

## 7. Health checks and Redis

Health checks are off by default; `health_check_interval` is 300 seconds and
`health_check_staleness_threshold` 600. `enable_health_check_routing` is `false`, so health state does
not remove deployments from rotation (`https://docs.litellm.ai/docs/proxy/health.md`). Liveness and
readiness (`/health/liveliness`, `/health/readiness`) make no LLM calls; readiness returns `503` when a
configured database is unreachable (health page).

Multi-worker router state must be shared. Without Redis: cooldowns are per worker (a deployment cooled
on one worker stays in rotation on others); `usage-based-routing-v2` and `latency-based-routing` see
only local traffic; key/team budgets and rate limits count per worker, multiplying limits by the worker
count; response caching and cache invalidation degrade
(`https://docs.litellm.ai/docs/proxy/redis_requirements.md`). Both blocks are required:
`router_settings.redis_*` for router state and `litellm_settings.cache_params` for proxy-wide
coordination; `REDIS_HOST`/`REDIS_PORT` alone is ignored until the config points at Redis (same page).

## Sources

- https://docs.litellm.ai/docs/routing.md
- https://docs.litellm.ai/docs/proxy/config_settings.md
- https://docs.litellm.ai/docs/proxy/load_balancing.md
- https://docs.litellm.ai/docs/proxy/reliability.md
- repo bcb1f486: `litellm/router.py`; `litellm/types/litellm_params.py`; `litellm/types/router.py`;
  `litellm/constants.py`; `litellm/router_utils/cooldown_handlers.py`;
  `litellm/litellm_core_utils/get_llm_provider_logic.py`.
