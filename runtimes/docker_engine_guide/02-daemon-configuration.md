# 02 - daemon-configuration

Authoritative `daemon.json` keys must not be duplicated by flags. This chapter maps keys, precedence and the reload boundary.

## File, precedence, validation

Default Linux path is `/etc/docker/daemon.json` (Windows: `%programdata%\docker\config\daemon.json`); `--config-file` overrides it. `pages/reference/cli/dockerd.md:1085-1089,1237-1242` Keys mirror flag names, pluralized for repeatable flags (`labels` for `--label`). `pages/reference/cli/dockerd.md:1054-1057` Duplicating a key as a flag fails startup regardless of value; a systemd `-H` colliding with `hosts` is the common case. `pages/reference/cli/dockerd.md:1059-1065`, `pages/engine/daemon/troubleshoot.md:66-99` Direct daemon configuration outranks proxy environment variables. `pages/engine/daemon/proxy.md:20-31`

Validate before restart: `dockerd --validate --config-file=/tmp/valid-config.json` prints `configuration OK` and exits `0`; an invalid file returns non-zero. `pages/reference/cli/dockerd.md:1072-1076`

## Key map: `daemon.json` key to flag

| Key | Flag / meaning | Evidence |
|---|---|---|
| `data-root`, `exec-root` | daemon state / execution root | `pages/reference/cli/dockerd.md:1117,1147` |
| `storage-driver`, `storage-opts` | `--storage-driver`, `--storage-opt` | `pages/reference/cli/dockerd.md:1215-1216,340-342` |
| `registry-mirrors`, `insecure-registries` | pull mirrors / plaintext registries | `pages/reference/cli/dockerd.md:1167,1200` |
| `proxies` | `--http-proxy`, `--https-proxy` | `pages/reference/cli/dockerd.md:1159-1163,29-31` |
| `dns`, `dns-search`, `dns-opts` | `--dns`, `--dns-search` | `pages/reference/cli/dockerd.md:1143-1145,676-688` |
| `exec-opts` | `--exec-opt native.cgroupdriver=...` | `pages/reference/cli/dockerd.md:1146,644-652` |
| `live-restore` | `--live-restore` | `pages/reference/cli/dockerd.md:1175,38-41` |
| `log-driver`, `log-opts` | `--log-driver`, `--log-opt` | `pages/reference/cli/dockerd.md:1176-1188` |
| `log-format`, `log-level` | `--log-format`, `--log-level` | `pages/reference/cli/dockerd.md:916-941,1177-1178` |
| `ipv6`, `ip6tables` | `--ipv6`, `--ip6tables=false` | `pages/reference/cli/dockerd.md:1172-1173` |
| `userns-remap` | `--userns-remap` | `pages/reference/cli/dockerd.md:1225,823-836` |
| `features` | `--feature name[=bool]` | `pages/reference/cli/dockerd.md:1149-1152,1022-1031` |
| `hosts` | `-H` (conflicts with systemd unit) | `pages/reference/cli/dockerd.md:1158,1229-1235` |
| `default-runtime`, `runtimes` | runtime selection | `pages/reference/cli/dockerd.md:1133,1201-1211` |
| `no-new-privileges`, `seccomp-profile`, `selinux-enabled` | host security defaults | `pages/reference/cli/dockerd.md:1193,1212-1213` |
| `debug`, `tls`, `tlsverify` | debug and mutual TLS | `pages/reference/cli/dockerd.md:1118,1218-1222` |

## Storage and data root

`overlay2` is the default Linux driver; `fuse-overlayfs`, `btrfs` and `zfs` are alternatives, Windows only `windowsfilter`. `pages/reference/cli/dockerd.md:325-336` `data-root` relocates state; enabling `userns-remap` masks existing images and containers, and disabling it makes them inaccessible. `pages/engine/security/userns-remap.md:122-129` The `containerd-snapshotter` feature replaces classic storage drivers for image and container data. `pages/reference/cli/dockerd.md:1316-1319`

## Registry mirrors and proxies

The `proxies` object is the recommended daemon form and is ignored by Docker Desktop. Its fields are `http-proxy`, `https-proxy` and `no-proxy`; the documented example uses `http://proxy.example.com:3128` for both proxies and `*.test.example.com,.example.org,127.0.0.0/8` for exclusions. `pages/engine/daemon/proxy.md:34-40` Restart after editing with `sudo systemctl restart docker`. `pages/engine/daemon/proxy.md:43-47` Fallback variables are `HTTP_PROXY`, `http_proxy`, `HTTPS_PROXY`, `https_proxy`, `NO_PROXY`, `no_proxy`; a leading `.` in `NO_PROXY` matches subdomains only and `*` disables proxying. `pages/engine/daemon/proxy.md:49-59,124-136`

