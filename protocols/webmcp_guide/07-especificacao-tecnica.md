# 07 — Especificação técnica

Este guia detalha o **rascunho oficial da especificação WebMCP** (`webmcp_offical_specs/index.bs`, do W3C Web Machine Learning Community Group). Os algoritmos e IDL abaixo refletem o estado do rascunho na coleta; **tudo é sujeito a mudança**.

- **Status**: CG-DRAFT · **Grupo**: webml · **Repo**: `webmachinelearning/webmcp`
- **Editores**: Brandon Walderman (Microsoft), Khushal Sagar (Google), Dominic Farolino (Google)
- **Testes**: https://wpt.fyi/results/webmcp
- **Tipos TypeScript**: pacote npm `webmcp-types`

## Visão geral (abstract da spec)

> "A API WebMCP é uma nova interface JavaScript que permite que desenvolvedores web exponham a funcionalidade de sua aplicação web como 'ferramentas' — funções JavaScript com descrições em linguagem natural e schemas estruturados que podem ser invocadas por agentes, agentes do navegador e tecnologias assistivas. Páginas web que usam WebMCP podem ser pensadas como **servidores Model Context Protocol** que implementam ferramentas em script client-side em vez de no backend."

## Estruturas internas (supporting concepts)

### Model context

Um **model context** é um struct com:

- **tool map**: um map cujas chaves são strings (nomes de ferramentas) e valores são **tool definitions**.

### Tool definition

Struct com os itens:

| Item | Descrição |
|---|---|
| **name** | String que identifica unicamente a ferramenta no tool map. **Comprimento entre 1 e 128**, apenas caracteres ASCII alfanuméricos, `_`, `-` e `.`. |
| **title** | String-or-null, título legível para UI. Se não fornecido, o user agent escolhe um valor para exibição. |
| **description** | String. |
| **input schema** | String (JSON Schema serializado). Para registro imperativo é a serialização de `ModelContextTool.inputSchema`; para declarativo, um objeto JSON Schema sintetizado pelo algoritmo de síntese. |
| **execute steps** | Passos para invocar a ferramenta (imperativo: chama o callback; declarativo: passos internos para preencher `<form>` e form-associated elements). |
| **annotations** | Annotations-or-null (`readOnlyHint`, `untrustedContentHint`, ambos booleanos, inicialmente `false`). |
| **exposed origins** | Lista de origins, inicialmente vazia. |

## Extensão de `Document`

Cada `Document` tem um `ModelContext` associado, criado no realm relevante do documento:

```webidl
partial interface Document {
  [SecureContext, SameObject] readonly attribute ModelContext modelContext;
};
```

O getter simplesmente retorna o objeto associado.

## Interface `ModelContext`

```webidl
[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined> registerTool(ModelContextTool tool, optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});

  attribute EventHandler ontoolchange;
};
```

Cada `ModelContext` tem um **internal context** (um `model context` struct) criado junto.

### `registerTool()` — algoritmo de registro

Etapas principais (em ordem):

1. `global` = o objeto global relevante; `tool owner` = o `Document` associado.
2. Se `tool owner` **não é fully active** → rejeita com `InvalidStateError`.
3. **Origin isolation**: se o agent cluster **não é origin-keyed** e o esquema da origin não é `"file"` → rejeita com `SecurityError`.
4. Se o documento **não está autorizado a usar a feature `tools`** → rejeita com `NotAllowedError`.
5. Se já existe uma ferramenta com o mesmo `name` no tool map → rejeita com `InvalidStateError`.
6. Se `name` ou `description` é string vazia → rejeita com `InvalidStateError`.
7. Se `name` tem comprimento > 128 ou contém caracteres fora do permitido → rejeita com `InvalidStateError`.
8. **Serialização do input schema**: se `inputSchema` existe, serializa com o algoritmo de serialização JSON (equivalente a `JSON.stringify`). Casos que lançam:
   - **`TypeError`** quando o resultado de `JSON.stringify` é `undefined` (ex.: `{ toJSON() { return undefined; } }`).
   - **Re-lança exceções** do `JSON.stringify` (ex.: referência circular).
9. **AbortSignal**: se `options.signal` existe e está abortado → rejeita com a abort reason. Senão, registra passos de abort que (a) **desregistram a ferramenta** e (b) rejeitam a promise.
10. **`exposedTo`**: para cada origin em `options.exposedTo`, faz parse de URL; se falhar ou a origin **não for potencialmente confiável** → rejeita com `SecurityError`. Acrescenta a origin à lista `exposed origins`.
11. Monta a `tool definition` (incluindo as annotations).
12. Insere no tool map: `internal context[name] = tool definition`.
13. **Em paralelo**: (a) notifica documentos de mudança de ferramenta; (b) enfileira task no **webmcp task source** para resolver a promise com `undefined`.
14. Retorna a promise.

