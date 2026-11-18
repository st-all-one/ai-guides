# 18 — Quadlet, systemd and auto-update

Quadlet is a **systemd generator**, not a container engine: it reads declarative files at boot or
`daemon-reload` and emits ordinary `.service` units wrapping `podman run`, `kube play`, etc.
(`samples/podman-systemd.unit.5.md:50-70`). Generated units are transient: `systemctl enable` does
not work on them; the generator applies the source file's `[Install]` section instead
(`samples/podman-systemd.unit.5.md:134-155`). Scope: v6.2.0; cgroup v2 is required
(`samples/podman-systemd.unit.5.md:113`).

## 1. Unit types and search paths

| Extension | Generates | Required key(s) | Source |
|---|---|---|---|
| `.container` | one `podman run` service | `Image=` | `samples/podman-systemd.unit.5.md:347-357` |
| `.pod` | pod creation service (`systemd-$name` pod) | `[Pod]` section | `samples/podman-systemd.unit.5.md:1103-1117` |
| `.network` | one-shot `podman network create` | `[Network]` section | `samples/podman-network.unit.5.md.in:13-15`, `samples/podman-systemd.unit.5.md:1515-1534` |
| `.volume` | one-shot `podman volume create` | `[Volume]` section | `samples/podman-systemd.unit.5.md:1689-1707` |
| `.kube` | `podman kube play` service | `Yaml=` | `samples/podman-systemd.unit.5.md:1355-1363` |
| `.image` | one-shot image pull | `Image=`/`ImageTag=` | `samples/podman-systemd.unit.5.md:2111-2143` |
| `.build` | one-shot `podman build` | `ImageTag=` + `File=` or `SetWorkingDirectory=` | `samples/podman-systemd.unit.5.md:1833-1842` |

`.artifact` also exists but is explicitly experimental (`samples/podman-systemd.unit.5.md:2271-2273`).
Duplicate names resolve by directory precedence; `/run` overrides `/etc` overrides `/usr/share/containers/systemd/` (distribution units).

Source: `samples/podman-systemd.unit.5.md:19-29`
```text
### Podman rootful unit search path

Quadlet files for the root user can be placed in the following directories ordered in precedence. Meaning duplicate named quadlets found under /run take precedence over ones in /etc, as well as those in /usr:

Temporary quadlets, usually used for testing:

* /run/containers/systemd/

System administrator's defined quadlets:

* /etc/containers/systemd/
```

Source: `samples/podman-systemd.unit.5.md:37-44`
```text
Quadlet files for non-root users can be placed in the following directories:

 * $XDG_RUNTIME_DIR/containers/systemd/
 * $XDG_CONFIG_HOME/containers/systemd/ or ~/.config/containers/systemd/
 * /etc/containers/systemd/users/${UID}
 * /etc/containers/systemd/users/
 * /usr/share/containers/systemd/users/${UID}
 * /usr/share/containers/systemd/users/
```

Files under `/etc/containers/systemd/users/` run for every user at session start; the `${UID}`
variant only for that UID, and subdirectories are searched recursively
(`samples/podman-systemd.unit.5.md:83-92`). A rootless Quadlet requires a real user account —
systemd `User=`/`Group=`/`DynamicUser=` in a system unit does not make it rootless
(`samples/podman-systemd.unit.5.md:94-98`).

Source: `samples/podman-quadlet-basic-usage.7.md:59-60`
```text
Note quadlet services cannot be enabled as they are a generated systemd unit,
see [podman-systemd.unit(5)](podman-systemd.unit.5.md#enabling-unit-files) for more information.
```

## 2. Key mapping: systemd directives to Podman flags

Each Quadlet section has one custom table (`[Container]`, `[Pod]`, `[Kube]`, …); all other tables
(`[Unit]`, `[Service]`, `[Install]`) pass through to systemd untouched
(`samples/podman-systemd.unit.5.md:60-70`).

