---
name: pi-guide
description: Guia completo de como configurar, estender e controlar o agente PI. Cobertura total: providers, modelos, settings, extensoes TypeScript, skills, pacotes, temas, keybindings, SDK, RPC, seguranca e containerizacao. Use quando o usuario perguntar sobre configuracao, extensao, integracao ou uso avancado do PI.
---

# Guia Completo do PI Coding Agent

Referencia abrangente de configuracao, extensao e controle do PI.

## 1. Arquitetura

PI e um agente de terminal minimalista. O nucleo e pequeno; toda funcionalidade workflow-specific e construida via extensoes, skills, prompts e pacotes.

### Diretorios

| Escopo | Caminho | Conteudo |
|--------|---------|----------|
| Global | `~/.pi/agent/` | settings.json, auth.json, keybindings.json, models.json, trust.json |
| Global | `~/.pi/agent/extensions/` | Extensoes TypeScript globais |
| Global | `~/.pi/agent/skills/` | Skills globais |
| Global | `~/.pi/agent/prompts/` | Prompt templates globais |
| Global | `~/.pi/agent/themes/` | Temas globais |
| Global | `~/.pi/agent/sessions/` | Sessoes salvas |
| Projeto | `.pi/settings.json` | Config de projeto (deep-merged com global) |
| Projeto | `.pi/extensions/` | Extensoes de projeto |
| Projeto | `.pi/skills/` | Skills de projeto |
| Projeto | `.pi/prompts/` | Prompt templates de projeto |
| Projeto | `.pi/themes/` | Temas de projeto |
| Projeto | `AGENTS.md` | Instrucoes de contexto do projeto |

### Tools Built-in

`read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`

**PI nao inclui**: MCP, sub-agentes, popups de permissao, plan mode, to-dos, ou bash em background. Tudo isso e construido como extensao ou pacote.

---

## 2. Instalacao e Autenticacao

### Instalacao

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
# ou
curl -fsSL https://pi.dev/install.sh | sh
```

### Autenticacao (3 opcoes)

**Opcao 1 - Login por assinatura:**
```bash
pi
/login   # Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot, xAI, OpenRouter, Radius
```

**Opcao 2 - API keys (env vars):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GEMINI_API_KEY="..."
# + DEEPSEEK_API_KEY, NVIDIA_API_KEY, MISTRAL_API_KEY, GROQ_API_KEY,
#   CEREBRAS_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY, FIREWORKS_API_KEY,
#   TOGETHER_API_KEY, HF_TOKEN
```

**Opcao 3 - auth.json (precedencia sobre env vars):**
```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." }
}
```

Resolucao de chave: `--api-key` CLI > auth.json > env var > custom keys do models.json.

Chave suporta: shell commands (`"!command"`), interpolacao (`"$VAR"`), escape (`"$$"`, `"$!"`).

### Verificacao

```bash
pi --version
pi --help
pi --list-models
```

---

## 3. Providers

### Por Assinatura (via /login)

ChatGPT Plus/Pro, Claude Pro/Max, GitHub Copilot, xAI, OpenRouter, Radius

### Por API Key

| Provider | Variavel | auth.json key |
|----------|----------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic` |
| OpenAI | `OPENAI_API_KEY` | `openai` |
| Google Gemini | `GEMINI_API_KEY` | `google` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek` |
| NVIDIA | `NVIDIA_API_KEY` | `nvidia` |
| Mistral | `MISTRAL_API_KEY` | `mistral` |
| Groq | `GROQ_API_KEY` | `groq` |
| Cerebras | `CEREBRAS_API_KEY` | `cerebras` |
| xAI | `XAI_API_KEY` | `xai` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Hugging Face | `HF_TOKEN` | `huggingface` |

### Cloud Providers

**Azure OpenAI:**
`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT_NAME_MAP`

**Amazon Bedrock:**
`AWS_PROFILE` ou `AWS_ACCESS_KEY_ID`+`AWS_SECRET_ACCESS_KEY` ou `AWS_BEARER_TOKEN_BEDROCK`
Regiao default: `us-east-1`. Para proxy: `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`, `AWS_BEDROCK_SKIP_AUTH=1`.

