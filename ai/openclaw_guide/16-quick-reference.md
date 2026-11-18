# 16 - Quick reference

All commands and keys below are copied from the pinned documentation. Line tokens point at the
captured Markdown export; use `00-index.md` for the citation contract. This chapter is a lookup
table, not a tutorial: follow the cited page before changing production state.

## 1. First run and Gateway lifecycle

`pages/start/getting-started.md:27-29`

```bash
npx openclaw@latest
```

`pages/cli/gateway/service.md:15-20`

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

`pages/cli/gateway/running.md:15-18`

```bash
openclaw gateway
openclaw gateway run   # equivalent, explicit form
```

`pages/gateway/troubleshooting/gateway-service-and-process.md:15-19`

```bash
openclaw gateway status
```

`pages/cli/dashboard.md:16-18`

```bash
openclaw dashboard
```

`pages/cli/gateway/running.md:147-148`

```bash
openclaw gateway auth-token --show
```

`gateway install` registers the service; `gateway start` waits for health and readiness and does
not restart an already running Gateway (`pages/start/getting-started.md:103-106`).

## 2. Agents, sessions and memory

`pages/cli/agents.md:45-50`

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
```

`pages/cli/sessions.md:21-26`

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
```

`pages/cli/memory.md:84-86`

```bash
openclaw memory status [--agent <id>] [--deep] [--index] [--fix] [--json] [--verbose]
```

`pages/cli/memory.md:145-147`

```bash
openclaw memory index [--agent <id>] [--force] [--verbose]
```

## 3. Approvals, secrets and audit

`pages/cli/approvals.md:37-42`

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
openclaw approvals pending
openclaw approvals resolve <id> <allow-once|allow-always|deny>
```

`pages/cli/secrets.md:25-30`

```bash
openclaw secrets audit --check
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
```

`pages/cli/audit.md:44-46`

```bash
openclaw audit
openclaw audit --agent main --status failed
```

`pages/cli/audit.md:20-22`

```bash
openclaw config set logging.audit.executionIdentity true
```

## 4. Plugins, MCP and logs

`pages/cli/plugins.md:62-67`

```bash
openclaw plugins list [--enabled] [--verbose] [--json]
openclaw plugins search <query> [--limit <n>] [--json]
openclaw plugins install <path-or-spec> [--link] [--force] [--pin] [--no-enable] [--accept-capabilities] [--acknowledge-install-policy-warning] [--marketplace <source>]
openclaw plugins inspect <id> [--runtime] [--json]
openclaw plugins inspect --all [--runtime] [--json]
```

`pages/cli/logs.md:49-54`

```bash
openclaw logs
openclaw logs --follow
openclaw --dev logs --follow
openclaw --profile work logs --follow
openclaw logs --follow --interval 2000
```

## 5. Keys that change behavior

| Key or value | Effect | Evidence |
|---|---|---|
| `tools.sessions.visibility` | Session-tool reach; defaults to `all` inside one Gateway | `pages/gateway/security/trust-model.md:17` |
| `tools.agentToAgent.enabled` | Cross-agent messaging; defaults to `true` | `pages/gateway/security/trust-model.md:17` |
| `tools.agentToAgent.allow` | Restricts agent pairs when separation is needed | `pages/gateway/security/trust-model.md:17-18` |
| `agents.entries.<agentId>.tools.agentToAgent.send` | Send-only delegation; permits `sessions_send` and the authorized reply only | `pages/gateway/security/trust-model.md:18` |
| `sessionKey` | Routing selector, never an authorization token | `pages/gateway/security/trust-model.md:21` |
| `security="full"`, `ask="off"` | Trusted single-operator host exec default | `pages/gateway/security/trust-model.md:67` |
| `agentRuntime.id` | Model/provider scoped runtime choice; model entry wins | `pages/agent-runtime-architecture.md:58-61` |
| `memory.search.rememberAcrossConversations` | Allows deep recall across private conversations | `pages/concepts/active-memory/how-it-works.md:59-61` |
| `plugins.entries.active-memory.config.agents` | Advanced Active Memory target list | `pages/concepts/active-memory/how-it-works.md:62-64` |
| `config.mode` | `escalate` (default), `always`, or `off` for deep recall | `pages/concepts/active-memory/how-it-works.md:71-79` |
| `config.allowedChatTypes` | `direct` by default; group/channel/explicit require opt-in | `pages/concepts/active-memory/how-it-works.md:83-95` |
| `config.allowedChatIds` / `deniedChatIds` | Narrow rollout; denylist always wins | `pages/concepts/active-memory/how-it-works.md:104-120` |

## 6. Reading order for a command

1. Identify the owner: Gateway control plane, node, agent runtime, or plugin.
2. Check the trust-boundary chapter before changing ingress, DM policy or exposure.
3. Check tool policy and sandbox chapters before granting capabilities.
4. Check context and session chapters before changing prompt-affecting config.
5. Run the corresponding read-only command first (`get`, `list`, `status`, `audit --check`).

## 7. Deep-diagnostic entry points

When the lookup above is not enough: `19` classifies errors, retries and partial delivery;
`20` maps log fields, redaction, OTel spans, Prometheus metrics and triage ladders; `21` covers
context economics, worker admission, placement and sizing knobs; `22` gives the exposure
runbook, hardened baseline, injection and file/browser controls, and incident response.
`23` records the measured coverage of those four topics.

## Sources

- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/cli/agents
- https://docs.openclaw.ai/cli/sessions
- https://docs.openclaw.ai/cli/memory
- https://docs.openclaw.ai/cli/approvals
- https://docs.openclaw.ai/cli/secrets
- https://docs.openclaw.ai/cli/audit
- https://docs.openclaw.ai/cli/plugins
- https://docs.openclaw.ai/cli/logs
- https://docs.openclaw.ai/cli/gateway/service
- https://docs.openclaw.ai/cli/gateway/running
- https://docs.openclaw.ai/gateway/security/trust-model
- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/concepts/active-memory/how-it-works