Source: `samples/podman-container.unit.5.md.in:38-44`
```text
| **[Container] options**              | **podman run equivalent**                            |
|--------------------------------------|------------------------------------------------------|
| AddCapability=CAP                    | --cap-add CAP                                        |
| AddDevice=/dev/foo                   | --device /dev/foo                                    |
| AddHost=example\.com:192.168.10.11   | --add-host example.com:192.168.10.11                 |
| Annotation="XYZ"                     | --annotation "XYZ"                                   |
| AutoUpdate=registry                  | --label "io.containers.autoupdate=registry"          |
```

| `[Container]` key | Podman flag / systemd effect | Source |
|---|---|---|
| `Image=`, `Rootfs=` | image argument / `--rootfs` | `samples/podman-systemd.unit.5.md:402`, `:427` |
| `Exec=…` | arguments appended after `podman run <image>`; interacts with image `ENTRYPOINT`/`CMD` | `samples/podman-systemd.unit.5.md:579-592` |
| `Entrypoint=`, `User=`, `WorkingDir=` | `--entrypoint`, `--user`, `--workdir` | `samples/podman-systemd.unit.5.md:557`, `:1071`, `:1097` |
| `Environment=`, `EnvironmentFile=`, `EnvironmentHost=` | `--env`, `--env-file`, `--env-host` | `samples/podman-systemd.unit.5.md:563-578` |
| `Volume=`, `Mount=`, `ImageVolume=`, `Tmpfs=` | `--volume`, `--mount`, `--image-volume`, `--tmpfs` | `samples/podman-systemd.unit.5.md:746`, `:788`, `:1084`, `:1035` |
| `Network=`, `PublishPort=`, `NetworkAlias=` | `--network`, `--publish`, `--network-alias` | `samples/podman-systemd.unit.5.md:803`, `:875`, `:822` |
| `Pod=`, `StartWithPod=` | `--pod`; pod controls start/stop with the container | `samples/podman-systemd.unit.5.md:854`, `:986-994` |
| `ReadOnly=`, `NoNewPrivileges=`, `DropCapability=`, `SeccompProfile=` | `--read-only`, `no-new-privileges`, `--cap-drop`, `--security-opt seccomp=` | `samples/podman-systemd.unit.5.md:898-901`, `:831`, `:546`, `:943-946` |
| `Secret=`, `Label=`, `Annotation=` | `--secret`, `--label`, `--annotation` | `samples/podman-systemd.unit.5.md:948-952`, `:762`, `:487` |
| `LogDriver=`, `LogOpt=`, `Pull=`, `Retry=` | `--log-driver`, `--log-opt`, `--pull`, `--retry` | `samples/podman-systemd.unit.5.md:769-779`, `:893-897`, `:922-924` |
| `HealthCmd=`, `HealthInterval=`, `HealthRetries=`, `HealthLogDestination=` | health flags; log destination `local`/directory/`events_logger` (default `local`, 5 entries, 500 chars) | `samples/podman-systemd.unit.5.md:638-668` |
| `ContainerName=`, `PodName=`, `NetworkName=`, `VolumeName=`, `ServiceName=` | resource / unit naming; default resource name is `systemd-<unit>` | `samples/podman-systemd.unit.5.md:353-355`, `:1110-1112`, `:1648`, `:1826-1831`, `:973` |
| `PodmanArgs=`, `GlobalArgs=` | raw flags at end of command / between `podman` and subcommand (escape hatches; generator cannot validate interactions) | `samples/podman-systemd.unit.5.md:862-873`, `:608` |
| `[Quadlet] DefaultDependencies=false` | drop implicit `network-online.target` / `podman-user-wait-network-online.service` ordering | `samples/podman-systemd.unit.5.md:2387-2406` |

