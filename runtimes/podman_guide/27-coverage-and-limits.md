# 27 — Coverage and limits

## 1. Method (what "85%" means here)

This guide does **not** claim 85% of all Podman behavior. Podman v6.2.0 ships 205 addressed
Sphinx pages (measured from `objects.inv`) and 10,516 repository files (measured from the pinned
shallow clone); functional equivalence cannot be proven from a documentation dossier. What is
measurable is a **topic checklist**: the main usability areas a critical project needs, derived
from the Sphinx inventory, the installation site and the config defaults. Each row below is
marked ✅ (covered by a chapter with a citable source), ◐ (covered with an explicit limitation),
or ❌ (not covered). "Addressed" = ✅ + ◐. The verifier recomputes this ratio mechanically.

| Marker | Meaning |
|---|---|
| ✅ | A chapter gives actionable facts with citations to captured docs or pinned samples |
| ◐ | Covered, but the guide explicitly documents a boundary (no native exporter, no scanner, version split) |
| ❌ | No actionable coverage; counts against the target |

## 2. Topic checklist

| # | Domain | Topic | Chapters | Status |
|---:|---|---|---|---|
| 1 | Install | Linux distribution packages and version skew | 01, 02 | ✅ |
| 2 | Install | macOS installer, Homebrew caveat, machine bootstrap | 02, 20 | ✅ |
| 3 | Install | Windows WSL2 machine and direct WSL usage | 02, 20 | ✅ |
| 4 | Install | FreeBSD and building from source with build tags | 02 | ✅ |
| 5 | Install | Verification (`podman info`, `version`) and upgrade discipline | 02, 01 | ✅ |
| 6 | Sandbox | subuid/subgid ranges, non-overlap, migrate after change | 03 | ✅ |
| 7 | Sandbox | pasta/passt default, slirp4netns legacy, host-to-container | 03, 14 | ✅ |
| 8 | Sandbox | User namespace modes (`auto`, `keep-id`, `nomap`, `host`) | 03, 04 | ✅ |
| 9 | Sandbox | cgroups v2, systemd vs cgroupfs manager, resource control | 03, 06, 08 | ✅ |
| 10 | Config | File precedence CLI > env > file; global flag position | 05 | ✅ |
| 11 | Config | `containers.conf` engine/runtime/container/network keys | 05, 06 | ✅ |
| 12 | Config | `storage.conf`, graphroot/runroot, driver and options | 06 | ✅ |
| 13 | Config | `registries.conf` mirrors and blocking | 09 | ✅ |
| 14 | Config | `policy.json` trust scopes and default reject | 11 | ✅ |
| 15 | Config | XDG paths, auth file, `REGISTRY_AUTH_FILE`, `PODMAN_USERNS`, `CONTAINER_HOST` | 05, 09 | ✅ |
| 16 | Config | Config modules, remote client vs server config | 05, 19 | ✅ |
| 17 | Security | Capability drop/add and `no-new-privileges` | 04 | ✅ |
| 18 | Security | seccomp profiles and image-provided profiles | 04, 17 | ✅ |
| 19 | Security | SELinux `:z`/`:Z`, labels, AppArmor profiles | 04, 13 | ✅ |
| 20 | Security | Read-only rootfs and tmpfs/mount overrides | 04, 13 | ✅ |
| 21 | Security | `--privileged`, `label=disable`, `seccomp=unconfined` escapes | 04, 25 | ✅ |
| 22 | Security | Secrets vs environment variables and file permissions | 08, 13 | ✅ |
| 23 | Containers | create/run lifecycle, start/stop/restart/kill/wait | 07 | ✅ |
| 24 | Containers | exec/attach/cp/port/inspect and format extraction | 07 | ✅ |
| 25 | Containers | pause/unpause/init/rename/update/diff/prune/exists | 07 | ✅ |
| 26 | Containers | checkpoint/restore and container clone | 07 | ✅ |
| 27 | Containers | Modern run flag matrix and safe defaults | 08 | ✅ |
| 28 | Containers | CPU/memory/pids/device/ulimit/sysctl limits | 08 | ✅ |
| 29 | Health | Health states, startup probes and `healthcheck run` | 08, 22 | ✅ |
| 30 | Health | `health-on-failure`, log destination and bounded health logs | 22 | ✅ |
| 31 | Images | pull/push/search/login/logout/tag/rmi/images/inspect/history | 09 | ✅ |
| 32 | Images | save/load/export/import/commit and image scp | 09 | ✅ |
| 33 | Images | Pull policies (`always`, `missing`, `never`, `newer`) | 08, 09, 24 | ✅ |
| 34 | Images | Digest pinning and platform selection | 09, 24 | ✅ |
| 35 | Build | Containerfile flags, cache, layers, squash, timestamp | 10 | ✅ |
| 36 | Build | Build secrets, build args and target stages | 10 | ✅ |
| 37 | Build | SBOM generation and scanner presets | 10, 11 | ◐ |
| 38 | Validation | policy.json + `image trust set/show --raw` | 11 | ✅ |
| 39 | Validation | simple signing vs sigstore/signature storage | 11 | ✅ |
| 40 | Validation | Verification gate design and honest scanner limits | 11, 24 | ◐ |
| 41 | Distribution | Manifest lists, multi-arch build and push | 12 | ✅ |
| 42 | Distribution | OCI artifacts add/pull/extract/push/inspect | 12 | ✅ |
| 43 | Storage | named volumes, bind, overlay `:O`, tmpfs, mount types | 13 | ✅ |
| 44 | Storage | volume export/import/prune and backup constraints | 13 | ✅ |
| 45 | Network | netavark/CNI, pasta, network create/ls/inspect/update | 14 | ✅ |
| 46 | Network | static IPs, aliases, isolation, published ports, firewall | 14 | ✅ |
| 47 | Pods | pod create/start/stop/logs/stats/inspect/prune/clone | 15 | ✅ |
| 48 | Pods | shared namespaces, infra, userns inheritance, pod ports | 15 | ✅ |
| 49 | Compose | `podman compose` wrapper, providers and env knobs | 16 | ✅ |
| 50 | Compose | deterministic YAML, provider caveats, CI pattern | 16 | ✅ |
| 51 | Kubernetes | `kube play/generate/apply/down`, YAML kinds and security | 17 | ✅ |
| 52 | Systemd | Quadlet unit types, install paths, print/rm validation | 18 | ✅ |
| 53 | Systemd | AutoUpdate, health action, restart policy, user services | 18 | ✅ |
| 54 | Remote | `system service`, socket activation, connections, API clients | 19 | ◐ |
| 55 | Desktop | machine lifecycle, providers, resources, os upgrade | 20 | ✅ |
| 56 | Logs | driver table, rotation, `logs` selection flags | 21 | ✅ |
| 57 | Logs | events backends/filters/formats, structured extraction | 21 | ✅ |
| 58 | Telemetry | journald/events export; no native OTLP exporter | 21, 22 | ◐ |
| 59 | Telemetry | stats, `system df/check/info`, health status inspection | 22 | ✅ |
| 60 | Operations | troubleshooting matrix and system reset/migrate/repair | 23 | ✅ |
| 61 | Operations | end-to-end determinism/validation playbook | 24 | ✅ |
| 62 | Operations | decisions, anti-patterns and quick reference | 25, 26 | ✅ |

