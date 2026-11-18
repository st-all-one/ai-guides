# 16 — Compose: a provider wrapper, not a second engine

`podman compose` implements no Compose logic: it prepares the environment so an external provider
reaches the local Podman socket, then passes options, command and arguments straight through
(`pages/markdown/podman-compose.1.md:5-8`). The workload semantics therefore belong to the
**provider version**, while the container runtime, storage and security model stay Podman's.
Scope: v6.2.0; no container was executed to validate these examples.

Source: `samples/podman-compose.1.md.in:9-16`
```markdown
## DESCRIPTION
**podman compose** is a thin wrapper around an external compose provider such as docker-compose or podman-compose.  This means that `podman compose` is executing another tool that implements the compose functionality but sets up the environment in a way to let the compose provider communicate transparently with the local Podman socket.  The specified options as well as the command and argument are passed directly to the compose provider.

The default compose providers are `docker-compose` and `podman-compose`.  If installed, `docker-compose` takes precedence since it is the original implementation of the Compose specification and is widely used on the supported platforms (i.e., Linux, Mac OS, Windows).

If you want to change the default behavior or have a custom installation path for your provider of choice, please change the `compose_providers` field in the `[engine]` table of `containers.conf(5)` to `compose_providers = ["/path/to/provider"]`. You may also set the `PODMAN_COMPOSE_PROVIDER` environment variable.

By default, `podman compose` will emit a warning saying that it executes an external command. This warning can be disabled by setting `compose_warning_logs` to false in the `[engine]` table of `containers.conf(5)` or setting the `PODMAN_COMPOSE_WARNING_LOGS` environment variable to false. See the man page for `containers.conf(5)` for more information.
```

## 1. Provider selection and audit knobs

Resolution is *first found wins*: `compose_providers` is an ordered list; an absolute path,
relative path or bare executable name is accepted (`samples/containers.conf:472-475`). Keep the
choice explicit in CI and on hosts so a newly installed provider cannot silently change behavior.

| Knob | Scope | Effect |
|---|---|---|
| `compose_providers=[...]` | `[engine]` in `containers.conf` | Ordered provider candidates; first found executes (`samples/containers.conf:472-475`, `pages/markdown/podman-compose.1.md:8`) |
| `PODMAN_COMPOSE_PROVIDER` | environment | Overrides the configured provider/path (`pages/markdown/podman-compose.1.md:8`) |
| `compose_warning_logs` | `[engine]`, default `true` | Emit the "external command" warning on every invocation; set `false` only after the provider is pinned (`samples/containers.conf:477-479`, `pages/markdown/podman-compose.1.md:9`) |
| `PODMAN_COMPOSE_WARNING_LOGS=false` | environment | Same suppression without editing config (`pages/markdown/podman-compose.1.md:9`) |
| `podman compose --help` | CLI | Prints the **provider's** options, not a Podman flag set (`pages/markdown/podman-compose.1.md:10-11`) |

derived audit-first CI setup:
```bash
export PODMAN_COMPOSE_PROVIDER=/usr/local/bin/docker-compose
export PODMAN_COMPOSE_WARNING_LOGS=false   # keep the override visible in CI logs
podman compose --help                       # prove which provider was selected
podman compose config --quiet               # provider-side schema gate
```

## 2. Socket plumbing: what the provider actually talks to

The wrapper sets up the environment for the local Podman socket; a provider invoked **directly**
needs the same plumbing. Podman's API service exposes two layers: a Docker v1.40 compatibility
API and the native Libpod API (`pages/markdown/podman-system-service.1.md:6-12`).

Source: `pages/markdown/podman-system-service.1.md:74-84`
```text
Configure DOCKER_HOST environment variable to point to the Podman socket so that
it can be used via Docker API tools like docker-compose.
$ export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
$ docker-compose up
Configure the systemd socket to be automatically started after reboots, and run as the specified user.
systemctl --user enable podman.socket
loginctl enable-linger <USER>
Start the systemd socket for the rootful service.
sudo systemctl start podman.socket
Configure the socket to be automatically started after reboots.
sudo systemctl enable podman.socket
```

| Mode | Socket / activation | Consequence for compose |
|---|---|---|
| Rootless user | `systemctl --user start podman.socket`, `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` | Socket activated on demand; idle service expires (`pages/markdown/podman-system-service.1.md:13-25`, `:60-70`) |
| Rootful | `sudo systemctl start podman.socket` | System socket; Docker API compatibility still applies (`pages/markdown/podman-system-service.1.md:81-83`) |
| Direct CLI provider | wrapper normally injects its own environment | If bypassing `podman compose`, export `DOCKER_HOST` yourself (`pages/markdown/podman-compose.1.md:6`, `pages/markdown/podman-system-service.1.md:74-76`) |

