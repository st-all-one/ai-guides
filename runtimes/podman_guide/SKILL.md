---
name: podman
description: >
  Podman 6.2 (and the maintained 5.8 line): daemonless/rootless OCI engine,
  installation on Linux/macOS/Windows machine, containers.conf/storage.conf/
  registries.conf/policy.json configuration, subuid/subgid + pasta + userns
  sandbox, capabilities/seccomp/SELinux/AppArmor hardening, deterministic
  `run` flags, image pull/pin/build/sign/trust/SBOM/manifests/artifacts,
  volumes/secrets/networks/pods, `podman compose` providers, Kubernetes
  `kube play`, Quadlet/systemd and auto-update, remote API/service, logs/
  events/health telemetry, troubleshooting and production playbooks. Load when
  installing, configuring, hardening, building, running, composing or
  operating Podman containers. Triggers: podman, libpod, quadlet, podman
  compose, podman-compose, rootless, containers.conf, policy.json, pasta,
  Containerfile, podman machine, kube play, conmon, crun.
category: runtimes
version: "6.2.0"
tags: [podman, oci, containers, rootless, quadlet, podman-compose, containers-conf, buildah, kube-play, pasta, seccomp, selinux, sigstore, journald]
license: MIT
---

# Podman — 6.2.0 (stable)

**Baseline:** `podman-container-tools/podman` @ `055de046` (`v6.2.0`, published 2026-11-10),
maintenance line `v5.8.10`, docs `docs.podman.io/en/latest` and `podman.io/docs/installation`
captured 2026-11-18. Facts are pinned; behavior on other releases must be re-checked.

**Load when:** installing Podman, configuring `containers.conf`/`storage.conf`/`registries.conf`/
`policy.json`, designing rootless sandbox and hardening, writing deterministic `podman run`/
`Containerfile` invocations, validating images, choosing a compose provider, wiring Quadlet or
`kube play`, or diagnosing logs/events/health/network/storage failures.

## Use When

- Choose installation path (distro package, installer + machine on macOS/Windows, FreeBSD, source)
- Configure a user or system Podman instance with predictable config precedence
- Design rootless sandboxing: subuid/subgid, user namespaces, pasta, seccomp, SELinux/AppArmor
- Pin images by digest, validate signatures, generate SBOM and build multi-arch manifests
- Run containers with reproducible flags, health checks, log drivers and resource limits
- Replace ad-hoc scripts with `podman compose`, Quadlet units or `kube play`
- Operate the remote API, machine lifecycle, telemetry and incident diagnosis

## Core Rules

1. **Daemonless and rootless-first.** Podman manages pods/containers/images through `libpod`;
   Buildah shares **image** storage but not container storage. Declarative systemd units are
   Quadlet files (`pages/markdown/podman.1.md:6-18`).
2. **Config precedence is CLI > environment > config file.** `containers.conf` supplies flag
   defaults; remote clients use the **server's** config except where documented. Global flags
   (e.g. `--log-level`, `--root`, `--connection`) must precede the subcommand
   (`pages/markdown/podman.1.md:14-20`, `:65-68`).
3. **Rootless readiness is administrative.** Non-overlapping `/etc/subuid`/`/etc/subgid` ranges,
   `passt`/pasta for networking, cgroups v2 and XDG paths; after changing subids run
   `podman system migrate` (`samples/rootless_tutorial.md`).
4. **Default pull policy is `missing`.** `always`, `missing`, `never`, `newer` are the four values;
   `newer` compares digests, not timestamps. For reproducible deploys use `never` + digest pin
   (`pages/markdown/podman-run.1.md:985-989`).
5. **Default log driver is `journald`.** Alternatives: `k8s-file` (`json-file` alias), `none`,
   `passthrough`, `passthrough-tty`; rotation via `--log-opt path|max-size|max-file|log-rotate`
   (`pages/markdown/podman-run.1.md:586-610`). Events backend: `file|journald|none`
   (`pages/markdown/podman.1.md:37-40`).
6. **User namespace default is subtle.** Without flags: pod userns, then `PODMAN_USERNS`, then
   `containers.conf`, else `host`; for a rootless user `host` maps `$UID` → container UID 0,
   while `keep-id` preserves the host UID inside (`pages/markdown/podman-run.1.md:1470-1498`).
7. **Harden by subtraction.** Drop capabilities, `no-new-privileges`, seccomp profiles,
   `--read-only`, SELinux labels (`:z` shared / `:Z` private); `--privileged`,
   `label=disable`, `seccomp=unconfined` are explicit trust escapes
   (`pages/markdown/podman-run.1.md:1133-1147`).
8. **Health checks carry state in v6.** `--health-on-failure=kill|restart|stop|none` must not be
   combined with `--restart` when using `restart`; logs can go to `local`, a directory or
   `events_logger` (`pages/markdown/podman-run.1.md:416-435`).
9. **Compose is a provider wrapper.** `podman compose` delegates to `docker-compose` (preferred
   when both installed) or `podman-compose`; select with `compose_providers` or
   `PODMAN_COMPOSE_PROVIDER` (`pages/markdown/podman-compose.1.md:4-8`).
10. **Image trust is policy-driven.** `policy.json` scopes run most-specific-first; trust types
    `accept`, `reject`, `signedBy`, `sigstoreSigned`; default should be `reject`
    (`pages/markdown/podman-image-trust.1.md:8-24`).
11. **v6 builds can emit SBOM.** `--sbom=preset`, `--sbom-output`, `--sbom-purl-output` and
    syft/trivy scanner presets; `--timestamp` and `--no-cache` are the determinism levers
    (`pages/markdown/podman-build.1.md:705-760`, `:909`, `:599`).
