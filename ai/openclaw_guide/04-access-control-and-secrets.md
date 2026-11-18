# 04 - Access control and secrets

Access control is layered: authenticate the gateway caller, assign operator scopes, gate channel triggers, then apply tool policy, sandboxing, and approvals (`pages/gateway/security/trust-model.md:75-79`). Scopes are control-plane guardrails inside one trusted operator domain (`pages/gateway/operator-scopes.md:10-13`).

## Gateway auth and operator scopes

Clients connect as `operator` (CLI, Control UI) or `node` (`node.invoke` hosts); operator RPCs need the operator role (`pages/gateway/operator-scopes.md:20-28`). Shared-secret setups use `gateway.auth.token` / `gateway.auth.password` (or `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`); non-loopback proxies use `gateway.auth.mode: "trusted-proxy"` (`pages/gateway.md:76`). Identity-bearing modes honor declared scopes; `gateway.auth.mode: "none"` disables shared-secret auth (`pages/concepts/architecture.md:88-93`). Shared-secret bearer auth on `/v1/*` and `/tools/invoke` restores the full default scope set despite narrower `x-openclaw-scopes` (`SECURITY.md:133-139`).

| mode / scope | grants and limits | evidence |
|---|---|---|
| `token` / `password` | shared secret; full operator set on HTTP compatibility endpoints | `SECURITY.md:134-138` |
| `trusted-proxy` | identity headers; honors declared scopes | `SECURITY.md:139`, `pages/gateway/operator-scopes.md:1028-1030` |
| `none` | private ingress only; disables shared-secret auth | `pages/concepts/architecture.md:92-93` |
| `operator.read` / `operator.write` | read-only calls; mutating actions (satisfies read) | `pages/gateway/operator-scopes.md:34-37` |
| `operator.admin` | every `operator.*`, config writes, high-risk approvals | `pages/gateway/operator-scopes.md:39` |


## Device and node pairing

Pairing records are the durable source of approved roles and scopes; a broader reconnect creates a pending upgrade request, and approval needs `operator.pairing` plus authority for every requested scope (`pages/gateway/operator-scopes.md:934-958`). Node approval scopes scale with declared commands: none needs `operator.pairing`, ordinary commands add `operator.write`, and `system.run` / `browser.proxy` / `fs.listDir` add `operator.admin` (`pages/gateway/operator-scopes.md:999-1006`). Node commands stay disabled until node pairing is approved (`pages/gateway/pairing.md:256-271`). `gateway.nodes.commands.allow` / `deny` matches exact command names; the node's exec approvals file governs `system.run` (`pages/gateway/security/tool-permissions.md:66-76`).

## Channel allowlists and DM policy

`dmPolicy` gates inbound DMs: `pairing` (default; 1-hour codes, max 3 pending), `allowlist`, `open` (requires `"*"`), and `disabled` (`pages/gateway/security/access-control.md:13-20`).

`pages/gateway/security/access-control.md:22-25`
```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

DM `allowFrom` and group allowlists (`groupPolicy` + `groupAllowFrom`, `channels.discord.guilds`, `channels.slack.channels`) are separate layers; group policy runs before mention/reply activation, and replying does not bypass `groupAllowFrom` (`pages/gateway/security/access-control.md:31-39`). `session.dmScope` (`main`, `per-channel-peer`, `per-account-channel-peer`, `per-peer`) isolates inboxes as a messaging-context boundary (`pages/gateway/security/access-control.md:42-61`). `contextVisibility` is `all`, `allowlist`, or `allowlist_quote` (`pages/gateway/security/access-control.md:65-78`). Commands use `commands.allowFrom`; empty or `"*"` lists are effectively open (`pages/gateway/security/access-control.md:80-84`). Access groups are reusable sender lists under `accessGroups`, referenced as `accessGroup:<name>`; they grant nothing until an allowlist references them (`pages/channels/access-groups.md:10-14`).

## Config keys (selected)

| key | purpose | evidence |
|---|---|---|
| `gateway.auth.mode` | token, password, trusted-proxy, none | `pages/concepts/architecture.md:86-93` |
| `gateway.nodes.commands.allow` / `.deny` | node command names | `pages/gateway/security/tool-permissions.md:71` |
| `channels.<id>.dmPolicy` / `allowFrom` | DM gate and sender list | `pages/gateway/security/access-control.md:13-38` |
| `accessGroups` | reusable sender lists | `pages/channels/access-groups.md:10-14` |
| `session.dmScope` | DM session isolation | `pages/gateway/security/access-control.md:46-59` |
| `secrets.egressProxy.enabled` | destination-bound secret proxy | `pages/gateway/secrets/secret-store-and-egress.md:71-76` |

## SecretRef contract, env, and store

`pages/gateway/secrets/secretref-contract.md:15-17`
```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

