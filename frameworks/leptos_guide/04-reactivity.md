# 04 — Reatividade: Signals, Effects, Memos

O sistema reativo do Leptos é de grão fino. Ele consiste em duas metades:
**signals** (valores que mudam) e **effects** (código que reage a mudanças).

## Signals

### `signal()` — getter + setter

```rust
let (count, set_count) = signal(0);
```

Retorna um par `(ReadSignal<T>, WriteSignal<T>)`.

### Leitura

| Método | Descrição |
|--------|-----------|
| `.get()` | Clona o valor e subscribe |
| `.read()` | Read guard (sem clone), subscribe |
| `.with(f)` | Acessa por referência `&T`, subscribe |

### Escrita

| Método | Descrição |
|--------|-----------|
| `.set(val)` | Substitui o valor |
| `.write()` | Mutable guard (`&mut T`) |
| `.update(f)` | Mutação via closure `&mut T` |
| `.try_update(f)` | Como update, mas retorna valor |

Exemplo eficiente com `Vec`:

```rust
let (names, set_names) = signal(Vec::new());

// ❌ Clona o Vec inteiro
if names.get().is_empty() { }

// ✅ Lê por referência, sem clone
if names.read().is_empty() { }

// ✅ Mutation in-place
set_names.write().push("Alice".to_string());
```

### `RwSignal` — getter + setter unificado

```rust
let count = RwSignal::new(0);
*count.write() += 1;
let value = count.get();
```

### `ArcRwSignal` — reference-counted

Para coleções de signals (cada linha de uma lista):

```rust
let sig = ArcRwSignal::new(42);
// Pode ser convertido para RwSignal
let sig: RwSignal<i32> = RwSignal::from(sig);
```

## Signals Thread-Safe vs Locais

Por padrão, signals exigem `Send + Sync`. Para dados `!Send` (como tipos
`web-sys`), use variantes `_local`:

| Standard | Local |
|----------|-------|
| `signal()` | `signal_local()` |
| `RwSignal::new()` | `RwSignal::new_local()` |
| `Resource::new()` | `LocalResource::new()` |

## Nightly Syntax

Com a feature `nightly`, signals podem ser chamados como função:

```rust
let (count, set_count) = signal(0);
set_count(1);
logging::log!(count());  // count() == count.get()
```

## Derived Signals (Computações Simples)

Um closure que acessa signals é um "derived signal":

```rust
let doubled = move || count.get() * 2;
let is_odd = move || count.get() % 2 != 0;
```

## Memos

Memos são derived signals memoizados: só notificam subscribers se o
valor mudou (via `PartialEq`):

```rust
let doubled = Memo::new(move |_| count.get() * 2);
```

Use Memos para computações caras; para operações baratas,
derived signals são suficientes.

## Effects

`Effect::new` roda uma função que subscribe automaticamente a signals lidos.
Roda no próximo tick do sistema reativo (após a renderização do componente).

```rust
Effect::new(move |_| {
    logging::log!("Count: {}", count.get());
});
```

**Não roda no servidor** (use `Effect::new_isomorphic` se precisar).

### Auto-tracking e dependências dinâmicas

Dependências são rastreadas automaticamente. Se o effect contém um `if`,
apenas signals no branch executado são rastreados:

```rust
Effect::new(move |_| {
    if use_last.get() {
        format!("{} {}", first.get(), last.get())
    } else {
        first.get()
    }
});
```

Quando `use_last` é `false`, `last` é removido das dependências.

### Quando usar effects

Effects devem **sincronizar o sistema reativo com o mundo não-reativo**
(API, console, DOM, file system). Não use effects para escrever em outros
signals — prefira derived signals ou memos.

```rust
// ❌ Evite
Effect::new(move |_| {
    set_b.set(a.get() * 2);
});

// ✅ Prefira
let b = move || a.get() * 2;
```

### `Effect::watch()`

Separa o rastreamento da resposta:

```rust
let effect = Effect::watch(
    move || num.get(),
    move |num, prev_num, _| {
        logging::log!("Number: {}; Prev: {:?}", num, prev_num);
    },
    false, // immediate
);

effect.stop();
```

## Como fazer signals dependerem de outros signals

### ✅ Bom: B é função de A

```rust
let (count, set_count) = signal(1);
let doubled = move || count.get() * 2;
let memoized = Memo::new(move |_| count.get() * 2);
```

### ✅ Bom: C é função de A e B

```rust
let (first, set_first) = signal("Bridget".to_string());
let (last, set_last) = signal("Jones".to_string());
let full_name = move || format!("{} {}", first.read(), last.read());
```

### ✅ Bom: A e B são independentes, atualizados juntos

```rust
let clear_handler = move |_| {
    set_age.set(0);
    set_favorite_number.set(0);
};
```

### ⚠️ Evite: effect escrevendo em B quando A muda

Cria risco de loops infinitos e é menos eficiente.
