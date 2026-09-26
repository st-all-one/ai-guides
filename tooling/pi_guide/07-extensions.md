# Extensoes TypeScript

Extensoes sao modulos TypeScript que estendem o comportamento do PI. Elas podem se inscrever em eventos de lifecycle, registrar ferramentas customizadas chamaveis pelo LLM, adicionar comandos e mais.

> **Seguranca:** Extensoes rodam com permissoes completas do sistema e podem executar codigo arbitrario. Instale apenas de fontes confiaveis.

## Quick Start

Crie `~/.pi/agent/extensions/my-extension.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extensao carregada!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Perigoso!", "Permitir rm -rf?");
      if (!ok) return { block: true, reason: "Bloqueado pelo usuario" };
    }
  });

  pi.registerTool({
    name: "greet",
    label: "Saudar",
    description: "Sauda alguem pelo nome",
    parameters: Type.Object({
      name: Type.String({ description: "Nome para saudar" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Ola, ${params.name}!` }],
        details: {},
      };
    },
  });

  pi.registerCommand("hello", {
    description: "Dizer ola",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Ola ${args || "mundo"}!`, "info");
    },
  });
}
```

Teste com:

```bash
pi -e ./my-extension.ts
```

## Localizacao das Extensoes

| Local | Escopo |
|-------|--------|
| `~/.pi/agent/extensions/*.ts` | Global |
| `~/.pi/agent/extensions/*/index.ts` | Global (subdiretorio) |
| `.pi/extensions/*.ts` | Projeto-local |
| `.pi/extensions/*/index.ts` | Projeto-local |

Via settings.json:

```json
{
  "extensions": ["/path/to/extension.ts", "/path/to/extension/dir"]
}
```

## Imports Disponiveis

| Pacote | Uso |
|--------|-----|
| `@earendil-works/pi-coding-agent` | Tipos (`ExtensionAPI`, eventos) |
| `typebox` | Schema definitions para parametros de tool |
| `@earendil-works/pi-ai` | Utilitarios AI (`StringEnum`) |
| `@earendil-works/pi-tui` | Componentes TUI |
| `node:fs`, `node:path` etc | Built-ins do Node.js |

Extensoes com `package.json` own resolvem imports de `node_modules/` automaticamente.

## Estilos de Extensoes

### Arquivo unico

```
~/.pi/agent/extensions/
└── my-extension.ts
```

### Diretorio com index.ts

```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts
    ├── tools.ts
    └── utils.ts
```

### Pacote com dependencias

```
~/.pi/agent/extensions/
└── my-extension/
    ├── package.json
    ├── package-lock.json
    ├── node_modules/
    └── src/
        └── index.ts
```

```json
{
  "name": "my-extension",
  "dependencies": { "zod": "^3.0.0" },
  "pi": { "extensions": ["./src/index.ts"] }
}
```

## Ciclo de Vida e Eventos

```
pi inicia
  ├─► project_trust (extensoes user/global apenas)
  ├─► session_start { reason: "startup" }
  └─► resources_discover

usuario envia prompt
  ├─► input (pode interceptar/transformar)
  ├─► before_agent_start (pode injetar mensagem/modificar system prompt)
  ├─► agent_start
  ├─► message_start / message_update / message_end
  │
  │   ┌─── turn (repete enquanto LLM chama tools) ───┐
  │   │  turn_start                                  │
  │   │  context (pode modificar mensagens)          │
  │   │  before_provider_headers                     │
  │   │  before_provider_request                     │
  │   │  after_provider_response                     │
  │   │                                              │
  │   │  LLM responde, pode chamar tools:            │
  │   │    tool_execution_start                      │
  │   │    tool_call (pode bloquear)                 │
  │   │    tool_execution_update                     │
  │   │    tool_result (pode modificar)              │
  │   │    tool_execution_end                        │
  │   │                                              │
  │   └─► turn_end                                   │
  │
  ├─► agent_end
  └─► agent_settled

/novo ou /resume
  ├─► session_before_switch (pode cancelar)
  ├─► session_shutdown
  ├─► session_start { reason: "new" | "resume" }
  └─► resources_discover

/compact
  ├─► session_before_compact (pode cancelar/customizar)
  ├─► session_compact
  └─► session_compact_failed
```

## Eventos Principais

### session_start

```typescript
pi.on("session_start", async (event, ctx) => {
  // event.reason - "startup" | "reload" | "new" | "resume" | "fork"
  ctx.ui.notify(`Sessao: ${ctx.sessionManager.getSessionFile()}`, "info");
});
```

### before_agent_start

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  return {
    message: {
      customType: "my-extension",
      content: "Contexto adicional para o LLM",
      display: true,
    },
    systemPrompt: event.systemPrompt + "\n\nInstrucoes extras...",
  };
});
```

### tool_call (pode bloquear)

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  if (isToolCallEventType("bash", event)) {
    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Comando perigoso", terminate: true };
    }
  }
});
```

