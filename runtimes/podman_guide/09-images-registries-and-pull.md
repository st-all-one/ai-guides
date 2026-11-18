# 09 — Images, registries and pull

Image handling in v6.2.0 is split between local OCI storage, registry transports, and a policy-driven trust layer. Every pull/push is a copy operation against local image storage — `podman pull` prints the full image ID, defaults to the `latest` tag, accepts `name@digest`, and reads archives/local storage via `transport:path` (`pages/markdown/podman-pull.1.md:9-10`).

## 1. Command surface

| Need | Command | Source |
|---|---|---|
| Discover | `podman search [--limit N] TERM` | `pages/markdown/podman-search.1.md:7-12` |
| Acquire | `podman pull [--platform|--arch|--os|--variant] REF` | `pages/markdown/podman-pull.1.md:35-89` |
| Publish | `podman push [--format|--platform|--sign-by…] IMAGE [DEST]` | `pages/markdown/podman-push.1.md:7-10`, `:65-94` |
| Authenticate | `podman login [--authfile|--password-stdin] [REGISTRY]`; `podman logout --all` | `pages/markdown/podman-login.1.md:7-12`, `pages/markdown/podman-logout.1.md:5-10` |
| Host-to-host | `podman image scp NAME[:TAG] [HOST::]` | `pages/markdown/podman-image-scp.1.md:6-10` |
| List/inspect | `podman images`; `podman image inspect --format…`; `podman history` | `pages/markdown/podman-images.1.md:5-7`, `pages/markdown/podman-image-inspect.1.md:5-9`, `pages/markdown/podman-history.1.md:5-8` |
| Delete | `podman rmi IMAGE…`; `podman image prune [-a]` | `pages/markdown/podman-rmi.1.md:5-9`, `pages/markdown/podman-image-prune.1.md:5-10` |
| Archive | `podman save [--format FORMAT]` / `podman load [--input FILE]` | `pages/markdown/podman-save.1.md:5-9`, `pages/markdown/podman-load.1.md:5-12` |
| Rootfs snapshot | `podman export CTR` → `podman import [-c CHANGE] TAR [REF]` | `pages/markdown/podman-export.1.md:5-7`, `pages/markdown/podman-import.1.md:5-9` |
| Derive from container | `podman commit [--change|--pause] CTR [IMAGE]` | `pages/markdown/podman-commit.1.md:5-11` |
| Host-to-host | `podman image scp NAME[:TAG] [HOST::]` | `pages/markdown/podman-image-scp.1.md:5-13` |

`load` restores an archive as the **same image** (layers, history and tags); `import` builds a **new** image from a rootfs tarball with no image history — they are not interchangeable (`pages/markdown/podman-load.1.md:9-12`). `rmi` deletes local copies only; remote deletion needs `skopeo delete` and many registries disallow it (`pages/markdown/podman-rmi.1.md:8-9`).

## 2. Registry resolution, mirrors and failover

Unqualified (short) names consult `unqualified-search-registries` in `registries.conf`; short names are ambiguous and subject to namespace squatting, so fully qualified references are strongly recommended (`pages/markdown/podman-pull.1.md:92-104`). Alias files in `/etc/containers/registries.conf.d/` expand distribution defaults; rootful short-name choices cache to `/var/cache/containers/short-name-aliases.conf`, rootless to `$HOME/.cache/containers/short-name-aliases.conf` (`pages/markdown/podman-pull.1.md:96-104`). With `--all-tags`, short names resolve as `docker.io/library/…` without walking the search list (`pages/markdown/podman-pull.1.md:28-33`).

`registries.conf` supports prefix rewrite/mirrors, blocking and TLS overrides. Test-fixture example (verbatim):

`samples/registries.conf:11-24`
```ini
[[registry]]
# In Nov. 2020, Docker rate-limits image pulling.  To avoid hitting these
# limits while testing, always use the google mirror for qualified and
# unqualified `docker.io` images.
# Ref: https://cloud.google.com/container-registry/docs/pulling-cached-images
prefix="docker.io"
location="mirror.gcr.io"

# 2020-10-27 a number of images are not present in gcr.io, and podman
# barfs spectacularly when trying to fetch them. We've hand-copied
# those to quay, using skopeo copy --all ...
[[registry]]
prefix="docker.io/library"
location="quay.io/libpod"
```

