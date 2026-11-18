# 02 - Installation and usability

Deno 2.9.3 installs as a single binary with no external dependencies, on macOS, Linux and Windows for both x64 and arm64 (`docs/rt_runtime__getting_started__installation.md:11-12`). This chapter records the documented install channels, the default paths they create, and the three daily-driver surfaces: the REPL, tasks, and shell completions.

## Install channels

The convenience scripts come from the `deno_install` repository; the shell form is verbatim (`docs/rt_runtime__getting_started__installation.md:16-17`, `docs/rt_runtime__getting_started__installation.md:24-26`):
```shell
curl -fsSL https://deno.land/install.sh | sh
```

| Channel | Linux | macOS | Windows | Evidence |
|---|---|---|---|---|
| Official script | `curl … install.sh \| sh` | same | `irm … install.ps1 \| iex` | `docs/rt_runtime__getting_started__installation.md:24-26`, `:45-47`, `:82-84` |
| npm | `npm install -g deno` | `npm install -g deno` | `npm install -g deno` | `docs/rt_runtime__getting_started__installation.md:30-32`, `:51-53`, `:88-90` |
| Homebrew / MacPorts | — | `brew`, `sudo port install deno` | — | `docs/rt_runtime__getting_started__installation.md:57-65` |
| Scoop / Chocolatey / Winget | — | — | `scoop`, `choco`, `winget` | `docs/rt_runtime__getting_started__installation.md:94-108` |
| Nix | `nix-shell -p deno` | `nix-shell -p deno` | — | `docs/rt_runtime__getting_started__installation.md:36-38`, `:69-71` |
| asdf / vfox | cross-platform | cross-platform | cross-platform | `docs/rt_runtime__getting_started__installation.md:132-157` |
| Cargo from source | `cargo install deno --locked` | same | same | `docs/rt_runtime__getting_started__installation.md:162-164` |

Caveats: npm installs slow startup, so the official script is recommended (`docs/rt_runtime__getting_started__installation.md:113-119`); there is no official apt repository and distro packages often lag (`:121-126`); Windows needs 10 version 1709 or Server 2016 1709 and up for `IsWow64Process2` (`:76-78`).

## Manual download and verification

Each release ships one archive per platform with a matching `.sha256sum` file (`docs/rt_runtime__getting_started__installation.md:168-183`). The documented Linux sequence is verbatim (`docs/rt_runtime__getting_started__installation.md:189-194`):
```sh
unzip deno-x86_64-unknown-linux-gnu.zip
mkdir -p ~/.local/bin
mv deno ~/.local/bin/
chmod +x ~/.local/bin/deno
# ensure the directory is on your PATH, then verify
deno --version
```

## Where files land

| Item | macOS / Linux | Windows | Override / inspect | Evidence |
|---|---|---|---|---|
| Binary | `$HOME/.deno/bin/deno` | `%USERPROFILE%\.deno\bin\deno.exe` | `DENO_INSTALL` before install | `docs/rt_runtime__getting_started__installation.md:211-220` |
| Cache | `$HOME/.cache/deno` | `%LOCALAPPDATA%\deno` | `DENO_DIR`; inspect with `deno info` | `docs/rt_runtime__getting_started__installation.md:227-238` |

Verification is `deno --version`; `deno help` prints flags and usage (`docs/rt_runtime__getting_started__installation.md:240-246`). If the command is not found, reopen the shell so the updated `PATH` is picked up, or check `npm config get prefix` for npm installs (`:248-262`). Updating uses `deno upgrade`, with a pinned form `deno upgrade --version 2.7.0` (`:264-270`, `:300-304`). Uninstalling clears the cache with `deno clean`, removes `~/.deno`, and deletes the sourced line from the shell rc file (`:306-327`).

## The REPL

