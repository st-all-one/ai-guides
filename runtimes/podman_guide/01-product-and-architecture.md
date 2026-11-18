# 01 — Product and architecture

## 1. Execution model: daemonless and rootless-first

Podman has no always-on daemon: each CLI invocation drives the container engine directly, and most operations run as an unprivileged user. The man page is explicit about both points and about the Buildah relationship.

`pages/markdown/podman.1.md:4-14`
```text
podman [options] command
DESCRIPTION
Podman (Pod Manager) is a fully featured container engine that is a simple daemonless tool.
Podman provides a Docker-CLI comparable command line that eases the transition from other
container engines and allows the management of pods, containers and images. Simply put: alias docker=podman.
Most Podman commands can be run as a regular user, without requiring additional
privileges.
Podman uses Buildah(1) internally to create container images. Both tools share image
(not container) storage, hence each can use or manipulate images (but not containers)
created by the other.
Default settings for flags are defined in containers.conf. Most settings for
```

Consequences for design: there is no service to restart after a config edit, a crash leaves no orphan daemon, and the unit of trust is the invoking user. The shared store is **image-only** — Buildah can read or replace an image Podman uses, but cannot see its containers (`pages/markdown/podman.1.md:11-13`). CLI compatibility is intentionally close to Docker, but a drop-in alias does not imply identical defaults (`pages/markdown/podman.1.md:7-8`).

## 2. Component map and v6 module paths

| Component | Role in the stack | Evidence |
|---|---|---|
| `libpod` | Owns containers, pods and their state; consumes OCI hooks, including the `precreate` stage that can rewrite runtime config | `pages/markdown/podman.1.md:44-50` |
| `go.podman.io/common` | v6 module path for shared config; the shipped `containers.conf` originates at `vendor/go.podman.io/common/pkg/config/containers.conf` | `samples/MANIFEST.md:10` |
| `go.podman.io/storage` | Graph root, run root, driver priority and `mount_program`; `storage.conf` originates at `vendor/go.podman.io/storage/storage.conf` | `samples/MANIFEST.md:11`, `samples/storage.conf:8-27` |
| Image/registry stack | Signature policy and registry/mirror rules; sample origins are `test/policy.json` and `test/registries.conf` | `samples/MANIFEST.md:12-13` |
| Buildah | Image construction; shares **image** storage with Podman, not container storage | `pages/markdown/podman.1.md:11-13` |
| OCI runtime | Executes containers; `crun` is the default runtime referenced by the CLI man page | `pages/markdown/podman.1.md:87-92` |
| `conmon` | Monitors OCI runtimes; rotation features depend on its version | `pages/installation.md:273-276`, `pages/markdown/podman-run.1.md:603-607` |
| Netavark / user-mode networking | Rootless network namespace joined via `podman unshare --rootless-netns` | `pages/markdown/podman-unshare.1.md:22-25` |

The module path matters when reading v6 source or vendoring: documentation and older posts that say `github.com/containers/common` refer to the pre-v6 layout, while the pinned `containers.conf` sample is explicitly under `vendor/go.podman.io/common/` (`samples/MANIFEST.md:10`). Storage follows the same rename (`samples/MANIFEST.md:11`).

Configuration is layered over these components rather than embedded in them: default flag values come from `containers.conf`, and remote connections mostly read the server's copy (`pages/markdown/podman.1.md:14-16`).

## 3. OCI runtime and conmon

`conmon` is not optional decoration: it monitors the OCI runtime and implements log rotation and restart-policy plumbing (`pages/installation.md:273-276`). Building without the `systemd` tag removes journald integration, so a source build for production should keep that tag (`pages/installation.md:326-328`).

| Lever | Behavior | Source |
|---|---|---|
| `--runtime=value` | Runtime name in config or absolute OCI-compatible binary path | `pages/markdown/podman.1.md:87-88` |
| `--runtime-flag=flag` | Adds flags to the runtime; repeatable; overrides config-level flags | `pages/markdown/podman.1.md:89-94` |
| `engine.runtime_flags` in `containers.conf` | Default runtime flags, ignored once `--runtime-flag` is used | `pages/markdown/podman.1.md:92` |
| `runtime = "crun"` | Commented default in the shipped config | `samples/containers.conf:715` |
| Minimum runtime versions | `runc` ≥ 1.1.11, `crun` ≥ 1.14.3 in this snapshot | `pages/installation.md:281-283` |
| `conmon` ≥ 2.2.0 | Required for `max-file` and `log-rotate` log options | `pages/markdown/podman-run.1.md:603-607` |

