# 20 - uv workspaces and integration: one lock, many environments

This chapter answers how packages share one `uv.lock`, how to carry it into Docker and GitHub Actions, and how config, indexes, preview flags, and cache storage resolve. It follows chapter 18 and chapter 17.

## Workspaces: one lockfile, many packages

A workspace is a set of packages managed together: each keeps its own `pyproject.toml`, but all share one lockfile (`samples/concepts__projects__workspaces.md:3`, `samples/concepts__projects__workspaces.md:7`). `uv lock` covers the whole workspace; `uv run` and `uv sync` target the root by default and accept `--package` (`samples/concepts__projects__workspaces.md:9`). A `[tool.uv.workspace]` table defines required `members` and optional `exclude` globs (`samples/concepts__projects__workspaces.md:13`, `samples/concepts__projects__workspaces.md:19`); each matched directory needs a `pyproject.toml`, and the root is a member (`samples/concepts__projects__workspaces.md:38`, `samples/concepts__projects__workspaces.md:40`).

```toml
[project]
name = "albatross"
version = "0.1.0"
dependencies = ["bird-feeder", "tqdm>=4,<5"]

[tool.uv.sources]
bird-feeder = { workspace = true }

[tool.uv.workspace]
members = ["packages/*"]
exclude = ["packages/seeds"]

```

`workspace = true` resolves the dependency from a member, not PyPI, and inter-member dependencies are editable (`samples/concepts__projects__workspaces.md:68`, `samples/concepts__projects__workspaces.md:72`). Root `tool.uv.sources` apply to all members unless overridden, even by a marker-limited source (`samples/concepts__projects__workspaces.md:74`, `samples/concepts__projects__workspaces.md:101`).

| Situation | Preferred mechanism | Evidence |
|---|---|---|
| Interconnected packages in one repo | Workspace with shared `uv.lock` and `--package` | `samples/concepts__projects__workspaces.md:9` |
| Conflicting requirements or separate environments | Independent projects with path dependencies | `samples/concepts__projects__workspaces.md:145` |
| One member needs an unsupported Python version | `uv pip` in a separate environment | `samples/concepts__projects__workspaces.md:166` |

Workspaces enforce one `requires-python`, the intersection of all member ranges (`samples/concepts__projects__workspaces.md:166`); a member-local source is the override (`samples/concepts__projects__workspaces.md:101`).

## Docker: pin the tool and assert the lock

Pin the uv image tag, or a SHA256 digest for fully reproducible builds (`samples/guides__integration__docker.md:116`, `samples/guides__integration__docker.md:121`). Use `uv sync --locked` so a stale lock fails the build and `UV_NO_DEV=1` to skip dev dependencies (`samples/guides__integration__docker.md:148`, `samples/guides__integration__docker.md:144`); add `.venv` to `.dockerignore` (`samples/guides__integration__docker.md:153`).

| Docker lever | Purpose | Evidence |
|---|---|---|
| `UV_LINK_MODE=copy` | Avoid cross-filesystem link warnings with a cache mount | `samples/guides__integration__docker.md:321`, `samples/guides__integration__docker.md:327` |
| `--mount=type=cache,target=/root/.cache/uv` | Reuse cache across builds | `samples/guides__integration__docker.md:323` |
| `UV_COMPILE_BYTECODE=1` | Faster startup at higher build cost | `samples/guides__integration__docker.md:307`, `samples/guides__integration__docker.md:291` |

```Dockerfile
FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:0.13.9 /uv /uvx /bin/
ENV UV_NO_DEV=1
ENV UV_LINK_MODE=copy
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked
```

## GitHub Actions and automated lock updates

Use `astral-sh/setup-uv` with an explicit version pin (`samples/guides__integration__github.md:5`, `samples/guides__integration__github.md:45`). The canonical install is `uv sync --locked --all-extras --dev` (`samples/guides__integration__github.md:193`). Cache with `enable-cache: true` or a key from `hashFiles('uv.lock')`, then `uv cache prune --ci` (`samples/guides__integration__github.md:216`, `samples/guides__integration__github.md:237`, `samples/guides__integration__github.md:245`); for `uv pip`, key on `requirements.txt` (`samples/guides__integration__github.md:252`).

