# 07 - compose-model

The deployable artifact is the resolved model; pin every input affecting resolution.

## Project identity

Project name scopes containers, networks, and volumes: a determinism control. `pages/compose/how-tos/project-name.md:4` Valid names use lowercase letters, digits, dashes, underscores, starting with a letter or digit. `pages/compose/how-tos/project-name.md:23-26`

| Priority | Source |
|---|---|
| 1 | `-p` flag |
| 2 | `COMPOSE_PROJECT_NAME` |
| 3 | Top-level `name:` (last across `-f` files) |
| 4 | Project directory basename (first `-f` basename) |
| 5 | Current directory basename |

`pages/compose/how-tos/project-name.md:28-34` Project directory defaults to the Compose file base, overridable by `--project-directory`. `pages/compose/how-tos/project-name.md:8-11` The name is exposed to interpolation as `COMPOSE_PROJECT_NAME`. `pages/reference/compose-file/version-and-name.md:22-24`

`version` is obsolete and informative only: Compose validates against the newest schema regardless, warning on unknown fields. `pages/reference/compose-file/version-and-name.md:4-13` `name:` supplies the project name when none is explicit. `pages/reference/compose-file/version-and-name.md:15-20`

## File discovery, precedence, merges

Defaults are `compose.yaml` plus optional `compose.override.yaml`; more files come from `COMPOSE_FILE` or repeated `-f`, merged in command-line order. `pages/compose/how-tos/multiple-compose-files/merge.md:6-23` Example: `docker compose -f compose.yaml -f compose.admin.yaml run backup_db`. `pages/compose/how-tos/multiple-compose-files/merge.md:27-29`

All paths must be relative to the first `-f` file: overrides need not be valid standalone Compose files. `pages/compose/how-tos/multiple-compose-files/merge.md:67-72`

| Element | Merge rule |
|---|---|
| Mapping | Missing entries added; conflicts merged |
| Sequence | Overriding values appended |
| `command`, `entrypoint`, `healthcheck.test` | Last file wins |
| `volumes`, `secrets`, `configs` | Unique key `target` |
| `ports` | Key `{ip, target, published, protocol}` |

`pages/reference/compose-file/merge.md:17,47,79,105-115` `!reset` clears an attribute to its type default or `null`; `!override` replaces it, bypassing merge rules. `pages/reference/compose-file/merge.md:142-152,188-189`

## Interpolation

Both `$VAR` and `${VAR}` work. `pages/reference/compose-file/interpolation.md:8-9`

| Form | Result |
|---|---|
| `${VAR}` | Value |
| `${VAR:-d}` / `${VAR-d}` | Default if unset-or-empty / unset |
| `${VAR:?e}` / `${VAR?e}` | Error if unset-or-empty / unset |
| `${VAR:+r}` / `${VAR+r}` | Replacement if set-and-nonempty / set |

`pages/reference/compose-file/interpolation.md:13-24` Nesting is allowed; shell-style `${VAR/foo/bar}` is not. `pages/reference/compose-file/interpolation.md:26-33` Names match `[_a-zA-Z][_a-zA-Z0-9]*`; other `$` text is preserved. `pages/reference/compose-file/interpolation.md:35-37` `$$` yields a literal dollar and suppresses interpolation. `pages/reference/compose-file/interpolation.md:39-42` Unresolved variables without defaults warn and become empty strings. `pages/reference/compose-file/interpolation.md:50`

Interpolation applies to values, not keys: labels need `KEY=value` list syntax. `pages/reference/compose-file/interpolation.md:52-57,66-71` It runs per file before merging. `pages/reference/compose-file/interpolation.md:52-53`

## Environment sources

Interpolation precedence: shell, `--env-file`, then project `.env` (`--project-directory`, else first `-f` directory, else `PWD`). `pages/compose/how-tos/environment-variables/variable-interpolation.md:55-65` Without `--env-file`, up to two `.env` files may load; a `COMPOSE_FILE` redirect adds a lower-precedence second file. `pages/compose/how-tos/environment-variables/envvars-precedence.md:16-23`