`conmon` is not optional decoration: it monitors the OCI runtime and implements log rotation and restart-policy plumbing (`pages/installation.md:273-276`). Building without the `systemd` tag removes journald integration, so a source build for production should keep that tag (`pages/installation.md:134-137`).

## 4. Local, remote and machine topologies

| Topology | Where the engine runs | Client behavior | Source |
|---|---|---|---|
| Local Linux | On the host, per invoking user | Direct commands; no socket service required | `pages/markdown/podman.1.md:6-10` |
| Remote Linux service | On a server reached over SSH or socket | `--connection`/`-c` switches `--remote` on; remote clients use local `containers.conf` unless documented otherwise | `pages/markdown/podman.1.md:33-36` |
| Explicit remote | Service elsewhere | `--remote` defaults to false, but `CONTAINER_HOST` makes it true | `pages/markdown/podman.1.md:75-78` |
| macOS machine | Linux VM per machine | Native CLI in Terminal talks to the service inside the VM | `pages/installation.md:47-51` |
| Windows machine | WSL2 distribution per machine | CLI in PowerShell/CMD or inside WSL talks to the WSL service | `pages/installation.md:67-74` |
| Docker API clients | Same machine service | Mac/Windows machines listen for Docker API clients | `pages/installation.md:41-46` |

The practical boundary: features that need the local namespace — `podman unshare`, `podman mount`, `--module`, `podman image trust` — are unavailable on remote clients (`pages/markdown/podman-unshare.1.md:18`, `pages/markdown/podman.1.md:65-68`, `pages/markdown/podman-image-trust.1.md:6`). A remote-client command that seems to accept a flag may still be rejected; check the man page before scripting it.

## 5. Release tracks: v5.8 maintenance and v6.2 stable

`VERSION` pins v6.2.0 (stable) and the v5.8.10 maintenance line. The sharpest documented v6 boundary is the state database: BoltDB support was removed in Podman 6.0, and existing BoltDB databases must be migrated with `podman system migrate --migrate-db` or a reboot-triggered automatic migration (`pages/markdown/podman-system-migrate.1.md:19-27`).

| Track | Role | Implication |
|---|---|---|
| v6.2.0 | Stable feature line for this dossier | New flags, SBOM output, health state; BoltDB already gone |
| v5.8.10 | Maintenance line | Security/bug fixes, not a source for v6 flag semantics |
| ≤ v5.x | Legacy | BoltDB databases need migration before a v6 engine can use them (`pages/markdown/podman-system-migrate.1.md:21-24`) |

## 6. systemd, Quadlet and kube surfaces

Podman's declarative story is systemd-based. Quadlet files manage containers, pods, volumes, networks, images and builds through generated systemd units (`pages/markdown/podman.1.md:17-18`, `samples/podman-systemd.unit.5.md:9-17`). Quadlet requires cgroups v2; verify with `podman info --format {{.Host.CgroupsVersion}}` (`samples/podman-systemd.unit.5.md:113`). On a cgroups v2 host, the private cgroup namespace is the default (`pages/markdown/podman-run.1.md:148-150`).

| Surface | Entry point | Scope | Source |
|---|---|---|---|
| Quadlet | `.container`, `.pod`, `.volume`, `.network`, `.image`, `.build`, `.kube` units | Declarative systemd-managed objects | `samples/podman-systemd.unit.5.md:9-17` |
| Generated units | `podman generate systemd` — deprecated, Quadlet preferred; no new features planned | Unit file generation from existing containers | `pages/markdown/podman-generate-systemd.1.md:2-9` |
| Kube lifecycle | `kube apply` / `kube down` / `kube generate` | Apply, tear down and generate YAML | `pages/markdown/podman-kube.1.md:1-12` |

The cgroup manager defaults to `systemd` and can be overridden in `containers.conf`; `cgroupfs` is unsupported for rootless containers (`pages/markdown/podman.1.md:25-28`). Pick one manager and stay with it: switching can break commands against containers created under the other (`pages/markdown/podman.1.md:27-28`).

