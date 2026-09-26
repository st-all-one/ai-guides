# Partials (include)

> Partials são templates renderizadas dentro de outras. Em Eta, use
> `include()` / `includeAsync()` — geralmente com a tag crua `<%~` ou
> `<%=` conforme o caso.

## Uso básico

```eta
<%~ include("./header") %>
```

Com dados extras (mesclados ao `it` do partial):

```eta
<%~ include("./header", { title: "Home" }) %>
```

Os dados passados no 2º argumento são **mesclados** com o `it` da template atual
e disponibilizados no partial.

## Partial assíncrono

```eta
<%~ await includeAsync("./header") %>
```

> `includeAsync` só funciona dentro de uma renderização async
> (`renderAsync` / `renderStringAsync`).

## Resolução de nomes

Em Node e Deno, Eta resolve partials e layouts **a partir do `views`**:

```eta
<%~ include("/header.eta") %>
```

Procura `header.eta` no diretório `views`.

Sem extensão (usa `defaultExtension`, padrão `.eta`):

```eta
<%~ include("./header") %>
<% /* resolve para ./header.eta */ %>
```

### Nomes relativos vs. absolutos

`resolvePath` decide o caminho com base em haver ou não uma template "pai":

| Forma | Dentro de outra template (`include`) | `render` de topo |
|-------|--------------------------------------|------------------|
| `"./header"` | relativo ao diretório da template atual | relativo a `views` |
| `"header"` | relativo ao diretório da template atual | relativo a `views` |
| `"/header"` | resolvido a partir de `views` | idem (`views/header`) |
| `"@header"` | **programática** (não vai ao filesystem) | idem |

Outras regras:

- Sem extensão, `defaultExtension` (padrão `.eta`) é anexada automaticamente.
- O caminho final **precisa ficar dentro de `views`** — tentativas de sair do
  diretório geram `EtaFileResolutionError`.

## Partial programática (`@`)

Se a template não existe no filesystem (definida via `loadTemplate`), o nome
**deve** começar com `@` para o Eta não tentar resolver em disco:

```js
eta.loadTemplate("@header", "<header><h1><%= it.title %></h1></header>")
```

```eta
<%~ include("@header", { title: "Home" }) %>
```

## Escolha da tag de saída

| Situação | Tag correta |
|----------|-------------|
| Partial de HTML confiável | `<%~ include(...) %>` |
| Partial que gera **texto** de usuário | `<%= include(...) %>` |
| Resultado async | `<%~ await includeAsync(...) %>` |

`include()` **retorna string** — por isso é a expressão que a tag consome.

## Partial como função reutilizável

`include()` é apenas uma chamada de render. Para reutilizar o mesmo fragmento
várias vezes na **mesma** template, prefira [`capture()`](./04-helpers.md) (evita
recompilar/re-renderizar do zero).

## Exemplo completo

`views/partials/header.eta`:

```eta
<header>
  <h1><%= it.title %></h1>
</header>
```

`views/page.eta`:

```eta
<%~ include("./partials/header", { title: "Minha Página" }) %>
<main>
  <p><%= it.content %></p>
</main>
```

```js
eta.render("./page", { content: "Olá" })
```

## Armadilhas

- Usar `<%= include(...) %>` com partial que contém HTML → HTML será escapado.
- Chamar `includeAsync` em render **síncrono** → não haverá `await` válido.
- Esquecer o `@` em template programática → Eta tenta ler do filesystem e falha.
- Partial com `layout()` aninhado sem intenção → layouts podem ser empilhados
  (layouts podem ter parents), mas cada partial vira uma página completa.
