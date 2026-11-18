# 02 — Installation and platforms

## 1. Linux distribution install matrix

Distribution packages are the recommended Linux path; the commands below are the exact ones in the captured installation page.

| Distribution | Requirement / note | Command | Source |
|---|---|---|---|
| Arch / Manjaro | — | `sudo pacman -S podman` | `pages/installation.md:77-80` |
| Alpine | — | `sudo apk add podman` | `pages/installation.md:81-83` |
| CentOS Stream | Available by default in AppStream, 9+ | `sudo dnf -y install podman` | `pages/installation.md:84-86` |
| Debian | Debian 11 (Bullseye) or later | `sudo apt-get -y install podman` | `pages/installation.md:87-89` |
| Fedora | Machine commands need an extra package | `sudo dnf -y install podman`; `sudo dnf -y install podman-machine` | `pages/installation.md:90-97` |
| Fedora CoreOS / Silverblue | Built in | none | `pages/installation.md:98-99` |
| Gentoo | — | `sudo emerge app-containers/podman` | `pages/installation.md:100-101` |
| OpenEmbedded | `meta-virtualization` layer | `bitbake podman` | `pages/installation.md:102-106` |
| openSUSE / Kubic | Kubic is built in | `sudo zypper install podman` | `pages/installation.md:107-110` |
| RHEL | Follow official docs | — | `pages/installation.md:115-116` |
| Ubuntu / Linux Mint | Ubuntu 20.10+ official repo | `sudo apt-get update && sudo apt-get -y install podman` | `pages/installation.md:117-124` |
| Raspberry Pi OS arm64 (beta) | Uses Debian arm64 repositories | follow Debian steps | `pages/installation.md:111-114` |

One version-boundary note is already visible in the Fedora instructions: `slirp4netns` is no longer the default for new rootless installs, having been obsoleted by `passt`; only install it for legacy containers that still need it (`pages/installation.md:94-97`). That change is why the rootless checklist in §7 treats `passt` as the primary prerequisite.

## 2. macOS: installer first, Homebrew second

On macOS each machine is a virtual machine, and the native CLI in Terminal talks remotely to the service inside it (`pages/installation.md:47-51`). The page's own ordering is unambiguous.

`pages/installation.md:52-66`
```text
Download Podman:
Recommended
Use the Installer (Recommended)
Podman can be downloaded from the Podman.io website.
You can get binaries and a pkg installer from our GitHub release page.
Not recommended
Use Homebrew
It's not recommended to install via Homebrew because it is a community-maintained package manager, and we cannot guarantee the stability
of the Podman installation. However, if you do wish to use Brew, run:
brew install podman
Create and start your first Podman machine:
podman machine init
podman machine start
Verify the installation information:
podman info
```

The caveat is a stability guarantee, not a functional prohibition: Homebrew is community-maintained, so Podman cannot guarantee the installation (`pages/installation.md:57-61`). For reproducible environments prefer the pkg installer or GitHub binaries and record their version explicitly; a `brew upgrade` can otherwise move the major version without a change request (derived from `pages/installation.md:53-61`).

## 3. Windows: WSL2 machines

On Windows a machine is a WSL2 distribution. The CLI runs from PowerShell or CMD and remotely drives the service in WSL; the same CLI can be used inside WSL for a Linux prompt and tooling (`pages/installation.md:67-74`). Setup details are referred out to the Podman for Windows guide (`pages/installation.md:74`). The `podman machine init` / `podman machine start` / `podman info` sequence is the same verification pattern as macOS (`pages/installation.md:62-66`).

| Platform concern | Consequence | Source |
|---|---|---|
| Machine type | VM on macOS, WSL2 distribution on Windows | `pages/installation.md:48-51`, `pages/installation.md:68-71` |
| API compatibility | Machines listen for Docker API clients | `pages/installation.md:41-46` |
| Remote-local boundary | `podman unshare` and `--module` are unavailable to remote clients | `pages/markdown/podman-unshare.1.md:18`, `pages/markdown/podman.1.md:65-68` |
| Registry config on desktop | Edit `/etc/containers/registries.conf` inside the machine via `podman machine ssh`; `podman machine set --rootful` may be needed for permissions | `pages/installation.md:349` |

Desktop installs therefore have two config surfaces: host-level client settings and files inside the machine. Changing the wrong one is the common cause of "mirror ignored" reports.

## 4. Verification with `podman info`

The documented smoke test is `podman info` after creating and starting a machine (`pages/installation.md:65-66`). After a Linux install, add targeted format queries so the environment is checked against the values the rest of this dossier assumes.