## 7. Where state lives

| State | Root default | Rootless default | Source |
|---|---|---|---|
| Storage root (`--root`, graphroot) | `/var/lib/containers/storage` | `$HOME/.local/share/containers/storage` | `pages/markdown/podman.1.md:79-81` |
| State root (`--runroot`) | `/run/containers/storage` | `/run/user/$UID/run` | `pages/markdown/podman.1.md:84-86` |
| libpod tmp dir | `/run/libpod/tmp` | `$XDG_RUNTIME_DIR/libpod/tmp` | `pages/markdown/podman.1.md:124` |
| Network config dir | `/etc/containers/networks` | `$graphroot/networks` | `pages/markdown/podman.1.md:69-72` |
| User config / data / runtime | system: `/usr/share/containers`, `/etc/containers` | `${XDG_CONFIG_HOME}/containers`; `$XDG_CONFIG_HOME=$HOME/.config`, `$XDG_DATA_HOME=$HOME/.local/share`, `$XDG_RUNTIME_DIR=/run/user/$UID` under systemd | `samples/rootless_tutorial.md:112-120` |
| Rootless graphroot / runroot in config | — | `${XDG_DATA_HOME}/containers/storage` / `${XDG_RUNTIME_DIR}/containers` | `samples/rootless_tutorial.md:151-154` |
| Storage driver priority | `overlay` default; priority list `["overlay", "btrfs"]` | same config, with `vfs`/`fuse-overlayfs` fallbacks where overlay is unavailable | `samples/storage.conf:8-27` |

`--root` causes `storage.options.<driver>` settings and `STORAGE_OPTS` to be ignored; the operator must restate them with `--storage-opt` (`pages/markdown/podman.1.md:79-83`). An optional `--imagestore` places newly pulled images elsewhere while the graphroot keeps the rest (`pages/markdown/podman.1.md:60-62`). Separating graphroot and runroot across fast volatile storage is a deliberate availability choice, not a default.

## Pitfalls

- Do not equate Buildah's shared **image** store with shared container state; each tool sees only its own containers (`pages/markdown/podman.1.md:11-13`).
- The two captured sources disagree on the rootless `runroot`: the CLI man page states `/run/user/$UID/run` (`pages/markdown/podman.1.md:84-86`), while the tutorial's config example uses `${XDG_RUNTIME_DIR}/containers` (`samples/rootless_tutorial.md:151-154`); confirm with `podman info` on the target build before relying on a path.
- Remote clients ignore or reject local-namespace commands and the `--module` flag; do not design a workflow that depends on them over a socket (`pages/markdown/podman-unshare.1.md:18`, `pages/markdown/podman.1.md:65-68`).
- A migration to a new OCI runtime has no compatibility guarantee; verify workloads after `--new-runtime` (`pages/markdown/podman-system-migrate.1.md:28-31`).
- Changing cgroup managers on a host with existing containers can break later commands (`pages/markdown/podman.1.md:27-28`).
- BoltDB state cannot be read by v6 without migration; a version downgrade is not a rollback strategy (`pages/markdown/podman-system-migrate.1.md:21-24`).

## Sources

- `pages/markdown/podman.1.md` — daemonless model, global options, runtime, state paths.
- `pages/markdown/podman-unshare.1.md`, `pages/markdown/podman-image-trust.1.md`, `pages/markdown/podman-system-migrate.1.md`, `pages/markdown/podman-generate-systemd.1.md`, `pages/markdown/podman-kube.1.md`, `pages/markdown/podman-kube-play.1.md`, `pages/markdown/podman-run.1.md`, `pages/markdown/podman-systemd.unit.5.md` — captured man pages.
- `pages/installation.md` — runtime/conmon prerequisites and build tags.
- `samples/MANIFEST.md`, `samples/containers.conf`, `samples/storage.conf`, `samples/podman-systemd.unit.5.md` — byte-exact pinned sources.
- https://docs.podman.io/en/latest/, https://podman.io/docs/installation, https://github.com/podman-container-tools/podman (v6.2.0, `055de046937d29450f310fce0fe3071485d8bed9`).
