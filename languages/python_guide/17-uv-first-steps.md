# 17 - uv first steps: install, pin, run, and the pip boundary

This chapter answers how to install and pin uv itself, create a Python environment, run a command with `uv run`, add or remove dependencies, and decide when to use the `uv pip` interface instead of project commands. It is the entry point to the uv material; chapter 18 covers the lockfile model and chapter 19 covers scripts and tools.

## Install and pin uv

`uv self update` works only for standalone installs (`samples/getting-started__installation.md:140`); other methods use their package manager's upgrade path (`samples/getting-started__installation.md:147`).

| Method | Command | Evidence |
|---|---|---|
| Standalone (curl) | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `samples/getting-started__installation.md:14` |
| Pinned standalone | `curl -LsSf https://astral.sh/uv/0.13.9/install.sh \| sh` | `samples/getting-started__installation.md:26` |
| Pinned PowerShell | `irm https://astral.sh/uv/0.13.9/install.ps1 \| iex` | `samples/getting-started__installation.md:40` |
| Isolated PyPI install | `pipx install uv` | `samples/getting-started__installation.md:66` |
| Homebrew | `brew install uv` | `samples/getting-started__installation.md:84` |
| Docker image | `ghcr.io/astral-sh/uv` | `samples/getting-started__installation.md:113` |

Pin the exact version in the installer URL and in CI (`derived`): a uv version rejects a lockfile with a greater schema version (`samples/concepts__resolution.md:728`), so an unpinned uv can break a routine upgrade. The docs and release agree on **0.13.9** (`samples/getting-started__installation.md:26`).

```bash
curl -LsSf https://astral.sh/uv/0.13.9/install.sh | sh
uv self update          # standalone installs only
```

## Environments and `uv run`

`uv venv` creates a virtual environment (`samples/getting-started__features.md:63`). In a project, `uv run` guarantees the environment is up to date (`samples/concepts__projects__run.md:9`); the project is installed into `.venv` next to `pyproject.toml` and is isolated from the shell (`samples/concepts__projects__run.md:3`). Commands may come from the project or outside it (`samples/concepts__projects__run.md:11`); `--with` adds a one-off dependency (`samples/concepts__projects__run.md:25`).

`uv pip install` and `uv pip sync` invert `pip`'s default: they install into the active virtual environment, or the nearest `.venv` in the current or a parent directory (`samples/pip__compatibility.md:89`, `samples/pip__compatibility.md:91`). Installing into system Python requires an explicit `--python /path/to/python` or `--system` (`samples/pip__compatibility.md:95`).

| Python toolchain fact | Behavior | Evidence |
|---|---|---|
| Missing interpreter | Downloaded automatically by default | `samples/concepts__python-versions.md:43` |
| Explicit install | `uv python install 3.12.3` | `samples/concepts__python-versions.md:68` |
| Project pin | `uv python pin` writes `.python-version` | `samples/concepts__python-versions.md:49` |
| Project constraint | `requires-python` respected; first compatible version used | `samples/concepts__python-versions.md:178` |
| Offline policy | `python-downloads = "manual"` allows downloads only via `uv python install` | `samples/concepts__python-versions.md:298` |

## Adding and removing project dependencies

`uv add httpx` writes a bounded constraint such as `httpx>=0.27.2` into `project.dependencies` (`samples/concepts__projects__dependencies.md:23`, `samples/concepts__projects__dependencies.md:34`). The `--dev`, `--group`, and `--optional` flags route the dependency to the development group, a named group, or an extra (`samples/concepts__projects__dependencies.md:37`). `uv remove httpx` reverses the edit and also drops an now-unreferenced source entry (`samples/concepts__projects__dependencies.md:91`, `samples/concepts__projects__dependencies.md:96`). Metadata can equally be edited by hand in `pyproject.toml` (`samples/concepts__projects__dependencies.md:16`).

```bash
uv add httpx                       # project.dependencies
uv add --dev pytest                # [dependency-groups] dev
uv add --group lint ruff           # named group
uv add --optional network httpx    # [project.optional-dependencies]
uv remove httpx
```