12. **Machine is the macOS/Windows runtime.** CLI talks remotely to a Linux VM (macOS) or WSL2
    distribution (Windows); installer is recommended, Homebrew is explicitly not
    (`pages/installation.md:40-69`).
13. **Storage flags override config.** `--root` and `--storage-driver` clear
    `storage.options.<driver>` and `STORAGE_OPTS`; `--storage-opt` must then be supplied
    explicitly (`pages/markdown/podman.1.md:79-86`, `:98-104`).

## Core Patterns

```bash
# Rootless host preparation (admin, once)
usermod --add-subuids 100000-165535 --add-subgids 100000-165535 deploy
sudo -u deploy podman system migrate
podman run --rm --userns=keep-id -v "$PWD:/src:ro,Z" alpine:3.21 id
```

```bash
# Reproducible run: digest pin, no implicit pull, isolated network, bounded logs
podman run -d --name api --pull=never \
  --network=app-net --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --log-driver=journald --log-opt tag=api \
  --health-cmd='/usr/local/bin/ready' --health-interval=10s --health-retries=3 \
  --health-on-failure=restart \
  registry.example.com/team/api@sha256:<digest>
```

```ini
# /etc/containers/containers.conf — deterministic engine defaults
[engine]
runtime = "crun"
events_logger = "journald"
compose_providers = ["/usr/local/bin/podman-compose"]
compose_warning_logs = false
```

## File Map

| File | Content |
|---|---|
| `00-index.md` | Scope, measured surface, citation contract, concept map, read order |
| `01-product-and-architecture.md` | Daemonless model, libpod/common/storage/image, OCI, remote/machine, 5.x vs 6.x |
| `02-installation-and-platforms.md` | Linux distros, macOS/Windows machine, FreeBSD, source build, verification |
| `03-rootless-and-userns.md` | subuid/subgid, userns modes, pasta, cgroups v2, `unshare`, `migrate` |
| `04-security-model.md` | Capabilities, seccomp, SELinux/AppArmor, read-only, privileged, isolation limits |
| `05-configuration-model.md` | Precedence, XDG paths, config files, env vars, modules, remote config |
| `06-containers-conf-reference.md` | Engine/runtime/containers/network keys and defaults, storage.conf, registries |
| `07-container-lifecycle.md` | create/run/start/stop/kill/rm/pause/init/update/checkpoint/clone/prune |
| `08-modern-run-flags.md` | Full deterministic flag matrix: pull, platform, health, limits, mounts, restart |
| `09-images-registries-and-pull.md` | Registries, mirrors, auth, TLS, pull policy, digest pinning, artifacts |
| `10-reproducible-builds.md` | Containerfile discipline, cache, layers, secrets, SBOM, multi-arch build |
| `11-image-validation-and-signing.md` | policy.json, trust/sign, sigstore, verification gates, admission caveats |
| `12-manifests-and-artifacts.md` | Manifest lists, artifact add/pull/extract/push, OCI distribution v6 |
| `13-volumes-mounts-and-secrets.md` | Volumes, bind/overlay/tmpfs, `:z`/`:Z`, secrets, backup and prune |
| `14-networking.md` | Netavark/CNI, pasta, network drivers, DNS, ports, isolation, firewall |
| `15-pods-and-namespaces.md` | Pod lifecycle, `--share`, infra, ports, per-pod policy and limits |
| `16-compose.md` | `podman compose` wrapper, providers, env knobs, deterministic YAML, pitfalls |
| `17-kubernetes-and-kube-play.md` | `kube play/generate/apply/down`, YAML shape, PVC/ConfigMap/Secret, Quadlet `.kube` |
| `18-systemd-quadlet-and-auto-update.md` | Quadlet units, install paths, properties, `generate systemd`, auto-update |
| `19-remote-api-and-service.md` | `system service`, socket activation, `CONTAINER_HOST`, connections, API clients |
| `20-machine-macos-windows.md` | `machine init/set/start/ssh`, providers, resources, volumes, upgrades |
| `21-logging-and-events.md` | Log drivers/opts, journald, `logs`, events filters/formats, audit trail |
| `22-healthchecks-and-telemetry.md` | Health states/logs, `stats`, `system df/check/info`, metrics limits |
| `23-troubleshooting-and-maintenance.md` | Diagnosis map, system check/renumber/reset/migrate, debug flags |
| `24-determinism-playbook.md` | End-to-end CI/prod checklist: pin, validate, isolate, verify, roll back |
| `25-decisions-and-pitfalls.md` | Trade-offs, anti-patterns and version boundaries with sources |
| `26-quick-reference.md` | Commands, flags, config keys, defaults, env vars |
| `27-coverage-and-limits.md` | Measured topic checklist, 85% accounting, gaps and refresh procedure |
| `28-minimal-verified-cut.md` | Smallest verified production baseline and sufficiency questions |

## Read Order

Start `00` → `01`. Install: `02`+`03`. Configure: `05`+`06`+`04`. Run/build: `07`+`08`+
`09`+`10`+`11`+`12`. Storage/network/pods: `13`+`14`+`15`. Orchestrate: `16`+`17`+`18`.
Remote/desktop: `19`+`20`. Operate: `21`+`22`+`23`. Decide: `24`+`25`; quick lookup `26`;
coverage `27`; minimal cut `28`.

## Prereqs

Linux with cgroups v2 and user namespaces for rootless; `passt` for rootless networking; OCI
runtime (`crun` default) and `conmon`; `containers-common`/storage libraries for config. On macOS/
Windows: Podman machine (VM/WSL2). This is a knowledge dossier — no container was executed to
validate the examples.
