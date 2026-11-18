# 25 — Decisions and pitfalls

This chapter states the trade-offs behind the dossier's recommendations and names concrete
anti-patterns. Facts are pinned to Podman v6.2.0 (commit `055de046`); behavior on other
releases must be re-checked. Each decision row is traceable to a source token; "consequence"
rows describe what actually breaks.

## 1. Isolation posture

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| Rootless vs rootful | Default for all workloads; no daemon, user-owned storage | Binding ports <1024, cgroups-v1 resource limits, kernel features needing real root (e.g. RDT) | Rootless needs subuid/subgid ranges, pasta, cgroups v2; rootful relaxes isolation | `samples/rootless_tutorial.md:19-34`, `pages/markdown/podman-run.1.md:994` |
| `keep-id` vs `nomap` | Host UID must own bind-mount files; desktop/dev workflows | Service runs as container root with no host-UID leakage | `keep-id` maps `$UID`→same UID in container and overrides image `USER`; `nomap` excludes the host UID and is rootless-only | `pages/markdown/podman-run.1.md:1489-1497`, `:1515-1521` |
| `auto` vs fixed userns | Many tenants needing disjoint UID ranges | Reproducible single-service mapping | `auto` may saturate IDs; `size=` bounds it; incompatible with running `nomap`/`keep-id` containers lacking a size | `pages/markdown/podman-run.1.md:1499-1508` |
| Machine vs native Linux | macOS/Windows hosts: installer + VM/WSL2 required | Linux hosts: native daemonless engine | Machine is a remote client over a socket; Homebrew install is explicitly not recommended | `pages/installation.md:40-69` |

Rootless readiness is administrative, not a flag: unique `/etc/subuid`/`/etc/subgid` ranges
per user (overlap allows namespace corruption) and `podman system migrate` after changes
(`samples/rootless_tutorial.md:32-59`). Rootless networking is pasta in v5+; container↔host
communication changed in 5.3
(`samples/rootless_tutorial.md:21-28`). Note `--userns=nomap` is rejected for root-created
containers and `--userns=""` is an alias for `host`
(`pages/markdown/podman-run.1.md:1477`, `:1521`).

## 2. Storage and labeling

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| Bind mount vs named volume | Host config/source needs live visibility, dev loops | Persistent application data, portable across hosts | Binds depend on host paths and SELinux labels; volumes are managed by `podman volume` with driver/opts | `pages/markdown/podman-volume-create.1.md:6-34`, `pages/markdown/podman-run.1.md:1600-1612` |
| `:z` vs `:Z` | Two or more containers read/write the same content | Single container needs exclusive private label | `:z` = shared label; `:Z` = private unshared label; relabel walks every inode | `pages/markdown/podman-run.1.md:1605-1612` |
| Overlay `:O` vs plain bind | Container may mutate a read-only host directory without writing back | Normal bidirectional mount needed | `:O` stores changes in container storage, discarding on removal | `pages/markdown/podman-run.1.md:1629-1633` |
| Secret vs env var | Any credential | Non-sensitive configuration only | `--secret` supports file/env targets with `uid`/`mode`; `-e` leaks via `inspect` and process listing | `pages/markdown/podman-run.1.md:1100-1132` |

Do not relabel system directories: it can break other confined services; the documented
escape is `--security-opt label=disable`, which is an explicit trust decision
(`pages/markdown/podman-run.1.md:1622-1628`). All containers in a pod share one SELinux
label, so a `:Z` mount is effectively shared across the pod
(`pages/markdown/podman-run.1.md:1613-1615`).

## 3. Observability

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| `journald` vs `k8s-file` | systemd hosts, structured queries, `tag`/`label` options | Standalone file shipping, remote clients, simple tail | `journald` is the default; `k8s-file` (`json-file` alias) requires rotation tuning; `tag`/`label` are journald-only | `pages/markdown/podman-run.1.md:586-619` |
| `none`/`passthrough` vs drivers | Interactive debug or deliberate log suppression | Production retention | `passthrough` is blocked on remote clients and TTYs (TIOCSTI); `none` loses diagnostics | `pages/markdown/podman-run.1.md:591-594` |
| `events_logger` `journald` vs `file` vs `none` | Auditability and querying | Minimal overhead / deliberately silent | Backend is a global choice via `--events-backend` or `containers.conf` | `pages/markdown/podman.1.md:37-40` |
| Health log `local` vs `events_logger` vs directory | Default per-container state | Central collection / retention | Defaults are 5 entries and 500 chars; `0` means unlimited — avoid in prod | `pages/markdown/podman-run.1.md:426-434` |

Log rotation is opt-in behavior with a default of one backup file when `max-file` is absent;
`max-size` alone enables rotation under conmon ≥2.2.0
(`pages/markdown/podman-run.1.md:595-610`). Verify the active driver with
`podman info --format '{{ .Host.LogDriver }}'` (`pages/markdown/podman-run.1.md:588-590`).
The event stream is filtered and formatted for audits
(`pages/markdown/podman-events.1.md:85-109`, `pages/markdown/podman-events.1.md:198-209`).

