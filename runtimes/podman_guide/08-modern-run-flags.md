# 08 — Modern run flags

This chapter is the deterministic flag matrix for `podman run`/`create` (v6.2.0). Defaults come from `containers.conf` unless a flag overrides them; global flags must precede the subcommand (`pages/markdown/podman.1.md:15-20`). Remote clients use the **server's** `containers.conf` for most defaults (`pages/markdown/podman-run.1.md:33-37`).

## 1. Pull policy, platform and registry transport

`pages/markdown/podman-run.1.md:985-990`
```text
--pull=policy
Pull image policy. The default is missing.
always: Always pull the image and throw an error if the pull fails.
missing: Pull the image only when the image is not in the local containers storage. Throw an error if no image is found and the pull fails.
never: Never pull the image but use the one from the local containers storage. Throw an error if no image is found.
newer: Pull if the image on the registry is newer than the one in the local containers storage. An image is considered to be newer when the digests are different. Comparing the time stamps is prone to errors. Pull errors are suppressed if a local image was found.
```

| Flag | Default | Effect / deterministic recommendation |
|---|---|---|
| `--pull=always\|missing\|never\|newer` | `missing` | `never` + digest pin removes all network nondeterminism; `newer` compares **digests**, not timestamps (`pages/markdown/podman-run.1.md:985-990`) |
| `--platform=OS/ARCH` | host | Conflicts with `--arch`/`--os`; overrides both and records the platform for later local lookups (`pages/markdown/podman-run.1.md:901-905`) |
| `--arch=ARCH`, `--os=OS`, `--variant=VARIANT` | host | Override image selection; subsequent local lookups match the chosen value regardless of host (`pages/markdown/podman-run.1.md:99-102`, `:874-877`, `:1529-1530`) |
| `--authfile=path` | `${XDG_RUNTIME_DIR}/containers/auth.json` (Linux), `$HOME/.config/containers/auth.json` (macOS/Windows) | Falls back to `$HOME/.docker/config.json`; env `REGISTRY_AUTH_FILE` overrides path (`pages/markdown/podman-run.1.md:110-117`) |
| `--tls-verify[=bool]` | `true` | `false` disables verification; if unset, registries marked insecure in `registries.conf` are exempt (`pages/markdown/podman-run.1.md:1224-1229`) |
| `--cert-dir=path` | `/etc/containers/certs.d` | CA/client certs `*.crt`, `*.cert`, `*.key`; unavailable on remote clients (`pages/markdown/podman-run.1.md:134-139`) |
| `--creds=user[:pass]` | prompt | Applies only to target registry, **not** mirrors or rewritten registries (`pages/markdown/podman-run.1.md:258-266`) |
| `--retry=N`, `--retry-delay=D` | `3`, exponential from 2 s | Bound flaky registries; fixed delay disables backoff (`pages/markdown/podman-run.1.md:1052-1057`) |

## 2. Security and sandbox flags

Harden by subtraction; every listed escape is explicit and auditable.

| Flag | Default | Effect / recommendation |
|---|---|---|
| `--privileged` | `false` | Disables capability limits, device limits, read-only mounts, AppArmor/SELinux separation and seccomp; almost never set (`pages/markdown/podman-run.1.md:920-933`) |
| `--cap-drop=ALL` | image/default set | Drop the whole default set, then `--cap-add` only what is proven necessary; `CAP_SYS_ADMIN`/`PTRACE`/`MKNOD`/`MODULE` are especially dangerous outside a userns (`pages/markdown/podman-run.1.md:119-133`) |
| `--security-opt=no-new-privileges` | unset | Blocks privilege gain via `setuid`/`setgid`/file caps at `execve` (`pages/markdown/podman-run.1.md:1144-1146`) |
| `--security-opt=seccomp=PROFILE` / `=unconfined` | default profile | `unconfined` turns off seccomp; profile path is exposed as annotation `io.podman.annotations.seccomp` (`pages/markdown/podman-run.1.md:1148-1151`) |
| `--security-opt=label=disable\|nested\|user:…\|type:…` | SELinux separation on | `disable` and `nested` are explicit trust escapes; `label=nested` permits in-container relabeling (`pages/markdown/podman-run.1.md:1135-1143`) |
| `--security-opt=mask=…`, `unmask=ALL` | default masked paths | Default read-only paths include `/proc/sys`, `/sys/fs/cgroup`; `unmask=ALL` removes all protections (`pages/markdown/podman-run.1.md:1152-1154`) |
| `--read-only` | `false` | Root filesystem read-only; `--read-only-tmpfs=true` (default) still mounts rw tmpfs on `/dev`, `/dev/shm`, `/run`, `/tmp`, `/var/tmp` (`pages/markdown/podman-run.1.md:995-1004`, `:1022-1031`) |
| `--seccomp-policy=image` | default | Use the image's `io.containers.seccomp.profile` label; experimental (`pages/markdown/podman-run.1.md:1082-1086`) |

