# 11 - build-bake-and-cache

Bake turns build flags into a reviewable definition; the builder and cache backends determine
whether that definition is reproducible across machines. This is a static map of the manuals;
no build, builder, exporter, or registry was executed.

## Bake definitions: targets, groups, and properties

A target represents one build invocation and holds the information normally passed as `docker
build` flags; passing several target names builds them together, and the target named `default`
is used when none is given (`pages/build/bake/targets.md:4-26`, `pages/build/bake/targets.md:28-45`).
A `group` block bundles targets (`pages/build/bake/targets.md:66-95`). The `dockerfile` path
resolves relative to `context` when both are set (`pages/build/bake/targets.md:47-64`).

| Target attribute | Meaning | Evidence |
|---|---|---|
| `args`, `labels`, `tags`, `target`, `context`, `dockerfile` | Build arguments, metadata, names, stage, and inputs | `pages/build/bake/reference.md:216-246` |
| `cache-from`, `cache-to` | Lists of external cache sources and destinations, same keys as the CLI flags | `pages/build/bake/reference.md:335-380` |
| `output`, `platforms`, `pull` | Exporters, target platforms, forced base-image pull | `pages/build/bake/reference.md:896-949` |
| `inherits`, `matrix`, `name`, `no-cache`, `no-cache-filter` | Composition and cache control | `pages/build/bake/reference.md:231-236` |

Matrix targets fork one definition into variants: `matrix` maps names to value lists, Bake builds
every combination, and `name` gives each generated target a unique name
(`pages/build/bake/matrices.md:4-13`). Values can feed `args` and tags, and file exports need
separate output directories per variant (`pages/build/bake/matrices.md:60-94`). Inheritance via
`inherits` reuses a target while overriding selected attributes; a shared `_common` target is a
documented pattern (`pages/build/bake/inheritance.md:4-5`, `pages/build/bake/inheritance.md:21-32`,
`pages/build/bake/inheritance.md:34-78`, `pages/build/bake/inheritance.md:80-94`).

Variables have defaults and can be overridden by `--var` (last repeat wins) or environment
variables; `${NAME}` interpolation appears in `--print` output
(`pages/build/bake/variables.md:4-7`, `pages/build/bake/variables.md:29-46`,
`pages/build/bake/variables.md:48-84`). Overrides also come from file lookup order, explicit
`--file` lists, and `--set app.arg.name=value`
(`pages/build/bake/overrides.md:23-38`, `pages/build/bake/overrides.md:90-95`,
`pages/build/bake/overrides.md:152-169`). Remote definitions load from Git or HTTPS; the Git
remote becomes the context unless overridden, and `cwd://` selects local files
(`pages/build/bake/remote-definition.md:4-19`, `pages/build/bake/remote-definition.md:45-49`).
`BAKE_CMD_CONTEXT` and `BAKE_LOCAL_PLATFORM` are available remotely
(`pages/build/bake/reference.md:1392-1395`).

## Builders and drivers

Builders are created and listed with `buildx create`, `ls`, `inspect`, and `du`; `default` uses
the `docker` driver and cannot be manually recreated, while omitting `--driver` selects
`docker-container` (`pages/build/builders/manage.md:4-25`, `pages/build/builders/manage.md:27-48`).

| Driver | Documented properties | Evidence |
|---|---|---|
| `docker` | Default, built into Engine; no custom BuildKit version or parameters; images load locally | `pages/build/builders/drivers/docker.md:4-12`, `pages/build/builders/drivers/docker.md:21-26` |
| `docker-container` | Managed BuildKit container; custom BuildKit version, multi-arch via QEMU, advanced cache import/export | `pages/build/builders/drivers/docker-container.md:4-12` |
| `remote` | Connects to externally managed BuildKit, e.g. `tcp://`; TLS key, cert, cacert, servername options | `pages/build/builders/drivers/remote.md:4-27` |
| `kubernetes` | Cluster builders with natively diverse architectures, replicas, resource requests/limits, PVC cache, QEMU option | `pages/build/builders/drivers/kubernetes.md:4-19`, `pages/build/builders/drivers/kubernetes.md:24-48` |

Useful `docker-container` options include `image`, `default-load`, `network`, `restart-policy`,
`env.<key>`, and `provenance-add-gha` (`pages/build/builders/drivers/docker-container.md:30-45`).
`--platform` accepts comma-separated values and `local`, and multi-platform builds require a
driver that supports them (`pages/reference/cli/docker/buildx/build.md:832-848`).

## Cache backends and invalidation

