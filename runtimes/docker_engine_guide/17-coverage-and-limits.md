# 17 - Coverage and limits

This chapter states what the dossier can and cannot prove. Coverage is measured against a
curated checklist in `23-coverage-evidence.md`, not against every page in the Docker manuals.
An item is `documented` when the guide answers it with a resolved `path:line` citation and
`unverified` when only a running daemon, registry or exporter can answer it. The target is at
least 85 percent in each of seven topics. The verifier parses those tables, resolves every
evidence line and fails any topic below the target.

## 1. What the number means

| Dimension | Measurement | Limit |
|---|---|---|
| Source corpus | 935 official Markdown pages, 7,126,318 bytes | A snapshot, not the live site after 2026-11-18 |
| Checklist | 140 curated requirements, 20 per topic | Curated, not an exhaustive map of every feature |
| Citation | Each fact resolves to a captured line | A line can be stale after a documentation edit |
| Runtime | No daemon, container or sandbox was started | Performance and failure behavior are not measured here |
| Target | 85 percent documented per topic | A documentation bar, not a correctness guarantee |

The 85 percent figure is a bar on this checklist. It does not mean 85 percent of Docker
usability, 85 percent of the CLI surface or 85 percent of runtime behavior. The manuals span
1,980 indexed pages; a 24-chapter guide cannot and should not claim that breadth. What the
checklist does guarantee is that the decisions named in the user-facing scope have an answer
with a source line, or are explicitly marked as requiring live verification.

## 2. Topic coverage at a glance

| Topic | Chapter anchors | Verification gate |
|---|---|---|
| configuration | 01, 02, 15 | daemon keys and precedence cited to the `dockerd` reference |
| logs_telemetry | 06, 19, 20 | drivers, rotation, events, metrics and redaction cited |
| compose | 07, 08, 13, 14 | model, normalization, deploy, network and storage cited |
| sandbox | 03, 05, 22 | defaults, egress, credentials and isolation cited |
| images | 09, 10, 11 | pinning, attestations, scanning and build controls cited |
| flags_determinism | 12, 21 | every flag cited to the run/create reference |
| security | 04, 05, 22 | daemon socket, isolation stack and supply chain cited |

The final measured numbers live in `23-coverage-evidence.md`. This chapter intentionally does
not duplicate them: there must be one source of truth for the count.

## 3. Paths that need live execution

| Requirement | Why it is unverified here | How to verify locally |
|---|---|---|
| Actual rotation size on disk | Driver math depends on live write patterns | Generate bounded log volume and inspect `docker system df` |
| Exporter delivery | Endpoint availability and sampling are environment-specific | Run the documented exporter and inspect received spans |
| seccomp violation on a real syscall | Kernel and profile version decide the outcome | Apply the profile and run the target workload |
| Rootless prerequisites on a given host | Kernel, user namespaces and storage driver vary | Follow the documented rootless prerequisite check |
| Multi-arch manifest resolution | Registry state and host platform decide the pulled variant | Inspect the manifest and the pulled image digest |
| Compose convergence after an interrupted deploy | Depends on runtime timing | Run the documented validation and wait gates in CI |
| Sandbox network policy enforcement | Local and cloud policy differ | Inspect active rules with the documented CLI |

Each of these is counted honestly as `unverified` in the checklist. Hidden failures are worse
than a low score.

## 4. Drift risks

| Drift | Affected chapters | Mitigation |
|---|---|---|
| New `dockerd` flag or changed default | 02, 12, 15 | Re-read the `dockerd` reference and the release notes before upgrade |
| Seccomp or AppArmor default change | 03, 04, 22 | Compare the security pages and the release notes |
| Compose spec addition | 07, 08 | Re-read the Compose reference and file-version page |
| Build attestation flag change | 09, 10, 11 | Re-read buildx and attestation pages |
| Sandbox policy or credential model change | 05, 22 | Re-read sandbox security and governance pages |
| Logging driver option change | 06, 20 | Re-read the driver and configuration pages |

The dossier is deliberately split: `23-coverage-evidence.md` holds the itemized rows, this
chapter holds the interpretation. Keeping them apart means a count change never needs a prose
rewrite, and a scope change never hides inside a table. A future refresh should update the
captured page count in `VERSION`, the ratios in `23`, and the drift table here in the same
commit; otherwise the three files disagree about what was actually inspected.

Readers should also note that `unverified` is a positive signal when it appears on a live-only
claim. It marks the exact boundary between what documentation can settle and what a test
harness must settle. A guide that silently converts those items into facts would be less
useful than one that names them.

The 29.10.0 notes already show why this matters: local registry handling changed for users who
set `insecure-registries`, and the Engine API specification moved to OpenAPI 3.2
(`pages/engine/release-notes/29.md:21-37`). A guide pinned to an older snapshot would give
expensive advice after that upgrade.

## 5. Verification method

The verifier runs from the research corpus and checks, in order: the exact file tree; the
first-line heading and final source section of each chapter; byte bands; English-only prose;
line-range resolution for every citation; literal code fences with their source token;
byte-identical samples; and the coverage tables with the 85 percent floor. It fails closed:
an unresolved citation is treated as a documentation bug.

Read `18-minimal-verified-cut.md` before turning this dossier into a project standard. The
dossier answers how the product behaves; the minimal cut answers what a project should adopt.

## Sources

- https://docs.docker.com/llms.txt
- https://docs.docker.com/llms-full.txt
- https://docs.docker.com/engine/release-notes/29/
- https://docs.docker.com/engine/daemon/troubleshoot/
- https://docs.docker.com/engine/security/seccomp/
- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/reference/compose-file/
- https://docs.docker.com/build/metadata/attestations/
- https://docs.docker.com/ai/sandboxes/security/defaults/
- https://docs.docker.com/scout/
