# 06 — containers.conf reference

This chapter tabulates the pinned sample defaults (`samples/containers.conf`,
`samples/storage.conf`) plus the flag interactions that override them. A commented key in the
sample is a documented default; an uncommented key is active in the sample itself. Effective
values at runtime must be confirmed with `podman info` (source:
`pages/markdown/podman-info.1.md:7-8`).

## 1. Engine runtime, conmon and cgroups

| Key (section) | Default | Effect | Src |
|---|---|---|---|
| `runtime` `[engine]` | `"crun"` | default OCI runtime | `samples/containers.conf:713-715` |
| `conmon_path` `[engine]` | 7 paths (`/usr/libexec/podman/conmon` first) | conmon binary search order | `samples/containers.conf:509-519` |
| `conmon_env_vars` `[engine]` | `PATH=/usr/local/sbin:…:/bin` | environment passed to conmon | `samples/containers.conf:503-507` |
| `cgroup_manager` `[engine]` | `"systemd"` | `systemd` or `cgroupfs`; `cgroupfs` unsupported rootless | `samples/containers.conf:498-501` |
| `cgroups` `[containers]` | `"enabled"` | `enabled` / `disabled` / `no-conmon` | `samples/containers.conf:52-59` |
| `cgroupns` `[containers]` | `"private"` | `private` or `host` cgroup namespace | `samples/containers.conf:45-50` |
| `runtime_flags.<runtime>` `[engine.runtimes_flags]` | empty per runtime | global runtime flags, no leading `--` | `samples/containers.conf:859-874` |
| `runtime_supports_json` `[engine]` | `["crun","runc","kata","runsc","youki","krun"]` | JSON error reporting capability | `samples/containers.conf:717-720` |
| `static_dir` `[engine]` | `/var/lib/containers/storage/libpod` | persistent engine database | `samples/containers.conf:740-745` |
| `tmp_dir` `[engine]` | `/run/libpod` | temp files; must be tmpfs | `samples/containers.conf:778-780` |
| `volume_path` `[engine]` | `/var/lib/containers/storage/volumes` | named-volume directory | `samples/containers.conf:782-787` |
| `infra_image` `[engine]` | `""` (built-in pause) | pod infra container image | `samples/containers.conf:643-650` |

`--runtime-flag` overrides `engine.runtime_flags.*` entirely and is repeatable; omit the
leading `--` (source: `pages/markdown/podman.1.md:89-94`). `--cgroup-manager` changes cgroup
placement and can break commands targeting containers created under the other manager
(source: `pages/markdown/podman.1.md:25-28`).

## 2. Events, logging and compose

Source: `samples/containers.conf:562-565`
```text
# Selects which logging mechanism to use for container engine events.
# Valid values are `journald`, `file` and `none`.
#
#events_logger = "journald"
```

| Key (section) | Default | Effect | Src |
|---|---|---|---|
| `events_logger` `[engine]` | `"journald"` | `journald` / `file` / `none` event backend | `samples/containers.conf:562-565` |
| `events_logfile_path` `[engine]` | `""` | file-backend log location | `samples/containers.conf:550-551` |
| `events_logfile_max_size` `[engine]` | `"1m"` | rotate/delete when exceeded; `0` disables rotation | `samples/containers.conf:553-560` |
| `events_container_create_inspect_data` `[engine]` | `false` | full inspect JSON in create event | `samples/containers.conf:567-569` |
| `healthcheck_events` `[engine]` | `true` | emit one event per healthcheck run | `samples/containers.conf:583-590` |
| `log_driver` `[containers]` | sample shows `"k8s-file"`, runtime default `journald` | container stdout/stderr driver | `samples/containers.conf:215-217` |
| `compose_providers` `[engine]` | `[]` | ordered external providers; first found wins | `samples/containers.conf:472-475` |
| `compose_warning_logs` `[engine]` | `true` | warn when an external provider executes | `samples/containers.conf:477-479` |
| `pull_policy` `[engine]` | `"missing"` | `always` / `missing` / `never` / `newer` | `samples/containers.conf:693-695` |
| `stop_timeout` `[engine]` | `10` | seconds before SIGKILL on stop | `samples/containers.conf:747-749` |
| `retry` / `retry_delay` `[engine]` | `3` / `"2s"` | pull/push retry count and backoff start | `samples/containers.conf:703-711` |