derived socket readiness gate (run before any provider command in a service unit):
```bash
systemctl --user start podman.socket
test -S "$XDG_RUNTIME_DIR/podman/podman.sock"
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"
```

## 3. Deterministic Compose YAML

Compose YAML is only as reproducible as the provider's translation of each key. Pin every field
that would otherwise be discovered at run time; keep provider-specific keys out of the shared
baseline unless both providers are tested.

| Practice | Compose field | Podman equivalent / reason |
|---|---|---|
| Digest pinning | `image: registry.example.com/team/api@sha256:<digest>` | Removes tag re-resolution; default pull policy is `missing` (`pages/markdown/podman-run.1.md:985-989`) |
| No `latest` | forbid untagged `image:` values | `latest` is implicit for untagged references and triggers pulls (`pages/markdown/podman-kube-play.1.md:31`) |
| Explicit pull policy | `pull_policy: never` (provider support varies) | Four policies exist; `newer` compares digests, not timestamps (`pages/markdown/podman-run.1.md:985-989`) |
| Restart | `restart: unless-stopped` | Maps closest to systemd-managed restarts; never combine with a Podman `--restart` in a unit (`pages/markdown/podman-run.1.md:1039-1050`) |
| Healthcheck | `healthcheck: {test, interval, retries, start_period}` | `--health-cmd` is required before other health options apply; default interval 30 s (`pages/markdown/podman-run.1.md:416-425`) |
| Logging | `logging: {driver: journald, options: {tag: api}}` | Default driver is `journald`; bound rotation with `max-size`/`max-file` (`pages/markdown/podman-run.1.md:586-610`) |
| Secrets | `secrets:` + `secrets: {file: ...}` | `--secret` never stores the blob in the image (≤512 kB) (`pages/markdown/podman-run.1.md:1100-1103`) |
| Named, internal networks | `networks: {app: {name: app-net, internal: true}}` | Avoids implicit network creation and accidental exposure (`samples/podman-network.unit.5.md.in:17-26`) |
| Resource limits | `deploy.resources.limits.cpus/memory`, or provider-native equivalents | `--cpus` and `--memory` are cgroup-backed; rootless needs cgroups v2 (`pages/markdown/podman-run.1.md:230-234`, `:628-642`) |
| Hardening | `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]` | Harden by subtraction; `label=disable`/`seccomp=unconfined` are explicit escapes (`pages/markdown/podman-run.1.md:1133-1147`) |

derived minimal reproducible `compose.yaml` (all fields have a Podman-side meaning):
```yaml
services:
  api:
    image: registry.example.com/team/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    networks: [app]
    logging:
      driver: journald
      options: {tag: api}
    healthcheck:
      test: [CMD, /usr/local/bin/ready]
      interval: 10s
      retries: 3
    deploy:
      resources:
        limits: {cpus: "1.0", memory: 512M}
networks:
  app:
    name: app-net
    internal: true
```

## 4. Provider caveats: docker-compose vs podman-compose

The wrapper's precedence is fixed (`docker-compose` first) but neither provider is a Podman
subsystem; test the exact pair on the target host. The table separates documented facts from
operational consequences derived from those facts.

| Dimension | `docker-compose` (preferred) | `podman-compose` (fallback) | Basis |
|---|---|---|---|
| Transport | Docker API compatibility layer (`DOCKER_HOST`) | Podman CLI translation in the provider | Socket plumbing documented for Docker API tools (`pages/markdown/podman-system-service.1.md:10`, `:74-77`); wrapper contract (`pages/markdown/podman-compose.1.md:6`) |
| Spec coverage | Original Compose implementation, widely used on Linux/macOS/Windows | Coverage tracks the Python provider's implementation | Explicit precedence rationale (`pages/markdown/podman-compose.1.md:7`) |
| Unsupported API calls | Compatibility layer is Docker v1.40, not the full native API | No API layer; features must have a CLI equivalent | API version and dual layers (`pages/markdown/podman-system-service.1.md:10-12`) |
| Determinism | Compose-level `pull_policy`/digest behaviour must be checked per version | Same YAML can translate to different `podman run` flags | Options are passed through unmodified (`pages/markdown/podman-compose.1.md:6`) |
| Validation | `podman compose config` is provider-side | `podman compose config` is provider-side | `podman compose --help` is provider help (`pages/markdown/podman-compose.1.md:10-11`) |

