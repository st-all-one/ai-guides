# 12 - runtime-flags

`docker create` shares its option set with `docker run`; `run` performs a create then starts the container (`pages/reference/cli/docker/container/create.md:31-34`). Every flag below is a row in the `docker run` option table, so a single path:line resolves each decision. Values shown as examples must be verified for your image; only the flag existence is cited.

## Decision table by concern

### Identity and name

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--name` | Assign a container name | Stable reference for logs, restart and rollback | `pages/reference/cli/docker/container/run.md:94` |
| `--hostname` | Set container host name | Service needs a deterministic UTS identity | `pages/reference/cli/docker/container/run.md:73` |

### Image pull and platform

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--platform` | Set platform on a multi-platform server | Pin `os/arch/variant` to avoid host-dependent selection | `pages/reference/cli/docker/container/run.md:102` |
| `--pull` | `always`, `missing` (default), or `never` | `never` for air-gapped or pinned digests; `always` to refresh | `pages/reference/cli/docker/container/run.md:106` |

`--pull=missing` uses the cache if present; `always` pulls first; `never` errors when absent (`pages/reference/cli/docker/container/run.md:579-584`).

### Isolation and security

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--user` | Username or UID `[<group|gid>]` | Drop container root at launch | `pages/reference/cli/docker/container/run.md:124` |
| `--cap-drop` | Drop Linux capabilities | Default: drop `ALL`, then add back only what is needed | `pages/reference/cli/docker/container/run.md:34` |
| `--cap-add` | Add Linux capabilities | A specific capability is required; prefer this over `--privileged` | `pages/reference/cli/docker/container/run.md:33` |
| `--security-opt` | Labels, AppArmor, seccomp, no-new-privileges | Enforce MAC, syscall and privilege policy | `pages/reference/cli/docker/container/run.md:112` |
| `--privileged` | Extended privileges | Avoid: not a securely sandboxed process | `pages/reference/cli/docker/container/run.md:103` |
| `--read-only` | Mount root filesystem read-only | App writes only to explicit mounts | `pages/reference/cli/docker/container/run.md:108` |
| `--tmpfs` | Mount a tmpfs directory | Ephemeral writable paths under read-only rootfs | `pages/reference/cli/docker/container/run.md:119` |
| `--userns` | User namespace to use | Isolate container root from host root | `pages/reference/cli/docker/container/run.md:125` |
| `--runtime` | Choose OCI runtime | Select a hardened or alternate runtime | `pages/reference/cli/docker/container/run.md:111` |
| `--group-add` | Join additional groups | Least-privilege supplementary groups | `pages/reference/cli/docker/container/run.md:65` |
| `--device` | Add a host device | Only for explicitly trusted host devices | `pages/reference/cli/docker/container/run.md:50` |

`--privileged` enables all capabilities, disables seccomp and AppArmor, exposes all host devices and makes `/sys` writable (`pages/reference/cli/docker/container/run.md:344-352`); prefer individual `--cap-add` (`pages/reference/cli/docker/container/run.md:364-367`). `--security-opt` accepts `no-new-privileges=true`, a seccomp JSON file, `seccomp=builtin`, and AppArmor profiles (`pages/reference/cli/docker/container/run.md:1471-1476`).

### Resources

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--cpus` | Number of CPUs | Bound CPU share | `pages/reference/cli/docker/container/run.md:45` |
| `--memory` | Memory limit | Bound RSS | `pages/reference/cli/docker/container/run.md:89` |
| `--memory-swap` | Memory plus swap; `-1` is unlimited | Cap or disable swap explicitly | `pages/reference/cli/docker/container/run.md:91` |
| `--pids-limit` | Process limit; `-1` is unlimited | Contain fork bombs | `pages/reference/cli/docker/container/run.md:101` |
| `--ulimit` | Soft and hard limit, e.g. `nofile=1024:1024` | Bound file descriptors and processes | `pages/reference/cli/docker/container/run.md:121` |
| `--oom-score-adj` | Host OOM preference, `-1000` to `1000` | Protect or deprioritize on host OOM | `pages/reference/cli/docker/container/run.md:99` |
| `--cpuset-cpus` | CPU pinning, e.g. `0,1` | NUMA or latency isolation | `pages/reference/cli/docker/container/run.md:46` |