**Google Vertex AI:**
`gcloud auth application-default login`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`

**Cloudflare:**
`CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_GATEWAY_ID`

### llama.cpp

```bash
llama-server --models-dir ~/models --no-models-autoload --jinja --host 127.0.0.1 --port 8080 -ngl 999 -c 32768
/login llama.cpp
# ou: LLAMA_BASE_URL=http://127.0.0.1:8080
```

### Provider Customizado via models.json

```json
{
  "providers": {
    "meu-proxy": {
      "baseUrl": "https://proxy.example.com",
      "api": "openai-completions",
      "apiKey": "$MEU_API_KEY",
      "models": [{
        "id": "meu-modelo",
        "name": "Meu Modelo",
        "reasoning": false,
        "input": ["text"],
        "contextWindow": 128000,
        "maxTokens": 16384,
        "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
      }]
    }
  }
}
```

APIs suportadas: `openai-completions` (mais compativel), `openai-responses`, `anthropic-messages`, `google-generative-ai`.

---

## 4. Modelos

### Configuracao do models.json

**Campos do modelo:**

| Campo | Obrigatorio | Default | Descricao |
|-------|-------------|---------|-----------|
| `id` | Sim | - | Identificador do modelo |
| `name` | Nao | `id` | Label legivel |
| `reasoning` | Nao | `false` | Suporte a extended thinking |
| `input` | Nao | `["text"]` | Tipos: `["text"]` ou `["text", "image"]` |
| `contextWindow` | Nao | `128000` | Tamanho do contexto |
| `maxTokens` | Nao | `16384` | Max tokens de saida |
| `cost` | Nao | zeros | Taxas por milhao de tokens |
| `compat` | Nao | provider compat | Overrides de compatibilidade |

**thinkingLevelMap:** Mapeia niveis do PI para valores do provider. Valores podem ser string ou `null` (nivel nao suportado).

**modelOverrides:** Customiza modelos built-in sem redefinir a lista completa. Exemplo: roteamento via OpenRouter.

### Compatibilidade

**OpenAI:** `supportsStore`, `supportsDeveloperRole`, `supportsReasoningEffort`, `supportsUsageInStreaming`, `maxTokensField`, `thinkingFormat` (valores: `reasoning_effort`, `openrouter`, `deepseek`, `together`, `baseten`, `zai`, `qwen`, `chat-template`, `qwen-chat-template`)

**Anthropic:** `supportsEagerToolInputStreaming`, `supportsLongCacheRetention`, `forceAdaptiveThinking`, `allowEmptySignature`, `supportsStrictTools`

---

## 5. Settings (settings.json)

### Localizacao

Global: `~/.pi/agent/settings.json`
Projeto: `.pi/settings.json` (deep-merged com global)

### Configuracoes Principais

**Modelo e Thinking:**
```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "thinkingBudgets": { "minimal": 1024, "low": 4096, "medium": 10240, "high": 32768 }
}
```

**UI:**
```json
{
  "theme": "dark",
  "tuiMode": "regular",
  "quietStartup": false,
  "editorPaddingX": 0
}
```

**Compaction:**
```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

**Retry:**
```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "provider": { "timeoutMs": 3600000, "maxRetries": 0 }
  }
}
```

**Tools:**
```json
{
  "defaultTools": ["bash", "edit", "write"]
}
```
Array vazio = sem tools built-in, mantem extensoes e tools do SDK.

**Entrega de Mensagens:**
```json
{
  "steeringMode": "one-at-a-time",
  "followUpMode": "one-at-a-time"
}
```

**Shell:**
```json
{
  "shellPath": "/bin/bash",
  "shellCommandPrefix": "shopt -s expand_aliases"
}
```

### Project Trust

```json
{
  "defaultProjectTrust": "ask"
}
```
Valores: `"ask"` (default), `"always"`, `"never"`. CLI: `--approve`/`-a`, `--no-approve`/`-na`.

Projetos confiaveis permitem: `.pi/settings.json`, `.pi` resources, extensoes de projeto.

---

## 6. Sessoes

### Armazenamento

Salvas automaticamente em `~/.pi/agent/sessions/`, organizadas por diretorio de trabalho. Formato JSONL com estrutura de arvore.

### Comandos

```bash
pi -c                          # Continuar ultima sessao
pi -r                          # Selecionar sessao
pi --session <path>            # Sessao especifica
pi --fork <entry-id>           # Fork de uma entrada
pi --no-session                # Sessao efemera
pi --name "nome"               # Nomear sessao
```