Network units have their own mapping (`DisableDNS` → `--disable-dns`, `Internal` → `--internal`,
`Subnet`/`Gateway`/`IPRange`/`IPv6`/`Driver` → the matching `podman network create` flags), and a
`.network` is named `systemd-$NAME` unless `NetworkName=` is set; stopping its service does not
delete the network unless `NetworkDeleteOnStop=true`, and changing parameters requires manually
removing and recreating it (`samples/podman-network.unit.5.md.in:40-59`).

Source: `samples/podman-network.unit.5.md.in:17-20`
```text
By default, the Podman network has the same name as the unit, but with a `systemd-` prefix, i.e. for
a network file named `$NAME.network`, the generated Podman network is called `systemd-$NAME`, and
the generated service file is `$NAME-network.service`. The `NetworkName` option allows for
overriding this default name with a user-provided one.
```

## 3. Auto-update and health-driven restart

Source: `samples/podman-systemd.unit.5.md:500-504`
```text
Indicates whether the container will be auto-updated ([podman-auto-update(1)](podman-auto-update.1.md)). The following values are supported:

* `registry`: Requires a fully-qualified image reference (e.g., quay.io/podman/stable:latest) to be used to create the container. This enforcement is necessary to know which image to actually check and pull. If an image ID was used, Podman does not know which image to check/pull anymore.

* `local`: Tells Podman to compare the image a container is using to the image with its raw name in local storage. If an image is updated locally, Podman simply restarts the systemd unit executing the container.
```

| Mechanism | Behavior | Source |
|---|---|---|
| `AutoUpdate=registry` | Compare local digest with registry digest; pull and restart the **systemd unit** on change | `pages/markdown/podman-auto-update.1.md:11-17` |
| `AutoUpdate=local` | Compare with local raw-name image; restart unit if digests differ | `pages/markdown/podman-auto-update.1.md:18-19` |
| `AutoUpdate=name/(local\|registry)` (`.kube` only) | Per-container policy in a kube unit | `samples/podman-systemd.unit.5.md:1386-1395` |
| Label alternative | `io.containers.autoupdate[/$container]`, `image` is a legacy alias for `registry` | `pages/markdown/podman-auto-update.1.md:10-12`, `:22-26` |
| Timer | `podman-auto-update.service` runs daily at midnight via `podman-auto-update.timer`; manual `systemctl start` also works | `pages/markdown/podman-auto-update.1.md:27-30` |
| Safety | `--dry-run` reports `pending`; `--rollback` (default `true`) reverts after a failed unit restart; readiness detection needs `--sdnotify=container` + `systemd-notify --ready` | `pages/markdown/podman-auto-update.1.md:37-39`, `:116-122` |

`Exec=` appends arguments rather than replacing the image command, so a finite `Exec=` (e.g.
`Exec=sleep 60`) terminates; pair it with `[Service] Restart=always` to rerun, or set
`Type=oneshot` + `RemainAfterExit=yes` deliberately (`samples/podman-systemd.unit.5.md:579-592`,
`:115-127`, `:2446-2455`). `HealthOnFailure=kill` is the action that integrates best with systemd:
unhealthy → killed → systemd restarts the service (`samples/podman-systemd.unit.5.md:670-676`).
Never use Podman's `--restart` for a container managed by a systemd unit; set `Restart=` in
`[Service]` instead (`pages/markdown/podman-run.1.md:1039-1050`). Pod units default to
`Restart=on-failure` and `ExitPolicy=stop` exits cleanly, so automatic restart needs
`Restart=always` (`samples/podman-systemd.unit.5.md:1114-1117`).