| Mechanism | Configuration | Effect |
|---|---|---|
| Mirror | `[[registry]] prefix=… location=…` | Pulls from `location`, transparently rewritten (`samples/registries.conf:11-24`) |
| More specific mirror | second `[[registry]]` with longer `prefix` | Longest matching prefix wins; `docker.io/library` overrides `docker.io` (`samples/registries.conf:22-24`) |
| Block | `[[registry]] location=… blocked=true` | Denies the namespace entirely (syntax: `samples/registries.conf`, `https://docs.podman.io/en/latest/markdown/containers-registries.conf.5.html`) |
| Insecure | `[[registry]] location="localhost:5000" insecure=true` | Permits plain HTTP/weak TLS for that registry (`samples/registries.conf:28-30`) |
| Alias | `[aliases] "name"="registry/ns/name"` | Expands a short name to a fully qualified reference (`samples/registries.conf:33-34`) |
| Retry | `--retry=N`, `--retry-delay=D` | `3` attempts, exponential from 2 s by default; applies to pull **and** push (`pages/markdown/podman-pull.1.md:77-82`) |

Failover is driven by ordered `unqualified-search-registries` and mirrors, not by client-side round-robin; for deterministic multi-registry setups, pin a fully qualified name and define mirrors administratively. `--creds` authenticates only the target registry, never a mirror or rewritten registry (`pages/markdown/podman-pull.1.md:46-52`).

## 3. Authentication and TLS

| Flag | Default | Notes |
|---|---|---|
| `--authfile=path` (pull/push/login/search/build) | `${XDG_RUNTIME_DIR}/containers/auth.json` Linux, `$HOME/.config/containers/auth.json` macOS/Windows | Falls back to `$HOME/.docker/config.json`; `REGISTRY_AUTH_FILE` overrides (`pages/markdown/podman-pull.1.md:38-44`) |
| `--creds=user[:pass]` | prompt | Insecure on shared shells; prefer `--password-stdin` for `login` (`pages/markdown/podman-login.1.md:33-41`) |
| `--tls-verify[=bool]` | `true` | `false` disables verification; when unset, `registries.conf` insecure entries apply (`pages/markdown/podman-pull.1.md:83-88`) |
| `--cert-dir=path` | `/etc/containers/certs.d` | Custom `*.crt`/`*.cert`/`*.key`; unavailable on remote clients (`pages/markdown/podman-pull.1.md:42-45`) |
| `--decryption-key=key[:pass]` | none | Tries all keys for encrypted images (`pages/markdown/podman-pull.1.md:54-55`) |
| `--identity` (global, remote) | SSH user | SSH identity path for remote connections (`pages/markdown/podman.1.md:51-58`) |

Never commit an auth file into an image or repo; mount it read-only at runtime and rotate it out of band. `--disable-content-trust` is a NOOP accepted only for Docker scripting compatibility (`pages/markdown/podman-pull.1.md:56-58`).

## 4. Pull policy, platform and digest pinning

- `podman image scp` saves an archive, transfers it, then loads it at the destination; **compressed-blob digests are not preserved**, so digest references may not resolve after a scp — prefer push/pull via a registry for production (`pages/markdown/podman-image-scp.1.md:6-10`).

| Context | Flag | Default | Recommendation |
|---|---|---|---|
| `podman pull` | `--policy=always\|missing\|never\|newer` | `always` | Explicit `missing` for cached CI pulls (`pages/markdown/podman-pull.1.md:68-74`) |
| `podman run`/`create` | `--pull=always\|missing\|never\|newer` | `missing` | `never` + digest for immutable deploys (`pages/markdown/podman-run.1.md:985-990`) |
| `podman build` | `--pull=always\|missing\|never\|newer` | `missing` | `never` with a pinned base digest (`pages/markdown/podman-build.1.md:671-677`) |

`--platform=OS/ARCH`, `--arch`, `--os` and `--variant` select a manifest entry and make subsequent local lookups match that platform regardless of host (`pages/markdown/podman-pull.1.md:62-66`, `:89-90`). Digest pinning uses `repo@sha256:<digest>`; `podman inspect` exposes both `Digest` (image config) and `RepoDigests` (registry manifest digests), which are the values to pin (`pages/markdown/podman-inspect.1.md:36-44`). A tag is mutable; a digest is content-addressed and is the only reliable reproducibility key.

