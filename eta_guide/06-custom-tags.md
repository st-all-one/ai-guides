# Custom Tags

> Custom tags permitem definir seus próprios prefixos de tag com funções
> handler. Útil para chaves de tradução, comentários ou sintaxe de domínio.

## Configuração

Passe um objeto `customTags` ao criar a instância. As **chaves** são prefixos e
os **valores** são funções que recebem o conteúdo da tag (string) e o objeto de
dados da template:

```js
const eta = new Eta({
  customTags: {
    "#": () => "", // tag de comentário
    "*": (key, data) => translations[data.lang][key.trim()],
  },
})
```

Assinatura do handler:

```ts
(content: string, data: unknown) => string
```

## Uso

Use o prefixo custom logo após o delimitador de abertura, como `=` ou `~`:

```eta
<%# Isto é um comentário %>

<p><%* greeting %></p>
```

## Exemplo: traduções

```js
const translations = {
  en: { greeting: "Hello!", farewell: "Goodbye!" },
  pl: { greeting: "Czesc!", farewell: "Do widzenia!" },
}

const eta = new Eta({
  customTags: {
    "*": (key, data) => translations[data.lang][key.trim()],
  },
})

eta.renderString("<p><%* greeting %></p>", { lang: "en" })
// => "<p>Hello!</p>"
```

## Como funciona

- O conteúdo da tag é passado ao handler como **string estática**, não
  avaliado como JS. `<%* greeting %>` passa a string `" greeting "`, **não** um
  lookup de variável.
- O handler recebe o objeto de dados completo como 2º argumento, podendo fazer
  seus próprios lookups.
- O retorno do handler é concatenado **diretamente** ao output — **sem
  auto-escape**. Escape você mesmo se necessário.

## Restrições de prefixo

Prefixos custom **não podem** conflitar com:

- Prefixos nativos (`=`, `~`, ou string vazia)
- Marcadores de trim de whitespace (`-`, `_`)

Tentar usar um prefixo conflitante lança erro.

## Casos de uso típicos

| Prefixo | Handler | Finalidade |
|---------|---------|-----------|
| `#` | `() => ""` | Comentários (mais baratos que `<% /* */ %>`) |
| `*` | lookup de i18n | Tradução por chave |
| `!` | sanitize/format | Conteúdo especial |
| `$` | `(key, data) => data.env[key]` | Variáveis de ambiente/build |

## Alternativa para i18n (sem custom tags)

```js
eta.renderString("<p><%= it.t('greeting') %></p>", {
  lang: "en",
  t: (k) => translations.en[k],
})
```

Vantagem: participa do auto-escape (`<%=`). Use `customTags` quando quiser uma
sintaxe própria e não se importar em escapar manualmente.
