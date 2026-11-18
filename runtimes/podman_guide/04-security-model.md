# 04 — Security model

## 1. Isolation boundary: threat model

Podman is daemonless and rootless-first: most commands run as a regular user without extra
privileges (source: `pages/markdown/podman.1.md:9-10`). There is no always-on privileged daemon
to compromise, but there is also **no guest kernel** — every container shares the host kernel.
Confinement is applied with namespaces, capabilities, seccomp and MAC, not a VM boundary
(source: `pages/markdown/podman-run.1.md:1133-1148`).

| Dimension | Rootless | Rootful | Src |
|---|---|---|---|
| Host identity | `$UID` inside a user namespace from `/etc/subuid`/`/etc/subgid` | UID 0 unless `--userns` set | `pages/markdown/podman.1.md:374-377` |
| Visibility | Only the creating user sees its containers; root does not | Root sees all rootful containers | `pages/markdown/podman.1.md:375-377` |
| Ceiling | Cannot exceed the launching user's privileges, even with `--privileged` | Can approach full host control if isolation flags are removed | `samples/containers.conf:290-291` |
| Network | `pasta` required for a NetworkManager-independent device; else host netns | bridge + netavark firewall rules | `pages/markdown/podman.1.md:387-389`; `samples/containers.conf:356-375` |
| Kernel | Shared host kernel in both modes (`derived`) | Shared host kernel in both modes (`derived`) | `pages/markdown/podman-run.1.md:121-127,920-932` |

Practical threat model: trust is minimized by **subtraction** — start from the default set and
remove capabilities, syscalls, writable paths and MAC exceptions. Rootless limits blast radius
to one UID; rootful relies entirely on the confinement flags below. Administrative readiness
(non-overlapping subuid/subgid ranges, cgroups v2, `podman system migrate`) is a prerequisite,
not a hardening feature (source: `pages/markdown/podman.1.md:377-385`).

## 2. Capabilities: drop first, add selectively

The engine default set is 11 capabilities (`derived` count from the sample):

| Capability | Capability | Capability | Src |
|---|---|---|---|
| `CHOWN` | `DAC_OVERRIDE` | `FOWNER` | `samples/containers.conf:72-84` |
| `FSETID` | `KILL` | `NET_BIND_SERVICE` | `samples/containers.conf:72-84` |
| `SETFCAP` | `SETGID` | `SETPCAP` | `samples/containers.conf:72-84` |
| `SETUID` | `SYS_CHROOT` | — | `samples/containers.conf:72-84` |

`--cap-drop=ALL` removes every capability; `--cap-drop` accepts a space-separated list
(source: `pages/markdown/podman-run.1.md:131-133`). `--cap-add` grants more and explicitly
warns that `CAP_SYS_ADMIN`, `CAP_SYS_PTRACE`, `CAP_MKNOD` and `CAP_SYS_MODULE` are especially
dangerous **outside a user namespace** (source: `pages/markdown/podman-run.1.md:119-130`).
The effective set is observable via `podman info` under `host.security.capabilities`
(source: `pages/markdown/podman-info.1.md:103-105`).

Baseline pattern: `--cap-drop=ALL --cap-add=NET_BIND_SERVICE` — bind low ports without
`DAC_OVERRIDE`/`SETUID`. Adding `SYS_ADMIN` effectively re-broadens the container and should be
treated as an escape, not a flag.

## 3. `no-new-privileges`, seccomp and image-supplied profiles

Source: `pages/markdown/podman-run.1.md:1146-1148`
```text
no-new-privileges: Disable container processes from gaining additional privileges through the execve(2) system call (e.g. via setuid or setgid bits, or via file capabilities). Programs that rely on setuid/setgid bits set on their executable to change user id or group id are no longer able to do so, and any file capabilities added to the executable (e.g. via setcap) are not added to the permitted capability set. For more details, see: https://docs.kernel.org/userspace-api/no_new_privs.html.
seccomp=unconfined: Turn off seccomp confinement for the container.
seccomp=profile.json: JSON file to be used as a seccomp filter. Note that the io.podman.annotations.seccomp annotation is set with the specified value as shown in podman inspect.
```

