# Template para Subpáginas de Construtor

## Visão Geral

Construtores são subpáginas localizadas em `api/NomeInterface/NomeInterface/index.md` (slug repete o nome). Estrutura distinta de métodos e eventos.

## Anatomia

```
api/
  NomeInterface/
    NomeInterface/
      index.md
```

**Nota**: O slug é `Web/API/NomeInterface/NomeInterface` (nome da interface repetido).

## Front Matter

```yaml
---
title: 'NomeInterface()'
slug: Web/API/NomeInterface/NomeInterface
page-type: web-api-constructor
browser-compat: api.NomeInterface.NomeInterface
---
```

### Campos

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| `title` | `'NomeInterface()'` — nome seguido de `()` | Sim |
| `slug` | `Web/API/NomeInterface/NomeInterface` | Sim |
| `page-type` | `web-api-constructor` | Sim |
| `browser-compat` | `api.NomeInterface.NomeInterface` | Sim |
| `status` | Opcional: `[experimental]`, `[deprecated, non-standard]` | Não |

## Template Completo

```markdown
---
title: 'Request()'
slug: Web/API/Request/Request
page-type: web-api-constructor
browser-compat: api.Request.Request
---

{{APIRef("Fetch API")}}{{securecontext_header}}

O construtor **`Request()`** cria um novo objeto {{domxref("Request")}}.

## Sintaxe

```js-nolint
new Request(input)
new Request(input, options)
```

### Parâmetros

- `input`
  - : Uma string {{domxref("USVString")}} ou um objeto {{domxref("Request")}} representando a URL ou outra requisição.
    - Se for uma string, é interpretada como a URL do recurso.
    - Se for um objeto `Request`, cria uma cópia com novos `options` aplicados.
- `options` {{optional_inline}}
  - : Um objeto contendo as seguintes propriedades:
    - `method` {{optional_inline}}
      - : O método HTTP (`"GET"`, `"POST"`, etc.). Padrão: `"GET"`.
    - `headers` {{optional_inline}}
      - : Um objeto {{domxref("Headers")}}, ou um objeto literal contendo pares chave/valor.
    - `body` {{optional_inline}}
      - : O corpo da requisição. Pode ser uma string, {{domxref("Blob")}}, {{domxref("BufferSource")}}, {{domxref("FormData")}}, {{domxref("URLSearchParams")}}, ou {{domxref("ReadableStream")}}.

### Valor de retorno

Um novo objeto {{domxref("Request")}}.

### Exceções

- `TypeError`
  - : Lançada se o `input` não for uma URL válida, ou se `method` não for um método HTTP válido.
- `SyntaxError` {{deprecated_inline}}
  - : Lançada se a string de URL estiver mal formatada.

## Descrição

_(opcional — contexto adicional sobre uso, restrições, dicas)_

## Exemplos

### Criando uma requisição GET

```js
const request = new Request('https://api.example.com/data');
fetch(request).then(response => console.log(response));
```

### Criando uma requisição POST com corpo JSON

```js
const request = new Request('https://api.example.com/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
fetch(request);
```

## Especificações

{{Specifications}}

## Compatibilidade com navegadores

{{Compat}}

## Veja também

- {{domxref("Request")}}
- {{domxref("Response")}}
- {{domxref("fetch()")}}
```

## Seções Específicas de Construtor

### `parâmetros`

Diferente de métodos, construtores usam terminologia específica:

| Conceito | Descrição |
|----------|-----------|
| `input` | Parâmetro posicional obrigatório (primeiro argumento) |
| `options` | Objeto de configuração com propriedades opcionais |
| `{{optional_inline}}` | Badge para parâmetros opcionais |

### `exceções`

Essencial para construtores — documentar quais exceções são lançadas e em quais condições:

```markdown
### Exceções

- `TypeError`
  - : Lançada se [condição].
- `RangeError`
  - : Lançada se [condição].
- `SyntaxError` {{deprecated_inline}}
  - : Lançada se [condição].
```

### `valor de retorno`

Sempre documentar que retorna uma nova instância da interface:

```markdown
### Valor de retorno

Um novo objeto {{domxref("NomeInterface")}}.
```

## Casos Especiais

### Construtor sem parâmetros

```markdown
## Sintaxe

```js-nolint
new NomeInterface()
```

### Construtor com overloads

Usar `js-nolint` com múltiplas linhas para mostrar assinaturas alternativas:

```js-nolint
new NomeInterface(param1)
new NomeInterface(param1, param2)
```

### Construtor que lança exceções específicas

Se o construtor tem validações que lançam `TypeError`, `RangeError`, etc., documentar cada uma com sua condição.

## Anti-patterns

1. **Título sem parênteses**: Sempre usar `NomeInterface()` com parênteses
2. **Confundir `sintaxe` com método**: Construtores usam `new NomeInterface()`, não chamada direta
3. **`js-nolint` vs `js`**: Usar `js-nolint` para blocos de sintaxe (não executáveis); `js` para exemplos executáveis
4. **Parâmetros como propriedades**: Parâmetros do construtor NÃO são a mesma coisa que propriedades da interface — documentar separadamente
