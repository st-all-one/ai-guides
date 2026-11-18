# 05 - CLI and automation

The Deno CLI is the single entry point for running, testing, formatting and packaging a project; `deno help` documents its flags and usage (`docs/rt_runtime__reference__cli.md:9-12`, `docs/rt_runtime__getting_started__installation.md:245-246`). This chapter maps the command surface and the three automation targets the docs cover directly: continuous integration, containers, and editor integration.

## Command surface

The reference groups subcommands into execution, dependency management and tooling (`docs/rt_runtime__reference__cli.md:14-81`).

| Group | Commands | Evidence |
|---|---|---|
| Execution | `run`, `serve`, `task`, `repl`, `eval` | `docs/rt_runtime__reference__cli.md:16-20` |
| Dependency management | `add`, `approve-scripts`, `audit`, `bump-version`, `install`, `uninstall`, `remove`, `outdated`, `why` | `docs/rt_runtime__reference__cli.md:24-40` |
| Tooling | `bench`, `check`, `compile`, `completions`, `coverage`, `create`, `doc`, `deploy`, `desktop`, `fmt`, `info`, `init`, `jupyter`, `lint`, `lsp`, `pack`, `publish`, `test`, `transpile`, `types`, `upgrade`, `x` | `docs/rt_runtime__reference__cli.md:44-76` |
| Other | unstable flags, LSP integration guide | `docs/rt_runtime__reference__cli.md:80-81` |

A few behaviors matter for scripting. The `run` subcommand is optional, so `deno main.ts` equals `deno run main.ts` (`docs/rt_runtime__reference__cli__run.md:11-23`). Flags must precede the script name; anything after it lands in `Deno.args` (`docs/rt_runtime__run.md:54-91`). The ordering trap is documented verbatim (`docs/rt_runtime__run.md:86-90`):
```sh
# Good. We grant net permission to net_client.ts.
deno run --allow-net net_client.ts

# Bad! --allow-net was passed to Deno.args, throws a net permission error.
deno run net_client.ts --allow-net
```

`--watch` reruns on file changes and is also accepted by `test`, `serve` and `bench` (`docs/rt_runtime__reference__cli__run.md:55-73`). `deno eval` runs TypeScript inline with all permissions enabled and, since 2.8, auto-detects CommonJS snippets using `require(`, `module.exports`, `exports.`, `__dirname` or `__filename`, with `--ext=mjs`/`--ext=cjs` as overrides (`docs/rt_runtime__reference__cli__eval.md:11-49`).

## Continuous integration

A basic GitHub Actions pipeline checks out the repo and installs Deno with `denoland/setup-deno@v2`; the documented workflow is verbatim (`docs/rt_runtime__reference__continuous_integration.md:35-48`):
```yaml
name: Build

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x # Run with latest stable Deno.
```

| CI step | Command | Purpose | Evidence |
|---|---|---|---|
| Reproducible install | `deno ci` | locked install plus npm lifecycle handling (2.8+) | `docs/rt_runtime__reference__continuous_integration.md:52-56` |
| Format check | `deno fmt --check` | fail on formatting drift | `docs/rt_runtime__reference__continuous_integration.md:58-60` |
| Lint | `deno lint` | syntax and style scan; `--config` for custom rules | `docs/rt_runtime__reference__continuous_integration.md:62-64` |
| Tests + coverage | `deno test --allow-all --coverage=cov/` | run tests and collect coverage | `docs/rt_runtime__reference__continuous_integration.md:66-68` |
| Report | `deno coverage --lcov cov/ > cov.lcov` | LCOV output for Codecov/Coveralls | `docs/rt_runtime__reference__continuous_integration.md:70-72` |

Cross-platform runs use an OS matrix over `ubuntu-latest`, `macos-latest` and `windows-latest` (`docs/rt_runtime__reference__continuous_integration.md:78-130`). Windows runners need `core.autocrlf false` and `core.eol lf` before checkout or `deno fmt` can fail on CRLF (`:96-110`). Caching uses `cache: true` on setup-deno; the key uses the job id, runner OS/architecture and a hash of `deno.lock`, overridable with `cache-hash` (`:156-220`).

