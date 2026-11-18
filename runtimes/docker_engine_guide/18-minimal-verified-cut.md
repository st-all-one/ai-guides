# 18 - Minimal verified cut

The dossier describes the product; this chapter decides what a critical project should adopt.
It first reviews the dossier for weak spots, then defines a contract for the artifacts a real
project owns, chooses the smallest model that satisfies them and budgets the specification so
it does not grow back into a museum.

## 1. Dossier self-review

| Weak spot | Consequence | Correction adopted here |
|---|---|---|
| Coverage counts documentation, not runtime | A high score can look like a correctness proof | State the metric scope in `17` and `23`; keep live items `unverified` |
| Long CLI references invite citation without judgment | A cited flag is not automatically a safe flag | Group flags by concern in `12` and mark the hardened baseline `derived` |
| Defaults change between releases | A copied default can become a regression | Pin the release line in `VERSION` and re-read release notes on upgrade |
| Compose merges are easy to misread | Two files can produce a surprising final model | Require `docker compose config` as the normalization gate in `07` |
| Sandbox and daemon security are different boundaries | One checklist can hide the other | Keep `sandbox` and `security` as separate checklists |
| Image names are mutable | A verified name can be replaced after verification | Require digest pinning plus attestation checks in `09` |

## 2. Contract per target artifact

| Artifact | Data it displays | Real interaction | Model requirement |
|---|---|---|---|
| `daemon.json` plus systemd drop-in | Daemon state: data root, log defaults, mirrors, cgroup driver, live restore | Restart or reload; validate before rollout | One key-value model with explicit precedence |
| Compose base file | Service graph, image digests, resources, health gates, networks, volumes | `config`, `up`, `wait`, `down` | Declarative service model with file merge |
| Compose override | Environment-specific deltas only | Selected by file order | Delta over the base, never a second full model |
| Dockerfile | Build inputs, stages, user, entrypoint | `buildx build` with attestations | Reproducible instruction sequence |
| Bake definition | Targets, matrices, cache backends, output | `bake` in CI | Target graph with inherited variables |
| Runtime flags in a launch unit | Isolation, resources, network, lifecycle of one container | `run`/`create`, then `inspect` | Explicit flag set, no daemon defaults relied upon |
| Log and telemetry config | Driver, rotation, export endpoint, retention | `logs`, `events`, exporter scrape | Driver plus sink, with redaction boundary |
| Sandbox policy | Egress allow rules, credentials, workspace mode | `sbx policy`, `sbx secret`, `sbx run` | Policy document separate from workload code |

Eight artifacts; seven are projections of one core: an immutable artifact identity plus an
explicit, normalized runtime contract. Only the sandbox policy needs its own model because its
authority lives outside the container runtime.

## 3. The simplest sufficient model

The core is four fields, not a platform:

1. **Identity** — image reference by digest and platform, recorded once.
2. **Contract** — normalized Compose or run configuration, produced by a validation command.
3. **Boundary** — isolation flags and daemon settings that are stated, not inherited.
4. **Evidence** — log driver with bounded retention, plus the attestation or scan result.

Rejected alternatives, with reasons:

| Alternative | Why rejected |
|---|---|
| One wrapper script per environment | Duplicates the contract; drift appears in the scripts |
| Mutable tags plus a deployment timestamp | The timestamp does not identify the artifact after replacement |
| Daemon defaults as the security policy | Defaults vary by version and are invisible in project review |
| A separate orchestration model for each artifact | Creates translation code and two sources of truth |
| Full Swarm for a single-host critical service | Adds state and failure modes that Compose does not require |

## 4. Sufficiency test

Each question below must be answerable from the four fields without adding a new one.

| Question | Field that answers it |
|---|---|
| Which exact bits are running? | Identity |
| Which platform variant was pulled? | Identity |
| What ports, limits and health gates apply? | Contract |
| Which environment overrides are active? | Contract |
| Is the container root, and can it gain privileges? | Boundary |
| Is the root filesystem writable? | Boundary |
| Can the workload reach the internet? | Boundary or sandbox policy |
| Where do logs go, and when are they dropped? | Evidence |
| Was the image built from the declared source? | Evidence |
| Was a known vulnerability present at promotion time? | Evidence |
| Can the deploy be replayed unchanged? | Identity plus Contract |
| Can the previous artifact be restored? | Identity |
| Did the daemon change after the last review? | Boundary |
| Which policy allowed an outbound request? | Sandbox policy |
| Did the health gate pass before traffic was routed? | Contract |

No question requires a fifth field. If a future requirement does, the model is incomplete and
the specification must be corrected rather than the question narrowed.

## 5. Specification budget

| Document | Ceiling | Rule |
|---|---|---|
| `daemon.json` baseline | 60 lines | One key per decision; no comments that restate Docker defaults |
| Compose base file | 150 lines | Digests, health gates and limits only; no environment values |
| Compose override | 40 lines | Deltas only; must be empty when the base is sufficient |
| Dockerfile | 80 lines | Multi-stage, non-root final stage, no build tools in the runtime stage |
| Bake file | 60 lines | Targets inherit; no duplicated variables |
| Launch unit | 40 lines | Explicit isolation and resource flags |
| Validation runbook | 50 lines | One command per gate, with the expected failure mode |

Rules that prevent regrowth: derive values from the normalized config instead of storing them
twice; render every environment from one base plus one delta; admit a field only when both a
screen and a query need it; and reject any change that adds a second identity source.

## Sources

- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/reference/compose-file/
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/build/bake/
- https://docs.docker.com/reference/cli/docker/container/run.md
- https://docs.docker.com/engine/logging/configure/
- https://docs.docker.com/ai/sandboxes/security/defaults/
- https://docs.docker.com/dhi/how-to/verify/
- https://docs.docker.com/scout/how-tos/view-create-sboms/
