# 08 - compose-production

Production Compose configuration is an overlay of explicit, reviewable constraints: resources, restart behavior, readiness gates, and secrets.

## Deploy keys and resource control

`deploy` is optional and describes behavior across environments. `pages/reference/compose-file/deploy.md:8` `mode`: `global` runs one task per node; `replicated` (default) runs `replicas` tasks; `replicated-job` and `global-job` run to successful exit. `pages/reference/compose-file/deploy.md:51-85` `replicas` fixes the container count for replicated services. `pages/reference/compose-file/deploy.md:116-119`

`limits` prevent allocation beyond a bound; `reservations` guarantee a minimum. `pages/reference/compose-file/deploy.md:130-136` `cpus` counts cores, `memory` is a byte string, `pids` is an integer. `pages/reference/compose-file/deploy.md:153-163` Service-level `mem_limit`/`mem_reservation` must agree with deploy limits/reservations. `pages/reference/compose-file/services.md:1295-1305`

Resource example: limits `cpus: '0.50'`, `memory: 50M`, `pids: 1`; reservations `cpus: '0.25'`, `memory: 20M`. `pages/reference/compose-file/deploy.md:138-151`


`placement.constraints` are required node properties; `preferences` currently supports only `spread` over a node label. `pages/reference/compose-file/deploy.md:89-114` `endpoint_mode` is `vip` (virtual IP front end) or `dnsrr` (DNS round-robin). `pages/reference/compose-file/deploy.md:16-23`

## Restart, update, rollback

`restart_policy` conditions are `none`, `on-failure`, and `any` (default); `delay` defaults to 0, `max_attempts` to unlimited, and `window` makes a failed attempt count only if restart does not succeed within it. `pages/reference/compose-file/deploy.md:248-260` If unset, the service `restart` field applies. `pages/reference/compose-file/deploy.md:250`

Service `restart`: `no` (default), `always`, `on-failure[:max-retries]`, `unless-stopped`. `pages/reference/compose-file/services.md:1979-1996`

| `update_config` / `rollback_config` key | Meaning |
|---|---|
| `parallelism` | Containers updated or rolled back per batch (0 = all at once for rollback) |
| `delay` | Wait between batches, default 0s |
| `failure_action` | Update: `continue`/`rollback`/`pause` (default `pause`); rollback: `continue`/`pause` |
| `monitor` | Failure-monitoring duration per task, default 0s |
| `max_failure_ratio` | Tolerated failure rate, default 0 for rollback |
| `order` | `stop-first` (default) or `start-first` (brief overlap) |

`pages/reference/compose-file/deploy.md:271-293` `scale` must agree with `deploy.replicas` when both are set. `pages/reference/compose-file/services.md:2017-2020`

## Healthcheck gates and startup order

`healthcheck` overrides the image's Dockerfile check: `test` (string or `CMD`/`CMD-SHELL`/`NONE` list), `interval`, `timeout`, `retries`, `start_period`, `start_interval`; `disable: true` disables the image check. `pages/reference/compose-file/services.md:1095-1140`

Compose orders creation and removal by `depends_on`, `links`, `volumes_from`, and `network_mode: "service:..."`, but only waits for "running" unless a condition is set. `pages/compose/how-tos/startup-order.md:4-13` Conditions: `service_started`, `service_healthy`, `service_completed_successfully`; long syntax also has `restart: true` (dependent restarts after an explicit dependency restart) and `required: false` (warn instead of fail). `pages/reference/compose-file/services.md:453-470`

Example: `web` waits for `db` with `condition: service_healthy` plus `restart: true` and for `redis` with `service_started`; `db` runs a `CMD-SHELL` `pg_isready` healthcheck with `interval: 10s`, `retries: 5`, `start_period: 30s`, `timeout: 10s`. `pages/compose/how-tos/startup-order.md:23-43`


`pre_start` lifecycle hooks model init containers: each step runs in its own ephemeral container after the service container is created but before it starts, shares networks and volume mounts, inherits the service image by default, and must exit 0. `pages/compose/how-tos/init-containers.md:6,10,20-28` Static files belong in `configs`/`secrets`, and independent background work in `jobs`. `pages/compose/how-tos/init-containers.md:12-16` A failing pre-start hook retains its container for `docker ps -a --filter label=com.docker.compose.hook=pre_start` inspection. `pages/reference/cli/docker/compose/up.md:38-49`

## GPU reservations

Device reservations require `capabilities` (generic `gpu`/`tpu`, or driver-prefixed such as `nvidia-compute`); `count` and `device_ids` are mutually exclusive, and omitting `count` reserves all matching devices. `pages/reference/compose-file/deploy.md:165-231` The service-level `gpus` key is a device request with implicit `gpu` capability and accepts `gpus: all`. `pages/reference/compose-file/services.md:1047-1068` GPUs require a suitable host and daemon setup; `capabilities` is mandatory or deployment fails. `pages/compose/how-tos/gpu-support.md:4,10-27`

## Logging, secrets, configs

`logging.driver` selects a service-level driver and `logging.options` passes key-value driver options; defaults and available drivers are platform-specific. `pages/reference/compose-file/services.md:1272-1284` Secrets are granted per service and mount read-only at `/run/secrets/<name>` by short syntax. `pages/reference/compose-file/services.md:2028-2045` Long syntax supports `source`, `target`, `uid`, `gid`, and octal `mode` (default `0444`); `uid`/`gid`/`mode` are applied only for `environment`-sourced secrets, and `file` sources bind-mount instead. `pages/reference/compose-file/services.md:2062-2077` Config long syntax has the same ownership fields with default `0444`. `pages/reference/compose-file/services.md:317-328`

## Dev/prod overlays and lifecycle gates

Production overlays remove source-code volume bindings, change host ports and environment, set a restart policy, and can add a log aggregator; `compose.production.yaml` is applied over the base file. `pages/compose/how-tos/production.md:12-28`

Deploy with `docker compose -f compose.yaml -f compose.production.yaml up -d`. `pages/compose/how-tos/production.md:33-35`


Redeploy a changed service with `docker compose build web` then `docker compose up --no-deps -d web`, which recreates only that service. `pages/compose/how-tos/production.md:39-52` `up` recreates containers when configuration or image changed unless `--no-recreate`; `--force-recreate` forces it. `pages/reference/cli/docker/compose/up.md:26-33` Useful production flags: `-d`, `--build`/`--no-build`, `--pull` (default `policy`), `--no-deps`, `--remove-orphans`, `--scale`, `-t`, `--wait`, `--wait-timeout`. `pages/reference/cli/docker/compose/up.md:54-84` `--wait` implies detached mode and waits for running/healthy; `docker compose wait` instead blocks until services stop and offers `--down-project`. `pages/reference/cli/docker/compose/up.md:81-82` `pages/reference/cli/docker/compose/wait.md:3-25`

Validation gates: run `docker compose config -q` to validate without output and review the fully resolved model before applying remote references. `pages/reference/cli/docker/compose/config.md:41` `pages/compose/trust-model.md:59-66`

## Sources

- https://docs.docker.com/reference/compose-file/deploy/
- https://docs.docker.com/reference/compose-file/services/
- https://docs.docker.com/compose/how-tos/production/
- https://docs.docker.com/compose/how-tos/startup-order/
- https://docs.docker.com/compose/how-tos/gpu-support/
- https://docs.docker.com/compose/how-tos/init-containers/
- https://docs.docker.com/reference/cli/docker/compose/up/
- https://docs.docker.com/reference/cli/docker/compose/wait/
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://docs.docker.com/compose/trust-model/
