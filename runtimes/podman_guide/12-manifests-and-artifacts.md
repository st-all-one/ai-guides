# 12 — Manifests and artifacts

## 1. Manifest lists and image indexes

`podman manifest` creates and manipulates a Docker manifest list or OCI image index; the local object is a working list until it is pushed (`pages/markdown/podman-manifest.1.md:5-7`).

| Subcommand | Role |
|---|---|
| `create` | Create a manifest list or image index (`pages/markdown/podman-manifest.1.md:18-20`) |
| `add` | Add an image **or artifact** to a list/index (`pages/markdown/podman-manifest.1.md:12-14`) |
| `annotate` | Add/update information about an entry (`pages/markdown/podman-manifest.1.md:15-17`) |
| `remove` | Remove one item from a list/index (`pages/markdown/podman-manifest.1.md:30-32`) |
| `rm` | Remove the whole list/index from local storage (`pages/markdown/podman-manifest.1.md:33-35`) |
| `exists` | Check local storage only — not the registry (`pages/markdown/podman-manifest.1.md:21-23`) |
| `inspect` | Display the list/index (`pages/markdown/podman-manifest.1.md:24-26`) |
| `push` | Push the list/index to a registry (`pages/markdown/podman-manifest.1.md:27-29`) |

The captured multi-arch examples show both build-driven and assemble-driven workflows. Verbatim from `pages/markdown/podman-manifest.1.md:42-57`:
```text
    $ platarch=linux/amd64,linux/ppc64le,linux/arm64,linux/s390x
    $ podman build --jobs=4 --platform=$platarch --manifest shazam .
Note: The --jobs argument is optional. Do not use the podman build command’s --tag (or -t) option when building a multi-arch manifest list.
Assembling a multi-arch manifest from separately built images
Assuming example.com/example/shazam:$arch images are built separately
on other hosts and pushed to the example.com registry. They may
be combined into a manifest list, and pushed using a simple loop:
    $ REPO=example.com/example/shazam
    $ podman manifest create $REPO:latest
    $ for IMGTAG in amd64 s390x ppc64le arm64; do \
              podman manifest add $REPO:latest docker://$REPO:IMGTAG; \
          done
    $ podman manifest push --all $REPO:latest
Note: The add instruction argument order is <manifest> then <image>.
Also, the --all push option is required to ensure all contents are
pushed, not just the native platform/arch.
```

Do not pass the build's `--tag` when building into a manifest; use `--manifest` (`pages/markdown/podman-manifest.1.md:43-44`). For separately built per-arch images, `add` order is `<manifest> <image>` (`pages/markdown/podman-manifest.1.md:55`). Renaming uses `tag` + `manifest rm` + `manifest push --all`, not an in-place edit (`pages/markdown/podman-manifest.1.md:58-65`).

## 2. Multi-arch workflow and deterministic push

A safe release sequence (derived; the individual commands are documented above):
```bash
podman manifest create registry.example.com/team/api:1.4.0
for arch in amd64 arm64 s390x ppc64le; do
  podman manifest add registry.example.com/team/api:1.4.0 \
    docker://registry.example.com/team/api:1.4.0-$arch
done
podman manifest inspect registry.example.com/team/api:1.4.0
podman manifest push --all registry.example.com/team/api:1.4.0 \
  docker://registry.example.com/team/api:1.4.0
podman push --digestfile=/tmp/api.digest <local-image-id> \
  docker://registry.example.com/team/api:1.4.0-amd64
```

`--all` is mandatory: without it only the native platform is pushed (`pages/markdown/podman-manifest.1.md:55-57`). `--jobs=N` parallelizes a build that produces several platforms and requires the host to execute non-native binaries (e.g. via emulation) when `RUN` is used (`pages/markdown/podman-manifest.1.md:37-43`).

For deterministic consumption, record the digest rather than the tag: `podman image inspect` exposes `.Digest` and `.RepoDigests` (`pages/markdown/podman-image-inspect.1.md:26-27`, `:46-47`), and `podman push --digestfile` writes the resulting digest to a file.
Verbatim from `pages/markdown/podman-push.1.md:108`:
```bash
# podman push --digestfile=/tmp/mydigest imageID docker://registry.example.com/repository:tag
```

