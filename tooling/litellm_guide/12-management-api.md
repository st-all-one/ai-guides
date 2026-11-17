# 12 — Management API

Scope: the HTTP surface that creates keys, teams, users, models, and settings on a running gateway. `[OSS]` except organization routes and SCIM, needing `LITELLM_LICENSE`. These are FastAPI routes on the same app as inference (`litellm/proxy/proxy_server.py:23211-23250`): one base URL, one auth header.

## 1. Shape and authentication

Management paths are unprefixed (`/key/generate`); inference keeps `/v1/...` on separate routers. Every management route declares `dependencies=[Depends(user_api_key_auth)]` (`litellm/proxy/management_endpoints/key_management_endpoints.py:2438-2441`); authorization is a role check inside the handler, not a scope system.

- **Master key** (`Authorization: Bearer sk-...`): the proxy admin credential (`https://docs.litellm.ai/docs/proxy/deploy.md`), resolving to an admin identity without a Virtual Key model allowlist (`https://docs.litellm.ai/docs/proxy/master_key_rotations.md`).
- **Virtual keys**: act only where their role and object permissions allow; `/key/generate` accepts non-admin callers only for their own `user_id` (`litellm/proxy/management_endpoints/key_management_endpoints.py:2462-2470`).
- **Admin-only handlers** answer `403 Admin-only endpoint. Not allowed to access this.` (`litellm/types/proxy/common_proxy_errors.py:11`); `/config/update` has its own string, `403 Only proxy admins can update config` (`litellm/proxy/proxy_server.py:21154-21175`).

Mutations are audited via the `litellm-changed-by` header (`:2448-2451`). No route takes an idempotency key, so a retried request mints a second key (`:2438-2453`).

## 2. Endpoint map

| Area | Routes | Notes |
| --- | --- | --- |
| Keys | `POST /key/generate`, `/key/update`, `/key/delete`, `/key/block`, `/key/unblock`, `/key/health`; `GET /key/info`, `/key/list` | `key_management_endpoints.py:2438`, `/key/list` `:7405` |
| Teams | `POST /team/new`, `/team/update`, `/team/delete`; `GET /team/info`, `/team/list` | `team_endpoints.py:1665`, `/team/list` `:6692` |
| Users | `POST /user/new`, `/user/update`, `/user/delete`; `GET /user/info`, `/user/list` | `internal_user_endpoints.py:527`, `/user/list` `:2424` |
| Models | `POST /model/new`, `/model/update`, `/model/delete`; `PATCH /model/{model_id}/update`; `GET /model/info`, `/v1/model/info` | `model_management_endpoints.py:3213`, `:3441`, `:1746`; info `litellm/proxy/proxy_server.py:19054` |
| Config | `POST /config/update`, `/config/field/update`; `GET /config/list` | hidden from OpenAPI; DB required; `litellm/proxy/proxy_server.py:21457`, `:21942` |
| Cache | `/cache/ping`, `/cache/delete`, `/cache/flushall`, `GET /cache/redis/info`, `/cache/settings` | prefix `litellm/proxy/caching_routes.py:20-23`; settings `management_endpoints/cache_settings_endpoints.py:453` |
| Budgets | `POST /budget/new`, `/budget/update`, `/budget/delete`; `GET /budget/info`, `/budget/list` | `budget_management_endpoints.py:282-437` |
| Spend | `GET /spend/logs`, `/spend/logs/v2`, `/global/spend/*` | legacy `/spend/logs` is unpaginated |

Short filenames resolve to `litellm/proxy/management_endpoints/`.

`[Enterprise]`: `/organization/*` sits on a router gated by `_enterprise_license_required` (`organization_endpoints.py:104-119`); SCIM at `/scim/v2` uses `premium_user_check` (`scim/scim_v2.py:293-297`); `/team/{team_id:path}/callback` and `/team/{team_id}/disable_logging` (`team_callback_endpoints.py:275-276`, `:628`) are licensed (`https://docs.litellm.ai/docs/proxy/team_logging.md`).

## 3. Recipes

