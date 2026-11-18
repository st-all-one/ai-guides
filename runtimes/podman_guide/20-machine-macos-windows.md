# 20 — Podman machine on macOS and Windows

Pinned to Podman v6.2.0 (`055de046`); machine behavior changes fast across releases, so
re-verify on upgrade. Containers need a Linux kernel, so macOS/Windows run the CLI locally and
containers in a Linux guest: a VM on macOS, a WSL2 distribution on Windows. `podman machine` may
also be used on Linux (`pages/markdown/podman-machine.1.md:6-10`). All `podman machine` commands
are **rootless only** (`pages/markdown/podman-machine.1.md:11`).

## 1. Providers and where state lives

The v6.2 docs list four provider/platform pairs; the asterisk in the source marks the default:

| Platform | Provider | Default? |
|---|---|---|
| Linux | `qemu` | yes |
| macOS | `libkrun` | yes (GPU-sharing oriented) |
| macOS | `applehv` | alternative (vfkit); Rosetta-capable |
| Windows | `wsl` | yes |
| Windows | `hyperv` | alternative |

Sources: `pages/markdown/podman-machine.1.md:16-29`; `samples/containers.conf:916-927`.
Override per machine with `machine init --provider`; set the fleet default with `[machine]
provider` in `containers.conf` (`pages/markdown/podman-machine-init.1.md:62-64`;
`samples/containers.conf:916-927`). Changing sizes later with `machine set` is QEMU-only
(CPU, memory, disk), and disk can only grow (`pages/markdown/podman-machine-set.1.md:12-17`,
`:25-27`); `machine init` accepts sizing flags for any provider — confirm the applied resources
with `machine inspect`.

Configuration lives in `$XDG_CONFIG_HOME/containers/podman/machine/`; changing
`XDG_CONFIG_HOME` while machines run causes unexpected behavior. `[machine]` in
`containers.conf` holds defaults
(`pages/markdown/podman-machine.1.md:12-15`). `podman machine info` reports `VMType`,
`MachineConfigDir`, `MachineImageDir`, `MachineState`, `CurrentMachine`, `DefaultMachine` and
`NumberOfMachines`; `DefaultMachine` reflects the active connection, but the machine named
`podman-machine-default` is always the default machine
(`pages/markdown/podman-machine-info.1.md:8-16`).

## 2. Lifecycle command map

| Command | Effect | Key constraints |
|---|---|---|
| `init [name]` | create VM, generate SSH keys, add root and user connections | default name `podman-machine-default`; rootless |
| `set [name]` | change CPUs, disk, memory, rootful, USB, user-mode networking | disk can only grow; sizes QEMU-only |
| `start [name]` | boot VM, start API service, set up Docker socket forwarding | only **one** machine may be active |
| `stop [name]` | stop VM | — |
| `restart [name]` | restart VM | — |
| `rm [name]` | remove VM | — |
| `list` / `ls` | list machines | `--format`, `-q`, `-n` |
| `inspect [name]…` | detailed state, resources, SSH config, Rosetta | `--format` Go template |
| `info` | host/provider summary | `--format json` or template |
| `ssh [name] [cmd …]` | interactive shell or one command; exit code forwarded | 125/126/127 = Podman/exec/not found |
| `cp` | copy between host and VM (listed subcommand) | man page not in captured set |
| `os apply` / `os upgrade` | manage guest OS | see §4 |
| `reset [-f]` | stop, remove **all** machines and their config/data | destructive |

Sources: `pages/markdown/podman-machine.1.md:30-72`; `pages/markdown/podman-machine-init.1.md:5-16`;
`pages/markdown/podman-machine-start.1.md:12-15`; `pages/markdown/podman-machine-set.1.md:7-17`;
`pages/markdown/podman-machine-list.1.md:17-60`; `pages/markdown/podman-machine-inspect.1.md:5-39`;
`pages/markdown/podman-machine-ssh.1.md:5-19`, `:20-38`; `pages/markdown/podman-machine-reset.1.md:5-13`.