| Query | Expected signal | Source |
|---|---|---|
| `podman info` | Full host/store/runtime inventory; the canonical post-install check | `pages/installation.md:65-66` |
| `podman info --format '{{ .Host.LogDriver }}'` | Default driver, `journald` on the captured default | `pages/markdown/podman-run.1.md:588-591` |
| `podman info --format {{.Host.CgroupsVersion}}` | Must report v2 for Quadlet | `samples/podman-systemd.unit.5.md:113` |
| `podman unshare cat /proc/self/uid_map /proc/self/gid_map` | Rootless mapping actually in effect (local client only) | `pages/markdown/podman-unshare.1.md:49-54` |
| `runc --version` first line | ≥ 1.1.11 for a source build | `pages/installation.md:282-283` |

A passing `podman info` proves the client can reach an engine; it does not prove rootless networking or UID mapping works. Verify those separately with the unshare and network checks in chapter `03-rootless-and-userns.md`.

## 5. FreeBSD

The port is explicitly experimental, evaluation/testing only, and supported on FreeBSD 14.3 and newer (`pages/installation.md:142-148`). `pkg install podman` installs the engine; the `podman-suite` meta package also pulls Buildah and Skopeo (`pages/installation.md:146-148`).

| Area | Required setup | Source |
|---|---|---|
| Restart policy | `conmon` needs `fdescfs(5)` on `/dev/fd`; mount it and add `fdesc /dev/fd fdescfs rw 0 0` to `/etc/fstab` | `pages/installation.md:149-156` |
| Networking | NAT requires PF: copy `pf.conf.sample`, set `v4egress_if`/`v6egress_if`, `service pf enable` and `start` | `pages/installation.md:157-167` |
| Port redirections | Since 13.3: load `pf`, set `net.pf.filter_local=1`; add `nat-anchor "cni-rdr/*"` for localhost destinations | `pages/installation.md:164-173` |
| Storage | State lives in `/var/db/containers`; ZFS recommended, otherwise switch to `vfs` in `storage.conf` | `pages/installation.md:179-182` |
| Verification | `podman run --rm docker.io/dougrabson/hello` | `pages/installation.md:183-185` |
| Linux images | `sysrc linux_enable=YES`, `service linux start`, then `podman run --os=linux …` | `pages/installation.md:186-190` |

FreeBSD is a distinct storage and firewall topology, not a Linux rootless variant; do not transplant the cgroups v2 or pasta checklist from §7 to it.

## 6. Building from source: dependencies and build tags

A source build is justified when a distro package is too old or a specific tag set is required. The captured page lists per-distro dependency sets and the exact build sequence.

| Distribution | Dependency command (build + runtime essentials) | Source |
|---|---|---|
| Fedora | `sudo dnf -y builddep rpm/podman.spec`; `sudo dnf -y install catatonit conmon containers-common-extra` | `pages/installation.md:195-200` |
| CentOS Stream 9+ | install `dnf-command(builddep)`, then `dnf builddep rpm/podman.spec --enablerepo=crb` | `pages/installation.md:201-205` |
| RHEL 9+ | `dnf builddep … --enablerepo=codeready-builder-for-rhel-$(rpm --eval %{?rhel})-$(uname -m)-rpms` | `pages/installation.md:206-207` |
| Debian / Ubuntu | `apt-get install` of `btrfs-progs gcc git golang-go go-md2man iptables lib* golang deps`, `netavark passt runc uidmap` | `pages/installation.md:217-244` |
| openSUSE | `sudo zypper -n in libseccomp-devel libgpgme-devel libbtrfs-devel make man` | `pages/installation.md:245-246` |
| Manjaro | verify `CONFIG_USER_NS=y`, then `kernel.unprivileged_userns_clone=1` via sysctl and `/etc/sysctl.d/userns.conf` | `pages/installation.md:247-257` |

Go must be current: as of the snapshot, 1.23.x or higher is required and the true minimum is in `go.mod` (`pages/installation.md:262-263`). Conmon and at least one OCI runtime must be present; `crun` has priority over `runc`, with minimums 1.14.3 and 1.1.11 respectively (`pages/installation.md:272-282`). The build itself is `git clone … podman`, `make PREFIX=/usr`, then `sudo env PATH=$PATH make install PREFIX=/usr` (`pages/installation.md:303-308`).

| Build tag | Feature | Dependency | Source |
|---|---|---|---|
| `apparmor` | AppArmor support | `libapparmor` | `pages/installation.md:319-320` |
| `exclude_graphdriver_btrfs` | Drop btrfs (needed on RHEL8) | `libbtrfs` absent | `pages/installation.md:321`, `pages/installation.md:317-318` |
| `libsqlite3` | Dynamically link sqlite | `libsqlite3` | `pages/installation.md:322` |
| `libsubid` | Network subuid/gid support | `libsubid` | `pages/installation.md:323` |
| `seccomp` | Syscall filtering | `libseccomp` | `pages/installation.md:324` |
| `selinux` | Process and mount labeling | — | `pages/installation.md:325` |
| `systemd` | journald logging | `libsystemd` | `pages/installation.md:326` |

