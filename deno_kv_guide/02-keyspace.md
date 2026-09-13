# 02 — Key Space, Valores e Versionstamp

> O key space do Deno KV é um namespace **plano** de pares
> chave+valor+versionstamp. Chaves são **sequências de partes** (arrays), o que
> permite modelar dados hierárquicos sem delimitadores visíveis.

## 1. Chaves

Uma chave é um **array** cujas partes podem ser:

```ts
type KvKeyPart = Uint8Array | string | number | bigint | boolean;
type KvKey = readonly KvKeyPart[];
```

> A referência da API do Deno também inclui `symbol` no tipo `KvKeyPart` (uso
> avançado/interno). A ordenação documentada cobre os cinco tipos acima; use
> apenas esses no seu modelo.

Exemplos canônicos (do domínio MTR/SINIR e genéricos):

```js
["users", 42, "profile"];                          // perfil do usuário 42
["mtr", "PE-2026-0001"];                           // MTR por número
["mtr", "PE-2026-0001", "residuos"];               // resíduos do MTR
["mtr_por_status", "emitido", "PE-2026-0001"];     // índice secundário
["posts", "2023-04-23", "comments"];               // comentários do dia
["products", "electronics", "smartphones", "apple"];
["orders", 1001, "shipping", "tracking"];
["files", new Uint8Array([1, 2, 3]), "metadata"];
["teams", "engineering", "members", 1n];
```

**Por que array e não string?** Não há delimitador visível → impossível injeção
de delimitador. `["abc","def"]`, `["ab","cdef"]` e `["abc","","def"]` são
chaves **diferentes**. Chaves string planas do tipo `"mtr:" + numero` abrem
espaço para colisão quando o input do usuário contém `:`.

### Regras

- Chaves são **case-sensitive**.
- Tamanho máximo da chave: **2 KiB** (serializada).
- Partes são ordenadas por **tipo** e, dentro do tipo, por **valor**.

## 2. Ordem das partes (define a listagem)

Ordem dos **tipos**:

1. `Uint8Array`
2. `string`
3. `number`
4. `bigint`
5. `boolean`

Dentro de um tipo:

- `Uint8Array`: byte a byte.
- `string`: bytes da codificação UTF-8.
- `number`: `-Infinity < -1.0 < -0.5 < -0.0 < 0.0 < 0.5 < 1.0 < Infinity < NaN`.
- `bigint`: ordem matemática (menor negativo primeiro).
- `boolean`: `false < true`.

O **tipo vence o valor**: `1.0` (number) vem **antes** de `2.0`, mas **depois**
de `0n` (bigint), porque number < bigint na ordem de tipos.

A primeira parte é a mais significativa; a última, a menos. `kv.list` percorre a
parte seguinte ao prefixo em ordem lexicográfica:

```js
["preferences", "ada"];   // 1º
["preferences", "bob"];   // 2º
["preferences", "cassie"];// 3º
```

## 3. ULIDs e ordenação cronológica

Combine timestamp + ID para listar em ordem de inserção:

```js
await kv.set(["users", Date.now(), crypto.randomUUID()], user);
```

Chaves geradas:

```js
["users", 1691377037923, "8c72fa25-40ad-42ce-80b0-44f79bc7a09e"];
["users", 1691377037924, "8063f20c-8c2e-425e-a5ab-d61e7a717765"];
```

Um **ULID** encapsula timestamp+aleatoriedade numa única string ordenável:

```js
import { ulid } from "jsr:@std/ulid";

await kv.set(["users", ulid()], user);
// ["users", "01H76YTWK3YBV020S6MP69TBEQ"]
```

Para ordem **estrita** mesmo com o mesmo milissegundo, use `monotonicUlid`:

```js
import { monotonicUlid } from "jsr:@std/ulid";

await kv.set(["users", monotonicUlid()], user);
// ["users", "01H76YTWK3YBV020S6MP69TBEQ"]
// ["users", "01H76YTWK3YBV020S6MP69TBER"]  (incrementa o bit menos significativo)
```

