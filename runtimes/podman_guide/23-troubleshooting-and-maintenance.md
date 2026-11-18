# 23 — Troubleshooting and maintenance

Pinned to Podman v6.2.0 (`055de046`); v6 removed BoltDB, so storage/database diagnostics differ
from 4.x/5.x. Work from the least destructive check to the most destructive; `system reset` and
`machine reset` are data-loss operations.

## 1. Safe recovery order

| Step | Action | Data risk |
|---|---|---|
| 1 | Capture evidence: `podman info`, `podman version`, `podman --log-level=debug <cmd>`, `journalctl -t podman`, `dmesg` | none |
| 2 | Non-mutating checks: `podman system df`, `podman system check` (without `--repair`) | none |
| 3 | Config audit: `podman info` fields + config paths (§3) | none |
| 4 | Restart affected units/containers; `podman system service` socket activation | container downtime |
| 5 | `podman system migrate` (subuid/subgid, runtime, BoltDB→SQLite) | stops containers/pause process; no data loss expected |
| 6 | `podman system renumber` after `num_locks` change | requires no concurrent Podman processes |
| 7 | `podman system check --repair [--force]` | deletes damaged images and, with `--force`, dependent containers |
| 8 | `podman system reset --force` | deletes **all** containers, pods, images, networks, volumes, build cache, machines and graphRoot/runRoot |

Never start at step 7 or 8. `system reset` must run **before** changing `driver`, `static_dir`,
`tmp_dir` or `volume_path`, and must be run before editing config, because it reads the current
configuration to find what to remove
(`pages/markdown/podman-system-reset.1.md:9-15`); it does not restart `podman.service`/
`podman.socket` (`pages/markdown/podman-system-reset.1.md:15`). The legacy DB is not removed by
`--migrate-db`, so no data loss should occur even on failure
(`pages/markdown/podman-system-migrate.1.md:19-27`).

## 2. Symptom → cause → action

| Symptom | Likely cause | Action |
|---|---|---|
| `permission denied` creating containers; UID mapping errors | missing/overlapping `/etc/subuid` `/etc/subgid` ranges | add non-overlapping ranges with `usermod --add-subuids/--add-subgids`, then `podman system migrate` as the user |
| Rootless container cannot reach host or internet; intermittent multi-route failure | `passt`/pasta absent, or multiple default-route candidates | install `passt`; set `pasta_options` / `-i <iface>`; note pasta has no NAT by default; 5.3 fixed container↔host |
| Resource limits ignored, cgroup errors | cgroups v1 rootless or manager mismatch | verify `host.cgroupVersion`/`cgroupManager` in `podman info`; use cgroups v2 + `systemd`; avoid mixing `cgroupfs`/`systemd` on existing containers |
| Read-only/denied bind mounts on SELinux hosts | wrong or missing mount label | use `:z` (shared) or `:Z` (private); `:Z` only when the volume is not shared; `label=disable` is a trust escape |
| Driver mismatch after upgrade or config edit | changed `driver`/`static_dir`/`tmp_dir`/`volume_path` without reset | run `podman system reset` **before** the config change, then recreate state; verify `store.graphDriverName` |
| Rootless filesystem errors on Ecryptfs/ext4 home, overlay failures | unsupported backing FS for overlay; no `fuse-overlayfs` | install `fuse-overlayfs` and set `[storage.options.overlay] mount_program="/usr/bin/fuse-overlayfs"` or use `vfs`; `podman system reset` to switch |
| `address already in use` on `-p` | host port reserved by another process or stale container | `podman ps -a`, `podman port`, `ss -ltnp`; rootless pasta always binds each port; rootful port reservation can be disabled but conflicts then go unnoticed |
| Remote CLI fails: `connection refused`, auth errors, wrong host | wrong `CONTAINER_HOST`/`CONNECTION`/`--url`, missing identity, remote socket permissions | `podman info --format '{{.Host.RemoteSocket.Path}}'`, `podman system connection list`, check SSH key precedence and TLS |
| Docker client cannot find socket | `DOCKER_HOST` unset or machine helper not installed | export `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` or install the helper; on machine, check API forwarding socket |
| macOS/Windows machine will not start, wrong pods visible | two machines running, or rootful/rootless switched | one VM at a time; `machine set --rootful[=false]` changes visible storage (old data retained in the other user); check host/machine version parity |
| `podman compose` behaves differently between hosts | different provider chosen (`docker-compose` wins if installed) | pin `compose_providers` or `PODMAN_COMPOSE_PROVIDER`; check `compose_warning_logs` |
| Container restarts in a loop | `--health-on-failure=restart` combined with `--restart`, or failing startup probe | inspect `.Config.HealthcheckOnFailureAction`; prefer systemd `Restart=`; tune `--health-start-period`/startup retries |
| Logs missing, truncated, or huge | `log-driver=none`/passthrough, rotation misconfigured, journald retention | `podman info --format '{{.Host.LogDriver}}'`; bound with `max-size`/`max-file`/`log-rotate`; ship journald off-host |
| Podman refuses to start after upgrade | BoltDB database needs migration | `podman system migrate --migrate-db` after stopping services/Quadlets; reboot also migrates |

