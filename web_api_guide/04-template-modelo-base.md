# Template Base para Documentação de Web APIs

## 1. Template para API Overview (`api/nome_api/index.md`)

```markdown
---
title: NOME API
slug: Web/API/NOME_API
page-type: web-api-overview
browser-compat: api.nome
spec-urls: https://spec.url/
---

{{DefaultAPISidebar("NOME API")}}[BADGES]

A **NOME API** fornece [definição em 1-3 frases — o que faz, problema que resolve].

## Concepts and usage

[Explicação conceitual: qual problema resolve, como se diferencia, fluxo básico.]

### [Sub-conceito 1]

[Explicação detalhada do sub-conceito.]

### [Sub-conceito 2]

[Explicação detalhada.]

## Interfaces

### [Categoria 1]

- {{DOMxRef("Interface1")}} — [descrição curta]
- {{DOMxRef("Interface2")}} — [descrição curta]

### [Categoria 2]

- {{DOMxRef("Interface3")}} — [descrição curta]

## Extensions to other interfaces

_Esta API estende as seguintes interfaces:_

- {{DOMxRef("TargetInterface")}}:
  - {{domxref("TargetInterface.newProperty")}}
  - {{domxref("TargetInterface.newMethod()")}}

## Guides

- [Using the API](/en-US/docs/Web/API/NOME_API/Using_the_API)
- [Concepts](/en-US/docs/Web/API/NOME_API/Concepts)

## Security requirements

- [Secure context](/en-US/docs/Web/Security/Secure_Contexts): [se aplicável]
- [Permissions-Policy](/en-US/docs/Web/HTTP/Permissions_Policy): [se aplicável]
- [CSP](/en-US/docs/Web/HTTP/CSP): [se aplicável]

## Examples

### [Example name]

```js
// Código do exemplo com tratamento de erro
try {
  const result = await api.method();
  console.log(result);
} catch (error) {
  console.error('Error:', error);
}
```

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- [Related API](/en-US/docs/Web/API/Related_API)
- [Guide on topic](/en-US/docs/Web/Guides/Topic)
```

## 2. Template para Guide (`api/nome_api/using_api/index.md`)

```markdown
---
title: Using the NOME API
slug: Web/API/NOME_API/Using_the_API
page-type: guide
---

{{DefaultAPISidebar("NOME API")}}

The [NOME API](/en-US/docs/Web/API/NOME_API) provides [breve resumo].

## [Step/Topic 1]

[Explicação + código]

```js
// Código funcional
```

## [Step/Topic 2]

[Explicação + código]

```js
// Código funcional
```

## [Step/Topic 3]

[Explicação + código]

```js
// Código funcional
```

## See also

- [API Overview](/en-US/docs/Web/API/NOME_API)
- [Related guide](/en-US/docs/Web/API/NOME_API/Related_guide)
```

## 3. Template para Interface (`api/NomeInterface/index.md`)

```markdown
---
title: NomeInterface
slug: Web/API/NomeInterface
page-type: web-api-interface
browser-compat: api.NomeInterface
spec-urls: https://spec.url/#interface
---

{{APIRef("NOME API")}}[BADGES]

A interface **`NomeInterface`** da [NOME API](/en-US/docs/Web/API/NOME_API) [descrição].

## Constructor

- {{DOMxRef("NomeInterface.NomeInterface", "NomeInterface()")}}
  - : Cria e retorna uma nova instância de `NomeInterface`.

## Instance properties

- {{DOMxRef("NomeInterface.property1")}} {{ReadOnlyInline}}
  - : [Descrição + tipo + se read-only]
- {{DOMxRef("NomeInterface.property2")}}
  - : [Descrição + tipo]

## Instance methods

- {{DOMxRef("NomeInterface.method1()")}}
  - : [Descrição + se retorna algo]
- {{DOMxRef("NomeInterface.method2()")}}
  - : [Descrição]

## Static methods

- {{DOMxRef("NomeInterface.staticMethod()")}}
  - : [Descrição]

## Events

- {{DOMxRef("NomeInterface.eventname_event", "eventname")}}
  - : Disparado quando [condição].

## Examples

### [Example name]

```js
// Exemplo de uso da interface
```

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- [NomeInterface API](/en-US/docs/Web/API/NOME_API)
```

## 4. Template para Subpágina de Método (`api/NomeInterface/metodo/index.md`)

```markdown
---
title: "NomeInterface.metodo()"
slug: Web/API/NomeInterface/metodo
page-type: web-api-instance-method
browser-compat: api.NomeInterface.metodo
---

{{APIRef("NOME API")}}

O método **`metodo()`** da interface {{DOMxRef("NomeInterface")}} [descrição].

## Syntax

```js-nolint
metodo(param1)
metodo(param1, param2)
```

### Parameters

- `param1` {{OptionalInline}}
  - : [Descrição + tipo + se opcional]
- `param2`
  - : [Descrição + tipo]

### Return value

[Tipo do retorno e descrição]

### Exceptions

- `TypeError`
  - : [Condição que dispara]
- `InvalidStateError` {{domxref("DOMException")}}
  - : [Condição que dispara]

## Examples

### [Example name]

```js
// Exemplo
```

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("NomeInterface")}}
- [Related API](/en-US/docs/Web/API/Related_API)
```

## 5. Template para Subpágina de Propriedade (`api/NomeInterface/propriedade/index.md`)

```markdown
---
title: "NomeInterface.propriedade"
slug: Web/API/NomeInterface/propriedade
page-type: web-api-instance-property
browser-compat: api.NomeInterface.propriedade
---

{{APIRef("NOME API")}}

A propriedade **`propriedade`** ({{ReadOnlyInline}}) da interface {{DOMxRef("NomeInterface")}} [descrição + tipo].

## Value

[Tipo do valor e descrição]

## Examples

### [Example name]

```js
// Exemplo
```

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("NomeInterface")}}
```

## 6. Convenções Rápidas

### Badges por Contexto

| Contexto | Badge |
|----------|-------|
| HTTPS obrigatório | `{{securecontext_header}}` |
| Disponível em workers | `{{AvailableInWorkers}}` |
| Apenas window+dédicated | `{{AvailableInWorkers("window_and_dedicated")}}` |
| Exceto service workers | `{{AvailableInWorkers("window_and_worker_except_service")}}` |
| Experimental | `{{SeeCompatTable}}` |
| Deprecated | `{{deprecated_header}}` |
| Non-standard | `{{non-standard_header}}` |
| Read-only (inline) | `{{ReadOnlyInline}}` |
| Experimental (inline) | `{{experimental_inline}}` |

### Ordem Correta dos Elementos

1. Sidebar (`{{DefaultAPISidebar}}` ou `{{APIRef}}`)
2. Badges de contexto (securecontext, workers)
3. Badges de status (experimental, deprecated)
4. Título implícito (vem do front matter `title`)
5. Parágrafo de definição
6. Conteúdo da página
7. `{{Specifications}}` e `{{Compat}}`
8. `## See also`
