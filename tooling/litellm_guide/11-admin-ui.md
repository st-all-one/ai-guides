# 11 — Admin UI

Scope: what `/ui` can do on a free gateway, how admins sign in, where UI writes land, and where a YAML-owned key or missing database makes a UI edit impossible. Dashboard `[OSS]`; SSO and organization pages `[Enterprise]`.

## 1. What `/ui` is

A pre-built Next.js static export mounted with Starlette (`app.mount("/ui", StaticFiles(directory=ui_path, html=True), name="ui")`) — read-only HTML plus client-side JS. Every button calls a proxy REST endpoint on the same origin, so the UI can never do what the API cannot.

- Packaged export: `litellm/proxy/_experimental/out` (`litellm/proxy/proxy_server.py:2742`). Boot resolution: packaged path, then `/var/lib/litellm/ui` when `LITELLM_NON_ROOT=true`; `LITELLM_UI_PATH` wins (`:2847-2855`). `_next` is mounted twice, then `/ui` (`:2970-2982`).
- `DISABLE_ADMIN_UI=True` serves "Admin UI Disabled" instead of the dashboard (`litellm/proxy/common_utils/admin_ui_utils.py:8`).
- Extensionless routes (`/ui/login`) need each exported `*.html` moved to `<route>/index.html`; the proxy does that at boot only when the UI directory is writable, so read-only deployments must pre-build it or those routes break (`:2920-2931`).
- Needs a master key and `DATABASE_URL`; without the DB the key, team, and user pages fail (`https://docs.litellm.ai/docs/proxy/ui.md`).

## 2. Sign-in paths

`POST /login` is the hidden form handler (`litellm/proxy/proxy_server.py:20106`).

| Path | Credential | Boundary |
| --- | --- | --- |
| Environment | `UI_USERNAME` (default `admin`), `UI_PASSWORD`; master key accepted as password when `UI_PASSWORD` is unset (`litellm/proxy/auth/login_utils.py:149-160`) | Makes the caller proxy admin |
| Database user | password via `Internal Users` or `POST /user/new` | role from the DB |
| SSO | `MICROSOFT_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `GENERIC_CLIENT_ID` | `[Enterprise]` — without a license startup fails with "You must be a LiteLLM Enterprise user to use SSO" (`litellm/proxy/management_endpoints/ui_sso.py:5168-5172`); free up to 5 users (`https://docs.litellm.ai/docs/enterprise.md`) |

`general_settings.disable_env_credential_login: true` turns path 1 off: `_admin_credentials_match` compares env credentials only when the flag is not true (`litellm/proxy/auth/login_utils.py:168-175`), and the warning banner uses the same predicate (`:185-202`). Break-glass login stays at `/fallback/login` (`litellm/proxy/proxy_server.py:1335`).

Failed sign-ins: more than 10 wrong passwords from one address in 60 s blocks that address for 5 minutes, counted in Redis when present, per worker otherwise (`https://docs.litellm.ai/docs/proxy/ui.md`).

## 3. What an OSS admin can do

Route tree under `litellm/ui/litellm-dashboard/src/app/(dashboard)/`:

| Page route | Capability | Endpoint it drives |
| --- | --- | --- |
| `models-and-endpoints` | Add/edit/delete DB models, no restart (`https://docs.litellm.ai/docs/proxy/ui.md`) | `POST /model/new`, `/model/update`, `/model/delete` |
| `api-keys` | Issue/edit/block/rotate virtual keys | `/key/generate`, `/key/update`, `/key/block` |
| `teams`, `users` | Teams, members, internal users | `/team/*`, `/user/*` |
| `usage`, `logs` | Spend and request logs | `/spend/logs` (`litellm/proxy/spend_tracking/spend_management_endpoints.py:3479`), `/spend/logs/ui` (`:2578`) |
| `playground` | Chat against configured models | `/v1/chat/completions` |
| `caching` | Cache backend and semantic scope | `GET/POST /cache/settings` (`litellm/proxy/management_endpoints/cache_settings_endpoints.py:453`) |
| `guardrails`, `guardrails-monitor` | Guardrail config and run history | `/guardrails/*` |
| `mcp-servers` | Register MCP servers, tool access | `/mcp/server` (`litellm/proxy/management_endpoints/mcp_management_endpoints.py:1388`) |
| `router-settings`, `budgets`, `policies`, `workflows` | Router tuning, budgets, policies | `/router/settings` (`litellm/proxy/management_endpoints/router_settings_endpoints.py:87`), `/budget/*`, `/policy/list` (`litellm/proxy/management_endpoints/policy_endpoints/endpoints.py:473`) |

