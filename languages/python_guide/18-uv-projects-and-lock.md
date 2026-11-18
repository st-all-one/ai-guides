# 18 - uv projects: `pyproject.toml`, `uv.lock`, and reproducible sync

This chapter answers how uv turns a `pyproject.toml` into a portable `uv.lock`, how `uv sync` installs a subset, and which flags make installs reproducible in CI. It follows chapter 17 and precedes chapter 20.

## Project files and layout

`pyproject.toml` identifies the project root and minimally declares `name` and `version` (`samples/concepts__projects__layout.md:5`, `samples/concepts__projects__layout.md:16`). uv creates `.venv` beside it for editor discovery and excludes it from version control (`samples/concepts__projects__layout.md:30`); `uv.lock` sits beside it and should be committed (`samples/concepts__projects__layout.md:59`, `samples/concepts__projects__layout.md:63`).

| Artifact | Role | Evidence |
|---|---|---|
| `pyproject.toml` | Broad requirements; edited by humans | `samples/concepts__projects__layout.md:61` |
| `uv.lock` | Exact resolved versions; uv-managed, do not hand-edit | `samples/concepts__projects__layout.md:69` |
| `.venv` | Project environment, local only | `samples/concepts__projects__layout.md:30` |

Locking resolves dependencies into `uv.lock`; syncing installs a subset into the environment (`samples/concepts__projects__sync.md:3`). Both are automatic: `uv run` locks and syncs first, and `uv tree` also updates the lockfile (`samples/concepts__projects__sync.md:7`).

## Choosing `--locked`, `--frozen`, `--offline`, and `--no-sync`

| Flag | Behavior | Use when | Evidence |
|---|---|---|---|
| `--locked` | Error if `uv.lock` is out of date; never rewrite it | CI verification of a committed lock | `samples/concepts__projects__sync.md:15`, `samples/reference__cli.md:988` |
| `--frozen` | Use the lockfile without checking freshness | Deployments that accept a stale lock | `samples/concepts__projects__sync.md:17`, `samples/reference__cli.md:888` |
| `--offline` | Disable all network access | Cached-only rebuilds | `samples/reference__cli.md:1136` |
| `--no-sync` | Skip the environment freshness check | Running against an already-correct env | `samples/concepts__projects__sync.md:23` |

A lockfile is outdated when project metadata changes such that a locked version is excluded; a change that still permits the locked version leaves it current (`samples/concepts__projects__sync.md:31`). New package releases never make a lockfile outdated — upgrades are explicit (`samples/concepts__projects__sync.md:43`). Check freshness without writing via `uv lock --check`, equivalent to `--locked` (`samples/concepts__projects__sync.md:33`, `samples/concepts__projects__sync.md:39`).

`uv sync` performs exact syncing and removes packages not selected; `uv run` is inexact by default, and `--exact` / `--inexact` invert these defaults (`samples/concepts__projects__sync.md:75`, `samples/concepts__projects__sync.md:83`). To upgrade, use `uv lock --upgrade` or `uv lock --upgrade-package <package>`; previously locked versions are otherwise preferred (`samples/concepts__projects__sync.md:127`, `samples/concepts__projects__sync.md:132`).

```bash
uv lock --check                      # assert lockfile is current
uv sync --locked                     # fail rather than rewrite uv.lock
uv sync --locked --all-extras --dev  # typical CI install
uv export --format pylock.toml       # PEP 751 / requirements / CycloneDX
```

## Universal resolution and lock schema

`uv.lock` uses a universal resolution covering all operating systems, architectures, and Python versions (`samples/concepts__resolution.md:65`, `samples/concepts__resolution.md:69`). Every required package must support the entire declared `requires-python` range (`samples/concepts__resolution.md:71`); where platforms differ, markers select the version and uv prefers the newest compatible one per Python version (`samples/concepts__resolution.md:73`).