The sample's commented `log_driver = "k8s-file"` conflicts with the documented runtime default
`journald`; the CLI page states `(Default journald)` and `podman info --format '{{ .Host.LogDriver }}'`
is the authoritative check (source: `pages/markdown/podman-run.1.md:586-591`). Pin the driver
explicitly with `--log-driver` for deterministic logging.

Source: `samples/containers.conf:472-479`
```ini
# Specify one or more external providers for the compose command.  The first
# found provider is used for execution.  Can be an absolute and relative path
# or a (file) name.
#compose_providers=[]

# Emit logs on each invocation of the compose command indicating that an
# external compose provider is being executed.
#compose_warning_logs = true
```

## 3. Hooks, CDI and network

Source: `samples/containers.conf:607-612`
```ini
# Directories to scan for CDI Spec files.
#
#cdi_spec_dirs = [
#  "/etc/cdi",
#  "/var/run/cdi",
#]
```

| Key (section) | Default | Effect | Src |
|---|---|---|---|
| `hooks_dir` `[engine]` | `["/usr/share/containers/oci/hooks.d"]` | OCI hook JSON directories | `samples/containers.conf:601-605` |
| `cdi_spec_dirs` `[engine]` | `["/etc/cdi","/var/run/cdi"]` | CDI device spec scan dirs | `samples/containers.conf:607-612` |
| `network_backend` `[network]` | `""` (only `netavark` supported) | network setup driver | `samples/containers.conf:356-359` |
| `firewall_driver` `[network]` | `""` (auto) | `nftables` / `none` / `firewalld` (experimental) | `samples/containers.conf:370-375` |
| `default_network` `[network]` | `"podman"` | default bridge network (rootful) | `samples/containers.conf:378-384` |
| `default_subnet` `[network]` | `10.88.0.0/16` | default bridge subnet | `samples/containers.conf:386-390` |
| `default_subnet_pools` `[network]` | `10.89/16`, `10.90/15`, `10.92/14`, `10.96/11`, `10.128/9` (size 24) | auto-allocation pools | `samples/containers.conf:392-404` |
| `default_rootless_network_cmd` `[network]` | `"pasta"` | rootless network program | `samples/containers.conf:408-411` |
| `rootless_port_forwarder` `[network]` | `"rootlessport"` | userspace proxy vs experimental `pasta` | `samples/containers.conf:413-424` |
| `network_config_dir` `[network]` | `/etc/containers/networks` (root) | network config files; rootless `$graphroot/networks` | `samples/containers.conf:426-430` |
| `dns_bind_port` `[network]` | `53` | netavark DNS forwarding port (rootful bridge) | `samples/containers.conf:432-437` |
| `dns_servers` / `_searches` / `_options` `[containers]` | `[]` | `/etc/resolv.conf` contents; `none` disables generation | `samples/containers.conf:113-127` |
| `pasta_options` `[network]` | `[]` | default pasta CLI options | `samples/containers.conf:439-442` |

Changing `default_network`, `default_subnet` or `rootless_port_forwarder` while containers are
active is unsafe: it can leak forwarding rules or strand running netns (source:
`samples/containers.conf:382-388,419-422`).

## 4. storage.conf: driver, paths and options

Source: `samples/storage.conf:11-15`
```ini
# Default storage driver. Optional.
# driver = "overlay"

# Temporary storage location
# runroot = "/run/containers/storage"
```

