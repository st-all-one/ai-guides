# 06 - Permissions and security

Deno 2.9.3 is secure by default: without a grant a program cannot read or write files, open sockets, read environment variables, or start subprocesses (`docs/rt_runtime__fundamentals__security.md:7-13`). Node gives dependencies full system I/O; Deno requires an explicit grant per resource (`docs/rt_runtime__fundamentals__security.md:10-13`).

## Grant and deny surface

A bare flag grants a whole category; a valued flag lists the resources (`docs/rt_runtime__fundamentals__security.md:62-85`). Every `--deny-*` overrides its allow counterpart (`docs/rt_runtime__reference__permissions.md:33-37`).

| Flag | Gate and scope | Evidence |
|---|---|---|
| `-R` / `--allow-read` | reads; comma-separated paths, a directory covers subdirectories | `docs/rt_runtime__reference__permissions.md:96-123` |
| `-W` / `--allow-write` | writes to listed paths | `docs/rt_runtime__reference__permissions.md:135-145` |
| `-N` / `--allow-net` | sockets and DNS; `host`, `host:port`, IPv6, `*.example.com` | `docs/rt_runtime__reference__permissions.md:225-260` |
| `-E` / `--allow-env` | variables; exact names or `AWS_*` wildcard since 2.1 | `docs/rt_runtime__reference__permissions.md:295-318` |
| `-S` / `--allow-sys` | OS info; names like `cpus`, `osRelease`, `networkInterfaces` | `docs/rt_runtime__reference__permissions.md:359-407` |
| `--allow-run` | subprocesses; executable names | `docs/rt_runtime__reference__permissions.md:409-437` |
| `--allow-ffi` | `Deno.dlopen` and Node-API addons; library paths | `docs/rt_runtime__reference__permissions.md:496-529` |
| `--allow-import` | dynamic web imports; host list replaces defaults | `docs/rt_runtime__reference__permissions.md:541-586` |
| `-A` / `--allow-all` | everything; disables the sandbox | `docs/rt_runtime__reference__permissions.md:39-49` |

Denials carve out paths, hosts, variables, interfaces, executables, libraries, and import hosts; a bare deny also disables prompts for that category (`docs/rt_runtime__reference__permissions.md:125-156`, `docs/rt_runtime__reference__permissions.md:262-271`, `docs/rt_runtime__reference__permissions.md:580-586`). `--ignore-env` returns `undefined` for restricted reads instead of failing (`docs/rt_runtime__reference__permissions.md:334-347`).

Grant only the intended host (`docs/rt_runtime__fundamentals__security.md:76-80`):
```sh
deno run --allow-net=example.com main.ts
```

## Refusal, prompts, and runtime APIs

Missing grants throw `Deno.errors.NotCapable`, catchable by application code (`docs/rt_runtime__fundamentals__security.md:87-99`). With a terminal on stdout and no flag, Deno prompts `[y/n/A]`; prompts are suppressed off a TTY or under `--no-prompt` (`docs/rt_runtime__fundamentals__security.md:101-107`, `docs/rt_runtime__reference__permissions.md:27-31`).

| API or config | Effect on privilege | Evidence |
|---|---|---|
| `Deno.permissions.query` | reports whether a permission is granted | `docs/rt_runtime__fundamentals__security.md:152-155` |
| `Deno.permissions.request` | prompts for a permission on demand | `docs/rt_runtime__fundamentals__security.md:156-158` |
| `Deno.permissions.revoke` | downgrades a grant to the prompt state | `docs/rt_runtime__fundamentals__security.md:157-170` |
| `"permissions"` in `deno.json` | named sets via `-P=<name>`; booleans, arrays, or `{ allow, deny, ignore }` | `docs/rt_runtime__reference__deno_json.md:676-774` |

Drop access after startup (`docs/rt_runtime__fundamentals__security.md:160-166`):
```ts
// Read a config file at startup, then give up read access.
const config = JSON.parse(await Deno.readTextFile("./config.json"));
await Deno.permissions.revoke({ name: "read" });

// Later reads now have to prompt again, and fail outright under --no-prompt.
```

