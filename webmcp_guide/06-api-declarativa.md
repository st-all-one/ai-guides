# 06 — API Declarativa

A API Declarativa transforma **formulários HTML padrão** em ferramentas WebMCP adicionando anotações. As anotações definem o nome e o propósito da ferramenta no elemento `<form>`, enquanto os campos agem como **parâmetros da ferramenta**. O navegador traduz esses elementos numa representação estruturada (JSON Schema) que os agentes podem usar de forma análoga às ferramentas imperativas.

## Registro de ferramenta

Adicione os seguintes atributos HTML ao seu formulário:

- **`toolname`** — nome claro da ferramenta, baseado no propósito.
- **`tooldescription`** — descreva qual ação a ferramenta executa e seu propósito.

Exemplo — formulário em `example.com/get-customer-support`:

```html
<form toolname="createSupportRequest" tooldescription="Submits a request for customer support.">
</form>
```

Quando um agente chama o `toolname`, o navegador **traz o formulário para o foco** e popula seus campos. O formulário permanece visível ao usuário.

> Se você remover `toolname` ou `tooldescription`, a ferramenta é **desregistrada**.

### (Opcional) Parâmetros das ferramentas

Para melhorar a acurácia, adicione os seguintes atributos HTML a elementos de formulário individuais:

- **`toolparamdescription`** — mapeia o elemento para a descrição da propriedade dentro do JSON Schema.
  - Sem esse atributo, o navegador usa o conteúdo do `<label>` associado (pulando descendentes labelables).
  - Se não houver `<label>`, o navegador consulta o `aria-description`.

O exemplo abaixo usa o atributo opcional num elemento `<select>`:

```html
<form toolname="supportRequestTool"
  tooldescription="Submit a request for support."
  action="/submit">

  <label for="firstName">First Name</label>
  <input type=text name=firstName>

  <label for="lastName">Last Name</label>
  <input type=text name=lastName>

  <select name="select" required
    toolparamdescription="Determines what team this request is routed to.">
    <option value="Customer happiness team">Return my purchase.</option>
    <option value="Distribution team">Check where my package is.</option>
    <option value="Website support team">Get help on the website.</option>
  </select>

  <button type=submit>Submit</button>
</form>
```

### O que o navegador gera (síntese de JSON Schema)

O navegador interpreta o formulário acima como a seguinte ferramenta:

```json
[
  {
    "name": "supportRequestTool",
    "description": "Submit a request for support.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "firstName": {
          "type": "string"
        },
        "lastName": {
          "type": "string"
        },
        "select": {
          "type": "string",
          "anyOf": [
            {
              "type": "string",
              "const": "Customer happiness team",
              "title": "Return my purchase."
            },
            {
              "type": "string",
              "const": "Distribution team",
              "title": "Check where my package is."
            },
            {
              "type": "string",
              "const": "Website support team",
              "title": "Get help on the website."
            }
          ],
          "enum": [
            "Customer happiness team",
            "Distribution team",
            "Website support team"
          ],
          "description": "Determines what team this request is routed to."
        }
      },
      "required": [
        "select"
      ]
    }
  }
]
```

Observações sobre a síntese:

- O atributo `name` do elemento controla o **nome da propriedade** no schema.
- `toolparamdescription` vira a **`description`** da propriedade.
- `<select>` vira `enum`/`anyOf` + `const`/`title` (mapeando `value` → `const`, texto do `<option>` → `title`).
- O atributo `required` do elemento contribui para a lista `required` do schema.
- O algoritmo completo de redução (incluindo `min`, `max`, `step`, `oneOf`, etc.) é **TBD na especificação**; o Chromium implementa uma versão "frouxa" para testar a abordagem.

## Envio do formulário

Você tem duas opções de submissão:

1. O usuário deve **clicar manualmente em Submit** para concluir a tarefa.
2. Adicionar **`toolautosubmit`** para disparar submissão **e navegação** quando o modelo invocar a ferramenta.

### `SubmitEvent`: `agentInvoked` e `respondWith()`

A interface `SubmitEvent` ganha dois membros:

- **`agentInvoked`** — atributo booleano **somente leitura**, `true` quando o formulário foi disparado por um agente de IA. Use para adaptar o comportamento da aplicação especificamente para interações agênticas.
- **`respondWith(Promise<any>)`** — permite passar uma promise ao navegador que você resolve com os resultados do formulário. O valor resultante é serializado e retornado ao modelo como **saída da ferramenta**.
  - Requisito: chame **`preventDefault()` antes** para impedir a submissão padrão do navegador (o `action` NÃO navega).

```html
<form toolautosubmit toolname="search_tool"
  tooldescription="Search the web" action="/search">
  <input type=text name=query>
</form>

<script>
  document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (!myFormIsValid()) {
      if (e.agentInvoked) { e.respondWith(myFormValidationErrorPromise) }
      return;
    }

    if (e.agentInvoked) { e.respondWith(Promise.resolve("Search is done!")); }
  });
</script>
```

### Resposta quando o formulário navega