Container environment precedence, high to low: `run -e`; interpolated `environment`/`env_file`; `environment`; `env_file`; image `ENV`. `pages/compose/how-tos/environment-variables/envvars-precedence.md:8-14` Image `ARG`/`ENV` applies only when no Compose entry exists for that name. `pages/compose/how-tos/environment-variables/envvars-precedence.md:13-14`

## Validation gate: `docker compose config`

It merges `-f` files, resolves variables, and expands compact notation into the canonical model. `pages/reference/cli/docker/compose/config.md:16-20` `-q` validates only; `--no-consistency` may yield invalid output; `--no-interpolate`, `--no-normalize`, `--no-path-resolution` skip stages. `pages/reference/cli/docker/compose/config.md:34-41` Selectors: `--services`, `--images`, `--networks`, `--volumes`, `--profiles`, `--hash`, `--environment`. `pages/reference/cli/docker/compose/config.md:27-45`

`docker compose config` is the inspection command; review its output before `up`/`create`, especially for remote or dependency-heavy files. `pages/compose/trust-model.md:50-66`


## Profiles, secrets, configs

Unprofiled services always run; a profiled service is ignored unless its profile is active or it is targeted explicitly (which activates it). `pages/reference/compose-file/profiles.md:4-10` Other top-level elements except `jobs` stay active; `links`/`extends`/`service:xxx` references to disabled services are errors. `pages/reference/compose-file/profiles.md:12-19`

Secrets use `file` or `environment` (latter unsupported by `docker stack deploy`), need explicit grants, and get `<project_name>_<key>` names. `pages/reference/compose-file/secrets.md:4-12,26-29` Configs mount as files (default `/<config-name>` on Linux), default to `0444`, accept `file`/`environment`/`content`/`external`, and `name` is not project-scoped. `pages/reference/compose-file/configs.md:8-27` Long syntax sets `uid`, `gid`, octal `mode` (writable bit ignored). `pages/reference/compose-file/services.md:321-328,2070-2077`

## Modularity

`extends` reuses one service from another file (base service is not deployed); in-file extends keep both services. `pages/compose/how-tos/multiple-compose-files/extends.md:43-44,80-82` Unsupported by `docker stack deploy`. `pages/compose/how-tos/multiple-compose-files/extends.md:23-27`

`include` loads each path as an independent model, copies resources, warns on conflicts without merging, and recurses; paths resolve against the included file. `pages/reference/compose-file/include.md:11-22,41-62` Long syntax: `path`, `project_directory`, `env_file`; local environment wins. `pages/reference/compose-file/include.md:64-115`

Anchors `&name`/aliases `*name` resolve before interpolation; `<<` merges mappings only. `pages/reference/compose-file/fragments.md:8-14,27,87-91` Top-level `x-` fields are the only silently ignored unknown fields. `pages/reference/compose-file/extension.md:8-17`

## Trust boundary

Compose files are trusted input: privileges are applied as written, so trust is about authorship, not location. `pages/compose/trust-model.md:4-13` Remote/chained `include` and `extends` can introduce hidden privileged settings. `pages/compose/trust-model.md:15-41` Watch `privileged`, `cap_add`, `security_opt`, bind mounts, `network_mode: host`, `pid: host`, `devices`, `image`, file-reading fields, `provider`. `pages/compose/trust-model.md:68-93` Pin remote references to digests; tags are mutable. `pages/compose/trust-model.md:105-116`

## Sources

- https://docs.docker.com/reference/compose-file/interpolation/
- https://docs.docker.com/reference/compose-file/merge/
- https://docs.docker.com/reference/compose-file/include/
- https://docs.docker.com/reference/compose-file/profiles/
- https://docs.docker.com/reference/compose-file/version-and-name/
- https://docs.docker.com/reference/compose-file/configs/
- https://docs.docker.com/reference/compose-file/secrets/
- https://docs.docker.com/compose/how-tos/project-name/
- https://docs.docker.com/compose/trust-model/
- https://docs.docker.com/reference/cli/docker/compose/config/
