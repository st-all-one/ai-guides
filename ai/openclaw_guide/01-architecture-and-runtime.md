# 01 - Architecture and runtime

OpenClaw is a self-hosted Gateway connecting chat channels to AI coding agents on operator-owned hardware (`repo/README.md:18`; `pages/start/getting-started.md:9-11`). One long-lived Gateway owns messaging surfaces and is the only place that opens a WhatsApp session (`pages/concepts/architecture.md:10-17`). Channel delivery stays with the Gateway even when a native harness owns the model loop (`pages/concepts/agent-runtimes.md:114-122`).

## Process topology

| Process | Role | Evidence |
|---|---|---|
| Gateway daemon | Always-on routing, control plane, channel connections; one port for WS, HTTP APIs, plugin routes, UI | `pages/concepts/architecture.md:25-30`; `pages/gateway.md:67-76` |
| CLI / Control UI / automations | Operator clients; `health`, `status`, `send`, `agent`, `system-presence` requests | `pages/concepts/architecture.md:12-14`, `32-36` |
| Nodes (macOS/iOS/Android/headless) | Capability hosts: `role: node`, device identity, caps/commands, camera/screen/canvas | `pages/concepts/architecture.md:15-16`, `38-44` |
| Apps | Signed `connect.challenge`; pairing pins metadata on reconnect | `pages/concepts/architecture.md:100-114` |
| Cloud workers | Disposable session machines; transcript and accepted changes stay with Gateway | `pages/gateway/cloud-workers.md:10`, `59-67` |
| Rust helpers | Cargo members `openclaw-gateway-client`, `openclaw-node-host` | `repo/crates/Cargo.toml:1-2` |

Wire roles: `operator`, `node`, `worker` (closed cloud protocol) (`pages/gateway/protocol/handshake.md:373-377`).

## Code layout, ownership and boundaries

| layer | owner | authoritative artifact | evidence |
|---|---|---|---|
| `src/agents` | Agent runtime | Attempt loop, tools, hooks, harness registry, sessions | `pages/agent-runtime-architecture.md:12-18` |
| `src/gateway` | Gateway runtime | Process-owned files, in-memory revision, session rows | `repo/src/gateway/AGENTS.md:8-13`, `39-42` |
| `src/channels` | Core channel | Tools, action vocabulary, dispatch; channels own account/transport contracts | `repo/src/channels/AGENTS.md:3-7` |
| `src/plugins` | Loader | Discovery, manifest validation, registry; control plane before execution | `repo/src/plugins/AGENTS.md:3`, `21-24` |
| `src/plugin-sdk` | SDK owner | Versioned narrow subpaths, acyclic facades | `repo/src/plugin-sdk/AGENTS.md:3`, `22-31` |
| `extensions` | Bundled plugins | SDK imports only; metadata discovery without code execution | `repo/extensions/AGENTS.md:3`, `16-19` |
| `crates` | Native clients | Cargo workspace members | `repo/crates/Cargo.toml:1-2` |
| Transport / state | Gateway protocol | TypeBox -> JSON Schema; adapters translate, owners hold state | `pages/concepts/architecture.md:119-123`; `repo/AGENTS.md:23` |

`repo/AGENTS.md:23`:
```text
- **One owner per responsibility.** Owner decides or changes authoritative state; callers consume its operations and recorded facts. Adapters translate contracts; caches and projections derive from owner with explicit invalidation lifecycle. Transports may need different adapters, never competing owners.
```

Small core, capable plugins: optional capability belongs at edges; a new capability takes the first fitting step of the SDK capability ladder (`repo/AGENTS.md:24`; `repo/src/plugin-sdk/AGENTS.md:53-60`). Extension production imports use `openclaw/plugin-sdk/*` and local barrels only (`repo/extensions/AGENTS.md:18-19`).

## Runtime selection and run lifecycle

