# 03 - isolation-and-runtime

Isolation is a composition of Linux kernel primitives plus a daemon-applied
default profile. Nothing here is live-verified; every claim resolves to a
captured documentation line.

## 1. Kernel isolation model

Namespaces limit visibility without the process noticing: "namespaces provide
isolation for running processes, limiting their access to system resources
without the running process being aware of the limitations"
`pages/engine/security/userns-remap.md:4-7`. Cgroups place a container under a
parent you create and manage, with resources defined on that parent
`pages/reference/cli/docker/container/run.md:1097-1102`. Cgroup namespace mode is
`set with --cgroupns` (`host`, `private`, or daemon default; API 1.41+)
`pages/reference/cli/docker/container/run.md:36`.

| Flag | Documented behavior | Citation |
|---|---|---|
| `--pid` | `container:<name\|id>` joins another container; `host` uses host PID namespace; on by default | `pages/reference/cli/docker/container/run.md:197-209` |
| `--ipc` | `""`, `none`, `private`, `shareable`, `container:<id>`, `host`; daemon default is `private` or `shareable` | `pages/reference/cli/docker/container/run.md:309-327` |
| `--userns` | `host` is the only valid value; disables remapping for that container | `pages/reference/cli/docker/container/run.md:273-284` |


## 2. Default security profile

**seccomp.** Available only when Docker is built with `seccomp` and the kernel
has `CONFIG_SECCOMP` `pages/engine/security/seccomp.md:4-11`. The default
profile disables about 44 of 300+ calls, is an allowlist with `defaultAction`
`SCMP_ACT_ERRNO` overridden to `SCMP_ACT_ALLOW` for chosen calls, and the docs
advise against changing it `pages/engine/security/seccomp.md:20-35`. Examples:
`io_uring_*` (breakout vulnerabilities)
`pages/engine/security/seccomp.md:76-78`; `keyctl` and `add_key`
(non-namespaced kernel keyring) `pages/engine/security/seccomp.md:63`
`pages/engine/security/seccomp.md:82`.

Override with `--security-opt`; the CLI reads the file on the client and sends
it to the daemon `pages/engine/security/seccomp.md:37-51`. Documented form:
`docker run --rm -it --security-opt seccomp=/path/to/seccomp/profile.json hello-world`
`pages/engine/security/seccomp.md:42-45`.


**AppArmor.** Docker generates and loads `docker-default` in `tmpfs` for
containers, not the daemon; a daemon profile exists but is not shipped in `deb`
packages `pages/engine/security/apparmor.md:4-21`. It is the default unless
overridden `pages/engine/security/apparmor.md:25-36`. From Engine 29.8 the daemon
can render `docker-default` from a Go `text/template` via `apparmor-profile` in
`daemon.json` or the `dockerd` flag (not both); privileged containers without an
explicit profile use `unconfined`, and custom templates can reduce isolation
`pages/engine/security/apparmor.md:40-56` `pages/engine/security/apparmor.md:81-91`.

**Capabilities.** `--cap-add` adds and `--cap-drop` drops capabilities
`pages/reference/cli/docker/container/run.md:33-34`. `--privileged` grants
extended privileges but "is not a securely sandboxed process"; the docs prefer
individual `--cap-add` `pages/reference/cli/docker/container/run.md:342-367`.
In rootless mode `--cap-add` only affects the container user namespace
`pages/engine/security/rootless/troubleshoot.md:84-88`.

## 3. Per-container hardening controls

| Control | Documented effect | Citation |
|---|---|---|
| `--cap-drop=ALL` | Drops capabilities (flag documented); `derived` least-privilege baseline, not a Docker default | `pages/reference/cli/docker/container/run.md:34` |
| `--security-opt no-new-privileges=true` | Stops processes gaining new privileges | `pages/reference/cli/docker/container/run.md:1472` |
| `--security-opt label=disable` / `systempaths=unconfined` | Disables label confinement / masked and read-only path confinement | `pages/reference/cli/docker/container/run.md:1470` `pages/reference/cli/docker/container/run.md:1476` |
| `--read-only` | Mounts root filesystem read-only; writable volumes can be added | `pages/reference/cli/docker/container/run.md:461-470` |
| `--tmpfs` | tmpfs mount with Linux `mount -t tmpfs -o` options | `pages/reference/cli/docker/container/run.md:419-429` |
| `--device` | Exposes a host device without `--privileged`; default `rwm`, ignored in privileged mode | `pages/reference/cli/docker/container/run.md:876-898` |


