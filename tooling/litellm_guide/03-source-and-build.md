# 03 — Source and build

The repository as checked out at `bcb1f48` (`litellm` 1.111.0): size, Python
package layout and packaging, container and Admin UI builds, and how to pin
releases. Running the proxy is `04`. Numbers are measured in this checkout and
reproducible with the commands shown; source is MIT except
`litellm/enterprise/` (`LICENSE:1-4`).

## 1. Measured surface

| Measure | Value | How measured |
|---|---|---|
| Version | `1.111.0` | `pyproject.toml:3` |
| Package Python files / lines | 3,580 / 1,158,033 | `find litellm -name '*.py'` |
| Whole-repo Python files / lines | 9,517 / 3,990,253 | `find . -name '*.py'` |
| Tests | 5,921 `.py` files, 2,829,282 lines (6,237 files total) | `tests/` |
| Provider adapters | 159 dirs under `litellm/llms/` (158 adapters + root) | `find litellm/llms -maxdepth 1 -type d` |
| Rust crates | 87 under `litellm/rust/crates/` | same pattern |
| Prisma migrations | 254 entries | `litellm/proxy-extras/litellm_proxy_extras/migrations/` |
| Dashboard source | 34 MB, Next.js | `litellm/ui/litellm-dashboard/` |

Each adapter is one directory under `litellm/llms/` (e.g. `anthropic/`); shared
modules sit alongside (`litellm/llms/base.py`, `litellm/llms/custom_llm.py`).

## 2. Package layout

| Path | Role |
|---|---|
| `litellm/` | Python SDK and proxy; `litellm/main.py` is the SDK entry point |
| `litellm/llms/` | Provider adapters, one directory per provider |
| `litellm/proxy/` | FastAPI proxy, auth, routing, management endpoints, `schema.prisma` |
| `litellm/litellm_core_utils/` | Shared request, logging, serialization helpers |
| `litellm/proxy-extras/` | Workspace package: Prisma migrations and DB helpers |
| `litellm/ui/litellm-dashboard/` | Next.js Admin UI, exported statically into the proxy |
| `litellm/enterprise/` | Proprietary package, imported when present |
| `litellm/deploy/` | Dockerfile, compose files, Helm chart, Terraform modules |
| `litellm/runtime/` | Component entrypoints (`gateway`, `backend`, `migrations`) |
| `litellm/rust/crates/` | Rust crates, including `gateway`, `router`, `auth`, `cache` |
| `tests/` | Test suite, excluded from packaging |

The uv workspace has three members — `litellm/enterprise`,
`litellm/proxy-extras`, `litellm/packaging/litellm-proxy` (`pyproject.toml:452-453`).
The last builds the opt-in Rust forwarding binary `litellm-gateway`
(`litellm/packaging/litellm-proxy/pyproject.toml:1-16`).

## 3. Packaging metadata

| Item | Value |
|---|---|
| Name / version / license | `litellm`, `1.111.0`, MIT (`pyproject.toml:1-8`) |
| Python range | `>=3.10, <3.16`, i.e. 3.10-3.15 (`pyproject.toml:6`) |
| `proxy` extra | FastAPI, uvicorn, gunicorn, Granian, uvloop, psycopg (`:58-75`) |
| `extra_proxy` | Prisma, cloud identity, Redis VL, A2A (`:124-140`) |
| `proxy-runtime` | Provider SDKs, OpenTelemetry, Langfuse, ddtrace, Sentry (`:186-209`) |
| Console scripts | `litellm`, `lite`, `litellm-proxy` → `litellm_cli.main` (`:211-214`) |
| Build backend | `maturin==1.15.0` with `.github/packaging` (`:341-344`) |

CLI implementation: `litellm/proxy/proxy_cli.py`. Reproducible resolution comes
from `uv.lock`; dependency ranges (not pins) are deliberate for SDK consumers
(`pyproject.toml:13-16`). The version is tracked for release tooling at
`:455-460` (`[tool.commitizen]`), and the Rust proxy wheel carries it too
(`litellm/packaging/litellm-proxy/pyproject.toml:2-3`).

## 4. Docker build

Multi-stage Wolfi build, every base image digest-pinned:

