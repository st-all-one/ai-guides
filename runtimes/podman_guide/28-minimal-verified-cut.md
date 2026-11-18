# 28 — Minimal verified cut

## 1. Scope and non-claims

This is the smallest coherent production baseline the dossier can justify **from documentation**:
one host, one rootless service account, one pinned image, one network, one named volume, health
and journald telemetry, and a declarative unit. It is a starting point for verification in a real
environment, not a tested deployment. Every choice is traceable to a rule in `SKILL.md` and to a
captured source; nothing here is a substitute for testing on the target kernel/distro.

## 2. Host baseline

Requirements: cgroups v2, user namespaces, non-overlapping subordinate UID/GID ranges, `passt`
for rootless networking, an OCI runtime (`crun`) and `conmon`
(`samples/rootless_tutorial.md`, `pages/installation.md:75-123`). Prefer distro packages from one
channel; do not mix 5.x and 6.x binaries and libraries on the same host (`01`, `02`).

derived — admin steps, one account per workload boundary
```bash
usermod --add-subuids 200000-265535 --add-subgids 200000-265535 svc-api
install -d -m 0755 -o svc-api -g svc-api /etc/containers/systemd
sudo -u svc-api podman system migrate
sudo -u svc-api podman info --format '{{.Host.OCIRuntime.Name}} {{.Host.LogDriver}}'
```

## 3. Configuration baseline

derived — fixed engine defaults; the same file is used by CLI and Quadlet
```ini
[engine]
runtime = "crun"
cgroup_manager = "systemd"
events_logger = "journald"
compose_providers = ["/usr/local/bin/podman-compose"]
compose_warning_logs = false

[containers]
log_driver = "journald"
```

The defaults and the override semantics come from `samples/containers.conf`; note that `--root`
and `--storage-driver` clear `STORAGE_OPTS` and must be replaced explicitly
(`pages/markdown/podman.1.md:79-86`, `:98-104`). Trust must default to reject and only named registries may
be accepted (`pages/markdown/podman-image-trust.1.md:8-24`).

## 4. Runtime baseline

derived — one deterministic container; replace `<digest>` with a verified digest
```bash
podman network create app-net
podman volume create api-data
podman run -d --name api --pull=never \
  --network=app-net --volume=api-data:/var/lib/api:U,Z \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --userns=keep-id --user 10001:10001 \
  --cpus=2 --memory=1g --pids-limit=256 \
  --log-driver=journald --log-opt tag=api \
  --health-cmd='/usr/local/bin/ready' --health-interval=10s \
  --health-timeout=3s --health-retries=3 --health-start-period=30s \
  --health-on-failure=restart --health-log-destination=events_logger \
  --health-max-log-count=5 --health-max-log-size=500 \
  registry.example.com/team/api@sha256:<digest>
```

Rationale: `missing` is the default pull policy, so `never` is an explicit reproducibility choice
(`pages/markdown/podman-run.1.md:985-989`); `keep-id` preserves host ownership for the named
volume; health-on-failure `restart` must not be combined with `--restart`
(`pages/markdown/podman-run.1.md:416-435`); `:Z` is a private SELinux relabel and `:z` is shared
(`pages/markdown/podman-run.1.md:1606-1615`).

## 5. Declarative cut

For durable state, express the same container as a Quadlet `.container` unit under
`/etc/containers/systemd` (rootful) or `$XDG_CONFIG_HOME/containers/systemd` (rootless), then
`systemctl --user daemon-reload && systemctl --user start api.service`. Quadlet is the documented
declarative surface (`pages/markdown/podman.1.md:15-20`); the unit keys live in
`samples/podman-container.unit.5.md.in`. Validate the generated unit with `podman quadlet print`
before enabling it. If the workload is multi-container and Kubernetes-shaped, prefer `kube play`
with pinned images over a shell script (`17`).

## 6. Verification commands

derived — gates that must pass before declaring the cut healthy
```bash
podman inspect --format '{{.Image}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.LogConfig.Type}}' api
podman healthcheck run api
podman inspect --format '{{.State.Health.Status}}' api
podman events --since 5m --filter container=api --format '{{json .}}'
journalctl --user -u api.service -n 100 --no-pager
podman system check
```

Interpretation: `podman system check` detects storage/state inconsistencies, not application
correctness (`pages/markdown/podman-system-check.1.md`); events and journald are the only native
telemetry streams — there is no built-in OTLP exporter (`21`, `22`).

## 7. Sufficiency questions

The cut is sufficient only if it answers all of these without adding a new mechanism:

1. Which exact image digest is running, and is it the approved one?
2. Is the root filesystem read-only and are capabilities dropped?
3. Which UID writes the volume, and does it match the host owner after a re-create?
4. Where do stdout/stderr go, how large can they grow and who rotates them?
5. What happens on an unhealthy probe — restart, stop, kill or nothing?
6. How are health-check logs bounded, and where are they read?
7. Is the container recreated by systemd on reboot, and with the same flags?
8. What network is attached, and can it reach anything outside its defined scope?
9. Which registry may supply images, and is the default policy reject?
10. How are secrets supplied without placing them in `Environment=` or images?
11. How is a rollback performed — previous digest restore and volume preservation?
12. How do you detect a silent config drift between CLI, Quadlet and containers.conf?
13. How do you rotate a registry credential without rebuilding the image?
14. How do you prove the events log was not silently disabled (`events_logger=none`)?
15. How do you migrate subuid ranges without corrupting the running container state?

A question that requires a new column, file or mechanism is a design gap — fix the baseline or
record the deliberate exception in `25-decisions-and-pitfalls.md`.

## Pitfalls

- Do not treat this cut as verified until it has been executed on the target host.
- Do not add `--privileged` or `label=disable` to solve a permission error without a threat review.
- Do not combine `--restart` with `--health-on-failure=restart`.
- Do not pin by tag when the registry can rewrite that tag.

## Sources

- https://docs.podman.io/en/latest/markdown/podman-run.1.html
- https://docs.podman.io/en/latest/markdown/podman-system-check.1.html
- https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- https://podman.io/docs/installation
- `samples/containers.conf`, `samples/rootless_tutorial.md`, `samples/podman-container.unit.5.md.in`
