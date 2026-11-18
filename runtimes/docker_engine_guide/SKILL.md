---
name: docker-engine
description: >-
  Docker Engine 29.10.0 audited reference from official manuals: daemon.json and dockerd
  configuration, rootless isolation, seccomp/AppArmor, Docker Sandboxes, log drivers and
  telemetry, Compose, image pinning, SBOM/provenance, BuildKit/Bake, modern run flags,
  determinism and hardening. Load when configuring, building, validating, securing,
  operating or debugging Docker for critical work.
category: runtimes
version: 29.10.0 (Engine) / Compose v2 / BuildKit
tags: [docker, docker-engine, compose, buildkit, bake, sandbox, rootless, seccomp, apparmor, logging, opentelemetry, prometheus, images, sbom, provenance, scout, hardened-images, deterministic, security]
license: MIT
---

# Docker Engine

Docker Engine is the runtime; `https://docs.docker.com/manuals/` also covers Compose, Build,
Scout, Hardened Images and Sandboxes. This is a static documentation snapshot captured
2026-11-18. The Engine line is 29.10.0, dated 2026-11-16 (`pages/engine/release-notes/29.md:11-13`).
No daemon, container or registry was used; every claim points at a captured page.

## When to load

- Writing or reviewing `daemon.json`, systemd drop-ins or `dockerd` flags.
- Designing repeatable Compose files; choosing log drivers, rotation or telemetry export.
- Hardening a boundary: rootless, seccomp, capabilities, read-only root, runtime choice.
- Pinning, scanning and verifying images; running untrusted work in Docker Sandboxes.
- Debugging failures, nondeterministic builds or daemon drift after upgrade.

## Measured surface

| Surface | Measurement |
|---|---|
| Discovery | `llms.txt` + `llms-full.txt`: 1,980 Markdown URLs |
| Corpus | 935 Markdown pages, 7,126,318 bytes, captured 2026-11-18 |
| Heaviest sections | 359 CLI, 149 Engine, 85 Build, 57 DHI, 55 Sandbox, 37 Compose, 24 Scout pages |
| Longest sources | `dockerd.md` 1,471 lines, `dockerfile.md` 3,381, `container/run.md` 1,646 |
| Guide | 24 chapters (00-23), 7 samples, verifier, 7 checklists |

## Six themes

| Theme | Chapters | Core claim |
|---|---|---|
| Configurability | 01, 02, 15 | `daemon.json` and flags are one state; change it via a validated restart path |
| Logs and telemetry | 06, 19, 20 | Driver, rotation, retention and export are separate decisions |
| Compose | 07, 08, 13, 14 | `docker compose config` is the normalization gate before deploy |
| Sandbox | 03, 04, 05 | Egress and credentials are the two boundaries that matter |
| Images | 09, 10, 11 | Pin by digest, build with BuildKit, verify attestations before promotion |
| Flags and determinism | 12, 21, 22 | Prefer explicit flags over inherited daemon defaults |

## Six invariants

1. **The daemon is root-equivalent.** Protect its socket before tuning anything else (`pages/engine/security/protect-access.md`).
2. **Defaults are not a policy.** `json-file`, default bridge, implicit caps and mutable tags are conveniences, not a posture.
3. **Normalize before deploy.** Resolve interpolation, profiles and file merges with `docker compose config`.
4. **Isolation composes.** Rootless, userns, seccomp, cap drops and read-only roots each remove a different escape path.
5. **An image is an artifact, not a name.** A tag moves; a digest does not. Verification reads attestations.
6. **Logs are bounded evidence.** Never treat stdout as a secret-safe channel.

## File map

| Files | Content |
|---|---|
| `00`, `SKILL` | Scope, citation contract, measured surface, invariants, read order |
| `01`, `02`, `15` | Process topology, API, install; `daemon.json`, flags, systemd, storage; lifecycle and upgrade |
| `03`, `04`, `05` | Namespaces, seccomp, AppArmor, userns, rootless, runtimes; socket/TLS hardening; Sandboxes and governance |
| `06`, `19`, `20` | Drivers, rotation, events, metrics, OTel; error taxonomy; deep telemetry and redaction |
| `07`, `08`, `13`, `14` | Compose model and precedence; production deploy gates; networking; storage |
| `09`, `10`, `11` | Digest pinning, Scout, DHI; deterministic Dockerfile; Bake, cache and attestations |
| `12`, `21`, `22` | Runtime flags by concern; pinned inputs and idempotent deploy; deep hardening |
| `16` | Commands, keys and flags with line citations |
| `17`, `23` | Measured limits and drift; seven 20-item checklists with the 85% floor |
| `18` | Dossier self-review, target contract, smallest sufficient model, spec budget |
| `samples/` | Byte-identical source pages; `MANIFEST.md` records origin and role |

## Citation contract

- `pages/<path>.md:LINE` resolves to a captured export of `https://docs.docker.com/<path>`.
- A path without a line supports a whole-file fact; `unverified` marks anything not read.
- Derived claims carry `derived`; fences are verbatim, ≤25 lines, with the source token above.
- Every chapter ends with `## Sources` and at least eight official URLs.

## Read order

Start at `00`. Configuration: `01` → `02` → `15` → `12`. Isolation: `03` → `04` → `05` → `22`.
Observability: `06` → `20` → `19`. Compose: `07` → `08` → `13` → `14`. Images: `09` → `10` →
`11` → `21`. Keep `16` open during work; use `17`/`23` before claiming coverage and `18` to decide.

## Verification

`/tmp/docker-research/verify.py` checks tree, headings, `## Sources`, byte bands, English-only
prose, line resolution, literal fences, byte-identical samples and per-topic coverage ≥85%.
It measures documentation coverage of a checklist, not runtime correctness.

## Source roots

- https://docs.docker.com/manuals/
- https://docs.docker.com/llms.txt
- https://docs.docker.com/llms-full.txt
- https://docs.docker.com/engine/
- https://docs.docker.com/compose/
- https://docs.docker.com/build/
- https://docs.docker.com/reference/
- https://docs.docker.com/scout/
- https://docs.docker.com/dhi/
- https://docs.docker.com/ai/sandboxes/
