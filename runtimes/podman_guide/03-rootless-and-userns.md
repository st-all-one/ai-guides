# 03 — Rootless and user namespaces

## 1. Subordinate UID/GID ranges

Rootless Podman needs a range of subordinate IDs for each allowed user, in `/etc/subuid` and `/etc/subgid`. The files come from `shadow-utils` or `newuid`; only root can change them, and ranges must not overlap between users (`samples/rootless_tutorial.md:30-34`).

`samples/rootless_tutorial.md:37-39`
```text
# cat /etc/subuid
johndoe:100000:65536
test:165536:65536
```

The format is `USERNAME:UID:RANGE`; `johndoe` receives UIDs 100000–165535 **plus** the account's normal UID from `/etc/passwd` (`samples/rootless_tutorial.md:41-48`). Starting at 100000 is deliberate: a range covering UIDs used by real accounts would let that user override file permissions in any namespace they create (`samples/rootless_tutorial.md:230`). The `usermod` form is preferred over editing the files by hand:

`samples/rootless_tutorial.md:53-56`
```bash
# usermod --add-subuids 100000-165535 --add-subgids 100000-165535 johndoe
grep johndoe /etc/subuid /etc/subgid
/etc/subuid:johndoe:100000:65536
/etc/subgid:johndoe:100000:65536
```

After changing either file, stop the user's containers, stop the pause process and delete its PID file — or simply run `podman system migrate` as that user (`samples/rootless_tutorial.md:59`, `pages/markdown/podman-system-migrate.1.md:8-17`). Without that step the pause process keeps the old namespace alive and the new ranges are invisible to running containers.

Since shadow-utils 4.9, ranges can come from a pluggable source instead of local files: configure `subid: sss` in `/etc/nsswitch.conf`, with SSSD 2.6.0 adding the IPA provider and 2.12.0 the generic LDAP provider (`samples/rootless_tutorial.md:61`). This changes where ranges are administered, not the non-overlap requirement.

## 2. User namespace modes

Without `--userns`, resolution is: pod namespace if `--pod` is set (flag ignored), then `PODMAN_USERNS`, then `userns` from `containers.conf`, otherwise `host`; an empty string is an alias for `host` (`pages/markdown/podman-run.1.md:1469-1478`). The flag is incompatible with `--gidmap`, `--uidmap`, `--subuidname` and `--subgidname` (`pages/markdown/podman-run.1.md:1478`).

Rootless key mappings — the host user is always `$UID`:

| `--userns` key | Container user | Meaning | Source |
|---|---|---|---|
| `auto` | `nil` | Host UID is not mapped into the container | `pages/markdown/podman-run.1.md:1479-1485` |
| `host` | `0` | Default: host user maps to container root | `pages/markdown/podman-run.1.md:1486-1488` |
| `keep-id` | `$UID` | Host UID maps to the same UID inside | `pages/markdown/podman-run.1.md:1489-1491` |
| `keep-id:uid=200,gid=210` | `200:210` | Host UID maps to chosen UID/GID | `pages/markdown/podman-run.1.md:1492-1494` |
| `nomap` | `nil` | Host UID is not mapped into the container | `pages/markdown/podman-run.1.md:1495-1497` |

Full mode values and options:

| Mode / option | Effect | Constraint | Source |
|---|---|---|---|
| `auto[:OPTIONS]` | Unique namespace; ranges allocated from `containers` subids (rootful) or the user's subuid range (rootless) | Rootful needs a `containers` entry in `/etc/subuid`/`/etc/subgid`; a single container without `auto` consumes the whole range | `pages/markdown/podman-run.1.md:1499-1505` |
| `auto:size=SIZE` | Explicit namespace size; otherwise estimated from image UIDs | Required to subdivide ranges predictably | `pages/markdown/podman-run.1.md:1508` |
| `auto:uidmapping=`/`gidmapping=` | Force a specific container/host mapping with size; `@` prefix resolves an intermediate ID | Details follow `--uidmap` | `pages/markdown/podman-run.1.md:1507-1511` |
| `container:id` | Join another container's user namespace | — | `pages/markdown/podman-run.1.md:1513` |
| `host` or `""` | Caller's namespace; process privileges match the caller's other processes | — | `pages/markdown/podman-run.1.md:1514` |
| `keep-id` | Current UID:GID map to the same values; init process runs under the current UID, overriding the image `USER` unless `--user` is set | `uid=`, `gid=` override target IDs; `size=` unsupported as root | `pages/markdown/podman-run.1.md:1515-1520` |
| `nomap` | Current rootless UID:GID are not mapped into the container | Not allowed for root-created containers | `pages/markdown/podman-run.1.md:1521` |
| `ns:namespace` | Join an existing user namespace by path | — | `pages/markdown/podman-run.1.md:1522` |

