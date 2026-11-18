# 12 - Tools, MCP, and Plugins

Tool policy gates tool availability; approvals and sandbox gates gate execution (`pages/gateway/config-tools/built-in-tools.md:11`).

## Built-in tools

Source — `pages/gateway/config-tools/built-in-tools.md:15-33`:
```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSeconds: 1800,
      cleanupMs: 1800000,
      approvalRunningNoticeMs: 10000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: true,
      commandHighlighting: false,
      applyPatch: {
        enabled: true,
        allowModels: ["gpt-6-astra"],
      },
    },
  },
}
```

Values are defaults except `applyPatch.allowModels`; `grantExpiryDays` is 1–3650, unset by default (`pages/gateway/config-tools/built-in-tools.md:35-37`). Loop guard on by default: 3rd identical call redirects, 20th ends with `tool_repeat_limit` (`pages/gateway/config-tools/built-in-tools.md:75-80`). `web_fetch.maxResponseBytes` clamps 32000–10000000; `tools.updatePlan` defaults `true` (`pages/gateway/config-tools/built-in-tools.md:131-202`).

## Tool policy layers

`tools.profile` precedes `allow`/`deny`; `full` grants no execution permission (`pages/gateway/config-tools/tool-policy.md:14-27`). `minimal`: `session_status`, maintenance `gateway`; `coding`: `group:fs`/`runtime`/`web`/`sessions`/`memory`; `messaging`: `group:messaging` + session tools; `full`: no filtering, also plugin tools (`pages/gateway/config-tools/tool-policy.md:36-39`). `allow` and `alsoAllow` cannot coexist per scope; deny wins (`pages/gateway/config-tools/tool-policy.md:188-205`). `gatewayPolicy` requires concrete tools and a Gateway restart (`pages/gateway/config-tools/tool-policy.md:227-248`). Other layers: `byProvider`, `toolsBySender` (`channel:`/`id:`/`e164:`/`username:`/`name:`/`*`), `elevated` (`pages/gateway/config-tools/tool-policy.md:287-360`). Sandboxed sessions need `bundle-mcp`, a plugin id, `group:plugins`, or a server glob (`pages/gateway/config-tools/tool-policy.md:106-137`). Code Mode defaults to `node` (`node:vm`, not isolation); `quickjs` is hardened (`pages/gateway/config-tools/tool-policy.md:139-156`).

## Skills

Precedence, high to low: workspace `skills/`, `.agents/skills`, `~/.agents/skills`, `<state-dir>/skills`, workshop, bundled, `skills.load.extraDirs` + plugin skills (`pages/tools/skills.md:32-49`). `name` frontmatter is the slash command; `SKILL.md` is found up to 6 levels deep (`pages/tools/skills.md:87-100`). `disable-model-invocation: true` hides instructions; `command-dispatch: tool` bypasses the model (`pages/tools/skills.md:485-515`). `skills.entries.<key>` carries `enabled`, `apiKey`, `env`, `config` (`pages/tools/skills.md:690-745`).

## Code execution and browser isolation

`code_execution` is remote xAI Python (bundled `xai`), $5 per 1,000 calls plus tokens, no local file/shell/repo access, no cross-call state — unlike Code Mode (`pages/tools/code-execution.md:10-38`, `pages/tools/code-execution.md:178-181`). `plugins.entries.xai.config.codeExecution` sets `enabled`, `model`, `maxTurns`, `timeoutSeconds` (`pages/tools/code-execution.md:96-115`). Browser control is loopback-only, shared-secret auth only; `trusted-proxy` does not authenticate it (`pages/tools/browser/security.md:9-37`). With `browser.ssrfPolicy` absent, host-exec agents may reach loopback in managed Chrome; any explicit policy including `{}` disables that (`pages/tools/browser/security.md:46-70`).

## MCP serve, transports, and OAuth