| Step | Rule | Evidence |
|---|---|---|
| Resolve | Model `agentRuntime`, then provider policy, then `auto`, then built-in | `pages/concepts/agent-runtimes.md:161-176` |
| Identity | `openclaw` built-in; `pi` and `codex-app-server` normalize; plugins add ids | `pages/agent-runtime-architecture.md:58-60` |
| Claim | `auto` needs a supported route; implicit Codex needs exact official HTTPS Responses route, no authored override | `pages/agent-runtime-architecture.md:60-62` |
| Generation | One prepared model runtime generation per agent; runs fork auth/registry snapshots | `pages/agent-runtime-architecture.md:64-70` |
| Supersession | No stale generation beside partial; retries do not replay model calls/tools; execution stays pinned | `pages/agent-runtime-architecture.md:68-74` |
| Failure | Missing harness refuses; started failures are not replayed elsewhere | `pages/concepts/agent-runtimes.md:188-194` |

Codex app-server owns the model loop and primary thread state; OpenClaw owns delivery and mirrors native state (`pages/concepts/agent-runtimes.md:112-128`).

## Admitted run context and authority

`repo/src/agents/AGENTS.md:26-28`:
```text
- Prepare one admitted context after runtime selection; retries/fallbacks reuse it, never mint authority.
- Lifecycle owner's `finally`: close admission on terminal, error, cancellation, unsupported recovery paths.
- Harness host capabilities capture exact admitted authority. Gate tool binding/preparation/execution, hooks, approvals.
```

`repo/src/agents/admitted-run-context.ts:47-53`:
```ts
/** Exact context carried by one admitted execution and every retry/fallback it owns. */
export type AdmittedRunContext = Readonly<{
  operationalRunInstance: OperationalRunInstanceRef;
  /** Scheduler-authored ingress authority, independent of optional audit collection. */
  admissionSource?: "operator-schedule" | "requester-schedule";
  executionIdentityToken?: ExecutionIdentityAdmissionToken;
}>;
```

One resolver serves turns, `/model`, spawn and `sessions.create`; runtime/credential fallback is never silent (`repo/src/agents/AGENTS.md:30-31`). Gateway liveness and worker placement keep separate owners (`repo/src/gateway/AGENTS.md:31-37`).

## Gateway protocol surfaces

| Surface | Contract | Evidence |
|---|---|---|
| Transport | WS text JSON; first frame `connect`; `req`/`res` and `event`; no event replay | `pages/concepts/architecture.md:75-81`, `170-174` |
| Handshake | `connect.challenge` nonce/`ts`, signed `device.signedAt`; 30 s default deadline | `pages/gateway/protocol/handshake.md:16-32`, `82-88` |
| Auth | Secret in `auth.token` or `auth.password`; mode selects configured value; `none` is private-ingress only | `pages/concepts/architecture.md:84-93` |
| Identity | Device pairing, reusable device token, `v3` binds platform/device family | `pages/concepts/architecture.md:100-114` |
| Hello | Protocol, server, features, snapshot, role/scopes, policy; `HelloOkSchema` | `pages/gateway/protocol/handshake.md:98-127` |
| RPC | Method families; discovery list is not a full enumeration | `pages/gateway/protocol/rpc-methods.md:14-30` |
| Presence | `system-presence` rows, 5-minute offline TTL, `node.list.lastSeenAtMs` | `pages/gateway/protocol/presence.md:13-24` |
| Sessions | `sessions.subscribe` bundles roster load and subscription | `pages/gateway/protocol/rpc-bootstrap-and-events.md:14-23` |

Node caps/commands/permissions are claims filtered server-side (`pages/gateway/protocol/handshake.md:395-414`); side-effecting `send`/`agent` require idempotency keys (`pages/concepts/architecture.md:94-95`).

## Sources

- https://docs.openclaw.ai/concepts/architecture
- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/concepts/agent-runtimes
- https://docs.openclaw.ai/gateway
- https://docs.openclaw.ai/gateway/protocol/handshake
- https://docs.openclaw.ai/gateway/protocol/rpc-methods
- https://docs.openclaw.ai/gateway/protocol/presence
- https://docs.openclaw.ai/gateway/protocol/rpc-bootstrap-and-events
- https://docs.openclaw.ai/gateway/cloud-workers
- https://docs.openclaw.ai/start/getting-started
