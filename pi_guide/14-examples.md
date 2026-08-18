# Cookbook de Exemplos

Referencia categorizada dos exemplos praticos disponiveis em `packages/coding-agent/examples/`. Todos os caminhos sao relativos ao repositorio do PI.

## Extensoes por Categoria

### Guardrails e Seguranca

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/permission-gate.ts` | Bloqueia `rm -rf`, `sudo`, `chmod 777` com confirmacao | `tool_call` + `block: true` |
| `extensions/protected-paths.ts` | Bloqueia escrita em `.env`, `.git/`, `node_modules/` | `tool_call` em `write`/`edit` |
| `extensions/confirm-destructive.ts` | Confirma `/novo`, `/resume`, `/fork` | `session_before_switch` + `session_before_fork` |
| `extensions/dirty-repo-guard.ts` | Impede troca com alteracoes nao commitadas | `session_before_switch` + `git status` |
| `extensions/project-trust.ts` | Gerencia confianca de projeto | `project_trust` |
| `extensions/plan-mode/index.ts` | Modo read-only com allowlist de bash | `tool_call` + `setActiveTools` |

**Padrao comum:** Retornar `{ block: true, reason: "..." }` de `tool_call` para impedir execucao, ou `{ cancel: true }` de `session_before_switch`/`session_before_fork` para impedir troca.

### Ferramentas Interativas (UI)

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/question.ts` | Tool com lista de opcoes + editor inline | `ctx.ui.custom()` + `Editor` |
| `extensions/questionnaire.ts` | Multiplas perguntas com navegacao por tab | `ctx.ui.custom()` + tab bar |
| `extensions/todo.ts` | Lista de tarefas persistente via session entries | `pi.registerTool` + `details` + reconstrucao |
| `extensions/qna.ts` | Q&A interativo | `ctx.ui.custom()` |
| `extensions/timed-confirm.ts` | Confirmacao com timeout | `ctx.ui.confirm` + timer |

### Tools Customizadas

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/structured-output.ts` | Tool com `terminate: true` para finalizar sem turn extra | `terminate: true` |
| `extensions/dynamic-tools.ts` | Registra tools em runtime via comando | `pi.registerTool` + `pi.registerCommand` |
| `extensions/kimi-deferred-tools.ts` | Tools com carregamento deferido | `setActiveTools` |
| `extensions/built-in-tool-renderer.ts` | Customiza renderizacao de tools built-in | `renderCall`/`renderResult` |
| `extensions/tool-override.ts` | Sobrescreve tools existentes | `pi.registerTool` com mesmo nome |
| `extensions/truncated-tool.ts` | Tool com output truncado | `truncateHead`/`truncateTail` |

### Input e Transformacao

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/input-transform.ts` | Prefixo `?quick` e comandos instantaneos (`ping`, `time`) | `pi.on("input")` + `action: "transform"`/`"handled"` |
| `extensions/input-transform-streaming.ts` | Injeta git diff, pula durante steering | `event.streamingBehavior === "steer"` |
| `extensions/prompt-customizer.ts` | Modifica system prompt | `before_agent_start` + `systemPrompt` |
| `extensions/system-prompt-header.ts` | Adiciona header ao system prompt | `before_agent_start` |
| `extensions/inline-bash.ts` | Transforma input inline em bash | `pi.on("input")` |

### Compaction e Sessao

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/custom-compaction.ts` | Sumariza com Gemini Flash (modelo diferente) | `session_before_compact` + `ctx.modelRegistry.complete` |
| `extensions/trigger-compact.ts` | Dispara compactacao programatica | `ctx.compact()` |
| `extensions/session-name.ts` | Nomeia sessoes para o seletor | `pi.setSessionName` |
| `extensions/reload-runtime.ts` | Recarrega extensoes sem reiniciar | `ctx.reload()` + `sendUserMessage` |
| `extensions/handoff.ts` | Handoff entre sessoes | `session_before_switch` |

### Git e Workflow

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/git-checkpoint.ts` | Stash a cada turno, restaura no fork | `turn_start` + `session_before_fork` |
| `extensions/auto-commit-on-exit.ts` | Auto-commit no shutdown | `session_shutdown` + `git add -A` |
| `extensions/git-merge-and-resolve.ts` | Merge com resolucao | `tool_call` interceptando git |
| `extensions/github-issue-autocomplete.ts` | Autocomplete de issues GitHub | `pi.on("input")` + GitHub API |