Para formulários que **navegam** (sem `respondWith`), há duas abordagens em discussão (ver [Issue #135](https://github.com/webmachinelearning/webmcp/issues/135)):

1. **JSON-LD**: o navegador usa o **primeiro `<script type="application/ld+json">`** na página de destino como resposta estruturada da ferramenta ao modelo.
2. **Fallback**: quando não há tag JSON-LD, provavelmente o **conteúdo inteiro da página** será enviado ao modelo como resposta (representação semântica do resultado) — **TBD**.

Quando o formulário **não** navega, JavaScript pode forjar a resposta via `SubmitEvent#respondWith()`.

## Eventos `toolactivated` e `toolcancel`

O navegador sinaliza que um agente executou uma ferramenta com o evento **`toolactivated`** (dispara na `window` assim que os campos do formulário são pré-preenchidos). Se o usuário cancelar a operação agêntica, ou o método `reset()` for invocado, o evento **`toolcancel`** é disparado.

Ambos os eventos são **não-canceláveis** e fornecem o atributo **`toolName`** para identificação:

```js
window.addEventListener('toolactivated', ({ toolName }) => {
  console.log(`the tool "${toolName}" execution was activated.`);
  // TODO: atualizar UI ou validar formulário, se necessário.
});

window.addEventListener('toolcancel', ({ toolName }) => {
  console.log(`the tool "${toolName}" execution was cancelled.`);
  // TODO: avisar o usuário. Atualizar UI.
});
```

> **Nota (IDL, rascunho)**: `SubmitEvent` ganha `readonly attribute boolean agentInvoked;` e `undefined respondWith(Promise<any> agentResponse);`.

## Pseudo-classes CSS para foco visível

Um indicador de foco visível é crítico para informar usuários e agentes onde estão na página. Quando um agente invoca uma ferramenta com sucesso, foca o formulário associado e auto-popula os campos, o navegador dispara pseudo-classes CSS para feedback visual:

- **`:tool-form-active`** — aplicada ao elemento `<form>` da ferramenta em execução.
- **`:tool-submit-active`** — aplicada ao botão de submit do formulário, se houver.

As classes são desativadas quando o formulário é submetido, o agente cancela a ação, ou o usuário reseta o formulário.

```css
/* Estilos padrão do Chrome para formulários declarativos. */
form:tool-form-active {
  outline: light-dark(blue, cyan) dashed 1px;
  outline-offset: -1px;
}

input:tool-submit-active {
  outline: light-dark(red, pink) dashed 1px;
  outline-offset: -1px;
}
```

> Leia mais sobre [foco e boas práticas de estilo](https://web.dev/learn/accessibility/focus).

## Processamento: reset e mudanças

- Quando um formulário é **resetado** OU sua declaração de ferramenta muda (ex.: `toolname` alterado), qualquer **invocação em voo da ferramenta é cancelada** e o agente é notificado do cancelamento.
- Quando formulários com estes atributos são inseridos, removidos ou os atributos são atualizados, o formulário **cria um novo tool declarativo** cujo input schema é gerado conforme a síntese.
- `:tool-form-active` é considerada "running" desde o preenchimento com saída do agente até: reset/remoção do DOM, `respondWith()` resolvendo com saída, atributos modificados/adicionados/removidos, ou submissão automática via `toolautosubmit`.

## Equivalência: declarativa vs. imperativa

A seguinte estrutura imperativa:

```js
await document.modelContext.registerTool({
  name: "search-cars",
  description: "Perform a car make/model search",
  inputSchema: {
    type: "object",
    properties: {
      make: { type: "string", description: "The vehicle's make (e.g., BMW, Ford)" },
      model: { type: "string", description: "The vehicle's model (e.g., 330i, F-150)" },
    },
    required: ["make", "model"]
  },
  execute({make, model}, agent) { ... }
});
```

...equivale ao seguinte formulário declarativo:

```html
<form toolname="search-cars" tooldescription="Perform a car make/model search" [...]>
 <input type=text name="make" toolparamdescription="The vehicle's make (i.e., BMW, Ford)" required>
 <input type=text name="model" toolparamdescription="The vehicle's model (i.e., 330i, F-150)" required>
 <button type=submit>Search</button>
</form>
```

## Exemplo prático completo — lançamento de horas (timesheet)

```html
<form toolname="add-to-timesheet"
  tooldescription="Report billing task and time to add to the timesheet."
  toolautosubmit>

  <fieldset>
    <label for="date">Date</label>
    <input name="date" type="datetime-local" toolparamdescription="Date of work.">

    <label for="task_category">Task category</label>
    <select id="task_category" name="task_category"
    toolparamdescription="Type of task completed per time block">
      <option value="admin">Admin</option>
      <option value="billing">Billing</option>
      <option value="client">Client meetings or communication</option>
      <option value="development">Development</option>
    </select>

    <label for="minutes_worked">Minutes working on the task</label>
    <input type="number" id="minutes_worked" name="minutes_worked" min="30" max="600"
      toolparamdescription="Minutes worked on this date and task, with a minimum of 30 and maximum of 600."
      placeholder="60">

    <label for="work_details">Details</label>
    <input name="work_details"
      toolparamdescription="Additional details of work completed, for managerial review.">
  </fieldset>

  <button type="submit">Update timesheet</button>
</form>
```

---

Próximo: **[07 — Especificação técnica](07-especificacao-tecnica.md)**.