### Navegacao na Arvore (`/tree`)

Cada entrada tem `id` e `parentId`. Posicao atual e a folha ativa.

| Tecla | Acao |
|-------|------|
| Up/Down | Navegar entradas |
| Left/Right | Pagina |
| Ctrl+Left/Right | Fold/unfold ou saltar entre segmentos |
| Shift+L | Label |
| Enter | Selecionar (user message = editar e reenviar; assistant = continuar) |
| Escape | Cancelar |

### Compactacao

Disparada quando `contextTokens > contextWindow - reserveTokens`.

`/compact [instrucoes]` para manual. Desabilitar: `"compaction": { "enabled": false }`.

---

## 7. Extensoes TypeScript

### Localizacao

- Global: `~/.pi/agent/extensions/*.ts` ou `*/index.ts`
- Projeto: `.pi/extensions/*.ts` ou `*/index.ts`
- Settings: `"extensions": ["/path/to/ext.ts"]`
- CLI: `pi -e ./ext.ts` (testing)

### Estrutura

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // Eventos
  pi.on("session_start", async (event, ctx) => { });
  pi.on("tool_call", async (event, ctx) => { });
  pi.on("input", async (event, ctx) => { });
  pi.on("before_agent_start", async (event, ctx) => { });

  // Tools
  pi.registerTool({ name: "my_tool", label: "...", description: "...", parameters: Type.Object({...}), execute: async () => ({...}) });

  // Comandos
  pi.registerCommand("cmd", { description: "...", handler: async (args, ctx) => { } });

  // Atalhos
  pi.registerShortcut("ctrl+alt+p", { description: "...", handler: async (ctx) => { } });

  // Flags
  pi.registerFlag("flag", { description: "...", type: "boolean", default: false });

  // Providers
  pi.registerProvider("name", { baseUrl: "...", api: "openai-completions", models: [...] });
}
```

### Ciclo de Vida (ordem)

```
pi inicia -> project_trust -> session_start -> resources_discover
usuario envia -> input -> before_agent_start -> agent_start
turno -> turn_start -> context -> provider -> tool_call -> tool_result -> turn_end
fim -> agent_end -> agent_settled
troca -> session_before_switch -> session_shutdown -> session_start
compact -> session_before_compact -> session_compact
```

### Eventos Chave

| Evento | Retorno | Descricao |
|--------|---------|-----------|
| `input` | `{ action: "handled" }` / `{ action: "transform", text }` / `{ action: "continue" }` | Intercepta/transforma input |
| `before_agent_start` | `{ message: {...}, systemPrompt: "..." }` | Injeta contexto ou modifica prompt |
| `tool_call` | `{ block: true, reason: "..." }` | Bloqueia execucao de tool |
| `tool_result` | `{ content: [...], details: {...} }` | Modifica resultado |
| `session_before_switch` | `{ cancel: true }` | Cancela troca de sessao |
| `session_before_compact` | `{ compaction: {...} }` | Customiza compactacao |

### Regras de Tools

- Use `StringEnum` de `@earendil-works/pi-ai` para enums (NAO `Type.Union`/`Type.Literal`)
- Use `withFileMutationQueue()` para tools que mutam arquivos
- Trunque output para 50KB / 2000 linhas
- Use `throw new Error(...)` para erros
- `promptGuidelines` deve nomear a tool explicitamente
- `terminate: true` finaliza turno sem turn extra do LLM

### API do pi

| Metodo | Descricao |
|--------|-----------|
| `pi.on(event, handler)` | Inscrever em eventos |
| `pi.registerTool(def)` | Registrar tool |
| `pi.registerCommand(name, opts)` | Registrar comando |
| `pi.registerShortcut(key, opts)` | Registrar atalho |
| `pi.registerFlag(name, opts)` | Registrar flag |
| `pi.registerProvider(name, config)` | Registrar provider |
| `pi.sendMessage(msg, opts)` | Injetar mensagem |
| `pi.sendUserMessage(content, opts)` | Enviar msg do usuario |
| `pi.appendEntry(type, data)` | Persistir dados |
| `pi.setSessionName(name)` | Nomear sessao |
| `pi.setModel(model)` / `pi.setThinkingLevel(level)` | Trocar modelo/thinking |
| `pi.getActiveTools()` / `pi.setActiveTools(names)` | Gerenciar tools ativas |
| `pi.exec(cmd, args, opts)` | Executar shell |
| `pi.events` | Event bus entre extensoes |

### ctx (ExtensionContext)

| Prop | Descricao |
|------|-----------|
| `ctx.ui` | Metodos de UI (notify, select, confirm, input, editor, custom, setStatus, setWidget, setWorkingIndicator) |
| `ctx.mode` | `"tui"`, `"rpc"`, `"json"`, `"print"` |
| `ctx.hasUI` | true se TUI ou RPC |
| `ctx.cwd` | Diretorio de trabalho |
| `ctx.isProjectTrusted()` | Se projeto e confiavel |
| `ctx.sessionManager` | Acesso read-only ao estado da sessao |
| `ctx.model` | Modelo ativo |
| `ctx.thinkingLevel` | Nivel de thinking |
| `ctx.signal` | AbortSignal |
| `ctx.compact()` | Disparar compactacao |
| `ctx.getSystemPrompt()` | Obter system prompt |

### ctx em Comandos (ExtensionCommandContext)

| Metodo | Descricao |
|--------|-----------|
| `ctx.waitForIdle()` | Aguardar agente ocioso |
| `ctx.newSession(opts)` | Criar sessao |
| `ctx.fork(entryId, opts)` | Fork |
| `ctx.reload()` | Recarregar extensoes/skills/prompts/temas |

---

## 8. Padroes de Guardrails

### Bloquear comandos perigosos

```typescript
const dangerousPatterns = [/\brm\s+(-rf?|--recursive)/i, /\bsudo\b/i];
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "bash") return;
  if (dangerousPatterns.some(p => p.test(event.input.command as string))) {
    if (!ctx.hasUI) return { block: true, reason: "Sem UI" };
    const ok = await ctx.ui.select(`Perigoso: ${event.input.command}`, ["Sim", "Nao"]);
    if (ok !== "Sim") return { block: true, reason: "Bloqueado" };
  }
});
```

### Proteger caminhos

```typescript
const protected = [".env", ".git/", "node_modules/"];
pi.on("tool_call", async (event) => {
  if (event.toolName !== "write" && event.toolName !== "edit") return;
  if (protected.some(p => (event.input.path as string).includes(p)))
    return { block: true, reason: "Path protegido" };
});
```

### Confirmar acoes destrutivas

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  if (event.reason === "new") {
    const ok = await ctx.ui.confirm("Limpar?", "Apagara tudo");
    if (!ok) return { cancel: true };
  }
});
```

