# 10 — Reproducible builds

`podman build` (alias `podman buildx build` for scripting compatibility) uses Buildah code and creates Buildah containers in **container storage** for `RUN`; a crashed build can leave these as external containers visible via `podman ps --all --external` (`pages/markdown/podman-build.1.md:33-41`). Image storage is shared with Podman, so build artifacts are immediately pullable/runnable, but the build containers are not normal Podman containers and need `--build` pruning (`pages/markdown/podman-system-prune.1.md:9-15`).

## 1. Determinism levers at a glance

| Lever | Default | Effect / recommendation |
|---|---|---|
| `--timestamp=seconds` | current time | Fixes image `created` timestamp and layer file timestamps; the single most important reproducibility flag (`pages/markdown/podman-build.1.md:909-916`) |
| `--source-date-epoch=seconds` | `SOURCE_DATE_EPOCH` env or now | Fixes config/manifest `created`, exposes a `SOURCE_DATE_EPOCH` build arg, stamps `--output` files; conflicts with `--timestamp` (`pages/markdown/podman-build.1.md:814-832`) |
| `--pull=policy` | `missing` | Four values `always`/`missing`/`never`/`newer`; unrecognized values fail the build (`pages/markdown/podman-build.1.md:671-677`) |
| `--layers` | `true` | Enables intermediate image caching; required for `--cache-from`/`--cache-to`/`--no-cache-filter` (`pages/markdown/podman-build.1.md:511-516`, `:130-141`) |
| `--no-cache` / `--no-cache-filter=stage` | off | Full vs per-stage invalidation; `--no-cache-filter` only works with `--layers` (`pages/markdown/podman-build.1.md:599-607`) |
| `--format=oci\|docker` | `oci` | Manifest/config format; `BUILDAH_FORMAT` env overrides (`pages/markdown/podman-build.1.md:406-412`) |
| `--platform=os/arch[/variant]` | host | Overrides `--arch`/`--os`/`--variant`; multiple values imply `--manifest` (`pages/markdown/podman-build.1.md:651-666`) |
| `--isolation=oci\|rootless\|chroot` | `oci` (rootless users: `rootless`) | Runtime isolation for `RUN`; `BUILDAH_ISOLATION` overrides (`pages/markdown/podman-build.1.md:480-489`) |

`pages/markdown/podman-build.1.md:909-916`
```text
--timestamp=seconds
Set the create timestamp to seconds since epoch to allow for deterministic builds (defaults to current time). By default, the created timestamp is changed and written into the image manifest with every commit, causing the image’s sha256 hash to be different even if the sources are exactly the same otherwise.
When --timestamp is set, the created timestamp is always set to the time specified and therefore not changed, allowing the image’s sha256 hash to remain the same. All files committed to the layers of the image is created with the timestamp.
If the only instruction in a Containerfile is FROM, this flag has no effect.
--tls-verify
Require HTTPS and verify certificates when contacting registries (default: true).
If explicitly set to true, TLS verification is used.
If set to false, TLS verification is not used.
```

## 2. Minimal reproducible Containerfile pattern

The pattern combines a digest-pinned base, a pinned builder stage, no network at test time, non-root runtime user, and explicit metadata. Secret material enters only through `RUN --mount=type=secret` and never lands in a layer (derived from the documented secret-mount syntax; see the build-arg and secret flags below):
```dockerfile
# Reproducible multi-stage Containerfile: digest-pinned bases, no secrets in layers
FROM registry.example.com/base/go@sha256:$BASE_DIGEST AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /out/api ./cmd/api

FROM registry.example.com/base/distroless@sha256:$RUNTIME_DIGEST
COPY --from=build --chown=65532:65532 /out/api /usr/local/bin/api
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]
```

Rules that make the pattern deterministic: pin both `FROM` references by digest (tags are mutable); copy dependency manifests before sources so the download layer is stable; keep `RUN` commands side-effect-free apart from their layer; set `--timestamp` or `--source-date-epoch` on every build; avoid `apt-get update` without a pinned snapshot; and never `COPY` credentials — pass them through `--secret`.

## 3. File selection, target and inputs