A writable tmpfs is mounted with
`docker run -d --tmpfs /run:rw,noexec,nosuid,size=65536k my_image`
`pages/reference/cli/docker/container/run.md:428`.

## 4. User namespace remapping

Remapping container root to an unprivileged host UID is the documented approach
for containers that must run as root, while the daemon still runs as root
`pages/engine/security/userns-remap.md:9-20`. `/etc/subuid` and `/etc/subgid`
hold `user:first-uid:count` tuples; `testuser:231072:65536` maps host UID 231072
to container UID 0, so an escape runs as an unmapped unprivileged UID
`pages/engine/security/userns-remap.md:22-38`. Only the first five
non-overlapping mappings are used (kernel `/proc/self/*_map` limit)
`pages/engine/security/userns-remap.md:40-46`; `default` creates `dockremap`
`pages/engine/security/userns-remap.md:48-51`.

Enable via `dockerd --userns-remap` or the recommended `daemon.json` key
`pages/engine/security/userns-remap.md:134-159`, for example `"userns-remap": "testuser"`
`pages/engine/security/userns-remap.md:161-163`.

Enabling masks existing layers under `/var/lib/docker`, so prefer a fresh
install; disabling makes those resources unreachable
`pages/engine/security/userns-remap.md:122-129`. Incompatible: `--pid=host`,
`--network=host`, mapping-unaware drivers, and `--privileged` without
`--userns=host` `pages/engine/security/userns-remap.md:257-270`; `mknod` is denied
even to container root `pages/engine/security/userns-remap.md:272-277`.

## 5. Rootless mode

Rootless runs daemon and containers without root
`pages/engine/security/userns-remap.md:16-20`; the script starts `dockerd` in its
own user, mount, and network namespaces
`pages/engine/security/rootless/troubleshoot.md:435`. Prerequisites: an
unprivileged-user-namespace path and configured `subuid`/`subgid` ranges
`pages/engine/security/rootless/troubleshoot.md:138-140`; Ubuntu 24.04 restricts
unprivileged namespaces unless an AppArmor profile allows them (bundled in the
deb `rootlesskit` package, manual with the install script)
`pages/engine/security/rootless/troubleshoot.md:9-20`; Arch and similar need
`kernel.unprivileged_userns_clone=1`
`pages/engine/security/rootless/troubleshoot.md:46-47`. Limits: storage drivers
`overlay2` (kernel 5.11+), `fuse-overlayfs` (4.18+), `btrfs` (4.18+), or `vfs`;
cgroups only with cgroup v2 and systemd; no AppArmor, checkpoint, overlay
network, or SCTP ports; ports below 1024 need a sysctl or capability adjustment
`pages/engine/security/rootless/troubleshoot.md:64-83`.

## 6. Alternative runtimes

containerd manages lifecycle and defaults to runc; any runtime implementing the
containerd shim API works without daemon configuration (Wasmtime, gVisor, Kata
Containers), while runc drop-ins such as youki need manual registration
`pages/engine/daemon/alternative-runtimes.md:4-27`. Install a shim on `PATH` and
select it with `--runtime`, for example
`docker run --runtime io.containerd.kata.v2 hello-world`
`pages/engine/daemon/alternative-runtimes.md:39`.

A shim not on `PATH` is registered in `daemon.json` and selected by name
`pages/engine/daemon/alternative-runtimes.md:42-61`; shim options use
`runtimeType` plus `options`. The gVisor example sets `runtimeType` to
`io.containerd.runsc.v1`, `TypeUrl` to `io.containerd.runsc.v1.options`, and
`ConfigPath` to `/etc/containerd/runsc.toml`
`pages/engine/daemon/alternative-runtimes.md:75-85`.

Wasmtime adds Wasm sandboxing on top of container isolation and needs the
containerd image store feature `pages/engine/daemon/alternative-runtimes.md:163-181`.

## 7. Audit notes

`derived` baseline: fresh install with `userns-remap` or rootless mode, default
seccomp and AppArmor profiles, `--cap-drop=ALL`,
`--security-opt no-new-privileges=true`, `--read-only` with explicit `--tmpfs`
writes, and never `--privileged` with host namespace sharing. Not executed.

## Sources

https://docs.docker.com/engine/security/seccomp/
https://docs.docker.com/engine/security/apparmor/
https://docs.docker.com/engine/security/userns-remap/
https://docs.docker.com/engine/security/rootless/troubleshoot/
https://docs.docker.com/engine/daemon/alternative-runtimes/
https://docs.docker.com/reference/cli/docker/container/run/
https://docs.docker.com/engine/extend/plugins_authorization/
https://docs.docker.com/engine/security/protect-access/