Sources: `samples/rootless_tutorial.md:19-28`, `:30-59`, `:205-230`;
`pages/markdown/podman-network.1.md:57-65`; `samples/containers.conf:528-536`, `:916-932`;
`pages/markdown/podman-system-reset.1.md:37-48`; `pages/markdown/podman-run.1.md:435-440`,
`:699-701`, `:1039-1051`, `:586-619`; `pages/markdown/podman-system-service.1.md:47-52`;
`pages/markdown/podman-machine-set.1.md:28-39`; `pages/markdown/podman-machine-init.1.md:28-30`;
`pages/markdown/podman-compose.1.md:6-9`; `pages/markdown/podman-system-migrate.1.md:19-27`.

## 3. Diagnostic commands and what they prove

`--log-level=debug` is a root-level flag: it must precede the subcommand; levels are
`debug`, `info`, `warn`, `error`, `fatal`, `panic` (local default `warn`)
(`pages/markdown/podman.1.md:19-20`, `:63-64`). On remote clients, `--syslog` redirects logs to
`$HOME/.config/containers/podman.log` (`pages/markdown/podman.1.md:105-107`).

Derived evidence bundle:
```bash
podman info --format '{{.Host.CgroupVersion}} {{.Host.CgroupManager}} {{.Store.GraphDriverName}}'
podman info --format '{{.Host.Security.Rootless}} {{.Host.ServiceIsRemote}} {{.Host.LogDriver}}'
podman version --format '{{.Client.Version}} {{.Server.Version}}'
podman --log-level=debug ps -a
journalctl -t podman --since '30 min ago' -o short-iso
dmesg --ctime | tail -50
```

`podman info` YAML/JSON exposes `cgroupVersion`, `cgroupManager`, `cgroupControllers`,
`logDriver`, `remoteSocket.path`, `security.rootless/seccompEnabled/selinuxEnabled`,
`graphDriverName` and runtime versions — the authoritative snapshot for a bug report
(`pages/markdown/podman-info.1.md:29-110`, `:160-235`). Config precedence is
`/usr/share/containers/containers.conf` → `/etc/containers/containers.conf` →
`$XDG_CONFIG_HOME/containers/containers.conf`; storage.conf is `/etc/containers/storage.conf` →
`$XDG_CONFIG_HOME/containers/storage.conf`, and rootless ignores system `graphroot`/`runroot`
in favor of `$XDG_DATA_HOME/containers/storage` and `$XDG_RUNTIME_DIR/containers`
(`samples/rootless_tutorial.md:110-154`). Verify effective values with `podman info`, not by
reading only one file.

## 4. Maintenance commands in detail