## 3. Measured inventory

| Surface | Measurement | How obtained |
|---|---:|---|
| Sphinx inventory entries | 209 rows / 205 `std:doc` / 4 labels | `objects.inv` from `docs.podman.io/en/latest/` |
| Distinct doc targets in inventory | 208 | parsed inventory URIs |
| Captured doc pages in this guide | 136 (130 man pages + 6 site pages incl. installation) | scripted HTML text extraction, 2026-11-18 |
| Docs markdown files in pinned clone | 424 | `find docs/source/markdown -name '*.md'` |
| Options/link include files | 309 + links | `find docs/source/markdown/options` |
| Repository files at `055de046` | 10,516 | shallow clone, excluding `.git` |
| Byte-exact samples | 12 | `samples/MANIFEST.md` with SHA-256 |
| Chapters | 29 (00–28) | `verify.py` tree check |

## 4. What this does not prove

- A checklist hit means a chapter exists with citations — not that every flag, backend, platform
  version or error path is exhaustively documented. The 208 inventory targets are mostly command
  man pages; this guide cites the high-value ones and points to the rest by URL.
- No container, registry, VM, API call or systemd unit was executed. All examples are derived from
  documentation; runtime behavior on the reader's kernel/distro remains unverified.
- Desktop/machine provider internals, Podman Desktop GUI, API client libraries and Podman's Go
  implementation internals outside `docs/` are out of scope.
- v5.8 and v6.2 differ; where a flag is v6-only (`--sbom`, health log controls, artifacts), the
  chapter says so. Do not transfer v6 assumptions to distro packages on the 5.x line.
- "85% of usability" is a **measured proxy**: 62 defined topics, 58 fully covered and 4 addressed
  with an explicit limitation (100% addressed, 93.5% fully covered), not a functional guarantee.
  The honest answer to a completeness guarantee remains **no**.

## 5. Refresh procedure

Re-check `objects.inv`, re-clone at a new tag, re-run `python3 capture.py`, then update `VERSION`,
`samples/MANIFEST.md` hashes and every affected citation. Run `python3 verify.py`; a failed
citation is a document bug, never a line-number edit to force a pass. Add new topics to §2 before
adding chapters, so the denominator is explicit.

## Pitfalls
- Do not report the checklist ratio as "85% of Podman's features".
- Do not mark a topic ✅ when the only evidence is a URL you did not read.
- Do not mix 5.x and 6.x behavior in one row without a version note.

## Sources

- https://docs.podman.io/en/latest/objects.inv
- https://docs.podman.io/en/latest/
- https://podman.io/docs/installation
- https://github.com/podman-container-tools/podman/tree/v6.2.0
- `samples/MANIFEST.md`, `VERSION`, `verify.py`
