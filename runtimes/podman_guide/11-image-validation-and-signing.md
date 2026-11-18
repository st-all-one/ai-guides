# 11 — Image validation and signing

## 1. Policy model: scopes and trust types

`policy.json` is the admission file for image pulls: it names trusted keys and decides whether an image or a signature is accepted (`pages/markdown/podman.1.md:363-364`). Scope matching runs **most specific to least specific**, so a repository rule wins over a registry rule, which wins over `default` (`pages/markdown/podman-image-trust.1.md:10-20`).

Example scope order (`pages/markdown/podman-image-trust.1.md:15-20`): `docker.io/library/busybox:notlatest` → `docker.io/library/busybox` → `docker.io/library` → `docker.io` → `default`. The transport is part of identity: for `docker://docker.io/library/busybox`, transport is `docker` and registry host is `docker.io` (`pages/markdown/podman-image-trust.1.md:7-9`).

| Trust type (`--type`) | Meaning | Raw JSON encoding |
|---|---|---|
| `accept` | No signature required for this scope | `insecureAcceptAnything` (`pages/markdown/podman-image-trust.1.md:85-89`) |
| `reject` | Images from this scope are refused | `reject` (`pages/markdown/podman-image-trust.1.md:80-84`) |
| `signedBy` | Require **simple signing** signature(s) with listed public keys | `signedBy`, `keyType`, `keyPath`/`keyData` (`pages/markdown/podman-image-trust.1.md:90-103`) |
| `sigstoreSigned` | Require a **sigstore** signature with listed public keys | `sigstoreSigned` (`pages/markdown/podman-image-trust.1.md:37-46`) |

Accepted CLI values are `signedBy` (default), `sigstoreSigned`, `accept`, `reject`; `--pubkeysfile` is mandatory for both signing types and may be repeated to require multiple keys (`pages/markdown/podman-image-trust.1.md:31-46`). `--signature-policy` is required by `set` and selects the file to modify; `show` uses it to select the file to display, otherwise resolving the same path used for pulls (`pages/markdown/podman-image-trust.1.md:35-36`, `:52-55`).

The shipped sample is deliberately permissive at `default` with one explicit deny scope. Verbatim excerpt from `samples/policy.json:1-13`:
```json
{
    "default": [
        {
            "type": "insecureAcceptAnything"
        }
    ],
    "transports": {
        "docker": {
            "docker.io/library/hello-world": [
                {
                    "type": "reject"
                }
            ],
```

The same sample carries a `signedBy` entry for `registry.access.redhat.com` with `keyType: GPGKeys` and inline `keyData` (`samples/policy.json:14-18`). For production, invert the sample: `default = reject`, then explicit `accept` or `signedBy` scopes; a `reject default` example exists in `pages/markdown/podman-image-trust.1.md:59-60`.

## 2. Operating trust: `set`, `show`, `--raw`

`podman image trust` is **not available with the remote client** (macOS/Windows excluding WSL2) (`pages/markdown/podman-image-trust.1.md:6`). Edit the policy on the host that performs the pull.
Command forms follow the documented `set`/`show` syntax (derived):
```bash
sudo podman image trust set --signature-policy /etc/containers/policy.json --type accept docker.io
sudo podman image trust set --signature-policy /etc/containers/policy.json -t reject default
podman image trust show
podman image trust show --raw
```

| Command / flag | Effect |
|---|---|
| `trust set -t accept REPO` | Write an allow scope for that registry/repository (`pages/markdown/podman-image-trust.1.md:57-58`) |
| `trust set -t reject default` | Deny by default; narrow exceptions afterwards (`pages/markdown/podman-image-trust.1.md:59-60`) |
| `trust show` | Table: transport, name, type, key ID, signature store (`pages/markdown/podman-image-trust.1.md:62-69`) |
| `trust show --raw` | Raw policy JSON for audit/diff in CI (`pages/markdown/podman-image-trust.1.md:52-53`, `:70-113`) |
| `trust show --json` | Machine-parsable trust list (`pages/markdown/podman-image-trust.1.md:47-49`, `:114-155`) |
| `trust show --noheading` | Omit table header for scripting (`pages/markdown/podman-image-trust.1.md:50-51`) |

A `signed` row in `show` output is a simple-signing `signedBy` policy plus the HTTP(S) location of its signature store; it is not a vulnerability result (`pages/markdown/podman-image-trust.1.md:66-67`). `--raw` is the reliable way to snapshot and compare policy state across hosts.