| Key (section) | Default | Effect | Src |
|---|---|---|---|
| `driver` `[storage]` | `"overlay"` (commented) | storage driver | `samples/storage.conf:11-12` |
| `driver_priority` `[storage]` | `["overlay","btrfs"]` | probe order when driver unset | `samples/storage.conf:17-19` |
| `graphroot` `[storage]` | `/var/lib/containers/storage` | primary read/write image/container store | `samples/storage.conf:21-27` |
| `runroot` `[storage]` | `/run/containers/storage` | transient state directory | `samples/storage.conf:14-15` |
| `imagestore` `[storage]` | `""` | separate store for newly pulled images | `samples/storage.conf:29-31` |
| `rootless_storage_path` `[storage]` | `$HOME/.local/share/containers/storage` | rootless graphroot | `samples/storage.conf:34-36` |
| `transient_store` `[storage]` | `false` in practice (option shown `true`) | metadata only on tmpfs; no reboot persistence | `samples/storage.conf:38-42` |
| `additionalimagestores` `[storage.options]` | `[]` | read-only image stores | `samples/storage.conf:47-49` |
| `enable_partial_images` `[storage.options.pull_options]` | `"false"` | `zstd:chunked` partial pulls (string bool) | `samples/storage.conf:51-58` |
| `use_hard_links` `[storage.options.pull_options]` | `"false"` | hard-link identical files | `samples/storage.conf:60-63` |
| `convert_images` `[storage.options.pull_options]` | `"false"` | convert to `zstd:chunked` (expensive) | `samples/storage.conf:70-75` |
| `insecure_allow_unpredictable_image_contents` | `"false"` | skip partial-pull consistency (trusted builds only) | `samples/storage.conf:77-94` |
| `ignore_chown_errors` `[storage.options.overlay]` | `"false"` | single-UID rootless/HPC workaround | `samples/storage.conf:110-118` |
| `mount_program` `[storage.options.overlay]` | `/usr/bin/fuse-overlayfs` | helper for rootless overlay | `samples/storage.conf:123-125` |
| `mountopt` `[storage.options.overlay]` | `"nodev"` — **active in sample** | extra overlay mount options | `samples/storage.conf:127-128` |
| `force_mask` `[storage.options.overlay]` | `""` | `shared`=0755 / `private`=0700 / octal | `samples/storage.conf:141-172` |
| `sync` `[storage.options.overlay]` | `"none"` | `filesystem` syncfs before layer commit | `samples/storage.conf:174-176` |

On SELinux hosts, moving `graphroot` requires matching labels via `semanage fcontext -a -e` and
`restorecon -R -v` (source: `samples/storage.conf:22-27`). NFS and distributed filesystems are
unsupported for rootless storage; point `graphroot` at local storage instead (source:
`pages/markdown/podman.1.md:391-393`).

## 5. Flags that clear config and determinism levers

Source: `pages/markdown/podman.1.md:98-104`
```text
--storage-driver=value
Storage driver. The default storage driver is configured in containers-storage.conf(5). The STORAGE_DRIVER environment variable overrides the default. The --storage-driver specified driver overrides all.
This option causes the storage.options.<driver> settings in containers-storage.conf(5) and the STORAGE_OPTS environment variable to be ignored.
The user must specify additional options via the --storage-opt flag.
--storage-opt=value
Specify a storage driver option. Default storage driver options are configured in containers-storage.conf(5). The STORAGE_OPTS environment variable overrides the default. The --storage-opt specified options override all. Specify --storage-opt=”” so no storage options is used.
The --root and --storage-driver options clear the default storage options, ignoring the default storage driver options from containers-storage.conf(5) and the STORAGE_OPTS environment variable.
```

