# 24 — Determinism playbook

This chapter converts the dossier's flags into an ordered production procedure. Every rule
carries a source token; the checklists are `derived` from those cited rules. Scope:
Podman v6.2.0 (commit `055de046`), maintenance line v5.8.10. No container was executed to
validate the examples.

## 1. Order of operations

Build and sign the image before it reaches a host; lock the engine before the first
container starts; isolate state; bound observability; declare the workload; then verify and
keep a rollback path. Two precedence rules govern everything below: global flags must
precede the subcommand, and CLI > environment > config file
(`pages/markdown/podman.1.md:15-20`), with remote clients normally using the **server's**
config (`pages/markdown/podman.1.md:14-20`).

Source: `pages/markdown/podman.1.md:14-20`
```text
Default settings for flags are defined in containers.conf. Most settings for
Remote connections use the server’s containers.conf, except when documented in
man pages.
To manage containers, pods, volumes, networks, and images declaratively via systemd,
use quadlet files. See podman-quadlet(1) and podman-systemd.unit(5).
podman [GLOBAL OPTIONS]
GLOBAL OPTIONS
```

The checklist below is `derived` from the cited rules; each item maps to a later section:

- [ ] Pin by digest; ban `latest`/untagged references (`pages/markdown/podman-pull.1.md:9`)
- [ ] `--pull=never` in prod; `always` only in a verified refresh job (`pages/markdown/podman-run.1.md:985-990`)
- [ ] `policy.json` default `reject` + scoped `signedBy`/`sigstoreSigned`; attach SBOM (`pages/markdown/podman-image-trust.1.md:40-46`, `pages/markdown/podman-build.1.md:705-720`)
- [ ] Version `containers.conf`, `storage.conf`, `registries.conf`, `policy.json` (`samples/rootless_tutorial.md:112-118`)
- [ ] Pre-create fixed network, named volume, secrets; pair `keep-id` with explicit `--user` (`pages/markdown/podman-run.1.md:1515-1516`)
- [ ] Bound logs (`max-size`/`max-file`) and use one health/restart authority (`pages/markdown/podman-run.1.md:595-610`, `:435-439`)
- [ ] Set `--cpus`/`--memory`/`--pids-limit`; pick one restart authority (`pages/markdown/podman-run.1.md:230-236`, `:1039-1051`)
- [ ] Pin the compose provider or use Quadlet/kube YAML (`pages/markdown/podman-compose.1.md:6-9`)
- [ ] Gate on `inspect --format` + `healthcheck run`; retain prior digest/volume for rollback (`pages/markdown/podman-inspect.1.md:123-124`, `pages/markdown/podman-healthcheck-run.1.md:8-10`)


## 2. Pin and validate the base image

| Rule | Action | Why / source |
|---|---|---|
| Digest pin | Reference `registry/ns/app@sha256:<digest>`; pull the same digest in CI and prod | Tag-less references default to `latest` (`pages/markdown/podman-pull.1.md:9`); digest pulls are supported (`pages/markdown/podman-pull.1.md:9`) |
| No `latest` | Forbid untagged and `:latest` references in policy/lint | `podman pull` defaults to `latest` when no tag is given (`pages/markdown/podman-pull.1.md:9`); `podman tag` also defaults to `latest` (`pages/markdown/podman-tag.1.md:9`) |
| Pull policy by context | `--pull=never` in prod; `--pull=always` only in a controlled refresh job | Four policies with `missing` default (`pages/markdown/podman-run.1.md:985-990`) |

Source: `pages/markdown/podman-run.1.md:985-990`
```text
--pull=policy
Pull image policy. The default is missing.
always: Always pull the image and throw an error if the pull fails.
missing: Pull the image only when the image is not in the local containers storage. Throw an error if no image is found and the pull fails.
never: Never pull the image but use the one from the local containers storage. Throw an error if no image is found.
newer: Pull if the image on the registry is newer than the one in the local containers storage. An image is considered to be newer when the digests are different. Comparing the time stamps is prone to errors. Pull errors are suppressed if a local image was found.
```

