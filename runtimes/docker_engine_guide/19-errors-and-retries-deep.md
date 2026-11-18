# 19 - errors-and-retries-deep

Scope: documented failure surfaces and recovery controls for Engine, Compose and Sandboxes. No failure was injected; advice is marked `derived`.

## Error taxonomy

| Layer | Failure | Evidence |
|---|---|---|
| Daemon / transport | Cannot connect; wrong `DOCKER_HOST`; daemon down | `pages/engine/daemon/troubleshoot.md:15-26`, `pages/engine/daemon/troubleshoot.md:41-64` |
| Daemon config | `daemon.json` and startup flags both set `hosts` | `pages/engine/daemon/troubleshoot.md:66-80` |
| CLI / API | Exit `125` is a daemon-side error | `pages/engine/containers/run.md:276-286` |
| Invocation | Exit `126` cannot invoke; `127` not found | `pages/engine/containers/run.md:288-309` |
| Application | Other codes come from the container command | `pages/engine/containers/run.md:311-320` |
| Kernel | OOM killer can stop container or daemon | `pages/engine/daemon/troubleshoot.md:129-136` |
| Sandbox | eCryptfs pull I/O error; expired login; unresponsive sandbox | `pages/ai/sandboxes/troubleshooting.md:54-60`, `pages/ai/sandboxes/troubleshooting.md:236-241`, `pages/ai/sandboxes/troubleshooting.md:62-86` |
| Build policy | `ERROR: source ... not allowed by policy` | `pages/build/policies/debugging.md:46-51` |

## Exit-code map

| Code | Meaning |
|---|---|
| `125` | Docker daemon-side error, for example an undefined flag (`pages/engine/containers/run.md:276-286`) |
| `126` | Container command cannot be invoked (`pages/engine/containers/run.md:288-298`) |
| `127` | Command not found (`pages/engine/containers/run.md:300-309`) |
| Other | Passed through from the command (`pages/engine/containers/run.md:311-320`) |

Events show `exitCode=143` after `signal=15` and `exitCode=137` after `signal=9` (`pages/reference/cli/docker/system/events.md:231-237`, `pages/reference/cli/docker/system/events.md:311-313`). Derived: 128 plus signal; examples, not a general mapping.

## Restart policies and backoff

| Policy | Semantics |
|---|---|
| `no` | Never restart automatically (default) |
| `on-failure[:max-retries]` | Restart on non-zero exit only, with optional cap; no restart on daemon restart |
| `always` | Restart after any stop; manual stop retried only on daemon/container restart |
| `unless-stopped` | Like `always`, but manual stop persists across daemon restart |

Source: `pages/engine/containers/start-containers-automatically.md:20-25`, `pages/reference/cli/docker/container/run.md:1166-1171`.

Backoff doubles from 100 ms to a 1-minute cap; a 10-second successful run resets it to 100 ms (`pages/reference/cli/docker/container/run.md:1184-1191`). Only `on-failure` supports a retry cap (`pages/reference/cli/docker/container/run.md:1193-1208`). A policy activates only after 10 seconds uptime and a manual stop suspends it (`pages/engine/containers/start-containers-automatically.md:52-59`).

`docker update --restart` applies immediately; `--rm` and a restart policy conflict (`pages/reference/cli/docker/container/update.md:73-87`). Do not mix Engine policies with host process managers (`pages/engine/containers/start-containers-automatically.md:139-142`); policies appear as `Up`/`Restarting` in `docker ps` (`pages/reference/cli/docker/container/run.md:1180-1182`).

## Healthcheck failure path

Flags: `--health-cmd`, `--health-interval`, `--health-retries`, `--health-timeout`, `--health-start-period`, `--health-start-interval`, `--no-healthcheck` (`pages/engine/containers/run.md:1068-1081`). Failure increments `FailingStreak` with `Start`/`End`/`ExitCode`/`Output` and yields `"Status": "unhealthy"` (`pages/engine/containers/run.md:1094-1120`); the event is `health_status` (`pages/reference/cli/docker/system/events.md:44`).

Compose conditions: `service_started`, `service_healthy`, `service_completed_successfully`, `required: false` for a warning instead of failure (`pages/reference/compose-file/services.md:462-470`). Dependents wait for `service_healthy` (`pages/reference/compose-file/services.md:477-503`). `restart: true` means only an explicit Compose restart, not a runtime restart after death (`pages/reference/compose-file/services.md:458-460`).

