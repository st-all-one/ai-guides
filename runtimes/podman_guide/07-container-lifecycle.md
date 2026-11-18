# 07 — Container lifecycle

## 1. State model and the `create` vs `run` boundary

Podman reports these container statuses: `created`, `initialized`, `running`, `stopped`, `paused`, `exited`, `removing`, `stopping`, `unknown` (`pages/markdown/podman-ps.1.md:47-48`). The state machine is flat — not a nested hierarchy — and is stored in libpod's database, not in the OCI runtime.

| Operation | Entry state | Result state | Notes |
|---|---|---|---|
| `podman create` | — | `created` | Writable layer prepared, process never started (`pages/markdown/podman-create.1.md:7-11`) |
| `podman run -d` | — | `running` | create + init + start in one call (`pages/markdown/podman-run.1.md:7-12`) |
| `podman run` (no `-d`) | — | `running` then `exited` | foreground; attach is the default (`pages/markdown/podman-run.1.md:103-108`) |
| `podman init` | `created` | `initialized` | mounts, OCI spec and network prepared, no start (`pages/markdown/podman-init.1.md:9-11`) |
| `podman start` | `created`/`initialized`/`exited` | `running` | `start` and `run` initialize automatically (`pages/markdown/podman-init.1.md:10`) |
| `podman stop` | `running` | `exited` | SIGTERM then SIGKILL after 10 s by default (`pages/markdown/podman-stop.1.md:7-10`) |
| `podman kill` | `running`/`paused` | `exited` | SIGKILL or `--signal` to the main process (`pages/markdown/podman-kill.1.md:7`) |
| `podman pause` / `unpause` | `running` / `paused` | `paused` / `running` | freezer cgroup, no process exit (`pages/markdown/podman-pause.1.md:5-7`) |
| `podman rm` | any | removed | running/paused need `-f` (`pages/markdown/podman-rm.1.md:5-9`, `:66-71`) |

`create` is the deterministic primitive: it prints the ID on stdout and freezes all flags into container config; a later `start` cannot change `--tty`, `--interactive` or most resource settings (`pages/markdown/podman-start.1.md:7-9`). Use `create` when configuration must be staged, audited via `inspect`, or started by a systemd unit; use `run` for ephemeral tasks.

## 2. Transition commands

| Command | Scope selectors | Determinism-relevant behavior |
|---|---|---|
| `start` | `--all`, `--filter`, `--cidfile`, `-a` | attach/interactive cannot override creation-time flags (`pages/markdown/podman-start.1.md:12-19`) |
| `stop` | `--all`, `--filter`, `--cidfile`, `--time`, `--ignore` | paused containers excluded from `--all`; SIGTERM→SIGKILL after `--time` (`pages/markdown/podman-stop.1.md:12-16`) |
| `restart` | `--all`, `--filter`, `--cidfile` | stops running, starts stopped; ignores restart policy effect (`pages/markdown/podman-restart.1.md:7-12`) |
| `kill` | `--all`, `--cidfile`, `--signal` | signal delivered only to PID 1 of the container (`pages/markdown/podman-kill.1.md:7-14`) |
| `wait` | `--condition`, `--interval`, `--ignore`, `--latest` | default condition `stopped`; exit `-1` for non-exit conditions (`pages/markdown/podman-wait.1.md:9-12`, `:21-31`) |
| `pause`/`unpause` | `--all`, `--cidfile`, `--latest` | no ID printed; state-only change (`pages/markdown/podman-pause.1.md:11-16`) |

`wait` conditions include `configured`, `created`, `exited`, `healthy`, `initialized`, `next-exit`, `not-running`, `paused`, `removed`, `removing`, `running`, `stopping`, `unhealthy`; multiple conditions are OR-ed. A never-started container already satisfies `stopped`/`exited`/`not-running` (`pages/markdown/podman-wait.1.md:22-31`). For `--rm` containers, `wait` does **not** wait for full removal; use `--condition=removed` (`pages/markdown/podman-wait.1.md:17-19`). Under `always`/`on-failure`, only the first exit after `wait` starts is observed (`pages/markdown/podman-wait.1.md:13-16`).