Dependabot updates `uv.lock` via the `uv` ecosystem (`samples/guides__integration__dependabot.md:7`). Renovate detects `uv.lock`, updates `pyproject.toml` and the lock, and can refresh transitive deps via `lockFileMaintenance` (`samples/guides__integration__renovate.md:9`, `samples/guides__integration__renovate.md:11`). Prefer these bots to ad-hoc `uv lock --upgrade` in CI (`derived`).

## Indexes, credentials, and configuration precedence

Indexes are consulted in definition order, CLI indexes take precedence, and the default index is always lowest priority (`samples/concepts__indexes.md:17`, `samples/concepts__indexes.md:28`). `--index-strategy` / `UV_INDEX_STRATEGY` changes multi-index behavior; the default `first-index` avoids dependency confusion (`samples/concepts__indexes.md:101`, `samples/pip__compatibility.md:55`). Pin a package to an index in `tool.uv.sources` (`samples/concepts__indexes.md:45`). Credentials belong in `UV_INDEX_<NAME>_USERNAME` / `..._PASSWORD` and are never stored in `uv.lock` (`samples/concepts__indexes.md:129`, `samples/concepts__indexes.md:146`).

| Rule | Resolution | Evidence |
|---|---|---|
| Same-directory files | `uv.toml` wins over `[tool.uv]` in `pyproject.toml` | `samples/concepts__configuration-files.md:37` |
| Layers | CLI > environment > persistent config | `samples/concepts__configuration-files.md:49` |
| File levels | Project > user > system; arrays concatenate | `samples/concepts__configuration-files.md:45`, `samples/concepts__configuration-files.md:47` |
| Workspaces | Search starts at workspace root; member config ignored | `samples/concepts__configuration-files.md:11` |
| Escape hatches | `--no-config` disables discovery; `--config-file` replaces it | `samples/concepts__configuration-files.md:51`, `samples/concepts__configuration-files.md:53` |

`uv run` loads dotenv files via `UV_ENV_FILE` or `--env-file`; later files override earlier ones, and real environment variables win (`samples/concepts__configuration-files.md:61`, `samples/concepts__configuration-files.md:73`, `samples/concepts__configuration-files.md:77`).

## Preview features and storage

`--preview` or `UV_PREVIEW=1` enables all preview features; `--preview-features` (repeatable or comma-separated), `UV_PREVIEW_FEATURES`, or `preview-features` in config enables named ones (`samples/concepts__preview.md:7`, `samples/concepts__preview.md:19`, `samples/concepts__preview.md:43`). Unknown names warn, and some features act before config loads (`samples/concepts__preview.md:53`, `samples/concepts__preview.md:51`). Examples: `uv audit` and `index-by-name` (`samples/concepts__preview.md:77`, `samples/concepts__indexes.md:41`).

Cache buckets are versioned, so several uv releases can share one cache directory even if not every entry is shared (`samples/concepts__cache.md:155`, `samples/concepts__cache.md:159`). Selection order is `--no-cache` temporary dir, then `--cache-dir` / `UV_CACHE_DIR` / `tool.uv.cache-dir`, then a system default (`samples/concepts__cache.md:139`, `samples/concepts__cache.md:147`). Uninstall cleans cache, Python, and tool directories (`samples/getting-started__installation.md:218`, `samples/getting-started__installation.md:219`, `samples/getting-started__installation.md:220`).

## Sources

- https://docs.astral.sh/uv/concepts/projects/workspaces/index.md
- https://docs.astral.sh/uv/guides/integration/docker/index.md
- https://docs.astral.sh/uv/guides/integration/github/index.md
- https://docs.astral.sh/uv/guides/integration/dependabot/index.md
- https://docs.astral.sh/uv/guides/integration/renovate/index.md
- https://docs.astral.sh/uv/concepts/configuration-files/index.md
- https://docs.astral.sh/uv/concepts/indexes/index.md
- https://docs.astral.sh/uv/concepts/preview/index.md
- https://docs.astral.sh/uv/concepts/cache/index.md