| Mechanism | Default / value | Threat addressed | Src |
|---|---|---|---|
| `no-new-privileges` | off | setuid/setgid and file-capability escalation across `execve(2)` | `pages/markdown/podman-run.1.md:1146` |
| Default seccomp profile | `/usr/share/containers/seccomp.json` | syscall surface filtered for all containers | `samples/containers.conf:299-302` |
| `seccomp=unconfined` | opt-in | **removes** syscall filtering (trust escape) | `pages/markdown/podman-run.1.md:1147` |
| `seccomp=<profile.json>` | opt-in | custom syscall allow-list; annotation recorded in inspect | `pages/markdown/podman-run.1.md:1148` |
| `--seccomp-policy=image` | experimental; default policy otherwise | image-author-supplied profile via `io.containers.seccomp.profile` label | `pages/markdown/podman-run.1.md:1097-1099` |
| Masked paths (default) | `/proc/kcore`, `/proc/keys`, `/sys/firmware`, … | hide host kernel/firmware state | `pages/markdown/podman-run.1.md:1151-1152` |

`--seccomp-policy=image` is explicitly experimental: it trusts a label inside the image to
select the filter, so only use it with images whose provenance is verified. `seccomp=unconfined`
and `--security-opt unmask=ALL` are the opposite direction and negate this layer
(source: `pages/markdown/podman-run.1.md:1147,1151-1152`).

## 4. MAC: SELinux and AppArmor

SELinux labelling is on by default (`label=true`), with confined users disabled
(`label_users=false`) (source: `samples/containers.conf:203-213`). AppArmor's default profile
name is `container-default` and can be changed engine-wide (source:
`samples/containers.conf:26-28`).

| Option | Effect | Threat / cost | Src |
|---|---|---|---|
| `-v HOST:DIR:Z` | private unshared MCS label; only this container reads/writes | strong isolation; relabels every inode once | `pages/markdown/podman-run.1.md:1600-1612` |
| `-v HOST:DIR:z` | shared content label; multiple containers read/write | shares data; weaker separation, cheaper relabel | `pages/markdown/podman-run.1.md:1607-1610` |
| `:Z` inside a pod | all pod containers share one label | a pod-wide `:Z` is effectively shared across the pod | `pages/markdown/podman-run.1.md:1613-1615` |
| `--security-opt label=disable` | turn off SELinux separation | needed for `$HOME`/system dirs; loses MAC confinement | `pages/markdown/podman-run.1.md:1142,1622-1628` |
| `apparmor=unconfined` | turn off AppArmor | trust escape; opt-in only | `pages/markdown/podman-run.1.md:1135` |
| `apparmor=<profile>` | select alternate profile | per-workload MAC policy | `pages/markdown/podman-run.1.md:1136` |
| `label=level:type:role:user` | set MCS/MLS and SELinux fields | fine-grained multi-level policy | `pages/markdown/podman-run.1.md:1137-1141` |

Relabel cost is proportional to inode count and can delay start; if a volume was labelled with
`:z` it is not relabelled again, and moved files need `chcon -Rt container_file_t PATH`
(source: `pages/markdown/podman-run.1.md:1616-1621`). Never relabel system directories — disable
labelling for those mounts instead (source: `pages/markdown/podman-run.1.md:1622-1625`).

## 5. Read-only rootfs, privileged escape hatch, devices and CDI

Source: `samples/containers.conf:283-288`
```ini
# Give extended privileges to all containers. A privileged container turns off
# the security features that isolate the container from the host. Dropped
# Capabilities, limited devices, read-only mount points, Apparmor/SELinux
# separation, and Seccomp filters are all disabled. Due to the disabled
# security features the privileged field should almost never be set as
# containers can easily break out of confinment.
```

