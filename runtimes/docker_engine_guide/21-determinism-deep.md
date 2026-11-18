# 21 - determinism-deep

Determinism: same declared inputs, same image bytes and runtime behavior. Each control below is documented; operational compositions are marked `derived`.

## Pinned inputs

| Control | Documented behavior | Source |
|---|---|---|
| Pull by digest | A digest specifies exactly which version to pull; it pins the image | `pages/reference/cli/docker/image/pull.md:110-122` |
| Digest form | `docker pull ubuntu@sha256:<digest>` replaces the tag | `pages/reference/cli/docker/image/pull.md:147-151` |
| Stable digest | Digest is predictable while the generating input is unchanged | `pages/reference/cli/docker/image/ls.md:128-133` |
| Digest in run/create | Images can be referenced by digest in `create` and `run` | `pages/reference/cli/docker/image/ls.md:140-142` |
| Compose pin | `docker compose config --resolve-image-digests` pins tags to digests | `pages/reference/cli/docker/compose/config.md:42` |
| Compose lock | `--lock-image-digests` emits an override file with digests | `pages/reference/cli/docker/compose/config.md:31` |

A tag is mutable: re-pulling a tag can yield a newer image (`pages/reference/cli/docker/image/pull.md:112-116`). Avoiding mutable tags in production is `derived` from that fact.

## Platform and pull policy

| Flag | Deterministic choice | Source |
|---|---|---|
| `--platform` | Set platform on a multi-platform server | `pages/reference/cli/docker/container/run.md:102` |
| Build `--platform` | Set target platform for the build | `pages/reference/cli/docker/buildx/build.md:45` |
| `--pull=never` | Error if absent; never fetch implicitly | `pages/reference/cli/docker/container/run.md:582` |
| `--pull=always` | Pull first; prevents stale images | `pages/reference/cli/docker/container/run.md:583` |
| `--pull=missing` (default) | Cache-dependent, hence host-dependent | `pages/reference/cli/docker/container/run.md:581` |

Combining an explicit platform, a digest and `--pull=never` for air-gapped deploy is `derived` from these rows.

## Deterministic Compose rendering

`docker compose config` merges `-f` files, resolves variables and expands short syntax into canonical format (`pages/reference/cli/docker/compose/config.md:18-20`).

| Option | Determinism use | Source |
|---|---|---|
| `--format yaml|json` | Stable serialized output for diffing | `pages/reference/cli/docker/compose/config.md:28` |
| `--hash` | One service config hash per line | `pages/reference/cli/docker/compose/config.md:29` |
| `--variables` | Print variables and defaults | `pages/reference/cli/docker/compose/config.md:44` |
| `--no-interpolate` | Inspect before substitution | `pages/reference/cli/docker/compose/config.md:36` |
| `--no-env-resolution` | Keep service env files unresolved | `pages/reference/cli/docker/compose/config.md:35` |
| `--quiet` | Validate only | `pages/reference/cli/docker/compose/config.md:41` |

Committing the rendered config or its `--hash` as a versioned artifact is `derived`.

## Environment precedence

Fixed order, highest to lowest (`pages/compose/how-tos/environment-variables/envvars-precedence.md:8-14`):

| Rank | Source | Source line |
|---|---|---|
| 1 | `docker compose run -e` | `pages/compose/how-tos/environment-variables/envvars-precedence.md:9` |
| 2 | `environment`/`env_file` interpolated from shell or env file | `pages/compose/how-tos/environment-variables/envvars-precedence.md:10` |
| 3 | `environment` attribute in Compose file | `pages/compose/how-tos/environment-variables/envvars-precedence.md:11` |
| 4 | `env_file` attribute in Compose file | `pages/compose/how-tos/environment-variables/envvars-precedence.md:12` |
| 5 | Image `ENV` directive | `pages/compose/how-tos/environment-variables/envvars-precedence.md:13` |

Image `ENV`/`ARG` evaluates only when Compose declares no `environment`, `env_file` or `run --env` (`pages/compose/how-tos/environment-variables/envvars-precedence.md:14`). With two `.env` files, the project-directory file wins over the `COMPOSE_FILE`-referenced one (`pages/compose/how-tos/environment-variables/envvars-precedence.md:18-23`).

## Interpolation rules

