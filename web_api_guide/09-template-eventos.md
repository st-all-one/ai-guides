# Template para Subpáginas de Evento

## Visão Geral

Eventos são um tipo de subpágina dentro de uma interface, localizados em `api/NomeInterface/nome_evento/`. Centenas existem no repositório. Estrutura distinta de métodos e propriedades.

## Anatomia

```
api/
  NomeInterface/
    nome_evento/
      index.md
```

## Front Matter

```yaml
---
title: 'NomeInterface: nome_evento event'
slug: Web/API/NomeInterface/nome_evento_event
page-type: web-api-event
browser-compat: api.NomeInterface.nome_evento_event
---
```

### Campos

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| `title` | `'NomeInterface: nome_evento event'` — Nome da interface + "event" | Sim |
| `slug` | `Web/API/NomeInterface/nome_evento_event` | Sim |
| `page-type` | `web-api-event` | Sim |
| `browser-compat` | `api.NomeInterface.nome_evento_event` | Sim |
| `status` | Opcional: `[experimental]`, `[deprecated, non-standard]` | Não |

## Template Completo

```markdown
---
title: 'AudioContext: statechange event'
slug: Web/API/AudioContext/statechange_event
page-type: web-api-event
browser-compat: api.AudioContext.statechange_event
---

{{APIRef("Web Audio API")}}{{securecontext_header}}

O evento **`statechange`** da interface {{domxref("AudioContext")}} é disparado quando o estado do `AudioContext` muda.

## Sintaxe

Use o nome do evento em métodos como {{domxref("EventTarget.addEventListener", "addEventListener()")}} ou defina uma propriedade de manipulador de eventos.

```
addEventListener('statechange', (event) => { });
onstatechange = (event) => { };
```

## Tipo de Evento

Um {{domxref("Event")}} genérico. (Ou: `{{domxref("NomeDoEventoEspecifico")}}`, herdando de `Event`.)

## Bubbling

_(opcional — incluir apenas se o evento faz bubbling)_

Este evento **faz bubbling** / **não faz bubbling**. O elemento alvo é o {{domxref("NomeInterface")}}.

## Cancelável

_(opcional)_

Este evento **é** / **não é** cancelável.

## Propriedades do Evento

_(incluir apenas se o evento não for `Event` genérico)_

_Além das propriedades padrão de `Event`, as seguintes estão disponíveis:_

- {{domxref("NomeEvento.nomePropriedade", "nomePropriedade")}} {{ReadOnlyInline}}
  - : Descrição da propriedade.

## Descrição

_(seção opcional — contexto adicional sobre quando/quando o evento é disparado, relação com outras funcionalidades)_

## Exemplos

### Título do exemplo

```js
// código do exemplo
element.addEventListener('nome_evento', (event) => {
  console.log(event);
});
```

## Especificações

{{Specifications}}

## Compatibilidade com navegadores

{{Compat}}

## Veja também

- {{domxref("NomeInterface")}}
- {{domxref("NomeInterface.outro_evento_event", "outro_evento event")}}
- [Link para guia relevante](/pt-BR/docs/Web/API/NomeAPI/guia)
```

## Seções Opcionais

### `bubbling` e `cancelável`

Incluir APENAS quando o evento não for um `Event` genérico:

```markdown
## Bubbling

Este evento não faz bubbling.

## Cancelável

Este evento não é cancelável.
```

### `propriedades do evento`

Incluir APENAS quando o tipo do evento for uma subclasse de `Event` com propriedades adicionais:

```markdown
## Propriedades do Evento

_Além das propriedades listadas abaixo, as propriedades da interface pai {{domxref("Event")}} estão disponíveis._

- {{domxref("ClipboardEvent.clipboardData", "clipboardData")}} {{ReadOnlyInline}}
  - : Um {{domxref("DataTransfer")}} contendo os dados da área de transferência.
```

### `descrição`

Incluir APENAS quando o comportamento do evento precisar de explicação além do resumo inicial. Útil para:
- Explicar condições de disparo
- Relação com permissões/API
- Diferenças entre implementações

## Padrões de Conteúdo por Tipo de Evento

| Tipo de Evento | `page-type` | Conteúdo Mínimo |
|----------------|-------------|-----------------|
| `Event` genérico | `web-api-event` | Sintaxe + Tipo + Exemplo + Specs + Compat |
| Subclasse de `Event` (ex: `ClipboardEvent`, `MouseEvent`) | `web-api-event` | Adicionar seção Propriedades do Evento |
| Bubbling event | `web-api-event` | Adicionar seção Bubbling + Cancelável |

## Anti-patterns

1. **Tipo de evento ausente**: Sempre documentar explicitamente o tipo (`Event` genérico ou subclasse)
2. **Documentar bubbling quando não aplicável**: Incluir seção bubbling apenas quando o evento tem comportamento específico
3. **Propriedades duplicadas**: Não listar propriedades já documentadas na interface pai `Event`
4. **Seção "Sintaxe" ausente**: Essencial para mostrar como usar `addEventListener` e o manipulador `on...`
