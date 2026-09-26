# SDK, RPC e Integracao Programatica

## SDK (Node.js)

### Instalacao

```bash
npm install @earendil-works/pi-coding-agent
```

### Quick Start

```typescript
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Quais arquivos estao no diretorio atual?");
```

### AgentSession

```typescript
interface AgentSession {
  prompt(text: string, options?: PromptOptions): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;
  sessionFile: string | undefined;
  sessionId: string;
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  cycleModel(): Promise<ModelCycleResult | undefined>;
  agent: Agent;
  model: Model | undefined;
  messages: AgentMessage[];
  isStreaming: boolean;
  navigateTree(targetId: string, options?: {...}): Promise<{...}>;
  compact(customInstructions?: string): Promise<CompactionResult>;
  abort(): Promise<void>;
  dispose(): void;
}
```

### PromptOptions

```typescript
interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: ImageContent[];
  streamingBehavior?: "steer" | "followUp";
  source?: InputSource;
  preflightResult?: (success: boolean) => void;
}
```

### Eventos

```typescript
session.subscribe((event) => {
  switch (event.type) {
    case "message_start":     // Nova mensagem
    case "message_update":    // Streaming de tokens
    case "message_end":       // Mensagem finalizada
    case "tool_execution_start":  // Tool chamada
    case "tool_execution_update": // Progresso da tool
    case "tool_execution_end":    // Tool finalizada
    case "turn_start":        // Turn do LLM comecou
    case "turn_end":          // Turn do LLM terminou
    case "agent_start":       // Agente comecou
    case "agent_end":         // Agente terminou
    case "agent_settled":     // Agente ocioso
  }
});
```

### createAgentSessionRuntime()

Para substituir a sessao ativa e reconstruir servicos:

```typescript
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});

// Substituir sessao
await runtime.newSession();
await runtime.switchSession("/path/to/session.jsonl");
await runtime.fork("entry-id");
```

### Ferramentas Customizadas no SDK

```typescript
const { session } = await createAgentSession({
  customTools: [{
    name: "my_tool",
    label: "Minha Tool",
    description: "Descricao",
    parameters: Type.Object({ input: Type.String() }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return { content: [{ type: "text", text: "Feito" }], details: {} };
    },
  }],
});
```

### Tool Allowlists

Restringe quais tools built-in ficam disponiveis. `tools` e um allowlist que inclui tools built-in, de extensoes e custom.

```typescript
// Somente leitura (sem edit/write)
const { session } = await createAgentSession({
  tools: ["read", "grep", "find", "ls"],
  sessionManager: SessionManager.inMemory(),
});

// Com cwd customizado
const { session } = await createAgentSession({
  cwd: "/path/to/project",
  tools: ["read", "bash", "edit", "write"],
  sessionManager: SessionManager.inMemory("/path/to/project"),
});
```

### Extensoes via SDK

Descobre extensoes de locais padrao ou configura explicitamente.

```typescript
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const resourceLoader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  additionalExtensionPaths: ["./my-logging.ts", "./my-safety.ts"],
  extensionFactories: [
    (pi) => {
      pi.on("agent_start", () => console.log("[Inline] Agent starting"));
      pi.on("tool_call", async (event) => {
        console.log(`[Inline] Tool: ${event.toolName}`);
        return undefined;
      });
    },
  ],
});
await resourceLoader.reload();

const { session } = await createAgentSession({ resourceLoader });
```

### Full Control (substituir tudo)

Para integracao completa, substitui discovery, settings, resources e model.

