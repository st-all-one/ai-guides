---
name: pi
description: >
  PI coding agent: configure, extend, and control it — providers, models,
  settings, TypeScript extensions, skills, packages, themes, keybindings, SDK,
  RPC, security, containerization. Load when configuring, extending,
  integrating, or advanced use of PI.
category: tooling
version: "1.0"
tags: [pi, coding-agent, extensions, skills, providers, models, mcp, sdk, rpc]
license: MIT
---

# PI Coding Agent

Minimal terminal agent; functionality is built via extensions, skills, prompts, and packages.

## Use When
- Configuring PI (providers, models, settings, keybindings, themes)
- Writing TypeScript extensions, skills, or prompt templates
- Installing/creating packages
- Embedding PI via SDK or RPC
- Hardening security or containerizing PI

## Core Rules
- Config scopes: global `~/.pi/agent/` and project `.pi/` (project deep-merges over global).
- Secrets live in `auth.json` / env; never commit them.
- One responsibility per extension; export a clear registration function.
- Skills are `SKILL.md` with YAML frontmatter (`name`, `description`) + dense body.
- Prompt templates are reusable, parameterized instructions.
- Use project trust (`trust.json`) deliberately; don't auto-trust untrusted repos.
- In containers, mount config read-only and pass secrets via env.
- Prefer narrow tool permissions; log tool calls for auditability.
- For SDK/RPC, treat PI as a subprocess/service with explicit protocol boundaries.

## Layout
```
~/.pi/agent/
  settings.json      # global settings
  auth.json          # credentials (never commit)
  models.json        # model catalog / overrides
  keybindings.json   # TUI keybindings
  trust.json         # trusted projects
  extensions/        # global TS extensions
  skills/            # global skills (SKILL.md)
  prompts/           # global prompt templates
  themes/            # global themes
  sessions/          # saved sessions
<project>/.pi/
  settings.json      # project config (deep-merged)
  extensions/        # project extensions
  skills/            # project skills
```

## Core Patterns
```ts
// ~/.pi/agent/extensions/hello/index.ts
export default function activate(pi: PiApi) {
  pi.registerTool({
    name: "hello",
    description: "Say hello",
    parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    async execute({ name }) { return { content: `Hello, ${name}` }; },
  });
}
```
```md
---
name: my-skill
description: Trigger-oriented description of when to load this skill.
---
# My Skill
Dense, actionable rules…
```

## File Map
| File | Content |
|---|---|
| `00-overview.md` | Architecture and directories |
| `01-installation.md` | Install and authenticate |
| `02-usage.md` | CLI/TUI usage |
| `03-providers.md` | Provider setup and env vars |
| `04-models.md` | Model catalog and overrides |
| `05-settings.md` | `settings.json` reference |
| `06-sessions.md` | Sessions, resume, history |
| `07-extensions.md` | TypeScript extensions API |
| `08-skills.md` | Authoring and loading skills |
| `09-packages.md` | Packaging and distribution |
| `10-customization.md` | Themes, keybindings, prompts |
| `11-integration.md` | SDK and RPC |
| `12-security.md` | Trust, secrets, permissions |
| `13-environment.md` | Env vars and containerization |
| `14-examples.md` | End-to-end examples |

## Read Order
`00`→`01`→`05`; extensions `07`; skills `08`; integration `11`; security `12`.

## Prereqs
Node/TypeScript and a terminal; provider API keys.
