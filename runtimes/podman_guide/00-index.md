# 00 — Index, scope and method

## 1. Purpose and pin

This dossier is a **knowledge map**, not a runtime log. It records what the pinned Podman sources say about installation, configuration, rootless sandboxing, images, orchestration, telemetry and operations, with a local source token on every load-bearing fact. No container was pulled, built, started or networked to validate an example; examples are syntax-checked against the captured man pages only.

Baseline (from `VERSION`): Podman **v6.2.0** stable, published 2026-11-10, maintenance line **v5.8.10**, source snapshot `podman-container-tools/podman` @ `055de046937d29450f310fce0fe3071485d8bed9`; documentation captured 2026-11-18 from `https://docs.podman.io/en/latest/` and `https://podman.io/docs/installation`. Behavior on any other release must be re-checked against that release's own docs.

The guide is written for critical projects where state must be predictable: every chapter states defaults, version boundaries and the source that supports them, so a reader can tell a documented default from a local choice. Two invariants are applied throughout:

| Invariant | Consequence for the reader |
|---|---|
| Source before recommendation | A recommendation is paired with the page or sample that justifies it; otherwise it is marked as arithmetic over cited values |
| Default before override | The shipped default is stated before any suggested change, including its version boundary |
| Local before remote | Features unavailable to remote clients are called out rather than silently assumed |

## 2. Measured surface

All values below are **measured** during the 2026-11-18 capture; they describe the source footprint, not the completeness of this dossier.

| Measure | Value | Measurement basis |
|---|---:|---|
| Sphinx documentation pages in the upstream inventory | 205 | measured — page inventory of `docs.podman.io/en/latest` at capture time |
| Captured pages under `pages/` | 136 | measured — 130 man-page extractions in `pages/markdown/` plus 6 non-empty site pages (`Commands`, `Introduction`, `Reference`, `Tutorials`, `index`, `installation`); the 1-byte `pages/includes.md` stub is excluded |
| Byte-exact samples under `samples/` | 12 | measured — 13 files present minus `samples/MANIFEST.md` (provenance table, not a sample) |
| Repository files at v6.2.0 | 10,516 | measured — full tree at commit `055de046937d29450f310fce0fe3071485d8bed9` |
| Markdown files under upstream `docs/` | 424 | measured — `docs/**/*.md` in the same snapshot |

The counts are inventory counts, not a claim that every page was read. The 130 man pages cover commands and file formats; the 6 site pages cover installation and portal navigation; the 12 samples cover the config files, policy fixtures, Quadlet units and the rootless tutorial that are easiest to misquote.

The sample-to-page distinction matters because it determines how a citation is interpreted: samples are byte-exact and hashed (`samples/MANIFEST.md:3-8`), while every `pages/` file is a derived text extraction mapped by identical relative path (`samples/MANIFEST.md:23-27`). A verbatim fence therefore must come from the captured extraction, not from an upstream `.md.in` source that happens to describe the same flag.

Coverage accounting and gaps belong in `27-coverage-and-limits.md`; this table only sizes the corpus. Any percentage computed from these counts is arithmetic over cited measurements and is labelled accordingly in that chapter.

## 3. Citation contract

| Element | Syntax | Rule enforced |
|---|---|---|
| Inline local fact | `pages/markdown/podman.1.md:4-14` | Backticked `pages/…` or `samples/…` path, colon, inclusive start line or `start-end`; the file must exist and the range must fit the file |
| URL fact | `https://docs.podman.io/en/latest/…` | Plain URL in prose or in the `## Sources` section when no local page covers the fact |
| Own arithmetic | the word `derived` beside the number | Computed from cited values, never presented as quoted source text |
| Verbatim block | language-tagged fence | The line immediately above the fence holds exactly one local source token with a range (or a URL, or `derived`); the body is verbatim that range, at most 25 lines; a lone `…` marks an omission on both sides |

`verify.py` checks file existence, range bounds, verbatim fence equality, language tags, first-line shape (`# NN — Title`), at least three `##` sections, the final `## Pitfalls` / `## Sources` pair, and forbidden marker strings. A small verbatim block therefore looks like this:

`pages/markdown/podman.1.md:6-8`
```text
Podman (Pod Manager) is a fully featured container engine that is a simple daemonless tool.
Podman provides a Docker-CLI comparable command line that eases the transition from other
container engines and allows the management of pods, containers and images. Simply put: alias docker=podman.
```