The REPL exposes `_` for the last evaluated expression and `_error` for the last thrown error, plus `clear()` and `close()` in the global scope (`docs/rt_runtime__reference__cli__repl.md:11-19`, `:33-40`). The `--eval` example is verbatim (`docs/rt_runtime__reference__cli__repl.md:48-58`):
```sh
deno repl --allow-net --eval 'import { assert } from "jsr:@std/assert@1"'
Deno 1.45.3
exit using ctrl+d, ctrl+c, or close()
> assert(true)
undefined
> assert(false)
Uncaught AssertionError
    at assert (https://jsr.io/@std/assert/1.0.0/assert.ts:21:11)
    at <anonymous>:1:22
```

| REPL capability | Form | Behavior | Evidence |
|---|---|---|---|
| Preload code | `--eval '…'` | runs a snippet before the prompt | `docs/rt_runtime__reference__cli__repl.md:42-46` |
| Preload files | `--eval-file=url,url` | paths or URLs; URLs cached, reloadable | `docs/rt_runtime__reference__cli__repl.md:60-81` |
| Preload order | both flags | `--eval-file` runs before `--eval` | `docs/rt_runtime__reference__cli__repl.md:69-70` |
| Tab completion | `tab` | lists all possible completions | `docs/rt_runtime__reference__cli__repl.md:100-103` |
| History control | `DENO_REPL_HISTORY` | empty value disables history file | `docs/rt_runtime__reference__cli__repl.md:156-164` |

## Tasks as the daily shell

`deno task` is a cross-platform command runner whose definitions live under `tasks` in the config; the documented example is verbatim (`docs/rt_runtime__reference__cli__task.md:16-21`, `docs/rt_runtime__reference__cli__task.md:25-35`):
```jsonc
  "tasks": {
    "data": "deno task collect && deno task analyze",
    "collect": "deno run --allow-read=. --allow-write=. scripts/collect.js",
    "analyze": {
      "description": "Run analysis script",
      "command": "deno run --allow-read=. scripts/analyze.js"
    }
  }
```

| Task feature | Syntax | Observable effect | Evidence |
|---|---|---|---|
| Missing task tolerated | `deno task --if-present build` | exits 0 silently when undefined | `docs/rt_runtime__reference__cli__task.md:38-51` |
| Working directory | config dir; `$INIT_CWD` | relative paths work from anywhere | `docs/rt_runtime__reference__cli__task.md:53-76` |
| Wildcard fan-out | `deno task "build:*"` | runs all matching tasks in parallel | `docs/rt_runtime__reference__cli__task.md:98-125` |
| Dotenv injection | `deno task --env-file start` | variables inherited by task shell | `docs/rt_runtime__reference__cli__task.md:140-154` |
| Dependencies | `dependencies: ["build"]` | prerequisites run in parallel first | `docs/rt_runtime__reference__cli__task.md:156-187` |
| Result caching | `files`, `output`, `env` | skips unchanged tasks | `docs/rt_runtime__reference__cli__task.md:288-317` |

Parallelism defaults to the core count, controlled by `--jobs`/`DENO_JOBS` (`docs/rt_runtime__reference__cli__task.md:189-198`). `package.json` scripts run through the same command, so a Node project needs no `deno.json` (`docs/rt_runtime__fundamentals__configuration.md:21-29`).

## Shell completions

`deno completions <shell>` writes to stdout; supported shells are bash, elvish, fish, powershell and zsh (`docs/rt_runtime__getting_started__setup_your_environment.md:312-323`). The bash form is verbatim (`docs/rt_runtime__getting_started__setup_your_environment.md:328-331`):
```shell
deno completions bash > /usr/local/etc/bash_completion.d/deno.bash
source /usr/local/etc/bash_completion.d/deno.bash
```

`--dynamic` adds project awareness, suggesting `deno.json` task names at `deno task <TAB>`, and is itself unstable (`docs/rt_runtime__getting_started__setup_your_environment.md:405-415`).

## Sources

- https://docs.deno.com/runtime/getting_started/installation/
- https://docs.deno.com/runtime/getting_started/setup_your_environment/
- https://docs.deno.com/runtime/reference/cli/repl/
- https://docs.deno.com/runtime/reference/cli/task/
- https://docs.deno.com/runtime/reference/cli/completions/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://github.com/denoland/deno_install