## 3. Signing paths: simple signing vs sigstore

`podman image sign` creates a **local** signature for a local image pulled from a registry, writing to a directory derived from `registries.d` or, absent that, `/var/lib/containers/sigstore` (root) / `$HOME/.local/share/containers/sigstore` (rootless) (`pages/markdown/podman-image-sign.1.md:5-10`). Key flags: `--sign-by=identity` overrides the signature identity, `--directory/-d` overrides the store (`pages/markdown/podman-image-sign.1.md:22-27`), and `--all` signs every manifest of a multi-arch image (`pages/markdown/podman-image-sign.1.md:12-13`).

The read/write location is a `registries.d` YAML map; the captured example (`pages/markdown/podman-image-sign.1.md:40-42`) is:
```yaml
docker:
  privateregistry.example.com:
    sigstore: file:///var/lib/containers/sigstore
```

The same `sigstore:` key controls where signatures are read on pull (`pages/markdown/podman-image-sign.1.md:43-46`). Root uses `/etc/containers/registries.d`, rootless `$HOME/.config/containers/registries.d` (`pages/markdown/podman-image-sign.1.md:33-39`).

Signing at push time is separate from `image sign` (`pages/markdown/podman-push.1.md:82-93`):

| Push flag | Signature kind | Constraint |
|---|---|---|
| `--sign-by=key` | simple signing | Not on remote client |
| `--sign-by-sq-fingerprint=fingerprint` | simple signing (Sequoia-PGP) | Not on remote client |
| `--sign-by-sigstore=param-file` | sigstore | Parameters in `containers-sigstore-signing-params.yaml(5)` |
| `--sign-by-sigstore-private-key=path` | sigstore | Not on remote client |
| `--sign-passphrase-file=path` | passphrase for key-based forms | Applies to the key flags above |

The distinction that matters for admission: `signedBy` verifies identities/keys from simple signing, `sigstoreSigned` verifies sigstore signatures; both require `--pubkeysfile` when configured via `trust set` (`pages/markdown/podman-image-trust.1.md:31-43`). The captured documentation defines no `cosign` command and no keyless/OIDC verification flow; do not assume `sigstoreSigned` covers those without an external verifier (derived from `pages/markdown/podman-image-trust.1.md:21-25`, `:37-46`). The word *sigstore* is overloaded: it also names the simple-signing signature directory (`pages/markdown/podman-image-sign.1.md:8-10`).

## 4. Admission gate: digest + signature + SBOM

A deterministic gate checks three independent properties before a container starts. Design (derived; wire to your own CI/registry state):
```bash
# 1. Identity: pin by digest, never by mutable tag
podman pull --tls-verify=true registry.example.com/team/api@sha256:<digest>
# 2. Provenance: signature required by policy, not by flag-of-the-day
podman image trust show --raw > /tmp/policy.audit.json
grep -q '"type": "reject"' /tmp/policy.audit.json
# 3. Inventory: SBOM attached as an OCI artifact, checked against the approved list
podman artifact pull --tls-verify registry.example.com/team/api-sbom@sha256:<sbom-digest>
podman artifact inspect --format '{{.Digest}}' registry.example.com/team/api-sbom@sha256:<sbom-digest>
podman run --pull=never registry.example.com/team/api@sha256:<digest> /usr/local/bin/ready
```

`--pull=never` blocks silent re-resolution of a tag; `missing`/`always`/`newer` are the other pull values (`pages/markdown/podman-run.1.md:985-989`). The signature check is enforced by `policy.json` at pull time (`pages/markdown/podman-image-trust.1.md:10`), so the gate should fail closed by keeping `default = reject` (`pages/markdown/podman-image-trust.1.md:59-60`). `podman artifact` v6 can pull and inspect a blob by digest, which is the mechanism for an out-of-band SBOM (`pages/markdown/podman-artifact-pull.1.md:4-10`, `pages/markdown/podman-artifact-inspect.1.md:4-12`).

SBOM generation in v6 is a build-time feature with presets and explicit outputs (`pages/markdown/podman-build.1.md:705-711`):