Trust is enforced at pull time from `policy.json`, scopes evaluated most-specific-first;
the `default` scope applies when no scope matches (`pages/markdown/podman-image-trust.1.md:10-20`).
Set the fallback type to `reject`, then allowlist only the namespaces you need
(`pages/markdown/podman-image-trust.1.md:40-46`); the shipped sample still uses
`insecureAcceptAnything` as its default and must be tightened (`samples/policy.json:1-6`).
Choose `signedBy` (simple signing) or `sigstoreSigned`; both require `--pubkeysfile`
(`pages/markdown/podman-image-trust.1.md:33-34`). Verification gates belong in CI before
promotion, not only at runtime, because policy is evaluated when the image is pulled.

For builds, fix time and cache explicitly: `--timestamp` keeps the manifest hash stable
(`pages/markdown/podman-build.1.md:909-912`) and `--no-cache` disables cached stages
(`pages/markdown/podman-build.1.md:599`). Emit an SBOM with `--sbom=<preset>` plus one of
the `--sbom-*-output` flags; `syft`/`syft-cyclonedx` and `trivy` presets are built in
(`pages/markdown/podman-build.1.md:705-720`).

## 3. Lock engine configuration

Pin config in source control so two hosts with the same image produce the same runtime.
Root config lives in `/usr/share/containers` with overrides in `/etc/containers`; rootless
config lives in `${XDG_CONFIG_HOME}/containers` (`samples/rootless_tutorial.md:112-118`).

Source: `samples/rootless_tutorial.md:112-118`
```text
The Podman configuration files for root reside in `/usr/share/containers` with overrides in `/etc/containers`.  In the rootless environment they reside in `${XDG_CONFIG_HOME}/containers` and are owned by each individual user.

Note: in environments without `XDG` environment variables, Podman internally sets the following defaults:

- `$XDG_CONFIG_HOME` = `$HOME/.config`
- `$XDG_DATA_HOME` = `$HOME/.local/share`
- `$XDG_RUNTIME_DIR` =
```

| File | Lock these keys | Source |
|---|---|---|
| `containers.conf` | `runtime`, `events_logger`, `compose_providers`, `compose_warning_logs`, `network_backend` | SKILL core rules 1, 5, 9; `samples/containers.conf:355-359` |
| `storage.conf` | `driver`, `graphroot`, `runroot`, `rootless_storage_path`, `transient_store` | `samples/storage.conf:1-30` |
| `registries.conf` | `unqualified-search-registries`, `[[registry]]` mirrors / `insecure` flags | `samples/registries.conf:9-30` |
| `policy.json` | `default` = `reject`, scoped allowlists | `pages/markdown/podman-image-trust.1.md:40-46` |

`--root` and `--storage-driver` **clear** `storage.options.<driver>` and `STORAGE_OPTS`, so
any host that sets them must also pass `--storage-opt` explicitly
(`pages/markdown/podman.1.md:78-86`, `pages/markdown/podman.1.md:99-104`). Network backend
is not a free choice in v6: the only supported value is `netavark`
(`samples/containers.conf:355-359`). After changing subuid/subgid ranges, run
`podman system migrate` to re-map existing state (`samples/rootless_tutorial.md:53-59`).

## 4. Isolate state: network, volumes, secrets, identity

Create named objects out-of-band so a container restart cannot silently recreate them with
different parameters. A fixed network uses explicit addressing
(`pages/markdown/podman-network-create.1.md:113-115`); a named volume captures driver and
options once (`pages/markdown/podman-volume-create.1.md:11-34`); secrets are managed by
`podman secret` rather than environment variables (`pages/markdown/podman-secret.1.md:5-18`).

| Concern | Deterministic choice | Source |
|---|---|---|
| Network | Pre-created bridge with fixed `--subnet`/`--gateway`; `--internal` where egress is not needed | `pages/markdown/podman-network-create.1.md:38-49` |
| Volume | Named volume with explicit `--driver`/`--opt`/`--label`; keep `copy` semantics in mind | `pages/markdown/podman-volume-create.1.md:11-34` |
| Secret | `--secret=name,target=...,mode=...`; file-based, not `-e` | `pages/markdown/podman-run.1.md:1100-1132` |
| UID mapping | `--userns=keep-id` preserves host UID inside; `nomap` excludes it | `pages/markdown/podman-run.1.md:1515-1521` |
| SELinux | `:z` for shared content, `:Z` for private; relabel cost scales with inode count | `pages/markdown/podman-run.1.md:1605-1612` |
| Root FS | `--read-only` (with `--read-only-tmpfs` default true) | `pages/markdown/podman-run.1.md:995-1001` |