## 3. Resource limits

All cgroup-backed limits are unsupported for cgroups v1 rootless; rootless changes may require delegated cgroups (`pages/markdown/podman-run.1.md:230-245`).

| Flag | Default | Effect |
|---|---|---|
| `--cpus=N` | `0.0` (no limit) | Shorthand for period+quota; conflicts with `--cpu-period`/`--cpu-quota` (`pages/markdown/podman-run.1.md:230-234`) |
| `--cpu-shares=N` | `1024` (containers.conf) | Relative weight, not a cap (`pages/markdown/podman-run.1.md:187-190`) |
| `--cpuset-cpus`, `--cpuset-mems` | all | Pin to CPU/memory node lists (`pages/markdown/podman-run.1.md:238-259`) |
| `--memory, -m` | `0` (unlimited) | Units `b/k/m/g`; page-rounded; reserved memory defaults to the hard limit (`pages/markdown/podman-run.1.md:628-642`) |
| `--memory-swap` | 2× `--memory` | Must exceed `--memory`; `-1` = unlimited swap (`pages/markdown/podman-run.1.md:644-651`) |
| `--pids-limit=N` | `2048` | `-1` unlimited; use this, not `--ulimit nproc` (`pages/markdown/podman-run.1.md:899-900`, `:1429-1431`) |
| `--ulimit=type=soft[:hard]` | `nofile=1048576` | Uses bytes/count/seconds per type; `host` copies host config (`pages/markdown/podman-run.1.md:1421-1441`) |
| `--device=HOST[:CTR][:perms]` | none | `r`/`w`/`m` permissions; rootless bind-mounts the device, needing `container_use_devices` on SELinux (`pages/markdown/podman-run.1.md:278-296`) |
| `--device-cgroup-rule=TYPE MAJ:MIN MODE` | none | Adds rules to the cgroup device allowlist (`pages/markdown/podman-run.1.md:299-304`) |
| `--shm-size=SIZE` | `64m` | `/dev/shm`; `0` unlimited; conflicts with `--ipc=host` (`pages/markdown/podman-run.1.md:1154-1158`) |
| `--shm-size-systemd=SIZE` | `64m` | systemd tmpfs mounts `/run`, `/run/lock`, `/var/log/journal`, `/tmp` (`pages/markdown/podman-run.1.md:1159-1163`) |
| `--sysctl=name=value` | none | Only namespaced `net.*` or IPC sysctls; forbidden with `--network=host`/`--ipc=host` (`pages/markdown/podman-run.1.md:1182-1193`) |

## 4. Environment, secrets, mounts and metadata

- **Environment precedence** (later wins): image → `--http-proxy` → `--env-host` → `--env-file` (ordered) → `--env` (`pages/markdown/podman-run.1.md:2018-2026`). Pin all variables in a committed env file and avoid `--env-host` for reproducible runs.
- `--secret=id[,opt=…]`: `type=mount|env` (default `mount`), `target`, `uid`/`gid` `0`, `mode=0444`, max 512 kB. Mount targets default to `/run/secrets/<name>` (`/var/run/secrets/<name>` on FreeBSD); updates to the secret after creation propagate (`pages/markdown/podman-run.1.md:1100-1126`).
- `--mount=type=TYPE,…` supports `artifact`, `bind`, `devpts`, `glob`, `image`, `ramfs`, `tmpfs`, `volume`; `src` is mandatory for artifact/bind/glob/image, optional for volume (`pages/markdown/podman-run.1.md:656-663`).
- `relabel=shared|private` (shorthands `z`/`Z`) applies SELinux labels recursively; `idmap` is rootful-only because the kernel forbids idmapped filesystems for unprivileged users (`pages/markdown/podman-run.1.md:697-706`).
- tmpfs/ramfs: `tmpfs-size`, `tmpfs-mode`, `tmpcopyup` (default) vs `notmpcopyup` to shadow parent content, `noatime`, `U=true` (`pages/markdown/podman-run.1.md:733-746`). Verbatim examples from the man page:

`pages/markdown/podman-run.1.md:744-752`
```text
type=bind,source=/path/on/host,destination=/path/in/container
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared,U=true
type=bind,src=/path/on/host,dst=/path/in/container,idmap
type=bind,src=/path/on/host,dst=/path/in/container,idmap=uids=0-1-10;gids=0-100-10
type=devpts,destination=/dev/pts
type=glob,src=/usr/lib/libfoo*,destination=/usr/lib,ro=true
type=image,source=fedora,destination=/fedora-image,rw=true
type=ramfs,tmpfs-size=512M,destination=/path/in/container
```