| Flag | Role |
|---|---|
| `--sbom=preset` | `syft`/`syft-cyclonedx`, `syft-spdx`, `trivy`/`trivy-cyclonedx`, `trivy-spdx` (`pages/markdown/podman-build.1.md:712-731`) |
| `--sbom-output=file` / `--sbom-purl-output=file` | Write SBOM / PURL list to the local filesystem (`pages/markdown/podman-build.1.md:758-765`) |
| `--sbom-image-output=path` / `--sbom-image-purl-output=path` | Write SBOM / PURL list into the output image (`pages/markdown/podman-build.1.md:732-739`) |
| `--sbom-scanner-image` / `--sbom-scanner-command` | Run a scanner image with `{ROOTFS}`, `{CONTEXT}`, `{OUTPUT}` substitution (`pages/markdown/podman-build.1.md:766-777`) |
| `--sbom-merge-strategy` | `cat`, `merge-cyclonedx-by-component-name-and-version`, `merge-spdx-by-package-name-and-versioninfo` (`pages/markdown/podman-build.1.md:740-757`) |

Honest limit: these flags **produce an inventory** by scanning the rootfs and build context; no captured Podman page documents a CVE database, vulnerability score, or pass/fail vulnerability gate. Vulnerability analysis must be an external step that consumes the SBOM (derived from `pages/markdown/podman-build.1.md:705-711`). A `reject` policy also does not scan content — it only decides trust (`pages/markdown/podman-image-trust.1.md:21-25`).

## 5. TLS and enforcement boundaries

`--tls-verify` defaults to `true`: require HTTPS and verify certificates; explicit `false` disables verification; when unset, an `insecure=true` registry entry in `containers-registries.conf` is honored (`pages/markdown/podman-pull.1.md:83-88`, `samples/registries.conf:26-30`). The same semantics apply to `push` (`pages/markdown/podman-push.1.md:94-99`) and `artifact pull` (`pages/markdown/podman-artifact-pull.1.md:38-43`). Keep TLS verification on for admission pulls; disable it only for a local test registry isolated from production traffic.

Boundaries worth making explicit in an incident runbook: image trust is unavailable on remote clients (`pages/markdown/podman-image-trust.1.md:6`); several signing flags are unavailable remotely (`pages/markdown/podman-push.1.md:82-91`); and `--cert-dir` for `image sign` is likewise local-only (`pages/markdown/podman-image-sign.1.md:18-21`). The `--signature-policy` flag on `trust` edits a file; it is not a per-run bypass (`pages/markdown/podman-image-trust.1.md:35-36`). Verify the effective policy path on the machine that actually pulls.

## Pitfalls

- A broad `accept` scope shadows `default = reject`; scope order is most-specific-first (`pages/markdown/podman-image-trust.1.md:11-20`).
- Raw JSON encodes `accept` as `insecureAcceptAnything`; grepping for `"accept"` misses it (`pages/markdown/podman-image-trust.1.md:85-89`).
- `podman image trust` and several sign flags do not work through the remote client (`pages/markdown/podman-image-trust.1.md:6`, `pages/markdown/podman-push.1.md:82-91`).
- `sigstore` means two different things: a signature kind and a simple-signing directory (`pages/markdown/podman-image-trust.1.md:42-43`, `pages/markdown/podman-image-sign.1.md:8-10`).
- SBOM generation is package inventory, not a vulnerability scan; nothing in the captured docs gates on CVEs (`pages/markdown/podman-build.1.md:705-711`).
- `--tls-verify=false` can be inherited from an `insecure=true` registry entry unless set explicitly true (`pages/markdown/podman-pull.1.md:83-88`).

## Sources

- Captured pages: `pages/markdown/podman-image-trust.1.md`, `pages/markdown/podman-image-sign.1.md`, `pages/markdown/podman-push.1.md`, `pages/markdown/podman-pull.1.md`, `pages/markdown/podman-build.1.md`, `pages/markdown/podman-run.1.md`, `pages/markdown/podman.1.md`, `pages/markdown/podman-artifact-pull.1.md`, `pages/markdown/podman-artifact-inspect.1.md`; samples `samples/policy.json`, `samples/registries.conf`.
- https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- https://docs.podman.io/en/latest/markdown/podman-image-sign.1.html
- https://docs.podman.io/en/latest/markdown/podman-build.1.html
- https://docs.podman.io/en/latest/markdown/podman-push.1.html
- https://github.com/containers/podman/tree/055de046937d29450f310fce0fe3071485d8bed9