`keep-id` overrides the image `USER` unless `--user` is set explicitly
(`pages/markdown/podman-run.1.md:1515-1516`), which is a common source of "works in CI,
fails on the host" drift. Drop capabilities and set `no-new-privileges` for hardening
(`pages/markdown/podman-run.1.md:131`, `pages/markdown/podman-run.1.md:1146`).

## 5. Bound observability and resources

Log drivers are `k8s-file` (`json-file` alias), `journald` (default), `none`, `passthrough`,
`passthrough-tty`; rotation uses `max-size`, `max-file`, `log-rotate`, and tags/labels are
journald-only (`pages/markdown/podman-run.1.md:586-619`). Always cap log growth: without
`max-file`, conmon keeps one backup (`pages/markdown/podman-run.1.md:602-606`).

Health checks carry state in v6. Set `--health-cmd`, a bounded interval/retry count, and a
health log destination with explicit `--health-max-log-count` / `--health-max-log-size`
(`pages/markdown/podman-run.1.md:416-434`). Critically, the `restart` failure action must
not be combined with `--restart`, and systemd-managed units should prefer `kill`/`stop`
(`pages/markdown/podman-run.1.md:435-443`).

Source: `pages/markdown/podman-run.1.md:435-443`
```text
--health-on-failure=action
Action to take once the container transitions to an unhealthy state. The default is none.
none: Take no action.
kill: Kill the container.
restart: Restart the container. Do not combine the restart action with the --restart flag. When running inside of a systemd unit, consider using the kill or stop action instead to make use of systemd’s restart policy.
stop: Stop the container.
--health-retries=retries
The number of retries allowed before a healthcheck is considered to be unhealthy. The default value is 3.
Note: This parameter can overwrite the healthcheck configuration from the image.
```

Resource limits must be stated, because defaults are unbounded: `--cpus=0.0` means no CPU
limit (`pages/markdown/podman-run.1.md:230-236`), `--memory=0` means no memory limit and
`--memory-swap` defaults to double `--memory` (`pages/markdown/podman-run.1.md:628-650`),
and `--pids-limit` defaults to 2048 where the cgroup controller exists
(`pages/markdown/podman-run.1.md:899-901`). Pick **one** restart authority: either
`--restart=unless-stopped`/`on-failure:N` (`pages/markdown/podman-run.1.md:1039-1051`) or a
systemd `Restart=` directive — never both. For systemd, use the unit's directive
(`pages/markdown/podman-run.1.md:1049-1051`).

## 6. Declare the workload

`podman compose` is a wrapper: `docker-compose` wins when both are installed, and the
provider is pinned via `compose_providers` in `[engine]` or `PODMAN_COMPOSE_PROVIDER`
(`pages/markdown/podman-compose.1.md:6-9`). Pin the provider path in `containers.conf`, not
on an engineer's shell, and disable the external-command warning in CI
(`pages/markdown/podman-compose.1.md:9`).

For long-lived state use a real declarative format: Quadlet `.container`/`.volume`/`.kube`
files installed under `~/.config/containers/systemd` (rootless) or `/etc/containers/systemd`
(root) (`samples/podman-quadlet-basic-usage.7.md:36-42`), or Kubernetes YAML applied with
`podman kube play --replace` for recreate-in-place semantics
(`pages/markdown/podman-kube-play.1.md:9`, `pages/markdown/podman-kube-play.1.md:307`).
Auto-update requires systemd units and supports `--rollback` (default true), which only
detects failure reliably when the container sends `SDNOTIFY`
(`pages/markdown/podman-auto-update.1.md:7-10`, `pages/markdown/podman-auto-update.1.md:116-122`).

## 7. Verify, observe, roll back