| Flag | Default | Effect | Src |
|---|---|---|---|
| `--read-only` | `false` | mount container rootfs read-only | `pages/markdown/podman-run.1.md:995-999` |
| `--read-only-tmpfs` | `true` | with `--read-only`, RW tmpfs on `/dev`, `/dev/shm`, `/run`, `/tmp`, `/var/tmp` | `pages/markdown/podman-run.1.md:1000-1001` |
| `--read-only --read-only-tmpfs=false` | opt-in | no writable directory at all; add volumes explicitly | `pages/markdown/podman-run.1.md:1025-1031` |
| `--privileged` | `false` | disables dropped caps, device limits, RO mounts, AppArmor/SELinux, seccomp | `pages/markdown/podman-run.1.md:920-932` |
| `--device HOST:CONT:PERM` | default devices only | `PERM` = `r`/`w`/`m` (mknod); narrow to minimal rights | `pages/markdown/podman-run.1.md:278-284` |
| rootless `--device` | bind mount | label retained → may need `setsebool -P container_use_devices=true` | `pages/markdown/podman-run.1.md:290-295` |
| `--group-add keep-groups` | off | pass supplementary groups for group-only device access | `pages/markdown/podman-run.1.md:296-298` |
| CDI spec dirs | `/etc/cdi`, `/var/run/cdi` | declare devices by name; `--cdi-spec-dir` / `engine.cdi_spec_dirs` | `pages/markdown/podman.1.md:21-24` |

`--privileged` is an explicit escape hatch, not a hardening setting; even it cannot grant a
rootless container more privilege than its launching user
(source: `pages/markdown/podman-run.1.md:933-934`). GPU access via `--gpus` resolves devices
through CDI, which keeps device declarations in auditable spec files rather than ad-hoc
`--device` flags (source: `pages/markdown/podman-run.1.md:396`).

## 6. User namespaces and secrets vs env vars

Source: `pages/markdown/podman-run.1.md:1472-1477`
```text
If --userns is not set, the default value is determined as follows.
If --pod is set, --userns is ignored and the user namespace of the pod is used.
If the environment variable PODMAN_USERNS is set its value is used.
If userns is specified in containers.conf this value is used.
Otherwise, --userns=host is assumed.
--userns="" (i.e., an empty string) is an alias for --userns=host.
```

| Rootless mode | Host UID | Container UID | Source |
|---|---|---|---|
| `auto` | `$UID` | unmapped (`nil`) | `pages/markdown/podman-run.1.md:1479-1485` |
| `host` (default) | `$UID` | `0` | `pages/markdown/podman-run.1.md:1486-1488` |
| `keep-id` | `$UID` | `$UID` | `pages/markdown/podman-run.1.md:1489-1491` |
| `nomap` | `$UID` | unmapped (`nil`) | `pages/markdown/podman-run.1.md:1495-1497` |

`keep-id` maps the current `UID:GID` to the same values inside and uses the full subuid/subgid
range; `nomap` excludes the user's own ID (source: `pages/markdown/podman-run.1.md:1503-1504`).
Rootful `auto` needs a `containers` entry in `/etc/subuid`/`/etc/subgid`
(source: `pages/markdown/podman-run.1.md:1500`).

Secrets are blobs up to 512 kB kept outside the image and source control; `type=mount` (default)
writes a file at `/run/secrets/<name>` with `mode=0444`, `uid=0`, `gid=0`, while `type=env`
injects a variable (source: `pages/markdown/podman-run.1.md:1100-1125`). Prefer `type=mount`:
environment variables are visible via inspect and process listings, whereas a mounted file can
be permission-scoped; both are managed through `podman secret` (source:
`pages/markdown/podman-run.1.md:1109`). Note secrets are re-read at container creation time —
updating a secret after creation changes it inside the container
(source: `pages/markdown/podman-run.1.md:1107-1108`). By default host env is not passed in
(`env_host=false`) but proxy variables are (`http_proxy=true`), which can leak host proxy
settings (source: `samples/containers.conf:136-138,162-169`).

## 7. Audit and telemetry hooks

| Hook | Default | Use | Src |
|---|---|---|---|
| `events_logger` | `journald` | file/journald/none event backend in containers.conf | `samples/containers.conf:562-565` |
| `--events-backend` | from config | per-invocation `file|journald|none` override | `pages/markdown/podman.1.md:37-40` |
| `events_logfile_path` / `_max_size` | auto / `1m` | file-backend location and rotation | `samples/containers.conf:550-560` |
| `events_container_create_inspect_data` | `false` | full inspect JSON in create event | `samples/containers.conf:567-569` |
| `healthcheck_events` | `true` | emit an event per healthcheck run | `samples/containers.conf:583-590` |
| journald fields | `PODMAN_EVENT`, `PODMAN_TYPE`, `PODMAN_ID`, `PODMAN_NAME`, `PODMAN_TIME`, `SYSLOG_IDENTIFIER=podman` | filter with `journalctl` | `pages/markdown/podman-events.1.md:156-170` |

