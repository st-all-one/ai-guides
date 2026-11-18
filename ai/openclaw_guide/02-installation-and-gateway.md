# 02 - Installation and gateway operations

Onboarding ends with a running Gateway, auth and chat (`pages/start/getting-started.md:9-11`). Every mode runs one Gateway owning channels, sessions and credentials (`pages/concepts/architecture.md:10-17`).

## Deployment modes

| Mode | Entry / artifact | State and supervision | Evidence |
|---|---|---|---|
| Install script | `install.sh` (macOS/Linux/WSL), `install.ps1` (Windows); npm default or git build | Default `~/.openclaw`; onboarding may install a daemon | `pages/install/installer.md:95-121`, `165-175` |
| Published package | `npm install -g openclaw@latest`, Node 24.16.0+/26.1.0+ | `openclaw gateway install` | `repo/README.md:38-42` |
| Bun runtime | `install.sh --runtime bun`; pinned fork in `~/.openclaw/tools/bun-<tag>/bun` | Same config/state; service re-pin leaves state untouched | `pages/install/installer.md:184-203` |
| Standalone | Bun-built executable + `runtime/` + `manifest.json` | Sidecar must stay with binary; packaging artifact | `pages/install/standalone.md:10-13`, `68-78` |
| Docker / Compose | `openclaw:local`, GHCR or Docker Hub; `scripts/docker/setup.sh` | Mounted volumes, one replica per volume; entrypoint runs Doctor | `pages/install/docker.md:33-47`, `264-287` |
| Cloud host | `fly deploy`, Render Blueprint, Boat VM + installer | Persistent `OPENCLAW_STATE_DIR` volume; platform process manager | `pages/install/fly.md:18-24`; `pages/install/render.md:9-20`; `pages/install/boat.md:21-54` |
| Cloud workers | Gateway dispatches to disposable machines | Transcript/workspace stay on Gateway; not a Gateway deployment | `pages/gateway/cloud-workers.md:10`, `59-67` |

## Install paths

- `npx openclaw@latest` reuses a Claude Code/Codex login or API key; background install copies that version under `~/.openclaw` (`pages/start/getting-started.md:25-41`).
- `curl -fsSL https://openclaw.ai/install.sh | bash` checks Node/SQLite, installs Git if missing, then npm or git (`pages/start/getting-started.md:54-57`; `pages/install/installer.md:144-175`).
- Standalone: JIT default, `--bytecode`, experimental `--compile-aot` / `--aot-source`; build on the target platform (`pages/install/standalone.md:37-41`, `85-92`).
- Docker needs Compose v2 and 6 GB RAM for a local build; setup writes a token to `.env` and starts Compose (`pages/install/docker.md:16-21`, `66-79`).

## Service management and supervision

| Task | Command / mechanism | Evidence |
|---|---|---|
| Lifecycle | `openclaw gateway install`, `start`, `stop`, `restart`, `uninstall` | `pages/cli/gateway/service.md:13-21` |
| Discovery | `openclaw gateway status`, `status --deep`, `status --json`, `openclaw gateway probe` | `pages/gateway.md:161-192` |
| macOS | LaunchAgent `ai.openclaw.gateway` or `ai.openclaw.<profile>`; `stop --disable` suppresses respawn | `pages/gateway.md:249-255` |
| Linux | `systemctl --user enable --now openclaw-gateway[-<profile>].service`; `sudo loginctl enable-linger $(whoami)` | `pages/gateway.md:276-290` |
| Restart policy | `Restart=always`, `RestartSec=5`, `RestartPreventExitStatus=78` | `pages/gateway.md:304-329` |

Use `gateway restart`, not chained `stop` + `start`; Linux stop suppresses `Restart=always` until restart (`pages/gateway.md:249`; `pages/cli/gateway/service.md:120-125`). From `npx`, the service runs `~/.openclaw/npm` (`pages/cli/gateway/service.md:23-38`). Status separates process state from readiness (`pages/gateway.md:80-83`).

## Configuration, environment and includes

Config is JSON5 at `~/.openclaw/openclaw.json`; missing means safe defaults (`pages/gateway/configuration.md:10-12`).