Cite the captured extraction's line numbers, not upstream line numbers — the two differ because the pages are derived text (`samples/MANIFEST.md:15-18`). Never write marker strings that stand in for missing facts; an unmet claim is reported as a gap in `27-coverage-and-limits.md`, not hidden. A single token may back several adjacent sentences, but never a fact from a different range. For example, the daemonless claim and shared **image** storage come from `pages/markdown/podman.1.md:6-13`, whereas the `--root`/`--runroot` defaults come from `pages/markdown/podman.1.md:79-86`.

## 4. Concept map

| Concept | Load-bearing claim | Primary source |
|---|---|---|
| Daemonless / libpod | No daemon is required; `libpod` owns containers and pods; Buildah shares image but not container storage | `pages/markdown/podman.1.md:6-13` |
| Config precedence | CLI > environment > config file; defaults live in `containers.conf`; remote clients mostly use the server's file | `pages/markdown/podman.1.md:14-16`, `pages/markdown/podman.1.md:19-20` |
| Rootless | Non-overlapping `/etc/subuid`/`/etc/subgid` ranges, a user namespace and a user-mode network tool; re-run migrate after subid changes | `samples/rootless_tutorial.md:30-34`, `samples/rootless_tutorial.md:53-59` |
| Compose wrapper | `podman compose` delegates to an external provider; `docker-compose` wins when both exist | `pages/markdown/podman-compose.1.md:6-9` |
| Quadlet | Declarative systemd units (`.container`, `.pod`, `.volume`, `.network`, `.kube`, `.image`, `.build`) | `pages/markdown/podman.1.md:17-18`, `samples/podman-systemd.unit.5.md:9-17` |
| Image trust | `policy.json` scopes evaluate most-specific-first; types are `accept`, `reject`, `signedBy`, `sigstoreSigned` | `pages/markdown/podman-image-trust.1.md:10-25` |
| Telemetry | `journald` is the default log driver; events backend is `file`, `journald` or `none`; health state is first-class in v6 | `pages/markdown/podman-run.1.md:586-588`, `pages/markdown/podman.1.md:37-40` |
| Release tracks | v6 removed BoltDB storage; v5.8 is the maintenance line | `pages/markdown/podman-system-migrate.1.md:19-27` |
| Deterministic builds | `--timestamp` and `--no-cache` are the reproducibility levers; SBOM can be emitted | `pages/markdown/podman-build.1.md:599-600`, `pages/markdown/podman-build.1.md:909-911`, `pages/markdown/podman-build.1.md:705-760` |

Read the map as a dependency order: execution model → configuration → rootless sandbox → image trust → run/compose/quadlet → telemetry → operations. A change at the left edge (for example the OCI runtime or cgroup manager) invalidates assumptions at the right edge, so re-check the later chapters after such a change.

## 5. Read order

| Phase | Chapters |
|---|---|
| Orientation | `00-index.md`, `01-product-and-architecture.md` |
| Install and sandbox | `02-installation-and-platforms.md`, `03-rootless-and-userns.md` |
| Configure and harden | `05-configuration-model.md`, `06-containers-conf-reference.md`, `04-security-model.md` |
| Build and run | `07-container-lifecycle.md`, `08-modern-run-flags.md`, `09-images-registries-and-pull.md`, `10-reproducible-builds.md`, `11-image-validation-and-signing.md`, `12-manifests-and-artifacts.md` |
| State and network | `13-volumes-mounts-and-secrets.md`, `14-networking.md`, `15-pods-and-namespaces.md` |
| Orchestration | `16-compose.md`, `17-kubernetes-and-kube-play.md`, `18-systemd-quadlet-and-auto-update.md` |
| Remote and desktop | `19-remote-api-and-service.md`, `20-machine-macos-windows.md` |
| Operate | `21-logging-and-events.md`, `22-healthchecks-and-telemetry.md`, `23-troubleshooting-and-maintenance.md` |
| Decide and verify | `24-determinism-playbook.md`, `25-decisions-and-pitfalls.md`, `26-quick-reference.md`, `27-coverage-and-limits.md`, `28-minimal-verified-cut.md` |