`openclaw mcp serve` is a client-owned stdio server bridging to a Gateway over WebSocket; its event queue is live-only (`pages/cli/mcp/serve.md:17-60`). Tools include `conversations_list`, `messages_read`, `events_wait`, `messages_send`, approvals (`pages/cli/mcp/serve.md:122-171`). Servers use stdio/SSE/`streamable-http`; startup drops `NODE_OPTIONS`/`LD_*` env keys (`pages/cli/mcp/transports.md:21-69`). OAuth tokens live in SQLite `mcp_oauth_stores`; `per-requester` needs `gateway.publicOrigin`, not `authProfileId` (`pages/cli/mcp/transports.md:114-159`).

Source — `pages/cli/mcp/transports.md:130-149`:
```json5
{
  gateway: {
    publicOrigin: "https://gateway.example.com",
  },
  mcp: {
    servers: {
      docs: {
        url: "https://mcp.example.com/mcp",
        transport: "streamable-http",
        auth: "oauth",
        oauth: {
          identity: "per-requester",
          scope: "docs.read",
        },
      },
    },
  },
}
```

## Plugins: pipeline and capability ladder

Startup discovers, reads manifests, rejects unsafe candidates, normalizes config, loads modules, calls `register(api)`, publishes the registry; gates block root escapes, world-writable, or mismatched-owned entries (`pages/plugins/architecture-internals/load-pipeline.md:15-57`). The manifest is control-plane truth; core reads one-way from `PluginRegistry` (`pages/plugins/architecture-internals/load-pipeline.md:69-338`). Capability ladder: integration → plugin contract → narrow SDK capability → core surface (`repo/src/plugin-sdk/AGENTS.md:53-63`). Seams are versioned, closure-bound, experimental (`repo/src/plugin-sdk/AGENTS.md:22-38`, `pages/plugins/sdk-overview.md:25-36`). `register(api)` exposes `api.id`, `api.pluginConfig`, `api.runtime`, `api.logger`, `api.resolvePath` (`pages/plugins/sdk-overview.md:54-98`).

Source — `pages/plugins/sdk-setup.md:286-306`:
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

Config-less plugins need an empty schema; reserved RPC namespaces (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) stay core-owned (`pages/plugins/sdk-setup.md:282-332`). `before_tool_call` returns `requireApproval` with `title`, `description`, `severity`, `allowedDecisions`, `timeoutMs` (default 120,000, cap 600,000); `scope` is display-only, and only `allow-once`/`allow-always` permit execution (`pages/plugins/plugin-permission-requests.md:36-178`).

| capability surface | where it belongs | contract | evidence |
| --- | --- | --- | --- |
| Skills | workspace/plugin roots | `SKILL.md` frontmatter; `skills.entries.*` | `pages/tools/skills.md:34-49` |
| MCP servers | `mcp.servers` (`bundle-mcp`) | stdio/SSE/streamable-http + sandbox gate | `pages/gateway/config-tools/tool-policy.md:106-137` |
| Tools / commands | plugin `register(api)` | `OpenClawPluginApi`; allow/deny | `pages/plugins/sdk-overview.md:54-69` |
| Hooks, providers, channels | code plugins, `*.runtime` | narrow closure-bound seams | `repo/src/plugin-sdk/AGENTS.md:24-38` |
| Remote Python | bundled `xai` plugin | `plugins.entries.xai.config.codeExecution` | `pages/tools/code-execution.md:98-115` |
| Per-call approval | `before_tool_call` hook | `plugin.approval.*` | `pages/plugins/plugin-permission-requests.md:36-89` |
| Browser control | loopback Gateway service | shared-secret auth; `browser.ssrfPolicy` | `pages/tools/browser/security.md:9-58` |

## Sources

- https://docs.openclaw.ai/gateway/config-tools/built-in-tools
- https://docs.openclaw.ai/gateway/config-tools/tool-policy
- https://docs.openclaw.ai/tools/skills
- https://docs.openclaw.ai/tools/browser/security
- https://docs.openclaw.ai/cli/mcp/transports
- https://docs.openclaw.ai/plugins/sdk-overview
- https://docs.openclaw.ai/plugins/plugin-permission-requests
- https://docs.openclaw.ai/plugins/architecture-internals/load-pipeline