### tool_result (pode modificar)

```typescript
pi.on("tool_result", async (event, ctx) => {
  return { content: [...], details: {...}, isError: false };
});
```

### input (pode interceptar)

```typescript
pi.on("input", async (event, ctx) => {
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }
  return { action: "continue" };
});
```

## Ferramentas Customizadas

```typescript
pi.registerTool({
  name: "minha_tool",
  label: "Minha Tool",
  description: "O que esta tool faz",
  promptSnippet: "Resumo curto para o system prompt",
  promptGuidelines: ["Use minha_tool quando o usuario pedir X"],
  parameters: Type.Object({
    action: StringEnum(["listar", "adicionar"] as const),
    texto: Type.Optional(Type.String()),
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: "Trabalhando..." }] });
    return {
      content: [{ type: "text", text: "Feito" }],
      details: { resultado: "..." },
    };
  },
  renderCall(args, theme, context) { /* renderizar chamada */ },
  renderResult(result, options, theme, context) { /* renderizar resultado */ },
});
```

**Regras importantes:**
- Use `StringEnum` de `@earendil-works/pi-ai` para enums (nao `Type.Union`/`Type.Literal`)
- Use `withFileMutationQueue()` para tools que mutam arquivos (previne race conditions)
- Trunque output para 50KB / 2000 linhas com `truncateHead` ou `truncateTail`
- Use `throw new Error(...)` para sinalizar erros (nao return)
- `promptGuidelines` deve nomear a tool explicitamente ("Use minha_tool quando...")

### Dynamic Tool Loading

Registre muitas tools mas mantenha apenas um loader ativo:

```typescript
pi.on("session_start", () => {
  const initialTools = pi.getActiveTools().filter(n => !SEARCHABLE_TOOLS.has(n));
  pi.setActiveTools([...initialTools, "search_tools"]);
});

// Na tool search_tools:
pi.setActiveTools([...currentTools, ...matchingTools]);
```

Modelos com suporte nativo (Anthropic Sonnet/Opus 4.5+, OpenAI gpt-5.4+) preservam o prefixo do prompt.

## Comandos Customizados

```typescript
pi.registerCommand("deploy", {
  description: "Deploy para ambiente",
  getArgumentCompletions: (prefix) => {
    const envs = ["dev", "staging", "prod"];
    return envs.filter(e => e.startsWith(prefix)).map(e => ({ value: e, label: e }));
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Fazendo deploy: ${args}`, "info");
  },
});
```

## UI Customizada

### Dialogos

```typescript
const choice = await ctx.ui.select("Escolha:", ["A", "B", "C"]);
const ok = await ctx.ui.confirm("Deletar?", "Nao pode ser desfeito");
const name = await ctx.ui.input("Nome:", "placeholder");
const text = await ctx.ui.editor("Editar:", "texto preenchido");
ctx.ui.notify("Feito!", "info");
```

### Widgets e Status

```typescript
ctx.ui.setStatus("my-ext", "Processando...");
ctx.ui.setStatus("my-ext", undefined); // Limpar
ctx.ui.setWorkingMessage("Pensando...");
ctx.ui.setWidget("my-ext", ["Linha 1", "Linha 2"]);
```

### Componentes Customizados com ctx.ui.custom()

```typescript
const result = await ctx.ui.custom<string | null>((tui, theme, keybindings, done) =>
  new MyComponent({
    theme, keybindings,
    onSelect: (value) => done(value),
    onCancel: () => done(null),
  })
);
```

## Gerenciamento de Estado

```typescript
let items: string[] = [];