The Makefile selects tags from installed dependencies by default; pass `BUILDTAGS="…"` to override, or `BUILDTAGS=""` for none (`pages/installation.md:310-314`). Omitting `seccomp` is documented as unsupported and insecure — every container would need `--security-opt seccomp=unconfined` (`pages/installation.md:327`). On systemd use `systemd`; on SELinux/AppArmor hosts use the matching tags (`pages/installation.md:328-329`). Optional `fuse-overlayfs` resolves overlay-on-ecryptfs failures (`pages/installation.md:292-302`).

## 7. Rootless prerequisites checklist

Before the first rootless workload, confirm each item:

| Item | Requirement | Check / fix | Source |
|---|---|---|---|
| Subordinate IDs | Non-overlapping ranges in `/etc/subuid` and `/etc/subgid` | `usermod --add-subuids … --add-subgids …`; then `podman system migrate` | `samples/rootless_tutorial.md:30-34`, `samples/rootless_tutorial.md:53-59` |
| User namespaces | Kernel support and unprivileged clone | `zgrep CONFIG_USER_NS /proc/config.gz`; `kernel.unprivileged_userns_clone=1` where needed | `pages/installation.md:247-257` |
| Networking | `passt` (pasta) installed; `slirp4netns` only for legacy | distro package `passt` | `samples/rootless_tutorial.md:17-23`, `pages/installation.md:94-97` |
| Cgroups | cgroups v2 for rootless limits and Quadlet | `podman info --format {{.Host.CgroupsVersion}}` | `pages/markdown/podman-pod-stats.1.md:6`, `samples/podman-systemd.unit.5.md:113` |
| XDG paths | `$XDG_CONFIG_HOME`, `$XDG_DATA_HOME`, `$XDG_RUNTIME_DIR` resolvable | defaults `$HOME/.config`, `$HOME/.local/share`, `/run/user/$UID` | `samples/rootless_tutorial.md:114-120` |
| Logging integration | `systemd` build tag for journald | `podman info --format '{{ .Host.LogDriver }}'` | `pages/installation.md:326-328`, `pages/markdown/podman-run.1.md:588-591` |

## 8. Version pinning across distros

Distributions ship different Podman versions from different repos, so "install podman" is not a reproducible instruction. Pin the package version with the distro's own mechanism and record it beside the workload definition.

| Repo channel | Nature | Production verdict | Source |
|---|---|---|---|
| Stable distro repo | Tested distribution build | default choice | `pages/installation.md:77-123` |
| Fedora `updates-testing` | Pre-release packages | test only | `pages/installation.md:125-129` |
| Copr `rhcontainerbot/podman-next` | RPMs from upstream `main` | explicitly not recommended for any production use | `pages/installation.md:133-141` |
| Homebrew (macOS) | community-maintained | no stability guarantee | `pages/installation.md:57-61` |
| Source build | operator-controlled tags | use when exact features/tags are required | `pages/installation.md:193-330` |

A major-version upgrade can change defaults and state format — v6 removed BoltDB support (`pages/markdown/podman-system-migrate.1.md:19-24`) — so gate major upgrades on a migration plan rather than on a routine package refresh.

## Pitfalls

- Fedora's `podman-machine` package is separate from `podman`; forgetting it leaves machine commands unavailable (`pages/installation.md:92-93`).
- `slirp4netns` is legacy on new installs; installing it does not make it the default (`pages/installation.md:94-97`).
- Homebrew works but is not supported with the same stability guarantee as the installer (`pages/installation.md:57-61`).
- On FreeBSD, `fdescfs`, PF and ZFS storage are separate setup steps; skipping the first breaks restart policies (`pages/installation.md:149-156`).
- A source build without `seccomp` is unsupported and forces every container to run unconfined (`pages/installation.md:327`).
- Copr `podman-next` builds come from `main` and are explicitly unfit for production (`pages/installation.md:135-138`).
- `podman info` alone does not validate rootless UID mapping, cgroups version or log driver; query each separately (`pages/markdown/podman-unshare.1.md:49-54`, `samples/podman-systemd.unit.5.md:113`).

## Sources

- `pages/installation.md` — distro commands, macOS/Windows/FreeBSD, source build, tags, dev repos.
- `pages/markdown/podman-run.1.md`, `pages/markdown/podman-unshare.1.md`, `pages/markdown/podman-system-migrate.1.md`, `pages/markdown/podman-pod-stats.1.md`, `pages/markdown/podman.1.md` — captured man pages.
- `samples/rootless_tutorial.md`, `samples/podman-systemd.unit.5.md` — byte-exact pinned sources.
- https://podman.io/docs/installation, https://docs.podman.io/en/latest/, https://passt.top/passt/about/#pasta.
