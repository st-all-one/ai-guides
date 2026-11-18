# uv Documentation Capture — MANIFEST

Capture date: 2026-11-18. Source: `https://docs.astral.sh/uv/` markdown endpoints
(`llms.txt` pre-captured in this directory). Every `.md` URL in `llms.txt` was
parsed and fetched, plus the 34 additionally requested reference pages (all 34
were already present in `llms.txt`; 55 unique URLs total). Fetch method:
`curl -fsSL <url> -o <flat>.md` with no byte editing. Flat name = URL path after
`/uv/` with trailing `/index.md` dropped and `/` replaced by `__` (e.g.
`concepts/projects/sync/index.md` → `concepts__projects__sync.md`).

## Capture status

- Captured: **55 / 55** (HTTP 200, `curl` exit 0).
- **404s / MISSING: none.** Every requested URL resolved; no fabrication needed.
- Governing note in `llms.txt`: explicit `/index.md` paths return clean markdown
  instead of rendered HTML with JS/CSS (that convention was followed throughout).

## Pinned version

**Pinned uv version: 0.13.9** — docs and current release agree.

- `getting-started__installation.md:26` — `curl -LsSf https://astral.sh/uv/0.13.9/install.sh | sh`
- `getting-started__installation.md:40` — PowerShell installer pinned to `0.13.9`
- `concepts__build-backend.md:25` (also `concepts__projects__init.md:57`,
  `concepts__projects__workspaces.md:64`) — `requires = ["uv_build>=0.13.9,<0.14"]`
- `guides__integration__docker.md:116` — `COPY --from=ghcr.io/astral-sh/uv:0.13.9 /uv /uvx /bin/`
- `guides__integration__github.md:45` — `version: "0.13.9"` in `setup-uv`
- `guides__integration__gitlab.md:11`, `guides__integration__pre-commit.md:15` — `UV_VERSION: "0.13.9"` / `rev: 0.13.9`
- GitHub API `https://api.github.com/repos/astral-sh/uv/releases/latest`:
  `tag_name = 0.13.9`, `name = 0.13.9`, `published_at = 2026-11-17T09:57:55Z`,
  `created_at = 2026-11-17T09:09:58Z`, `html_url = https://github.com/astral-sh/uv/releases/tag/0.13.9`.
- Verdict: documentation references match the latest published release (0.13.9);
  no contradiction found.

## Captured files

