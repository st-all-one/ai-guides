# 19 — Remote API and service

Scope: Podman v6.2.0 (`055de046`), maintenance line v5.8.10. Every fact below is pinned to the
captured v6.2 man pages; other releases must be re-checked. The API is a transport for libpod,
not a separate daemon — the service process answers REST calls on a socket.

## 1. What the service exposes

`podman system service` creates a listening API service; it is a Linux-only command and is not
available when the CLI itself is already remote (macOS/Windows host, or any remote client)
(`pages/markdown/podman-system-service.1.md:6-12`). Two API families share the listener:

| API | Coverage | Version behavior |
|---|---|---|
| Docker-compatible layer | Docker **v1.40** API | versioned; server does not reject an unsupported version |
| Libpod (Podman-native) layer | full libpod surface | versioned; same non-rejection rule |

Native API docs: `https://docs.podman.io/en/latest/_static/api.html`
(`pages/markdown/podman-system-service.1.md:10-12`). The practical consequence for CI: a client
that sends an older or newer `v1.XX` path is not refused on version grounds — test the actual
operation, do not rely on version negotiation as a guard.

Only **one** listening socket per service process is supported
(`pages/markdown/podman-system-service.1.md:34`). The default endpoint without a URI argument:

| Mode | Endpoint | Systemd unit |
|---|---|---|
| rootful | `unix:///run/podman/podman.sock` | `/usr/lib/systemd/system/podman.service`, `podman.socket` |
| rootless | `unix://$XDG_RUNTIME_DIR/podman/podman.sock` | `/usr/lib/systemd/user/podman.service`, `podman.socket` |

`%t` in `ListenStream=%t/podman/podman.sock` expands to `$XDG_RUNTIME_DIR`
(`pages/markdown/podman-system-service.1.md:23-33`, `:36-41`). An explicit endpoint may be
`unix:///tmp/foobar.sock` or `tcp://localhost:8080` (`pages/markdown/podman-system-service.1.md:36-38`).

## 2. Socket activation and timeouts

Socket activation makes the service on-demand: a client connection starts `podman.service`,
and after `--time` seconds of inactivity the process exits and systemd marks the unit inactive
(`pages/markdown/podman-system-service.1.md:13-22`).

| Option | Default | Effect |
|---|---|---|
| `--time`, `-t` | `5` seconds | inactivity expiry; `0` = never expire |
| `--cors` | empty (headers disabled) | inject CORS headers into HTTP responses |
| `--tls-cert`, `--tls-key` | none | server cert/key pair (both required) |
| `--tls-client-ca` | none | require a client cert signed by this CA bundle |
| `service_timeout` in `containers.conf` | — | changes the default inactivity timeout |

Source for options: `pages/markdown/podman-system-service.1.md:54-70`. The shipped system **and**
user units raise `--log-level` from `error` to `info` to record each API call
(`pages/markdown/podman-system-service.1.md:35`).

Derived activation and direct-run examples:
```bash
systemctl --user enable --now podman.socket   # rootless, per user
loginctl enable-linger deploy                 # keep user socket after logout
sudo systemctl enable --now podman.socket     # rootful
podman system service --time 5                # direct, default socket, exits when idle
podman system service --time 0 unix:///var/run/mypodman.sock
```

The equivalent shipped commands are at `pages/markdown/podman-system-service.1.md:71-93`.
Without socket activation the service does not come back after the timeout
(`pages/markdown/podman-system-service.1.md:85-90`).

## 3. Security boundary

The API grants **full** Podman functionality, i.e. arbitrary code execution as the service user,
with no way to limit or audit individual calls. Its security model is the Unix socket plus file
permissions (`pages/markdown/podman-system-service.1.md:47-48`).