derived rule: treat a Compose file as portable only after `config`, `up`, health and `down` pass
under the pinned provider; record the provider binary path and version in the deployment manifest.

## 5. Rootless networking and ports

A rootless provider inherits Podman's user-namespace and forwarding constraints; it cannot grant
itself privileges the unprivileged user does not have.

| Constraint | Detail | Source |
|---|---|---|
| Low host ports | Ports `< 1024` require rootful mode (shown for Podman machine) or a lowered `net.ipv4.ip_unprivileged_port_start`; use `>= 1024` + reverse proxy for rootless | `pages/markdown/podman-machine-start.1.md:36-40` |
| Forwarder | Rootless bridge uses `rootlessport` by default; `rootless_port_forwarder="pasta"` switches to kernel-level forwarding (experimental) | `pages/markdown/podman-kube-play.1.md:222` |
| Default rootless stack | `pasta` is the rootless networking default in the docs; only supported rootless | `pages/markdown/podman-kube-play.1.md:231-233` |
| SELinux volumes | `hostPath` is relabelled shared (`z`); bind mounts are not — pre-relabel with `chcon -t container_file_t -R <dir>` | `pages/markdown/podman-kube-play.1.md:28` |
| Identity ranges | Non-overlapping `/etc/subuid`/`/etc/subgid` plus `podman system migrate` after changes | `samples/rootless_tutorial.md` |

## 6. CI pattern and the `kube play` alternative

derived rootless CI deployment (deterministic provider, explicit schema gate, explicit teardown):
```bash
set -euo pipefail
export PODMAN_COMPOSE_PROVIDER=/usr/local/bin/docker-compose
export PODMAN_COMPOSE_WARNING_LOGS=false
systemctl --user start podman.socket
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"
podman compose config --quiet
podman compose up -d --remove-orphans
podman compose ps
# rollback path: podman compose down --remove-orphans
```

If the workload is already expressed as Kubernetes YAML, avoid a provider entirely:
`podman kube play --validate=strict --replace workload.yaml` recreates the pods from the same
file, and `podman kube down workload.yaml` tears them down (`pages/markdown/podman-kube-play.1.md:372-380`,
`:307-308`, `pages/markdown/podman-kube-down.1.md:5-8`). See `17-kubernetes-and-kube-play.md`.

## Pitfalls

- `podman compose` has no flags of its own: options after `compose` belong to the provider (`pages/markdown/podman-compose.1.md:10-11`).
- Installing `docker-compose` changes provider precedence unless `PODMAN_COMPOSE_PROVIDER` or `compose_providers` pins it (`pages/markdown/podman-compose.1.md:7-8`).
- Suppressing the external-command warning hides evidence of which binary ran; pin and log the provider first (`pages/markdown/podman-compose.1.md:9`).
- A direct `docker-compose` invocation without `DOCKER_HOST` does not automatically use the Podman socket (`pages/markdown/podman-system-service.1.md:74-77`).
- `latest` and implicit pulls make an otherwise clean Compose file nondeterministic (`pages/markdown/podman-run.1.md:985-989`).
- Rootless hosts binding privileged ports fail for reasons outside the Compose file (`pages/markdown/podman-machine-start.1.md:36-40`).
- `podman kube down` cannot tear down workloads from a URL whose YAML has since changed (`pages/markdown/podman-kube-down.1.md:9-11`).

## Sources

- `pages/markdown/podman-compose.1.md:4-11` — https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- `samples/podman-compose.1.md.in:9-16` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`, `docs/source/markdown/podman-compose.1.md.in`
- `samples/containers.conf:472-479` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`, `vendor/containers/common/pkg/config/containers.conf`
- `pages/markdown/podman-system-service.1.md:6-26`, `:60-83` — https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- `pages/markdown/podman-run.1.md:230-234`, `:416-425`, `:586-610`, `:628-642`, `:985-989`, `:1039-1050`, `:1100-1103`, `:1133-1147` — https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `pages/markdown/podman-kube-play.1.md:28`, `:31`, `:222`, `:231-233`, `:307-308`, `:372-380` — https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- `pages/markdown/podman-kube-down.1.md:5-11` — https://docs.podman.io/en/latest/markdown/podman-kube-down.1.html
- `pages/markdown/podman-machine-start.1.md:36-40` — https://docs.podman.io/en/latest/markdown/podman-machine-start.1.html
- `samples/podman-network.unit.5.md.in:17-26`, `samples/rootless_tutorial.md` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`
