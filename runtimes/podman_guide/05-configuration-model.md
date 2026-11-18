# 05 — Configuration model

## 1. Precedence and global flags

The resolution order is **CLI flag > environment variable > config file > built-in default**.
`containers.conf` only supplies defaults for flags; env vars set before the command override
those defaults, and an explicit flag overrides both (source: `pages/markdown/podman.1.md:14-16,165`).

Source: `pages/markdown/podman.1.md:354-359`
```text
CONFIGURATION FILES
containers.conf
Podman has builtin defaults for command line options. These defaults can be overridden using the containers.conf configuration files.
For a complete list of supported paths and their override order, see containers.conf(5). Podman merges its builtin defaults with the specified fields from these files, if they exist. Fields specified in the users file override the administrator’s file, which overrides the distribution’s file, which overrides the built-in defaults.
Podman uses builtin defaults if no containers.conf file is found.
If the CONTAINERS_CONF environment variable is set, then its value is used for the containers.conf file rather than the default.
```

Merge order within config files: **user > administrator > distribution > built-in**
(source: `pages/markdown/podman.1.md:357`). Global (root-level) flags such as `--module`,
`--root`, `--log-level`, `--connection` and `--runtime-flag` must precede the subcommand; they
are parsed by the top-level command, not by `run`/`create` (source:
`pages/markdown/podman.1.md:65-68,79-92`).

| Channel | Scope | Example | Source |
|---|---|---|---|
| CLI flag | one invocation, highest | `--storage-driver=vfs` | `pages/markdown/podman.1.md:98-104` |
| Environment | one shell/session | `STORAGE_DRIVER=vfs` | `pages/markdown/podman.1.md:181-185` |
| Config file | engine/system/user | `[engine] runtime = "crun"` | `samples/containers.conf:713-715` |
| Built-in default | compile-time | `pull_policy = "missing"` | `samples/containers.conf:693-695` |

Because there is no daemon, configuration is read when each command starts and there is nothing
to reload in place (`derived` from the daemonless model, source: `pages/markdown/podman.1.md:6-8`).

## 2. Config file inventory

| File | Purpose | Env override | Source |
|---|---|---|---|
| `containers.conf` | flag defaults for engine/containers/network | `CONTAINERS_CONF` | `pages/markdown/podman.1.md:355-359` |
| `storage.conf` (`containers-storage.conf(5)`) | storage driver, graphroot/runroot, options | `CONTAINERS_STORAGE_CONF` | `pages/markdown/podman.1.md:369-373` |
| `registries.conf` | short-name completion, mirrors, blocking, aliases | `CONTAINERS_REGISTRIES_CONF` | `pages/markdown/podman.1.md:365-368` |
| `policy.json` | image signature verification policy | — | `pages/markdown/podman.1.md:363-364` |
| `mounts.conf` | volume mount directories auto-added to containers | — | `pages/markdown/podman.1.md:360-362` |
| `auth.json` | registry credentials | `REGISTRY_AUTH_FILE` | `pages/markdown/podman-create.1.md:93-95` |
| `containers-registries.d/` | sigstore/signature lookups for image-sign | — | `pages/markdown/podman-image-sign.1.md:8-9,34-35` |

`registries.conf` uses `unqualified-search-registries`, `[[registry]]` blocks with
`prefix`/`location`/`insecure`, and `[aliases]` (source: `samples/registries.conf:9,11-34`).
`policy.json` maps transports and scopes to trust types; the sample is explicitly a **test
fixture**, not a production policy (source: `samples/MANIFEST.md` and `samples/policy.json:1-6`).
The auth file defaults to `${XDG_RUNTIME_DIR}/containers/auth.json` on Linux and
`$HOME/.config/containers/auth.json` on Windows/macOS (source: `pages/markdown/podman-login.1.md:11-17`).

## 3. Root vs rootless paths and XDG variables

Distribution files live under `/usr/share/containers`, administrator files under
`/etc/containers`, and user files under `$XDG_CONFIG_HOME/containers` (default
`$HOME/.config/containers`); user files win (source: `pages/markdown/podman.1.md:48,150,188-191,357`).