## 4. Orchestration

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| `podman compose` vs `kube play` vs Quadlet | Existing Compose YAML / multi-container dev | Kubernetes YAML for portability, or systemd-managed services for host integration | Compose is not native: a provider is executed and pinned externally; kube and Quadlet are Podman-native declarative state | `pages/markdown/podman-compose.1.md:6-9`, `pages/markdown/podman-kube-play.1.md:9`, `pages/markdown/podman.1.md:16-19` |
| `kube play` vs `kube apply` | Recreate a workload from the same YAML | Incremental changes to an existing deployment | `--replace` tears down and recreates pods from the YAML | `pages/markdown/podman-kube-play.1.md:9`, `:307` |
| Quadlet paths: user vs system | Per-user rootless services | Boot-time, system-wide services | `~/.config/containers/systemd` vs `/etc/containers/systemd`; Quadlet units are generated, not enabled directly | `samples/podman-quadlet-basic-usage.7.md:36-42`, `:59-60` |
| `--restart` vs systemd `Restart=` | Plain detached container with no unit | Any container inside a systemd unit | Mixing them creates two restart authorities; health `restart` action also conflicts | `pages/markdown/podman-run.1.md:1039-1051`, `:435-439` |

`podman compose` chooses `docker-compose` over `podman-compose` when both exist; pin
`compose_providers` in `containers.conf` or set `PODMAN_COMPOSE_PROVIDER`, and silence the
external-command warning with `compose_warning_logs=false` in CI
(`pages/markdown/podman-compose.1.md:7-9`). Quadlet `[Container]` keys map directly to
`podman run` flags (`AddCapability`→`--cap-add`, `AutoUpdate=registry`→label), so a Quadlet
file is the reviewable form of the same command line
(`samples/podman-container.unit.5.md.in:33-50`).

## 5. Build and supply chain

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| `--layers` vs `--squash` / `--squash-all` | Cache reuse, `--cache-from`/`--cache-to`, fast rebuilds | Small final image, hiding intermediate content | Layers keep cache and provenance; squash reduces size but discards layer reuse | `pages/markdown/podman-build.1.md:511`, `:881-886`, `:131-140` |
| `--pull=always` vs `--pull=never` | Controlled refresh job that verifies the new digest | Production deploy of an already-verified digest | `always` fails hard on pull error; `never` fails if the image is absent locally | `pages/markdown/podman-run.1.md:985-990` |
| `signedBy` vs `sigstoreSigned` | Existing GPG/PKI key distribution, `keyType=GPGKeys` | Keyless/OIDC workflow | Both are `policy.json` trust types requiring `--pubkeysfile`; `accept`/`reject` are allow/deny only | `pages/markdown/podman-image-trust.1.md:22-25`, `:33-34` |

Source: `pages/markdown/podman-image-trust.1.md:22-25`
```text
Allowlist (“accept”) or
Denylist (“reject”) registries or
Require a simple signing signature (“signedBy”),
Require a sigstore signature (“sigstoreSigned”).
```

Source: `pages/markdown/podman-build.1.md:881-884`
```text
--squash
Squash all of the image’s new layers into a single new layer; any preexisting layers are not squashed.
--squash-all
Squash all of the new image’s layers (including those inherited from a base image) into a single new layer.
```

For bit-stable builds set `--timestamp` (and/or `--source-date-epoch`, which conflicts) and
avoid cache when exactness matters (`pages/markdown/podman-build.1.md:909-912`, `:814-830`,
`:599`). Add an SBOM with `--sbom=<preset>` plus an output flag
(`pages/markdown/podman-build.1.md:705-720`). Trust scopes are most-specific-first and the
shipped `policy.json` defaults to `insecureAcceptAnything`, so a production policy must
replace it (`pages/markdown/podman-image-trust.1.md:10-20`, `samples/policy.json:1-6`).

## 6. Network and API

| Decision | Prefer A when | Prefer B when | Trade-off | Source |
|---|---|---|---|---|
| Netavark vs CNI | All v6 deployments | — (no choice in v6) | `network_backend` only supports `netavark`; firewall driver defaults to auto (`nftables`/`firewalld`/`none`) | `samples/containers.conf:355-371` |
| Unix socket vs TCP API | Local clients, socket activation, default | Remote orchestrators that need network reach | `unix://` default paths are root/rootless-specific; `tcp://` is unencrypted and unauthenticated; `ssh://` is the other default schema | `pages/markdown/podman.1.md:134-160`, `pages/markdown/podman-system-service.1.md:6-26` |
| Static IP vs DHCP-like | Fixed network objects and stable DNS | Ephemeral dev containers | `--subnet`/`--gateway` must be consistent in order | `pages/markdown/podman-network-create.1.md:38-65` |

The API service supports systemd socket activation with `--time` inactivity shutdown
(`pages/markdown/podman-system-service.1.md:13-26`). `CONTAINER_HOST` resolution is CLI →
env var → `containers.conf` → default socket, and setting it flips `--remote` to true
(`pages/markdown/podman.1.md:134-160`). In v6, treat CNI as a removed option: a config that
sets `network_backend = "cni"` is not a supported setup.

