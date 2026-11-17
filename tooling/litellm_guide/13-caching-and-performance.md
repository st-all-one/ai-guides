# 13 — Caching and Performance

Scope: response cache, router shared state, multi-worker failure modes. All backends and Redis wiring are `[OSS]`.

## 1. Three stores, two config blocks

| Concern | Config | Holds |
| --- | --- | --- |
| Response cache | `litellm_settings.cache` + `cache_params` | Rendered responses, per request |
| Router state | `router_settings.redis_*` | Cooldowns, usage/latency counters, health |
| Proxy coordination | the cache block | rate limits, budgets, key/team invalidation, pod lock, spend buffer |

The cache block builds `litellm.cache = Cache(**cache_params)` (`litellm/proxy/proxy_server.py:6815`); `router_settings.redis_*` is read separately. `REDIS_HOST`/`REDIS_PORT` alone do nothing: the proxy reads them only when the config points at Redis (`https://docs.litellm.ai/docs/proxy/redis_requirements.md`); cache hits can be right while rate limits double-count.

```yaml
router_settings:
  redis_host: os.environ/REDIS_HOST
  redis_port: os.environ/REDIS_PORT
  redis_password: os.environ/REDIS_PASSWORD

litellm_settings:
  cache: True
  cache_params: {type: redis, host: os.environ/REDIS_HOST, port: os.environ/REDIS_PORT, password: os.environ/REDIS_PASSWORD}
```

## 2. Backends and defaults

Accepted types: `local`, `redis`, `redis-semantic`, `valkey-semantic`, `s3`, `qdrant-semantic`, `azure-blob`, `gcs` (`litellm/types/caching.py:10-18`). `Cache(...)` directly is `type=local` (`litellm/caching/caching.py:131`); the proxy turns `cache: True` with no `cache_params` into `redis` (`litellm/proxy/proxy_server.py:7175`) and fills host/port/password from `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (`:7183-7190`).

Docs still list `type: disk`/`disk_cache_dir`, but the backend was removed: `disk_cache_dir` only logs "Ignoring disk_cache_dir, the disk cache backend was removed" (`litellm/caching/caching.py:340-341`), and an unknown type raises `ValueError: Unsupported cache type` (`:338-341`).

TTL: `cache_params.ttl`, `default_in_memory_ttl`, `default_redis_ttl` (`litellm/proxy/proxy_server.py:6809-6813`). Plain `cache: True` caches `/chat/completions`, `/completions`, `/embeddings`, `/audio/transcriptions`, `/rerank`, `/v1/responses`, `/v1/messages`; covered calls follow `supported_call_types` (`litellm/caching/caching.py:142`, `https://docs.litellm.ai/docs/proxy/caching.md`).

## 3. Exact versus semantic

Exact-match caches (`redis`, `s3`, `gcs`, `local`) hash the call's model-API params (`litellm/caching/caching.py:410-461`); any conversation change misses — right for agentic traffic.

Semantic caches (`redis-semantic`, `valkey-semantic`, `qdrant-semantic`) embed the prompt and serve the closest stored response above `similarity_threshold`; hits carry `x-litellm-semantic-similarity`. Prompt content is excluded from the key (`:377-381`), so isolation rides on the tenant scope appended to it (`:396-408`, `:446-447`) — virtual key, team, organization; every end user behind one key shares a bucket unless `semantic_cache_scope: end_user` (`litellm/types/caching.py:21-23`). The docs target it at single-shot prompts: multi-turn or agentic traffic replays stale responses (`https://docs.litellm.ai/docs/proxy/caching_semantic.md`).

## 4. Multi-worker correctness

A per-process cache means four workers keep four caches and the hit rate "drops roughly by the worker count" (`https://docs.litellm.ai/docs/proxy/caching.md`); every enforced counter splits the same way (`https://docs.litellm.ai/docs/proxy/redis_requirements.md`):