## 3. Interaction, inspection and derived state

| Need | Command | Source |
|---|---|---|
| Run in a live container | `podman exec [-it] NAME CMD` | `pages/markdown/podman-exec.1.md:5-6` |
| Non-interactive exec | `podman exec -d` returns an exec-session ID | `pages/markdown/podman-exec.1.md:11-12` |
| Attach to streams | `podman attach` (detach `ctrl-p,ctrl-q`) | `pages/markdown/podman-attach.1.md:5-8` |
| Copy in/out | `podman cp [CTRs:]SRC [CTRs:]DST`, tar via `-` | `pages/markdown/podman-cp.1.md:5-10` |
| Resolve published port | `podman port NAME PRIVATE[/proto]` | `pages/markdown/podman-port.1.md:5-6` |
| Retrieve streams | `podman logs --since/--until/--tail/--timestamps` | `pages/markdown/podman-logs.1.md:20-34` |
| Structured query | `podman inspect --format '{{.State.Status}}' NAME` | `pages/markdown/podman-inspect.1.md:6-9`, `:18-20` |
| Type-safe query | `podman inspect --type container` | `pages/markdown/podman-inspect.1.md:28-30` |
| Filesystem delta | `podman diff` prefixes `A`/`D`/`C` | `pages/markdown/podman-diff.1.md:5-16` |

`inspect` renders a JSON **array** by default; a container name wins over an identically named image (`pages/markdown/podman-inspect.1.md:6-9`). `--size` adds filesystem totals, `--latest` targets the newest container host-wide (`pages/markdown/podman-inspect.1.md:21-27`). `logs` is a batch read — ordering relative to a concurrent `run` is not guaranteed, and a `--rm` container may lose its log file before it is read (`pages/markdown/podman-logs.1.md:5-9`, `:15-16`).

`exec` exit codes follow chroot(1) semantics: `125` Podman error, `126` command not invocable, `127` command not found, otherwise the command's own code (`pages/markdown/podman-exec.1.md:70-84`). Preserve these in CI; do not collapse them to a generic failure.

## 4. Mutation, checkpoints and cloning

- `podman rename NAME NEW` frees the old name and works in any state; a running container may still emit the old name in logs until restarted, and pods cannot be renamed (`pages/markdown/podman-rename.1.md:6-13`).
- `podman update` changes resource limits and healthchecks of an existing container in place (`pages/markdown/podman-update.1.md:5-7`); it is the supported way to tune cgroup values after `create`.
- `podman container checkpoint` freezes processes and can export an archive or produce a **checkpoint image** (`--create-image`) that is pushable to a registry (`pages/markdown/podman-container-checkpoint.1.md:6-8`, `:19-23`). Compression defaults to `zstd` (`pages/markdown/podman-container-checkpoint.1.md:14-18`).
- `podman container restore` reapplies the **complete original security context**, ignoring current `containers.conf`; restore only fully trusted checkpoints and protect them at creation, storage, retrieval and restore (`pages/markdown/podman-container-restore.1.md:6-16`).
- `podman container clone SRC [NAME] [IMAGE]` recreates a container with identical configuration; default clone name is `$ORIGINAL_NAME-clone` (`pages/markdown/podman-container-clone.1.md:6-8`).

## 5. Removal, pruning and scripted cleanup

`podman container prune` removes **stopped, non-pod** containers with `label`, `annotation` and `until` filters; `-f` suppresses the prompt (`pages/markdown/podman-container-prune.1.md:5-7`, `:9-30`). `podman system prune` is broader: unused pods, containers, images, networks, optional volumes (`--volumes`) and build containers (`--build`); `--all` recurses up to 50 iterations and `--external` reclaims unreferenced layers after unclean shutdowns but is incompatible with `--all`/`--filter` (`pages/markdown/podman-system-prune.1.md:7-16`, `:18-32`).

