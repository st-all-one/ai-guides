# 22 - Security hardening deep dive

Companion to 03-05. Local-first for one operator: callers and loopback sessions share one bucket; isolation needs separate gateways or OS users (`SECURITY.md:126-149`, `SECURITY.md:209-219`).

## Exposure posture and pre-flight

Narrowest pattern wins: loopback+SSH/Serve, tailnet/LAN+auth, trusted proxy, rarely public behind an identity-aware proxy (`pages/gateway/security/exposure-runbook.md:20-34`).

| control | checks | failure signal | rollback | evidence |
|---|---|---|---|---|
| `gateway.bind` | loopback, explicit in containers | LAN route, `0.0.0.0` | loopback; stop forwarding | `pages/gateway/security/network-exposure.md:16-31` |
| `gateway.auth.*` | token/password/proxy; token >=24 | `gateway.bind_no_auth` | rotate; require auth | `pages/gateway/security/network-exposure.md:92-118` |
| DM/group | pairing or `allowFrom`; no `"*"`+tools | `dm.open`, `open_channels_with_exec` | disable DMs; drop `"*"` | `pages/gateway/security/exposure-runbook.md:113-128` |
| tools/exec | deny or gate exec; elevated off | `open_groups_with_elevated` | `deny`; `elevated:false` | `pages/gateway/security/exposure-runbook.md:148-163` |

Derived: inventory host, bind, auth, channels, agents, tools, credentials, backups; gate on doctor/audit/`--deep`; rollback = loopback, disable DMs, deny exec, rotate secrets, remove `"*"`, re-audit (`pages/gateway/security/exposure-runbook.md:36-65`, `pages/gateway/security/exposure-runbook.md:180-209`) — **derived**.

## Hardened single-operator baseline

`mode:"local"`, `bind:"loopback"`, token auth, `dmScope:"per-channel-peer"`, `profile:"messaging"`, deny runtime/fs/session tools, `fs.workspaceOnly`, `exec:{security:"deny",ask:"always"}`, `elevated:false`, `agentToAgent:false`; widen one at a time (`pages/gateway/security/hardened-baseline.md:11-38`).

## Network exposure, trusted proxy, Cloudflare

Serve headers authenticate only the managed UI/WebSocket; set `trustedProxies`, overwrite `X-Forwarded-For`; trusted-proxy allows no bypass (`pages/gateway/security/network-exposure.md:122-160`). Cloudflare Tunnel keeps loopback, needs `allowLoopback:true` (`pages/gateway/cloudflare-access.md:158-170`).

## DM policy and allowlist audit

Prefer `pairing`/`allowFrom` over `open`, require mentions, `dmScope:"per-channel-peer"`; signals `channels.<id>.dm.open`, `dm.open_invalid`, `dm.scope_main_multiuser`; pairing authorizes triggering only (`pages/gateway/security/exposure-runbook.md:113-128`, `pages/gateway/security/audit-checks.md:150-168`).

## Prompt injection and external content

Strong models first, then enforce: keep `web_fetch`/`web_search`/`browser` off tool agents, use a read-only reader; external text gets `<<<EXTERNAL_UNTRUSTED_CONTENT>>>` markers; `before_model_request` can withhold/redact but is off by default (`pages/gateway/security/prompt-injection.md:18-86`).

## Secure file operations, symlinks, includes

fs-safe is a root-bounded guardrail, not a sandbox: refuses `..` and symlink patterns, atomic writes, private modes; `require` fails without helper; audit `fs.config.symlink` warn, `fs.config_include.perms_writable` critical (`pages/gateway/security/secure-file-operations.md:82-113`, `pages/gateway/security/audit-checks.md:39-46`).

## Browser control and isolation

Dedicated `openclaw` profile, no sync/password managers, tailnet-only hosts, `browser.mode:"off"` when unused; relay v2 HMAC proofs, retire via `allowLegacyAuth:false`; SSRF strict via `dangerouslyAllowPrivateNetwork`/`blockedHostnames`, request-level not firewall (`pages/gateway/security/browser-control.md:11-60`).

## Dependency locking and plugin trust