Compose uses `${VARIABLE}` and `$VARIABLE` (`pages/reference/compose-file/interpolation.md:8-9`). `${VAR:?error}` fails when unset or empty (`pages/reference/compose-file/interpolation.md:20`); an unresolved value without default warns and yields empty string (`pages/reference/compose-file/interpolation.md:50`); `$$` is a literal dollar (`pages/reference/compose-file/interpolation.md:39-42`). Interpolation applies to values, not keys; label/environment keys need the `=` form (`pages/reference/compose-file/interpolation.md:55-57`) and is applied per file before merge (`pages/reference/compose-file/interpolation.md:52-53`). `${VAR:?error}` with a committed `.env` is a `derived` fail-fast gate.

## Reproducible builds

`SOURCE_DATE_EPOCH` makes index, config and file metadata timestamps reflect a fixed Unix time (`pages/build/ci/github-actions/reproducible-builds.md:4-7`). GitHub Builder passes it as a build arg; individual actions use step `env` (`pages/build/ci/github-actions/reproducible-builds.md:11-12`); Bake uses `*.args.SOURCE_DATE_EPOCH=0` via `set` (`pages/build/ci/github-actions/reproducible-builds.md:41-42`). A commit timestamp may come from an earlier step (`pages/build/ci/github-actions/reproducible-builds.md:98-101`). `WORKDIR` respects the arg for cache validity; changing it invalidates `WORKDIR` and later instructions (`pages/build/cache/invalidation.md:44-48`). Dynamic values break cache each commit (`pages/build/cache/invalidation.md:50-52`); a fixed timestamp is documented for reproducibility (`pages/build/cache/invalidation.md:54-55`).

## Cache control

| Flag | Effect | Source |
|---|---|---|
| `--cache-from` | Import external cache (registry/local/gha/s3/azblob) | `pages/reference/cli/docker/buildx/build.md:31` |
| `--cache-to` | Export cache to a destination | `pages/reference/cli/docker/buildx/build.md:32` |
| `--no-cache` | Do not use cache | `pages/reference/cli/docker/buildx/build.md:42` |
| `--no-cache-filter` | Do not cache named stages | `pages/reference/cli/docker/buildx/build.md:43` |
| `--iidfile` | Write image ID to a file | `pages/reference/cli/docker/buildx/build.md:37` |
| `--metadata-file` | Write build metadata to a file | `pages/reference/cli/docker/buildx/build.md:40` |

Cache lookup needs exact instruction match; changed `ADD`/`COPY` metadata invalidates it, and later instructions then regenerate (`pages/build/cache/invalidation.md:13-18`, `pages/build/cache/invalidation.md:37-38`). Treating `--iidfile`/`--metadata-file` as release records is `derived`.

## Deploy, rollback, verification

Swarm `docker service rollback` reverts a service to its previous version (`pages/reference/cli/docker/service/rollback.md:18`). Compose `deploy.rollback_config` sets `parallelism`, `delay`, `failure_action` (`continue`|`pause`, default `pause`), `max_failure_ratio` (default `0`) and `order` (`pages/reference/compose-file/deploy.md:271-280`). `deploy.update_config.failure_action` accepts `continue`, `rollback`, `pause` (default `pause`) (`pages/reference/compose-file/deploy.md:283-289`). Combining `failure_action: rollback` with a pinned digest is `derived`.

DHI and charts carry signed attestations including SBOM, provenance and vulnerability reports (`pages/dhi/how-to/verify.md:4-7`, `pages/dhi/how-to/verify.md:51-54`). Validate with `docker scout attest get ... --verify` (`pages/dhi/how-to/verify.md:167-171`) or `cosign verify` using the published key (`pages/dhi/how-to/verify.md:192-197`); a missing transparency-log entry does not invalidate a DHI signature (`pages/dhi/how-to/verify.md:221-234`). Requiring this check before deploy is `derived`.

`derived` pre-deploy gate sequence:

1. Resolve digest and platform; set `--pull=never`.
2. Render Compose config; compare `--hash` to committed artifact.
3. Build with fixed `SOURCE_DATE_EPOCH`; record `--iidfile`/`--metadata-file`.
4. Verify attestations with `--verify`; block on failure.
5. Deploy with `update_config.failure_action: rollback`.

## Sources

- https://docs.docker.com/reference/cli/docker/container/run/
- https://docs.docker.com/reference/cli/docker/image/pull/
- https://docs.docker.com/reference/cli/docker/image/ls/
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/
- https://docs.docker.com/reference/compose-file/interpolation/
- https://docs.docker.com/build/ci/github-actions/reproducible-builds/
- https://docs.docker.com/build/cache/invalidation/
- https://docs.docker.com/reference/cli/docker/buildx/build/
- https://docs.docker.com/reference/cli/docker/service/rollback/
- https://docs.docker.com/reference/compose-file/deploy/
- https://docs.docker.com/dhi/how-to/verify/