| Exposure | Verdict | Source |
|---|---|---|
| Unix socket, user-only permissions | intended boundary | `pages/markdown/podman-system-service.1.md:48` |
| `tcp://` without mutual TLS | strongly discouraged — even loopback exposes the API to any local user | `pages/markdown/podman-system-service.1.md:50-51` |
| Remote access over SSH forwarding | recommended; restrict the remote account | `pages/markdown/podman-system-service.1.md:52` |
| `tcp://` where TLS is impossible | at minimum set `--cors` | `pages/markdown/podman-system-service.1.md:53` |
| mTLS with `--tls-cert`/`--tls-key`/`--tls-client-ca` | authenticates client and server | `pages/markdown/podman-system-service.1.md:62-68` |

Container access to the socket requires mounting it and running with
`--security-opt label=disable` (`pages/markdown/podman-system-service.1.md:42-45`) — that
disables SELinux confinement for the whole container, so treat such a sidecar as trusted code.
There is no per-request authorization layer: a CI job that can reach the socket is effectively
the service user (`derived` from the no-limit/no-audit statement above). On macOS/Windows the
machine additionally listens for Docker API clients, including programmatic access
(`pages/installation.md:40-46`).

## 4. Connections, URLs and credential precedence

A remote client tunnels REST over SSH (default), TCP, or a local Unix socket; credentials can be
flags, environment variables, or `containers.conf`
(`pages/markdown/podman-remote.1.md:14-16`).

| Global flag | Effect |
|---|---|
| `--connection`, `-c` | named connection; forces `--remote=true`; uses **local** `containers.conf` |
| `--url` | service URL; forces `--remote=true` |
| `--identity` | SSH private key; prompts on encrypted key |
| `--remote`, `-r` | remote mode; defaults to true when `CONTAINER_HOST` is set |
| `--ssh=native` | use the installed SSH binary/config instead of Go SSH |
| `--tls-ca` / `--tls-cert` | verify server / present client certificate |

Sources: `pages/markdown/podman.1.md:33-40`, `:73-78`, `:95-97`, `:133-135`, `:108-113`;
`pages/markdown/podman-remote.1.md:18-35`.

| URL resolution (first wins) | Identity resolution (first wins) |
|---|---|
| command-line value | command-line value |
| `CONTAINER_HOST` | `CONTAINER_SSHKEY`, **only if `CONTAINER_HOST` is found** |
| `engine.service_destinations` in `containers.conf` (excluding `/usr/share/containers`) | `containers.conf` |
| `unix:///run/podman/podman.sock` | — |

Source: `pages/markdown/podman-remote.1.md:27-30`, `:48-53`; `pages/markdown/podman.1.md:147-152`.
With `--remote`, **only** `--url`, `--identity`, `--log-level`, `--connection` are honored as
global options (`pages/markdown/podman.1.md:201-205`). Most other settings come from the
**server's** `containers.conf`, except where a page documents local resolution
(`pages/markdown/podman.1.md:14-16`). `--log-level` default is `warn` locally
(`pages/markdown/podman.1.md:63-64`); the remote man page documents `error`
(`pages/markdown/podman-remote.1.md:31-32`) — test your client before relying on a level.

`system connection` subcommands: `add`, `list`, `default`, `remove`, `rename`
(`pages/markdown/podman-system-connection.1.md:17-35`). State lives in
`$XDG_CONFIG_HOME/containers/podman-connections.json` (default `$HOME/.config/containers`),
overridable with `PODMAN_CONNECTIONS_CONF`; the file is machine-managed and must not be edited by
hand — use `service_destinations` in `containers.conf` for declarative entries. Entries with
`ReadWrite=false` come from `containers.conf` and cannot be changed by these commands
(`pages/markdown/podman-system-connection.1.md:5-16`). Declarative destination keys include
`uri`, `identity`, `tls_cert`, `tls_key`, `tls_ca`
(`samples/containers.conf:756-776`).

Derived connection workflow:
```bash
podman system connection add lab \
  ssh://deploy@podman-host/run/user/1000/podman/podman.sock --identity ~/.ssh/id_ed25519
podman system connection list
podman system connection default lab
podman --connection lab info --format '{{.Host.RemoteSocket.Path}}'
podman system connection remove lab
```

