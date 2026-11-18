# 05 - Sandbox and tool policy

OpenClaw separates three controls: the sandbox decides where tools run, tool policy decides which tools are callable, and elevated is an exec-only escape hatch that cannot escape a creator role's required sandbox (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:8-12`).

`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:18-23`
```bash
openclaw sandbox explain
openclaw sandbox explain --json
```

## What gets sandboxed

Tool execution (`exec`, `ls`, `read`, `write`, `edit`, `apply_patch`, `process`) and the optional sandboxed browser move into the sandbox; the Gateway and elevated exec stay on the host (`pages/gateway/sandboxing/what-gets-sandboxed.md:9-27`). Directory discovery uses `ls` without shell execution, returning whole names plus an `after` cursor; there is no fallback to host reads (`pages/gateway/sandboxing/what-gets-sandboxed.md:14-22`).

## Modes, scope, and backend

| setting | key | values | default | evidence |
|---|---|---|---|---|
| Mode | `agents.defaults.sandbox.mode` | `off`, `non-main`, `all` | `off` | `pages/gateway/sandboxing/modes-scope-and-backend.md:13-23` |
| Scope | `agents.defaults.sandbox.scope` | `agent`, `session`, `shared` | `agent` | `pages/gateway/sandboxing/modes-scope-and-backend.md:72-76` |
| Backend | `agents.defaults.sandbox.backend` | `docker`, `podman`, `ssh`, `openshell`, `crabbox` | `docker` | `pages/gateway/sandboxing/modes-scope-and-backend.md:129-139` |

`non-main` sandboxes all but `agent:<agentId>:main`; group/channel keys are non-main. A creator role with `sandbox: "required"` overrides agent mode, resists elevated/host overrides, and fails closed when the backend is unavailable (`pages/gateway/sandboxing/modes-scope-and-backend.md:21-30`). `sessions.patch` `sandboxMode: "off"` opts one chat out under `operator.admin`, never a required-sandbox session (`pages/gateway/sandboxing/modes-scope-and-backend.md:32-47`).

## Backends

| backend | where it runs | workspace model | browser | evidence |
|---|---|---|---|---|
| Docker | local container | bind-mount or copy | supported | `pages/gateway/sandboxing/modes-scope-and-backend.md:131-139` |
| Podman | local Podman CLI | reuses `sandbox.docker.*` | supported | `pages/gateway/sandboxing/podman-backend.md:13-15` |
| SSH | SSH-accessible host | remote source of truth | not supported | `pages/gateway/sandboxing/ssh-backend.md:11-70` |
| OpenShell | managed sandbox | `mirror` or `remote` | not supported yet | `pages/gateway/sandboxing/openshell-backend.md:9-39` |
| Crabbox | leased machine | remote managed workspace | n/a | `pages/gateway/sandboxing/crabbox-backend.md:7-25` |

Docker defaults: `network: "none"`, `readOnlyRoot: true`, `capDrop: ["ALL"]`, image `openclaw-sandbox:trixie-slim` (`pages/gateway/sandboxing/docker-backend.md:11-54`). Podman selects native CLI and rejects UID 0 rootless (`pages/gateway/sandboxing/podman-backend.md:13-33`). SSH needs `/bin/sh`, `python3`, GNU `stat -c` and `readlink -f`, then treats the remote workspace as truth (`pages/gateway/sandboxing/ssh-backend.md:11-70`). OpenShell uses `mirror`/`remote`; Crabbox needs 0.83.2+ with Daytona capabilities (`pages/gateway/sandboxing/openshell-backend.md:9-39`, `pages/gateway/sandboxing/crabbox-backend.md:11-19`).

## Workspace access and capability matrix

| value | behavior | evidence |
|---|---|---|
| `none` (default) | isolated sandbox workspace; agent workspace hidden | `pages/gateway/sandboxing/workspace-access.md:11-17` |
| `ro` | agent workspace at `/agent`, read-only | `pages/gateway/sandboxing/workspace-access.md:16` |
| `rw` | agent workspace at `/workspace`, read/write | `pages/gateway/sandboxing/workspace-access.md:17` |