## 7. Anti-patterns and consequences

| # | Anti-pattern | Concrete consequence | Source |
|---|---|---|---|
| 1 | `:latest` or untagged production image | A rebuild silently changes the digest; `--pull=never` then errors or runs a different binary | `pages/markdown/podman-pull.1.md:9`, `:985-990` |
| 2 | `--pull=always` in a deploy step | Registry outage blocks deployment even with a valid local image | `pages/markdown/podman-run.1.md:987`, `:985-990` |
| 3 | `--health-on-failure=restart` plus `--restart=always` | Unsupported combination; ambiguous restart authority | `pages/markdown/podman-run.1.md:435-439` |
| 4 | Defaults-only logging | Unbounded log growth; no `max-file` means just one backup | `pages/markdown/podman-run.1.md:595-610` |
| 5 | Passing credentials via `-e` | Values visible in `inspect`, `ps`, and process environment | `pages/markdown/podman-run.1.md:1100-1132` |
| 6 | `--privileged` "to make it work" | Turns off isolation features; dropped capabilities and device limits no longer apply | `pages/markdown/podman-run.1.md:920-929` |
| 7 | `seccomp=unconfined` or `label=disable` as defaults | Explicit trust escapes become the baseline, not exceptions | `pages/markdown/podman-run.1.md:1142`, `:1147`, `:1625` |
| 8 | `:Z` on a huge host tree | Relabel walk over thousands of inodes delays start | `pages/markdown/podman-run.1.md:1613-1621` |
| 9 | Relabeling system directories | Other confined services on the host fail | `pages/markdown/podman-run.1.md:1622-1625` |
| 10 | `keep-id` without `--user` | Image `USER` is overridden; file ownership surprises | `pages/markdown/podman-run.1.md:1515-1516` |
| 11 | Overlapping subuid ranges between users | One user can use another's namespace and corrupt it | `samples/rootless_tutorial.md:32-34` |
| 12 | `--root`/`--storage-driver` without re-passing `--storage-opt` | Configured driver options are silently cleared | `pages/markdown/podman.1.md:78-86`, `:99-104` |
| 13 | Unpinned `podman compose` provider | `docker-compose` chosen over `podman-compose` depending on host install order | `pages/markdown/podman-compose.1.md:6-9` |
| 14 | `network_backend = "cni"` in v6 config | Unsupported backend; no valid v6 configuration | `samples/containers.conf:355-359` |
| 15 | Exposing `tcp://0.0.0.0:PORT` API | Unencrypted, unauthenticated remote control of the engine | `pages/markdown/podman.1.md:134-142` |
| 16 | Auto-update without `SDNOTIFY` | Failed container can be reported as a successful unit restart; `--rollback` won't trigger correctly | `pages/markdown/podman-auto-update.1.md:116-122` |

## Pitfalls

- "Rootless" is not automatic: without subuid/subgid and cgroups v2, resource limits and namespace features fail.
- `nomap` is invalid for root-created containers; `auto` conflicts with unbounded `keep-id`/`nomap` containers.
- Pod-wide SELinux labels make `:Z` sharing effective across the whole pod, not just one container.
- `passthrough` logging is unusable over remote clients and on TTYs.
- Health-log limits of `0` mean unlimited — a slow leak, not a disable.
- Squashing hides intermediate layers and removes layer cache reuse; it is not a security boundary.
- `podman info --format '{{ .Host.LogDriver }}'` reflects the host default, not necessarily a container's `--log-driver`.

## Sources

- `samples/rootless_tutorial.md:19-59`, `:112-118`; `pages/installation.md:40-69`
- `pages/markdown/podman.1.md:14-20`, `:37-40`, `:78-86`, `:99-104`, `:134-160`; `pages/markdown/podman-run.1.md:994`
- `pages/markdown/podman-run.1.md:131`, `:230-236`, `:416-443`, `:586-619`, `:899-901`, `:1039-1051`, `:1100-1147`, `:1489-1521`, `:1600-1633`, `:985-990` — https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `pages/markdown/podman-volume-create.1.md:6-34`; `pages/markdown/podman-secret.1.md:5-18`; `pages/markdown/podman-network-create.1.md:38-65`
- `pages/markdown/podman-events.1.md:85-109`, `:147-151`, `:198-209`; `pages/markdown/podman-healthcheck.1.md:25-28`
- `pages/markdown/podman-compose.1.md:6-9`; `pages/markdown/podman-kube-play.1.md:9`, `:307`; `samples/podman-container.unit.5.md.in:33-50`; `samples/podman-quadlet-basic-usage.7.md:36-60`
- `pages/markdown/podman-build.1.md:511`, `:599`, `:705-720`, `:814-830`, `:881-884`, `:909-912`; `pages/markdown/podman-image-trust.1.md:10-46`; `samples/policy.json:1-6`
- `samples/containers.conf:355-371`; `pages/markdown/podman-system-service.1.md:6-26`; `pages/markdown/podman-auto-update.1.md:7-10`, `:116-122`; `pages/markdown/podman-pull.1.md:9`
