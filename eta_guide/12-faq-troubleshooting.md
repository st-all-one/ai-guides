# FAQ e Troubleshooting

## Perguntas frequentes

### Eta funciona em Node, Deno e browser?

Sim. Node e Deno importam `eta`; browser importa `eta/core`. Eta v4 é
**ESM-only** — `require()` não funciona.

### Posso usar CommonJS?

Não. Use `import` ou `await import("eta")`.

### Por que minha interpolação HTML aparece como tags visíveis?

Você usou `<%=` (escapado). Para HTML confiável, use `<%~`.

```eta
<%= it.html %>   →  &lt;div&gt;
<%~ it.html %>   →  <div>
```

### Por que aparece `&lt;` no texto?

É o escape automático funcionando. Se o conteúdo **não** for HTML (texto puro),
está correto. Se for HTML confiável, troque para `<%~`.

### Como uso `it` com outro nome?

```js
new Eta({ varName: "data" }) // <%= data.name %>
```

### Como remover o `it` de vez?

`useWith: true`, mas não é recomendado (colisões e performance). Prefira
`functionHeader`.

### O que significa o `@` nos nomes de template?

Indica que a template é **programática** (registrada via `loadTemplate`).
Eta não tenta resolvê-la no filesystem.

### `renderAsync` retornou `[object Promise]`

Faltou `await`. Sempre use `const res = await eta.renderAsync(...)`.

### `includeAsync` não funciona

Só existe em render async. Use `renderAsync`/`renderStringAsync` e faça
`<%~ await includeAsync(...) %>`.

### Como faço cache em produção?

```js
new Eta({ cache: true })
```

O cache só se aplica quando `name` ou `filename` é passado. Templates via
`renderString` normalmente não são cacheadas.

### Como desabilitar o cache de caminhos?

```js
new Eta({ cacheFilepaths: false })
```

### Como mudar os delimitadores?

```js
new Eta({ tags: ["{{", "}}"] })
// {{= it.name }}
```

### Como inserir variável global em todas as templates?

`functionHeader`:

```js
new Eta({ functionHeader: "const config = it.config" })
```

### Eta é seguro para templates de usuários?

**Não.** Templates são código. Não passe input de usuário para `renderString`.
Ver [`09-seguranca.md`](./09-seguranca.md).

### Como renomear a função `output`?

```js
new Eta({ outputFunctionName: "emit" })
// <% emit("<li>" + it.x + "</li>") %>
```

### Como alterar config depois de instanciar?

```js
eta.configure({ cache: false })   // muta a instância
const dev = eta.withConfig({ debug: true }) // nova instância
```

### Como capturar erros do Eta?

Importe as classes e use `instanceof`:

```js
import { EtaError, EtaFileResolutionError } from "eta"
try {
  eta.render("nao-existe", {})
} catch (e) {
  if (e instanceof EtaFileResolutionError) { /* ... */ }
}
```

### Por que recebo "Views directory is not defined"?

Você usou `render()`/`include()` sem configurar `views`. Defina
`new Eta({ views })` ou use `renderString`/`loadTemplate`.

### Como criar uma variante do engine sem afetar a original?

`withConfig()` retorna cópia rasa com o config mesclado; `configure()` muta.

## Erros e causas prováveis

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| `Cannot find module 'eta'` | não instalado / CJS | `npm install eta`, usar ESM |
| Template não encontrada | path errado ou sem `views` | ajustar `views`/nome; checar extensão |
| Template programática não resolve | faltou `@` no nome | `loadTemplate("@x", ...)` |
| `await` inválido / erro de sintaxe | `await` em render síncrono | usar `renderAsync` |
| HTML escapado | tag `<%=` | trocar para `<%~` (conteúdo confiável) |
| XSS reportado | `<%~` com dado do usuário | sanitizar ou usar `<%=` |
| Tags conflitam com framework | delimitador `<%` em uso | customizar `tags` |
| Whitespace indesejado | `autoTrim`/formatação | ajustar `autoTrim`/`rmWhitespace` ou marcadores `-`/`_` |
| Erro de prefixo custom | colisão com `=`, `~`, `-`, `_` | escolher outro prefixo |
| `Views directory is not defined` | `views` não configurado | `new Eta({ views })` |
| `... is not in the views directory` | caminho resolve fora de `views` | usar caminho relativo à template |
| `Failed to get template '@x'` | programática não registrada | `loadTemplate("@x", ...)` antes |
| `EtaNameResolutionError` no browser | `render` sem `resolvePath` (`eta/core`) | usar `renderString`/`loadTemplate` |

## Armadilhas comuns

1. **Esquecer de fechar** `%>` ou parênteses de uma função arrow em `block()`.
2. **Misturar tags**: `<%` para lógica, `<%=` para output. `<% it.x %>` não emite.
3. **`layout()` depois do conteúdo**: chame `layout()` antes para capturar `it.body`.
4. **`it.body` escapado**: no layout use `<%~ it.body %>`, não `<%=`.
5. **Confundir `include` e `capture`**: `include` renderiza arquivo; `capture`
   reutiliza bloco inline.
6. **Custom tag esperando variável**: o handler recebe **string estática**, não
   expressão avaliada.
7. **`autoFilter` como segurança**: filtro não substitui escape.
8. **Assumir hot-reload**: com `cache: true`, mudanças em `.eta` não aparecem;
   reinicie ou use `cache: false` em dev.

## Debug

```js
const eta = new Eta({ debug: true })
```

Erros de runtime ficam mais legíveis (com custo). Alternativas:

```eta
<% console.log("valor:", it.value) %>
```

- Verifique o caminho resolvido e a extensão (`defaultExtension`).
- Em caso de output vazio, confirme se a tag é `<%=`/`<%~` e não `<%`.
- Em async, confirme `await` em todas as chamadas assíncronas.
