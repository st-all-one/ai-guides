# Configuração

> Todas as opções passadas ao construtor: `new Eta(options)`.
> Tipo completo (TypeScript):

```ts
type config = {
  /** Escape XML automático nas interpolações. Padrão: true */
  autoEscape: boolean

  /** Aplica filterFunction a toda interpolação ou interpolação crua */
  autoFilter: boolean

  /** Trim automático de whitespace. Padrão: [false, 'nl'] */
  autoTrim: trimConfig | [trimConfig, trimConfig]

  /** Cachear templates quando name/filename é passado */
  cache: boolean

  /** Cache de caminhos resolvidos. false desativa. */
  cacheFilepaths: boolean

  /** Prefixos custom. Chave=prefixo, valor=handler. Padrão: {} */
  customTags: Record<string, (content: string, data: unknown) => string>

  /** Pretty-print de erros (introduz custo em runtime) */
  debug: boolean

  /** Função para sanitizar XML nas interpolações */
  escapeFunction: (str: unknown) => string

  /** Função aplicada a toda interpolação quando autoFilter é true. Padrão: String(val) */
  filterFunction: (val: unknown) => string

  /** Nome da função usada no template para emitir texto (equivale ao outputFunctionName do EJS). Padrão: "output" */
  outputFunctionName: string

  /** Código JS cru inserido no topo da função template (globais) */
  functionHeader: string

  /** Opções de parsing */
  parse: {
    /** Prefixo de avaliação. Padrão "". Não aceita "-" nem "_" */
    exec: string
    /** Prefixo de interpolação. Padrão "=". Não aceita "-" nem "_" */
    interpolate: string
    /** Prefixo de interpolação crua. Padrão "~". Não aceita "-" nem "_" */
    raw: string
  }

  /** Plugins */
  plugins: Array<{
    processFnString?: (fnString: string, env?: EtaConfig) => string
    processAST?: (ast: AstObject[], env?: EtaConfig) => AstObject[]
    processTemplate?: (fnString: string, env?: EtaConfig) => string
  }>

  /** Remove whitespace no início/fim de cada linha (colapsa linhas em branco) */
  rmWhitespace: boolean

  /** Delimitadores. Padrão: ['<%', '%>'] */
  tags: [string, string]

  /** Disponibiliza dados no objeto global em vez de varName */
  useWith: boolean

  /** Nome do objeto de dados. Padrão: it */
  varName: string

  /** Diretório que contém as templates */
  views?: string

  /** Extensão padrão das templates. Padrão: .eta */
  defaultExtension?: string
}
```

## Opções por categoria

### Caminhos e arquivos

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `views` | — | Diretório raiz das templates. Quase sempre obrigatório. |
| `defaultExtension` | `".eta"` | Extensão assumida quando o `include`/`render` omite. |
| `cache` | `false` | Reaproveita template compilada (`true` em produção). |
| `cacheFilepaths` | `true` | Cacheia caminhos resolvidos; `false` desativa. |

### Segurança e saída

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `autoEscape` | `true` | Escapa `<%=` automaticamente. **Mantenha true.** |
| `escapeFunction` | `XMLEscape` | Substitui a função de escape (ex.: custom entities). |
| `autoFilter` | `false` | Aplica `filterFunction` a `<%=` e `<%~` (escape continua só no `<%=`). |
| `filterFunction` | `String(val)` | Filtro global (`autoFilter: true`); retorno é escapado sob `<%=`. |
| `outputFunctionName` | `"output"` | Nome da função de output acessível no template. |

### Sintaxe e tags

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `tags` | `["<%", "%>"]` | Delimitadores abertura/fechamento. |
| `parse.exec` | `""` | Prefixo de execução. |
| `parse.interpolate` | `"="` | Prefixo de interpolação escapada. |
| `parse.raw` | `"~"` | Prefixo de interpolação crua. |
| `customTags` | `{}` | Prefixos/handlers custom. |
| `varName` | `"it"` | Nome do objeto de dados. |
| `useWith` | `false` | Dados no escopo global (evite). |
| `functionHeader` | `""` | Código JS no topo da função template. |

### Whitespace e debug

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `autoTrim` | `[false, "nl"]` | Trim automático (ver abaixo). |
| `rmWhitespace` | `false` | Remove whitespace no início/fim de cada linha. |
| `debug` | `false` | Erros bonitos; custo em runtime. |
| `plugins` | `[]` | Hooks de processamento. |

## `autoTrim`

`trimConfig` aceita `false`, `"nl"` (remove 1 newline) ou `"slurp"` (remove todo
whitespace). Pode ser um valor único (ambos os lados) ou um par
`[trimConfig, trimConfig]` para configurar cada lado de forma independente.
No padrão `[false, "nl"]`, o texto após a tag sofre trim de 1 newline.

```js
new Eta({ autoTrim: [false, "nl"] })      // padrão
new Eta({ autoTrim: ["slurp", "slurp"] }) // agressivo
new Eta({ autoTrim: "nl" })               // ambos os lados
```

`rmWhitespace: true` é mais simples: aplica `.replace(/^\s+|\s+$/gm, "")` após
colapsar quebras de linha, removendo indentação e linhas em branco.

## Exemplos de configuração

### Produção

```js
const eta = new Eta({
  views: path.join(import.meta.dirname, "templates"),
  cache: true,
  debug: false,
  autoEscape: true,
})
```

### Desenvolvimento

```js
const eta = new Eta({
  views: path.join(import.meta.dirname, "templates"),
  cache: false,
  debug: true,
})
```

### Tags customizadas + varName

```js
const eta = new Eta({ tags: ["{{", "}}"], varName: "data" })
// "Hi {{= data.name }}"
```

### Extrair campos com `functionHeader`

Evita `useWith` e melhora legibilidade/performance:

```js
const eta = new Eta({
  functionHeader: "const name = it.name, age = it.age",
})
// "Hi <%= name %>, you are <%= age %> years old"
```

### Auto-filter

```js
const eta = new Eta({
  autoFilter: true,
  filterFunction: (val) => (typeof val === "string" ? val.toUpperCase() : val),
})
```

> `filterFunction` deve retornar algo stringificável; o resultado ainda passa
> pelo escape quando a tag é `<%=`.

## `outputFunctionName`

Define o nome da função que escreve no output (equivalente ao
`outputFunctionName` do EJS). Padrão `"output"`:

```eta
<% output("<li>" + it.item + "</li>") %>
```

```js
new Eta({ outputFunctionName: "emit" })
// agora: <% emit("...") %>
```

> Ao trocar o nome, `output` deixa de existir. Use um identificador JS válido.

## Plugins

```ts
plugins: Array<{
  processFnString?: (fnString: string, env?: EtaConfig) => string
  processAST?: (ast: AstObject[], env?: EtaConfig) => AstObject[]
  processTemplate?: (fnString: string, env?: EtaConfig) => string
}>
```

Hooks para transformar a função gerada, a AST ou a string da template antes de
compilar. Avançado — use apenas se precisar de transformações estruturais.

Exemplo (prepend de um banner na função gerada):

```js
const eta = new Eta({
  plugins: [{
    processFnString: (fn) => "/* gerado por eta */\n" + fn,
  }],
})
```