| file | exact URL | bytes | lines | why critical |
|---|---|---:|---:|---|
| concepts__authentication.md | https://docs.astral.sh/uv/concepts/authentication/index.md | 333 | 11 | Hub for HTTP/Git private-index auth |
| concepts__build-backend.md | https://docs.astral.sh/uv/concepts/build-backend/index.md | 10060 | 218 | Native `uv_build` backend, PEP 517, bundled copy |
| concepts__cache.md | https://docs.astral.sh/uv/concepts/cache/index.md | 11579 | 161 | Cache keys, safety, hardlink/clone, CI pruning |
| concepts__configuration-files.md | https://docs.astral.sh/uv/concepts/configuration-files/index.md | 5804 | 92 | Config precedence, dotenv, env/CLI overrides |
| concepts__indexes.md | https://docs.astral.sh/uv/concepts/indexes/index.md | 14872 | 301 | Index priority, strategy, credentials, find-links |
| concepts__preview.md | https://docs.astral.sh/uv/concepts/preview/index.md | 19462 | 287 | Preview flags, `uv audit`, feature catalogue |
| concepts__projects__build.md | https://docs.astral.sh/uv/concepts/projects/build/index.md | 4709 | 79 | Building dists, build dependency hashes |
| concepts__projects__config.md | https://docs.astral.sh/uv/concepts/projects/config/index.md | 24224 | 533 | `pyproject.toml`/`[tool.uv]` configuration surface |
| concepts__projects__dependencies.md | https://docs.astral.sh/uv/concepts/projects/dependencies/index.md | 28867 | 932 | `uv add`, groups, extras, sources, Git deps |
| concepts__projects__export.md | https://docs.astral.sh/uv/concepts/projects/export/index.md | 4193 | 94 | requirements/pylock.toml/CycloneDX SBOM export |
| concepts__projects__init.md | https://docs.astral.sh/uv/concepts/projects/init/index.md | 9239 | 334 | Project scaffolding, build backend pin |
| concepts__projects__layout.md | https://docs.astral.sh/uv/concepts/projects/layout/index.md | 5745 | 83 | Project files and `uv.lock` location |
| concepts__projects__run.md | https://docs.astral.sh/uv/concepts/projects/run/index.md | 3535 | 84 | `uv run` in project context |
| concepts__projects__sync.md | https://docs.astral.sh/uv/concepts/projects/sync/index.md | 8611 | 191 | `--locked`/`--frozen`, auto lock+sync, OSV scan |
| concepts__projects__workspaces.md | https://docs.astral.sh/uv/concepts/projects/workspaces/index.md | 8338 | 170 | Shared lockfile, members, workspace sources |
| concepts__python-versions.md | https://docs.astral.sh/uv/concepts/python-versions/index.md | 20099 | 394 | Managed Python discovery/download/pinning |
| concepts__resolution.md | https://docs.astral.sh/uv/concepts/resolution/index.md | 42061 | 738 | Universal resolution, reproducibility, schema |
| concepts__tools.md | https://docs.astral.sh/uv/concepts/tools/index.md | 9838 | 236 | Tool environments, `uvx` caching semantics |
| getting-started__features.md | https://docs.astral.sh/uv/getting-started/features/index.md | 4526 | 103 | Command map across all uv surfaces |
| getting-started__first-steps.md | https://docs.astral.sh/uv/getting-started/first-steps/index.md | 551 | 18 | Fastest onboarding path |
| getting-started__installation.md | https://docs.astral.sh/uv/getting-started/installation/index.md | 6290 | 245 | Install methods and pinned version evidence |
| guides__install-python.md | https://docs.astral.sh/uv/guides/install-python/index.md | 4399 | 119 | Installing Python via uv |
| guides__integration__aws-lambda.md | https://docs.astral.sh/uv/guides/integration/aws-lambda/index.md | 19030 | 566 | Lambda packaging, version-pinned base image |
| guides__integration__aws.md | https://docs.astral.sh/uv/guides/integration/aws/index.md | 4085 | 110 | AWS CodeArtifact index/auth |
| guides__integration__azure.md | https://docs.astral.sh/uv/guides/integration/azure/index.md | 4303 | 90 | Azure Artifacts index/auth |
| guides__integration__bazel.md | https://docs.astral.sh/uv/guides/integration/bazel/index.md | 1293 | 37 | Bazel integration |
| guides__integration__coiled.md | https://docs.astral.sh/uv/guides/integration/coiled/index.md | 4392 | 113 | Coiled integration |
| guides__integration__dependabot.md | https://docs.astral.sh/uv/guides/integration/dependabot/index.md | 1357 | 39 | Dependabot lockfile updates |
| guides__integration__docker.md | https://docs.astral.sh/uv/guides/integration/docker/index.md | 20099 | 580 | Dockerfile patterns, layer caching, attestation |
| guides__integration__fastapi.md | https://docs.astral.sh/uv/guides/integration/fastapi/index.md | 3176 | 125 | FastAPI project workflow |
| guides__integration__github.md | https://docs.astral.sh/uv/guides/integration/github/index.md | 12715 | 431 | setup-uv, caching, `--locked` CI, publishing |
| guides__integration__gitlab.md | https://docs.astral.sh/uv/guides/integration/gitlab/index.md | 2146 | 67 | GitLab CI, UV_VERSION pin |
| guides__integration__google.md | https://docs.astral.sh/uv/guides/integration/google/index.md | 4110 | 106 | Google Artifact Registry auth |
| guides__integration__jfrog.md | https://docs.astral.sh/uv/guides/integration/jfrog/index.md | 1870 | 66 | JFrog Artifactory auth |
| guides__integration__jupyter.md | https://docs.astral.sh/uv/guides/integration/jupyter/index.md | 6498 | 118 | Jupyter kernels |
| guides__integration__marimo.md | https://docs.astral.sh/uv/guides/integration/marimo/index.md | 3490 | 82 | marimo notebooks |
| guides__integration__pre-commit.md | https://docs.astral.sh/uv/guides/integration/pre-commit/index.md | 1960 | 82 | pre-commit hooks, version pins |
| guides__integration__pytorch.md | https://docs.astral.sh/uv/guides/integration/pytorch/index.md | 15122 | 445 | Index-specific torch resolution |
| guides__integration__renovate.md | https://docs.astral.sh/uv/guides/integration/renovate/index.md | 2800 | 71 | Renovate dependency updates |
| guides__package.md | https://docs.astral.sh/uv/guides/package/index.md | 7915 | 174 | `uv build`/`uv publish`, trusted publishing |
| guides__projects.md | https://docs.astral.sh/uv/guides/projects/index.md | 7891 | 262 | End-to-end project workflow |
| guides__scripts.md | https://docs.astral.sh/uv/guides/scripts/index.md | 10525 | 373 | PEP 723 inline metadata, script locking |
| guides__tools.md | https://docs.astral.sh/uv/guides/tools/index.md | 7764 | 278 | `uvx`, isolated tool environments |
| pip__compatibility.md | https://docs.astral.sh/uv/pip/compatibility/index.md | 25792 | 336 | pip interface parity/gaps |
| pip__compile.md | https://docs.astral.sh/uv/pip/compile/index.md | 8061 | 207 | `uv pip compile`, build hashes |
| pip__dependencies.md | https://docs.astral.sh/uv/pip/dependencies/index.md | 1713 | 50 | pip-style dependency declaration |
| pip__environments.md | https://docs.astral.sh/uv/pip/environments/index.md | 6199 | 98 | venv management in pip interface |
| pip__inspection.md | https://docs.astral.sh/uv/pip/inspection/index.md | 820 | 41 | Environment inspection |
| pip__packages.md | https://docs.astral.sh/uv/pip/packages/index.md | 3286 | 142 | Package management via pip interface |
| reference__cli.md | https://docs.astral.sh/uv/reference/cli/index.md | 807015 | 17394 | Exhaustive CLI flags/env vars (locked/frozen/offline/link-mode) |
| reference__contributing.md | https://docs.astral.sh/uv/reference/contributing/index.md | 13145 | 328 | Contributing/build-from-source |
| reference__environment.md | https://docs.astral.sh/uv/reference/environment/index.md | 42968 | 1359 | All `UV_*` environment variables |
| reference__installer.md | https://docs.astral.sh/uv/reference/installer/index.md | 2002 | 47 | Installer options |
| reference__settings.md | https://docs.astral.sh/uv/reference/settings/index.md | 106205 | 3808 | All settings incl. `link-mode` defaults |
| reference__storage.md | https://docs.astral.sh/uv/reference/storage/index.md | 6555 | 175 | Cache/tools/config directory layout |