pi.on("session_start", async (_event, ctx) => {
  items = [];
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "toolResult") {
      if (entry.message.toolName === "minha_tool") {
        items = entry.message.details?.items ?? [];
      }
    }
  }
});
```

## Provedor Customizado

```typescript
pi.registerProvider("meu-proxy", {
  name: "Meu Proxy",
  baseUrl: "https://proxy.example.com",
  apiKey: "$PROXY_API_KEY",
  api: "anthropic-messages",
  models: [{
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet (proxy)",
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 16384
  }]
});
```

### Provider nativo com OAuth

```typescript
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Entre com o codigo:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials, signal) { return credentials; },
    getApiKey(credentials) { return credentials.access; }
  }
});
```

## API Methods

| Metodo | Descricao |
|--------|-----------|
| `pi.on(event, handler)` | Inscrever em eventos |
| `pi.registerTool(def)` | Registrar tool customizada |
| `pi.registerCommand(name, opts)` | Registrar comando |
| `pi.registerShortcut(key, opts)` | Registrar atalho |
| `pi.registerFlag(name, opts)` | Registrar flag CLI |
| `pi.registerProvider(name, config)` | Registrar provider |
| `pi.unregisterProvider(name)` | Remover provider |
| `pi.sendMessage(msg, opts)` | Injetar mensagem customizada |
| `pi.sendUserMessage(content, opts)` | Enviar mensagem do usuario |
| `pi.appendEntry(type, data)` | Persistir dados de extensao |
| `pi.setSessionName(name)` | Definir nome da sessao |
| `pi.setLabel(entryId, label)` | Definir label em entrada |
| `pi.setModel(model)` | Trocar modelo |
| `pi.setThinkingLevel(level)` | Trocar nivel de thinking |
| `pi.getActiveTools()` | Listar tools ativas |
| `pi.getAllTools()` | Listar todas as tools |
| `pi.setActiveTools(names)` | Definir tools ativas |
| `pi.exec(cmd, args, opts)` | Executar comando shell |
| `pi.events` | Event bus compartilhado entre extensoes |

## ctx (ExtensionContext)

| Propriedade | Descricao |
|-------------|-----------|
| `ctx.ui` | Metodos de UI |
| `ctx.mode` | `"tui"`, `"rpc"`, `"json"`, `"print"` |
| `ctx.hasUI` | true se TUI ou RPC |
| `ctx.cwd` | Diretorio de trabalho atual |
| `ctx.isProjectTrusted()` | Se projeto e confiavel |
| `ctx.sessionManager` | Acesso read-only ao estado da sessao |
| `ctx.modelRegistry` | Registry de modelos |
| `ctx.model` | Modelo ativo |
| `ctx.thinkingLevel` | Nivel de thinking atual |
| `ctx.signal` | AbortSignal do agente |
| `ctx.isIdle()` | Se agente esta ocioso |
| `ctx.abort()` | Abortar operacao atual |
| `ctx.shutdown()` | Shutdown gracioso |
| `ctx.getContextUsage()` | Uso atual do contexto |
| `ctx.compact()` | Disparar compactacao |
| `ctx.getSystemPrompt()` | Obter system prompt atual |

### ctx (ExtensionCommandContext) - apenas em comandos

| Metodo | Descricao |
|--------|-----------|
| `ctx.waitForIdle()` | Aguardar agente ocioso |
| `ctx.newSession(opts)` | Criar nova sessao |
| `ctx.fork(entryId, opts)` | Fork de uma entrada |
| `ctx.navigateTree(targetId, opts)` | Navegar arvore |
| `ctx.switchSession(path, opts)` | Trocar sessao |
| `ctx.reload()` | Recarregar extensoes/skills/prompts/temas |

## Padroes de Guardrails

Padroes concretos para proteger o usuario de acoes indesejadas.

### Bloquear comandos perigosos

Filtra comandos bash com regex antes da execucao. Em modo nao-interativo, bloqueia por default.

```typescript
const dangerousPatterns = [
  /\brm\s+(-rf?|--recursive)/i,
  /\bsudo\b/i,
  /\b(chmod|chown)\b.*777/i,
];

pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "bash") return undefined;
  const command = event.input.command as string;
  const isDangerous = dangerousPatterns.some((p) => p.test(command));

  if (isDangerous) {
    if (!ctx.hasUI) {
      return { block: true, reason: "Comando perigoso bloqueado (sem UI)" };
    }
    const choice = await ctx.ui.select(`Comando perigoso:\n\n  ${command}\n\nPermitir?`, ["Sim", "Nao"]);
    if (choice !== "Sim") {
      return { block: true, reason: "Bloqueado pelo usuario" };
    }
  }
  return undefined;
});
```

### Proteger caminhos de escrita

Bloqueia `write` e `edit` em paths sensivel.

```typescript
const protectedPaths = [".env", ".git/", "node_modules/"];

pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
  const path = event.input.path as string;
  const isProtected = protectedPaths.some((p) => path.includes(p));
  if (isProtected) {
    if (ctx.hasUI) ctx.ui.notify(`Escrita bloqueada em path protegido: ${path}`, "warning");
    return { block: true, reason: `Path "${path}" esta protegido` };
  }
  return undefined;
});
```

### Confirmar acoes destrutivas na sessao

Usa `session_before_switch` e `session_before_fork` para cancelar operacoes.

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  if (!ctx.hasUI) return;
  if (event.reason === "new") {
    const confirmed = await ctx.ui.confirm(
      "Limpar sessao?",
      "Isso apagara todas as mensagens."
    );
    if (!confirmed) return { cancel: true };
    return;
  }

  const entries = ctx.sessionManager.getEntries();
  const hasUnsaved = entries.some(
    (e) => e.type === "message" && e.message.role === "user"
  );
  if (hasUnsaved) {
    const confirmed = await ctx.ui.confirm(
      "Trocar sessao?",
      "Voce tem mensagens nao respondidas. Trocar mesmo assim?"
    );
    if (!confirmed) return { cancel: true };
  }
});
```

### Guard de repo sujo

Impede troca de sessao quando ha alteracoes nao commitadas.

```typescript
async function checkDirtyRepo(pi: ExtensionAPI, ctx: ExtensionContext, action: string) {
  const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
  if (code !== 0 || !stdout.trim().length) return;
  const changedFiles = stdout.trim().split("\n").filter(Boolean).length;
  if (!ctx.hasUI) return { cancel: true };
  const choice = await ctx.ui.select(
    `${changedFiles} arquivo(s) nao commitado(s). ${action} mesmo assim?`,
    ["Sim, prosseguir", "Nao, vou commitar primeiro"]
  );
  if (choice !== "Sim, prosseguir") return { cancel: true };
}

pi.on("session_before_switch", async (event, ctx) => {
  const action = event.reason === "new" ? "nova sessao" : "trocar sessao";
  return checkDirtyRepo(pi, ctx, action);
});
```

### Plan Mode com allowlist de bash

Modo read-only que so permite comandos de leitura via regex.

```typescript
const SAFE_PATTERNS = [
  /^\s*cat\b/, /^\s*head\b/, /^\s*tail\b/, /^\s*grep\b/,
  /^\s*find\b/, /^\s*ls\b/, /^\s*pwd\b/, /^\s*wc\b/,
  /^\s*git\s+(status|log|diff|show|branch|remote)/i,
  /^\s*npm\s+(list|ls|view|info)/i,
];

const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i, /\bmv\b/, /\bcp\b/, /\bmkdir\b/,
  /\bnpm\s+(install|uninstall|update|ci)/i,
  /\bgit\s+(add|commit|push|reset|checkout)/i,
  /\bsudo\b/i,
];

function isSafeCommand(command: string): boolean {
  return SAFE_PATTERNS.some((p) => p.test(command));
}

pi.on("tool_call", async (event) => {
  if (!planModeEnabled || event.toolName !== "bash") return;
  const command = event.input.command as string;
  if (!isSafeCommand(command)) {
    return {
      block: true,
      reason: `Plan mode: comando bloqueado. Use /plan para desabilitar.`,
    };
  }
});
```

## Padroes Praticos de Extensoes

### Gerenciamento de estado via session entries

Armazena estado nas `details` dos tool results. Ao fazer fork, o estado e restaurado automaticamente.