`repo/src/config/paths.ts:236-246`:
```ts
export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir?: string,
  homedir: () => string = envHomedir(env),
): string {
  const override = env.OPENCLAW_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override, env, homedir);
  }
  return path.join(stateDir ?? resolveStateDir(env, homedir), CONFIG_FILENAME);
}
```

- Edit via `openclaw onboard`, `openclaw configure`, `config get|set|unset`, UI or direct file with hot reload (`pages/gateway/configuration.md:43-75`).
- Strict validation refuses unknown keys at startup; `doctor --fix` repairs legacy keys; invalid reload keeps the last config (`pages/gateway/configuration.md:78-82`, `102-118`).
- Env sources: parent, `.env` in CWD, `~/.openclaw/.env`; neither overrides existing vars; `env.vars` adds values (`pages/gateway/configuration/environment-variables.md:13-29`).
- `${VAR}` matches `[A-Z_][A-Z0-9_]*`, leaves missing unresolved, escapes as `$${VAR}`, works in `$include`; SecretRefs: `env`, `file`, `exec`, `store` (`pages/gateway/configuration/environment-variables.md:45-99`).
- Recipes: `channels.<provider>` with `dmPolicy`, `agents.defaults.model.primary`/`fallbacks`, `agents.defaults.modelPolicy.allow` (`pages/gateway/configuration/common-tasks.md:14-82`).
- `$include` replaces or deep-merges arrays (later wins, 10 levels); sibling keys override; paths stay under config dir unless `OPENCLAW_INCLUDE_ROOTS` allows more (`pages/gateway/configuration/common-tasks.md:394-447`).

## Multi-gateway profiles

Profiles isolate Gateways (`pages/gateway/multiple-gateways.md:10`); `rescue` gets own config, state, workspace, service, port and token (`pages/gateway/multiple-gateways.md:22-48`). Keep `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`, `agents.defaults.workspace`, `gateway.port` unique (`pages/gateway/multiple-gateways.md:85-103`).

Derived (`derived` from `pages/gateway/multiple-gateways.md:105-114`): sandbox `+1`, browser `+2`, CDP `+9` to `+108`; widgets share the port. Check via `gateway status --deep` / `gateway probe` (`pages/gateway/multiple-gateways.md:135-148`); set modes with `openclaw configure --section gateway --section daemon` (`pages/cli/configure.md:26-38`).

## Operational checklist

1. Before change: `openclaw backup create --output ~/Backups/openclaw --verify` (`pages/install/backups.md:79-92`).
2. Managed update: `openclaw update` stages while the old Gateway serves, then verifies (`pages/install/updating.md:1158-1179`).
3. Manual update: `openclaw doctor`, `openclaw gateway restart`, `openclaw health` (`pages/install/updating.md:2614-2627`, `2693-2703`).
4. Compose: `docker compose pull openclaw-gateway openclaw-cli`, `docker compose stop openclaw-gateway`, `docker compose up -d openclaw-gateway`; one replica per volume (`pages/install/docker.md:272-281`).
5. Schedule: `openclaw backup enable --to offsite --every 24h --keep-daily 7 --keep-weekly 4 --keep-monthly 12` (`pages/install/backups.md:181-195`).
6. Restore into a fresh empty target only: `openclaw backup restore "$ARCHIVE" --target ./restored-openclaw`; no force/in-place mode (`pages/install/backups.md:497-528`).
7. Diagnose with `openclaw doctor` (recovery, lint, migrations, SQLite) (`pages/cli/doctor.md:9-11`, `43-56`).

## Sources

- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/install/installer
- https://docs.openclaw.ai/install/standalone
- https://docs.openclaw.ai/install/docker
- https://docs.openclaw.ai/install/updating
- https://docs.openclaw.ai/install/backups
- https://docs.openclaw.ai/gateway
- https://docs.openclaw.ai/gateway/configuration
- https://docs.openclaw.ai/gateway/configuration/environment-variables
- https://docs.openclaw.ai/gateway/configuration/common-tasks
- https://docs.openclaw.ai/gateway/multiple-gateways
- https://docs.openclaw.ai/gateway/cloud-workers
- https://docs.openclaw.ai/cli/gateway/service
- https://docs.openclaw.ai/cli/doctor
