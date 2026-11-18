# 08 - Packages and supply chain

Deno 2.9.3 is a package manager for npm and JSR inside the `deno` binary, working with `deno.json`, `package.json`, or both; npm lifecycle scripts do not run unless approved (`docs/rt_runtime__packages.md:17-21`). Supply-chain goals are determinism, early detection of upstream changes, intentional updates, and offline resilience (`docs/rt_runtime__packages__supply_chain.md:7-18`).

## Dependency toolbelt

| Command | Purpose | Evidence |
|---|---|---|
| `deno install` | install declared dependencies; `-g` installs a tool | `docs/rt_runtime__packages.md:53-55` |
| `deno add` / `deno remove` | add or remove an entry in the config file | `docs/rt_runtime__packages.md:56-57` |
| `deno outdated` / `deno update` | list or apply newer versions | `docs/rt_runtime__packages.md:58-59` |
| `deno why` / `deno info` | explain a path in the tree; print the graph | `docs/rt_runtime__packages.md:60-61` |
| `deno audit` | report known vulnerabilities | `docs/rt_runtime__packages.md:62` |
| `deno approve-scripts` | approve npm lifecycle scripts | `docs/rt_runtime__packages.md:63` |
| `deno ci` | clean, lockfile-strict CI install | `docs/rt_runtime__packages.md:64` |
| `deno publish` / `deno pack` | publish to JSR; build an npm tarball | `docs/rt_runtime__packages.md:65-66` |

Unprefixed CLI names are npm packages since 2.8; `jsr:` is still required, and `npm:` remains required in import specifiers (`docs/rt_runtime__reference__cli__add.md:25-32`). `deno add --save-exact` pins instead of adding the default caret range (`docs/rt_runtime__reference__cli__add.md:34-42`).

## Version ranges

| Specifier | Meaning | Evidence |
|---|---|---|
| `1.2.3` | exact version | `docs/rt_runtime__packages.md:90-92` |
| `^1.2.3` | compatible; leftmost non-zero digit unchanged | `docs/rt_runtime__packages.md:93` |
| `~1.2.3` | patch updates only | `docs/rt_runtime__packages.md:94` |
| `1.2.x`, `1.x` | wildcard patch or minor level | `docs/rt_runtime__packages.md:99-100` |
| `*` | any version; avoid in production applications | `docs/rt_runtime__packages.md:101`, `docs/rt_runtime__packages__supply_chain.md:22-27` |

## Lockfile and reproducible installs

`deno.lock` records exact versions and integrity hashes and is verified on later runs; commit it (`docs/rt_runtime__packages.md:162-166`). `--frozen` or `"lock": { "frozen": true }` makes new, unseen dependencies fail instead of appearing silently (`docs/rt_runtime__packages__supply_chain.md:28-31`). `--cached-only` forbids network access entirely, and `deno ci` errors if the lockfile is missing or out of date (`docs/rt_runtime__packages.md:202-208`, `docs/rt_runtime__packages.md:166-169`).

Freeze and cache-only in CI (`docs/rt_runtime__packages__supply_chain.md:159-165`):
```sh
# Install (resolve) dependencies exactly as locked; fail if drift or new deps
deno install --frozen --entrypoint main.ts

# (optional) Run with only cached modules to guarantee no network access
deno run --cached-only main.ts
```

## Vulnerability auditing

`deno audit` reads the lockfile and reports advisories found in vulnerability databases (`docs/rt_runtime__reference__cli__audit.md:10-12`).

| Flag | Effect | Evidence |
|---|---|---|
| `--level=high` | only high and critical severity | `docs/rt_runtime__reference__cli__audit.md:22-26` |
| `--socket` | check the socket.dev database | `docs/rt_runtime__reference__cli__audit.md:28-32` |
| `--ignore` | suppress named CVEs | `docs/rt_runtime__reference__cli__audit.md:34-38` |
| `--ignore-unfixable` | skip advisories with no fix | `docs/rt_runtime__reference__cli__audit.md:40-44` |
| `--ignore-registry-errors` | do not fail when audit data cannot be fetched | `docs/rt_runtime__reference__cli__audit.md:46-50` |
| `--fix` | upgrade to a patched semver-compatible version | `docs/rt_runtime__reference__cli__audit.md:52-69` |