Providers are `env` (uppercase id), `file` (JSON pointer or `value`), `exec` (selector, no `..` segments), and `store` (uppercase name, team scope); names match `^[a-z][a-z0-9_-]{0,63}$` (`pages/gateway/secrets/secretref-contract.md:53-94`). `env`/`store` may use implicit defaults; `file`/`exec` need registered providers (`pages/gateway/secrets/secretref-contract.md:19-38`). Env sources are parent process, `.env` files, and inline `env.vars`; `${VAR}` substitution works in config values and `$include` files (`pages/gateway/configuration/environment-variables.md:13-61`). The shared store is team-scoped: protected `secret` values are write-only with no reveal RPC, `env` values are admin-visible and injected into Gateway-hosted exec; values are capped at 64 KiB and not encrypted at rest (`pages/gateway/secrets/secret-store-and-egress.md:12-50`). The default-off egress proxy substitutes sentinels only for exact bound HTTPS hosts; `--allow-host` binds a destination and `openclaw config set secrets.egressProxy.enabled true --strict-json` enables it after restart (`pages/gateway/secrets/secret-store-and-egress.md:53-91`).

## Masking, rotation, and exec policy

File logs are raw at `0600`; tails, console, diagnostics, and OTel export mask independently, while transcripts keep original text; `logging.redactPatterns` adds patterns and `openclaw status --all` is the redacted form (`pages/gateway/security/secrets-and-storage.md:82-93`). Keep `~/.openclaw` at `700` and `openclaw.json` at `600` (`pages/gateway/security/secrets-and-storage.md:54-59`). Token rotation hot-applies only when auth mode is unchanged (`pages/gateway/security/network-exposure.md:120`); model keys rotate on rate-limit/quota errors (`pages/gateway/authentication.md:125-144`). Exec approvals stack on tool policy: commands need policy, allowlist, and optional approval agreement, and bind cwd, argv, env, and executable identity (`pages/tools/exec-approvals.md:12-17`, `pages/tools/exec-approvals.md:50-59`). `tools.exec.mode` is `deny`, `allowlist`, `ask`, `auto`, or `full` (`pages/tools/exec-approvals.md:243-253`). Deny control-plane tools for untrusted content (`pages/gateway/security/tool-permissions.md:23-31`). Session modes set a filesystem boundary and escalation reviewer: `read-only`, `guarded`, `workspace`, `full` (`pages/gateway/permission-modes.md:10-29`).

## Sources

- https://docs.openclaw.ai/gateway/security/access-control
- https://docs.openclaw.ai/gateway/operator-scopes
- https://docs.openclaw.ai/gateway/pairing
- https://docs.openclaw.ai/channels/access-groups
- https://docs.openclaw.ai/gateway/secrets/secretref-contract
- https://docs.openclaw.ai/gateway/secrets/secret-store-and-egress
- https://docs.openclaw.ai/gateway/security/secrets-and-storage
- https://docs.openclaw.ai/tools/exec-approvals
