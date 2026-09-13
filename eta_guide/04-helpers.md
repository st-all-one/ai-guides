# Helpers

> Funções globais disponíveis dentro de qualquer template Eta.
> O nome de `output()` é configurável via `outputFunctionName`
> (ver [`07-configuracao.md`](./07-configuracao.md)). Os demais helpers
> (`capture`, `include`, `layout`, `block`) têm nomes fixos.

## `output()`

Anexa uma string diretamente ao output. Útil dentro de loops/condicionais
quando você quer emitir a partir de código JS:

```eta
<% for (const item of it.items) {
  output("<li>" + item + "</li>")
} %>
```

Equivalente, com tags:

```eta
<% for (const item of it.items) { %>
  <li><%= item %></li>
<% } %>
```

> Diferença: `output()` **não escapa** o valor. Se `item` vier do usuário,
> escape manualmente ou prefira a versão com `<%=`.

## `capture()`

Executa um bloco de template e **retorna** o resultado como string, em vez de
escrever no output. Ideal para armazenar/reutilizar fragmentos:

```eta
<% const greeting = capture(() => { %>
  <h1>Hello, <%= it.name %>!</h1>
<% }) %>

<%= greeting %>
<%= greeting %>
```

Isso renderiza o greeting **duas vezes**. Sem `capture()`, não há como reutilizar
um fragmento renderizado dentro da mesma template.

### `capture()` vs. `include()`

| | `capture()` | `include()` |
|---|---|---|
| Fonte | bloco inline na mesma template | outro arquivo/template |
| Reuso | mesma variável, várias vezes | re-renderiza a cada chamada |
| Custo | renderiza 1x | renderiza a cada uso |

## `captureAsync()`

Versão assíncrona de `capture()`, para uso com `renderAsync`/`renderStringAsync`:

```eta
<% const data = await captureAsync(async () => { %>
  <%= await it.fetchData() %>
<% }) %>

<%~ data %>
```

## Resumo

| Helper | Retorna | Emite no output | Async |
|--------|---------|------------------|-------|
| `output(str)` | `void` | sim | não |
| `capture(fn)` | `string` | não | não |
| `captureAsync(fn)` | `Promise<string>` | não | sim |

## Regras práticas

- Prefira `output()` quando a lógica JS já estiver no controle do loop.
- Prefira `capture()` para blocos HTML que você quer reusar.
- Use as variantes `*Async` **somente** dentro de render async.
- Lembre-se: `output()` e `<%~` não escapam; `<%=` escapa.