`--fix` deliberately skips major upgrades, unusual specifier styles such as `>=1 <2` or `1.x`, and transitive packages without a clean direct path (`docs/rt_runtime__reference__cli__audit.md:61-69`). Run the audit after `deno ci` so install and check share one reproducible state (`docs/rt_runtime__reference__cli__audit.md:86-88`).

## Time and trust gates

Minimum dependency age is on by default since 2.9 with a 24-hour window; config accepts ISO-8601 durations, integers, dates, or `0` to disable (`docs/rt_runtime__packages__supply_chain.md:46-90`).

| Publishing trust level | Signal | Evidence |
|---|---|---|
| Plain | no signal | `docs/rt_runtime__packages__supply_chain.md:109-113` |
| Provenance | signed SLSA attestation | `docs/rt_runtime__packages__supply_chain.md:103-114` |
| Trusted publishing | npm OIDC, no long-lived token | `docs/rt_runtime__packages__supply_chain.md:101-115` |
| Trusted publishing plus provenance | both signals | `docs/rt_runtime__packages__supply_chain.md:116` |
| Staged | live 2FA approval; ranks highest | `docs/rt_runtime__packages__supply_chain.md:117-120` |

`trust-policy=no-downgrade` in `.npmrc` refuses a candidate weaker than the `trust` level recorded in `deno.lock`; it is off by default and the baseline is the highest locked level (`docs/rt_runtime__packages__supply_chain.md:122-145`).

## Scripts, overrides, and publishing

Lifecycle scripts are blocked by default because they are a known attack vector; allow one package with `deno install --allow-scripts=npm:sqlite3`, or use `deno approve-scripts` interactively (`docs/rt_runtime__reference__cli__install.md:283-303`, `docs/rt_runtime__reference__cli__approve_scripts.md:25-32`). `links` overrides local packages from the workspace root, `scopes` redirects HTTPS imports, and `package.json` `overrides` pins transitive versions (`docs/rt_runtime__packages.md:254-347`, `docs/rt_runtime__packages.md:404-425`). Vendoring with `"vendor": true` stores source locally and complements, rather than replaces, the lockfile (`docs/rt_runtime__packages.md:210-244`, `docs/rt_runtime__packages__supply_chain.md:219-229`).

JSR publishing requires `name`, `version`, and `exports` in `deno.json` or `jsr.json` (`docs/rt_runtime__reference__cli__publish.md:11-34`):
```json title="deno.json"
{
  "name": "@scope_name/package_name",
  "version": "1.0.0",
  "exports": "./main.ts"
}
```

Use `deno publish --dry-run` first, `--check=all` to check remote modules, and `--token` for non-interactive CI (`docs/rt_runtime__reference__cli__publish.md:73-89`). Private remote modules authenticate with semicolon-separated tokens (`docs/rt_runtime__packages__private_repositories.md:25-58`):
```sh
DENO_AUTH_TOKENS=a1b2c3d4e5f6@deno.land
```

## Pitfalls

- A frozen lockfile alone is not hermetic if the remote source disappears; vendor as well (`docs/rt_runtime__packages__supply_chain.md:228-229`).
- `--fix` will not perform major upgrades; report those as unfixable (`docs/rt_runtime__reference__cli__audit.md:61-65`).
- No prior trust baseline exists the first time a package is locked (`docs/rt_runtime__packages__supply_chain.md:141-143`).
- GitHub returns `404` rather than `401` when a token or scope is wrong (`docs/rt_runtime__packages__private_repositories.md:91-95`).

## Sources
- https://docs.deno.com/runtime/packages/
- https://docs.deno.com/runtime/packages/supply_chain/
- https://docs.deno.com/runtime/packages/publishing/
- https://docs.deno.com/runtime/reference/cli/audit/
- https://docs.deno.com/runtime/reference/cli/install/
- https://docs.deno.com/runtime/reference/cli/publish/
- https://jsr.io/
- https://github.com/denoland/deno
- https://docs.npmjs.com/