> **Projeto:** use ULID (`jsr:@std/ulid`) quando precisar de ordenação temporal
> em uma única parte; `Date.now()` + `crypto.randomUUID()` quando quiser separar
> os eixos (filtrar por intervalo de tempo com `start`/`end`).

## 4. Valores (structured clone)

Valores podem ser qualquer coisa compatível com o
[structured clone algorithm](https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Structured_clone_algorithm):

- `undefined`, `null`, `boolean`, `number`, `string`, `bigint`
- `Uint8Array`, `Array`, `Object`, `Map`, `Set`, `Date`, `RegExp`

Objetos/arrays podem conter esses tipos, inclusive aninhados. `Map`/`Set` também.
**Referências circulares são suportadas.**

```js
undefined;
null;
true;
42;
-42.5;
42n;
"hello";
new Uint8Array([1, 2, 3]);
[1, 2, 3];
{ a: 1, b: 2, c: 3 };
new Map([["a", 1]]);
new Set([1, 2, 3]);
new Date("2023-04-23");
/abc/;

// circular
const a = {};
const b = { a };
a.b = b;
```

### NÃO suportado como valor

- Funções e `Symbol`.
- Objetos com protótipo não-primitivo (instâncias de classe, objetos de Web
  API). Ou seja: não guarde `new MeuModelo()`; guarde **objeto plano**.
- `undefined` **como chave** (parte de chave não aceita `undefined`).

> **Projeto:** converta DTOs de classe para objeto plano antes de `set`. Um
> `Date` é preservado pelo structured clone; `undefined` em propriedade também.
> Tamanho máximo do valor: **64 KiB** (serializado).

## 5. `Deno.KvU64` — inteiro de 64 bits

Tipo especial para contadores/max/min atômicos. **Só** pode ser valor de
**topo** (não dentro de objeto/array):

```js
const u64 = new Deno.KvU64(42n);
u64.value; // 42n
```

- Usado por `sum`, `min`, `max` (em `04-transactions.md`).
- Operando e valor armazenado precisam ser `Deno.KvU64`.
- Estouro de faixa **dá wrap around** na aritmética de 2^64.

```js
await kv.atomic()
  .mutate({
    type: "sum",
    key: ["accounts", "alex"],
    value: new Deno.KvU64(100n),
  })
  .commit();
```

## 6. Versionstamp

Todo valor tem um **versionstamp** atribuído na escrita:

- **String opaca** (não parseie), monotonicamente crescente e **não sequencial**.
  Os docs oficiais descrevem um valor de 12 bytes; na prática, trate-o sempre
  como uma string opaca.
- Representa a **ordem** das modificações, não o relógio real.
- Comparação lexicográfica == "mais novo":

```js
"000002fa526aaccb0000" > "000002fa526aacc90000"; // true
```

- Todos os valores escritos na **mesma** transação recebem o **mesmo**
  versionstamp.
- Usado para **controle de concorrência otimista (OCC)**: `check({ key,
  versionstamp })` falha se o valor mudou desde a leitura (`04`).

```ts
const entry = await kv.get(["mtr", "PE-2026-0001"]);
// entry.versionstamp === null  → chave não existe
// entry.versionstamp === "..." → versão atual
```

## 7. Checklist de modelagem

```
[ ] Chave é array namespaced, nunca string concatenada
[ ] Primeira parte identifica a entidade, a última o atributo
[ ] Prefixos usados em list têm partes inteiras
[ ] Valor é objeto plano (sem classe/função/Symbol)
[ ] Schema versionado: { v: 1, ... }
[ ] Datas em string ISO 8601 (não só Date) quando precisar comparar/ordenar
[ ] Contadores usam Deno.KvU64 + sum/min/max
[ ] TTL (expireIn) em cache/sessão/rate-limit
[ ] Nenhum valor > 64 KiB; nenhuma chave > 2 KiB
```
