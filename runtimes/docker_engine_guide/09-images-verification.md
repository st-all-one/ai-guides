# 09 - images-verification

An image name is a pointer, not an identity: pin identity by digest, then verify the artifact.
No daemon, registry, or build was executed; each claim resolves to a captured page.

## Identity: tags, digests, and platform

| Mechanism | Documented behavior | Evidence |
|---|---|---|
| Tag | Mutable; a publisher can repoint it | `pages/build/building/best-practices.md:198-201` |
| Digest | SHA-256 content ID; immutable, same bytes pulled every time | `pages/dhi/explore/security-concepts/digests.md:6-10` |
| Guarantee | Any content change yields a new digest; tags can be reused | `pages/dhi/explore/security-concepts/digests.md:18-19`, `pages/dhi/explore/security-concepts/digests.md:25-32` |
| Pull | `NAME[:TAG\|@DIGEST]` selects the exact version | `pages/reference/cli/docker/image/pull.md:5`, `pages/dhi/explore/security-concepts/digests.md:62-72` |
| Platform | Pull: API 1.32+ on multi-platform servers; inspect: API 1.49+, `os[/arch[/variant]]` | `pages/reference/cli/docker/image/pull.md:47`, `pages/reference/cli/docker/image/inspect.md:26` |
| In Dockerfile | Pin `FROM` to a tag plus digest to remove tag drift | `pages/build/building/best-practices.md:220-228` |

`--pull` forces a newer-base check even with a cache hit
(`pages/build/building/best-practices.md:83-90`); on Buildx it pulls all referenced images
(`pages/reference/cli/docker/buildx/build.md:49`). A digest reference cannot silently move on
`--pull` (`derived` from `pages/dhi/explore/security-concepts/digests.md:25-28`).

## Multi-platform manifests

A tag may resolve to an index whose entries are per-platform digests; each variant has its own
digest (`pages/dhi/explore/security-concepts/digests.md:82-91`,
`pages/dhi/explore/security-concepts/digests.md:109-112`). `imagetools inspect` prints the index
digest, media type, and platform manifests
(`pages/reference/cli/docker/buildx/imagetools/inspect.md:20-30`); `--raw` and `--format`
expose JSON or `Name`, `Manifest`, `Image` fields
(`pages/reference/cli/docker/buildx/imagetools/inspect.md:57-62`,
`pages/reference/cli/docker/buildx/imagetools/inspect.md:72-80`). `docker manifest create`,
`inspect`, and `push` are experimental and may change or disappear
(`pages/reference/cli/docker/manifest/create.md:11-14`,
`pages/reference/cli/docker/manifest/inspect.md:11-14`); options include `--amend`,
`--verbose`, and `--purge` (`pages/reference/cli/docker/manifest/create.md:27-30`,
`pages/reference/cli/docker/manifest/push.md:27-30`).
Scout policy evaluates each variant separately (`pages/dhi/explore/security-concepts/digests.md:119-123`).

`docker buildx imagetools inspect <image-name>:<tag>` is the documented way to view a digest
(`pages/dhi/explore/security-concepts/digests.md:51-53`).

## Attestations: creation, storage, inspection

| Control | Documented effect | Evidence |
|---|---|---|
| `--provenance` | Shorthand; `min` default, `max` more detail | `pages/build/metadata/attestations/slsa-provenance.md:31-33`, `pages/build/metadata/attestations/slsa-provenance.md:40-42` |
| `mode=min` | Timestamps, frontend, materials, VCS, platform; no build-arg values or secret identities | `pages/build/metadata/attestations/slsa-provenance.md:46-58` |
| `--attest type=sbom` / `--sbom` | SPDX SBOM as in-toto predicate JSON | `pages/build/metadata/attestations/sbom.md:14-26` |
| `BUILDKIT_SBOM_SCAN_CONTEXT`, `BUILDKIT_SBOM_SCAN_STAGE` | Scan context and extra stages; requires an `ARG` declaration | `pages/build/metadata/attestations/sbom.md:54-58`, `pages/build/metadata/attestations/sbom.md:75-87` |
| `local` exporter | Writes `sbom.spdx.json` at export root for pre-push validation | `pages/build/metadata/attestations/sbom.md:31-50` |
| Storage | OCI artifacts on the image index; layers use `application/vnd.in-toto+json` | `pages/build/metadata/attestations/attestation-storage.md:9-14`, `pages/build/metadata/attestations/attestation-storage.md:37-45` |
| Runtime safety | `platform: unknown/unknown`, `vnd.docker.reference.type` annotation | `pages/build/metadata/attestations/attestation-storage.md:93-105`, `pages/build/metadata/attestations/attestation-storage.md:111-115` |
| Store caveat | Engine image store has no attestation support; push to registry or use containerd store | `pages/reference/cli/docker/buildx/build.md:924-928` |

The documented creation command passes `--attest type=sbom` together with `--push`
(`pages/build/metadata/attestations/sbom.md:18-24`).