| Step | Evidence (`litellm/deploy/docker/Dockerfile`) |
|---|---|
| Build/runtime bases: `cgr.dev/chainguard/wolfi-base@sha256:…` | `:4`, `:7` |
| Pinned uv `0.11.7`, Node `24.19-alpine3.24` | `:8-10` |
| PgBouncer `1.26.0` compiled from source with checksum | `:12-28` |
| `ui-builder`: `npm ci` + `npm run build` on the build platform | `:33-46` |
| `builder`: `uv sync --frozen` with proxy extras before copying source, so dependency layers cache | `:85-96` |
| UI export replaces the committed bundle at `litellm/proxy/_experimental/out` | `:98-105` |
| Prisma Client generated at build time into `/opt/prisma`; runtime bakes CLI and engines so migrations need no network | `:124-126`, `:173-179`, `:194` |
| Runtime copies venv, LiteAdmin, UI, Prisma, entrypoint | `:181-197` |
| Runs as uid `65532`; exposes 4000, 4001, 3000 | `:214`, `:218` |

A read-only root filesystem works because runtime writes stay in `/app/.cache`,
`/var/lib/litellm`, `/tmp` (`litellm/deploy/docker/README.md`, "Hardening"); the
compose file is the hardening test (`read_only: true`, `cap_drop: ALL`, tmpfs —
`litellm/deploy/compose/docker-compose.yml:42-49`).

## 5. Admin UI build

The dashboard is a private Next.js package with `dev`, `build`, `start` scripts
(`litellm/ui/litellm-dashboard/package.json:1-10`). The Dockerfile builds it once
on the build platform rather than per target architecture, then copies the
static export; a second script applies the enterprise color override when the
enterprise tree is present (`litellm/deploy/docker/Dockerfile:104-105`). The bundle
carries a `.litellm_ui_ready` marker to detect a prebuilt UI (`:130-133`).

## 6. Tests and repository hygiene

Pytest config in `pyproject.toml:462-466`: `asyncio_mode = "auto"`, a
session-scoped loop, and `norecursedirs` excluding `litellm/ui`,
`litellm/enterprise`, `litellm/proxy-extras`, `litellm/packaging`,
`litellm/rust`, `litellm/scripts`, `litellm/runtime`.

## 7. Releases, tags and pinning

- Quickstart uses `docker.litellm.ai/berriai/litellm:latest`
  (`litellm/deploy/docker/docker-compose.quickstart.yml:14`); the fuller compose
  pins `:main-stable` (`litellm/deploy/compose/docker-compose.yml:20`).
- `main-stable` and `main-latest` are deprecated. Stable releases are plain
  `vX.Y.Z` tags; production pins a tag or digest
  (`https://docs.litellm.ai/docs/proxy/docker_image_security.md`).
- Images are signed with cosign since v1.83.0; public key `cosign.pub`.
- Chart and image versions differ: chart `1.0.0` carries `appVersion: "1.104.0"`
  (`litellm/deploy/helm/litellm/Chart.yaml:5-6`). Pin both explicitly.

## 8. License boundary in the tree

`LICENSE:1-4` makes everything outside `litellm/enterprise/` MIT. The enterprise
package declares `LicenseRef-Proprietary` (`litellm/enterprise/pyproject.toml:7`)
and needs a BerriAI subscription for production
(`litellm/enterprise/LICENSE.md`). The Dockerfile copies `litellm/enterprise`
into the venv when present (`litellm/deploy/docker/Dockerfile:122`), but features
stay gated at
runtime by the license check (`litellm/proxy/proxy_server.py:1257-1258`).
Building from source grants no enterprise rights.

## Sources

- `pyproject.toml`
- `LICENSE`, `litellm/enterprise/pyproject.toml`, `litellm/enterprise/LICENSE.md`
- `litellm/packaging/litellm-proxy/pyproject.toml`
- `litellm/deploy/docker/Dockerfile`, `litellm/deploy/docker/README.md`
- `litellm/deploy/compose/docker-compose.yml`
- `litellm/deploy/docker/docker-compose.quickstart.yml`
- `litellm/deploy/helm/litellm/Chart.yaml`
- `litellm/ui/litellm-dashboard/package.json`
- `litellm/proxy/proxy_server.py`
- https://docs.litellm.ai/docs/proxy/docker_image_security.md