```typescript
import { getModel } from "@earendil-works/pi-ai/compat";
import {
  createAgentSession, createExtensionRuntime, ModelRuntime,
  type ResourceLoader, SessionManager, SettingsManager,
} from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create({
  authPath: "/tmp/my-agent/auth.json",
  modelsPath: "/tmp/my-agent/models.json",
});
await modelRuntime.setRuntimeApiKey("anthropic", process.env.MY_KEY!);

const model = getModel("anthropic", "claude-sonnet-4-5");

const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2 },
});

const resourceLoader: ResourceLoader = {
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => `Voce e um assistente minimal. Disponivel: read, bash.`,
  getSystemPromptSource: () => undefined,
  getAppendSystemPrompt: () => [],
  getAppendSystemPromptSources: () => [],
  extendResources: () => {},
  reload: async () => {},
};

const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "/tmp/my-agent",
  model,
  thinkingLevel: "off",
  modelRuntime,
  resourceLoader,
  tools: ["read", "bash"],
  sessionManager: SessionManager.inMemory(process.cwd()),
  settingsManager,
});
```

### Session Runtime (trocar sessao programaticamente)

Usa `AgentSessionRuntime` quando precisa substituir a sessao ativa (new-session, resume, fork).

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd, sessionManager, sessionStartEvent }) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics,
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});

// Rebinding apos troca de sessao
let unsubscribe: (() => void) | undefined;
async function bindSession() {
  unsubscribe?.();
  const session = runtime.session;
  await session.bindExtensions({});
  unsubscribe = session.subscribe((event) => {
    // processar eventos
  });
  return session;
}

let session = await bindSession();
await runtime.newSession();
session = await bindSession();
await runtime.switchSession("/path/to/session.jsonl");
session = await bindSession();
```

## RPC Mode

Operacao headless via protocolo JSON sobre stdin/stdout.

### Iniciar

```bash
pi --mode rpc [opcoes]
```

### Protocolo

- **Commands**: JSON objects enviados para stdin, um por linha
- **Responses**: JSON com `type: "response"`
- **Events**: Eventos do agente em stdout como JSON lines

### Comandos Principais

```json
{"type": "prompt", "message": "Ola mundo!"}
{"type": "steer", "message": "Pare e faca isso"}
{"type": "follow_up", "message": "Apos terminar, faca isso"}
{"type": "abort"}
{"type": "get_state"}
{"type": "get_messages"}
{"type": "get_tools"}
{"type": "set_model", "model": "anthropic/claude-sonnet-4-5"}
{"type": "set_thinking_level", "level": "high"}
{"type": "new_session"}
{"type": "set_session_name", "name": "minha-sessao"}
```

### Eventos de Resposta

```json
{"type": "response", "command": "prompt", "success": true}
{"type": "response", "command": "get_state", "success": true, "data": {...}}
```

### Eventos de Agente

```json
{"type": "agent_start"}
{"type": "turn_start"}
{"type": "message_start", "message": {...}}
{"type": "message_update", "usage": {...}, "assistantMessageEvent": {...}}
{"type": "message_end", "message": {...}}
{"type": "turn_end", "message": {...}, "toolResults": [...]}
{"type": "tool_execution_start", "toolCallId": "...", "toolName": "..."}
{"type": "tool_execution_end", "toolCallId": "...", "result": {...}}
{"type": "agent_end", "messages": [...]}
```

### Streaming Behavior

Durante streaming, envie com `streamingBehavior`:

```json
{"type": "prompt", "message": "Nova instrucao", "streamingBehavior": "steer"}
{"type": "prompt", "message": "Apos terminar", "streamingBehavior": "followUp"}
```

### Framing

RPC usa JSONL com LF (`\n`) como unico delimitador. Nao use `readline` do Node (split em U+2028/U+2029).

## JSON Event Stream Mode

```bash
pi --mode json "Seu prompt"
```

Saida de todos eventos como JSON lines no stdout.

### Tipos de Evento

```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"assistant",...}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","delta":"Oi"}}
{"type":"message_end","message":{...}}
{"type":"turn_end","message":{...},"toolResults":[]}
{"type":"agent_end","messages":[...]}
```

`message_update` e delta-only. Use `contentIndex` e `delta` para montar texto live.

### Exemplo

```bash
pi --mode json "Listar arquivos" 2>/dev/null | jq -c 'select(.type == "message_end")'
```