| Flag | Default | Effect |
|---|---|---|
| `--file, -f=Containerfile` | `Containerfile` / `Dockerfile` in context | Local file or http(s) URL; `-f -` reads stdin; with multiple files, `FROM` is accepted only from the last (`pages/markdown/podman-build.1.md:391-399`) |
| `--target=stageName` | last stage | Builds an intermediate stage by name and skips later ones (`pages/markdown/podman-build.1.md:907-908`) |
| `--build-arg=KEY=VALUE` | image `ARG` defaults | Interpolated like env vars but **not** stored in the image environment (`pages/markdown/podman-build.1.md:90-92`) |
| `--build-arg-file=path` | none | `KEY=VALUE` lines, `#` comments ignored; files are read before `--build-arg`, and the last occurrence of a key wins (`pages/markdown/podman-build.1.md:93-105`) |
| `--secret=id=id[,src=…][,env=…][,type=file\|env]` | none | Mounted at `/run/secrets/<id>`; changing secret contents does **not** invalidate cached layers (`pages/markdown/podman-build.1.md:778-790`) |
| `.containerignore` | none | Unix glob exclusions from the context; `**` spans directories (`pages/markdown/podman-build.1.md:1181-1195`) |
| `--build-context=name=value` | default context | Adds named local/HTTP/image contexts referenced by `COPY --from=name` and `RUN --mount=from=name` (`pages/markdown/podman-build.1.md:106-120`) |

Keep build arguments non-secret: they are visible in build metadata and history. Commit the arg file and the digest pins in version control, and supply only environment-specific values on the command line.

## 4. Layers, squash and cache strategy

`--layers` defaults to **true** in v6 (`pages/markdown/podman-build.1.md:511-516`).

| Flag | Effect | When to use |
|---|---|---|
| `--layers` (default) | cache intermediate images | normal CI with a warm local/remote cache |
| `--squash` | collapse only **new** layers into one; base layers untouched | reduce layer count without rewriting the base |
| `--squash-all` | collapse all layers including the base | single-layer artifacts; loses base-layer sharing (`pages/markdown/podman-build.1.md:881-884`) |
| `--no-cache` | rebuild every stage | release builds where cache poisoning is unacceptable |
| `--no-cache-filter=stage` | invalidate named/numbered stages only | rebuild the dependency stage after a lockfile change (`pages/markdown/podman-build.1.md:601-607`) |
| `--cache-from=image` | pull valid cache images from a repo | requires `--layers` (`pages/markdown/podman-build.1.md:123-131`) |
| `--cache-to=image` | push cache images to a repo | requires `--layers`; pair with `--cache-from` (`pages/markdown/podman-build.1.md:133-141`) |
| `--cache-ttl=D` | ignore cache images older than `D` | `--cache-ttl=0` is equivalent to `--no-cache` (`pages/markdown/podman-build.1.md:142-147`) |
| `--force-rm` | remove intermediate containers even on failure | default `true`; keeps runners clean (`pages/markdown/podman-build.1.md:404-405`) |

Remote caches are reproducibility aids, not trust roots: a poisoned cache image can inject content into a release. Use `--no-cache` for signed releases or verify cache provenance.

## 5. Platform, manifest and format

`--platform=os/arch[/variant][,…]` sets the built image platform and base-image selection, overrides `--arch`/`--os`/`--variant`, and — when multiple platforms are given — switches from `--tag` to `--manifest` (`pages/markdown/podman-build.1.md:651-666`). `--manifest=NAME` adds the image to a manifest list, creating it if needed (`pages/markdown/podman-build.1.md:525-527`). Cross-platform `RUN` needs emulation such as `qemu-user-static` (`pages/markdown/podman-build.1.md:668-670`). Documented multi-arch sequence (verbatim):

`pages/markdown/podman-build.1.md:1126-1130`
```text
Building a multi-architecture image using the --manifest option (requires emulation software)
Build image using the specified architectures and link to a single manifest on successful completion:
$ podman build --arch arm --manifest myimage /tmp/mysrc
$ podman build --arch amd64 --manifest myimage /tmp/mysrc
$ podman build --arch s390x --manifest myimage /tmp/mysrc
```

`--format=oci` (default) vs `docker` (schema 2) changes the manifest/config bytes and therefore the final digest; pin the format in CI (`pages/markdown/podman-build.1.md:406-412`). Push format is selected separately with `podman push --format=oci|v2s2|v2s1` (`pages/markdown/podman-push.1.md:65-66`).

## 6. SBOM generation and scanners

`--sbom=preset` scans both the working container rootfs (`{ROOTFS}`) and the build contexts (`{CONTEXT}`), then merges results with the preset's strategy; it must be paired with at least one output flag (`pages/markdown/podman-build.1.md:705-712`).

