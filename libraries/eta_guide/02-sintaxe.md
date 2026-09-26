# Sintaxe de Template

> Sintaxe familiar para quem já usou **EJS**. Todo dado passado no 2º argumento
> fica disponível na variável **`it`**.

## As três tags de output

| Tag | Nome | Escapa HTML? | Uso |
|-----|------|--------------|-----|
| `<%= expr %>` | Interpolação | **Sim** | Texto/valores do usuário |
| `<%~ expr %>` | Interpolação crua | **Não** | HTML, partials, blocks |
| `<% code %>` | Execução | — | Lógica, loops, condicionais |

### `<%=` — saída escapada (segura)

```eta
Hi <%= it.name %>
```

O valor é automaticamente XML-escaped. `&`, `<`, `>`, `"`, `'` viram entidades,
prevenindo XSS. **Este é o padrão correto para dados de usuário.**

### `<%~` — HTML cru (sem escape)

```eta
Hi <%~ it.contentContainingHTML %>
```

Use apenas quando o conteúdo for confiável (HTML já sanitizado, partials,
fragmentos controlados pelo dev).

### `<%` — executar JavaScript

```eta
<% let myVar = 3 %>
```

Não emite nada. Serve para declarar variáveis, abrir blocos `if`/`for`, etc.

## Comentários

Comentários são apenas comentários JS de bloco:

```eta
<% /* este é um comentário */ %>
```

Nada é emitido, e o conteúdo é removido do output.

## Condicionais

```eta
<% if (it.show) { %>
  Visível!
<% } else { %>
  Escondido
<% } %>
```

## Loops

Array:

```eta
<% it.users.forEach(function(user) { %>
  <%= user.first %> <%= user.last %>
<% }) %>
```

Objeto:

```eta
<% Object.keys(it.obj).forEach(function(key) { %>
  <%= it.obj[key] %>
<% }) %>
```

> Alternativa idiomática com `for...of` + [`output()`](./04-helpers.md):
> ```eta
> <% for (const item of it.items) { output("<li>" + item + "</li>") } %>
> ```

## A variável `it`

Por padrão os dados ficam em `it`. Pode ser renomeada ou eliminada — ver
[`07-configuracao.md`](./07-configuracao.md):

```js
new Eta({ varName: "data" })   // "Hi <%= data.name %>"
new Eta({ useWith: true })     // "Hi <%= name %>"  (evite: colisões/performance)
new Eta({ functionHeader: "const name=it.name" }) // extrai campos com segurança
```

## Partials (resumo)

```eta
<%~ include("./header") %>
<%~ include("./header", { title: "Home" }) %>
<%~ await includeAsync("./header") %>
```

Detalhes em [`03-partials.md`](./03-partials.md).

## Controle de whitespace

Os delimitadores de abertura podem ser seguidos de `-` ou `_`; os de fechamento
podem ser prefixados com `-` ou `_`.

| Marcador | Efeito |
|----------|--------|
| `_` no **início** da tag | Remove **todo** whitespace antes da tag |
| `_` no **fim** da tag | Remove **todo** whitespace depois da tag |
| `-` no **início** da tag | Remove **1 newline** antes da tag |
| `-` no **fim** da tag | Remove **1 newline** depois da tag |

```eta
Hi
<%- = it.myname %>
<% /* o newline após "Hi" será removido */ %>
```

Controle global via `autoTrim` e `rmWhitespace` (ver [`07-configuracao.md`](./07-configuracao.md)).

## Delimitadores customizados

```js
new Eta({ tags: ["{{", "}}"] })
```

```eta
Hi {{= it.name }}
```

## Prefixos internos do parser

Dentro dos delimitadores, o primeiro caractere seleciona o modo:

| Prefixo | Modo | Config |
|---------|------|--------|
| (vazio) | exec | `parse.exec` (padrão `""`) |
| `=` | interpolação (escape) | `parse.interpolate` (padrão `"="`) |
| `~` | interpolação crua | `parse.raw` (padrão `"~"`) |
| `#`, `*`, ... | custom tag | `customTags` (ver [`06-custom-tags.md`](./06-custom-tags.md)) |

`parse.exec`/`interpolate`/`raw` **não** aceitam `-` nem `_`.

## Armadilhas comuns

- Esquecer `<%~` ao incluir partial → o HTML do partial é escapado.
- Usar `<%=` para HTML confiável → entidades aparecem literalmente (`&lt;div&gt;`).
- Abrir `<%` e esquecer de fechar `%>` → erro de parse.
- Assumir que `<%=` escapa URLs/atributos JS — escape é **HTML**, não contextual.
- Interpolar dado de usuário com `<%~` → XSS.