Pin deployments as `registry/name@sha256:<digest>` and keep the tag as a human-facing alias only. A manifest index digest is not interchangeable with a per-architecture image digest: `--all` publishes multiple child manifests behind one index (`pages/markdown/podman-manifest.1.md:54-57`).

## 3. OCI artifacts in v6

`podman artifact` manages OCI artifacts — files associated with images/containers — in a local artifact store; Podman can pull, inspect and push them (`pages/markdown/podman-artifact.1.md:5-9`).

| Subcommand | Role |
|---|---|
| `add` | Add one or more local files to the local store (`pages/markdown/podman-artifact-add.1.md:4-8`) |
| `exists` | Check local storage (`pages/markdown/podman-artifact.1.md:17-19`) |
| `extract` | Copy blobs to a local file or existing directory (`pages/markdown/podman-artifact-extract.1.md:4-15`) |
| `inspect` | JSON inspection of manifest, name, digest, size (`pages/markdown/podman-artifact-inspect.1.md:4-12`) |
| `ls` / `list` | List local artifacts (`pages/markdown/podman-artifact.1.md:26-28`) |
| `pull` | Copy an artifact from a registry into local storage (`pages/markdown/podman-artifact-pull.1.md:4-6`) |
| `push` | Push a local artifact to an image registry (`pages/markdown/podman-artifact.1.md:32-34`) |
| `rm` | Remove one or more local artifacts (`pages/markdown/podman-artifact.1.md:35-37`) |

An artifact is not a runnable image: the inspected manifest has an empty config object and file layers carrying `org.opencontainers.image.title`, while the digest identifies the manifest. Verbatim excerpt from `pages/markdown/podman-artifact-inspect.1.md:34-53`:
```json
     "Manifest": {
          "schemaVersion": 2,
          "mediaType": "application/vnd.oci.image.manifest.v1+json",
          "config": {
               "mediaType": "application/vnd.oci.empty.v1+json",
               "digest": "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
               "size": 2,
               "data": "e30="
          },
          "layers": [
               {
                    "mediaType": "text/plain; charset=utf-8",
                    "digest": "sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2",
                    "size": 5,
                    "annotations": {
                         "org.opencontainers.image.title": "foobar.txt"
                    }
               }
          ]
     },
```

`inspect --format` accepts `.Digest`, `.Name`, `.TotalSizeBytes` and nested manifest fields (`pages/markdown/podman-artifact-inspect.1.md:14-29`). `extract` selects one blob with `--title` or `--digest`; targeting a directory exports all blobs, named by title annotation or by digest with `:` replaced by `-` (`pages/markdown/podman-artifact-extract.1.md:11-26`).

Artifact `add` flags that matter for reproducibility:

| Flag | Effect |
|---|---|
| `--annotation=k=v` | Layer annotation; `org.opencontainers.image.title` names the layer when mounted and must be unique per layer (`pages/markdown/podman-artifact-add.1.md:13-16`) |
| `--append`, `-a` | Add files to an existing artifact; preserves the original creation timestamp (`pages/markdown/podman-artifact-add.1.md:9-11`, `:17-18`) |
| `--replace` | Replace an existing same-named artifact; conflicts with `--append` (`pages/markdown/podman-artifact-add.1.md:21-23`) |
| `--type` / `--file-type` | Set artifact type / layer media type instead of detection (`pages/markdown/podman-artifact-add.1.md:19-25`) |

`pull` defaults to `--tls-verify=true` (unless the registry is configured insecure) and retries 3 times with exponential backoff (`pages/markdown/podman-artifact-pull.1.md:32-43`). Credentials given with `--creds` apply only to the target registry, not mirrors or rewritten registries (`pages/markdown/podman-artifact-pull.1.md:20-27`).

## 4. Attaching SBOM/config blobs: use and caveats