- `podman container checkpoint` freezes processes and can export an archive or produce a **checkpoint image** (`--create-image`) that is pushable to a registry (`pages/markdown/podman-container-checkpoint.1.md:6-8`, `:24-30`). Compression defaults to `zstd` (`pages/markdown/podman-container-checkpoint.1.md:16-23`).
|---|---|---|
| `--cidfile=file` | run/create, start, stop, restart, kill, pause, rm, exec | writes container ID; removed with the container except for `--remote` detached runs — keep a copy for teardown (`pages/markdown/podman-run.1.md:162-164`) |
| `--replace` | run/create | removes an existing container of the same name; idempotent re-deploys, but destroys old state (`pages/markdown/podman-run.1.md:1033-1034`) |
| `--rm` | run | auto-removes container and anonymous volumes on exit; use for one-shot CI jobs (`pages/markdown/podman-run.1.md:1058-1060`) |
| `--rmi` | run | additionally removes image on exit, implies `--rm`; avoid on shared images (`pages/markdown/podman-run.1.md:1061-1063`) |
| `rm --volumes` | rm | removes anonymous volumes only, never named ones (`pages/markdown/podman-rm.1.md:87-89`) |
| `container exists` | standalone | 0 if the named container exists, non-zero otherwise; prefer over parsing `ps` (https://docs.podman.io/en/latest/markdown/podman-container-exists.1.html) |

Idempotent CI job wrapper (derived from the documented flags above):
```bash
CIDFILE="$(mktemp)"
trap 'podman rm -f --ignore --cidfile "$CIDFILE" >/dev/null 2>&1; rm -f "$CIDFILE"' EXIT
podman run -d --cidfile "$CIDFILE" --replace --pull=never \
  --network=ci-net --name ci-job "$IMAGE"
podman wait --condition=stopped "$(cat "$CIDFILE")"
```

For cleanup across a whole CI runner, prefer a label filter over name patterns: `podman container prune -f --filter label=ci-job=true --filter until=24h`, because `until` accepts Go durations and `label!` filters combine with AND in Podman (`pages/markdown/podman-container-prune.1.md:18-30`).

## 6. Exit codes and determinism notes

`podman run` follows chroot(1): `125` Podman-level error, `126` contained command cannot be invoked, `127` command not found, otherwise the command's exit code (`pages/markdown/podman-run.1.md:1747-1763`). `podman exec` mirrors this (`pages/markdown/podman-exec.1.md:70-84`). `podman wait` prints one code per container in argument order, `-1` for conditions other than `stopped`/`exited`/`not-running`/`next-exit`/`removed` (`pages/markdown/podman-wait.1.md:9-12`).

Deterministic lifecycle rules: pin the image by digest and use `--pull=never` so a restart cannot silently change the payload (`pages/markdown/podman-run.1.md:985-990`); freeze config at `create` time and inspect it before `start`; use `--replace` plus a stable name for repeatable deploys; prefer `wait --condition=removed` over sleeps; and never rely on `logs` ordering concurrent with `run`.

## 7. Adjacent process and filesystem utilities

| Command | Purpose | Source |
|---|---|---|
| `podman top` | show container processes with ps-compatible format descriptors | `pages/markdown/podman-top.1.md:2-7` |
| `podman unpause` | resume paused container processes by name or ID | `pages/markdown/podman-unpause.1.md:2-7` |
| `podman mount` / `unmount` | mount/unmount a working container's root filesystem for offline inspection | `pages/markdown/podman-mount.1.md:2-7`, `pages/markdown/podman-unmount.1.md:2-7` |
| `podman generate spec` | export SpecGen JSON from a container or pod for API-driven recreation | `pages/markdown/podman-generate-spec.1.md:2-7` |
| `podman completion` | emit shell completion for bash, zsh, fish or powershell | `pages/markdown/podman-completion.1.md:2-6` |
| `podmansh` | log a user into a Quadlet-defined container shell with only configured volumes and capabilities | `pages/markdown/podmansh.1.md:2-7` |

These are adjacent surfaces rather than lifecycle primitives: `mount` needs a working container,
`generate spec` targets the API rather than the CLI, and `podmansh` is an administrator-defined
login boundary (`pages/markdown/podmansh.1.md:6-7`).

## Pitfalls

- `podman rm` without `-f` refuses running or paused containers; `--time` requires `--force`.
- `wait` does not wait for `--rm` removal unless `--condition=removed`; under a restart policy it sees only the first exit.
- `container restore` re-applies the checkpoint's original security context even if it is weaker than current config.
- `logs` may lose final lines for `--rm` containers; `inspect` returns an array and container names shadow image names.
- `system prune --external` drops default pruning behavior and conflicts with `--all`/`--filter`; `--volumes` can delete data.

## Sources

- https://docs.podman.io/en/latest/markdown/podman-create.1.html — `pages/markdown/podman-create.1.md:7-11`
- https://docs.podman.io/en/latest/markdown/podman-run.1.html — `pages/markdown/podman-run.1.md:7-12`, `:162-164`, `:985-990`, `:1033-1034`, `:1058-1063`, `:1747-1763`
- https://docs.podman.io/en/latest/markdown/podman-start.1.html — `pages/markdown/podman-start.1.md:7-19`
- https://docs.podman.io/en/latest/markdown/podman-stop.1.html — `pages/markdown/podman-stop.1.md:7-16`
- https://docs.podman.io/en/latest/markdown/podman-restart.1.html — `pages/markdown/podman-restart.1.md:7-12`
- https://docs.podman.io/en/latest/markdown/podman-kill.1.html — `pages/markdown/podman-kill.1.md:7-14`
- https://docs.podman.io/en/latest/markdown/podman-wait.1.html — `pages/markdown/podman-wait.1.md:9-31`
- https://docs.podman.io/en/latest/markdown/podman-pause.1.html — `pages/markdown/podman-pause.1.md:5-7`
- https://docs.podman.io/en/latest/markdown/podman-init.1.html — `pages/markdown/podman-init.1.md:9-11`
- https://docs.podman.io/en/latest/markdown/podman-rename.1.html — `pages/markdown/podman-rename.1.md:6-13`
- https://docs.podman.io/en/latest/markdown/podman-update.1.html — `pages/markdown/podman-update.1.md:5-7`
- https://docs.podman.io/en/latest/markdown/podman-diff.1.html — `pages/markdown/podman-diff.1.md:5-16`
- https://docs.podman.io/en/latest/markdown/podman-exec.1.html — `pages/markdown/podman-exec.1.md:5-12`, `:70-84`
- https://docs.podman.io/en/latest/markdown/podman-attach.1.html — `pages/markdown/podman-attach.1.md:5-8`
- https://docs.podman.io/en/latest/markdown/podman-cp.1.html — `pages/markdown/podman-cp.1.md:5-10`
- https://docs.podman.io/en/latest/markdown/podman-port.1.html — `pages/markdown/podman-port.1.md:5-6`
- https://docs.podman.io/en/latest/markdown/podman-logs.1.html — `pages/markdown/podman-logs.1.md:5-16`, `:20-34`
- https://docs.podman.io/en/latest/markdown/podman-inspect.1.html — `pages/markdown/podman-inspect.1.md:6-30`
- https://docs.podman.io/en/latest/markdown/podman-ps.1.html — `pages/markdown/podman-ps.1.md:47-48`
- https://docs.podman.io/en/latest/markdown/podman-rm.1.html — `pages/markdown/podman-rm.1.md:5-9`, `:66-89`
- https://docs.podman.io/en/latest/markdown/podman-container-prune.1.html — `pages/markdown/podman-container-prune.1.md:5-30`
- https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html — `pages/markdown/podman-system-prune.1.md:7-32`
- https://docs.podman.io/en/latest/markdown/podman-container-checkpoint.1.html — `pages/markdown/podman-container-checkpoint.1.md:6-23`
- https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html — `pages/markdown/podman-container-restore.1.md:6-16`
- https://docs.podman.io/en/latest/markdown/podman-container-clone.1.html — `pages/markdown/podman-container-clone.1.md:6-8`
- https://docs.podman.io/en/latest/markdown/podman-container-exists.1.html
