# 20 — Apêndice: Como o Sistema Reativo Funciona

## Conceitos

O sistema reativo tem três tipos de nós:

| Tipo | Descrição | Sources | Subscribers |
|------|-----------|---------|-------------|
| **Signal** | Valor mutável | Nenhum | Outros nós |
| **Memo** | Valor derivado memoizado | Signals/memos | Effects/memos |
| **Effect** | Efeito colateral | Signals/memos | Nenhum |

Derived signals (`move || signal.get() * 2`) são closures comuns —
não são nós do grafo reativo.

## O Grafo Reativo

Signals são raízes (sem parents). Effects são folhas (sem children).
Memos são nós intermediários.

Exemplo simples:

```
A (signal: name)
|
B (memo: name_upper)
|
C (effect: log)
```

## O Problema do Diamante

```
  __A__
 |     |
 B     C
 |     |
 |__D__|
```

Sem cuidado, atualizar `A` notificaria `B` → `D`, depois `C` → `D`,
fazendo `D` rodar duas vezes.

### Solução: Push-Pull

Cada nó tem um estado:

| Estado | Significado |
|--------|-------------|
| `Clean` | Não mudou |
| `Check` | Pode ter mudado |
| `Dirty` | Com certeza mudou |

1. Atualizar signal A → marca A como `Dirty`, e **todos descendentes**
   como `Check`
2. Effects são enfileirados para re-execução
3. Antes de executar, cada effect **verifica** seus parents:
   - Vai a B (status Check) → B verifica A (Dirty) → B rerun → se mudou,
     D sabe que precisa rodar
   - Se B não mudou, D verifica C
4. Effect D roda **uma única vez**

Isso é "push-pull": empurra status `Check` para baixo, "puxa"
verificações para cima.

## Memos vs Derived Signals

| Critério | Memo | Derived Signal |
|----------|------|----------------|
| Nó no grafo | Sim | Não |
| Compara valor anterior | Sim (`PartialEq`) | Não |
| Custo | Overhead do grafo | Apenas closure |
| Quando usar | Computação cara | Computação barata |

```rust
// Use derived signal (barato)
let doubled = move || count.get() * 2;

// Use memo (caro)
let expensive = Memo::new(move |_| {
    some_heavy_computation(count.get())
});
```

## Signals vs Memos

- Signals sempre marcam subscribers como `Dirty`, mesmo se o valor
  for o mesmo
- Memos só notificam subscribers se o valor **realmente mudou**
  (compara via `PartialEq`)