| Backend | Key parameters and limits | Evidence |
|---|---|---|
| `registry` | Separate cache image; `ref`, `mode`, `oci-mediatypes`, `compression`, `ignore-error`; missing `cache-from` fails import but not the build | `pages/build/cache/backends/registry.md:4-19`, `pages/build/cache/backends/registry.md:26-44`, `pages/build/cache/backends/registry.md:50-58` |
| `gha` | Recommended in GitHub Actions; URL/token fall back to workflow variables; `scope` defaults to `buildkit` and multiple images overwrite each other | `pages/build/cache/backends/gha.md:6-16`, `pages/build/cache/backends/gha.md:29-40`, `pages/build/cache/backends/gha.md:56-70` |
| `inline` | Cache inside the pushed image; no extra parameters, scales poorly for multi-stage builds | `pages/build/cache/backends/inline.md:4-22` |
| `local` | OCI-layout directory; `src`, `dest`, `tag`, `digest`, `reset`; multiple tags keep versions | `pages/build/cache/backends/local.md:4-9`, `pages/build/cache/backends/local.md:18-22`, `pages/build/cache/backends/local.md:27-40`, `pages/build/cache/backends/local.md:50-70` |
| `s3` | Requires non-default driver; `region`, `bucket`, `name`, `endpoint_url`, `mode`, `touch_refresh` | `pages/build/cache/backends/s3.md:6-19`, `pages/build/cache/backends/s3.md:25-41` |

`mode=min` is the documented default for the exporting backends; `mode=max` adds intermediate
layers and is what makes multi-stage caching useful in the registry backend
(`pages/build/cache/backends/registry.md:11-14`, `pages/build/cache/backends/registry.md:38`,
`pages/build/cache/backends/gha.md:35`). Cache lookup begins with the base image, compares each
instruction, and invalidates every later step after the first mismatch; `ADD`, `COPY`, and bind
mounts use file metadata but not `mtime`
(`pages/build/cache/invalidation.md:11-42`). Builder-local cache mounts are not part of exported
cache (`pages/reference/dockerfile.md:923-930`). `--no-cache` and `--no-cache-filter` expose
explicit invalidation (`pages/reference/cli/docker/buildx/build.md:42-43`).

## Attestations, outputs, and CI

`--attest` creates `sbom` or `provenance`; `--sbom` and `--provenance` are shorthands and each
accepts `false` to disable (`pages/reference/cli/docker/buildx/build.md:137-157`,
`pages/reference/cli/docker/buildx/build.md:913-946`). Default provenance is minimal; with the
Engine image store attestations persist only for images pushed directly to a registry
(`pages/reference/cli/docker/buildx/build.md:924-928`). Bake uses an `attest` list plus the same
shorthands (`pages/build/bake/reference.md:316-333`, `pages/reference/cli/docker/buildx/bake.md:41-44`).
`--metadata-file` records the result digest (`pages/reference/cli/docker/buildx/build.md:600-607`).

Exporters are `local`, `tar`, `oci`, `docker`, `image`, and `registry`; the `docker` driver
supports only local, tarball, and image exporters (`pages/reference/cli/docker/buildx/build.md:709-748`).
`--load` and `--push` are shorthands (`pages/reference/cli/docker/buildx/build.md:39-50`). Bake
workflows in GitHub Actions build one target per call, validate first, and accept `set`, `vars`,
and cache-scope overrides (`pages/build/ci/github-actions/bake-workflow.md:4-13`,
`pages/build/ci/github-actions/bake-workflow.md:51-97`). GHA cache uses `cache: true`,
`cache-mode: max`, and a per-image `cache-scope`
(`pages/build/ci/github-actions/cache.md:4-21`). Fix timestamps through `*.args.SOURCE_DATE_EPOCH`
(`pages/build/ci/github-actions/reproducible-builds.md:41-42`).

## Deterministic pipeline (`derived`)

1. Pin builder driver and BuildKit image; keep one definition under version control
   (`pages/build/builders/manage.md:7-25`, `pages/build/builders/drivers/docker-container.md:30-33`).
2. Resolve variables and print the definition with `docker buildx bake --print`
   (`pages/reference/cli/docker/buildx/bake.md:39`, `pages/build/bake/variables.md:79-84`).
3. Validate with `--check`/`--call=check` before any export
   (`pages/reference/cli/docker/buildx/bake.md:30-31`).
4. Import from a named remote cache, export `mode=max`, and set a fixed `SOURCE_DATE_EPOCH`
   (`pages/build/cache/backends/registry.md:26-30`, `pages/build/cache/backends/gha.md:56-70`,
   `pages/build/ci/github-actions/reproducible-builds.md:41-42`).
5. Push with provenance and SBOM, capture the digest in `--metadata-file`, then verify by digest
   (`pages/build/bake/reference.md:316-333`, `pages/reference/cli/docker/buildx/build.md:600-607`,
   `pages/dhi/explore/security-concepts/digests.md:6-10`).

## Sources

- https://docs.docker.com/build/bake/targets/
- https://docs.docker.com/build/bake/reference/
- https://docs.docker.com/build/builders/manage/
- https://docs.docker.com/build/builders/drivers/docker-container/
- https://docs.docker.com/build/cache/backends/registry/
- https://docs.docker.com/build/cache/backends/gha/
- https://docs.docker.com/build/cache/invalidation/
- https://docs.docker.com/reference/cli/docker/buildx/build/
- https://docs.docker.com/reference/cli/docker/buildx/bake/
- https://docs.docker.com/build/ci/github-actions/bake-workflow/
- https://docs.docker.com/build/ci/github-actions/reproducible-builds/