| Flag | Effect |
|---|---|
| `--env-file=file` | line-delimited `KEY=VALUE`; deterministic source of truth (`pages/markdown/podman-run.1.md:367-368`) |
| `--label-file=file`, `--annotation=key=value` | line-delimited labels; repeatable annotations (`pages/markdown/podman-run.1.md:582-584`, `:97-98`) |
| `--init` / `--init-path` | init at `/run/podman-init` reaps processes and forwards signals; default from `[containers] init` (false); use `--init=true` explicitly (`pages/markdown/podman-run.1.md:526-535`) |
| `--conmon-pidfile=file` | writes conmon PID for systemd restart integration; not available on remote clients (`pages/markdown/podman-run.1.md:165-167`) |
| `--cidfile=file`, `--pidfile=path` | container ID / payload PID files; `--pidfile` is not persisted across `start` (`pages/markdown/podman-run.1.md:162-164`, `:892-898`) |

## 5. Networking and publishing

| `--network=` mode | Default | Effect / recommendation |
|---|---|---|
| `bridge[:ip=…,mac=…,alias=…]` | default **rootful** | Isolated bridge with port forwarding via rootlessport/rootful netavark (`pages/markdown/podman-run.1.md:780-794`) |
| `pasta[:OPTIONS]` | default **rootless** | User-mode stack; preserves original source IP; `--config-net` and `--no-map-gw` applied by default (`pages/markdown/podman-run.1.md:812-837`) |
| `none` | — | Network namespace with no interfaces; best isolation for batch jobs (`pages/markdown/podman-run.1.md:798-799`) |
| `host` | — | Full host socket access, including localhost-bound services — security-sensitive (`pages/markdown/podman-run.1.md:800-805`) |
| `container:ID`, `ns:path`, `private` | — | Join/reuse a namespace; `private` = bridge rootful, pasta rootless (`pages/markdown/podman-run.1.md:806-810`) |

`--publish, -p=[[hostIP:][hostPort]:]containerPort[/proto]`: omitting `hostIP` binds all v4/v6 addresses, omitting `hostPort` picks a random host port; TCP is default, repeat for UDP, rootful adds sctp. Publishing requires a bridge or pasta network (`pages/markdown/podman-run.1.md:935-969`). Bind explicitly to `127.0.0.1` for deterministic, least-exposed services. `--expose` alone changes no firewall rules without `-P` (`pages/markdown/podman-run.1.md:379-386`).

## 6. Restart, health, sdnotify and logging

| Flag | Default | Determinism impact |
|---|---|---|
| `--restart=no\|never\|on-failure[:N]\|always\|unless-stopped` | `no` | Not applied to `kill`/`stop`; `podman-restart.service` handles reboots; **do not** use in a Quadlet `.container` — use `Restart=` (`pages/markdown/podman-run.1.md:1039-1051`) |
| `--health-cmd` | image or none | Required for other health flags; `none` disables; image healthcheck defaults are overwritten (`pages/markdown/podman-run.1.md:416-422`) |
| `--health-interval`, `--health-timeout`, `--health-retries`, `--health-start-period` | `30s`, `30s`, `3`, `0s` | Timeout SIGKILLs a slow check (`pages/markdown/podman-run.1.md:423-424`, `:478-480`, `:441-443`, `:446-450`) |
| `--health-on-failure=none\|kill\|restart\|stop` | `none` | `restart` must not be combined with `--restart`; in systemd prefer `kill`/`stop` (`pages/markdown/podman-run.1.md:435-440`) |
| `--health-log-destination=local\|dir\|events_logger` | `local` | `local` uses container state file, `directory` writes `<ID>-healthcheck.log`; max 5 logs / 500 chars (`pages/markdown/podman-run.1.md:426-434`) |
| `--health-startup-cmd`, `-interval`, `-retries`, `-success`, `-timeout` | `0s`, `0`, `0`, `30s` | Gates the regular check; requires a regular `--health-cmd` (`pages/markdown/podman-run.1.md:458-474`) |
| `--log-driver=journald\|k8s-file\|none\|passthrough\|passthrough-tty` | `journald` | `json-file` aliases `k8s-file`; `passthrough` unsafe on a TTY (`pages/markdown/podman-run.1.md:586-594`) |
| `--log-opt=path\|max-size\|max-file\|log-rotate` | driver-specific | `max-size`/`max-file`/`log-rotate` need conmon ≥2.2.0; setting them enables rotation (`pages/markdown/podman-run.1.md:595-611`) |
| `--stop-signal`, `--stop-timeout` | `SIGTERM`, `10` s | Graceful shutdown contract (`pages/markdown/podman-run.1.md:1165-1168`) |