### `getTools()` — algoritmo de descoberta

1. Validações de fully active, origin isolation e permissions policy (iguais às do registro).
2. Se `options.fromOrigins` existe: parse e validação de cada origin (origens não confiáveis → `SecurityError`).
3. **Em paralelo**:
   - Itera os **descendant navigables** do traversable do documento chamador.
   - Para cada documento que **pode usar a feature `tools`** e cuja origin está em `fromOrigins` ou é same-origin com o chamador:
     - Para cada ferramenta no tool map do documento: se a ferramenta **não está exposta** à origin do chamador (`tool is exposed to an origin`), continua.
     - Monta um `RegisteredTool` (ver dicionário abaixo).
   - **Ordena** a lista em ordem ascendente pelo `name`.
   - Enfileira task no webmcp task source para resolver a promise com a lista.
4. Retorna a promise.

**`tool is exposed to an origin`**: retorna `true` se a origin do dono é same-origin com a origin acessadora, OU se alguma origin em `exposed origins` é same-origin com a acessadora. Caso contrário, `false`.

### Notificar documentos de mudança (`notify documents of a tool change`)

- Roda **em paralelo**, dado o documento dono e a lista de exposed origins.
- Itera os descendant navigables do traversable.
- Para cada documento que pode usar `tools` e para o qual a ferramenta está exposta: enfileira task no webmcp task source para **disparar o evento `toolchange`** no `ModelContext` associado.
- **Timing (exemplo da spec)**: `toolchange` do pai sempre loga antes do do filho; a resolução da promise de `registerTool` sempre loga depois de ambos; mas um `setTimeout` (timer task source) pode logar **antes, entre ou depois** dos três — não confie no ordenamento entre task sources diferentes.

### `unregister a tool`

- Roda no event loop do agente relevante.
- Se o nome não existe no tool map, retorna.
- Remove do map e notifica documentos de mudança (em paralelo).

## Dicionários

### `ModelContextTool`

```webidl
dictionary ModelContextTool {
  required DOMString name;
  USVString title;                 // USVString porque é exibido em UIs nativas
  required DOMString description;
  object inputSchema;
  required ToolExecuteCallback execute;
  ToolAnnotations annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint = false;
  boolean untrustedContentHint = false;
};

callback ToolExecuteCallback = Promise<any> (object input);
```

Semântica por campo:

- **name** — identificador único usado pelos agentes para referenciar a ferramenta.
- **title** — rótulo exibido pelo user agent na UI. Recomenda-se **localizar** para o idioma do usuário.
- **description** — descrição em linguagem natural de quando/como usar.
- **inputSchema** — objeto JSON Schema dos parâmetros de entrada.
- **execute** — callback invocado quando o agente chama a ferramenta; pode ser assíncrono; o agente recebe o resultado quando a promise resolve.
- **annotations** — metadados opcionais.

### `ModelContextRegisterToolOptions`

```webidl
dictionary ModelContextRegisterToolOptions {
  AbortSignal signal;
  sequence<USVString> exposedTo;
};
```

- **signal** — um `AbortSignal` que desregistra a ferramenta quando abortado.
- **exposedTo** — array de origins que controlam a quais documentos (na árvore do documento atual) a ferramenta é exposta.

### `ModelContextGetToolOptions`

```webidl
dictionary ModelContextGetToolOptions {
  sequence<USVString> fromOrigins;
};
```

- **fromOrigins** — origins de onde consultar ferramentas. Documentos cuja origin está na lista, ou são same-origin com o chamador, têm suas ferramentas consultadas. Lista vazia → apenas documentos same-origin.

### `RegisteredTool`

```webidl
dictionary RegisteredTool {
  required DOMString name;
  DOMString title;                 // DOMString é suficiente na saída (USVString já processou surrogates na entrada)
  required DOMString description;
  DOMString inputSchema;
  required Window window;
  required USVString origin;
  ToolAnnotations annotations;
};
```