| Preset | Scanner image | Output format / merge |
|---|---|---|
| `syft`, `syft-cyclonedx` | `ghcr.io/anchore/syft` | CycloneDX JSON, merge by component name+version (`pages/markdown/podman-build.1.md:713-717`) |
| `syft-spdx` | `ghcr.io/anchore/syft` | SPDX JSON, merge by package name+versioninfo (`pages/markdown/podman-build.1.md:718-722`) |
| `trivy`, `trivy-cyclonedx` | `ghcr.io/aquasecurity/trivy` | CycloneDX JSON (`pages/markdown/podman-build.1.md:723-727`) |
| `trivy-spdx` | `ghcr.io/aquasecurity/trivy` | SPDX JSON (`pages/markdown/podman-build.1.md:728-731`) |

| Output flag | Destination |
|---|---|
| `--sbom-output=file` | local filesystem file (`pages/markdown/podman-build.1.md:758-759`) |
| `--sbom-purl-output=file` | local file containing package URLs (`pages/markdown/podman-build.1.md:761-763`) |
| `--sbom-image-output=path` | path **inside** the output image (`pages/markdown/podman-build.1.md:732-733`) |
| `--sbom-image-purl-output=path` | PURL list inside the output image (`pages/markdown/podman-build.1.md:735-738`) |
| `--sbom-scanner-image`, `--sbom-scanner-command`, `--sbom-merge-strategy` | custom scanner/merge; substitutions `{ROOTFS}`, `{CONTEXT}`, `{OUTPUT}` (`pages/markdown/podman-build.1.md:766-778`) |

Scanner images are ordinary registry dependencies: pin them by digest and mirror them into the build network for reproducible SBOMs. SBOMs are evidence, not enforcement — gate on the policy layer (`policy.json`) separately.

## 7. Registry auth, TLS and CI invocation

`--authfile`, `--cert-dir`, `--creds`, `--tls-verify` and `--retry` apply to base-image pulls just as they do to `podman pull` (`pages/markdown/podman-build.1.md:86-89`, `:162-165`, `:279-282`, `:913-918`, `:679-684`). Defaults mirror the run command: auth at `${XDG_RUNTIME_DIR}/containers/auth.json` (Linux) or `$HOME/.config/containers/auth.json` (macOS/Windows), fallback `$HOME/.docker/config.json`, `REGISTRY_AUTH_FILE` override; `--tls-verify` defaults to `true` while `registries.conf` insecure entries apply when unset.

Reproducible release build command (derived from the flags above):
```bash
export SOURCE_DATE_EPOCH="$(git log -1 --pretty=%ct)"
podman build \
  --file=Containerfile --target=runtime --format=oci \
  --pull=never --tls-verify=true \
  --build-arg-file=build.args --secret=id=npm_token,src=.npm_token \
  --layers --no-cache-filter=deps \
  --platform=linux/amd64 \
  --timestamp="$SOURCE_DATE_EPOCH" \
  --sbom=syft-spdx --sbom-output=sbom.spdx.json \
  --sbom-image-output=/usr/share/sbom/spdx.json \
  --tag=registry.example.com/team/api:"$GIT_SHA" .
podman push --format=oci --digestfile=digest.txt \
  registry.example.com/team/api:"$GIT_SHA"
```

Use `--source-date-epoch` instead of `--timestamp` when `--output` files must also carry the fixed date; never pass both, as they conflict (`pages/markdown/podman-build.1.md:830-831`). A `FROM`-only Containerfile makes `--timestamp` inert (`pages/markdown/podman-build.1.md:912`).

## Pitfalls

- `--timestamp` and `--source-date-epoch` conflict; omitting both leaves the current time in the manifest and changes the digest on every build.
- `--cache-from`/`--cache-to`/`--no-cache-filter` are ignored without `--layers`; `--no-cache` makes `--no-cache-filter` redundant.
- `--squash-all` destroys base-layer sharing; `--squash` leaves base layers untouched.
- Changing secret file contents does not invalidate a cached layer that used the secret.
- `--platform` overrides `--arch`/`--os`/`--variant`; multiple platforms silently switch output to `--manifest`.
- `--disable-content-trust` is a NOOP; supply real trust via `policy.json`, not the build flag.

## Sources

- https://docs.podman.io/en/latest/markdown/podman-build.1.html — `pages/markdown/podman-build.1.md:33-41`, `:86-165`, `:279-282`, `:391-412`, `:480-516`, `:525-527`, `:599-607`, `:651-684`, `:700-790`, `:814-832`, `:881-918`, `:1126-1130`
- https://docs.podman.io/en/latest/markdown/podman-push.1.html — `pages/markdown/podman-push.1.md:65-66`
- https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html — `pages/markdown/podman-system-prune.1.md:9-15`
- samples: `samples/podman-build.1.md.in` (byte-exact build-flag source, provenance in `samples/MANIFEST.md`)
