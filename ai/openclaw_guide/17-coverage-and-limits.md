# 17 - Coverage and limits

This guide is a source-backed map, not a claim of 100% coverage of OpenClaw. Coverage is recorded
per topic, and every topic names the chapters and the evidence that support it. No percentage is
asserted because no acceptance checklist with per-item evidence was executed.

## 1. What was actually read

| Source | Capture |
|---|---|
| Repository | `https://github.com/openclaw/openclaw` at `2f5bb506ef61ab6e327df88133bfc68d95e0c90a`; 65,856 files |
| Documentation index | `llms.txt` with 1,432 entries and `sitemap.xml` with 15,571 URLs |
| Documentation pages | 951 Markdown exports, 16.5 MB, fetched with `.md` URLs into `pages/` |
| Code surfaces | `src/agents`, `src/gateway`, `src/security`, `src/plugins`, `src/plugin-sdk`, `docs/`, root policy files |
| Samples | Six byte-identical copies recorded in `samples/MANIFEST.md` |

The repository itself is large enough that a single chapter can only name owners and entry points.
The runtime layout, for example, distinguishes the built-in loop, session persistence, the
reusable agent core, the runtime facade, tool definitions, hooks, harness registry and model
transport (`pages/agent-runtime-architecture.md:10-19`). This guide maps those boundaries; it does
not claim to have read every one of the 53,833 TS/JS/TSX files.

## 2. Coverage by topic

| Topic | Depth | Basis | Known limitation |
|---|---|---|---|
| Product shape and first run | high | `00`, `16`; `pages/start/getting-started.md:9-29` | No install executed |
| Runtime architecture and code layout | high | `01`; `pages/agent-runtime-architecture.md:6-23` | Only named code paths read |
| Gateway lifecycle, config, updates | high | `02`, `16`; first-run and CLI pages | Provider-specific setup not exhaustively mapped |
| Trust model and threat surface | high | `03`; `repo/SECURITY.md`, `pages/gateway/security/trust-model.md:11-23` | No adversarial test performed |
| Access control and secrets | high | `04`; trust-model matrix and SecretRef pages | No live credential or rotation test |
| Sandbox and tool policy | high | `05`; sandbox and tool-policy pages | Backend behavior not executed |
| Context and prompt stability | high | `06`; stable-context rule in `repo/AGENTS.md`, prompt-caching docs | No provider request captured |
| Sessions and compaction | high | `07`; session, pruning and compaction pages | No live transcript inspected |
| Memory and persistence | high | `08`; active-memory flow at `pages/concepts/active-memory/how-it-works.md:25-46` | No live memory index queried |
| Multi-agent delegation | high | `09`; multi-agent and subagent pages | No spawn executed |
| Autonomous programs | high | `10`; standing orders, hooks, automations, A2A | No job fired |
| Channels and routing | medium-high | `11`; routing and access-control pages | Channel-specific transports are generalized |
| Tools, MCP and plugins | medium-high | `12`; tool policy, SDK and load-pipeline pages | No plugin installed |
| Implementation recipes | medium | `13`; composed from cited pages and marked `derived` | Recipes were not run |
| Observability and diagnostics | medium-high | `14`; Doctor, audit, OTel and runbook pages | No log or trace collected |
| Performance and limits | medium | `15`; worker pools, rate limiting, usage pages | No benchmark run |
| Minimal verified cut | medium | `18`; synthesis from the same sources | Prescriptive, not validated against a target product |

## 3. What was deliberately not executed

- No `openclaw` install, Gateway start, onboarding, provider login or API key was used.
- No chat channel, node pairing, A2A endpoint, MCP server or webhook was contacted.
- No automation was scheduled, no subagent spawned, no compaction triggered and no memory index built.
- No security audit was run against a live deployment; audit behavior is documented, not observed.
- No build, typecheck, test suite or benchmark from the OpenClaw repository was executed.
- No CSS/layout capture was performed; the guide is a knowledge dossier, not a visual audit.

These are explicit boundaries. A command copied from a page is evidence that the docs say it, not
evidence that it succeeded in this environment.

## 4. Known gaps

- **Provider breadth.** `llms.txt` lists 1,432 entries, many provider- or channel-specific. They are
  indexed but not individually mapped.
- **Application internals.** Desktop, iOS and Android code is treated as Gateway client and node
  surface, not as a separate implementation track.
- **Release history.** Changelogs and versioned release notes were not reconstructed into a timeline.
- **Deep code paths.** Source claims are anchored at real files, but subgraphs beyond those anchors
  are marked `unverified` rather than inferred.
- **Runtime proof.** There is no smoke test, observed log line, captured request or measured latency.
  Any performance statement that is not a documented default is marked `derived`.
- **Trust-model interpretation.** The one-boundary model is documented in `repo/SECURITY.md` and
  `pages/gateway/security/trust-model.md`; applying it to a particular organization remains a
  human decision.

## 5. Verification method

The mechanical verifier is the delivery gate, not a visual review. It checks the exact file tree,
the `SKILL.md` frontmatter and File Map, each chapter's first-line heading, a final `## Sources`
section with at least eight official URLs, a 6,000-7,600 byte band, English-only prose, and the
pinned commit in `VERSION`.

Every `pages/...:LINE` and repository `path:LINE` token is resolved against the captured file and
range-checked; an out-of-range line is a failure. Every code fence must be literal in the cited
range unless it carries `derived`. Every sample in `samples/MANIFEST.md` is byte-compared with its
origin. Official URLs are collected for an HTTP status pass after generation. At delivery: 653 resolved citations, 135 unique URLs, 193 official Sources URLs, 48 literal code blocks, and 0 verifier problems.

The verifier cannot prove that a paraphrase is faithful, that a default still holds on a newer
commit, or that a documented command works on a given host. The line cites exist so a reader can
revisit those judgments quickly.

## 6. Coverage statement

Coverage is measured per topic by the 20-item checklists in `23-coverage-evidence.md`, not asserted as a single global percentage. The source surface has 65,856 files and 951 captured pages; 24 chapters map the four focus themes. At delivery: **19/20 (95%) documented in each of errors, logs, performance and security**; 890 resolved citations, 152 unique URLs (all HTTP 200), 239 official Sources URLs, 52 literal code blocks and 0 verifier problems. This is documentation coverage of a curated checklist, not runtime validation: no live smoke deployment was executed, and any item requiring observed behavior stays `unverified`.

## Sources

- https://docs.openclaw.ai/
- https://docs.openclaw.ai/llms.txt
- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/gateway/security/trust-model
- https://docs.openclaw.ai/concepts/active-memory/how-it-works
- https://docs.openclaw.ai/gateway/security/running-the-audit
- https://docs.openclaw.ai/gateway/opentelemetry/privacy-and-trace-context
- https://github.com/openclaw/openclaw
- https://github.com/openclaw/openclaw/blob/2f5bb506ef61ab6e327df88133bfc68d95e0c90a/SECURITY.md