Enable `events_container_create_inspect_data=true` for change auditing: the create event then
carries the full `podman inspect` payload under journald field `PODMAN_CONTAINER_INSPECT_DATA`
(source: `pages/markdown/podman-events.1.md:83`). Query with `podman events --filter` and
`--since`/`--until`; note `none` disables events entirely and breaks this audit trail
(source: `pages/markdown/podman-events.1.md:85-108,147-154`).

## 8. Hardening baseline matrix

| Flag / setting | Threat reduced | Cost / caveat | Src |
|---|---|---|---|
| `--cap-drop=ALL` + selective `--cap-add` | privilege escalation via default caps | breaks chown/setuid workloads; add back minimum | `pages/markdown/podman-run.1.md:119-133` |
| `--security-opt=no-new-privileges` | setuid/file-cap escalation | setuid binaries stop working | `pages/markdown/podman-run.1.md:1146` |
| default seccomp profile | syscall abuse | custom syscalls need a profile | `samples/containers.conf:299-302` |
| `--read-only --read-only-tmpfs` | filesystem tampering and persistence | writable paths must be volumes/tmpfs | `pages/markdown/podman-run.1.md:995-1031` |
| `:Z` (or `:z` when shared) | cross-container data access | inode relabel cost at start | `pages/markdown/podman-run.1.md:1600-1621` |
| `--userns=keep-id`/`auto` | root-in-container equals host root | subuid/subgid planning | `pages/markdown/podman-run.1.md:1479-1508` |
| `--secret` instead of `-e` | credential leakage via env/inspect | secret lifecycle management | `pages/markdown/podman-run.1.md:1100-1125` |
| `--device ...:rw` minimal + CDI | broad device access | rootless label/group tuning | `pages/markdown/podman-run.1.md:278-298` |
| `events_logger=journald` + inspect data | missing audit trail | journald volume growth | `samples/containers.conf:550-569` |
| `--privileged` | **none — it removes the above** | near-host access; avoid | `pages/markdown/podman-run.1.md:920-934` |

## Pitfalls

- `--privileged`, `seccomp=unconfined`, `apparmor=unconfined` and `label=disable` each remove a
  whole confinement layer; stacking them is effectively host access (source:
  `pages/markdown/podman-run.1.md:920-932,1135-1147`).
- `:Z` on a volume with many inodes can massively delay container start; `:z` on the same volume
  avoids a second relabel (source: `pages/markdown/podman-run.1.md:1616-1620`).
- Rootless `--privileged` does not escape the user's privilege ceiling — do not assume it grants
  host root (source: `samples/containers.conf:290-291`).
- Rootful containers share the host kernel with the host; capability and seccomp drops reduce
  attack surface but are not a VM-grade boundary (source: `pages/markdown/podman-run.1.md:121-127`).
- Proxy env vars leak into containers by default (`http_proxy=true`); disable when a container
  must not inherit host proxy settings (source: `samples/containers.conf:162-169`).

## Sources

- `pages/markdown/podman.1.md:9-10`, `:21-24`, `:37-40`, `:387-389`, `:374-385`
- `pages/markdown/podman-run.1.md:119-133`, `:278-298`, `:396`, `:920-934`, `:995-1031`, `:1097-1148`, `:1151-1152`, `:1470-1508`, `:1600-1628`
- `pages/markdown/podman-info.1.md:103-105`
- `pages/markdown/podman-events.1.md:83`, `:85-108`, `:147-154`, `:156-170`
- `samples/containers.conf:26-28`, `:72-84`, `:136-138`, `:162-169`, `:203-213`, `:283-302`, `:299-302`, `:550-569`, `:583-590`
- https://docs.podman.io/en/latest/markdown/podman-run.1.html