## Docker Scout: analysis, policy, exceptions

Analysis extracts an SBOM, enriches it with advisory data, and recalculates as CVE data arrives
without re-analysis; one-off CLI analysis stores nothing
(`pages/scout/explore/analysis.md:4-16`). Attestations improve results, but the default
`docker` driver supports them only with the containerd image store
(`pages/scout/explore/analysis.md:62-73`). Prefixes select evidence: `image://`, `local://`,
`registry://`, `oci-dir://`, `archive://`, `fs://`
(`pages/scout/how-tos/artifact-types.md:30-38`).
`docker scout policy` indexes locally, enriches with CVE/VEX data, evaluates in-process, and
sends no data to Scout; sources are built-ins, `--policy-bundle`, or local `.rego` files
(`pages/scout/policy/local.md:6-25`). Platform and policy-name filters exist
(`pages/scout/policy/local.md:89-97`); CI runs `policy` or `compare` with `exit-on: policy`
(`pages/scout/policy/local.md:27-57`).

`docker scout policy myorg/app:latest --exit-code` fails the pipeline on an unmet policy
(`pages/scout/policy/local.md:70-74`).

Exceptions acknowledge accepted risk or false positives and exclude suppressed CVEs
(`pages/scout/explore/exceptions.md:4-15`); GUI exceptions are organization-scoped, VEX
exceptions are visible to any puller (`pages/scout/explore/exceptions.md:19-40`). The CLI marks
suppressed CVEs and supports `--ignore-suppressed`
(`pages/scout/explore/exceptions.md:78-105`). OpenVEX statuses are `not_affected`, `affected`,
`fixed`, `under_investigation` (`pages/scout/how-tos/create-exceptions-vex.md:35-44`).

## Hardened Images, signatures, mirrors

DHIs are Cosign-signed; Docker publishes a public key and recommends Scout, with `regctl` and
`cosign` documented alternatives (`pages/dhi/explore/security-concepts/signatures.md:26-29`,
`pages/dhi/how-to/verify.md:7-18`). `attest list` enumerates SBOM, provenance, and vulnerability
attestations; local images need a `registry://` prefix
(`pages/dhi/how-to/verify.md:37-54`). Retrieval uses `--predicate-type`, `--predicate`, and
`--verify` (`pages/dhi/how-to/verify.md:113-141`, `pages/dhi/how-to/verify.md:161-186`).
`--skip-tlog` (Scout CLI 1.18.2+) mirrors cosign `--insecure-ignore-tlog=true` because private
namespace data may be absent from Rekor (`pages/dhi/how-to/verify.md:188-215`,
`pages/dhi/how-to/verify.md:238-259`). Downstream images should also be signed
(`pages/dhi/explore/security-concepts/signatures.md:31-45`). Mirroring needs DHI Select or
Enterprise and targets Docker Hub or third-party registries
(`pages/dhi/how-to/mirror.md:6-28`); runtime images use nonroot UID 65532 and have no shell
(`pages/dhi/migration/checklist.md:10-17`). `docker trust sign` adds signatures to tags and
offers `--local` (`pages/reference/cli/docker/trust/sign.md:18-25`).

`docker scout attest list dhi.io/<image>:<tag>` enumerates SBOM, provenance, and vulnerability
attestations (`pages/dhi/how-to/verify.md:37-54`).

## Production validation gate (`derived`)

1. Resolve tag to index and per-platform digests; pin by digest
   (`pages/dhi/explore/security-concepts/digests.md:109-123`).
2. Inspect the index and confirm platforms (`pages/reference/cli/docker/buildx/imagetools/inspect.md:20-30`).
3. Verify attestations with `--verify`; use `--skip-tlog` if Rekor is absent
   (`pages/dhi/how-to/verify.md:167-186`, `pages/dhi/how-to/verify.md:238-246`).
4. Gate CI on `docker scout policy <image> --exit-code` and review exceptions
   (`pages/scout/policy/local.md:70-74`, `pages/scout/explore/exceptions.md:101-105`).
5. Promote only the verified digest; tags are human labels
   (`pages/build/building/best-practices.md:216-224`).

## Sources

- https://docs.docker.com/reference/cli/docker/image/pull/
- https://docs.docker.com/reference/cli/docker/image/inspect/
- https://docs.docker.com/reference/cli/docker/image/ls/
- https://docs.docker.com/reference/cli/docker/manifest/create/
- https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- https://docs.docker.com/reference/cli/docker/trust/sign/
- https://docs.docker.com/build/building/best-practices/
- https://docs.docker.com/build/metadata/attestations/sbom/
- https://docs.docker.com/build/metadata/attestations/slsa-provenance/
- https://docs.docker.com/build/metadata/attestations/attestation-storage/
- https://docs.docker.com/scout/policy/local/
- https://docs.docker.com/scout/explore/exceptions/
- https://docs.docker.com/dhi/how-to/verify/