Derived standard lifecycle (pin name explicitly; avoid relying on the default):
```bash
podman machine init --now --cpus=4 --memory=6144 --disk-size=50 \
  --rootful=false --update-connection=false team-ci
podman machine list --format 'table {{.Name}}\t{{.VMType}}\t{{.Running}}\t{{.CPUs}}'
podman machine inspect --format '{{.Name}} {{.State}} {{.Rootful}}' team-ci
podman info --format '{{.Host.ServiceIsRemote}} {{.Version.Version}}'
podman machine ssh team-ci cat /etc/os-release
podman machine stop team-ci
podman machine rm team-ci
```

Only one Podman-managed VM can run at a time; starting a second errors
(`pages/markdown/podman-machine-start.1.md:14-15`). `--update-connection` (with `init --now` or
`start`) sets the machine connection as default; if unset and stdin is not a TTY, no prompt or
update occurs — pass `=false` explicitly in CI
(`pages/markdown/podman-machine-init.1.md:85-93`; `pages/markdown/podman-machine-start.1.md:24-32`).

## 3. Resource sizing and rootful mode

| Flag / `[machine]` key | Unit | Default in sample config | Notes |
|---|---|---|---|
| `--cpus` / `cpus` | count | `1` | QEMU only when changing with `set` |
| `--memory`, `-m` / `memory` | MiB (`1024 MiB = 1 GiB`) | `2048` | QEMU only for `set` |
| `--disk-size` / `disk_size` | GiB (`init`) / GB (`set`) | `10` | `set` can only increase; QEMU only |
| `--swap`, `-s` | MiB | — | renders zram-generator config |
| `--timezone` | `local` or e.g. `America/Chicago` | `local` | ignored on WSL |
| `--username` | string | `core` (FCOS), `user` (Fedora/Windows) | must match image |
| `--rootful` | bool | `false` | selects default connection and API forwarding |

Sources: `pages/markdown/podman-machine-init.1.md:35-38`, `:54-78`, `:120-123`;
`pages/markdown/podman-machine-set.1.md:12-17`, `:25-32`; `samples/containers.conf:879-905`.

Rootful switching is a **storage boundary**: root and rootless users inside the VM do not share
storage. After `podman machine set --rootful[=true|false]`, existing containers/images/volumes
disappear from the default connection, but are not lost — switch back or use the other
connection (`pages/markdown/podman-machine-set.1.md:28-39`, `:66-74`). `machine init --rootful`
determines the connection default only when no connection configuration exists, and API
forwarding follows it (`pages/markdown/podman-machine-init.1.md:65-69`). Teams must therefore
pin the rootful setting in provisioning, not change it ad hoc.

## 4. Guest OS, image source, Rosetta, offline caveats

Default guest image is a Fedora CoreOS-based OCI artifact at
`quay.io/podman/machine-os`; WSL uses a custom Fedora image
(`pages/markdown/podman-machine-init.1.md:17-19`). Image selection knobs:

| Input | Meaning |
|---|---|
| `--image docker://registry/repo/image:version` | registry OCI artifact; only Podman-provided images supported |
| `[machine] image` | same as a config default; `$OS`/`$ARCH` in URLs are substituted |
| `--ignition-path` | custom ignition; **no SSH keys or connections are generated** |
| `--tls-verify=false` | disables registry TLS verification — avoid outside a controlled mirror |

Sources: `pages/markdown/podman-machine-init.1.md:41-48`, `:79-84`;
`samples/containers.conf:888-896`.

- Patch (Z) OS updates: `podman machine ssh 'sudo rpm-ostree upgrade --check'`, then rerun without
  `--check`, then `machine stop && machine start`. WSL instead uses `podman machine ssh dnf update`
  (`pages/markdown/podman-machine-init.1.md:20-32`).
- Major/minor (X.Y) moves use `podman machine os apply` (apply an OCI image) or
  `podman machine os upgrade`; the captured page lists only these two subcommands, no flags
  (`pages/markdown/podman-machine-os.1.md:1-18`; `pages/markdown/podman-machine-init.1.md:25-27`).
- Host/machine Podman version mismatch is **unsupported**; check both with `podman info`
  (`pages/markdown/podman-machine-init.1.md:28-30`).
- Rosetta runs x86_64 Linux binaries on Apple-silicon machines; default `false`, supported only
  on AppleHV(arm64), and exposed as `.Rosetta` in `machine inspect`
  (`samples/containers.conf:929-932`; `pages/markdown/podman-machine-inspect.1.md:31-32`).