`pages/markdown/podman-run.1.md:1087-1096`
```text
--sdnotify=container | conmon | healthy | ignore
Determines how to use the NOTIFY_SOCKET, as passed with systemd and Type=notify.
Default is container, which means allow the OCI runtime to proxy the socket into the
container to receive ready notification. Podman sets the MAINPID to conmon’s pid.
The conmon option sets MAINPID to conmon’s pid, and sends READY when the container
has started. The socket is never passed to the runtime or the container.
The healthy option sets MAINPID to conmon’s pid, and sends READY when the container
has turned healthy; requires a healthcheck to be set. The socket is never passed to the runtime or the container.
The ignore option removes NOTIFY_SOCKET from the environment for itself and child processes,
for the case where some other process above Podman uses NOTIFY_SOCKET and Podman does not use it.
```

Use `--sdnotify=healthy` with a real healthcheck for readiness-gated deploys; use `ignore` when an ancestor owns `NOTIFY_SOCKET`.

## 7. User namespaces and identity

| Flag | Default / effect |
|---|---|
| `--userns=mode` | precedence: pod userns → `PODMAN_USERNS` → `containers.conf` → `host`; empty string aliases `host` (`pages/markdown/podman-run.1.md:1470-1477`) |
| rootless mappings | `host`: `$UID`→container 0 (default); `keep-id`: `$UID`→`$UID`; `auto`/`nomap`: host UID unmapped; `keep-id:uid=…,gid=…` overrides (`pages/markdown/podman-run.1.md:1479-1493`) |
| `--user, -u=user[:group]` | image `USER` or root; with a userns, container UIDs differ from host UIDs (`pages/markdown/podman-run.1.md:1466-1469`) |
| `--group-add=group\|keep-groups` | `keep-groups` passes the *calling process's* supplementary groups; crun-only, exclusive of other groups, and stale in systemd user services until the manager restarts (`pages/markdown/podman-run.1.md:397-406`) |
| `--uidmap`, `--gidmap`, `--subuidname`, `--subgidname` | explicit mappings; conflict with `--userns` / each other as documented (`pages/markdown/podman-run.1.md:1477-1478`, `:388-396`) |
| `--passwd`, `--passwd-entry`, `--group-entry` | control `/etc/passwd`/`/etc/group` entries when `--user` is set (`pages/markdown/podman-run.1.md:877-882`, `:413-415`) |

Deterministic production invocation (derived from the defaults and boundaries above):
```bash
podman run -d --name api --replace --pull=never --read-only \
  --cap-drop=ALL --security-opt=no-new-privileges --userns=keep-id \
  --network=ci-net --publish=127.0.0.1:8080:8080 \
  --cpus=2 --memory=1g --pids-limit=512 --ulimit=nofile=4096:4096 \
  --env-file=/etc/api/env --secret=api_token,type=env \
  --mount=type=bind,src=/srv/data,dst=/data,ro=true,relabel=shared \
  --log-driver=journald --log-opt=tag=api --log-opt=max-size=100m \
  --health-cmd='/usr/local/bin/ready' --health-interval=10s \
  --health-retries=3 --health-on-failure=stop --sdnotify=healthy \
  --init=true --conmon-pidfile=/run/api.conmon.pid \
  registry.example.com/team/api@sha256:<digest>
podman wait --condition=healthy api
```

## Pitfalls

- `--pull=newer` compares digests; a tag moved to different content is "newer" even if timestamps are older.
- `--read-only` still leaves rw tmpfs unless `--read-only-tmpfs=false`; claiming "totally read-only" requires the latter.
- `--health-on-failure=restart` conflicts with `--restart`; in systemd use `kill`/`stop` and let `Restart=` win.
- `--creds` does not authenticate mirrors — use an auth file when `registries.conf` rewrites the registry.
- `--group-add=keep-groups` reflects groups at service-manager start, not at container start.
- `--cert-dir`, `--conmon-pidfile`, `--pidfile` and `passthrough` logging are unavailable on remote clients.

## Sources

- https://docs.podman.io/en/latest/markdown/podman-run.1.html — `pages/markdown/podman-run.1.md:97-117`, `:134-139`, `:162-167`, `:187-190`, `:230-304`, `:363-435`, `:441-480`, `:526-611`, `:628-746`, `:750-758`, `:780-837`, `:874-933`, `:935-989`, `:995-1057`, `:1082-1129`, `:1133-1230`, `:1421-1535`, `:2018-2026`
- https://docs.podman.io/en/latest/markdown/podman.1.html — `pages/markdown/podman.1.md:15-20`