Two operational rules follow from the source. `keep-id` consumes all of the user's subordinate ranges and `nomap` consumes all except the user's own ID; while such containers exist without a bounded `size`, `auto` cannot allocate new namespaces (`pages/markdown/podman-run.1.md:1503-1505`). For multi-tenant hosts, set `auto:size=` explicitly rather than relying on the estimate.

## 3. Deterministic UID mapping for shared volumes

A rootless container is never truly root: it shifts UIDs through `newuidmap`/`newgidmap` using the assigned ranges (`samples/rootless_tutorial.md:170`). Inside such a container, UID 0 corresponds to the invoking host user, and container UID/GID 1 corresponds to the first ID in that user's subuid/subgid range; a file created as root in a bind-mounted host directory is owned by the host user (`samples/rootless_tutorial.md:172`).

For predictable volume ownership:

| Goal | Invocation pattern | Why it works | Source |
|---|---|---|---|
| Writable host dir for a non-root image user | `--userns=keep-id -v ~/data:/var/lib/mysql:Z,U` | `U` chowns the source to the container's default UID/GID; `keep-id` makes processes run as the host user's UID | `pages/markdown/podman-run.1.md:1844-1849` |
| Fix a specific inside UID/GID | `--userns=keep-id:uid=999,gid=999 -v …:Z` | Maps the host user to chosen IDs without `U` | `pages/markdown/podman-run.1.md:1850` |
| Isolate a multi-container UID space | `--userns=auto:size=65536` | Allocates a bounded unique range instead of consuming all subids | `pages/markdown/podman-run.1.md:1503-1508`, `pages/markdown/podman-run.1.md:1942-1945` |
| Diagnose a permission failure | `podman unshare ls -ldn <parent>` | Owner `65534` means the host ID is unmapped, so mode bits cannot be overridden | `samples/rootless_tutorial.md:228` |

`--userns=keep-id` does **not** change which host IDs the namespace maps; it only changes the UID used inside the container (`samples/rootless_tutorial.md:228`). `CAP_DAC_OVERRIDE` inside the namespace bypasses a file's mode only when both its UID and GID have valid mappings (`samples/rootless_tutorial.md:210`). A 700 parent owned by an unmapped ID therefore fails even though the container runs as "root", while a 700 parent owned by a mapped ID succeeds (`samples/rootless_tutorial.md:212-226`). Choose ranges that avoid active system accounts and keep the ownership map stable across hosts.

## 4. Rootless networking: pasta over slirp4netns

A user-mode networking tool is mandatory for unprivileged network namespaces. Podman uses **pasta**, provided by **passt**; it has full IPv6 support and runs as a separate process using modern isolation mechanisms (`samples/rootless_tutorial.md:17-23`). `passt` is packaged by name across major distros or can be built from upstream (`samples/rootless_tutorial.md:23`).

| Tool | Status | Note | Source |
|---|---|---|---|
| `passt` / pasta | Default for new rootless installs | Full IPv6; architecturally separate process | `samples/rootless_tutorial.md:21-23` |
| `slirp4netns` | Obsoleted as default | Install only for containers that still depend on it | `pages/installation.md:94-97` |
| Container ↔ host communication | Fixed in Podman 5.3 | Earlier pasta setups had no host-container communication by default | `samples/rootless_tutorial.md:28` |

When a workload must be repeatable across v5.x and v6 hosts, test host-to-container access explicitly; the behavior changed at 5.3 and the captured default assumes the fix (`samples/rootless_tutorial.md:28`).

## 5. cgroups v2 and systemd

Rootless resource accounting and Quadlet both rely on cgroups v2. Rootless `podman pod stats` is supported only on cgroups v2 (`pages/markdown/podman-pod-stats.1.md:6`), and Quadlet requires it (`samples/podman-systemd.unit.5.md:113`). Check with `podman info --format {{.Host.CgroupsVersion}}` (`samples/podman-systemd.unit.5.md:113`).

On a cgroups v2 host the private cgroup namespace is the default; on cgroups v1 it is `host` (`pages/markdown/podman-run.1.md:146-150`). The cgroup manager defaults to `systemd`, and `cgroupfs` does not work in rootless mode (`pages/markdown/podman.1.md:25-28`). Keep journald logging by using a build with the `systemd` tag (`pages/installation.md:326-328`).

## 6. `unshare` and `migrate`

