# 16 - Supply Chain: Lockfiles, Indexes, Publishing and Limits

This chapter answers what uv's lockfile and index controls actually guarantee, which security features are still PREVIEW, and where the guarantees stop. It depends on chapter 18 (uv projects and lockfiles) for the basic `uv.lock` workflow and chapter 15 for application-level security boundaries.

## What a `uv.lock` pins

Locking resolves project dependencies into `uv.lock`; syncing installs a subset of that lockfile into the project environment (`samples/concepts__projects__sync.md:3`). The resolution is *universal*: the same lockfile is portable across operating systems, architectures and Python versions (`samples/concepts__resolution.md:65`). Existing locked or installed versions are preferred and change only on an incompatible request or explicit `--upgrade` (`samples/concepts__resolution.md:198`). New upstream releases do **not** make a lockfile outdated (`samples/concepts__projects__sync.md:43`), so upgrades are a deliberate act.

| Control | Behaviour | Evidence |
|---|---|---|
| `--locked` | Errors if the lockfile is out of date instead of updating it | `samples/concepts__projects__sync.md:15` |
| `--frozen` | Uses the lockfile without checking freshness | `samples/concepts__projects__sync.md:17-20` |
| `uv run` | Automatically locks and syncs before invoking the command | `samples/concepts__projects__sync.md:7` |
| `uv pip compile` | Writes exact versions so environments are reproducible | `samples/pip__compile.md:3` |
| `--require-build-hashes` | Verifies build-dependency hashes from a build-constraint file | `samples/pip__compile.md:175-178` |

```bash
uv sync --locked          # fail rather than silently rewrite uv.lock
uv run --frozen pytest    # run against the lockfile exactly as written
uv export --format requirements.txt
```

## Reproducing over time: `--exclude-newer` and cooldowns

`--exclude-newer` limits resolution to distributions uploaded before a given date, comparing against each artifact's *upload time* rather than the package release date; the date may be an RFC 3339 timestamp or a local date (`samples/concepts__resolution.md:609`). It requires the index to expose the `upload-time` field from PEP 700 — PyPI provides it, but an index that does not will make artifacts unavailable unless opted out (`samples/concepts__resolution.md:613`). Dependency *cooldowns* use the same mechanism with a duration instead of an absolute date, explicitly to delay adoption until new versions have been vetted (`samples/concepts__resolution.md:685-689`).

Derived: for a reproducible build, commit `uv.lock`, run CI with `--locked`, and set a cooldown (for example `P7D`) only if you accept that security fixes are delayed by that window — the docs frame this as a trade-off, not a free improvement.

## Lockfile schema and forward compatibility

`uv.lock` carries a versioned schema in its `version` field (`samples/concepts__resolution.md:726`). A uv version rejects a lockfile with a greater schema version (`samples/concepts__resolution.md:728`); older-schema readability is *not guaranteed* (`samples/concepts__resolution.md:730`). The schema version is public API, bumped only in minor releases, so patch versions within a minor line are mutually compatible (`samples/concepts__resolution.md:732`); the `revision` field tracks backward-compatible additions without causing errors (`samples/concepts__resolution.md:734`). Derived: pin the uv minor version in CI to avoid cross-minor lockfile rejection.

## Indexes and credentials

The default index is always treated as lowest priority regardless of list position (`samples/concepts__indexes.md:28`). By default uv uses `first-index`: it limits candidates to the first index containing a package, a behaviour intended to prevent dependency-confusion attacks (`samples/concepts__indexes.md:97-99`). Alternatives are `unsafe-first-match` and `unsafe-best-match` (`samples/concepts__indexes.md:101-105`). Authentication is required for private repositories or package indexes, with HTTP, Git, TLS certificate and third-party subpages documented (`samples/concepts__authentication.md:3-10`).

| Risk | uv mechanism | Evidence |
|---|---|---|
| Dependency confusion | `first-index` caps candidates at the first matching index | `samples/concepts__indexes.md:97-99` |
| Credential exposure | Auth handled via CLI/HTTP/Git/TLS flows; scoped to private indexes | `samples/concepts__authentication.md:3-10` |
| Build-time dependency substitution | `--require-build-hashes` against a build-constraint file | `samples/pip__compile.md:175-178` |

## Security features that are PREVIEW

Both of the following are **PREVIEW** and subject to change; do not treat them as stable compliance controls.

- **Audit.** `uv audit` and `uv tool audit` check project and installed-tool dependencies for known vulnerabilities; the tool variant depends on the `tool-install-locks` preview feature (`samples/concepts__preview.md:75-77`). Preview features are opt-in and are enabled by `--preview`, `UV_PREVIEW`, or specific `--preview-features` (`samples/concepts__preview.md:3`, `samples/concepts__preview.md:7`, `samples/concepts__preview.md:19`).
- **On-sync malware check.** A lightweight scan of the lockfile against OSV's malicious-package database terminates the sync on a match; it is explicitly preview (`samples/concepts__projects__sync.md:183-187`), enabled via `audit.malware-check = true` or `UV_MALWARE_CHECK=1` (`samples/concepts__projects__sync.md:189`).

```bash
# Documented opt-in for the PREVIEW on-sync malware check:
UV_MALWARE_CHECK=1 uv sync --locked
uv audit                     # PREVIEW: known-vulnerability check
```

Derived: enable preview controls in a dedicated CI job first, then promote them to local developer workflows once the feature stabilizes; the environment variable is documented at `samples/concepts__projects__sync.md:189`.

## Publishing and attestations

`uv publish` accepts a token via `--token`/`UV_PUBLISH_TOKEN` or username/password, but publishing from GitHub Actions as a Trusted Publisher needs no credentials (`samples/guides__package.md:108`). With trusted publishing, uv attempts to invalidate the short-lived PyPI token after publishing, even on failure (`samples/guides__package.md:110`); if invalidation fails it only warns, and explicitly supplied tokens are not revoked (`samples/guides__package.md:112`). Critically, `uv publish` does **not** generate attestations — they must be created separately — but it can *upload* PEP 740 attestations to supporting registries such as PyPI (`samples/guides__package.md:142-146`).

## Exports and what uv does not guarantee

`uv.lock` can be exported to `requirements.txt`, `pylock.toml` (the PEP 751 standard format) and CycloneDX SBOM (`samples/concepts__projects__export.md:9-13`, `samples/concepts__projects__sync.md:157`). Those exports are interoperability formats, not additional security checks.

Limits that are documented and must be stated plainly: universal resolution is a best-effort approximation of machine markers and "may lose fidelity for complex package and platform combinations" (`samples/concepts__resolution.md:61`); a lockfile is not invalidated by newly released versions (`samples/concepts__projects__sync.md:43`); `--exclude-newer` depends on index metadata support (`samples/concepts__resolution.md:613`); and audit/malware checks are preview (`samples/concepts__preview.md:75-77`, `samples/concepts__projects__sync.md:183`). Claims about SBOM completeness, signature verification of arbitrary artifacts, or a CVE-free dependency tree are **not verified** by these captures. Derived: treat lockfiles, hashes and attestations as provenance inputs to your own release policy, not as a substitute for review.

## Sources

- https://docs.astral.sh/uv/concepts/resolution/
- https://docs.astral.sh/uv/concepts/preview/
- https://docs.astral.sh/uv/concepts/projects/sync/
- https://docs.astral.sh/uv/concepts/indexes/
- https://docs.astral.sh/uv/concepts/authentication/
- https://docs.astral.sh/uv/guides/package/
- https://docs.astral.sh/uv/pip/compile/
- https://docs.astral.sh/uv/concepts/projects/export/