| Lever | Effect on config | Deterministic guidance | Src |
|---|---|---|---|
| `--root` | clears `storage.options.<driver>` + `STORAGE_OPTS` | restate options with `--storage-opt` | `pages/markdown/podman.1.md:79-83` |
| `--storage-driver` | same clearing behavior | pin driver + opts together | `pages/markdown/podman.1.md:98-101` |
| `--storage-opt` | highest storage precedence | `--storage-opt=""` means no options | `pages/markdown/podman.1.md:102-104` |
| `--runtime-flag` | ignores `engine.runtime_flags.*` | pin all runtime flags on CLI or all in config | `pages/markdown/podman.1.md:89-94` |
| `--events-backend` | overrides `events_logger` per invocation | keep one backend fleet-wide | `pages/markdown/podman.1.md:37-40` |
| `--module` | layers config fragments; root-level only | load before subcommand, local only | `pages/markdown/podman.1.md:65-68` |
| `--pull=never` + digest | overrides `pull_policy` | no implicit network fetch | `samples/containers.conf:693-695` |

## 6. Reproducible CI/production template

Derived template; values are the pinned sample defaults or the hardened settings argued in chapter 04 (`derived` from `samples/containers.conf`, `samples/storage.conf`):
```ini
# /etc/containers/containers.conf — CI/production baseline
[engine]
runtime = "crun"
cgroup_manager = "systemd"
events_logger = "journald"
events_container_create_inspect_data = true
compose_providers = ["/usr/local/bin/podman-compose"]
compose_warning_logs = false
hooks_dir = ["/etc/containers/oci/hooks.d"]
cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
pull_policy = "missing"
[containers]
default_capabilities = ["CHOWN", "NET_BIND_SERVICE"]
label = true
seccomp_profile = "/usr/share/containers/seccomp.json"
log_driver = "journald"
[network]
network_backend = "netavark"
default_rootless_network_cmd = "pasta"
dns_bind_port = 53
```

Derived storage template for a dedicated, local, auditable store (`derived`):
```ini
# /etc/containers/storage.conf
[storage]
driver = "overlay"
runroot = "/run/containers/storage"
graphroot = "/var/lib/containers/storage"
imagestore = ""
rootless_storage_path = "$HOME/.local/share/containers/storage"
[storage.options]
additionalimagestores = []
[storage.options.overlay]
mountopt = "nodev"
mount_program = "/usr/bin/fuse-overlayfs"
```

Acceptance gate after rollout: `podman info --format json` must report the expected
`configFile`, `graphRoot`, `logDriver`, `cgroupManager` and capability set; `podman system
renumber` follows any `num_locks` edit (source: `pages/markdown/podman-info.1.md:103-105,255`;
`pages/markdown/podman-system-renumber.1.md:6-10`).

## Pitfalls

- The sample's commented `log_driver = "k8s-file"` is not the runtime default (`journald`);
  verify with `podman info --format '{{ .Host.LogDriver }}'` (source:
  `pages/markdown/podman-run.1.md:586-591`).
- `--root` / `--storage-driver` silently drop `STORAGE_OPTS` and config driver options
  (source: `pages/markdown/podman.1.md:98-104`).
- `mountopt = "nodev"` is uncommented in the sample and therefore active, unlike most keys
  (source: `samples/storage.conf:127-128`).
- `force_mask = "shared"` makes every image file — including `/etc/shadow` — world-readable
  (source: `samples/storage.conf:154-161`).
- `insecure_allow_unpredictable_image_contents = "true"` makes image IDs unpredictable and must
  only be used when every image comes from a trusted build system
  (source: `samples/storage.conf:83-94`).
- `--runtime-flag` and `--module` are root-level flags; place them before the subcommand
  (source: `pages/markdown/podman.1.md:65-68,89-94`).

## Sources

- `samples/containers.conf:45-59`, `:113-127`, `:215-217`, `:356-442`, `:472-479`, `:498-519`, `:550-590`, `:601-612`, `:643-650`, `:693-695`, `:703-711`, `:713-720`, `:740-787`, `:859-874`
- `samples/storage.conf:11-42`, `:47-49`, `:51-63`, `:70-176`
- `pages/markdown/podman.1.md:25-40`, `:65-104`, `:391-393`
- `pages/markdown/podman-run.1.md:586-591`
- `pages/markdown/podman-info.1.md:7-8`, `:103-105`, `:255`
- `pages/markdown/podman-system-renumber.1.md:6-10`