| Variable | Rootless effect | Default | Source |
|---|---|---|---|
| `XDG_CONFIG_HOME` | config file search root | `$HOME/.config/containers` | `pages/markdown/podman.1.md:188-191` |
| `XDG_DATA_HOME` | image pull/storage root | `$HOME/.local/share/containers/storage` | `pages/markdown/podman.1.md:192-195` |
| `XDG_RUNTIME_DIR` | temporary config data | `${XDG_RUNTIME_DIR}/containers` | `pages/markdown/podman.1.md:196-197` |
| `PODMAN_NO_PAUSE_PROCESS` | nonzero disables pause process | unset (pause used) | `pages/markdown/podman.1.md:198-200` |

Rootful defaults: `--root` `/var/lib/containers/storage`, `--runroot` `/run/containers/storage`,
`--tmpdir` `/run/libpod/tmp`; rootless: `$HOME/.local/share/containers/storage`,
`/run/user/$UID/run`, `$XDG_RUNTIME_DIR/libpod/tmp` (source:
`pages/markdown/podman.1.md:79-86,123-125`). Network config dir is `/etc/containers/networks`
as root and `$graphroot/networks` rootless (source: `pages/markdown/podman.1.md:69-72`).

## 4. `containers.conf` modules (`--module`)

Source: `pages/markdown/podman.1.md:65-68`
```text
--module=path
Load the specified containers.conf(5) module. Can be an absolute or relative path. Please refer to containers.conf(5) for details.
This flag is not supported on the remote client, including Mac and Windows (excluding WSL2) machines.
Further note that the flag is a root-level flag and must be specified before any Podman sub-command.
```

Modules let a site layer reusable fragments onto the base config; because `--module` is a
root-level flag, `podman --module=base.conf run …` is valid but `podman run --module=…` is not
(source: `pages/markdown/podman.1.md:65-68`). Modules are **local-only**: a remote client cannot
load them, so remote deployments must place the module in the server's config (source:
`pages/markdown/podman.1.md:65-68`).

## 5. Storage, registry, policy and auth knobs

Env variables that change storage behavior (source: `pages/markdown/podman.1.md:164-197`):

| Variable | Effect | Source |
|---|---|---|
| `STORAGE_DRIVER` | default `--storage-driver` | `pages/markdown/podman.1.md:181-182` |
| `STORAGE_OPTS` | default `--storage-opt`; overrides `containers-storage.conf(5)` | `pages/markdown/podman.1.md:183-185` |
| `CONTAINERS_CONF` / `_STORAGE_CONF` / `_REGISTRIES_CONF` | replace the default config paths | `pages/markdown/podman.1.md:166-171` |
| `REGISTRY_AUTH_FILE` | override `auth.json` path | `pages/markdown/podman-create.1.md:93-95` |
| `PODMAN_USERNS` | default `--userns` mode | `pages/markdown/podman-run.1.md:1472-1476` |
| `CONTAINER_HOST` | default `--url`; enables `--remote` | `pages/markdown/podman.1.md:174-175` |
| `CONTAINER_CONNECTION` | default `--connection`; enables `--remote` | `pages/markdown/podman.1.md:172-173` |
| `CONTAINER_SSHKEY` | default `--identity` | `pages/markdown/podman.1.md:176-177` |
| `PODMAN_CONNECTIONS_CONF` | connections/farms store (default `~/.config/containers/podman-connections.json`) | `pages/markdown/podman.1.md:178-180` |

Source: `pages/markdown/podman.1.md:181-185`
```text
STORAGE_DRIVER
Set default --storage-driver value.
STORAGE_OPTS
Set default --storage-opt value. Overrides storage driver options in containers-storage.conf(5).
Ignored when the --root or --storage-driver options are set.
```

Storage flag interaction is a deterministic-state trap: `--root` and `--storage-driver` **clear**
both `storage.options.<driver>` in `storage.conf` and `STORAGE_OPTS`; the missing options must be
re-supplied explicitly with `--storage-opt` (source: `pages/markdown/podman.1.md:79-83,98-104`).

`PODMAN_USERNS` sits between pod mode and `containers.conf` in the userns default chain
(source: `pages/markdown/podman-run.1.md:1472-1477`). `CONTAINER_HOST` uses format
`<schema>://[<user[:<password>]@]<host>[:<port>][<path>]` with schema `ssh` (default), `tcp`
or `unix`; resolution is CLI → `CONTAINER_HOST` → `engine.service_destinations` (excluding
`/usr/share/containers`) → `unix:///run/podman/podman.sock` (source:
`pages/markdown/podman.1.md:133-152`).

## 6. Remote clients use server config

