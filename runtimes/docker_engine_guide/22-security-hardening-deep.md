# 22 - security-hardening-deep

Hardening is layered: daemon access, runtime confinement, secret handling, transport, network, supply chain and monitoring. No layer alone is sufficient. Every control below cites captured text; no live attack test was performed.

## Daemon root-equivalence

Anyone holding daemon credentials can issue any instruction and effectively has root on the host: guard TLS keys as a root password (`pages/engine/security/protect-access.md:273-279`). `userns-remap` does not change this: the daemon still runs as root, and rootless mode is the alternative for running both daemon and containers without root (`pages/engine/security/userns-remap.md:16-20`). Treat daemon API access as privileged administrative access; the equivalence is documented, not an inference.

## Rootless and user namespaces

| Control | Documented behavior | Source |
|---|---|---|
| Rootless UID map | Container UID 0 maps to the host UID of the rootless user | `pages/engine/security/rootless/uid-gid-mapping.md:4-12` |
| Bind-mount ownership | Host-owned files appear as root-owned in rootless containers | `pages/engine/security/rootless/uid-gid-mapping.md:16-18` |
| Rootless daemon lifecycle | systemd unit is `~/.config/systemd/user/docker.service`, managed with `systemctl --user` | `pages/engine/security/rootless/tips.md:12-18` |
| Rootless limits | System-wide `/etc/systemd/system/docker.service` is unsupported | `pages/engine/security/rootless/tips.md:27-28` |
| `userns-remap` | Container root maps to a subordinate UID range with no host privileges | `pages/engine/security/userns-remap.md:9-14` |
| Remap files | Mapping is handled by `/etc/subuid` and `/etc/subgid` | `pages/engine/security/userns-remap.md:22-25` |
| Incompatibilities | `--pid=host`, `--network=host`, unaware volume drivers, `--privileged` without `--userns=host` | `pages/engine/security/userns-remap.md:259-266` |
| Kernel restriction | Mapped root cannot use `mknod` | `pages/engine/security/userns-remap.md:272-277` |

## Syscall and MAC confinement

The default seccomp profile is an allowlist that denies by default; it disables around 44 of 300+ syscalls and is moderately protective (`pages/engine/security/seccomp.md:20-35`). A container uses it unless overridden with `--security-opt`; a custom JSON file can be supplied (`pages/engine/security/seccomp.md:37-44`). `seccomp=unconfined` removes it (`pages/engine/security/seccomp.md:126-129`). AppArmor's `docker-default` profile is likewise applied unless overridden (`pages/engine/security/apparmor.md:25-35`).

`--security-opt` supports label settings, AppArmor profiles, `no-new-privileges=true`, seccomp variants and `systempaths=unconfined` (`pages/reference/cli/docker/container/run.md:1464-1476`). `no-new-privileges` stops privilege-raising commands such as `su` or `sudo` and applies seccomp filters after privileges are dropped (`pages/reference/cli/docker/container/run.md:1507-1515`). Disabling confinement is only valid for an explicit, reviewed exception (`derived`).

## Capabilities, user and root filesystem

`--privileged` enables all capabilities, disables seccomp and AppArmor, exposes all host devices and makes `/sys` writable; such a container is not sandboxed (`pages/reference/cli/docker/container/run.md:342-362`). Prefer individual `--cap-add` over `--privileged` (`pages/reference/cli/docker/container/run.md:364-367`), with `--cap-drop` as the default-deny starting point (`pages/reference/cli/docker/container/run.md:34`). Run as a non-root UID with `--user` (`pages/reference/cli/docker/container/run.md:124`). `--read-only` mounts the root filesystem read-only so writes are limited to explicitly declared volumes (`pages/reference/cli/docker/container/run.md:461-470`). `--device` grants direct host device access (`pages/reference/cli/docker/container/run.md:50`) and must not be used with ephemeral devices for untrusted containers (`pages/reference/cli/docker/container/run.md:918-919`).

## Secret injection and file permissions

