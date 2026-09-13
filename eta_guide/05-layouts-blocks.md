# Layouts e Blocks

> Eta tem suporte nativo a layouts com **named content blocks**, permitindo
> montar páginas com seções sobrescrevíveis.

## Layouts

Uma template pode ter **um** layout pai (e layouts podem ter seus próprios
pais). Para definir o pai, chame `layout()`:

```eta
<% layout("./base") %>

<h1>Minha Página</h1>
<p>Este conteúdo estará disponível como `it.body` no layout.</p>
```

No layout (`base.eta`), renderize o conteúdo filho com `it.body`:

```eta
<!DOCTYPE html>
<html>
<head><title><%= it.title %></title></head>
<body>
  <%~ it.body %>
</body>
</html>
```

Passando dados extras ao layout:

```eta
<% layout("./base", { title: "Minha Página" }) %>
```

## Blocks

Blocks são seções nomeadas que templates filhas preenchem e layouts renderizam
(ex.: scripts, estilos, sidebar específicos da página).

### Definir block na filha

Use `block("nome", fn)`:

```eta
<% layout("./base") %>

<% block("title", () => { %>
  Título da Página
<% }) %>

<% block("sidebar", () => { %>
  <nav>Sidebar da página</nav>
<% }) %>

<p>O conteúdo principal vai em it.body, como sempre.</p>
```

### Renderizar block no layout

No layout, chame `block()` apenas com o nome. Fallback é o 2º argumento (função):

```eta
<!DOCTYPE html>
<html>
<head>
  <title><%~ block("title", () => { %>Título Padrão<% }) %></title>
</head>
<body>
  <aside>
    <%~ block("sidebar") %>
  </aside>
  <main>
    <%~ it.body %>
  </main>
</body>
</html>
```

| Situação | Resultado |
|----------|-----------|
| Filha define `"sidebar"` | Conteúdo da filha é renderizado |
| Filha não define | renderiza o fallback (se houver) ou nada |

### Como os blocks funcionam

Quando a filha chama `block("nome", fn)` com um layout ativo, o conteúdo é
capturado e armazenado. Quando o layout chama `block("nome")`, o conteúdo
armazenado é retornado.

- Blocks definidos na filha ficam disponíveis ao layout pai.
- **Sem layout ativo**, `block()` renderiza inline (útil para componentes reusáveis).
- Fallback só é usado quando a filha não define aquele block.

### Blocks assíncronos

Para blocks que precisam de `await`, use `blockAsync()`:

```eta
<% layout("./base") %>

<% blockAsync("data", async () => { %>
  <%= await fetchSomeData() %>
<% }) %>
```

No layout:

```eta
<%~ await blockAsync("data") %>
```

## Exemplo completo

**`views/page.eta`** (filha):

```eta
<% layout("./layout") %>

<% block("head", () => { %>
  <link rel="stylesheet" href="/page.css">
<% }) %>

<% block("scripts", () => { %>
  <script src="/page.js"></script>
<% }) %>

<h1><%= it.title %></h1>
<p><%= it.content %></p>
```

**`views/layout.eta`** (pai):

```eta
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <%~ block("head") %>
</head>
<body>
  <main><%~ it.body %></main>
  <%~ block("scripts", () => { %>
    <script src="/default.js"></script>
  <% }) %>
</body>
</html>
```

**Renderização:**

```js
const html = eta.render("./page", {
  title: "Hello",
  content: "Welcome to my site",
})
```

**Saída:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/page.css">
</head>
<body>
  <main><h1>Hello</h1>
<p>Welcome to my site</p></main>
  <script src="/page.js"></script>
</body>
</html>
```

## Regras e armadilhas

- `layout()` deve ser chamado **antes** do conteúdo para que a filha seja
  capturada e injetada em `it.body`.
- Dentro do layout, sempre use `<%~ it.body %>` (HTML cru), nunca `<%=`.
- Block names são strings; `block()` no layout usa a mesma chave da filha.
- Layouts podem ser encadeados (layout de layout), herdando blocks.
- Prefira `blockAsync`/`await blockAsync` quando o conteúdo for async.