## Decision table: `uv pip` vs project commands

The `uv pip` namespace is intended for legacy workflows or cases where the high-level commands do not provide enough control (`samples/getting-started__features.md:59`); uv is a drop-in replacement for common `pip` flows but explicitly not an exact clone (`samples/pip__compatibility.md:3`, `samples/pip__compatibility.md:7`).

| Situation | Use | Evidence |
|---|---|---|
| New project with `pyproject.toml` | `uv init`, `uv add`, `uv lock`, `uv sync`, `uv run` | `samples/getting-started__features.md:33` |
| Existing `requirements.txt` workflow | `uv pip compile` / `uv pip sync` | `samples/getting-started__features.md:81` |
| Manual, fine-grained environment control | `uv venv` + `uv pip install` | `samples/getting-started__features.md:59` |
| Changing a project's dependencies | `uv add` / `uv remove`, not manual env edits | `samples/concepts__projects__layout.md:36` |
| One-off requirement inside a project | `uv run --with` or `uvx` | `samples/concepts__projects__layout.md:36` |

Migration boundaries (`derived`): uv ignores `pip.conf` and `PIP_INDEX_URL`, using `UV_INDEX_URL` or `uv.toml` (`samples/pip__compatibility.md:13`, `samples/pip__compatibility.md:23`); it has no `--user` (`samples/pip__compatibility.md:191`); and it skips bytecode compilation by default, requiring `--compile-bytecode` or `UV_COMPILE_BYTECODE=1` (`samples/pip__compatibility.md:237`).

## Cache and link modes

uv caches registry artifacts by HTTP headers, Git dependencies by resolved commit hash, and local directories by the last-modified time of `pyproject.toml`/`setup.py`/`setup.cfg` (`samples/concepts__cache.md:9`, `samples/concepts__cache.md:11`, `samples/concepts__cache.md:12`). Concurrent commands are safe: a file lock protects the target environment (`samples/concepts__cache.md:103`).

| Lever | Effect | Evidence |
|---|---|---|
| `uv cache clean <pkg>` | Clear one package's entries | `samples/concepts__cache.md:114` |
| `--refresh` | Revalidate cached data | `samples/concepts__cache.md:18` |
| `uv cache prune --ci` | Drop pre-built wheels, keep source-built wheels | `samples/concepts__cache.md:135` |
| `cache-physical-space` preview | Accurate hardlink/clone-aware size estimate | `samples/concepts__cache.md:117` |
| Co-located cache | Enables linking instead of slower copies | `samples/concepts__cache.md:151` |

The install method from cache is controlled by `link-mode`: `clone` (copy-on-write) on macOS/Linux and `hardlink` on Windows by default (`samples/reference__settings.md:1392`), with `copy` and `symlink` as alternatives (`samples/reference__settings.md:1400`, `samples/reference__settings.md:1403`). Symlinks are discouraged because clearing the cache breaks installed packages (`samples/reference__settings.md:1394`). The CLI surface exposes the same flag (`samples/reference__cli.md:974`).

| Common flag | Meaning | Evidence |
|---|---|---|
| `--locked` | Assert `uv.lock` will remain unchanged | `samples/reference__cli.md:988` |
| `--frozen` | Run without updating `uv.lock` | `samples/reference__cli.md:888` |
| `--offline` | Disable all network access | `samples/reference__cli.md:1136` |
| `--exclude-newer` | Limit candidates to uploads before a date | `samples/reference__cli.md:821` |

## Sources

- https://docs.astral.sh/uv/getting-started/installation/index.md
- https://docs.astral.sh/uv/getting-started/features/index.md
- https://docs.astral.sh/uv/pip/compatibility/index.md
- https://docs.astral.sh/uv/concepts/python-versions/index.md
- https://docs.astral.sh/uv/concepts/cache/index.md
- https://docs.astral.sh/uv/reference/settings/index.md
- https://docs.astral.sh/uv/reference/cli/index.md
- https://docs.astral.sh/uv/concepts/projects/run/index.md