A role-required sandbox caps `rw` at `ro` (`pages/gateway/sandboxing/workspace-access.md:19-24`). The capability matrix covers shell, files, and workspace access across Docker/SSH/OpenShell; only Docker has a sandboxed browser, and plugin/MCP tools stay Gateway-side needing both policy layers (`pages/gateway/sandboxing/supported-capability-matrix.md:9-30`).

## setupCommand

`setupCommand` runs once after container creation via `sh -lc`, globally at `agents.defaults.sandbox.docker.setupCommand` or per agent. Default `docker.network: "none"` breaks installs, `readOnlyRoot: true` blocks writes, root is needed for system packages (rootless Podman rejects UID 0), and sandbox exec does not inherit host `process.env` (`pages/gateway/sandboxing/setup-command.md:9-35`).

## Sandbox, tool policy, and elevated

Five layers apply: profile, provider profile, global/per-agent, provider, sandbox tool policy; `deny` wins, non-empty `allow` blocks the rest (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:61-79`). Policy filters by name, not `exec` side effects (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:76`). `group:*` shorthands include `group:runtime`, `group:fs`, `group:sessions`, `group:memory` (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:81-111`). Elevated grants no tools and does not override allow/deny; `/elevated on` leaves the sandbox, `/elevated full` skips approvals, gated by `tools.elevated.enabled` and allowlists (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:119-135`).

## Filesystem policy and dangerous flags

`src/security/exec-filesystem-policy.ts:8-88` flags scopes where `write`/`edit`/`apply_patch` are denied but `exec` is allowed, skipping all-mode sandbox with non-`rw` workspace. Audit emits `tools.exec.fs_tools_disabled_but_exec_enabled` and `tools.exec.security_full_configured` (`src/security/audit.ts:507-546`). Dangerous flags resolve plugin config contracts per workspace (`src/security/dangerous-config-flags.ts:14-62`); `dangerous*` flags are break-glass (`SECURITY.md:186`). `@openclaw/fs-safe` is a guardrail, not a sandbox; `OPENCLAW_FS_SAFE_NATIVE_MODE` is `off`/`auto`/`require` (`pages/gateway/security/secure-file-operations.md:8-39`). Bind mounts pierce the sandbox; Docker socket binds hand over host control (`pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:49-57`).

## Browser control

Use a dedicated profile, keep host browser control off for sandboxed agents; snapshots redact password, OTP, and card fields (`pages/gateway/security/browser-control.md:11-24`). `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` is unset by default; `blockedHostnames` denies before allows, and interception is request-level, not a firewall (`pages/gateway/security/browser-control.md:51-60`).

## Decision table (derived)

| need | mechanism | tradeoff | evidence |
|---|---|---|---|
| Run untrusted shell off-host | mode `all` + `docker.network: "none"` | installs break without egress | `pages/gateway/sandboxing/setup-command.md:25` |
| Read-only agent | `workspaceAccess: "ro"` + deny `group:runtime` | no shell tooling | `pages/gateway/security/tool-permissions.md:131-137` |
| Escape for one exec | `tools.elevated` + tight `allowFrom` | gated, not contained | `pages/gateway/sandbox-vs-tool-policy-vs-elevated.md:119-135` |

## Sources

- https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated
- https://docs.openclaw.ai/gateway/sandboxing/what-gets-sandboxed
- https://docs.openclaw.ai/gateway/sandboxing/modes-scope-and-backend
- https://docs.openclaw.ai/gateway/sandboxing/supported-capability-matrix
- https://docs.openclaw.ai/gateway/sandboxing/workspace-access
- https://docs.openclaw.ai/gateway/sandboxing/setup-command
- https://docs.openclaw.ai/gateway/sandboxing/docker-backend
- https://docs.openclaw.ai/gateway/security/secure-file-operations