Default flag settings come from `containers.conf`; **most settings for remote connections use the
server's `containers.conf`**, except where a man page documents otherwise (source:
`pages/markdown/podman.1.md:14-16`). The exceptions are connection-related defaults read from the
**local** client config: `--connection`, `--identity` and `--url` resolution explicitly state
"Remote connections use local containers.conf for default" (source:
`pages/markdown/podman.1.md:33-36,51-59,147-152`).

| Aspect | Config source | Source |
|---|---|---|
| Engine/container/network runtime behavior | server | `pages/markdown/podman.1.md:14-16` |
| Connection URL, identity, connection name | local client | `pages/markdown/podman.1.md:33-36,147-152` |
| `--module` | local only; unsupported on remote client | `pages/markdown/podman.1.md:65-68` |
| Global flags honored with `--remote` | only `--url`, `--identity`, `--log-level`, `--connection` | `pages/markdown/podman.1.md:201-205` |

Practical consequence: to change how a remote container runs (runtime, logging, seccomp), edit
the server config; to change *where* the client connects, edit local config or env
(source: `pages/markdown/podman.1.md:14-16,201-205`).

## 7. Verify and rebuild configuration

| Command | Purpose | Source |
|---|---|---|
| `podman info` | host, storage stats, registries, build; resolved CDI dirs/devices | `pages/markdown/podman-info.1.md:7-8` |
| `podman info --format json` | JSON form; shows `configFile`, `graphRoot`, capabilities | `pages/markdown/podman-info.1.md:10-22,160-161,255` |
| `podman info --format '{{.Store...}}'` | Go-template branch: `.Host`, `.Plugins`, `.Registries`, `.Store`, `.Version` | `pages/markdown/podman-info.1.md:10-22,312-345` |
| `podman info -f json \| jq '...'` | query registries/config fields | `pages/markdown/podman-info.1.md:329-340` |
| `podman system migrate` | after changing `/etc/subuid`/`/etc/subgid`; stops containers and pause process | `samples/rootless_tutorial.md:59` |
| `podman system renumber` | after changing `num_locks`/`lock_type` in config | `samples/containers.conf:656-662,683-688` |

`podman info --format=json` is the acceptance check for a config rollout: it reports the
effective `configFile` path, storage driver and graph root, capability set and registries. Go
template fields are capitalized (`.Host`) while JSON keys are lowercase — do not mix them
(source: `pages/markdown/podman-info.1.md:345`). `podman system renumber` must follow any
`num_locks` change, or Podman fails to start with a lock-count conflict
(source: `pages/markdown/podman-system-renumber.1.md:6-10`).

## Pitfalls

- `podman run --module=…` fails: `--module` is a root-level flag and must precede the subcommand
  (source: `pages/markdown/podman.1.md:65-68`).
- Setting `--root` or `--storage-driver` silently discards `STORAGE_OPTS` and the config's
  driver options; re-add them via `--storage-opt` (source: `pages/markdown/podman.1.md:98-104`).
- Editing server-side config does not change a remote client's connection target; connection
  defaults are read locally (source: `pages/markdown/podman.1.md:14-16,147-152`).
- Changing `num_locks` without `podman system renumber` breaks Podman startup
  (source: `pages/markdown/podman-system-renumber.1.md:9`).
- Rootless config paths shift with `XDG_CONFIG_HOME`/`XDG_DATA_HOME`; hard-coded
  `$HOME/.config` paths break when those are set (source: `pages/markdown/podman.1.md:188-195`).

## Sources

- `pages/markdown/podman.1.md:6-8`, `:14-16`, `:33-36`, `:51-59`, `:65-92`, `:98-104`, `:123-125`, `:133-152`, `:164-200`, `:201-205`, `:354-373`
- `pages/markdown/podman-info.1.md:7-22`, `:103-105`, `:160-161`, `:255`, `:312-345`
- `pages/markdown/podman-run.1.md:1472-1477`
- `pages/markdown/podman-create.1.md:93-95`
- `pages/markdown/podman-login.1.md:11-17`
- `pages/markdown/podman-image-sign.1.md:8-9`, `:34-35`
- `pages/markdown/podman-system-renumber.1.md:6-10`
- `samples/containers.conf:656-662`, `:683-688`, `:693-695`, `:713-715`
- `samples/rootless_tutorial.md:59`
- `samples/registries.conf:9-34`, `samples/policy.json:1-6`, `samples/MANIFEST.md`
- https://docs.podman.io/en/latest/markdown/podman.1.html
