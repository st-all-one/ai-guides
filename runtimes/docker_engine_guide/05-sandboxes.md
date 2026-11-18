# 05 - sandboxes

Docker Sandboxes run coding agents in isolated environments. The captured pages
describe local sandboxes as the default; cloud differences are called out where
documented. Nothing here is live-verified.

## 1. Architecture and isolation boundary

Each agent runs in its own microVM with a separate Linux kernel; five layers
protect the host: hypervisor, network, Docker Engine, workspace, and credential
proxy `pages/ai/sandboxes/security/isolation.md:13-16`. Processes inside the VM
are invisible to the host and other sandboxes, `sbx rm` deletes the VM and all
contents, and the agent is non-root with sudo; the hypervisor, not in-VM
privilege separation, is the control
`pages/ai/sandboxes/security/isolation.md:18-42`.

| Workspace mode | Documented boundary | Source |
|---|---|---|
| Mountless (`sbx create` with no path) | No host workspace; template `WORKDIR` (default `/home/agent/workspace`) persists in the sandbox | `pages/ai/sandboxes/architecture.md:18-25` `pages/ai/sandboxes/security/isolation.md:124-140` |
| Direct mount (path or `sbx run`) | Read-write passthrough of host files; no boundary between agent edits and host filesystem | `pages/ai/sandboxes/architecture.md:27-38` `pages/ai/sandboxes/security/isolation.md:142-147` |
| Clone mode (`--clone`) | Host repo read-only at `/run/sandbox/source`; agent edits a private clone and never reaches host until fetched | `pages/ai/sandboxes/architecture.md:40-42` `pages/ai/sandboxes/security/isolation.md:117-119` |

Each sandbox keeps its own Docker daemon state, image cache, and packages; no
images or layers are shared, except the read-only skills store
`pages/ai/sandboxes/architecture.md:50-64`. `sbx run` initializes the VM;
stop/restart preserves it `pages/ai/sandboxes/architecture.md:145-149`.

## 2. Default security posture and threat model

With `sbx run claude` and no extra flags: all outbound TCP (including HTTP,
HTTPS, SSH) is blocked unless a rule allows it, outbound UDP is disabled,
ICMP is blocked, and DNS uses an internal policy-enforcing resolver
`pages/ai/sandboxes/security/defaults.md:13-24`. The current directory is
mounted read-write, including hidden files, configuration, build scripts, and
Git hooks `pages/ai/sandboxes/security/defaults.md:29-33`. Shared skills mount
read-only by default; `readwrite` access lets a sandbox change what others load
`pages/ai/sandboxes/security/defaults.md:44-54`.

Inside the VM the agent has `sudo`, a private Docker Engine, package managers,
and full filesystem read/write; all of it persists across stop/restart and is
deleted by `sbx rm` `pages/ai/sandboxes/security/defaults.md:65-78`. No
credentials are available unless supplied by `sbx secret` or environment
variables `pages/ai/sandboxes/security/defaults.md:56-63`.

Policy cannot change these blocks: host filesystem outside workspaces and the
skills store, host Docker daemon, sandbox-to-sandbox traffic, external ICMP
`pages/ai/sandboxes/security/defaults.md:80-92`. All outbound TCP crosses a host
proxy and only matching rules pass
`pages/ai/sandboxes/security/isolation.md:44-67`. Local stdio MCP servers are a
host-side exception that may use host Docker
`pages/ai/sandboxes/security/isolation.md:81-85`.

## 3. Credential handling

A host-side HTTP/HTTPS proxy intercepts outbound requests, looks up the matching
credential on the host, and rewrites the auth header; the sandbox sees only a
sentinel such as `proxy-managed` and never the real value
`pages/ai/sandboxes/configuration/credentials.md:4-27`. The host proxy checks
policy and rewrites the header after egress, keeping the secret outside
`pages/ai/sandboxes/architecture.md:92-107`. OAuth
`passthrough: true` sends the real token into the sandbox and reduces isolation
`pages/ai/sandboxes/configuration/credentials.md:25-27`.

Stored secrets go to OS keychains (macOS Keychain, Windows Credential Manager,
Linux Secret Service), with an automatic file fallback under
`$XDG_CONFIG_HOME/com.docker.sandboxes` on headless Linux
`pages/ai/sandboxes/configuration/credentials.md:47-77`. Credential bindings
record authorized mechanisms and domains but not values
`pages/ai/sandboxes/configuration/credentials.md:39-41`.

## 4. Network policy, governance, and MCP

