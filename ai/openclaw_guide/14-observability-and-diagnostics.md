# 14 - Observability and Diagnostics

Doctor, the security audit, redacted logs/telemetry, and the exposure/troubleshooting runbooks are the four operator surfaces.

## Doctor checks and repairs

`openclaw doctor` splits "Fix now" from "Recommended improvements"; a successful repair clears the finding (`pages/cli/doctor/checks.md:23-43`). `--lint` is read-only and never prompts; `--fix`/`--repair` mutate, and Nix mode (`OPENCLAW_NIX_MODE=1`) disables fixes (`pages/cli/doctor/checks.md:16-21`). `exec` SecretRefs run only with `--allow-exec` (`pages/cli/doctor/checks.md:20`). Config writes rotate `~/.openclaw/openclaw.json.bak` (`.bak.1`–`.bak.4`); an unparseable config with no last-known-good is left untouched (`pages/cli/doctor/checks.md:70-71`). Doctor quarantines invalid plugin config by disabling `plugins.entries.<id>` (`pages/cli/doctor/checks.md:128`), rewrites `image` policy to `view_image` (`pages/cli/doctor/checks.md:102`), and can set `agents.defaults.sandbox.mode off` when Docker is missing (`pages/cli/doctor/checks.md:140-141`).

## Security audit

Findings are keyed by `checkId`; deep-only checks are plugin/skill code scans and live Gateway probes (`pages/gateway/security/audit-checks.md:10-26`). Source — `pages/gateway/security/running-the-audit.md:15-20`:
```bash
openclaw security audit
openclaw security audit --deep    # attempts a live Gateway check
openclaw security audit --fix     # apply safe remediations
openclaw security audit --json
```

`--fix` flips open group policies to allowlists and sets `600` files / `700` dirs (`pages/gateway/security/running-the-audit.md:22`). Deep scans check ≤500 files per plugin/skill, skip files >1 MiB, and stop at 100,000 entries; `*.code_safety.scan_truncated` means unchecked files, not dangerous code (`pages/gateway/security/audit-checks.md:19-26`). Triage: open DMs/groups first, then exposure, browser, permissions, plugins (`pages/gateway/security/running-the-audit.md:40-46`). Critical IDs include `gateway.bind_no_auth`, `gateway.tailscale_funnel`, `fs.config.perms_writable` (`pages/gateway/security/audit-checks.md:36-102`).

## Logs, redaction, and OpenTelemetry

File logs are raw at `0600`; redaction applies at `logs.tail`, console, bundles, and OTLP export, independently per output (`pages/gateway/logging.md:332-339`). Tool arguments, tool results, and transcripts are not masked (`pages/gateway/logging.md:341-345`). `logging.redactPatterns` replaces defaults; matches ≥18 chars keep first 6 + last 4, shorter become `***` (`pages/gateway/logging.md:347-351`). Content is not exported by default: spans carry bounded identifiers, never prompts or session keys (`pages/gateway/opentelemetry/privacy-and-trace-context.md:45-61`). An authenticated client can continue a W3C trace per request frame:

Source — `pages/gateway/opentelemetry/privacy-and-trace-context.md:16-24`:
```json
{
  "type": "req",
  "id": "eval-item-42",
  "method": "agent",
  "params": {},
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

Trace context is request-scoped, accepted after the auth handshake; `tracestate`/`baggage` are rejected and `connect` frames ignore `traceparent` (`pages/gateway/opentelemetry/privacy-and-trace-context.md:33-43`). With `captureContent: true`, spans carry `gen_ai.conversation.id` and `openclaw.session.id`; system prompts and `thinking` stay excluded, and raw log bodies need that flag (`pages/gateway/opentelemetry/privacy-and-trace-context.md:63-137`).

## Gateway exposure and incident response

Patterns, narrowest first: loopback + SSH, loopback + Serve, tailnet/LAN, trusted proxy, then rare public internet (`pages/gateway/security/exposure-runbook.md:20-34`). Baseline before opening access:

Source — `pages/gateway/security/exposure-runbook.md:56-61`:
```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

Resolve critical findings first; `openclaw gateway probe --url ... --token "$OPENCLAW_GATEWAY_TOKEN"` validates remote credentials (`pages/gateway/security/exposure-runbook.md:63-73`). Proxies must list only trusted IPs and strip identity headers (`pages/gateway/security/exposure-runbook.md:130-146`). Post-change: re-run the deep audit, confirm authorized success and unauthorized denial, document residual warnings (`pages/gateway/security/exposure-runbook.md:165-178`). Rollback returns to loopback, disables DMs, denies exec, rotates tokens (`pages/gateway/security/exposure-runbook.md:180-209`).

`AUTH_RATE_LIMITED` with `retryAfterMs` signals credential guessing; failed auth defaults 10/60s then a 5-minute lockout, tunable via `gateway.auth.rateLimit` (`pages/gateway/security/rate-limiting.md:73-128`). Webhooks: 20/60s, 60s lockout; control-plane writes 30/60s per method (`pages/gateway/security/rate-limiting.md:181-221`). All limiters are in-memory and per-process (`pages/gateway/security/rate-limiting.md:245-263`).

## Troubleshooting ladders

Source — `pages/gateway/troubleshooting.md:16-22`:
```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Healthy: `Runtime: running`, connectivity check, no blocking Doctor issues (`pages/gateway/troubleshooting.md:24-28`). Check `openclaw config get gateway.mode`, `gateway.remote.url`, `gateway.auth.mode` after upgrades; `refusing to bind ... without auth` means a non-loopback bind lacks auth (`pages/gateway/troubleshooting.md:99-136`). `openclaw gateway install --force` then `openclaw gateway restart` rebuilds service metadata (`pages/gateway/troubleshooting.md:159-164`).

| signal | source | command | redaction | evidence |
| --- | --- | --- | --- | --- |
| Blocking config/service issue | Doctor | `openclaw doctor` | config snapshots masked | `pages/cli/doctor/checks.md:25-43` |
| Structured `checkId` | Security audit | `openclaw security audit --deep --json` | audit output masked | `pages/gateway/security/audit-checks.md:10-26` |
| Raw log line | File log (`0600`) | `openclaw logs --follow` | tails redacted; file raw | `pages/gateway/logging.md:332-355` |
| Upstream W3C trace | WebSocket `req` frame | inject `traceparent` | bounded ids only by default | `pages/gateway/opentelemetry/privacy-and-trace-context.md:11-61` |
| Exposed Gateway posture | Runbook | `openclaw health` | `openclaw status --all` pasteable | `pages/gateway/security/exposure-runbook.md:52-73` |
| Auth brute force | Gateway log | `gateway.auth.rateLimit` | `retryAfterMs` only | `pages/gateway/security/rate-limiting.md:73-128` |
| Service/process down | Troubleshooting | `openclaw gateway status` | logs tailed with redaction | `pages/gateway/troubleshooting.md:12-28` |

## Sources

- https://docs.openclaw.ai/cli/doctor/checks
- https://docs.openclaw.ai/gateway/security/audit-checks
- https://docs.openclaw.ai/gateway/security/running-the-audit
- https://docs.openclaw.ai/gateway/logging
- https://docs.openclaw.ai/gateway/opentelemetry/privacy-and-trace-context
- https://docs.openclaw.ai/gateway/security/exposure-runbook
- https://docs.openclaw.ai/gateway/security/rate-limiting
- https://docs.openclaw.ai/gateway/troubleshooting