The `[Enterprise]` `organizations` page answers 403 without a license: the organization router is built with `_enterprise_license_required` (`litellm/proxy/management_endpoints/organization_endpoints.py:104-119`), message "Organizations are only available for LiteLLM Enterprise users" (`:113`).

## 4. Where YAML and database ownership block UI edits

Since v1.103.0 settings are owned key by key, per section, for `general_settings`, `router_settings`, `litellm_settings`, and `environment_variables` (`https://docs.litellm.ai/docs/proxy/configs.md`):

- A key declared in `config.yaml` is file-owned. The UI, `POST /config/update`, and `POST /config/field/update` return 400 naming the key, the section, any ignored DB value, and the resolution.
- A key the file does not declare becomes DB-owned once `store_model_in_db` is on; the UI writes it to `LiteLLM_Config`. Re-sending the value the file already holds is accepted.
- `model_list` is not merged: a UI-added model is an extra deployment in `LiteLLM_ProxyModelTable`, load-balanced alongside a same-named YAML entry.

The refusal body is explicit, so a UI error is diagnosable:

```json
{"detail": {"error": "general_settings key 'store_model_in_db' is set in the config file and cannot be changed here.",
  "keys": ["store_model_in_db"], "section": "general_settings", "stored_database_values_ignored": [],
  "resolution": "edit /app/config.yaml to change it, or remove it from the file to let the database own it"}}
```

Before v1.103.0 the DB deep-merged over YAML, reversing precedence; on older versions edit the UI value, not the file.

`/config/field/update` returns the same 400 when no database is connected, before it validates the field name (`litellm/proxy/proxy_server.py:21457`).

## 5. Browser versus API

The browser session is not a second authorization model: the UI calls ordinary management endpoints with its session credential and the proxy applies the same role checks as for curl — `/config/update` rejects every role except `proxy_admin` with `403 Only proxy admins can update config` (`litellm/proxy/proxy_server.py:21154-21175`). A file-owned key is blocked in the API too.

- Survives a rebuild and is reviewed in Git: `config.yaml`.
- Runtime entities per customer or app (keys, teams, users, MCP servers, DB models): UI/API into Postgres.
- Never both for the same key.

## Sources

- `litellm/proxy/proxy_server.py:2742`, `:2847-2855`, `:2920-2931`, `:2970-2982`, `:1335`, `:20106`, `:21154-21175`, `:21457`
- `litellm/proxy/auth/login_utils.py:149-160`, `:168-175`, `:185-202`
- `litellm/proxy/common_utils/admin_ui_utils.py:8`
- `litellm/proxy/management_endpoints/ui_sso.py:5168-5172`
- `litellm/proxy/management_endpoints/organization_endpoints.py:104-119`
- `litellm/proxy/management_endpoints/cache_settings_endpoints.py:453`
- `litellm/proxy/management_endpoints/mcp_management_endpoints.py:1388`
- `litellm/ui/litellm-dashboard/src/app/(dashboard)/`
- https://docs.litellm.ai/docs/proxy/ui.md, https://docs.litellm.ai/docs/enterprise.md, https://docs.litellm.ai/docs/proxy/configs.md