A systemd drop-in sets variables without touching `daemon.json`, using `Environment="HTTP_PROXY=http://proxy.example.com:3128"` under `[Service]`. `pages/engine/daemon/proxy.md:90-91` Rootless installs use `~/.config/systemd/<user>/docker.service.d/` with `systemctl --user`. `pages/engine/daemon/proxy.md:66-74,167-179` After `daemon-reload` and restart, verify with `systemctl show --property=Environment docker`. `pages/engine/daemon/proxy.md:147-161`

## DNS, cgroup driver, IPv6

Container-wide DNS uses `--dns` / `--dns-search` (`dns`, `dns-search` in JSON). `pages/reference/cli/dockerd.md:676-688` The cgroup driver is set through `exec-opts` with `sudo dockerd --exec-opt native.cgroupdriver=systemd`, accepting only `cgroupfs` or `systemd` (default `systemd` on cgroup v2 with systemd, `cgroupfs` on cgroup v1). `pages/reference/cli/dockerd.md:644-658`

IPv6 is Linux-only; the default bridge needs `"ipv6": true` plus `"fixed-cidr-v6": "2001:db8:1::/64"`, and `ip6tables` is on by default. `pages/engine/daemon/ipv6.md:4,63-95,183-184` Dynamic IPv6 allocation needs an IPv6 pool in `default-address-pools`; built-in pools contain none. `pages/engine/daemon/ipv6.md:122-157`

## Security-relevant features

Remapping is set through the file (recommended) or `--userns-remap`; the file value `"userns-remap": "testuser"` is typical, while `default` auto-creates `dockremap`, backed by `/etc/subuid` and `/etc/subgid`. `pages/engine/security/userns-remap.md:161-169` The daemon still runs as root under `userns-remap`; rootless mode unprivileges it. `pages/engine/security/userns-remap.md:18-24`

Live restore keeps containers running when the daemon stops, set with `"live-restore": true`. `pages/engine/daemon/live-restore.md:28-30` Prefer `systemctl reload docker` over a manual `--live-restore` start. `pages/engine/daemon/live-restore.md:33-41` It covers only patch upgrades, not major ones, breaks if bridge IPs or graph driver changed, and a long outage can fill the 64K FIFO buffer. `pages/engine/daemon/live-restore.md:43-69` `features` takes booleans; never combine `--feature` with the `features` key. `pages/reference/cli/dockerd.md:1022-1031` Known flags: `containerd-snapshotter`, `windows-dns-proxy`, experimental `embedded-containerd` (overrides `--containerd`). `pages/reference/cli/dockerd.md:1314-1325`, `pages/engine/daemon/embedded-containerd.md:30-52`

## Restart-safe change procedure

1. Validate the candidate file with `dockerd --validate --config-file=...`. `pages/reference/cli/dockerd.md:1067-1083`
2. Ensure no key duplicates a systemd-unit flag, especially `hosts`/`-H`. `pages/engine/daemon/troubleshoot.md:66-99`
3. Edit `daemon.json`; set a rotating default log driver (`json-file` is default and can rotate; `local` rotates by default). `pages/engine/install/linux-postinstall.md:246-263`
4. Run `systemctl daemon-reload`, then `systemctl reload docker` if reloadable, otherwise `systemctl restart docker`. `pages/engine/daemon/proxy.md:147-152`, `pages/engine/daemon/live-restore.md:33-36`
5. Reloadable keys: `debug`, `labels`, `live-restore`, `max-concurrent-downloads/-uploads`, `max-download-attempts`, `default-runtime`, `default-stop-timeout`, `runtimes`, `authorization-plugin`, `insecure-registries`, `registry-mirrors`, `shutdown-timeout`, `features`. `pages/reference/cli/dockerd.md:1330-1356`
6. Verify with `docker info`, `systemctl show --property=Environment docker`, and `journalctl -xu docker.service`. `pages/engine/daemon/proxy.md:154-161`, `pages/engine/daemon/logs.md:8-13`

## Sources

- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/engine/daemon/proxy/
- https://docs.docker.com/engine/daemon/live-restore/
- https://docs.docker.com/engine/daemon/ipv6/
- https://docs.docker.com/engine/security/userns-remap/
- https://docs.docker.com/engine/daemon/troubleshoot/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/engine/daemon/embedded-containerd/
- https://docs.docker.com/engine/install/linux-postinstall/