| Control | Documented behavior | Source |
|---|---|---|
| Secret model | Sensitive data is a secret; source is `file` or `environment` | `pages/reference/compose-file/secrets.md:4-12` |
| Explicit grant | Services access secrets only via a `secrets` attribute | `pages/reference/compose-file/secrets.md:6` |
| File injection | Compose mounts secrets as files under `/run/secrets/<secret_name>` | `pages/compose/how-tos/use-secrets.md:18` |
| Permission control | Per-service grant permits granular access via standard filesystem permissions | `pages/compose/how-tos/use-secrets.md:24-26` |
| Avoid env | Env vars are visible to all processes and may leak into debug logs | `pages/compose/how-tos/use-secrets.md:4-14` |
| Build secrets | Use secret or SSH mounts, not build args or env vars | `pages/build/building/secrets.md:4-9` |
| Swarm transport | Secrets reach managers over mutual TLS and are stored in the encrypted Raft log | `pages/engine/swarm/secrets.md:74-78` |
| Windows caveat | UID, GID and mode are unsupported for Windows secrets | `pages/engine/swarm/secrets.md:69-72` |

## Transport and network segmentation

TLS with `tlsverify` and a trusted CA allows only clients with a CA-signed certificate to connect, and only servers signed by that CA from the client side (`pages/engine/security/protect-access.md:71-79`). Registry client certificates live under platform-specific cert roots such as `/etc/docker/certs.d/` on native Linux and `$XDG_CONFIG_HOME/docker/certs.d` for rootless Linux (`pages/engine/security/certificates.md:15-25`). For bridge networks Docker writes host iptables rules and also creates DNS rules in the container namespace (`pages/engine/network/firewall-iptables.md:4-6`). `DOCKER-USER` is the user-defined chain evaluated before Docker's forwarding chains (`pages/engine/network/firewall-iptables.md:15-20`). Disabling firewall manipulation via daemon options is possible but not recommended for most users (`pages/engine/network/firewall-iptables.md:8-11`). Segment services with explicit `--network` (`pages/reference/cli/docker/container/run.md:95`); publishing ports should be selective (`pages/reference/cli/docker/container/run.md:104`).

## Supply chain and monitoring

Pull by digest pins an exact version (`pages/reference/cli/docker/image/pull.md:110-122`). DHI and chart attestations cover SBOM, provenance and vulnerability reports (`pages/dhi/how-to/verify.md:4-7`, `pages/dhi/how-to/verify.md:51-54`); validate with `docker scout attest get ... --verify` (`pages/dhi/how-to/verify.md:167-171`) or `cosign verify` with the published key (`pages/dhi/how-to/verify.md:192-197`). Docker Scout prefers SBOM attestations and otherwise indexes image contents (`pages/scout/how-tos/view-create-sboms.md:4-6`).

`docker events` returns real-time server events, only the last 256 log events, with filters to narrow them (`pages/reference/cli/docker/system/events.md:18-24`). Container events include `create`, `die`, `oom`, `kill`, `start`, `stop` and `update` (`pages/reference/cli/docker/system/events.md:30-55`); image events include `pull` and `push` (`pages/reference/cli/docker/system/events.md:57-65`). Daemon logs are read through `journalctl -xu docker.service` on Linux (`pages/engine/daemon/logs.md:4-10`). Incident containment by stopping a container on detection and preserving events is `derived`; no live containment exercise is documented here.

## Non-goals

This chapter does not claim a live attack test, a guaranteed absence of vulnerabilities, or protection against a compromised host kernel. It does not replace host hardening, secret rotation or registry access control. Where the documentation states a limitation, the limitation is reported rather than resolved.

## Sources

- https://docs.docker.com/engine/security/protect-access/
- https://docs.docker.com/engine/security/certificates/
- https://docs.docker.com/engine/security/seccomp/
- https://docs.docker.com/engine/security/apparmor/
- https://docs.docker.com/engine/security/userns-remap/
- https://docs.docker.com/engine/security/rootless/uid-gid-mapping/
- https://docs.docker.com/engine/security/rootless/tips/
- https://docs.docker.com/engine/network/firewall-iptables/
- https://docs.docker.com/engine/swarm/secrets/
- https://docs.docker.com/compose/how-tos/use-secrets/
- https://docs.docker.com/build/building/secrets/
- https://docs.docker.com/reference/cli/docker/container/run/
- https://docs.docker.com/reference/cli/docker/system/events/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/dhi/how-to/verify/
- https://docs.docker.com/scout/how-tos/view-create-sboms/
- https://docs.docker.com/reference/cli/docker/image/pull/