```typescript
interface Todo { id: number; text: string; done: boolean; }
interface TodoDetails { action: string; todos: Todo[]; nextId: number; }

let todos: Todo[] = [];
let nextId = 1;

// Reconstruir estado da sessao
pi.on("session_start", async (_event, ctx) => {
  todos = [];
  nextId = 1;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "toolResult") {
      if (entry.message.toolName === "todo") {
        const details = entry.message.details as TodoDetails;
        if (details) { todos = details.todos; nextId = details.nextId; }
      }
    }
  }
});

// Na tool execute, retornar details com estado atualizado
return {
  content: [{ type: "text", text: `Adicionado: ${text}` }],
  details: { action: "add", todos: [...todos], nextId } satisfies TodoDetails,
};
```

### Input transform com prefixo

Intercepta input do usuario e transforma antes de enviar ao LLM.

```typescript
pi.on("input", async (event, ctx) => {
  // Pular para mensagens injetadas por extensoes
  if (event.source === "extension") return { action: "continue" };

  // Transformar: ?quick adiciona instrucao de brevidade
  if (event.text.startsWith("?quick ")) {
    const query = event.text.slice(7).trim();
    return { action: "transform", text: `Responda brevemente em 1-2 frases: ${query}` };
  }

  // Resposta instantanea sem LLM
  if (event.text.toLowerCase() === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  return { action: "continue" };
});
```

### Input transform com contexto (streaming-aware)

Injeta contexto do git diff, porem pula durante steering para baixa latencia.

```typescript
pi.on("input", async (event) => {
  if (event.streamingBehavior === "steer") return { action: "continue" };
  if (!/\b(changes?|diff|modified)\b/i.test(event.text)) return { action: "continue" };

  const { stdout, code } = await pi.exec("git", ["diff", "--stat"]);
  if (code !== 0 || !stdout.trim()) return { action: "continue" };

  return {
    action: "transform",
    text: `${event.text}\n\nMudancas atuais:\n\`\`\`\n${stdout.trim()}\n\`\`\``,
  };
});
```

### Compaction customizada com modelo diferente

Usa Gemini Flash para sumarizar quando o contexto fica grande, em vez do modelo principal.

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, signal } = event;
  const { messagesToSummarize, turnPrefixMessages, tokensBefore, firstKeptEntryId, previousSummary } = preparation;

  const model = ctx.modelRegistry.find("google", "gemini-2.5-flash");
  if (!model) return; // Fallback para compaction padrao

  const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
  const conversationText = serializeConversation(convertToLlm(allMessages));

  const response = await ctx.modelRegistry.complete(model, {
    messages: [{
      role: "user",
      content: [{ type: "text", text: `Resuma esta conversa de forma abrangente:\n\n${conversationText}` }],
    }],
  }, { maxTokens: 8192, signal });

  const summary = response.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  if (!summary.trim()) return;

  return { compaction: { summary, firstKeptEntryId, tokensBefore, usage: response.usage } };
});
```

### Ferramenta terminate:true

Finaliza o turno do LLM sem custo de turn extra.

```typescript
pi.registerTool({
  name: "structured_output",
  label: "Saida Estruturada",
  description: "Retorna resposta final estruturada. Use como ultima acao.",
  parameters: Type.Object({
    headline: Type.String(),
    summary: Type.String(),
    actionItems: Type.Array(Type.String()),
  }),
  async execute(_id, params) {
    return {
      content: [{ type: "text", text: `Salvo: ${params.headline}` }],
      details: params,
      terminate: true,  // LLM nao gera turn extra
    };
  },
});
```

### Dynamic tool loading

Registre muitas tools mas ative apenas as necessarias. Modelos nativos preservam o prefixo.

```typescript
const ALL_TOOLS = ["search_web", "search_docs", "search_code", "search_issues"];
const LOADER_TOOL = "search_tools";

pi.on("session_start", () => {
  const initialTools = pi.getActiveTools().filter(n => !ALL_TOOLS.includes(n) && n !== LOADER_TOOL);
  pi.setActiveTools([...initialTools, LOADER_TOOL]);
});

// Na tool search_tools:
pi.setActiveTools([...currentTools, ...matchingTools]);
```

### Event bus entre extensoes

`pi.events` permite comunicacao entre extensoes sem acoplamento direto.

```typescript
// Extensao A - emissor
pi.events.emit("deploy:ready", { version: "1.2.3", env: "staging" });

// Extensao B - receptor
pi.events.on("deploy:ready", (data) => {
  const { version, env } = data as { version: string; env: string };
  ctx.ui.notify(`Deploy ${version} para ${env}`, "info");
});
```