`podman unshare` launches a process in a new user namespace where the invoking user appears as UID 0/GID 0, with the `/etc/subuid`/`/etc/subgid` ranges mapped through `newuidmap`/`newgidmap` (`pages/markdown/podman-unshare.1.md:5-10`). It is the supported way to inspect or clean rootless storage and to use `podman mount`; it is unavailable on remote clients (`pages/markdown/podman-unshare.1.md:11-18`). It exports `CONTAINERS_GRAPHROOT` and `CONTAINERS_RUNROOT` to the session (`pages/markdown/podman-unshare.1.md:15-17`), and `--rootless-netns` joins the netavark namespace to reach a rootless container by IP (`pages/markdown/podman-unshare.1.md:22-25`).

`podman system migrate` is the state reconciliation tool, not only a version-upgrade helper:

| Trigger | Action | Source |
|---|---|---|
| `/etc/subuid` or `/etc/subgid` changed | Stops containers and the pause process so new mappings take effect | `pages/markdown/podman-system-migrate.1.md:8-17` |
| BoltDB database from v5 | `--migrate-db` moves legacy DB to SQLite; removed in 6.0; automatic on reboot is preferred | `pages/markdown/podman-system-migrate.1.md:19-27` |
| Default OCI runtime changed | `--new-runtime` moves all containers; compatibility not guaranteed | `pages/markdown/podman-system-migrate.1.md:28-31` |
| Migration in progress | Stop `podman system service` and Quadlet units first; legacy DB is retained | `pages/markdown/podman-system-migrate.1.md:25-27` |

Sequence for a subid change: update ranges as root → run `podman system migrate` as the affected user → verify with `podman unshare cat /proc/self/uid_map /proc/self/gid_map` (`samples/rootless_tutorial.md:59`, `pages/markdown/podman-unshare.1.md:49-54`).

## 7. Limitations and acceptance checks

| Limitation / knobs | Detail | Source |
|---|---|---|
| No real root | Rootless Podman is not setuid and gains no privileges; it only shifts IDs | `samples/rootless_tutorial.md:170` |
| Unmapped bind sources | `65534` owner in `podman unshare ls -ldn` means mode bits cannot be overridden | `samples/rootless_tutorial.md:210-228` |
| Unprivileged `ping` | Needs the user's GID inside `/proc/sys/net/ipv4/ping_group_range`; set via `sysctl` and `/etc/sysctl.d/*.conf` | `samples/rootless_tutorial.md:91-101` |
| Centralized ranges | `subid: sss` requires shadow-utils ≥ 4.9 and an SSSD plugin | `samples/rootless_tutorial.md:61` |
| Config location | Rootless config lives in `${XDG_CONFIG_HOME}/containers`, owned by the user | `samples/rootless_tutorial.md:112-114` |

Acceptance gate for a new rootless host: subuid/subgid non-overlapping → `passt` installed → cgroups v2 reported → `podman info` reachable → `podman unshare id` shows UID 0 → a small `keep-id` volume write returns the expected host ownership (`pages/markdown/podman-unshare.1.md:45-48`, `pages/markdown/podman-run.1.md:1845`).

## Pitfalls

- Overlapping subuid/subgid ranges let one user enter another's namespace; always allocate disjoint blocks (`samples/rootless_tutorial.md:34`).
- Editing subid files without `podman system migrate` leaves the pause process holding the old mapping (`samples/rootless_tutorial.md:59`, `pages/markdown/podman-system-migrate.1.md:8-17`).
- `keep-id` does not make unmapped host files accessible; it only fixes the container-side UID (`samples/rootless_tutorial.md:228`).
- A container started without bounded `--userns=auto:size=` can consume the whole range and block later `auto` containers (`pages/markdown/podman-run.1.md:1501-1505`).
- `nomap` is invalid for root-created containers, and `keep-id:size=` is unsupported as root (`pages/markdown/podman-run.1.md:1520-1521`).
- `podman unshare` and the `--module` flag do not work on remote clients; desktop/machine workflows must not depend on them (`pages/markdown/podman-unshare.1.md:18`, `pages/markdown/podman.1.md:65-68`).
- Unprivileged `ping` is rarely needed on modern distros; changing `ping_group_range` without scoping it to assigned GIDs widens the allowed range unnecessarily (`samples/rootless_tutorial.md:93-101`).

## Sources

- `samples/rootless_tutorial.md` — byte-exact tutorial: subuid/subgid, pasta, XDG, volumes, pitfalls.
- `pages/markdown/podman-run.1.md` — full `--userns` mode table, volume/UID examples, cgroup namespace default.
- `pages/markdown/podman-unshare.1.md`, `pages/markdown/podman-system-migrate.1.md`, `pages/markdown/podman-pod-stats.1.md`, `pages/markdown/podman.1.md` — captured man pages.
- `pages/installation.md`, `samples/podman-systemd.unit.5.md` — distro and cgroups v2 notes.
- https://docs.podman.io/en/latest/, https://passt.top/passt/about/#pasta, https://github.com/containers/podman/blob/main/docs/source/markdown/podman-system-migrate.1.md.