Reproducible acquire-and-verify flow (derived from the documented flags):
```bash
podman pull --policy=always --tls-verify=true --authfile=/run/secrets/auth.json \
  registry.example.com/team/api@sha256:$DIGEST
podman image inspect --format '{{index .RepoDigests 0}}' registry.example.com/team/api@sha256:$DIGEST
podman run --pull=never --rm registry.example.com/team/api@sha256:$DIGEST /bin/true
```

## 5. Trust boundaries and signature policy

Trust is enforced at **pull** time from `policy.json`; scopes are evaluated most-specific-first (image → repository → registry → transport → `default`) and the trust types are `accept` (allowlist), `reject` (denylist), `signedBy` (simple signing) and `sigstoreSigned` (`pages/markdown/podman-image-trust.1.md:10-25`). Harden the default scope to `reject` and allowlist only your own namespaces.

`--signature-policy=path` exists on `podman image trust set|show` — it selects the `policy.json` to update or display (`pages/markdown/podman-image-trust.1.md:35-36`, `:54-55`). In v6.2 the captured `podman pull` surface has no such flag: pull resolves the policy path from system configuration, as `image trust show` does when the option is omitted (`pages/markdown/podman-image-trust.1.md:54-55`). The shipped test fixture shows the syntax but uses `insecureAcceptAnything` as default — it is **not** a production policy (`samples/policy.json:2-8`).

Push-side signing is explicit: `--sign-by=FINGERPRINT`, `--sign-by-sigstore=PARAM_FILE`, `--sign-by-sigstore-private-key=PATH`, `--sign-by-sq-fingerprint=FPR` and `--sign-passphrase-file=PATH`; unsigned pushes must opt out with `--remove-signatures` when replacing signed content (`pages/markdown/podman-push.1.md:82-94`, `:74-75`). Signing options are unavailable on remote clients.

## 6. Transfer, derivation and garbage collection

- `podman save --format=docker-archive|oci-archive|oci-dir|docker-dir`: default `docker-archive`; `oci-dir`/`docker-dir` cannot be loaded by remote clients; `-m` allows multi-image docker-archive only (`pages/markdown/podman-save.1.md:29-45`).
- `podman push --compression-format=gzip|zstd|zstd:chunked --force-compression --format=oci|v2s2|v2s1 --platform=OS[/ARCH[/VARIANT]] --digestfile=PATH`: `--platform` pushes only the matching entry from a manifest list; `--digestfile` records the pushed digest for downstream pinning (`pages/markdown/podman-push.1.md:39-65`).
- `podman image scp` saves an archive, transfers it, then loads it at the destination; **compressed-blob digests are not preserved**, so digest references may not resolve after a scp — prefer push/pull via a registry for production (`pages/markdown/podman-image-scp.1.md:6-10`).
- `podman commit` pauses the container during the commit unless `--pause=false`, and prepends `localhost` to unqualified names (`pages/markdown/podman-commit.1.md:5-10`): it captures mutable runtime state and should not be part of a reproducible build pipeline.
- `podman image prune` removes dangling images; `-a` also removes images unused by any container but preserves layers still needed by other images (`pages/markdown/podman-image-prune.1.md:5-10`). `podman system prune --all` recurses up to 50 iterations and `--external` reclaims unreferenced layers after unclean shutdown (`pages/markdown/podman-system-prune.1.md:7-16`, `:18-32`).

Trust boundary summary: registry content crosses into local storage at pull, where `policy.json` gates it; local storage is shared between Podman and Buildah, so an untrusted local image is already inside the boundary; `image scp` and archive `load`/`import` bypass registry policy semantics and must be treated as explicit imports.

## 7. Image-family command surface

