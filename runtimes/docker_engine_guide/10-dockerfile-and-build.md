# 10 - dockerfile-and-build

A deterministic Dockerfile declares every input, orders instructions by change frequency, and
fails validation before the build runs. All statements below come from the captured manuals;
no build was executed.

## Instruction semantics that affect determinism

| Instruction / option | Documented semantics | Evidence |
|---|---|---|
| `FROM [--platform=<p>] <image>[:<tag>\|@<digest>] [AS <name>]` | Starts a stage; `ARG` alone may precede it; each `FROM` clears prior state | `pages/reference/dockerfile.md:594-628` |
| Omitted tag or digest | Builder assumes `latest`; missing tag is an error | `pages/reference/dockerfile.md:643-645` |
| `FROM --platform` | Selects platform of a multi-platform image; defaults to build target; `$BUILDPLATFORM` enables cross-compile stages | `pages/reference/dockerfile.md:647-653` |
| Exec vs shell form | `RUN`/`CMD`/`ENTRYPOINT` have both; exec form is a JSON array and avoids shell string munging | `pages/reference/dockerfile.md:492-506` |
| `RUN [OPTIONS]` | `--device` ≥1.27, `--mount` ≥1.2, `--network` ≥1.3, `--security` ≥1.20 | `pages/reference/dockerfile.md:719-753` |
| `ARG` vs `ENV` | `ARG` is not persisted like `ENV`; a changed value misses cache at first use, not definition | `pages/reference/dockerfile.md:2905-2912` |
| `USER` | Sets default user and group for later `RUN` and runtime `CMD`/`ENTRYPOINT`; a missing primary group means `root` group | `pages/reference/dockerfile.md:2583-2593` |
| `HEALTHCHECK` | `CMD` or `NONE`; defaults: interval 30s, timeout 30s, start-period 0s, start-interval 5s, retries 3 | `pages/reference/dockerfile.md:3057-3080` |
| `WORKDIR` and `SOURCE_DATE_EPOCH` | Epoch participates in cache validity; a dynamic value breaks cache each commit | `pages/build/cache/invalidation.md:44-52` |

Non-root operation is a build-time decision: use `USER` for unprivileged services and prefer an
explicit UID/GID (`pages/build/building/best-practices.md:748-760`). OCI metadata uses
`LABEL org.opencontainers.image.*` keys (`pages/reference/dockerfile.md:1288`). Scan-time SBOM
arguments must be explicit `ARG` declarations, not environment-derived values
(`pages/build/metadata/attestations/sbom.md:83-87`).

## Layer order and cache invalidation

The builder checks the base image first, then compares each instruction to cached layers; once
invalidated, all later instructions rebuild
(`pages/build/cache/invalidation.md:11-15`, `pages/build/cache/invalidation.md:37-38`).
`ADD`, `COPY`, and `RUN --mount=type=bind` checksum file metadata, but `mtime` alone does not
invalidate (`pages/build/cache/invalidation.md:21-29`). `RUN` strings are not re-examined against
container files (`pages/build/cache/invalidation.md:31-35`). Order expensive, stable steps early
and volatile steps late (`pages/build/cache/invalidation.md:40-42`,
`pages/build/cache/optimize.md:33-39`). `docker build --no-cache` forces all layers;
`--no-cache-filter <stage>` targets one stage
(`pages/reference/dockerfile.md:755-766`, `pages/build/cache/invalidation.md:73-85`). Secret
values are outside the cache; IDs and mount paths are inside it, so a cache-bust `ARG` is needed
when only the value changes (`pages/build/cache/invalidation.md:87-108`).

Split `COPY` into manifests first: `COPY package.json yarn.lock .`, `RUN npm install`, then
`COPY . .` and `RUN npm build` (`pages/build/cache/optimize.md:62-70`).

## Multi-stage builds and the build context

Each `FROM` starts a stage; artifacts are copied selectively so build tooling stays out of the
final image (`pages/build/building/multi-stage.md:7-12`, `pages/build/building/multi-stage.md:44-51`).
Named stages (`AS <name>`) survive reordering and feed `COPY --from`
(`pages/build/building/multi-stage.md:53-60`); `--target` builds one stage for debug or test
variants (`pages/build/building/multi-stage.md:82-99`). DHI migrations put package installation
in `dev` stages and copy artifacts into a runtime stage without a shell
(`pages/dhi/migration/checklist.md:10-17`).

Context-root `.dockerignore` removes matches before upload; a `<Dockerfile>.dockerignore` wins
(`pages/build/concepts/context.md:485-488`, `pages/build/concepts/context.md:490-511`). Patterns
are shell-like globs with `#` comments (`pages/build/concepts/context.md:513-526`). Excluding the
Dockerfile itself still sends it but blocks `ADD`/`COPY`; `!` negates a match
(`pages/build/concepts/context.md:577-590`).