| Without Redis | Effect |
| --- | --- |
| rpm/tpm/max parallel | Multiplied by worker count |
| Budgets | Per-worker reservation; hard budgets overshoot |
| Cooldowns, usage/latency routing | One worker's traffic only |
| Key/team revocation | Revoked key works until local expiry |
| Scheduled jobs | No pod lock; every worker runs it |

Redis is required once `--num_workers > 1` or replicas > 1.

One caveat survives Redis: the exact-match cache keys on the request alone, so two keys sending identical requests share a response unless you set `cache.namespace` or `metadata.redis_namespace`; only the semantic cache is tenant-scoped (`https://docs.litellm.ai/docs/proxy/security_owasp_llm_top10.md`).

## 5. Controls and invalidation

Per request, `cache` accepts `ttl`, `s-maxage` (only entries younger than N seconds), `no-cache`, `no-store`, `namespace` (`https://docs.litellm.ai/docs/proxy/caching_controls.md`).

```bash
curl -s "$PROXY/cache/ping" -H "Authorization: Bearer $LITELLM_MASTER_KEY"
curl -s -X POST "$PROXY/cache/delete" -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" -d '{"keys": ["<x-litellm-cache-key>"]}'
```

`/cache/ping` answers 503 when `litellm.cache is None` (`litellm/proxy/caching_routes.py:60-75`); `/cache/delete` takes the `x-litellm-cache-key` value from cached responses (`:132-139`); `/cache/flushall` clears what the backend supports (`:226-238`). Settings: `GET/POST /cache/settings` (`litellm/proxy/management_endpoints/cache_settings_endpoints.py:453`, `:582`).

## 6. Performance knobs

- **Pool.** `database_connection_pool_limit: 10` per worker is the production default; on Kubernetes run one Uvicorn worker per pod and scale by replicas (`https://docs.litellm.ai/docs/proxy/prod.md`). Direct connections are `limit × workers_per_instance × (max_instances + rollout_overlap)`, so Postgres fails with `FATAL: sorry, too many clients already` first (`https://docs.litellm.ai/docs/proxy/db_sizing.md`).
- **Timeouts.** `request_timeout` defaults to 6000 s; production guidance 600 (`https://docs.litellm.ai/docs/proxy/prod.md`).
- **Spend writes.** Batch (`proxy_batch_write_at: 60`); above ~1K RPS use the Redis transaction buffer (`https://docs.litellm.ai/docs/proxy/db_sizing.md`).
- **Admission control.** `general_settings.max_in_flight_requests_per_worker` turns overload into a fast 503 with `retry-after`; `max_queued_requests_per_worker` and `admission_queue_timeout_seconds` set the queue. Off until the cap is set; per worker process (4 × 64 admits 256). A stream holds its slot to the last chunk; health and `/metrics` bypass the gate (`https://docs.litellm.ai/docs/proxy/server_tuning.md`).
- **Sizing.** `db.m7g.xlarge` to 1K RPS, `2xlarge` to 5K, `4xlarge` to 10K, `8xlarge` to 20K (`https://docs.litellm.ai/docs/proxy/db_sizing.md`); Redis from `https://docs.litellm.ai/docs/proxy/redis_sizing.md`; published throughput is a starting point only (`https://docs.litellm.ai/docs/benchmarks.md`).

## Sources

- `litellm/proxy/proxy_server.py:6809-6815`, `:7175`, `:7183-7190`
- `litellm/caching/caching.py:131`, `:142`, `:338-341`, `:377-381`, `:396-408`, `:410-461`
- `litellm/types/caching.py:10-23`
- `litellm/proxy/caching_routes.py:60-75`, `:132-139`, `:226-238`; `litellm/proxy/management_endpoints/cache_settings_endpoints.py:453`, `:582`
- https://docs.litellm.ai/docs/proxy/caching.md, `/caching_semantic.md`, `/caching_controls.md`, `/redis_requirements.md`
- https://docs.litellm.ai/docs/proxy/security_owasp_llm_top10.md, `/server_tuning.md`, `/prod.md`, `/db_sizing.md`, `/redis_sizing.md`
- https://docs.litellm.ai/docs/benchmarks.md