### Plan Mode com allowlist

```typescript
const SAFE = [/^\s*cat\b/, /^\s*grep\b/, /^\s*git\s+(status|log|diff)/i];
pi.on("tool_call", async (event) => {
  if (planModeEnabled && event.toolName === "bash") {
    if (!SAFE.some(p => p.test(event.input.command as string)))
      return { block: true, reason: "Plan mode" };
  }
});
```

---

## 9. Padroes Praticos

### Estado via session entries

Armazene estado nas `details` dos tool results. Fork restaura automaticamente.

### Input transform

```typescript
pi.on("input", async (event, ctx) => {
  if (event.source === "extension") return { action: "continue" };
  if (event.text.startsWith("?quick "))
    return { action: "transform", text: `Responda brevemente: ${event.text.slice(7)}` };
  return { action: "continue" };
});
```

### Compaction customizada

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const model = ctx.modelRegistry.find("google", "gemini-2.5-flash");
  const response = await ctx.modelRegistry.complete(model, { messages: [...] }, { maxTokens: 8192 });
  return { compaction: { summary, firstKeptEntryId, tokensBefore } };
});
```

### Dynamic tool loading

```typescript
pi.on("session_start", () => {
  const base = pi.getActiveTools().filter(n => !SEARCHABLE.has(n));
  pi.setActiveTools([...base, "search_tools"]);
});
```

### Event bus

```typescript
pi.events.emit("deploy:ready", { version: "1.0" });
pi.events.on("deploy:ready", (data) => { ... });
```

### Git checkpoint

```typescript
pi.on("turn_start", async () => {
  const { stdout } = await pi.exec("git", ["stash", "create"]);
  if (stdout.trim()) checkpoints.set(currentEntryId, stdout.trim());
});
pi.on("session_before_fork", async (event) => {
  const ref = checkpoints.get(event.entryId);
  if (ref) await pi.exec("git", ["stash", "apply", ref]);
});
```

### Notificacao nativa

```typescript
pi.on("agent_settled", () => {
  process.stdout.write(`\x1b]777;notify;Pi;Pronto\x07`);
});
```

---

## 10. Skills

### Localizacao

- Global: `~/.pi/agent/skills/`, `~/.agents/skills/`
- Projeto (apos confianca): `.pi/skills/`, `.agents/skills/`
- Settings: `"skills": ["~/.claude/skills"]`
- CLI: `pi --skill <path>`, `pi --no-skills`

### Como Funciona

1. PI escaneia e extrai nomes/descricoes
2. System prompt inclui skills disponiveis em XML
3. Quando tarefa corresponde, agente carrega SKILL.md completo via `read`

Progressive disclosure: descricoes sempre no contexto, instrucoes completas sob demanda.

### SKILL.md

```markdown
---
name: minha-skill
description: O que faz e quando usar. Seja especifico.
license: MIT
compatibility: Node.js >= 18
allowed-tools: read, bash
---