Chapters are self-contained: each repeats the defaults it uses, so a reader entering at `08` or `16` does not need the whole sequence. Three common entry paths:

| Need | Path |
|---|---|
| Bring up a rootless host | `02` → `03` → `05` → `08` |
| Make an image supply chain verifiable | `09` → `10` → `11` → `24` |
| Run containers under systemd reproducibly | `18` → `06` → `21` → `24` |

## 6. Out of scope

- **No runtime execution.** Examples reflect documented syntax only; no image pull, build, start, network or signature verification was performed.
- **No cross-version guarantee.** Facts are pinned to v6.2.0 and the v5.8.10 maintenance line; other releases require a fresh check.
- **No Docker/Sonar-style equivalence testing.** Compatibility claims are limited to what the man pages state (for example `alias docker=podman` at `pages/markdown/podman.1.md:7-8`).
- **No GUI coverage.** Podman Desktop is only pointed to, not documented (`pages/installation.md:38-39`).
- **No full Kubernetes, Windows or kernel internals.** `kube play` is covered as a Podman command surface (`pages/markdown/podman-kube-play.1.md:5-10`); cluster operations and VM internals are not.
- **No live registry, signing authority or identity provider.** Trust and `subid: sss` are documented from their man-page and tutorial descriptions only.
- **No empirical performance numbers.** Throughput and latency claims would require a benchmark on a named host, which this dossier does not have.

## 7. Refresh procedure

1. Re-pin `VERSION` and the commit, then re-capture `samples/` byte-exactly; update `samples/MANIFEST.md` hashes (`samples/MANIFEST.md:3-6`).
2. Re-extract the 205 Sphinx pages into `pages/markdown/` and confirm the 136-page count before touching any citation range.
3. Re-check version-boundary claims first — database migration, removed flags, changed defaults — because those age fastest (`pages/markdown/podman-system-migrate.1.md:19-27`).
4. Re-read the changed man-page sections and update each affected inline range; never keep a range that pointed at deleted text.
5. Edit the affected chapters only; keep each citation tied to the newly captured line numbers.
6. Re-run the rootless and install acceptance checks against the new sources before changing any prerequisite list (`samples/rootless_tutorial.md:112-120`).
7. Run `python3 verify.py` once after all edits; fix every range and fence error it reports.
8. Re-measure the surface table and update `27-coverage-and-limits.md` so claims and measurements stay in step.

## 8. Site entry pages

The site's own entry pages frame the dossier's scope: `pages/index.md:2-6` defines Podman as a
daemonless OCI engine driven by libpod with a Linux-only REST service and clients on Linux, macOS
and Windows; `pages/Introduction.md:2-6` shows the minimal image-discovery path via `podman search`;
`pages/Tutorials.md:2-7` indexes the official rootless, Windows, remote-client and image-signing
walkthroughs. These are navigation pages, not behavioral authority — for flags and defaults use the
man-page extractions described in §3.

## Pitfalls

- Extracted page line numbers are not upstream line numbers; a range copied from a source template will silently point at the wrong sentence (`samples/MANIFEST.md:15-18`).
- Two config samples are test fixtures, not production defaults: `policy.json` and `registries.conf` come from `test/` (`samples/MANIFEST.md:12-13`).
- A measured corpus size is not a coverage percentage; do not quote 136 pages as evidence that a topic is exhausted.
- Invisible zero-width characters occur in some site headings; copy fence bodies from the captured extraction, never retype them.
- Links between chapters must resolve at verification time, so reference chapter files by their exact names from `verify.py`'s chapter list.
- A citation next to a recommendation proves the fact, not the wisdom of the choice; version and host constraints still have to be checked.
- Reusing a version-boundary claim from a v5 document produces a false statement about v6; verify the boundary before repeating it.

## Sources

- https://docs.podman.io/en/latest/ — captured as `pages/markdown/` (130 man pages) and 6 site pages under `pages/`.
- https://podman.io/docs/installation — captured as `pages/installation.md`.
- https://github.com/podman-container-tools/podman — v6.2.0, commit `055de046937d29450f310fce0fe3071485d8bed9`; byte-exact origins in `samples/MANIFEST.md`.
- Local contract and measurements: `SKILL.md`, `VERSION`, `verify.py`, `samples/MANIFEST.md`.