## Containers

Deno publishes official images to Docker Hub and GitHub Container Registry in `debian`, `ubuntu`, `alpine`, `distroless` and `bin` variants (`docs/rt_runtime__getting_started__installation.md:197-205`). The documented base Dockerfile is verbatim (`docs/rt_runtime__reference__docker.md:20-34`):
```dockerfile
FROM denoland/deno:latest

WORKDIR /app

# Copy manifests first so the dependency install layer caches across
# source-only edits
COPY deno.json deno.lock package.json* ./
RUN deno ci --prod --skip-types

# Then copy the rest of the source
COPY . .

CMD ["deno", "run", "--allow-net", "main.ts"]
```

| Docker concern | Documented answer | Evidence |
|---|---|---|
| Smaller image | multi-stage build; copy `$DENO_DIR` into the runtime stage | `docs/rt_runtime__reference__docker.md:43-74` |
| Available tags | `latest`, `alpine`, `distroless`, `ubuntu`, `2.x` | `docs/rt_runtime__reference__docker.md:124-133` |
| Runtime env | `DENO_DIR`, `DENO_INSTALL_ROOT`, `DENO_NO_UPDATE_CHECK`, `DENO_NO_PROMPT` | `docs/rt_runtime__reference__docker.md:135-147` |
| Least privilege | explicit `--allow-net=host`, `--allow-read=/data` in `CMD` | `docs/rt_runtime__reference__docker.md:76-82` |

Without copying `$DENO_DIR`, the runtime stage re-downloads dependencies on first run (`docs/rt_runtime__reference__docker.md:72-74`).

## Editors and the language server

Deno ships a language server started with `deno lsp`; it provides a Deno-specific view of code and exposes workspace settings such as `deno.enable`, `deno.config`, `deno.importMap` and `deno.lint` (`docs/rt_runtime__reference__lsp_integration.md:21-43`, `:45-63`). VS Code setup installs the Denoland extension and runs `Deno: Initialize Workspace Configuration`, producing the following file (`docs/rt_runtime__getting_started__setup_your_environment.md:21-42`):
```json
{
  "deno.enable": true
}
```

| Editor | Integration route | Evidence |
|---|---|---|
| JetBrains | official Deno plugin; set Preferred Runtime to Deno | `docs/rt_runtime__getting_started__setup_your_environment.md:48-62` |
| Neovim 0.11+ | built-in client with `nvim-lspconfig`; distinct `root_markers` | `docs/rt_runtime__getting_started__setup_your_environment.md:64-95` |
| Helix | built-in LSP; `languages.toml` with `command = "deno"`, `args = ["lsp"]` | `docs/rt_runtime__getting_started__setup_your_environment.md:163-188` |
| Emacs | `lsp-mode` or `eglot` with a Deno server class | `docs/rt_runtime__getting_started__setup_your_environment.md:190-231` |
| Sublime / Kakoune / Zed | LSP package, `kak-lsp`, or Deno extension | `docs/rt_runtime__getting_started__setup_your_environment.md:233-286` |
| GitHub Codespaces | add a devcontainer definition, then rebuild | `docs/rt_runtime__getting_started__setup_your_environment.md:297-310` |

Keeping `ts_ls` and `denols` on separate root markers prevents both servers attaching to the same buffer; `ts_ls` skips projects with `deno.json`, `deno.jsonc` or `deno.lock` in recent nvim-lspconfig (`docs/rt_runtime__getting_started__setup_your_environment.md:70-95`).

## Sources

- https://docs.deno.com/runtime/reference/cli/
- https://docs.deno.com/runtime/reference/cli/run/
- https://docs.deno.com/runtime/reference/cli/eval/
- https://docs.deno.com/runtime/reference/continuous_integration/
- https://docs.deno.com/runtime/reference/cli/ci/
- https://docs.deno.com/runtime/reference/docker/
- https://docs.deno.com/runtime/reference/lsp_integration/
- https://docs.deno.com/runtime/getting_started/setup_your_environment/
- https://github.com/denoland/setup-deno
