# 01 - engine-architecture

Docker Engine is a client/server system. A long-running `dockerd` daemon owns images, containers, networks and volumes; the `docker` CLI reaches it through the Engine API. This chapter pins the process model, socket and API surfaces, install and service management, version policy and daemon logs. Every claim resolves to a captured page line.

## Process model

The daemon delegates lifecycle work to containerd, which by default invokes runc as the OCI runtime; alternative runtimes plug in through containerd shims. `pages/engine/daemon/alternative-runtimes.md:4-13`

Process model (derived from the cited lines; no diagram):
| Process | Role | Evidence |
|---|---|---|
| `dockerd` | Owns API, images, networks, volumes; starts containerd | `pages/engine/daemon/start.md:27-34`, `pages/engine/daemon/embedded-containerd.md:4-6` |
| `containerd` | Manages container lifecycle: create, start, stop | `pages/engine/daemon/alternative-runtimes.md:4-6` |
| `runc` | Default OCI runtime used by containerd | `pages/engine/daemon/alternative-runtimes.md:4-6` |
| containerd shim | One per task; separate process even in embedded mode | `pages/engine/daemon/embedded-containerd.md:13-16`, `pages/engine/daemon/alternative-runtimes.md:10-13` |

Since Engine 29.7.0 an experimental `embedded-containerd` feature runs containerd inside the `dockerd` process over an in-memory connection while task shims stay separate. It is mutually exclusive with `cri-containerd`, keeps state under `/var/lib/docker/containerd/daemon`, and is enabled with `{"features": {"embedded-containerd": true}}` or `--feature embedded-containerd`. `pages/engine/daemon/embedded-containerd.md:4-6,13-28,54-66` Containers are stored in the `moby` containerd namespace by default. `pages/engine/daemon/embedded-containerd.md:95-96`

## Client, daemon and socket surfaces

By default the daemon listens on a Unix socket at `/var/run/docker.sock`, requiring `root` or `docker` group membership. It also supports `tcp` and `fd` sockets; TCP gives unencrypted, unauthenticated access unless TLS or a proxy secures it. Port `2375` is conventional for plain traffic, `2376` for TLS. `pages/reference/cli/dockerd.md:178-193`

A manual foreground start exposes the API binding through the emitted lines `+job serveapi(unix:///var/run/docker.sock)` and `Listening for HTTP on unix (/var/run/docker.sock)`. `pages/engine/daemon/start.md:37-41`

Remote access may be set through a systemd unit or `daemon.json`, but not both: configuring both prevents Docker from starting. `pages/engine/daemon/remote-access.md:22-28,66-69` The API is versioned; the captured history reaches v1.56, which adds an `annotation` filter on `GET /containers/json` and `HostConfig.Umask` on `POST /containers/create`. `pages/reference/api/engine/version-history.md:11-21`

A systemd drop-in adds a listener without touching `daemon.json` (where the Debian/Ubuntu unit's `-H` flag would conflict). `pages/engine/daemon/troubleshoot.md:94-99` The drop-in resets `ExecStart=` and sets `ExecStart=/usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375`. `pages/engine/daemon/remote-access.md:38-40` Verify with `netstat -lntp | grep dockerd`; the documented default TLS port is `2376`, plain `2375`. `pages/engine/daemon/remote-access.md:57-62,89-94`

## Install and upgrade path

Installation methods are: bundled in Docker Desktop, the distribution `apt` repository, manual `.deb` packages (manage upgrades yourself), or a convenience script recommended only for testing and development. `pages/engine/install/ubuntu.md:80-94` Setting up the repository once allows later install and update from it. `pages/engine/install/ubuntu.md:103-107` Upgrade is "follow step 2 of the installation instructions, choosing the new version"; the package path needs a new `.deb` each time. `pages/engine/install/ubuntu.md:207-217`

Deterministic pinning lists available versions, then sets `VERSION_STRING=5:29.10.0-1~ubuntu.24.04~noble` and installs `docker-ce=$VERSION_STRING` with `docker-ce-cli=$VERSION_STRING`. `pages/engine/install/ubuntu.md:162-163`

## Service management

On a typical install a system utility, not a user, starts the daemon so it restarts on reboot. `pages/engine/daemon/start.md:4-10` On Ubuntu/Debian it starts automatically; start manually with `sudo systemctl start docker` (`Ctrl+C` stops a foreground `dockerd`). `pages/engine/daemon/start.md:15-25,44-45` For systemd hosts without default boot start, enable `docker.service` and `containerd.service`. `pages/engine/install/linux-postinstall.md:230-231` Use `disable` instead to stop that behavior; unit files can add proxies or alternate runtime directories. `pages/engine/install/linux-postinstall.md:234-244`

## Version policy and daemon logs

A feature is labeled "deprecated" and remains for at least one stable release before removal, so operators must track each release's deprecation list. `pages/engine/deprecated.md:18-28` The captured line is Engine 28.x and 29.x: 28.5.2 shipped runc CVE fixes, while 29.10.0 is the newest 29.x entry. `pages/engine/release-notes/28.md:11-25`, `pages/engine/release-notes/29.md:11`

Daemon logs live in OS-specific locations — on Linux use `journalctl -xu docker.service` or `/var/log/syslog`/`/var/log/messages`. `pages/engine/daemon/logs.md:4-13` For structured daemon logs set `"log-format": "json"` (default `text`); do not set both the flag and the file key. `pages/reference/cli/dockerd.md:916-941` Enable debug via `"debug": true` and `SIGHUP`; force a stack trace with `SIGUSR1` without stopping the daemon. `pages/engine/daemon/logs.md:35-39,59-64,73-76` `docker info` reports kernel version and container/image counts. `pages/reference/cli/docker/system/info.md:16-24`

## Sources

- https://docs.docker.com/engine/daemon/start/
- https://docs.docker.com/engine/daemon/embedded-containerd/
- https://docs.docker.com/engine/daemon/alternative-runtimes/
- https://docs.docker.com/engine/daemon/remote-access/
- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/reference/api/engine/version-history/
- https://docs.docker.com/engine/install/ubuntu/
- https://docs.docker.com/engine/install/linux-postinstall/
- https://docs.docker.com/engine/deprecated/
- https://docs.docker.com/engine/release-notes/28/
- https://docs.docker.com/engine/release-notes/29/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/reference/cli/docker/system/info/
- https://docs.docker.com/engine/daemon/troubleshoot/