A practical pattern is to publish a CycloneDX/SPDX SBOM produced at build time as an artifact next to the image, then verify it at admission time (derived from the build SBOM and artifact workflows documented above):
```bash
podman build --sbom=trivy-spdx --sbom-output=sbom.spdx.json -t registry.example.com/team/api:1.4.0 .
podman artifact add --annotation org.opencontainers.image.title=sbom.spdx.json \
  registry.example.com/team/api-sbom:1.4.0 sbom.spdx.json
podman artifact push registry.example.com/team/api-sbom:1.4.0
podman artifact pull registry.example.com/team/api-sbom:1.4.0
podman artifact extract --title sbom.spdx.json registry.example.com/team/api-sbom:1.4.0 /tmp/attest
podman run --rm --mount type=artifact,src=registry.example.com/team/api-sbom:1.4.0,dst=/attest \
  registry.example.com/team/api:1.4.0 ls -l /attest
```

`--mount type=artifact` mounts artifact blobs into a container; the destination may be a directory (each blob becomes a file named by title or digest) or a file when a single blob is selected by `title`/`digest` (`pages/markdown/podman-run.1.md:672-694`). This is a read-oriented distribution path for config blobs, models and attestations; it does not turn the artifact into an image layer.

Caveats: `artifact add` stamps `org.opencontainers.image.created` with an RFC3339Nano timestamp, so two otherwise identical adds are not byte-identical; pin the resulting digest after creation, and use `--append` to preserve an existing timestamp (`pages/markdown/podman-artifact-add.1.md:9-11`). Artifact support is registry-dependent: the captured docs only promise registry pull/push through the same transports and auth files as images (`pages/markdown/podman-artifact-pull.1.md:12-19`, `pages/markdown/podman-artifact.1.md:32-34`); verify that your registry accepts OCI artifacts before relying on it in CI. `manifest add` accepts artifacts as entries (`pages/markdown/podman-manifest.1.md:12-14`), so an artifact can be indexed alongside images, but consumers must understand the media type.

## Pitfalls

- `podman manifest push` without `--all` publishes only the native platform (`pages/markdown/podman-manifest.1.md:55-57`).
- `manifest add` argument order is manifest first, image second (`pages/markdown/podman-manifest.1.md:55`).
- `manifest exists` and `artifact exists` check local storage, not the registry (`pages/markdown/podman-manifest.1.md:21-23`, `pages/markdown/podman-artifact.1.md:17-19`).
- An artifact's empty config and titled layers are not an image root filesystem (`pages/markdown/podman-artifact-inspect.1.md:34-53`).
- `--append` and `--replace` conflict on `artifact add` (`pages/markdown/podman-artifact-add.1.md:21-23`).
- Automatic `org.opencontainers.image.created` timestamps defeat byte-identical artifact rebuilds (`pages/markdown/podman-artifact-add.1.md:9-11`).
- `--creds` on `artifact pull` does not authenticate mirrors or rewritten registries (`pages/markdown/podman-artifact-pull.1.md:24-27`).

## Sources

- Captured pages: `pages/markdown/podman-manifest.1.md`, `pages/markdown/podman-artifact.1.md`, `pages/markdown/podman-artifact-add.1.md`, `pages/markdown/podman-artifact-extract.1.md`, `pages/markdown/podman-artifact-inspect.1.md`, `pages/markdown/podman-artifact-pull.1.md`, `pages/markdown/podman-push.1.md`, `pages/markdown/podman-image-inspect.1.md`, `pages/markdown/podman-run.1.md`, `pages/markdown/podman-build.1.md`.
- https://docs.podman.io/en/latest/markdown/podman-manifest.1.html
- https://docs.podman.io/en/latest/markdown/podman-manifest-annotate.1.html
- https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- https://docs.podman.io/en/latest/markdown/podman-artifact-extract.1.html
- https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- https://docs.podman.io/en/latest/markdown/podman-artifact-pull.1.html
- https://github.com/containers/podman/tree/055de046937d29450f310fce0fe3071485d8bed9
