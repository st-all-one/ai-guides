# Arquitetura e Fundamentos do Lit

## Hierarquia de Classes

```
HTMLElement (nativo do browser)
  └── ReactiveElement (properties reativos + ciclo de update)
       └── LitElement (templates + render())
```

### HTMLElement
- Base nativa para todos os elementos HTML
- Ciclo de vida: `constructor()` → `connectedCallback()` → `disconnectedCallback()` → `attributeChangedCallback()` → `adoptedCallback()`

### ReactiveElement
- Implementa **propriedades reativas** com getters/setters
- Gerencia **observação de atributos** e conversão
- Ciclo de **update reativo**: `requestUpdate()` → `update()` → `updated()`
- Suporta `ReactiveController` via `addController()`

### LitElement
- Herda de `ReactiveElement`
- Adiciona sistema de **templates** via `lit-html`
- Implementa `render()` → retorna `TemplateResult`
- Gerencia `renderRoot` (Shadow Root por padrão)

## Ciclo de Update Reativo

```
Propriedade modificada
    │
    ▼
setter → requestUpdate()
    │
    ▼
requestAnimationFrame / microtask
    │
    ▼
performUpdate() (batch)
    │
    ├── shouldUpdate(changedProperties)
    ├── willUpdate(changedProperties)
    ├── update(changedProperties)
    │     ├── render() → TemplateResult
    │     └── updateComplete Promise
    ├── updated(changedProperties)
    └── updateComplete resolved
```

### Detalhamento do Ciclo

1. **`requestUpdate(propertyName, oldValue)`**
   - Chamado automaticamente pelo setter de toda reactive property
   - Pode ser chamado manualmente para forçar update
   - Agenda `performUpdate()` assincronamente (microtask)

2. **`shouldUpdate(changedProperties)`**
   - Retorna `boolean` — controle se o update deve ocorrer
   - Útil para pular renders desnecessários
   - `changedProperties` é um `Map<propertyName, oldValue>`

3. **`willUpdate(changedProperties)`**
   - Executado **antes** de `update()`/`render()`
   - Ideal para computar valores derivados de props
   - Pode modificar outras props **sem** disparar novo update

4. **`update(changedProperties)`**
   - Executa `render()` e reflete atributos
   - Não deve ter side effects
   - Retorna `void`; o TemplateResult é consumido internamente

5. **`updated(changedProperties)`**
   - Executado **após** a renderização no DOM
   - Ideal para medir elementos, acessar DOM atualizado
   - Cuidado: modificar props aqui causa novo ciclo

6. **`updateComplete`**
   - Promise que resolve quando o update atual termina
   - `await element.updateComplete` para saber que o componente terminou de renderizar

### Ordem de Execução com Controllers

Controllers registrados via `addController()` têm seus hooks chamados **antes** do componente:

```
hostConnected()  ← de cada controller (em ordem de registro)
connectedCallback()  ← do componente

hostUpdate()  ← de cada controller (em ordem de registro)
willUpdate()  ← do componente
update() / render()  ← do componente
hostUpdated()  ← de cada controller (em ordem de registro)
updated()  ← do componente

hostDisconnected()  ← de cada controller (em ordem de registro)
disconnectedCallback()  ← do componente
```

## Reactive Properties vs. State

| Característica | `@property()` | `@state()` |
|----------------|---------------|------------|
| Uso | API pública do componente | Estado interno |
| Atributo observado | Sim (por padrão) | Não |
| Refletido para atributo | Configurável | Não |
| Acesso externo | Sim | Não recomendado |
| TypeScript | Public | Protected/private |

## Propriedades Reativas — Opções

```typescript
@property({
  attribute: 'my-prop',   // nome do atributo (false desativa)
  type: String,            // para conversão automática
  reflect: true,           // reflete de volta ao atributo
  converter: {             // conversor customizado
    fromAttribute: (v, type) => v,
    toAttribute: (v, type) => String(v)
  },
  hasChanged: (newVal, oldVal) => newVal !== oldVal,
  noAccessor: false,       // não gerar getter/setter
  state: false,            // estado interno
  useDefault: false        // não refletir valor inicial
})
```

## Modo Sem Shadow DOM

```typescript
class MyElement extends LitElement {
  // Renderiza no DOM aberto (sem Shadow Root)
  createRenderRoot() {
    return this; // ou this.attachShadow({mode: 'open'}) para default
  }
}
```

### Implicações de renderizar sem Shadow DOM:

- **Estilos não são encapsulados** — CSS do componente vaza, e CSS externo afeta o componente
- **IDs e seletores** podem colidir com o resto da página
- **Slots não funcionam** — sem Shadow DOM, não há `<slot>`
- **Performance** — ligeiramente mais rápido por não ter Shadow Root, mas perde os benefícios de encapsulamento
- **Formulários** — elementos sem Shadow DOM integram-se naturalmente com `<form>`

## Controle do Render Root

```typescript
// Shadow DOM (padrão) — encapsulado
createRenderRoot() {
  return this.attachShadow({mode: 'open', delegatesFocus: true});
}

// Light DOM — sem encapsulamento
createRenderRoot() {
  return this;
}

// Shadow DOM fechado (não recomendado)
createRenderRoot() {
  return this.attachShadow({mode: 'closed'});
}
```

## Padrão: Sempre usar Shadow DOM?

| Cenário | Shadow DOM? | Motivo |
|---------|-------------|--------|
| Design system / lib compartilhada | **Sim** | Isolamento total de estilos |
| App monolítico sem terceiros | Pode não usar | Simplicidade, performance |
| Componentes de formulário | Depende | `<form>` não enxerga inputs dentro de Shadow Root |
| SSR com hydration | **Sim** | `declarative-shadow-dom` permite hidratação |
| Micro-frontends | **Sim** | Isolamento entre equipes |
