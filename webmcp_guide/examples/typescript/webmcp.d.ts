/**
 * Declarações mínimas da API WebMCP (document.modelContext).
 *
 * Fonte: https://webmachinelearning.github.io/webmcp
 * Para tipos completos/mantidos, use o pacote npm "webmcp-types".
 */

interface ModelContextToolAnnotations {
  /** true = a ferramenta não modifica estado; só lê dados. */
  readOnlyHint?: boolean;
  /** true = a saída contém conteúdo não confiável (UGC/externo). */
  untrustedContentHint?: boolean;
}

interface ModelContextTool {
  /** Identificador único (1–128 chars; [A-Za-z0-9_.-]). */
  name: string;
  /** Rótulo legível exibido em UIs nativas. */
  title?: string;
  /** Descrição em linguagem natural: quando/como usar. */
  description: string;
  /** Objeto JSON Schema dos parâmetros de entrada. */
  inputSchema?: Record<string, unknown>;
  /** Callback executado quando um agente chama a ferramenta. */
  execute: (input: any) => Promise<any>;
  annotations?: ModelContextToolAnnotations;
}

interface ModelContextRegisterToolOptions {
  /** AbortSignal: ao abortar, a ferramenta é desregistrada. */
  signal?: AbortSignal;
  /** Origins seguras autorizadas a descobrir/executar a ferramenta. */
  exposedTo?: string[];
}

interface RegisteredTool {
  name: string;
  title: string;
  description: string;
  /** JSON Schema serializado em string. */
  inputSchema?: string;
  /** Window do documento que registrou a ferramenta. */
  window: Window;
  origin: string;
  annotations?: ModelContextToolAnnotations;
}

interface ModelContextGetToolOptions {
  /** Origins das quais consultar ferramentas (vazio = só same-origin). */
  fromOrigins?: string[];
}

interface ModelContextExecuteToolOptions {
  signal?: AbortSignal;
}

interface ModelContext extends EventTarget {
  registerTool(
    tool: ModelContextTool,
    options?: ModelContextRegisterToolOptions,
  ): Promise<undefined>;
  getTools(options?: ModelContextGetToolOptions): Promise<RegisteredTool[]>;
  executeTool(
    tool: RegisteredTool,
    argsJson: string,
    options?: ModelContextExecuteToolOptions,
  ): Promise<any>;

  ontoolchange: ((this: ModelContext, ev: Event) => any) | null;
}

interface Document {
  readonly modelContext: ModelContext;
}