`pnpm-lock.yaml` is the review boundary; only malware blocks release, `partial` is not unaffected; inspect plugin tarballs; plugins are in-process trusted code, pin `plugins.allowlist` (`pages/gateway/security/dependency-locking.md:12-40`, `SECURITY.md:278-285`).

## Secret storage and log redaction

Dirs `700`, files `600`, full-disk encryption; workspace `.env` cannot override credentials or `OPENCLAW_*`; file logs raw `0600`, tails/diagnostics mask, `logging.redactPatterns` adds patterns (`pages/gateway/security/secrets-and-storage.md:52-93`).

`src/security/secret-mask.ts:4-16`
```typescript
export function maskApiKey(value: string): string {
  const trimmed = stripControlCharacters(value).trim();
  if (!trimmed) {
    return "missing";
  }
  if (trimmed.length <= 6) {
    return `${sliceUtf16Safe(trimmed, 0, 1)}...${sliceUtf16Safe(trimmed, -1)}`;
  }
  …
  return `${sliceUtf16Safe(trimmed, 0, 8)}...${sliceUtf16Safe(trimmed, -8)}`;
}
```

## Security audit and the false-positive model

Audit after changes; `--deep` adds code scans/live probes, `--fix` narrow fixes; findings have `checkId` and exposure-scaled severity; triage open rooms+tools, exposure, browser, perms, plugins (`pages/gateway/security/running-the-audit.md:11-46`).

| finding | triage | owner | evidence |
|---|---|---|---|
| `gateway.bind_no_auth` | critical; fix first | gateway operator | `pages/gateway/security/audit-checks.md:54` |
| `open_groups_with_elevated` | critical; lock DMs then tools | channel owner | `pages/gateway/security/audit-checks.md:142` |
| `security_full_configured` | posture warning, not a bug | tool owner | `pages/gateway/security/running-the-audit.md:30` |

False positives: injection-only chains, operator local features, trusted plugins, scanner-only reports, shared adversarial gateway; need a reproducible bypass (`SECURITY.md:48-60`, `SECURITY.md:89-120`).

## Incident response and disclosure

Contain: stop Gateway, loopback, disable risky DMs/`"*"`; rotate Gateway/remote/provider secrets; audit logs and config, re-run `--deep`; collect redacted tail and exposure (`pages/gateway/security/operator-incident-response.md:13-37`). Upstream: GHSA triage and coordinated disclosure (`pages/security/incident-response.md:10-60`).

## MITRE ATLAS and formal verification

Threats map to ATLAS tactics AML.TA0002–TA0011 and techniques AML.T0051 injection, AML.T0010 supply chain; TLA+/TLC models check gating with negative traces but are bounded to models, not full code (`pages/security/THREAT-MODEL-ATLAS.md:234-246`, `pages/security/formal-verification.md:10-41`).

## Control UI security model

Always-on same-origin CSP; scopes hide dashboards; public threads are separate read-only documents where identity headers cannot authorize private access; transcript HTML inert, widgets sandboxed, `no-store`, no `304` on revoked; media uses short-lived tickets (`pages/web/control-ui/security-model.md:14-101`).

## Hardening sequence and break-glass

Derived: loopback+token → lock DMs → tools/exec/sandbox → browser isolation → pin deps/plugins → file perms → secrets/redaction → exposure one control at a time with `--deep`; break-glass: loopback, disable DMs, deny exec, rotate secrets, re-enable narrowly (`pages/gateway/security/exposure-runbook.md:165-223`) — **derived**.

## Sources

- https://docs.openclaw.ai/gateway/security/exposure-runbook
- https://docs.openclaw.ai/gateway/security/hardened-baseline
- https://docs.openclaw.ai/gateway/security/network-exposure
- https://docs.openclaw.ai/gateway/trusted-proxy-auth
- https://docs.openclaw.ai/gateway/security/prompt-injection
- https://docs.openclaw.ai/gateway/security/secure-file-operations
- https://docs.openclaw.ai/gateway/security/browser-control
- https://docs.openclaw.ai/gateway/security/audit-checks
- https://docs.openclaw.ai/web/control-ui/security-model
- https://github.com/openclaw/openclaw/blob/main/SECURITY.md
