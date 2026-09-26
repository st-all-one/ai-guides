# 03 — Conceitos fundamentais e glossário

Este guia reúne os termos e conceitos centrais do WebMCP, extraídos da especificação, do explainer e da documentação oficial.

## Glossário de termos-chave

| Termo | Definição |
|---|---|
| **Agente (agent)** | Assistente autônomo que entende os objetivos do usuário e toma ações em nome dele para alcançá-los. Hoje, tipicamente implementados por LLMs em plataformas de IA, interagindo via chat. |
| **Agente do navegador (browser's agent)** | Agente fornecido por/através do navegador — embutido no próprio navegador ou hospedado por ele, por exemplo via extensão ou plug-in. |
| **Plataforma de IA (AI platform)** | Provedora de assistentes agênticos como OpenAI ChatGPT, Anthropic Claude ou Google Gemini. |
| **Atuação (actuation)** | O ato de um agente simular cliques e entrada de texto como se fosse o usuário humano interagindo com o site. Pode ser tarefa única (clicar num link, preencher um campo) ou complexa (completar uma compra). |
| **Ferramenta (tool)** | Função JavaScript (ou formulário HTML anotado) com nome, descrição em linguagem natural e schema estruturado, invocável por agentes. |
| **Model context** | Estrutura (struct) que contém um **tool map**: um mapa cujas chaves são strings (nomes de ferramentas) e valores são *tool definitions*. |
| **Tool definition** | Estrutura que descreve uma ferramenta: `name`, `title`, `description`, `input schema`, `execute steps`, `annotations`, `exposed origins`. |
| **Annotations** | Metadados opcionais da ferramenta: `readOnlyHint` (não modifica estado) e `untrustedContentHint` (saída contém conteúdo não confiável). |
| **Exposed origins** | Lista de origins para as quais a ferramenta é exposta além da própria origin (via opção `exposedTo`). |
| **JSON Schema** | Padrão para descrever a estrutura de documentos JSON. Usado no `inputSchema` para definir os parâmetros aceitos por uma ferramenta. |
| **Model Context Protocol (MCP)** | Protocolo (Linux Foundation) para expor ferramentas a modelos de IA, geralmente backend. WebMCP deriva inspiração e vocabulário comum. |
| **CUJ (Critical User Journey)** | O caminho do usuário para alcançar um objetivo, incluindo o contexto necessário. |
| **Origin trial** | Mecanismo do Chrome para testar novas APIs com usuários reais por tempo limitado. |
| **Origin isolation** | Isolamento do agent cluster por origin (origin-keyed). Requisito de segurança do WebMCP. |
| **Permissions Policy** | Mecanismo que controla quais features uma página e seus iframes podem usar. O WebMCP usa a feature `tools`. |

## Anatomia de uma ferramenta WebMCP

Uma ferramenta (tool) é definida pelos seguintes campos:

- **`name`** — identificador único da ferramenta dentro de um model context.
  - Regras de validação: comprimento entre **1 e 128** caracteres; apenas caracteres **ASCII alfanuméricos**, `_`, `-` e `.`.
  - É o mesmo valor usado como chave no tool map.
- **`title`** — título legível por humanos, para uso em interfaces do navegador (pode ser nulo; se ausente, o user agent pode usar outro valor). Recomenda-se localizar conforme o idioma do usuário.
- **`description`** — descrição em linguagem natural de *quando e como* usar a ferramenta. É a principal pista para o LLM decidir invocá-la.
- **`inputSchema`** — objeto JSON Schema descrevendo os parâmetros de entrada esperados. Serializado como string na tool definition.
- **`execute`** — callback que roda quando o agente chama a ferramenta. Recebe os parâmetros de entrada. Pode ser assíncrono e retornar uma Promise.
- **`annotations`** — metadados opcionais (ver abaixo).

### Annotations

```js
annotations: {
  readOnlyHint: false,          // true = a ferramenta só lê dados, não muda estado
  untrustedContentHint: false,  // true = a saída contém conteúdo não confiável
}
```

- **`readOnlyHint`** — se `true`, indica que a ferramenta **não modifica estado** e só lê dados. Ajuda o agente a decidir quando é seguro chamar sem pedir confirmação ao usuário.
- **`untrustedContentHint`** — se `true`, indica que a **saída** da ferramenta contém dados não confiáveis (UGC, conteúdo externo). Sinaliza ao agente que esse payload exige maior escrutínio.

## Descoberta, schemas e estado

O WebMCP apoia três coisas:

1. **Discovery** — um padrão para páginas registrarem ferramentas com agentes (`checkout`, `filter_results`, etc.). O navegador medeia: quando uma ferramenta é registrada ou removida, documentos afetados recebem o evento `toolchange`.
2. **JSON Schemas** — definições explícitas de entrada/saída que reduzem alucinação e mal-entendido na hora de chamar a ferramenta.
3. **State** — o entendimento compartilhado do contexto atual da página. Ferramentas podem ser registradas/removidas dinamicamente conforme o estado do app muda (ex.: só expor `undo` quando há edições pendentes).

## Ciclo de vida de uma chamada de ferramenta

1. **Registro**: a página registra uma ou mais ferramentas via `document.modelContext.registerTool()`.
2. **Descoberta**: um agente conectado à página consulta o navegador para descobrir a lista ativa de ferramentas e seus schemas.
3. **Invocação**: o agente solicita uma chamada de ferramenta, enviando argumentos estruturados que correspondem ao `inputSchema`.
4. **Execução**: o navegador medeia a chamada, invoca o callback `execute` com os argumentos e executa a lógica client-side na página.
5. **Resposta**: o callback retorna resultados estruturados ao agente, que os processa para continuar colaborando com o usuário.

## Model context como "estado compartilhado"

O **model context** é a unidade de estado de uma página:

- Cada `Document` tem um `ModelContext` associado (exposto como `document.modelContext`).
- Cada `ModelContext` tem um **internal context** (um `model context` struct) com um **tool map**.
- Ferramentas registradas vivem no event loop do documento; o agente do navegador roda *em paralelo* aos event loops, usando uma fila própria (**AI agent queue**).

Isso significa que **ferramentas são efêmeras por página**: o registro está atado ao ciclo de vida do documento (não persiste entre sessões de navegação por padrão).

## Estado da página vs. exposição de ferramentas

O agente "enxerga" as ferramentas que a página oferece de duas formas:

- **Agentes in-page (JavaScript)**: usam `document.modelContext.getTools()` e `executeTool()` diretamente, ou outros meios de atuação na página.
- **Agente do navegador**: não roda JavaScript na página. Obtém uma visão via **observação (observation)** — uma estrutura implementada pelo navegador contendo ao menos um **tool map** (documentos → lista de tool definitions), normalmente junto de screenshots anotados da página (ver APC — Annotated Page Content no Chromium).

> Nota importante: apesar do nome "Web*MCP*", a especificação **não prescreve** o formato em que as ferramentas são expostas ao agente do navegador. Cada navegador é livre para expor via MCP, "function calling" proprietário, ou outra forma. A página enxerga o que o navegador decidir entregar ao agente.

---

Próximo: **[04 — Como começar](04-como-comecar.md)**.