- **name/title/description/annotations** — espelham o que foi fornecido no registro.
- **inputSchema** — string (JSON Schema serializado) derivada no registro.
- **window** — a `Window` do documento que registrou a ferramenta.
- **origin** — a origin do documento que registrou. Só é significativa quando a ferramenta é cross-origin (para same-origin é a mesma da `window`/chamador).
- **title** — há um issue (#224) para considerar não defaulting para string vazia (deixar `undefined`).

## API Declarativa na spec

A seção declarativa da spec está **marcada como TODO**. O algoritmo `synthesize a declarative JSON Schema object algorithm` (dado um `<form>`) ainda é TBD. Detalhes completos no [guia 06 — API Declarativa](06-api-declarativa.md).

## Eventos

| Event handler | Evento |
|---|---|
| `ontoolchange` | `toolchange` |

## Integração com Permissions Policy

O acesso às APIs é controlado pela feature **`tools`**, com **default allowlist `self`**.

## Interação com agentes

### Integração com o event loop

- A funcionalidade de um site é exposta a agentes como ferramentas que vivem no **event loop** do `Document`.
- O **agente do navegador** roda **em paralelo** aos event loops associados a um `ModelContext`.
- Passos rodando no agente do navegador são enfileirados na **AI agent queue** (nova parallel queue).
- Passos enfileirados *do* agente do navegador de volta ao event loop da página (thread principal, onde o JS roda) são enfileirados no **webmcp task source** do objeto global relevante.

### Observações de página (non-normative)

- **Agentes in-page**: usam as APIs `ModelContext` diretamente.
- **Agente do navegador**: não roda JavaScript na página. Obtém a visão das ferramentas via uma **observação (observation)** — estrutura implementation-defined contendo ao menos um **tool map** (chaves = Document unique IDs; valores = listas de tool definitions).
  - Uma observação é normalmente um "snapshot" da página apresentada ao usuário (incluindo screenshots anotados etc.). Ver [Annotated Page Content (APC)](https://chromium.googlesource.com/chromium/src.git/+/main/third_party/blink/renderer/modules/content_extraction/readme.md) no Chromium.
- **`perform an observation`**: roda na AI agent queue; itera os descendant navigables; monta o tool map por Document unique ID; adiciona conteúdo implementation-defined (screenshots, accessibility tree); entrega ao agente do navegador.
- A spec **não prescreve o formato** de exposição das ferramentas ao agente (MCP, function calling proprietário etc.).
- **Advertência aos implementadores**: devem repassar ao agente informações de segurança relevantes das tool definitions (como a origin de origem), para que o modelo saiba as partes em jogo e possa executar com segurança a intenção do usuário final.
- Os momentos em que o agente do navegador performa observações são implementation-defined; tipicamente quando o usuário está interagindo com um agente enquanto o conteúdo web está visível.

## Erros possíveis

| Condição | Erro |
|---|---|
| Documento não fully active | `InvalidStateError` |
| Sem origin isolation (não-keyed e não-file) | `SecurityError` |
| Permissions policy `tools` bloqueada | `NotAllowedError` |
| Nome duplicado / nome ou descrição vazios / nome inválido | `InvalidStateError` |
| `exposedTo`/`fromOrigins` com origin não confiável ou URL inválida | `SecurityError` |
| Serialização do `inputSchema` falha | `TypeError` (ou exceção re-lançada) |
| Signal abortado | `AbortError` (reason do signal) |

## Questionário de segurança e privacidade (destaques)

- O WebMCP **não expõe novas informações** sobre o usuário ou ambiente às origins: expõe apenas metadados de ferramentas definidos pelo autor e valores de retorno, para o agente embutido.
- Iframes cross-origin só descobrem ferramentas se o autor **opt-in** via `exposedTo`.
- **Não persiste estado** entre sessões de navegação: registros são atados ao ciclo de vida do documento (há discussões sobre persistir através de navegações, não especificado).
- **BFCache**: ferramentas de um documento BFCached permanecem na memória mas ficam indisponíveis enquanto o documento não estiver fully active; voltam a ficar disponíveis na restauração.
- **Documento desconectado**: ferramentas não são mais descobríveis/invocáveis. Invocações pendentes são abandonadas: agentes in-page têm a Promise rejeitada; agentes embutidos são notificados de falha (comportamento pretendido, ainda não spec'd).
- **Privacidade**: a API não expõe PII, mas as ferramentas *podem*, dependendo da natureza; há um risco novo para implementadores de agentes: ferramentas maliciosas podem pedir um conjunto não-mínimo de dados pessoais via parâmetros (ver [guia 09 — Segurança](09-seguranca.md)).

---

Próximo: **[08 — Casos de uso e jornadas críticas (CUJ)](08-casos-de-uso.md)**.
