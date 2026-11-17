# 04 — Installation

One image (`docker.litellm.ai/berriai/litellm`) and one Python package cover every path
below: scripted quickstart, compose, a single container with no database, pip/uv, Helm,
Terraform. All are [OSS]; Helm and Terraform are deployment mechanisms, not paid features,
though some values they expose enable [Enterprise] features.

## 1. Quickstart script

```bash
curl -fsSL https://raw.githubusercontent.com/BerriAI/litellm/main/litellm/scripts/quickstart.sh | sh
```

Windows: `quickstart.ps1`. It runs the quickstart compose file
(`litellm/scripts/quickstart.sh:37-38`), needs Docker, Podman, or Rancher with Compose v2
(`:30-33`), writes keys and the DB password to `.env` at mode 600, binds `127.0.0.1` only
(`:27-28`). Stop: `| sh -s -- stop` (`:17-19`).

## 2. Compose quickstart: proxy and Postgres

```bash
curl -sSLO https://github.com/BerriAI/litellm/raw/main/litellm/deploy/docker/docker-compose.quickstart.yml
printf 'LITELLM_MASTER_KEY=sk-%s\nLITELLM_SALT_KEY=sk-%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env
docker compose -f docker-compose.quickstart.yml up -d
```

Those commands are the file header (`litellm/deploy/docker/docker-compose.quickstart.yml:5-11`).
The stack:

| Service | Image | Details |
|---|---|---|
| `litellm` | `docker.litellm.ai/berriai/litellm:latest` | port `4000`, `STORE_MODEL_IN_DB=True` |
| `db` | `postgres:16` | user/db `litellm`, volume `postgres_data` |

(`:14`, `:19-26`, `:28-43`.) The proxy waits on the DB healthcheck, so a failed Postgres
start surfaces first. Open `http://localhost:4000/ui`, sign in as `admin` with the
master key, then add a model (`https://docs.litellm.ai/docs/proxy/docker_quick_start.md`).
Keep `.env`: regenerating `LITELLM_SALT_KEY` makes stored credentials unreadable (`:9-11`).

## 3. Hardened compose stack

```bash
curl -sSLO https://github.com/BerriAI/litellm/raw/main/litellm/deploy/compose/docker-compose.yml
LITELLM_ENV_FILE=.env docker compose up -d
```

Uses `:main-stable`, publishes `4000:4000`, sets `STORE_MODEL_IN_DB=True`, and runs
`read_only: true` with `cap_drop: ALL`, `no-new-privileges`, and tmpfs at `/tmp` and
`/app/.cache` (`litellm/deploy/compose/docker-compose.yml:20-49`). Healthcheck calls
`/health/liveliness` (`:53-60`); database is Postgres 16 on volume `litellm_postgres_data`
(`:62-75`, `:95`). `--profile monitoring` adds Prometheus on 9090 (`:10`, `:77-90`).

## 4. Single container, config only, no database

```yaml
# litellm_config.yaml
model_list:
  - model_name: gpt-6.1-sol
    litellm_params:
      model: openai/gpt-6.1-sol
      api_key: os.environ/OPENAI_API_KEY
```

```bash
export OPENAI_API_KEY="<openai-key>" LITELLM_MASTER_KEY="sk-<long-random>"
docker run -v "$PWD/litellm_config.yaml:/app/config.yaml:ro" -e OPENAI_API_KEY \
  -e LITELLM_MASTER_KEY -p 127.0.0.1:4000:4000 \
  docker.litellm.ai/berriai/litellm:latest --config /app/config.yaml
```

Documented database-free path
(`https://docs.litellm.ai/docs/proxy/docker_quick_start.md`). `--config` is a real CLI
option (`litellm/proxy/proxy_cli.py:1090-1095`), `--host`/`--port` default to
`0.0.0.0`/`4000` (`:1016-1017`), and the entrypoint forwards everything after the image
name to `litellm` (`litellm/deploy/docker/docker-entrypoint.sh:9-10`, `:91-93`).

What a database-free install loses:

