# Samples

Byte-identical copies of official documentation pages that anchor the dossier. Each file was
copied with `cp` from the capture at `/tmp/docker-research/pages/` and never edited. Integrity
is checked with `cmp` by the mechanical verifier: a one-byte difference is a failure. Do not
add headers, footers or line numbers to a sample.

| Sample | Origin | Why it is critical |
|---|---|---|
| `configure.md` | `pages/engine/logging/configure.md` | Defines daemon-wide log driver and rotation keys; the rotation example at lines 47-55 is the canonical source for bounded logs |
| `defaults.md` | `pages/ai/sandboxes/security/defaults.md` | States the sandbox security posture: outbound TCP blocked by default, internal DNS, workspace access and proxy-injected credentials |
| `seccomp.md` | `pages/engine/security/seccomp.md` | Documents the default seccomp profile and the exact `--security-opt` forms used to change it |
| `profiles.md` | `pages/reference/compose-file/profiles.md` | Defines profile activation rules and the `depends_on` constraint that makes profile-based Compose files predictable |
| `sbom.md` | `pages/build/metadata/attestations/sbom.md` | Source for generating and attaching SBOM attestations during BuildKit builds |
| `verify.md` | `pages/dhi/how-to/verify.md` | Source for attestation listing and the `--verify` gate used before promoting a hardened image |
| `live-restore.md` | `pages/engine/daemon/live-restore.md` | Source for daemon restart behavior that keeps containers running; central to controlled upgrades |

## Usage rule

A sample is evidence, not a substitute for the chapter that interprets it. Every sample is
cited from at least one chapter with a `samples/<name>.md:LINE` token. When the capture is
refreshed, re-copy the page in the same commit that updates the citations, so the manifest,
the sample and the chapter stay on one snapshot.