# Minha Skill

## Setup
```bash
cd /path/to/skill && npm install
```

## Uso
```bash
./scripts/process.sh <input>
```
```

### Regras de Nome

1-64 caracteres, lowercase a-z, 0-9, hifens. Sem hifens no inicio/fim, sem consecutivos.

### Comandos

```bash
/skill:brave-search           # Carregar e executar
/skill:pdf-tools extrair      # Com argumentos
```

---

## 11. Pacotes PI

### Gerenciamento

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install /path/to/package
pi remove npm:@foo/bar
pi list
pi update --all
pi config                     # Habilitar/desabilitar recursos
```

`-l` para settings de projeto. Testar sem instalar: `pi -e npm:@foo/bar`.

### Criar Pacote

```json
{
  "name": "meu-pacote",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

### Filtragem

```json
{
  "packages": [{
    "source": "npm:my-package",
    "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
    "skills": [],
    "themes": ["+themes/force.json"]
  }]
}
```

---

## 12. Customizacao

### Temas

- Built-in: `dark`, `light`
- Global: `~/.pi/agent/themes/*.json`
- Hot reload ao editar

**51 tokens de cor** disponiveis: UI (accent, border, success, error...), tools, markdown, diff, syntax highlighting, thinking levels.

Formatos: hex `"#ff0000"`, 256-color `39`, variavel `"primary"`, default `""`.

### Prompt Templates

- Global: `~/.pi/agent/prompts/*.md`
- Nome do arquivo = comando: `review.md` -> `/review`
- Argumentos: `$1`, `$2`, `$@`, `${1:-default}`, `${@:N}`, `${@:N:L}`
- `argument-hint` no frontmatter

### Keybindings

Config: `~/.pi/agent/keybindings.json`

| Acao | Default | Descricao |
|------|---------|-----------|
| `app.interrupt` | `escape` | Cancelar |
| `app.clear` | `ctrl+c` | Limpar/sair |
| `app.editor.external` | `ctrl+g` | Editor externo |
| `app.model.select` | `ctrl+l` | Seletor de modelo |
| `app.model.cycleForward` | `ctrl+p` | Ciclar modelo |
| `app.thinking.cycle` | `shift+tab` | Ciclar thinking |
| `app.tools.expand` | `ctrl+o` | Expandir tool output |
| `app.message.copy` | `ctrl+x` | Copiar ultima msg |
| `app.message.followUp` | `alt+enter` | Enfileirar follow-up |
| `tui.input.submit` | `enter` | Enviar |
| `tui.input.newLine` | `shift+enter` | Nova linha |

---

## 13. SDK (Node.js)

```bash
npm install @earendil-works/pi-coding-agent
```

### Basico

```typescript
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({ sessionManager: SessionManager.inMemory(), modelRuntime });
session.subscribe((event) => { if (event.type === "message_update") process.stdout.write(event.assistantMessageEvent.delta); });
await session.prompt("Ola");
session.dispose();
```

### Tool Allowlists

```typescript
const { session } = await createAgentSession({ tools: ["read", "grep", "find", "ls"] });
```

### Full Control

```typescript
const { session } = await createAgentSession({
  model, thinkingLevel: "off", modelRuntime, resourceLoader, tools: ["read", "bash"],
  sessionManager: SessionManager.inMemory(), settingsManager: SettingsManager.inMemory(),
});
```

### Session Runtime

```typescript
const runtime = await createAgentSessionRuntime(createRuntime, { cwd, agentDir, sessionManager });
await runtime.newSession();
await runtime.switchSession("/path/to/session.jsonl");
await runtime.fork("entry-id");
```

---

## 14. RPC Mode

```bash
pi --mode rpc [opcoes]
```

### Comandos (JSON no stdin)

```json
{"type": "prompt", "message": "Ola"}
{"type": "steer", "message": "Correcao"}
{"type": "follow_up", "message": "Apos terminar"}
{"type": "abort"}
{"type": "get_state"}
{"type": "set_model", "model": "anthropic/claude-sonnet-4-5"}
{"type": "new_session"}
```

### Eventos (JSON no stdout)

`agent_start`, `turn_start`, `message_start`, `message_update` (delta), `message_end`, `turn_end`, `tool_execution_start`, `tool_execution_end`, `agent_end`, `extension_ui_request`

### Framing

JSONL com LF (`\n`) como unico delimitador. **NAO use `readline` do Node** (split em U+2028/U+2029).

---

## 15. Seguranca

### Modelo de Seguranca

- **NAO existe sandbox built-in**. Extensions e tools rodam com permissoes completas do usuario
- **Project trust** controla carregamento de recursos, NAO restringe tools
- Para confianca limitada: container/Gondolin/Docker/OpenShell

### Containerizacao

**Gondolin** (micro-VM local):
```bash
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin && npm install --ignore-scripts
cd /path/to/project && pi -e ~/.pi/agent/extensions/gondolin
```

**Docker:**
```bash
docker run --rm -it -e ANTHROPIC_API_KEY -v "$PWD:/workspace" pi-sandbox
```

---

## 16. Variaveis de Ambiente

### Marcador de Processo

`AI_AGENT=pi`, `PI_CODING_AGENT=true` (herdadas por filhos)

### Bash Tool

| Variavel | Descricao |
|----------|-----------|
| `PI_SESSION_ID` | ID da sessao |
| `PI_SESSION_FILE` | Caminho do JSONL |
| `PI_PROVIDER` | Provider selecionado |
| `PI_MODEL` | Modelo selecionado |
| `PI_REASONING_LEVEL` | Nivel efetivo |

### Config PI

| Variavel | Descricao |
|----------|-----------|
| `PI_CODING_AGENT_DIR` | Override dir config |
| `PI_CODING_AGENT_SESSION_DIR` | Override sessoes |
| `PI_OFFLINE` | Desabilita rede |
| `PI_SKIP_VERSION_CHECK` | Sem check de versao |
| `PI_TELEMETRY` | Override telemetria |
| `PI_TUI_ESC_TIMEOUT` | Timeout ESC (ms) |
| `HTTP_PROXY` / `HTTPS_PROXY` | Proxy |

---

## 17. Exemplos Disponiveis

### Por Categoria

| Categoria | Exemplos Chave |
|-----------|----------------|
| Guardrails | `permission-gate.ts`, `protected-paths.ts`, `confirm-destructive.ts`, `dirty-repo-guard.ts`, `plan-mode/` |
| Tools interativas | `question.ts`, `questionnaire.ts`, `todo.ts` |
| Tools customizadas | `structured-output.ts` (terminate:true), `dynamic-tools.ts`, `tool-override.ts` |
| Input | `input-transform.ts`, `input-transform-streaming.ts`, `inline-bash.ts` |
| Compaction | `custom-compaction.ts`, `trigger-compact.ts` |
| Git | `git-checkpoint.ts`, `auto-commit-on-exit.ts` |
| Subagentes | `subagent/` (single, parallel, chain) |
| UI customizada | `custom-footer.ts`, `modal-editor.ts`, `snake.ts` |
| Status | `notify.ts`, `model-status.ts`, `working-indicator.ts` |
| Providers | `custom-provider-anthropic/`, `custom-provider-gitlab-duo/` |
| Sandbox | `gondolin/`, `sandbox/` |

### Como Rodar

```bash
cd packages/coding-agent
npx tsx examples/extensions/hello.ts
npx tsx examples/sdk/01-minimal.ts
npx tsx examples/rpc-extension-ui.ts
```