| Mechanism | Meaning | Evidence |
|---|---|---|
| `version` field | Lockfile schema version | `samples/concepts__resolution.md:726` |
| Greater schema version | Rejected by older uv, even for `uv lock` | `samples/concepts__resolution.md:728` |
| `revision` field | Backwards-compatible changes; older uv does not error | `samples/concepts__resolution.md:734` |
| Schema bump | Public API, minor releases only; patch versions fully compatible | `samples/concepts__resolution.md:732` |
| `exclude-newer` | Restrict candidates to artifacts uploaded before a date | `samples/concepts__resolution.md:609` |

Pin uv in CI (`derived`): schema compatibility holds within a minor release but not across one. `uv export` writes `requirements.txt`, `pylock.toml`, or CycloneDX SBOM for non-uv tools (`samples/concepts__projects__sync.md:157`).

## Groups, extras, sources, and overrides

Dependencies live in four fields: published `project.dependencies`, published `project.optional-dependencies` (extras), local `dependency-groups`, and development-only `tool.uv.sources` alternatives (`samples/concepts__projects__dependencies.md:5`, `samples/concepts__projects__dependencies.md:10`). Groups are recently standardized and not universal across tools (`samples/concepts__projects__dependencies.md:14`).

| Field | Purpose | Flag / syntax | Evidence |
|---|---|---|---|
| `project.optional-dependencies` | Published extras, requested as `pkg[extra]` | `uv add --optional network httpx` | `samples/concepts__projects__dependencies.md:557`, `samples/concepts__projects__dependencies.md:584` |
| `[dependency-groups]` | Local, unpublished dev deps | `uv add --dev pytest`, `--group lint` | `samples/concepts__projects__dependencies.md:627`, `samples/concepts__projects__dependencies.md:652` |
| `tool.uv.sources` | index / git / URL / path / workspace overrides | `foo = { path = "./packages/foo" }` | `samples/concepts__projects__dependencies.md:184`, `samples/concepts__projects__dependencies.md:200` |
| `tool.uv.override-dependencies` | Replace bad declared bounds | global or scoped per package | `samples/concepts__resolution.md:314`, `samples/concepts__resolution.md:316` |

Sources are uv-only (`samples/concepts__projects__dependencies.md:210`). Constraints narrow versions, overrides expand them for erroneous upper bounds (`samples/concepts__resolution.md:302`, `samples/concepts__resolution.md:312`). The `dev` group is synced by default (`samples/concepts__projects__sync.md:105`); conflicting extras or groups must be declared in `tool.uv.conflicts` (`samples/concepts__projects__config.md:466`, `samples/concepts__projects__dependencies.md:680`).

## Build backend, entry points, and CI

`[build-system]` tells uv to build and install the project itself; without it only dependencies are installed (`samples/concepts__projects__config.md:100`). `uv init` defaults to the native `uv_build` backend, pure Python only; pin it with an upper bound (`samples/concepts__build-backend.md:11`, `samples/concepts__build-backend.md:25`). uv embeds a compatible backend copy, other frontends fetch it from an index (`samples/concepts__build-backend.md:43`). Entry points like `[project.scripts]` require a build system and run via `uv run <command>` (`samples/concepts__projects__config.md:30`, `samples/concepts__projects__config.md:48`).

CI consequence (`derived`): use `uv sync --locked` so a stale lock fails the job instead of silently re-resolving — both the GitHub and Docker guides do this (`samples/guides__integration__github.md:193`, `samples/guides__integration__docker.md:148`).

## Sources

- https://docs.astral.sh/uv/concepts/projects/layout/index.md
- https://docs.astral.sh/uv/concepts/projects/sync/index.md
- https://docs.astral.sh/uv/concepts/resolution/index.md
- https://docs.astral.sh/uv/concepts/projects/dependencies/index.md
- https://docs.astral.sh/uv/concepts/projects/config/index.md
- https://docs.astral.sh/uv/concepts/build-backend/index.md
- https://docs.astral.sh/uv/guides/integration/github/index.md
- https://docs.astral.sh/uv/guides/integration/docker/index.md