- Air-gapped setup (`derived`): pre-stage the machine image in an internal registry or local path
  before `machine init`, or supply an ignition file — but ignition suppresses automatic SSH
  keys/connections, so provision credentials and `system connection add` explicitly. The default
  image is fetched from the Internet on first `init` (`pages/markdown/podman-machine-init.1.md:159-160`).

## 5. Mounts, networking and deterministic cleanup

`-v source:target[:options]` mounts a host directory into the VM; options `ro`, `rw` (default)
and `security_model=[model]` (9p). Forbidden destinations are `/bin`, `/boot`, `/dev`, `/etc`,
`/home`, `/proc`, `/root`, `/run`, `/sbin`, `/sys`, `/tmp`, `/usr`, `/var`; subdirectories are
allowed. Default mount is `$HOME:$HOME`. On macOS the default 9p security model is `none` for
symlink support; `mapped-xattr` breaks cross-host symlink interoperability. On WSL all drives
are already mounted under `/mnt`, so `--volume` is redundant
(`pages/markdown/podman-machine-init.1.md:124-157`).

Non-WSL providers always use gvproxy user-mode networking. WSL defaults to `false` and can switch
to user-mode networking with `--user-mode-networking`, which makes VPNs see machine traffic as
host traffic; this affects all WSL distributions while active
(`pages/markdown/podman-machine-init.1.md:103-119`).

Docker-compatible tooling needs `DOCKER_HOST`; `machine start` prints the per-machine API socket
and notes that the default Docker socket requires the system helper (`podman-mac-helper install`
on macOS), otherwise export `DOCKER_HOST` manually
(`pages/markdown/podman-machine-start.1.md:41-48`). See also chapter 19.

Derived team checklist: (1) pin `[machine]` defaults `cpus`, `memory`, `disk_size`, `image`,
`provider`, `volumes`, `rosetta`; (2) `machine init --now --update-connection=false <fixed-name>`;
(3) verify with `machine inspect`, `machine info`, `podman info`; (4) `machine stop` / `machine rm`
per machine; use `machine reset --force` only for a full teardown — it also deletes all
configuration and data files, disk images and cached pulled images
(`pages/markdown/podman-machine-reset.1.md:5-9`, `:24-25`). The installer is the recommended
macOS/Windows install path; Homebrew is explicitly not recommended
(`pages/installation.md:52-64`).

## Pitfalls

- v6.2 default macOS provider is `libkrun`, not AppleHV; `applehv` is the alternative and the only Rosetta-capable one documented here.
- CPU/memory/disk changes via `machine set` are QEMU-only and disk size can only increase.
- Only one machine can run at a time; `machine start` on a second one fails.
- `--ignition-path` suppresses SSH key and connection generation — plan credentials yourself.
- Switching `--rootful` changes which VM storage you see; data is retained but appears missing.
- Host/machine Podman version mismatch is unsupported; verify with `podman info`.
- `--volume` is a no-op on WSL (drives are already at `/mnt`), and several top-level destination paths are forbidden.
- `machine reset` is destructive to images, cache, config and every machine; `machine rm` is the targeted removal.
- In non-interactive provisioning, `--update-connection` must be set explicitly or no default is changed.

## Sources

- `pages/markdown/podman-machine.1.md:6-29`, `:30-77`
- `pages/markdown/podman-machine-init.1.md:5-33`, `:34-178`
- `pages/markdown/podman-machine-set.1.md:7-17`, `:25-39`, `:66-74`
- `pages/markdown/podman-machine-start.1.md:12-32`, `:33-57`
- `pages/markdown/podman-machine-info.1.md:6-26`, `:28-79`
- `pages/markdown/podman-machine-list.1.md:17-60`, `:61-85`
- `pages/markdown/podman-machine-inspect.1.md:5-39`, `:41-95`
- `pages/markdown/podman-machine-ssh.1.md:5-38`, `:39-48`
- `pages/markdown/podman-machine-os.1.md:1-18`
- `pages/markdown/podman-machine-reset.1.md:5-25`
- `samples/containers.conf:879-941`
- `pages/installation.md:40-74`
- https://docs.podman.io/en/latest/markdown/podman-machine.1.html
- https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- https://podman.io/docs/installation
