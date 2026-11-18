# 13 - Implementation Patterns

Each recipe below composes only verified keys and commands. A recipe label marked `derived` is a synthesis of cited facts, not a quoted source block; no configuration is invented.

## Recipe 1 — Minimal single-agent setup (derived)

Install, start the service, then verify readiness. Source — `pages/start/getting-started.md:93-112`:
```bash
openclaw gateway install
openclaw gateway start
```

`gateway start` waits for health/readiness checks; `gateway status` shows the Gateway listening on port 18789, and `openclaw dashboard` reopens the web UI (`pages/start/getting-started.md:103-122`). Onboarding Quick start reuses a detected Claude Code or Codex CLI login or API key, verifies it with a real completion, and saves the config (`pages/start/getting-started.md:31-42`). `tools.profile: "full"` is set by local onboarding only when no profile is configured (`pages/gateway/config-tools/tool-policy.md:16-21`).

## Recipe 2 — Multi-agent delegation (derived)

The team preset creates a `coordinator` plus `researcher`, `writer`, and `reviewer`, each with its own workspace; the coordinator discovers specialists and checks artifacts (`pages/concepts/multi-agent.md:114-129`). Source — `pages/concepts/multi-agent.md:145-161`:
```json5
{
  agents: {
    entries: {
      coordinator: {
        subagents: {
          allowAgents: ["researcher", "writer", "reviewer"],
          delegationMode: "prefer",
        },
      },
      researcher: { subagents: { allowAgents: [] } },
      writer: { subagents: { allowAgents: [] } },
      reviewer: { subagents: { allowAgents: [] } },
    },
  },
}
```

`"prefer"` is prompt guidance, not a scheduler; `allowAgents` controls explicit spawn targets (`pages/concepts/multi-agent.md:163-167`). Defaults are `agents.defaults.subagents.maxConcurrent: 8` and `maxChildrenPerAgent: 5`; `runTimeoutSeconds` defaults to `0` (`pages/gateway/config-tools/sessions-and-subagents.md:206-213`). Cross-agent access needs `tools.agentToAgent.allow` to name both requester and target — an omitted `allow` is allow-all (`pages/gateway/config-tools/sessions-and-subagents.md:25-30`).

## Recipe 3 — Secrets wiring (derived)

Use one SecretRef shape everywhere. Source — `pages/gateway/secrets/secretref-contract.md:15-17`:
```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

`env` and `store` refs default to `secrets.defaults.env`/`secrets.defaults.store`, falling back to `default`; `file` and `exec` refs require a registered `secrets.providers` entry (`pages/gateway/secrets/secretref-contract.md:19-38`). Env refs accept the shorthand `"${OPENAI_API_KEY}"`; ids match `^[A-Z][A-Z0-9_]{0,127}$` (`pages/gateway/secrets/secretref-contract.md:42-57`). Run `openclaw doctor --fix` to add `provider` to older two-field refs (`pages/gateway/secrets/secretref-contract.md:21-27`). Assume everything under `~/.openclaw/` may hold secrets; keep `~/.openclaw` at `700` and `openclaw.json` at `600` (`pages/gateway/security/secrets-and-storage.md:21-59`). Provider credentials in workspace `.env` files are blocked; place them in the Gateway process environment or `$OPENCLAW_STATE_DIR/.env` (`pages/gateway/security/secrets-and-storage.md:72-80`).

## Recipe 4 — Sandbox plus approval hardening (derived)

Sandboxing covers `exec`, `read`, `write`, `edit`, `apply_patch`, `process`, and the optional `agents.defaults.sandbox.browser`; the Gateway process and `tools.elevated` stay on the host (`pages/gateway/sandboxing/what-gets-sandboxed.md:9-27`). The verified starting posture for an exposed Gateway is:

Source — `pages/gateway/security/exposure-runbook.md:79-102`:
```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

Widen one control at a time; `exec.security: "deny"` blocks all exec including diagnostics (`pages/gateway/security/exposure-runbook.md:104-111`). For a less restrictive posture, `tools.exec.mode` accepts `deny`, `allowlist`, `ask`, `auto`, `full`; `askFallback` and `tools.exec.strictInlineEval` add guardrails (`pages/tools/exec-approvals.md:243-313`). Set `tools.gatewayPolicy` to restrict model-directed tools; direct human administration is unaffected (`pages/gateway/config-tools/tool-policy.md:244-248`).

## Recipe 5 — Autonomous scheduling (derived)

The scheduler persists jobs and can deliver output to a channel, a webhook, or nowhere (`pages/automation/cron-jobs.md:12`). Source — `pages/automation/cron-jobs.md:20-27`:
```bash
openclaw automations create "2027-02-01T16:00:00Z" \
  --name "Reminder" \
  --session main \
  --system-event "Reminder: check the automations docs draft" \
  --wake now \
  --delete-after-run
```

Verify with `openclaw automations list` and `openclaw automations runs <job-id>` (`pages/automation/cron-jobs.md:29-40`). A recurring isolated agent turn has its own scheduler deadline, independent of `agents.defaults.timeoutSeconds`, and fallback does not reset it (`pages/concepts/agent-loop.md:308-310`). Command jobs default to 10 minutes and script payloads to 5 minutes; per-run `--timeout-seconds` overrides (`pages/automation/cron-jobs/how-it-works.md:26`). Model turns can be kept caller-scoped with `gatewayPolicy.automations.scope: "caller"` and `allowCommandJobs: false` (`pages/gateway/config-tools/tool-policy.md:252-283`).

## Recipe 6 — Memory tuning (derived)

Active memory's `config.queryMode` chooses how much conversation the recall sub-agent sees: `message`, `recent`, or `full`, with `config.timeoutMs` growing from ~3000–5000 ms to ~15000 ms (`pages/concepts/active-memory/tuning.md:9-72`). All modes share a 4,000-character assembled-context budget (`pages/concepts/active-memory/tuning.md:15-22`). `config.promptStyle` defaults `message → strict`, `recent → balanced`, `full → contextual` (`pages/concepts/active-memory/tuning.md:79-96`). Source — `pages/concepts/active-memory/tuning.md:109-111`:
```json5
modelFallback: "google/gemini-3-flash"
```

Model resolution order is explicit `config.model` → session model → agent primary → `config.modelFallback`; leaving `config.model` unset inherits existing auth (`pages/concepts/active-memory/tuning.md:98-131`). A dedicated fast model needs its provider configured; for Cerebras, `models.providers.cerebras.baseUrl` is `https://api.cerebras.ai/v1` with `apiKey` `"${CEREBRAS_API_KEY}"` and `plugins.entries["active-memory"].config.model` `"cerebras/gpt-oss-120b"` (`pages/concepts/active-memory/tuning.md:133-159`). Doctor reports memory-search readiness and can recommend `openclaw configure --section model` when embedding credentials are missing (`pages/cli/doctor/checks.md:131`).

## Sources

- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/concepts/multi-agent
- https://docs.openclaw.ai/gateway/config-tools/sessions-and-subagents
- https://docs.openclaw.ai/gateway/secrets/secretref-contract
- https://docs.openclaw.ai/gateway/security/secrets-and-storage
- https://docs.openclaw.ai/gateway/sandboxing/what-gets-sandboxed
- https://docs.openclaw.ai/tools/exec-approvals
- https://docs.openclaw.ai/gateway/security/exposure-runbook
- https://docs.openclaw.ai/automation/cron-jobs
- https://docs.openclaw.ai/concepts/active-memory/tuning