## Controls that bypass the sandbox

| Control | Why it escapes | Evidence |
|---|---|---|
| `--allow-run` | subprocesses run with their own permissions, independent of the parent | `docs/rt_runtime__reference__permissions.md:418-427` |
| `--allow-run=deno` | a child can start with `--allow-all`, inheriting no parent limit | `docs/rt_runtime__reference__permissions.md:445-451` |
| `LD_*` / `DYLD_*` child variables | linker-injected libraries need unscoped `--allow-run` | `docs/rt_runtime__reference__permissions.md:453-478` |
| `--allow-ffi` | native libraries issue system calls directly in-process | `docs/rt_runtime__fundamentals__security.md:134-139` |
| write plus run | overwriting an allowed executable makes the next child attacker-controlled | `docs/rt_runtime__fundamentals__security.md:141-145` |
| self-signals | `Deno.kill(Deno.pid, ...)` and `process.kill(process.pid, ...)` need no flag | `docs/rt_runtime__reference__permissions.md:439-443` |

## Loading and symlink exemptions

| Behavior | Rule | Evidence |
|---|---|---|
| Static graph | imports load without read or net grants; executed code is still checked | `docs/rt_runtime__fundamentals__security.md:43-53` |
| Non-literal dynamic import | checked against `--allow-read` / `--allow-import` at runtime | `docs/rt_runtime__fundamentals__security.md:48-53` |
| Worker script | local file needs `--allow-read`; `https:` needs `--allow-import`; `data:`/`blob:` need none | `docs/rt_runtime__reference__permissions.md:183-190` |
| Allowed registries | `deno.land`, `jsr.io`, `esm.sh`, `raw.esm.sh`, `cdn.jsdelivr.net`, GitHub raw and gists | `docs/rt_runtime__reference__permissions.md:273-287` |
| Symlinks | checked at link location; `/proc`, `/dev`, `/sys` need `--allow-all`; `environ` needs `--allow-env`; `Deno.symlink()` needs full read and write | `docs/rt_runtime__reference__permissions.md:198-223` |

## Audit trail and external broker

`DENO_TRACE_PERMISSIONS=1` adds stack frames at a performance cost; `DENO_AUDIT_PERMISSIONS=<path>` writes JSONL with `v`, `datetime`, `permission`, `value`; `=otel` emits records with `deno.permission.type` and `.value` (`docs/rt_runtime__reference__permissions.md:51-89`). `DENO_PERMISSION_BROKER_PATH` ignores flags and prompts, delegates every check, and exits on malformed or out-of-order messages (`docs/rt_runtime__fundamentals__security.md:211-241`).

Broker pairs are versioned (`docs/rt_runtime__fundamentals__security.md:256-268`):
```text
…
-> req {"v":1,"pid":10234,"id":5,"datetime":"2025-01-01T00:00:04.000Z","permission":"env","value":null}
<- res {"id":5,"result":"deny","reason":"Environment access is denied."}
```

## Pitfalls

- `eval`, `new Function`, dynamic import, and workers keep the caller's privilege; use a reduced-permission worker plus OS or MicroVM isolation for untrusted code (`docs/rt_runtime__fundamentals__security.md:172-201`).
- `--allow-run` and `--allow-ffi` are effectively full access (`docs/rt_runtime__fundamentals__security.md:147-148`).
- `localStorage`, Deno KV, `caches`, and `Blob` consume disk without read or write grants (`docs/rt_runtime__reference__permissions.md:158-170`).
- A broker replaces flags and prompts and must stay available (`docs/rt_runtime__fundamentals__security.md:230-241`).
- npm lifecycle scripts are opt-in (`docs/rt_runtime__reference__permissions.md:491-494`).

## Sources
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/reference/cli/run/
- https://github.com/denoland/deno
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/api/deno/
- https://jsr.io/