## Pull, build and registry failures

Three layers download concurrently by default; `--max-concurrent-downloads` addresses low-bandwidth timeouts, proxies affect pulls/pushes (`pages/reference/cli/docker/image/pull.md:27-39`). Auth may be required; prefer a credential store over plain `config.json` (`pages/reference/cli/docker/login.md:20-34`). Sandbox eCryptfs state causes pull I/O errors and expired logins report `You are not authenticated to Docker` (`pages/ai/sandboxes/troubleshooting.md:54-60`, `pages/ai/sandboxes/troubleshooting.md:236-241`). Denied build sources need `--progress=plain` or `--policy log-level=debug` (`pages/build/policies/debugging.md:28-64`).

## Idempotent retry patterns (derived)

- derived: pin by digest, not tag, so a repeated pull targets one immutable image (`pages/reference/cli/docker/image/pull.md:110-122`).
- derived: repeated pulls reuse cached layers in the content-addressable store (`pages/reference/cli/docker/image/pull.md:72-78`, `pages/reference/cli/docker/image/pull.md:100-104`).
- derived: `on-failure:N` and doubling backoff bound restart attempts (`pages/reference/cli/docker/container/run.md:1184-1208`).
- derived: gate dependents on `service_healthy` rather than immediate restart after `service_started` (`pages/reference/compose-file/services.md:462-503`).
- derived: a manual stop suspends restarts, creating an intervention window (`pages/engine/containers/start-containers-automatically.md:57-59`).
- `unverified`: no transaction or idempotency key for multi-step deploys is documented; deduplicate in the application.

## Partial delivery and loss windows

| Loss window | Source |
|---|---|
| Cache writes not retried; ring buffer can lose lines | `pages/engine/logging/dual-logging.md:150-159` |
| Non-blocking delivery drops messages on a full buffer | `pages/engine/logging/configure.md:144-147` |
| Full Fluentd memory buffer makes the record call fail | `pages/engine/logging/drivers/fluentd.md:131-135` |
| Only the last 256 events are returned | `pages/reference/cli/docker/system/events.md:23-24` |

Derived: logs and events are diagnostic hints, not delivery guarantees; use an application-side write-ahead record or durable queue for at-least-once semantics.

## Recovery runbook

1. Check `docker info`, `DOCKER_HOST` and remote reachability (`pages/engine/daemon/troubleshoot.md:28-64`).
2. Reconcile `daemon.json` with startup flags when startup fails (`pages/engine/daemon/troubleshoot.md:66-80`).
3. Classify by exit code before changing configuration (`pages/engine/containers/run.md:270-320`).
4. For OOM symptoms, review host memory and limits (`pages/engine/daemon/troubleshoot.md:129-136`).
5. Update the restart policy and confirm the container is not `--rm` (`pages/reference/cli/docker/container/update.md:73-87`).
6. Switch Compose dependencies to `service_healthy` conditions (`pages/reference/compose-file/services.md:462-503`).
7. For pull/build/auth errors, check concurrency, credentials, policy output (`pages/reference/cli/docker/image/pull.md:34-39`, `pages/reference/cli/docker/login.md:20-34`, `pages/build/policies/debugging.md:46-64`).
8. For Sandboxes, run `sbx diagnose`, then `sbx daemon restart`; reset only for corrupted state (`pages/ai/sandboxes/troubleshooting.md:10-25`, `pages/ai/sandboxes/troubleshooting.md:75-86`).

## Sources

- https://docs.docker.com/engine/containers/run.md
- https://docs.docker.com/reference/cli/docker/container/run.md
- https://docs.docker.com/reference/cli/docker/container/update.md
- https://docs.docker.com/engine/containers/start-containers-automatically.md
- https://docs.docker.com/engine/daemon/troubleshoot.md
- https://docs.docker.com/reference/cli/docker/system/events.md
- https://docs.docker.com/reference/compose-file/services.md
- https://docs.docker.com/reference/cli/docker/image/pull.md
- https://docs.docker.com/reference/cli/docker/login.md
- https://docs.docker.com/ai/sandboxes/troubleshooting.md