| Command | What it changes | Guardrails |
|---|---|---|
| `podman system check [-q] [-r] [-m DUR] [-f]` | verifies storage; `--repair` removes damaged images, `--force` also removes dependent containers, `--max` treats old unused layers as damaged | `--quick` skips slow checks; inspect before `--repair` |
| `podman system renumber` | reallocates container/pod lock numbers after `num_locks` change | mandatory after the change; avoid concurrent Podman processes or startup errors |
| `podman system migrate` | migrates containers to current version; stops containers + pause process so new subuid/subgid mappings apply | `--migrate-db` for BoltDB→SQLite (required in v6); `--new-runtime` to move containers between OCI runtimes with no compatibility guarantee |
| `podman system reset [-f]` | wipes containers, pods, images, networks, volumes, cache, machines, graphRoot/runRoot | run before changing `driver`/`static_dir`/`tmp_dir`/`volume_path`; restart systemd units manually |
| `podman machine reset [-f]` | stops and deletes all machines, config and data files/disk images | machine-only; unrelated to host container storage |

Sources: `pages/markdown/podman-system-check.1.md:5-28`;
`pages/markdown/podman-system-renumber.1.md:5-10`;
`pages/markdown/podman-system-migrate.1.md:5-31`;
`pages/markdown/podman-system-reset.1.md:5-15`;
`pages/markdown/podman-machine-reset.1.md:5-13`.

Derived maintenance sequence for a subuid change (admin + user):
```bash
sudo usermod --add-subuids 200000-265535 --add-subgids 200000-265535 deploy
sudo -u deploy podman system migrate
sudo -u deploy podman info --format json | jq '.host.idMappings'
```

`usermod` plus `migrate` is the documented path; the pause process otherwise keeps old
namespaces alive (`samples/rootless_tutorial.md:50-59`;
`pages/markdown/podman-system-migrate.1.md:8-17`). For adding locks, edit `num_locks`, then run
`podman system renumber` before any other Podman invocation
(`pages/markdown/podman-system-renumber.1.md:7-10`).

## Pitfalls

- `system reset` is destructive and configuration-dependent: change `driver`/paths **after** reset, not before.
- `system check --repair --force` can delete containers still running under another engine; `--quick` misses some errors.
- `system renumber` is mandatory after `num_locks` changes; skipping it breaks startup.
- v6 cannot use a legacy BoltDB database without `system migrate --migrate-db` (or a reboot).
- After subuid/subgid edits, the rootless pause process hides the change until `system migrate`.
- Rootless ignores system `graphroot`/`runroot`; investigate `$XDG_DATA_HOME`/`$XDG_RUNTIME_DIR` instead.
- Pasta performs no NAT by default and needs a single valid default route (or `pasta_options` with `-i`).
- Disabling rootful port reservation saves memory but hides port conflicts.
- `--log-level=debug` and `--syslog` placement matters: both are global flags before the subcommand; on remote clients logs land in `podman.log`.
- `machine reset` deletes every machine and its data; use `machine rm <name>` for a single VM.

## Sources

- `pages/markdown/podman.1.md:19-20`, `:63-64`, `:105-107`
- `pages/markdown/podman-info.1.md:29-110`, `:160-235`
- `pages/markdown/podman-system-check.1.md:5-28`
- `pages/markdown/podman-system-renumber.1.md:5-10`
- `pages/markdown/podman-system-reset.1.md:5-48`
- `pages/markdown/podman-system-migrate.1.md:5-31`
- `pages/markdown/podman-system-df.1.md:5-12`
- `pages/markdown/podman-machine-reset.1.md:5-25`
- `pages/markdown/podman-machine-set.1.md:28-39`
- `pages/markdown/podman-machine-init.1.md:28-30`
- `pages/markdown/podman-network.1.md:57-65`
- `pages/markdown/podman-compose.1.md:6-9`
- `pages/markdown/podman-run.1.md:435-440`, `:586-619`, `:699-701`, `:1039-1051`
- `pages/markdown/podman-system-service.1.md:47-52`
- `samples/rootless_tutorial.md:19-59`, `:110-154`, `:205-230`
- `samples/containers.conf:528-536`, `:916-932`
- https://docs.podman.io/en/latest/markdown/podman-system-check.1.html
- https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