## MISSING

None. All 55 fetched URLs returned HTTP 200 and were written verbatim; there
were no 404s to record.

## KEY_FACTS

Line-cited via `rg -n` against the captured files. Format:
`<flat>.md:LINE — short fact`.

1. `concepts__projects__sync.md:3` — Locking resolves dependencies into `uv.lock`; syncing installs a subset into the project environment.
2. `concepts__projects__sync.md:7` — `uv run` automatically locks and syncs the project before invoking the command.
3. `concepts__projects__sync.md:15` — `--locked` errors instead of updating the lockfile when it is out of date.
4. `concepts__projects__sync.md:20` — `--frozen` uses the lockfile without checking whether it is up to date.
5. `concepts__projects__sync.md:43` — New package releases do not make a lockfile outdated; upgrades must be explicit.
6. `concepts__projects__sync.md:157` — `uv.lock` exports to requirements.txt, pylock.toml (PEP 751), and CycloneDX SBOM.
7. `concepts__projects__sync.md:185` — On-sync malware check scans the lockfile against OSV's malicious-package database (preview).
8. `reference__cli.md:821` — `--exclude-newer` limits candidates to distributions uploaded before a given date.
9. `reference__cli.md:888` — `--frozen` runs without updating `uv.lock` (`UV_FROZEN`).
10. `reference__cli.md:988` — `--locked` asserts `uv.lock` will remain unchanged (`UV_LOCKED`).
11. `reference__cli.md:1136` — `--offline` disables all network access (`UV_OFFLINE`).
12. `reference__cli.md:974` — `--link-mode` defaults to clone (copy-on-write) on macOS/Linux, hardlink on Windows.
13. `concepts__resolution.md:65` — `uv.lock` uses universal resolution and is portable across OS, architecture and Python version.
14. `concepts__resolution.md:198` — Existing locked or installed versions are preferred; they change only on incompatible request or `--upgrade`.
15. `concepts__resolution.md:609` — `--exclude-newer` reproduces installs by comparing each artifact's upload time.
16. `concepts__resolution.md:685` — Dependency "cooldowns" delay new-package adoption to improve security posture.
17. `concepts__resolution.md:728` — A uv version rejects lockfiles with a greater schema version.
18. `concepts__resolution.md:732` — Lockfile schema version is part of the public API, bumped only in minor releases.
19. `guides__scripts.md:125` — PEP 723 inline script metadata declares dependencies inside the script itself.
20. `guides__scripts.md:202` — `uv run` downloads the required Python version if it is not installed.
21. `guides__scripts.md:213` — A `#!/usr/bin/env -S uv run --script` shebang makes a script executable directly.
22. `guides__scripts.md:261` — PEP 723 scripts can be explicitly locked to `uv.lock` via `uv lock --script`.
23. `concepts__projects__dependencies.md:37` — `--dev`, `--group`, `--optional` route `uv add` to dependency groups/extras.
24. `concepts__projects__dependencies.md:14` — `dependency-groups` is a recently standardized feature not yet universal across tools.
25. `concepts__projects__workspaces.md:7` — Workspace packages share a single lockfile for a consistent dependency set.
26. `concepts__projects__workspaces.md:9` — `uv lock` operates on the whole workspace; `uv run`/`uv sync` accept `--package`.
27. `concepts__projects__workspaces.md:68` — `workspace = true` in `tool.uv.sources` resolves a dependency from a workspace member, not PyPI.
28. `guides__tools.md:12` — `uvx` (= `uv tool run`) invokes a tool without installing it.
29. `guides__tools.md:40` — `uvx` runs tools in temporary, isolated environments.
30. `concepts__tools.md:23` — `uvx` tool environments live in the cache and are disposable (`uv cache clean` removes them).
31. `concepts__tools.md:33` — After first use, `uvx` reuses the cached tool version unless a version is requested or cache refreshed.
32. `concepts__python-versions.md:43` — uv automatically downloads Python versions not found on the system by default.
33. `concepts__python-versions.md:59` — uv bundles a list of downloadable CPython and PyPy distributions for macOS/Linux/Windows.
34. `concepts__python-versions.md:178` — `requires-python` is respected; the first compatible Python version is used.
35. `concepts__python-versions.md:298` — `python-downloads` setting: `automatic` (default) vs `manual` (only `uv python install`).
36. `concepts__cache.md:11` — Git dependencies are cached by fully-resolved commit hash and pinned on compile.
37. `concepts__cache.md:103` — Concurrent uv commands are safe; a file lock protects the target venv.
38. `concepts__cache.md:117` — `cache-physical-space` preview accounts for hardlinks and copy-on-write clones in size estimates.
39. `concepts__cache.md:135` — `uv cache prune --ci` drops pre-built wheels but keeps source-built wheels for CI efficiency.
40. `reference__settings.md:1392` — `link-mode`: clone by default on macOS/Linux, hardlink on Windows.
41. `concepts__indexes.md:28` — The default index is always treated as lowest priority.
42. `concepts__indexes.md:101` — `--index-strategy` / `UV_INDEX_STRATEGY` selects alternate index behaviours.
43. `concepts__configuration-files.md:37` — `uv.toml` takes precedence over `pyproject.toml` in the same directory.
44. `concepts__configuration-files.md:49` — Precedence: CLI > environment variables > persistent config.
45. `concepts__preview.md:19` — `--preview-features` enables specific preview features; `UV_PREVIEW` enables all.
46. `concepts__preview.md:77` — `uv audit` / `uv tool audit` check dependencies for known vulnerabilities (preview).
47. `concepts__build-backend.md:5` — uv supports all PEP 517 backends and provides native `uv_build` for performance.
48. `concepts__build-backend.md:11` — The native uv build backend currently supports only pure Python code.
49. `guides__package.md:108` — Trusted publishing from GitHub Actions needs no credentials.
50. `guides__package.md:110` — uv invalidates the short-lived PyPI token after publishing.
51. `guides__package.md:144` — `uv publish` uploads PEP 740 attestations to supporting registries.
52. `guides__integration__docker.md:116` — Best practice: pin the uv image, e.g. `ghcr.io/astral-sh/uv:0.13.9`.
53. `guides__integration__docker.md:321` — `UV_LINK_MODE=copy` avoids cross-filesystem link warnings with cache mounts.
54. `guides__integration__github.md:193` — CI workflow runs `uv sync --locked --all-extras --dev`.
55. `pip__compile.md:3` — Locking writes exact versions so environments are reproducible across tools/platforms.
56. `pip__compile.md:175` — `--require-build-hashes` verifies build dependency hashes from a build-constraint file.
57. `concepts__projects__export.md:12` — `pylock.toml` is the standardized PEP 751 lockfile export format.
58. `getting-started__installation.md:26` — The installer URL is pinned: `https://astral.sh/uv/0.13.9/install.sh`.

Facts span 21 distinct captured files (requirement: at least 15).