A context-root `.dockerignore` may exclude `node_modules` and `bar`
(`pages/build/concepts/context.md:471-478`).

## Frontend directives and validation gates

`# syntax=<image>` loads an external Dockerfile frontend; without it BuildKit uses its bundled
version, while `docker/dockerfile:1` pulls the latest stable syntax
(`pages/reference/dockerfile.md:198-210`). Stable tags are semantic-versioned and
`1.2.1` is immutable; `labs` adds early features whose stability is not guaranteed
(`pages/build/buildkit/frontend.md:57-72`, `pages/build/buildkit/frontend.md:79-99`). The
`BUILDKIT_SYNTAX` build argument sets the frontend from the CLI
(`pages/build/buildkit/frontend.md:23-28`).

Build checks are lint-like validations introduced in Dockerfile 1.8; they run by default and
report warnings with exit code 0 (`pages/build/checks.md:6-12`, `pages/build/checks.md:42-58`,
`pages/build/checks.md:148-152`). `docker build --check` runs only the checks and exits non-zero
on violations (`pages/build/checks.md:106-114`, `pages/build/checks.md:143-144`). In the
Dockerfile, `# check=skip=<name>` disables checks, `# check=error=true` makes warnings fail, and
pinning the syntax version prevents new checks from changing a build unexpectedly
(`pages/reference/dockerfile.md:322-345`). Bake exposes the same gate through `--check` and
`--call=check` (`pages/reference/cli/docker/buildx/bake.md:30-31`).

The `# check=error=true` directive makes violations fail (`pages/reference/dockerfile.md:335-340`).

## Cache mounts, secrets, and heredocs

`RUN --mount` supports `bind`, `cache`, `tmpfs`, `secret`, and `ssh`
(`pages/reference/dockerfile.md:864-885`). Cache mounts have `id`, `target`, and `sharing` of
`shared`, `private`, or `locked` (`pages/reference/dockerfile.md:900-915`). They persist without
invalidating the step but are not exported by `--cache-to`
(`pages/reference/dockerfile.md:917-930`); apt needs `sharing=locked`
(`pages/reference/dockerfile.md:941-957`).

The Go example uses `RUN --mount=type=cache,target=/root/.cache/go-build`
(`pages/reference/dockerfile.md:932-939`).

Secret mounts expose tokens without baking them into the image: `id`, `target`, `env`,
`required`, `mode` (default `0400`), `uid`, and `gid` are documented
(`pages/reference/dockerfile.md:968-984`); on Windows an explicit `target` is required and the
file is clear text (`pages/reference/dockerfile.md:986-1001`). Supply the value with
`docker buildx build --secret id=aws,src=$HOME/.aws/credentials` (`pages/reference/dockerfile.md:1003-1014`). Heredocs
redirect following lines into `RUN` or `COPY` until the delimiter line
(`pages/reference/dockerfile.md:3256-3261`); a shebang selects the interpreter
(`pages/reference/dockerfile.md:3286-3295`).

`RUN <<EOT bash` with `set -ex`, `apt-get update`, and `apt-get install -y vim` before `EOT`
is a documented heredoc (`pages/reference/dockerfile.md:3263-3273`).

## Reproducibility controls

`SOURCE_DATE_EPOCH` is a standardized variable that fixes timestamps in the image index,
config, and file metadata; pass it as a build argument or step `env`
(`pages/build/ci/github-actions/reproducible-builds.md:4-12`). GitHub Builder takes it through
`build-args`, and the Bake workflow through `*.args.SOURCE_DATE_EPOCH`
(`pages/build/ci/github-actions/reproducible-builds.md:16-42`). For commit-derived values the
timestamp is generated in the caller step
(`pages/build/ci/github-actions/reproducible-builds.md:96-101`). A fixed epoch avoids repeated
cache invalidation (`pages/build/cache/invalidation.md:54-59`). Pinning the base by digest is
the complementary input control (`pages/build/building/best-practices.md:220-228`).

## Sources

- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/build/building/multi-stage/
- https://docs.docker.com/build/building/best-practices/
- https://docs.docker.com/build/buildkit/frontend/
- https://docs.docker.com/build/concepts/context/
- https://docs.docker.com/build/cache/invalidation/
- https://docs.docker.com/build/cache/optimize/
- https://docs.docker.com/build/checks/
- https://docs.docker.com/build/metadata/attestations/sbom/
- https://docs.docker.com/build/ci/github-actions/reproducible-builds/
