# 21 — Apêndice: Ciclo de Vida de Signals

Três perguntas comuns:
1. Como conectar ao lifecycle (mount/unmount)?
2. Quando signals são descartados?
3. Como signals são `Copy` sem `Clone` explícito?

## Árvore de Componentes vs Árvore de Decisões

Componentes **não existem em runtime**. São apenas chamadas de função.
O que realmente existe é a **árvore de decisões**: effects aninhados que
refletem o fluxo condicional do seu `view!`.

```
App
├── render <button>
└── if count % 2 == 0
    ├── render <p> even
    └── else
        ├── Effect (log count)
        ├── render <p> OddDuck
        └── Effect (update <p> signal)
```

Effects são criados/destruídos conforme as decisões mudam.

## Ownership Tree (Árvore de Propriedade)

O "dono" de um effect é o effect/memo que estava rodando quando ele
foi criado. Donos "limpam" seus filhos antes de re-executar.

### Effects são cancelados

Quando um effect pai re-executa, ele:
1. Cancela/dispõe todos os effects filhos
2. Re-executa (criando novos effects se necessário)

Isso significa que quando `count` vai de ímpar para par, os effects
que atualizavam o `<p>` ímpar são automaticamente descartados.

### Signals são arena-allocated

Signals são **índices** em uma arena (estrutura de dados global),
não ponteiros com reference counting. Por isso são `Copy`.

```
let (count, set_count) = signal(0);
// count é essencialmente um usize: "índice 3 na arena"
```

O ciclo de vida do signal é vinculado ao **owner** (efeito/memo
que estava rodando quando foi criado).

## Problemas Potenciais

### Signal acessado após ser descartado

Se você "iça" um signal para cima na árvore de decisões (cria num
nível baixo, armazena num nível alto), ele pode ser acessado após
o owner ter limpado:

```rust
let stored: Vec<ReadSignal<i32>> = vec![];

// Isso pode ser problemático se `stored` sobreviver ao owner
```

Se você tentar **atualizar** um signal descartado → warning.
Se você tentar **ler** um signal descartado → panic (use `.try_get()`).

### Signal vazado

Criar signals num escopo alto e nunca descartá-los:

```rust
let todos: RwSignal<Vec<RwSignal<Todo>>> = RwSignal::new(vec![]);
// Adicionar um signal de todo e depois remover da lista
// sem manualmente dispor o signal do todo
```

### Solução: `ArcRwSignal` (reference-counted)

`ArcRwSignal`, `ArcReadSignal`, `ArcWriteSignal`, `ArcMemo`:
gerenciados por reference counting, não pela ownership tree.

Use para coleções de signals:

```rust
let sig = ArcRwSignal::new(42);
// Converte para RwSignal se necessário
let sig: RwSignal<i32> = RwSignal::from(sig);
```

## Ciclo de Vida do Componente (na prática)

| Momento | Como alcançar |
|---------|---------------|
| Antes do mount | Código no corpo da função componente |
| No mount (após render) | `Effect::new(...)` |
| No unmount | `on_cleanup(|| ...)` |

```rust
#[component]
fn MyComponent() -> impl IntoView {
    let (count, set_count) = signal(0);

    // "Antes do mount"
    logging::log!("setup");

    // "No mount" (tick após render)
    Effect::new(move |_| {
        logging::log!("count: {}", count.get());
    });

    // "No unmount"
    on_cleanup(|| {
        logging::log!("component cleaned up");
    });

    view! { <button on:click=move |_| *set_count.write() += 1>{count}</button> }
}
```

`on_cleanup` roda quando o owner (o effect que continha este componente)
re-executa ou é descartado.