Verification is a gate, not an eyeball check. `podman inspect --format` exposes JSON keys
including `.State.OOMKilled` (`pages/markdown/podman-inspect.1.md:124`) and
`.EffectiveCaps` (`pages/markdown/podman-inspect.1.md:121`); health state and config are read
with `.State.Health.Status` and `.Config.Healthcheck`
(`pages/markdown/podman-healthcheck.1.md:25-26`). `podman healthcheck run` exits 0 success,
1 failure, 125 error (`pages/markdown/podman-healthcheck-run.1.md:8-10`). Events are
queryable with `--since`/`--until`/`--filter` and `--format json`
(`pages/markdown/podman-events.1.md:147-151`, `pages/markdown/podman-events.1.md:209`).

A `derived` verification sequence (substitute the real container name):
```bash
podman inspect api --format '{{.ImageDigest}} {{.State.Status}} {{.State.Health.Status}}'
podman inspect api --format '{{.State.OOMKilled}} {{.RestartCount}} {{.HostConfig.RestartPolicy.Name}}'
podman healthcheck run api; echo "healthcheck exit=$?"
podman ps -a --format '{{.ID}} {{.Image}} {{.Status}} {{.Names}}'
podman system df --format '{{.Type}} {{.Size}} {{.Reclaimable}}'
```

Rollback plan, in order: (1) keep the previous digest and the previous named volume
snapshot; (2) on failed health, stop via the health action or systemd, not both
(`pages/markdown/podman-run.1.md:435-439`); (3) redeploy the prior digest with
`--pull=never`; (4) restore the volume with `podman volume import` if data was mutated;
(5) confirm with the same `inspect --format` assertions used at deploy; (6) record the event
window with `podman events --since`. If a Quadlet/kube workload is used, roll back by
re-installing the prior YAML and re-running `kube play --replace` or reloading systemd.
`podman system check` audits storage consistency after an incident
(`pages/markdown/podman-system-check.1.md:3-14`).

## Pitfalls

- `--pull=never` with a tag-only reference fails on a host that never pulled the digest; pin and pre-load the image.
- Combining `--health-on-failure=restart` with `--restart` is explicitly unsupported; use one authority.
- `--root`/`--storage-driver` silently drop configured storage options — re-pass `--storage-opt`.
- `keep-id` overrides image `USER`; set `--user` when a service user is required.
- `:Z` on a large tree relabels every inode and delays start; prefer a named volume or `:z` when sharing.
- `podman compose` provider is chosen by installation order unless pinned; CI and prod can diverge.
- Default log and health settings are unbounded (log files grow; health logs keep 5 entries/500 chars).
- `latest` is a moving tag; it defeats digest pinning and `--pull=never` reproducibility.

## Sources

- `pages/markdown/podman.1.md:14-20`, `:15-20`, `:71-72`, `:78-86`, `:99-104`, `:124`, `:134-160` — https://docs.podman.io/en/latest/markdown/podman.1.html
- `pages/markdown/podman-run.1.md:131`, `:230-236`, `:416-443`, `:586-619`, `:628-650`, `:899-901`, `:995-1001`, `:1039-1051`, `:1100-1147`, `:1515-1521`, `:1605-1612`, `:985-990` — https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `pages/markdown/podman-pull.1.md:9`, `:191-195`; `pages/markdown/podman-tag.1.md:9` — https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- `pages/markdown/podman-image-trust.1.md:10-46`; `samples/policy.json:1-6`
- `pages/markdown/podman-build.1.md:599`, `:705-720`, `:909-912`; `samples/rootless_tutorial.md:53-59`, `:112-118`
- `samples/containers.conf:355-359`; `samples/storage.conf:1-30`; `samples/registries.conf:9-30`
- `pages/markdown/podman-network-create.1.md:38-49`, `:113-115`; `pages/markdown/podman-volume-create.1.md:11-34`; `pages/markdown/podman-secret.1.md:5-18`
- `pages/markdown/podman-compose.1.md:6-9`; `pages/markdown/podman-kube-play.1.md:9`, `:307`; `pages/markdown/podman-auto-update.1.md:7-10`, `:116-122`; `samples/podman-quadlet-basic-usage.7.md:36-42`
- `pages/markdown/podman-inspect.1.md:121-133`; `pages/markdown/podman-healthcheck.1.md:25-28`; `pages/markdown/podman-healthcheck-run.1.md:8-10`; `pages/markdown/podman-events.1.md:147-151`, `:209`; `pages/markdown/podman-system-df.1.md:55-67`; `pages/markdown/podman-system-check.1.md:3-14`