`CONTAINER_HOST` schema: `ssh` (default; local Unix socket over SSH), `tcp` (explicitly
unencrypted/unauthenticated; optional `CONTAINER_PROXY`), `unix` (local socket). SSH/TCP port
defaults to 22; SSH paths must be explicit
(`pages/markdown/podman-remote.1.md:35-47`, `:54-60`). Environment variables:
`CONTAINER_CONNECTION` (default `--connection`), `CONTAINER_HOST` (default `--url`),
`CONTAINER_SSHKEY` (default `--identity`) — the first two imply remote mode
(`pages/markdown/podman.1.md:172-177`).

## 5. Verification and CI use

`podman info --format` accepts `json` or Go templates with capitalized fields (`.Host`,
`.Plugins`, `.Registries`, `.Store`, `.Version`); JSON output uses lowercase names
(`pages/markdown/podman-info.1.md:9-25`, `:345`). `serviceIsRemote` and `remoteSocket.path` in
the host block confirm where commands actually execute
(`pages/markdown/podman-info.1.md:101-113`).

Derived preflight for a remote CI job:
```bash
podman info --format '{{.Host.ServiceIsRemote}} {{.Host.RemoteSocket.Path}}'
podman version --format '{{.Client.Version}} {{.Server.Version}} {{.Server.APIVersion}}'
podman version --format '{{.Client.APIVersion}}'
```

`podman version` reports Remote API Version, Version, Go Version, Git Commit, Build Time, OS and
Architecture, with `.Client.*` / `.Server.*` template fields
(`pages/markdown/podman-version.1.md:6-18`, `:28-30`). A Docker-tool CI job can be pointed at the
same socket with `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock`
(`pages/markdown/podman-system-service.1.md:74-77`). Pin the identity and destination in the
CI job (not in a shared shell profile), keep the socket user-owned, and prefer SSH forwarding
over a network bind — the API boundary is the socket, not a token.

## 6. API documentation entry point

The `Reference` site page is the index for the current version's API documentation
(`pages/Reference.md:2`); use it to resolve endpoint details instead of guessing from CLI flags.
It is a pointer, not a contract: request/response behavior remains host-version dependent and
should be checked against the pinned release with `podman version`.

## Pitfalls

- No built-in API auth or call-level audit: socket permissions are the whole security model; a `tcp://` bind without mTLS exposes arbitrary code execution as the service user.
- `--url`/`--connection` force remote mode, where only four global flags apply; most defaults come from the server config.
- `CONTAINER_SSHKEY` is honored only when `CONTAINER_HOST` is also present; otherwise precedence falls to `containers.conf`.
- `--time 0` means no expiry: a directly launched service then runs indefinitely, unlike the on-demand systemd path.
- `--cors` is a mitigation for an unencrypted TCP bind, not authentication.
- Mounting the socket into a container requires `label=disable`, which removes SELinux confinement for that container.
- `podman-py`/REST clients see both API families; the Docker layer is v1.40 and neither layer rejects requests solely for a version mismatch — behavior must be tested.

## Sources

- `pages/markdown/podman-system-service.1.md:6-12`, `:13-41`, `:42-70`, `:71-93`
- `pages/markdown/podman-system-connection.1.md:5-40`
- `pages/markdown/podman-remote.1.md:14-60`, `:63-72`, `:175-184`
- `pages/markdown/podman.1.md:14-16`, `:33-40`, `:63-64`, `:73-78`, `:95-113`, `:130-205`
- `pages/markdown/podman-info.1.md:9-25`, `:101-113`, `:313-345`
- `pages/markdown/podman-version.1.md:6-30`
- `samples/containers.conf:756-776`
- `pages/installation.md:40-46`
- https://docs.podman.io/en/latest/_static/api.html
- https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- https://docs.podman.io/en/latest/markdown/podman-remote.1.html