| Missing | Evidence |
|---|---|
| Virtual keys: `/key/generate` fails with `No connected db.`; master key only | `litellm/proxy/management_endpoints/key_management_endpoints.py:2438-2444` |
| Budgets: `max_budget` warns once and is never enforced | `litellm/proxy/proxy_server.py:11406-11416` |
| Spend tracking: spend logs, budget columns, Usage views need Postgres | `https://docs.litellm.ai/docs/proxy/db_info.md` |
| UI-managed models: `STORE_MODEL_IN_DB` cannot write; YAML stays authoritative | `https://docs.litellm.ai/docs/proxy/configs.md` |

## 5. pip / uv

```bash
pip install 'litellm[proxy]'      # or: uv tool install 'litellm[proxy]'
litellm --config /path/to/config.yaml
```

The `proxy` extra installs FastAPI, uvicorn, gunicorn, Granian, and the runtime
(`pyproject.toml:58-75`). Supported Python is `>=3.10, <3.16` (`pyproject.toml:6`);
`uv tool install` provisions a matching interpreter, while `pip install` on an older Python
silently resolves an old release (`https://docs.litellm.ai/docs/proxy/quick_start.md`). The
CLI entry point is `litellm` (`pyproject.toml:211-212`). Replace the ASGI server with
`--run_gunicorn`, `--run_hypercorn`, or `--run_granian`
(`litellm/proxy/proxy_cli.py:1164-1184`); `--num_workers` defaults to 1 (`:1018-1027`).

## 6. Helm and Terraform

```bash
helm upgrade --install litellm oci://ghcr.io/berriai/litellm/chart/litellm \
  --version 1.0.0 --namespace litellm --values values.yaml --wait --timeout 30m
```

The chart renders gateway, backend, and UI as separate Deployments, or one monolith with
`monolith.enabled: true` (`litellm/deploy/helm/litellm/values.yaml:1-11`); migrations run as
a pre-install/pre-upgrade hook by default (`:137-156`). Set `database.writer.host`, a
credentials Secret, and `redis.host` (`:258-295`, `:341`); image repository
`ghcr.io/berriai/litellm` (`:33-35`), with `lts` and version tags
(`https://docs.litellm.ai/docs/proxy/deploy/helm.md`).

Terraform modules under `litellm/deploy/terraform/litellm/{aws,gcp}` take `image`,
`tenant`, `env`, `gateway_extra_env` and create managed Postgres, Redis, and a load
balancer that is **public by default** — review ingress before production
(`https://docs.litellm.ai/docs/proxy/deploy/terraform.md`).

## 7. Ports, probes, upgrades

| Item | Value |
|---|---|
| Ports | 4000 proxy, 4001 backend, 3000 UI (`litellm/deploy/docker/Dockerfile:218`) |
| Liveness | `GET /health/liveliness`, no auth (`https://docs.litellm.ai/docs/proxy/health.md`) |
| Readiness | `GET /health/readiness`, no auth, 503 when a configured DB is unreachable |
| Readiness body | `db` reports `connected`, `disconnected`, or `Not connected` |

Upgrades: pin image and chart, run one migration job on the target image, roll pods with
`maxUnavailable: 0` and grace longer than the longest stream
(`https://docs.litellm.ai/docs/proxy/upgrade_guide.md`). An image rollback does not undo
migrations. The chart sets `DISABLE_SCHEMA_UPDATE=true` on serving pods even with the
migration job disabled (`https://docs.litellm.ai/docs/proxy/prod.md`).

## 8. Choosing a path

Laptop: quickstart. Single VM: hardened compose or `docker run`. Python: `uv`. Kubernetes:
Helm. AWS/GCP: Terraform. Pin a tag or digest beyond evaluation; `main-stable` and
`main-latest` are deprecated
(`https://docs.litellm.ai/docs/proxy/docker_image_security.md`).

## Sources

- `litellm/scripts/quickstart.sh`
- `litellm/deploy/docker/docker-compose.quickstart.yml`
- `litellm/deploy/compose/docker-compose.yml`
- `litellm/deploy/docker/docker-entrypoint.sh`
- `litellm/deploy/docker/Dockerfile`
- `litellm/deploy/helm/litellm/values.yaml`
- `litellm/proxy/proxy_cli.py`
- `pyproject.toml`
- https://docs.litellm.ai/docs/proxy/docker_quick_start.md
- https://docs.litellm.ai/docs/proxy/quick_start.md
