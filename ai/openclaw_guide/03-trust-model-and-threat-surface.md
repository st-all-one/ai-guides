# 03 - Trust model and threat surface

OpenClaw is local-first agent infrastructure for trusted operators; one gateway is not a shared multi-tenant boundary between adversarial users (`SECURITY.md:5`, `SECURITY.md:128`). One gateway equals one trust boundary: a single operator or mutually trusting team, preferably one OS user/host/VPS per boundary (`pages/gateway/security/trust-model.md:13-15`). The model/agent is not a trusted principal: assume prompt/content injection can manipulate behavior (`SECURITY.md:241`).

## Shared agents and best-effort attribution

`SECURITY.md:11-13`
```
## Shared Agents

Anyone who can operate an agent can make it do anything that agent can do. Session ownership, visibility, and presence are usability features, not security boundaries. Turn attribution is best-effort because steering can merge input into an active turn. Use separate agents or separate gateway/host trust boundaries when operators need real isolation.
```

A company-shared agent is valid only when users share a trust boundary and the agent is strictly business-only; use a dedicated machine/VM/container and accounts (`SECURITY.md:217-219`). A gateway shared by mutually untrusted people is not recommended; split by OS user/host/gateway (`SECURITY.md:205-207`, `pages/gateway/security/trust-model.md:69`). Session identifiers are routing selectors, not authorization tokens (`SECURITY.md:140`, `pages/gateway/security/trust-model.md:21`).

## Boundary ownership map (derived)

| boundary | owner | failure mode | evidence |
|---|---|---|---|
| Gateway auth | gateway operator | shared secret treated as scoped per-user auth | `SECURITY.md:130-139` |
| `sessionKey` / session IDs | routing layer | misuse as authorization token | `SECURITY.md:140`, `pages/gateway/security/trust-model.md:21` |
| Agent plus delegated tools | configuring operator | any allowed sender steers same tool authority | `SECURITY.md:213`, `pages/gateway/security/trust-model.md:16` |
| Node pairing, `node.invoke` | gateway and node operator | pairing treated as per-command approval | `SECURITY.md:263-264`, `pages/gateway/security/trust-model.md:64-66` |
| Exec approvals | execution-host operator | assumed per-user isolation or read-only filesystem | `SECURITY.md:264-265`, `pages/gateway/security/trust-model.md:66` |
| Plugin runtime | gateway operator | malicious behavior of trusted-installed plugin | `SECURITY.md:153-157`, `SECURITY.md:280-284` |
| Workspace memory | local operator | "attacker writes memory, recall returns it" | `SECURITY.md:271-275` |

## What is and is not a security bug

The fastest report shows a reproducible boundary bypass with demonstrated impact (`SECURITY.md:7`). The acceptance gate asks for an exact vulnerable path, tested version/commit, PoC against latest `main` or shipped tag, impact tied to documented boundaries, a scope check, and a statement that the report does not rely on adversarial operators sharing one gateway (`SECURITY.md:74-85`). Usually not bugs: injection without a policy/auth/approval/sandbox/tool-boundary bypass; intentional local features; environment control before launch; malicious trusted-installed plugins; multi-tenant expectations; scanner-only or stale-path reports; deployments the docs recommend against (`SECURITY.md:48-58`). Extended false positives include arm-then-use operator guards (`SECURITY.md:96`), authorized sender local actions (`SECURITY.md:97`), shared-secret bearer auth on `/v1/*` and `/tools/invoke` ignoring narrower `x-openclaw-scopes` (`SECURITY.md:101-103`), heuristic/parity detection drift (`SECURITY.md:104`), and trusted local symlink/hardlink state (`SECURITY.md:109-112`). Public exposure and `dangerous*`/`dangerously*` break-glass flags are out of scope (`SECURITY.md:173-174`, `SECURITY.md:186`).

## Threat surface: untrusted content

Injection does not require public DMs: web results, browser pages, email, and attachments can carry hostile instructions (`pages/gateway/security/prompt-injection.md:12-18`). The stance is identity first, scope next, model last: decide who can talk, where the bot can act, then assume manipulation and limit damage (`pages/gateway/security/trust-model.md:73-79`). Model choice is a mitigation, not a boundary; keep enforcement in tool policy, exec approvals, sandboxing, and allowlists (`pages/gateway/security/prompt-injection.md:14-16`).

## Private disclosure path

Report to the repository where the issue lives: core CLI, gateway, and apps to `openclaw/openclaw`, ClawHub to `openclaw/clawhub`, otherwise email `security@openclaw.ai` for routing (`SECURITY.md:17-25`). Core issues use a private GitHub Security Advisory; never open a public issue or PR disclosing an unpatched vulnerability, exploit path, secret, or proof of concept (`SECURITY.md:27-29`). Include component/version/commit, reproduction, impact with the boundary crossed, and remediation (`SECURITY.md:40-44`). Maintainer GHSA patches via `gh api` need `X-GitHub-Api-Version: 2022-11-28` or newer (`SECURITY.md:124`).

## MITRE ATLAS threat atlas

Version 1.0-draft, based on MITRE ATLAS plus data flow diagrams; `SECURITY.md` is the source of truth for report scope (`pages/security/THREAT-MODEL-ATLAS.md:9-11`, `pages/security/THREAT-MODEL-ATLAS.md:28`). Scope covers agent runtime, gateway, channels, ClawHub, MCP servers, and partially user devices (`pages/security/THREAT-MODEL-ATLAS.md:19-26`). Five trust boundaries and six data flows are drawn (`pages/security/THREAT-MODEL-ATLAS.md:34-108`). The catalog splits by tactic, from reconnaissance AML.TA0002 through impact AML.TA0011, with IDs T-RECON, T-ACCESS, T-EXEC, T-PERSIST, T-EVADE, T-DISC, T-EXFIL, T-IMPACT (`pages/security/THREAT-MODEL-ATLAS.md:112-125`). The risk matrix rates T-EXEC-001, T-PERSIST-001, and T-EXFIL-003 Critical/P0 (`pages/security/THREAT-MODEL-ATLAS.md:163-200`). Recommendations are tiered P0/P1/P2 (`pages/security/THREAT-MODEL-ATLAS.md:206-228`).

## Incident response and formal verification

Triage confirms component, version, and boundary impact, classifies by `SECURITY.md` scope, and assigns an owner (`pages/security/incident-response.md:10-22`). Severity runs Critical to Low by bypass and impact (`pages/security/incident-response.md:24-31`). Response acknowledges privately, reproduces on supported releases and latest `main`, and patches with regression coverage (`pages/security/incident-response.md:33-38`). Disclosure uses GitHub Security Advisories, release notes, and reporter follow-up; Critical/High may get CVEs (`pages/security/incident-response.md:40-44`). Recovery verifies artifacts and runs a post-incident review (`pages/security/incident-response.md:46-52`). Formal models (TLA+/TLC) cover authorization, session isolation, tool gating, and misconfiguration safety with runnable checks and paired negative counterexamples (`pages/security/formal-verification.md:10-20`). They are not a proof of overall security or of the TypeScript implementation; results are bounded by state space and assumptions, and the previously documented models repository is unreachable (`pages/security/formal-verification.md:21-41`).

## Sources

- https://github.com/openclaw/openclaw/blob/main/SECURITY.md
- https://docs.openclaw.ai/gateway/security/trust-model
- https://docs.openclaw.ai/gateway/security/prompt-injection
- https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS
- https://docs.openclaw.ai/security/incident-response
- https://docs.openclaw.ai/security/formal-verification
- https://docs.openclaw.ai/gateway/security/operator-incident-response
- https://trust.openclaw.ai/
