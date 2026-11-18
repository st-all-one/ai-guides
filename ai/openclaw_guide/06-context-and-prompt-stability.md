# 06 - Context and prompt stability

"Context" is everything OpenClaw sends to the model for a run, bounded by the window; it is not on-disk memory (`pages/concepts/context.md:10`, `pages/concepts/context.md:18`). It includes the system prompt, history, tool calls/results, attachments, and compaction or pruning artifacts; hidden provider wrappers still count (`pages/concepts/context.md:129-138`). Inspect it with `/status`, `/context list`, `/context detail`, `/context map`, `/usage tokens` (`pages/concepts/context.md:20-27`).

## Assembly and the context engine

OpenClaw owns the system prompt; there is no runtime default. `buildAgentSystemPrompt` is a pure renderer, `buildConfiguredAgentSystemPrompt` applies config knobs, and runtime adapters gather live facts (`pages/concepts/system-prompt.md:9-17`). The default `legacy` context engine assembles and compacts; a `kind: "context-engine"` plugin selected by `plugins.slots.contextEngine` takes over assembly, `/compact`, and subagent context hooks (`pages/concepts/context.md:288-295`).

Tools cost context twice: list text plus JSON schemas sent for calling (`pages/concepts/context.md:186-193`). Workspace files `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, and first-run `BOOTSTRAP.md` are injected, truncated by `agents.defaults.bootstrapMaxChars` (default `20000`) and `agents.defaults.bootstrapTotalMaxChars` (default `60000`) (`pages/concepts/context.md:160-172`).

## The stable-conversation-context rule

`repo/AGENTS.md:25`
```
- **Stable conversation context.** Generated prompt/tool/context additions: bounded, deterministic. Preserve transcript bytes; serve required instructions whole; only compaction rewrites history. Defer stable-prompt changes to next session unless owner defines explicit invalidation; keep existing skill, tool, and memory refresh contracts. Side request reusing conversation shares turn's request preparation or carries no cache identity.
```

Per-turn authority and cache keys are separate rules: within a session, definitions, prompt, and earlier history depend only on session/config facts and history only appends; per-turn calls are gated through `gateAgentToolExecution`, with per-turn facts in that turn's message (`repo/AGENTS.md:71`). Every cache, memo, in-flight join, and snapshot is keyed by scope (agent, account, credential, session, workspace) and request shape (provider set, mode, options, deadline); volatile values stay out of keys (`repo/AGENTS.md:72`).

The implementation shares long prompt prefixes as immutable strings: content is the revision, and eviction ends sharing without changing a live prompt (`repo/src/agents/sessions/system-prompt-pool.ts:8-13`).

## What stays stable, and how

| artifact | stable within session? | mechanism | evidence |
| --- | --- | --- | --- |
| System prompt prefix | Yes, until a rebuild point | Pinned at session start; fingerprinted for byte equality | `repo/docs/reference/prompt-caching.md:647-694` |
| Tool definitions and schemas | Yes, until config/refresh | Session checkpoint retains description and schema bytes | `repo/docs/reference/prompt-caching.md:42-52` |
| Conversation history | Yes | Each request extends the prior one byte for byte | `repo/docs/reference/prompt-caching.md:649-652` |
| Runtime-context carriers | Yes on retained routes | Append-only system/operator or user-role carriers | `pages/concepts/context.md:221-232` |
| Injected workspace files | Yes until rebuild | Stable project context above the cache boundary | `pages/concepts/system-prompt.md:63` |
| Skills list | Yes until refresh | Refresh delivered as an appended instruction message | `pages/concepts/system-prompt.md:71` |
| Per-turn authority and facts | No, by design | `gateAgentToolExecution`; facts in that turn's message | `repo/AGENTS.md:71` |
| Compaction summary | No, intentional rewrite | Starts a new prompt series | `repo/docs/reference/prompt-caching.md:661-664` |
| Pruned tool results | No transcript change | In-memory projection plus hidden marker | `pages/concepts/session-pruning.md:9-16` |

An internal cache boundary orders tool definitions, skills metadata, and workspace files above volatile per-turn metadata (`repo/docs/reference/prompt-caching.md:466-477`); stable project context stays above, current tool capabilities and channel guidance below (`pages/concepts/system-prompt.md:63-65`). Fingerprints normalize whitespace, line endings, hook context, and capability ordering (`repo/docs/reference/prompt-caching.md:475`).

## Rebuild points and provider roles

The prompt rebuilds only at a new session (first request, `/new`, `/reset`), compaction, or a model/provider switch including API, base URL, harness, tool surface, or personal profile; everything else is an appended delta (`repo/docs/reference/prompt-caching.md:661-674`, `repo/docs/reference/prompt-caching.md:654-659`). Outside those points a changed prefix is a bug, logged once per session and component as `[prompt-cache] prefix changed within session outside a rebuild point` (`repo/docs/reference/prompt-caching.md:690-694`).

Roles follow provider capability: direct Anthropic API-key routes use the in-history system channel, native OpenAI Responses the operator channel as `developer` or `system`, and OpenAI-compatible/local routes a user-role carrier that protects prefix reuse (`pages/concepts/context.md:221-232`). Responses keeps earlier carriers append-only; there is no `appendOnlyRuntimeContext` config switch (`pages/concepts/context.md:256-268`, `pages/concepts/context.md:231-232`).

## Cache identity in practice

OpenAI requests key on session ID plus the transcript's reset/compaction boundary count unless the caller supplies a key; recovery and completion turns share that identity (`repo/docs/reference/prompt-caching.md:169-173`). A model or thinking-level change starts a new lineage (`repo/docs/reference/prompt-caching.md:24-40`), while Chat Completions replay preserves and disambiguates native tool-call IDs (`repo/docs/reference/prompt-caching.md:159-162`).

`repo/docs/reference/prompt-caching.md:503-522`
```
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Diagnostics: `diagnostics.cacheTrace.enabled` defaults to false and traces go to `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`; env toggles override path and payload for one-off debugging (`repo/docs/reference/prompt-caching.md:592-611`). `cacheRead`/`cacheWrite` show in `/usage tokens`, `/status`, and session summaries (`repo/docs/reference/prompt-caching.md:641-645`). On pinned routes refreshed sections append after the user turn (`pages/concepts/system-prompt.md:71`).

## Sources

- https://docs.openclaw.ai/concepts/context
- https://docs.openclaw.ai/concepts/system-prompt
- https://docs.openclaw.ai/reference/prompt-caching
- https://docs.openclaw.ai/concepts/session-pruning
- https://docs.openclaw.ai/concepts/compaction
- https://docs.openclaw.ai/concepts/session
- https://docs.openclaw.ai/tools/slash-commands
- https://docs.openclaw.ai/reference/token-use