### Networking

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--network` | Attach to a network | Use a segmented network, not the default bridge | `pages/reference/cli/docker/container/run.md:95` |
| `--network-alias` | Network-scoped alias | Stable service discovery name | `pages/reference/cli/docker/container/run.md:96` |
| `--publish` | Publish container port to host | Only required inbound ports | `pages/reference/cli/docker/container/run.md:104` |
| `--dns` | Custom DNS server | Controlled resolver | `pages/reference/cli/docker/container/run.md:56` |
| `--hostname` | Container host name | Deterministic network identity | `pages/reference/cli/docker/container/run.md:73` |
| `--add-host` | Custom host-to-IP mapping | Avoid except for controlled static entries | `pages/reference/cli/docker/container/run.md:28` |

### Lifecycle

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--restart` | Policy (`no` default, `always`, `on-failure`, `unless-stopped`) | Explicit supervisor policy | `pages/reference/cli/docker/container/run.md:109` |
| `--health-cmd` | Health check command | Readiness gating | `pages/reference/cli/docker/container/run.md:66` |
| `--init` | Run an init that forwards signals and reaps processes | Avoid zombie processes as PID 1 | `pages/reference/cli/docker/container/run.md:74` |
| `--stop-signal` | Signal sent on stop | Match application shutdown handler | `pages/reference/cli/docker/container/run.md:115` |
| `--stop-timeout` | Seconds to wait before forced stop | Bounded graceful shutdown | `pages/reference/cli/docker/container/run.md:116` |

### Filesystem and environment

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--mount` | Volume, bind or tmpfs mount | Preferred explicit mount syntax | `pages/reference/cli/docker/container/run.md:93` |
| `-v`, `--volume` | Bind mount a volume | Legacy syntax; `--mount` is recommended | `pages/reference/cli/docker/container/run.md:127` |
| `--workdir` | Working directory | Deterministic relative paths | `pages/reference/cli/docker/container/run.md:130` |
| `--entrypoint` | Override image `ENTRYPOINT` | Wrap or replace launch command | `pages/reference/cli/docker/container/run.md:60` |
| `--env-file` | Read environment variables from a file | Keep secrets out of command line; set file mode | `pages/reference/cli/docker/container/run.md:62` |

### Logging

| Flag | Effect | Choose when | Source |
|---|---|---|---|
| `--log-driver` | Per-container logging driver | Route to the central collector | `pages/reference/cli/docker/container/run.md:86` |
| `--log-opt` | Driver-specific options | Set rotation and size bounds | `pages/reference/cli/docker/container/run.md:87` |

## Composed baseline

The baseline below is `derived`: it combines only flags cited in the tables
above. Substitute concrete values from your image and network inventory before
use. It is written as inline code because it is composed from several sources,
not a verbatim citation block.

- `derived` hardened baseline: `docker run --detach --name app --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges=true --read-only --tmpfs /run --pids-limit 256 --memory 512m --cpus 1 --network app-net --pull never --log-driver json-file --log-opt max-size=10m --stop-signal SIGTERM --stop-timeout 30 --init registry.example.com/app@sha256:<digest>`
- `derived` variant: replace `--cap-drop ALL` with an explicit `--cap-add` list when the process needs a named capability (`pages/reference/cli/docker/container/run.md:33`).

## Sources

- https://docs.docker.com/reference/cli/docker/container/run/
- https://docs.docker.com/reference/cli/docker/container/create/
- https://docs.docker.com/reference/cli/docker/container/update/
- https://docs.docker.com/engine/containers/run/
- https://docs.docker.com/engine/security/seccomp/
- https://docs.docker.com/engine/security/apparmor/
- https://docs.docker.com/engine/security/userns-remap/
- https://docs.docker.com/engine/security/protect-access/
- https://docs.docker.com/engine/logging/configure/
