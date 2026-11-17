# 07 — Security and Keys

Master key, salt key, and virtual keys are [OSS]; OIDC/SAML SSO (free up to five users), JWT, SCIM,
audit logs, and `tags`/`enforced_params` are [Enterprise]. All of it assumes `DATABASE_URL`.

## 1. Master key and boot refusal

Set `general_settings.master_key` (prefer `os.environ/LITELLM_MASTER_KEY`) or env `LITELLM_MASTER_KEY`;
the config setting wins. It must start with `sk-`
(`https://docs.litellm.ai/docs/proxy/master_key_rotations.md`;
`https://docs.litellm.ai/docs/proxy/virtual_keys.md`). It resolves to a proxy admin identity with no
key-level model allowlist, but end-user restrictions and budgets still run
(`https://docs.litellm.ai/docs/proxy/key_auth_arch.md`).

Unsafe values are `NOT_SET`, `EMPTY`, and `PUBLICLY_KNOWN` — the last a SHA-256 match against a
hard-coded digest set (`litellm/proxy/auth/master_key_boot_check.py:20-22,30-33,203-211`). The proxy
exits non-zero and prints the fix on stderr, bypassing the logger that would redact the key-shaped
command (`:120-134,139-140`). With a database but no salt key it counts values encrypted under the
unsafe key and names `LITELLM_MIGRATE_FROM_MASTER_KEY` (`:113-117,145-190`); startup passes salt-key
and database state into the verdict (`litellm/proxy/proxy_server.py:1784`). The override only warns
(`:92-93,125-131`). Dev only:

```yaml
general_settings:
  dangerously_permit_weak_or_unset_master_key: true
```

## 2. Salt key: encryption, not authentication

`LITELLM_SALT_KEY` encrypts stored credentials: database `litellm_params`, provider and MCP
credentials, and database-stored environment variables; without it the master key doubles as the
encryption key (`https://docs.litellm.ai/docs/proxy/prod.md`). Do not change it after adding models —
there is no in-place migration. Rotate the master key by replacing the value and restarting; do **not**
call `POST /key/regenerate` with `new_master_key`, which re-encrypts under a key the proxy never
decrypts with. Virtual keys are hashed and survive either rotation.

## 3. Virtual key storage and lifecycle

A virtual key is a `LiteLLM_VerificationToken` row keyed by hashed token, carrying spend, expiry,
models, budgets, rate limits, and relations to team, user, organization, project, and budget
(`litellm/proxy/schema.prisma:597-661`). Routes: `/key/generate`, `/key/update`, `/key/info`,
`/key/list`, `/key/delete`, `/key/block`, `/key/unblock`, `/key/regenerate`
(`litellm/proxy/management_endpoints/key_management_endpoints.py`).

```bash
curl 'http://0.0.0.0:4000/key/generate' -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"models": ["gpt-6-luna"], "max_budget": 10, "budget_duration": "30d", "duration": "90d"}'
```

`duration` accepts `30s|30m|30h|30d`; empty `models` allows all models; a caller-supplied `key` needs
`sk-` plus 16+ characters, else a 16-character `sk-` key is created (`:2460-2475`). Block is reversible
and admin-only; delete removes the row, while `/key/info` serves deleted keys from
`LiteLLM_DeletedVerificationToken` with `deleted_at`/`deleted_by` (`:5197,5965-5974`).
Regeneration accepts `grace_period` (`"24h"`) to keep the old value valid; `None` revokes immediately
(`litellm/types/proxy/management_endpoints/key_requests.py:160`).

## 4. Inheritance and model access

A key's owner is the `user_id` it points at, not always its creator: `/key/generate` stamps the caller's
`user_id` only for non-admin callers; an admin-created key without `user_id` inherits nothing, and
service-account keys always have `user_id: null` (`https://docs.litellm.ai/docs/proxy/virtual_keys.md`,
"What a key inherits from its owner"). Management-route access is the owner's role, narrowed by the
key's `allowed_routes`.

`models` entries are concrete `model_name` values, wildcards matched against `model_name` (`openai/*`),
access-group labels expanded at auth time, or `SpecialModelNames` sentinels. Empty and `*` impose no
restriction at that layer; `all-proxy-models` likewise none; `all-team-models` on a key defers to the
team check; `no-default-models` on a **user** is a hard denial forcing team-scoped access
(`https://docs.litellm.ai/docs/proxy/key_auth_arch.md`).

Model access is never inherited when the key has a team; a standalone key passes its own check plus
its owner's `user.models`. A team key passes key and team checks plus any non-empty per-member
`allowed_models`; the owner's global `user.models` does not restrict team requests. With direct lists
only, key `["gpt-6.1-sol"]` under team `["azure-gpt-3.5"]` cannot call either model. Denials are `403`.

## 5. Credentials the proxy accepts

`user_api_key_auth` reads `x-litellm-api-key` first (it supersedes `Authorization`), then
`Authorization`, `API-Key`, `x-api-key`, `x-goog-api-key`, `Ocp-Apim-Subscription-Key`; Google
generate-content routes may use `?key=`, and `general_settings.litellm_key_header_name` adds a header
(`litellm/types/proxy/auth/special_headers.py:7-12`;
`litellm/proxy/auth/user_api_key_auth.py:1530-1600,2061`). WebSockets accept `api-key` or an
`openai-insecure-api-key.<key>` subprotocol; pass-through routes map a provider header via
`litellm_user_api_key` (`:1385-1403,1610-1635`).

## 6. SSO, JWT, and the five-user boundary

OIDC/SAML Admin-UI sign-in, SCIM, and audit logs are [Enterprise]
(`https://docs.litellm.ai/docs/enterprise.md`). SSO is free for five users: creating a free SSO user
takes a Postgres advisory lock, counts billable users, and returns `None` once the count is `>= 5`;
billable excludes `metadata.scim_active == false`
(`litellm/repositories/user_repository.py:74-79,173-196`). A configured
`MICROSOFT_CLIENT_ID`/`GOOGLE_CLIENT_ID`/`GENERIC_CLIENT_ID` without a license gets a `403`
(`litellm/proxy/management_endpoints/ui_sso.py:5160-5174`). JWT auth is [Enterprise] at any size:
`PremiumRequired::Jwt`, message `JWT Auth is an enterprise only feature`
(`litellm/rust/crates/gateway-auth-core/src/error.rs:67-70`).

## 7. Failure modes

- A DB-less proxy cannot authenticate virtual keys: `No connected db.`
  (`https://docs.litellm.ai/docs/proxy/users.md`). The master key still works.
- Key `expires`, `blocked`, `models`, `allowed_routes`, and team membership are cached per worker;
  revocation is immediate everywhere only with Redis
  (`https://docs.litellm.ai/docs/proxy/redis_requirements.md`).
- Key `tags` and `enforced_params` are [Enterprise] fields
  (`litellm/proxy/management_endpoints/key_management_endpoints.py:4185,4187`); model access, budgets,
  and rate limits are [OSS].

## Sources

- https://docs.litellm.ai/docs/proxy/virtual_keys.md
- https://docs.litellm.ai/docs/proxy/master_key_rotations.md
- https://docs.litellm.ai/docs/proxy/key_auth_arch.md
- https://docs.litellm.ai/docs/enterprise.md
- repo bcb1f486: `litellm/proxy/auth/master_key_boot_check.py`; `litellm/proxy/auth/user_api_key_auth.py`;
  `litellm/proxy/management_endpoints/key_management_endpoints.py`; `litellm/proxy/schema.prisma`;
  `litellm/repositories/user_repository.py`.