`podman image` is the parent command for image management (`pages/markdown/podman-image.1.md:2-6`);
two diagnostic subcommands are easy to miss: `podman image diff` compares an image filesystem to
its parent layer or a second image (`pages/markdown/podman-image-diff.1.md:2-6`), and
`podman image tree` prints the layer hierarchy, defaulting to `latest` when no tag is given
(`pages/markdown/podman-image-tree.1.md:2-7`). For cross-architecture builds, `podman farm`
delegates work to machines of different architectures (`pages/markdown/podman-farm.1.md:2-7`);
pin farm membership as carefully as a registry mirror because it changes which builder produces
the image.

## Pitfalls

- `podman pull --policy` defaults to `always`, but `podman run --pull` defaults to `missing` — do not assume one inherits the other.
- Short names prompt on a TTY, cache a choice, and are vulnerable to cross-registry namespace squatting; pin fully qualified references.
- Mirrors and rewrites bypass `--creds`; put mirror credentials in an auth file.
- `image scp` does not preserve compressed-blob digests; re-pin by digest after transfer.
- `rmi` is local-only and `insecure=true`/`--tls-verify=false` disable transport security.
- The shipped `samples/policy.json` defaults to `insecureAcceptAnything`; never deploy it as-is.

## Sources

- https://docs.podman.io/en/latest/markdown/podman-pull.1.html — `pages/markdown/podman-pull.1.md:9-10`, `:28-90`, `:92-104`
- https://docs.podman.io/en/latest/markdown/podman-push.1.html — `pages/markdown/podman-push.1.md:7-10`, `:39-94`
- https://docs.podman.io/en/latest/markdown/podman-login.1.html — `pages/markdown/podman-login.1.md:7-41`
- https://docs.podman.io/en/latest/markdown/podman-logout.1.html — `pages/markdown/podman-logout.1.md:5-10`
- https://docs.podman.io/en/latest/markdown/podman-search.1.html — `pages/markdown/podman-search.1.md:7-12`, `:81-88`
- https://docs.podman.io/en/latest/markdown/podman-tag.1.html — `pages/markdown/podman-tag.1.md:5-8`
- https://docs.podman.io/en/latest/markdown/podman-untag.1.html — `pages/markdown/podman-untag.1.md:5-7`
- https://docs.podman.io/en/latest/markdown/podman-images.1.html — `pages/markdown/podman-images.1.md:5-7`
- https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html — `pages/markdown/podman-image-inspect.1.md:5-9`
- https://docs.podman.io/en/latest/markdown/podman-inspect.1.html — `pages/markdown/podman-inspect.1.md:36-44`
- https://docs.podman.io/en/latest/markdown/podman-history.1.html — `pages/markdown/podman-history.1.md:5-8`
- https://docs.podman.io/en/latest/markdown/podman-rmi.1.html — `pages/markdown/podman-rmi.1.md:5-9`
- https://docs.podman.io/en/latest/markdown/podman-save.1.html — `pages/markdown/podman-save.1.md:5-45`
- https://docs.podman.io/en/latest/markdown/podman-load.1.html — `pages/markdown/podman-load.1.md:5-12`
- https://docs.podman.io/en/latest/markdown/podman-import.1.html — `pages/markdown/podman-import.1.md:5-9`
- https://docs.podman.io/en/latest/markdown/podman-export.1.html — `pages/markdown/podman-export.1.md:5-7`
- https://docs.podman.io/en/latest/markdown/podman-commit.1.html — `pages/markdown/podman-commit.1.md:5-10`
- https://docs.podman.io/en/latest/markdown/podman-image-scp.1.html — `pages/markdown/podman-image-scp.1.md:6-10`
- https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html — `pages/markdown/podman-image-prune.1.md:5-10`
- https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html — `pages/markdown/podman-system-prune.1.md:7-32`
- https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html — `pages/markdown/podman-image-trust.1.md:10-25`, `:35-36`, `:54-55`
- https://docs.podman.io/en/latest/markdown/podman.1.html — `pages/markdown/podman.1.md:51-58`
- https://docs.podman.io/en/latest/markdown/podman-run.1.html — `pages/markdown/podman-run.1.md:985-990`
- https://docs.podman.io/en/latest/markdown/podman-build.1.html — `pages/markdown/podman-build.1.md:671-677`
- samples: `samples/registries.conf:11-34`, `samples/policy.json:2-8`
- https://docs.podman.io/en/latest/markdown/containers-registries.conf.5.html
