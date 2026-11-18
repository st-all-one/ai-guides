# 00 - Index and citation contract

This guide is a static, auditable map of the Docker manuals. The short path to a container is
well documented elsewhere; the engineering decisions that matter in critical projects are
daemon state, isolation defaults, Compose normalization, image provenance and log retention.
This snapshot was captured on 2026-11-18 from the official documentation and pins the Engine
release line to 29.10.0, dated 2026-11-16 (`pages/engine/release-notes/29.md:11-13`).

## 1. Scope

| Question | Chapters | What counts as an answer |
|---|---|---|
| How is Docker Engine built and configured? | 01, 02, 15 | Process topology, config precedence, systemd, lifecycle and upgrade behavior |
| Where is the isolation boundary? | 03, 04, 05 | Namespace and cgroup model, seccomp, capabilities, rootless, sandbox defaults |
| How do logs and telemetry behave? | 06, 19, 20 | Driver choice, rotation, export, error taxonomy and triage signals |
| How does Compose become repeatable? | 07, 08, 13, 14 | Model, precedence, normalization gate, deploy keys, networks and storage |
| How are images trusted? | 09, 10, 11 | Digest pinning, attestations, Scout, Hardened Images, BuildKit and Bake |
| Which flags and gates make a deploy deterministic? | 12, 21, 22 | Explicit runtime flags, pinned inputs, verification gates and hardening |

Supporting chapters provide a command reference (16), measured limits (17), a minimal verified
cut (18), deep failure handling (19), telemetry (20), determinism (21), hardening (22) and the
coverage evidence (23).

## 2. Measured surface

These are capture-time measurements, not source claims.

| Surface | Measurement | Basis |
|---|---|---|
| Discovery index | 1,980 Markdown URLs | `https://docs.docker.com/llms-full.txt` |
| Captured pages | 935 Markdown exports, 7,126,318 bytes | `https://docs.docker.com/<path>.md` |
| CLI reference | 359 pages | `pages/reference/cli/` |
| Engine reference | 149 pages | `pages/engine/` |
| Build and Bake | 85 pages | `pages/build/` |
| Sandboxes | 55 pages | `pages/ai/sandboxes/` |
| Compose and Scout | 37 and 24 pages | `pages/compose/`, `pages/scout/` |
| Hardened Images | 57 pages | `pages/dhi/` |
| Guide | 24 chapters, byte-identical samples | this repository |

The volume is why the guide is sliced by responsibility. `dockerd` alone spans 1,471 lines
(`pages/reference/cli/dockerd.md`), the Dockerfile reference 3,381 lines
(`pages/reference/dockerfile.md`), and `docker run` 1,646 lines
(`pages/reference/cli/docker/container/run.md`). Citation by line is mandatory.

## 3. Citation contract

Every factual sentence uses one of these tokens:

- `pages/<path>.md:LINE` — a line in the captured Markdown export of
  `https://docs.docker.com/<path>`. Example: `pages/engine/release-notes/29.md:23-27` records
  a breaking change in loopback registry handling.
- A path without a line supports a whole-file fact.
- `unverified` marks anything not read. Inference is marked `derived`, never disguised as a
  source fact.
- Code fences are verbatim, at most 25 lines, and carry the source token immediately above
  them. A block that omits middle segments uses a line containing only `…`.

A citation that does not resolve is a defect in the document. Re-read the source and rewrite
the claim; never adjust a line number to satisfy the verifier.

## 4. Concept map

| Concept | Where it is owned | Evidence |
|---|---|---|
| Daemon state | `dockerd` flags and `daemon.json`, systemd unit | `pages/reference/cli/dockerd.md:31-40` |
| Process boundary | daemon, containerd, shim, OCI runtime | `pages/engine/daemon/embedded-containerd.md` |
| Root equivalence | daemon socket access | `pages/engine/security/protect-access.md` |
| Isolation defaults | seccomp, AppArmor, capability set, user namespace | `pages/engine/security/seccomp.md` |
| Sandbox egress | internal DNS and explicit allow rules | `pages/ai/sandboxes/security/defaults.md:16-27` |
| Sandbox credentials | host-side proxy injection, no raw values | `pages/ai/sandboxes/security/defaults.md:56-63` |
| Compose normalization | interpolation, profiles, file merge | `pages/reference/compose-file/interpolation.md` |
| Log rotation | driver-level `max-size` and `max-file` | `pages/engine/logging/configure.md` |
| Image identity | digest rather than tag | `pages/reference/cli/docker/image/` |
| Build provenance | attestations emitted by buildx | `pages/build/metadata/attestations/` |

## 5. Read order

1. Start here, then `SKILL.md` for the six invariants.
2. Configuration track: `01` → `02` → `15` → `12`.
3. Isolation track: `03` → `04` → `05` → `22`.
4. Observability track: `06` → `20` → `19`.
5. Compose track: `07` → `08` → `13` → `14`.
6. Image track: `09` → `10` → `11` → `21`.
7. During work use `16`; read measured coverage in `17` and `23`; decide with `18`.

## 6. Out of scope

- Docker Desktop GUI internals, billing, accounts and subscription administration.
- Exhaustive per-command CLI prose beyond the flags and keys used in this guide.
- Live verification: no daemon, container, registry, exporter or sandbox was executed.
- Swarm orchestration beyond its Compose deploy keys; this guide targets single-host and
  CI-driven critical deployments.
- Kernel or storage internals that the official manuals do not document.

## 7. Refresh procedure

Re-fetch `llms.txt` and `llms-full.txt`, re-capture the page set, update `VERSION`, then run
the mechanical verifier. A new Engine release may change daemon flags, seccomp defaults and
logging options; treat those chapters as the first review targets.

## Sources

- https://docs.docker.com/manuals/
- https://docs.docker.com/llms.txt
- https://docs.docker.com/llms-full.txt
- https://docs.docker.com/engine/
- https://docs.docker.com/engine/release-notes/29/
- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/reference/compose-file/
- https://docs.docker.com/compose/
- https://docs.docker.com/build/
- https://docs.docker.com/ai/sandboxes/security/defaults/