### Reload dinamico

Recarrega extensoes, skills e prompts sem reiniciar o processo.

```typescript
pi.registerCommand("reload-runtime", {
  description: "Recarregar extensoes, skills, prompts, temas",
  handler: async (_args, ctx) => {
    await ctx.reload();
  },
});

// Ferramenta LLM-callable que enfileira reload como follow-up
pi.registerTool({
  name: "reload_runtime",
  label: "Reload Runtime",
  description: "Recarrega extensoes e recursos",
  parameters: Type.Object({}),
  async execute() {
    pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
    return {
      content: [{ type: "text", text: "Reload enfileirado." }],
      details: {},
    };
  },
});
```

### Git checkpoint com fork

Cria stash a cada turno e restaura ao fazer fork.

```typescript
const checkpoints = new Map<string, string>();

pi.on("turn_start", async () => {
  const { stdout } = await pi.exec("git", ["stash", "create"]);
  const ref = stdout.trim();
  const leaf = ctx.sessionManager.getLeafEntry();
  if (ref && leaf) checkpoints.set(leaf.id, ref);
});

pi.on("session_before_fork", async (event, ctx) => {
  const ref = checkpoints.get(event.entryId);
  if (!ref) return;
  const choice = await ctx.ui.select("Restaurar estado do codigo?", [
    "Sim, restaurar codigo",
    "Nao, manter codigo atual",
  ]);
  if (choice?.startsWith("Sim")) {
    await pi.exec("git", ["stash", "apply", ref]);
    ctx.ui.notify("Codigo restaurado", "info");
  }
});

pi.on("agent_settled", async () => { checkpoints.clear(); });
```

### Auto-commit no shutdown

Commit automatico ao sair, usando a ultima mensagem do LLM como contexto.

```typescript
pi.on("session_shutdown", async (_event, ctx) => {
  const { stdout: status, code } = await pi.exec("git", ["status", "--porcelain"]);
  if (code !== 0 || !status.trim().length) return;

  const entries = ctx.sessionManager.getEntries();
  let lastText = "";
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "message" && entry.message.role === "assistant") {
      lastText = entry.message.content
        .filter(c => c.type === "text").map(c => c.text).join("\n");
      break;
    }
  }
  const firstLine = lastText.split("\n")[0] || "Work in progress";
  const msg = `[pi] ${firstLine.slice(0, 50)}`;
  await pi.exec("git", ["add", "-A"]);
  const { code: commitCode } = await pi.exec("git", ["commit", "-m", msg]);
  if (commitCode === 0 && ctx.hasUI) ctx.ui.notify(`Auto-commit: ${msg}`, "info");
});
```

### Notificacao terminal nativa

Notifica o usuario quando o agente termina (suporta Ghostty, Kitty, Windows Terminal).

```typescript
function notify(title: string, body: string): void {
  if (process.env.WT_SESSION) {
    // Windows Terminal (WSL)
    const { execFile } = require("child_process");
    execFile("powershell.exe", ["-NoProfile", "-Command", powershellToast(title, body)]);
  } else if (process.env.KITTY_WINDOW_ID) {
    process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`);
    process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`);
  } else {
    process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
  }
}

pi.on("agent_settled", () => notify("Pi", "Pronto para input"));
```

### Working indicator customizado

Substitui o spinner padrao por animacao customizada.

```typescript
const RAINBOW = ["\x1b[38;2;255;179;186m", "\x1b[38;2;255;223;186m", "\x1b[38;2;186;255;201m"];

pi.on("session_start", async (_event, ctx) => {
  ctx.ui.setWorkingIndicator({
    frames: ["·", "•", "●", "•"].map((f, i) => `${RAINBOW[i]}${f}\x1b[39m`),
    intervalMs: 120,
  });
});
```

### Session naming

Nomeia sessoes para aparecer no seletor.

```typescript
pi.registerCommand("session-name", {
  description: "Definir nome da sessao",
  handler: async (args, ctx) => {
    if (args.trim()) {
      pi.setSessionName(args.trim());
      ctx.ui.notify(`Sessao: ${args.trim()}`, "info");
    } else {
      ctx.ui.notify(pi.getSessionName() || "Sem nome", "info");
    }
  },
});
```