### Subagentes

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/subagent/index.ts` | Delega tarefas a agentes isolados (single/parallel/chain) | `spawn` + `--mode json` |
| `extensions/subagent/agents/*.md` | Agentes prontos: scout, planner, reviewer, worker | Markdown com frontmatter |

**Modos do subagent:**
- **Single:** `{ agent: "scout", task: "encontre auth code" }`
- **Parallel:** `{ tasks: [{ agent: "scout", task: "..." }, ...] }` (max 8, 4 concorrentes)
- **Chain:** `{ chain: [{ agent: "scout", task: "..." }, { agent: "planner", task: "{previous}" }] }`

**Seguranca:** Agentes de projeto (`.pi/agents/*.md`) pedem confirmacao antes de rodar em repositorios nao confiaveis. Use `confirmProjectAgents: false` para desabilitar.

### UI Customizada

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/custom-footer.ts` | Rodape customizado | `ctx.ui.setWidget` |
| `extensions/custom-header.ts` | Cabecalho customizado | `ctx.ui.custom()` |
| `extensions/modal-editor.ts` | Modal com editor fullscreen | `ctx.ui.custom()` |
| `extensions/widget-placement.ts` | Posicionamento de widgets | `ctx.ui.setWidget` |
| `extensions/border-status-editor.ts` | Editor com borda e status | `ctx.ui.custom()` |
| `extensions/rainbow-editor.ts` | Editor com cores rainbow | `ctx.ui.custom()` |
| `extensions/snake.ts` / `space-invaders.ts` / `tic-tac-toe.ts` | Jogos no terminal | `ctx.ui.custom()` |
| `extensions/overlay-test.ts` / `doom-overlay/` | Overlays complexos | `ctx.ui.custom()` |

### Status e Notificacoes

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/notify.ts` | Notificacao nativa do terminal (OSC 777/99, Windows) | `agent_settled` + escape codes |
| `extensions/model-status.ts` | Mostra modelo na status bar | `model_select` + `ctx.ui.setStatus` |
| `extensions/working-indicator.ts` | Spinner customizado | `ctx.ui.setWorkingIndicator` |
| `extensions/status-line.ts` | Linha de status customizada | `ctx.ui.setStatus` |
| `extensions/titlebar-spinner.ts` | Spinner no titulo do terminal | escape codes |

### Eventos e Comunicacao

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/event-bus.ts` | Comunicacao entre extensoes via `pi.events` | `pi.events.emit`/`pi.events.on` |
| `extensions/commands.ts` | Registro de comandos | `pi.registerCommand` |
| `extensions/hidden-thinking-label.ts` | Label de thinking customizada | evento `thinking_label` |
| `extensions/message-renderer.ts` | Renderizacao customizada de mensagens | `message_render` |
| `extensions/entry-renderer.ts` | Renderizacao customizada de entradas | `entry_render` |

### Provedores e Modelos

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/custom-provider-anthropic/` | Provider Anthropic customizado com streaming | `pi.registerProvider` |
| `extensions/custom-provider-gitlab-duo/` | Provider GitLab Duo | `pi.registerProvider` |
| `extensions/provider-payload.ts` | Inspecao de payload do provider | `before_provider_request` |
| `extensions/preset.ts` | Presets de modelo/thinking | `pi.setModel` + `pi.setThinkingLevel` |

### Sandbox e Isolamento

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/gondolin/` | Sandbox via micro-VM Linux | Sobrescreve tools built-in |
| `extensions/sandbox/` | Sandbox baseado em filesystem | Filtragem de paths |
| `extensions/bash-spawn-hook.ts` | Hook de spawn do bash | `bash_spawn` |

### Integracoes Externas

| Arquivo | Descricao | Chave |
|---------|-----------|-------|
| `extensions/ssh.ts` | Integracao SSH | `pi.on("input")` |
| `extensions/file-trigger.ts` | Reage a mudancas em arquivos | `fs.watch` |
| `extensions/mac-system-theme.ts` | Sync com tema do macOS | `ctx.ui.theme` |
| `extensions/dynamic-resources/` | Descoberta dinamica de recursos | `resources_discover` |

## Exemplos SDK

| Arquivo | Descricao |
|---------|-----------|
| `sdk/01-minimal.ts` | Uso basico com todos os defaults |
| `sdk/02-custom-model.ts` | Selecao de modelo e thinking level |
| `sdk/03-custom-prompt.ts` | Substituicao/modificacao de system prompt |
| `sdk/04-skills.ts` | Descoberta e filtragem de skills |
| `sdk/05-tools.ts` | Allowlists de tools built-in |
| `sdk/06-extensions.ts` | Logging, blocking, modificacao de resultado |
| `sdk/07-context-files.ts` | Arquivos de contexto AGENTS.md |
| `sdk/08-prompt-templates.ts` | Slash commands de arquivo |
| `sdk/09-api-keys-and-oauth.ts` | Resolucao de API key e OAuth |
| `sdk/10-settings.ts` | Override de compaction, retry, terminal |
| `sdk/11-sessions.ts` | In-memory, persistente, continue, list |
| `sdk/12-full-control.ts` | Substitui tudo - sem discovery |
| `sdk/13-session-runtime.ts` | Gerenciamento de sessao via runtime |

## Exemplo RPC Completo

`rpc-extension-ui.ts` demonstra como construir um client TUI completo sobre o protocolo RPC:

- Spawning do agente em `--mode rpc`
- Tratamento de `extension_ui_request` (select, confirm, input, editor, notify, setStatus, setWidget)
- Streaming de `message_update` com `text_delta`
- Indicador de loading animado
- Dialogs que substituem o input durante interacao
- Slash commands locais (`/select`, `/confirm`, `/input`, `/editor`)

## Como Rodar os Exemplos

```bash
cd packages/coding-agent

# Extensao via CLI
npx tsx examples/extensions/hello.ts

# Extensao complexa (subagent com dependencias)
npx tsx examples/extensions/subagent/index.ts

# SDK
npx tsx examples/sdk/01-minimal.ts

# RPC UI
npx tsx examples/rpc-extension-ui.ts
```

## Padrões de Seguranca nos Exemplos

| Padrao | Exemplo | Descricao |
|--------|---------|-----------|
| Non-interactive fallback | `permission-gate.ts` | Sem UI, bloqueia por default |
| Confirmacao antes de acao | `confirm-destructive.ts` | `ctx.ui.select` antes de prosseguir |
| Blocklist de comandos | `plan-mode/utils.ts` | Regex de comandos destrutivos |
| Allowlist de comandos | `plan-mode/utils.ts` | Regex de comandos seguros |
| Trusted project check | `subagent/index.ts` | `ctx.isProjectTrusted()` + confirmacao |
| Signal propagation | `subagent/index.ts` | `signal.addEventListener("abort", ...)` |
| Temp file cleanup | `subagent/index.ts` | `finally { unlinkSync }` |