derived deterministic `.container` unit (registry pin + bounded logs + health + systemd restart):
```ini
[Unit]
Description=API service

[Container]
Image=registry.example.com/team/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
Network=app.network
LogDriver=journald
HealthCmd=/usr/local/bin/ready
HealthInterval=10s
HealthRetries=3
HealthOnFailure=kill
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## 4. `podman quadlet` CLI and validation workflow

| Subcommand | Purpose | Source |
|---|---|---|
| `podman quadlet list` (`ls`) | List installed quadlets | `pages/markdown/podman-quadlet.1.md:15-17` |
| `podman quadlet print NAME.container` (`cat`) | Print the selected file **including comments** — confirms which search-path file wins | `pages/markdown/podman-quadlet.1.md:18-20`, `pages/markdown/podman-quadlet-print.1.md:6-14` |
| `podman quadlet install` | Install a Quadlet file or application | `pages/markdown/podman-quadlet.1.md:12-14` |
| `podman quadlet rm` | Remove an installed quadlet | `pages/markdown/podman-quadlet.1.md:21-23` |

derived author → validate → activate loop (repeat `daemon-reload` after **every** file edit):
```bash
podman quadlet print api.container
systemd-analyze --user --generators=true verify api.service
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun
systemctl --user daemon-reload
systemctl --user start api.service
journalctl --user -u api.service -n 50
```

A "Unit not found" error usually means the generator rejected the file (wrong option/version);
`systemd-analyze … verify` and the generator's `--dryrun` expose the parse error
(`samples/podman-systemd.unit.5.md:273-305`). Drop-ins follow systemd rules
(`foo.container.d/*.conf`, top-level `container.d`, dash-truncated names with increasing
specificity) and may carry `[Install]` keys (`samples/podman-systemd.unit.5.md:72-81`, `:152-155`).

## 5. Rootless services, boot ordering and legacy generation

Quadlet adds `After=`/`Wants=` on `network-online.target` (root) or
`podman-user-wait-network-online.service` (user) so image pulls have network
(`samples/podman-systemd.unit.5.md:307-319`). Use `WantedBy=multi-user.target` (system) or
`default.target` (user) in `[Install]` for boot/session start; the generator applies it because
the generated unit cannot be enabled (`samples/podman-systemd.unit.5.md:134-155`, `:2457-2459`).
Dependencies between Quadlets are declared in `[Unit]` (`After=`, `Requires=`, `BindsTo=`, `PartOf=`,
`Before=`, …) and translated by the generator (`samples/podman-systemd.unit.5.md:321-335`).
Mount sources get `RequiresMountsFor=` by default; `[Quadlet] SetMountsDependency=Wants|None` weakens
or removes that (`samples/podman-systemd.unit.5.md:2408-2429`). Pull/build time can exceed
systemd's 90 s default: add `[Service] TimeoutStartSec=900` (`samples/podman-systemd.unit.5.md:100-111`).

Rootless user services need a lingering login for boot-time execution:
`loginctl enable-linger <user>` (`pages/markdown/podman-generate-systemd.1.md:175-178`,
`pages/markdown/podman-system-service.1.md:78-80`). A derived one-off transaction (no Quadlet file)
can use `systemd-run --user --unit=NAME --property=Restart=on-failure podman run …` — a **systemd**
command, not a Podman subcommand; it is not covered by the captured Podman docs
(https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html).

`podman generate systemd` is deprecated: no new features, urgent fixes only; prefer Quadlet
(`pages/markdown/podman-generate-systemd.1.md:5-9`, `26-quick-reference.md`). Its `--new` mode
generates portable units that create/remove containers and sets `Restart=on-failure` by default;
`--restart-policy`/`--restart-sec` tune systemd, and mixing a container's own `--restart` with a
generated unit causes shutdown fights (`pages/markdown/podman-generate-systemd.1.md:42-56`,
`:94-127`). `--new` does not work for containers created via the REST API or `kube play`; for the
latter use the `podman-kube@.service` template with a systemd-escaped YAML path
(`pages/markdown/podman-generate-systemd.1.md:20-25`, `:42-44`). Legacy generated units are
installed into `/etc/systemd/system` or `$HOME/.config/systemd/user` and **then** enabled with
`systemctl enable` (`pages/markdown/podman-generate-systemd.1.md:160-178`).

## 6. Quadlet unit families beyond `.container`

| Unit | Purpose | Source |
|---|---|---|
| `.build` | one-shot service that builds an image from a Containerfile | `pages/markdown/podman-build.unit.5.md:2-7` |
| `.container` | run a container as a systemd service | `pages/markdown/podman-container.unit.5.md:2-7` |
| `.kube` | manage Kubernetes YAML through `podman kube play` as a service | `pages/markdown/podman-kube.unit.5.md:2-7` |
| `.network` | one-time command guaranteeing a named network exists | `pages/markdown/podman-network.unit.5.md:2-7` |
| `.volume` | one-time command guaranteeing a named volume exists | `pages/markdown/podman-volume.unit.5.md:2-7` |

The official basic-usage walkthrough gives step-by-step `.container`, port, volume and dependency
examples and explains the translation from unit files into systemd services
(`pages/markdown/podman-quadlet-basic-usage.7.md:2-7`). `.build` and `.kube` are newer units;
on a 5.x host, verify availability with `podman quadlet list` before depending on them.

## Pitfalls

- Quadlet services cannot be `systemctl enable`d; `[Install]` in the source file is the enable mechanism (`samples/podman-quadlet-basic-usage.7.md:59-60`).
- `HealthcheckOnFailureAction` is not a Quadlet key; the real key is `HealthOnFailure=` (`samples/podman-systemd.unit.5.md:670-676`).
- `HealthOnFailure=restart` conflicts with a Podman `--restart`; prefer `kill` + systemd `Restart=` (`samples/podman-systemd.unit.5.md:670-676`, `pages/markdown/podman-run.1.md:1039-1050`).
- `AutoUpdate=registry` rejects non-fully-qualified image names and image IDs (`samples/podman-systemd.unit.5.md:500-504`).
- A finite `Exec=` command ends the service; use `Restart=` or an explicit `Type=oneshot` (`samples/podman-systemd.unit.5.md:579-592`, `:121-127`).
- Pod `ExitPolicy=stop` exits 0, so the default `Restart=on-failure` never restarts it (`samples/podman-systemd.unit.5.md:1114-1117`).
- Stopping a `.network` service does not remove the network; editing its parameters requires manual removal/recreate (`samples/podman-network.unit.5.md.in:22-26`).
- Forgetting `daemon-reload` after editing a Quadlet leaves the old generated unit active (`samples/podman-systemd.unit.5.md:52-55`).
- Rootless units under a system unit's `User=` are unsupported; use the user search paths (`samples/podman-systemd.unit.5.md:94-98`).
- `podman quadlet print` shows the selected file, it does not validate flags — pair it with `systemd-analyze … verify` (`pages/markdown/podman-quadlet-print.1.md:6-7`, `samples/podman-systemd.unit.5.md:282-293`).

## Sources

- `samples/podman-systemd.unit.5.md:19-44`, `:50-155`, `:266-345`, `:347-457`, `:498-504`, `:579-592`, `:638-676`, `:862-924`, `:1103-1117`, `:1355-1513`, `:1689-1707`, `:1833-1842`, `:2111-2143`, `:2271-2273`, `:2387-2460` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`, `docs/source/markdown/podman-systemd.unit.5.md`
- `samples/podman-container.unit.5.md.in:38-44`, `samples/podman-network.unit.5.md.in:13-59`, `samples/podman-quadlet-basic-usage.7.md:9-14`, `:59-60` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`
- `pages/markdown/podman-quadlet.1.md:4-23`, `pages/markdown/podman-quadlet-print.1.md:6-14` — https://docs.podman.io/en/latest/markdown/podman-quadlet.1.html
- `pages/markdown/podman-generate-systemd.1.md:5-9`, `:20-25`, `:42-56`, `:94-127`, `:160-178` — https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- `pages/markdown/podman-auto-update.1.md:6-30`, `:37-39`, `:116-122`; `pages/markdown/podman-run.1.md:1039-1050`; `pages/markdown/podman-system-service.1.md:78-80` — https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html (used only for the derived `systemd-run` example)