Local rules allow or block destinations with `sbx policy allow`/`deny`, applying
to all sandboxes unless scoped with `--sandbox`
`pages/ai/governance/local/network-rules.md:4-20`. Hostname blocking has
documented limits: unencrypted SNI/Host mismatches, only the first `Host` on a
tunneled cleartext connection, and shared-IP attribution
`pages/ai/governance/local/network-rules.md:28-43`. `sbx policy ls` and `sbx
policy inspect` report the active sources and rules
`pages/ai/governance/local/inspect.md:4-5`. Filesystem rules require `read` and,
for writable workspaces, `write` permission on the host path
`pages/ai/governance/reference/filesystem-rules.md:4-14`. A request needing
approval is blocked until responded to; a matching deny rule never asks
`pages/ai/governance/local/approvals.md:4-22`.

MCP policies are written in Cedar, are default-deny, and a `forbid` overrides
any `permit`; actions include `register`, `invokeTool`, `invokePrimordial`,
`readResource`, and `getPrompt`
`pages/ai/governance/reference/mcp-policy.md:18-50`. The gateway runs on the
host side, brokers registered servers, and enforces MCP policy separately from
the HTTP proxy `pages/ai/sandboxes/architecture.md:129-143`; registration and
credentials are host-managed `pages/ai/sandboxes/mcp-gateway.md:8-23`: register
with `sbx mcp add notion --url https://mcp.notion.com/mcp`
`pages/ai/sandboxes/mcp-gateway.md:41`.

Expose it at sandbox creation with
`sbx run claude --name mcp-demo --static-mcp notion`
`pages/ai/sandboxes/mcp-gateway.md:56`.

## 5. Local versus cloud

Local sandboxes use host resources, host paths, host-managed secrets and policy,
and persist until removed; cloud sandboxes use Docker-managed resources, have no
host paths or hardware, separate secret stores, their own network policy, and
expire by time-to-live `pages/ai/sandboxes/cloud/local-vs-cloud.md:8-20`. Stores
are separate across backends: `sbx ls` and `sbx --cloud ls` differ, and `sbx
move` does not unify resources or copy host-mounted files or managed secrets
`pages/ai/sandboxes/cloud/local-vs-cloud.md:46-56`.

Cloud network policy is a separate network-only store with account and sandbox
scopes; matching deny rules take precedence over allows, local rules are not
copied, and L7 method/path rules are unsupported
`pages/ai/sandboxes/cloud/network-policy.md:4-28` `pages/ai/sandboxes/cloud/network-policy.md:51-70`. Presets are `allow-all`,
`balanced`, and `deny-all`; initialize with
`sbx --cloud policy init deny-all`
`pages/ai/sandboxes/cloud/network-policy.md:35`.

## 6. Kits and tool mixins

Kits v2 defines `kind: mixin` and `kind: sandbox`, with top-level credential,
network, port, environment, and setup fields
`pages/ai/sandboxes/customize/kits-v2.md:129-165` `pages/ai/sandboxes/customize/kits-v2.md:319-405`. A tool mixin adds an
executable plus the runtime access it needs to an existing agent
`pages/ai/sandboxes/customize/author/tool-mixins.md:5-12`. Kit sources are
restricted to an allowlist documented at
`pages/ai/sandboxes/troubleshooting.md:164-183`, which defaults to Docker Hub only.
Set it with `sbx settings set kit.allowedSources '["docker.io/","github.com/docker/"]'`
`pages/ai/sandboxes/troubleshooting.md:179`.

## 7. Failure modes

`running (not responding)` is recovered with `sbx stop <SANDBOX_NAME>` then
`sbx start <SANDBOX_NAME>`, which keeps files
`pages/ai/sandboxes/troubleshooting.md:62-73`
`pages/ai/sandboxes/troubleshooting.md:69-70`.

Hanging daemon commands call for `sbx daemon restart`, which does not delete
data; `sbx reset` is the stronger option
`pages/ai/sandboxes/troubleshooting.md:75-86`. Governance failures include an
uninitialized global network policy, every request blocked, and a local allow
rule with no effect `pages/ai/governance/troubleshooting.md:9-78`.

`derived` operating rule: use mountless or clone mode for untrusted agents, keep
the default-deny network posture, and never register an MCP server or kit source
you have not reviewed. Nothing was executed.

## Sources

https://docs.docker.com/ai/sandboxes/architecture/
https://docs.docker.com/ai/sandboxes/security/isolation/
https://docs.docker.com/ai/sandboxes/security/defaults/
https://docs.docker.com/ai/sandboxes/configuration/credentials/
https://docs.docker.com/ai/sandboxes/mcp-gateway/
https://docs.docker.com/ai/sandboxes/cloud/network-policy/
https://docs.docker.com/ai/sandboxes/cloud/local-vs-cloud/
https://docs.docker.com/ai/governance/local/network-rules/
https://docs.docker.com/ai/governance/reference/mcp-policy/
https://docs.docker.com/ai/sandboxes/troubleshooting/