Team, then a model-restricted key (`https://docs.litellm.ai/docs/proxy/configuration/api.md`):

```bash
TEAM=$(curl --fail-with-body -sS -X POST "$LITELLM_API_BASE/team/new" -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"team_alias": "client-applications", "models": ["client-chat"], "rpm_limit": 120}' | jq -er .team_id)

curl --fail-with-body -sS -X POST "$LITELLM_API_BASE/key/generate" -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"team_id\": \"$TEAM\", \"key_alias\": \"client-application\", \"key_type\": \"llm_api\",
       \"models\": [\"client-chat\"], \"duration\": \"30d\", \"rpm_limit\": 60}" | jq -er .key
```

`/key/generate` accepts `duration` (`30s/30m/30h/30d`), `key_alias`, `key`, `team_id`, `user_id`, `models`, `budget_id`, `max_budget`, `max_parallel_requests`, `metadata` (`key_management_endpoints.py:2459-2477`); the response carries `"key": "<sk-...>"` (`:4437`).

```bash
curl -s -X POST "$LITELLM_API_BASE/config/field/update" -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" -d '{"field_name": "max_parallel_requests", "field_value": 200}'
```

`/key/info?key=<sha256-of-key>` accepts the plaintext key or its hash and recommends the hash, because proxies log query strings (`key_management_endpoints.py:5177-5183`). `/key/list` defaults to `size=10`, caps at 100, and takes `status=active|expired|revoked|deleted`, `expand=user`, `sort_by`, `sort_order` (`:7414-7446`). `/config/field/update` is hidden from OpenAPI (`litellm/proxy/proxy_server.py:21457`), needs a database, and answers 400 when the key is YAML-owned (`https://docs.litellm.ai/docs/proxy/configs.md`).

## 4. Pagination and response shapes

| Route | Paging params | Default / cap |
| --- | --- | --- |
| `GET /key/list` | `page`, `size` | 10, max 100 (`key_management_endpoints.py:7414-7415`) |
| `GET /user/list` | `page`, `page_size` | 25, max 100 (`internal_user_endpoints.py:2439-2440`) |
| `GET /team/list` | none; filters only | all authorized teams (`team_endpoints.py:6692-6708`) |
| `GET /spend/logs` | none | 10,000 most recent rows (`spend_tracking/spend_management_endpoints.py:3515-3518`) |

`/key/list` returns `{"keys": [...], "total_count", "current_page", "total_pages"}`; `expand=user` forces full key objects even without `return_full_object` (`key_management_endpoints.py:7463-7469`). Errors are `{"detail": ...}`, usually nesting `{"error": "..."}` — the organization 403 (`organization_endpoints.py:110-116`) and the missing-database 400, text `DB not connected. This endpoint needs a database; set DATABASE_URL ...` (`litellm/types/proxy/common_proxy_errors.py:5-9`).

## Sources

- `litellm/proxy/proxy_server.py:23211-23250`, `:21154-21175`, `:21457`, `:21942`, `:19054`
- `litellm/proxy/management_endpoints/key_management_endpoints.py:2438-2477`, `:4437`, `:5177-5183`, `:7405-7469`
- `litellm/proxy/management_endpoints/team_endpoints.py:1665`, `:6692-6708`
- `litellm/proxy/management_endpoints/internal_user_endpoints.py:527`, `:2424-2440`
- `litellm/proxy/management_endpoints/model_management_endpoints.py:1746`, `:3213`, `:3441`
- `litellm/proxy/management_endpoints/organization_endpoints.py:104-119`, `scim/scim_v2.py:293-297`, `team_callback_endpoints.py:275-276`, `cache_settings_endpoints.py:453`, `litellm/proxy/caching_routes.py:20-23`
- `litellm/proxy/spend_tracking/spend_management_endpoints.py:2570`, `:3479`, `:3515-3518`
- `litellm/types/proxy/common_proxy_errors.py:5-11`
- https://docs.litellm.ai/docs/proxy/configuration/api.md, `/deploy.md`, `/master_key_rotations.md`, `/configs.md`, `/team_logging.md`
