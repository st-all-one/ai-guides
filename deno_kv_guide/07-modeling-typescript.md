# 07 — Modelagem de Dados em TypeScript

> Interfaces/classes descrevem o dado, mas o KV não conhece tipos em runtime.
> Este guia cobre como ir e voltar com **segurança de tipos**: interfaces,
> parâmetro genérico, service layer e hidratação de associações.

## 1. Interfaces e type assertions

Descreva o dado como DTO:

```ts
// model.ts
export interface Author {
  username: string;
  fullName: string;
}

export interface Post {
  slug: string;
  title: string;
  body: string;
  author: Author;
  createdAt: Date;
  updatedAt: Date;
}
```

Gravar é direto (objeto plano):

```ts
import type { Author } from "./model.ts";

const kv = await getKv();
const a: Author = { username: "acdoyle", fullName: "Arthur Conan Doyle" };
await kv.set(["authors", a.username], a);
```

Ao ler, o valor volta sem tipo. Use **type assertion** ou o **parâmetro
genérico** de `get`:

```ts
const r = await kv.get(["authors", "acdoyle"]);
const ac = r.value as Author;

// ou, preferível: já tipa r.value
const r2 = await kv.get<Author>(["authors", "acdoyle"]);
r2.value?.fullName; // string | undefined (value é Author | null)
```

> `kv.get<T>` retorna `KvEntryMaybe<T>`, então `r2.value` é `T | null`. **SEMPRE**
> trate o `null` antes de acessar. Com `noUncheckedIndexedAccess` e `strict`, o
> TS obriga esse narrowing.

## 2. Service layer (lógica de negócio)

Para dados simples, a asserção basta. Quando há índice secundário, relação entre
objetos ou validação, crie funções que encapsulam o KV e devolvem objetos
tipados e "hidratados".

`RawPost` estende `Post` com o **identificador do autor** (ponteiro), porque o
valor salvo não embute o `Author` completo:

```ts
import type { Author, Post } from "./model.ts";

const kv = await getKv();

interface RawPost extends Post {
  authorUsername: string;
}

export async function savePost(p: Post): Promise<Post> {
  const postData: RawPost = Object.assign({}, p, {
    authorUsername: p.author.username,
  });
  await kv.set(["posts", p.slug], postData);
  return p;
}

export async function getPost(slug: string): Promise<Post | null> {
  const postResponse = await kv.get<RawPost>(["posts", slug]);
  if (postResponse.value === null) return null;

  const rawPost = postResponse.value;
  const authorResponse = await kv.get<Author>(["authors", rawPost.authorUsername]);
  const author = authorResponse.value ?? {
    username: rawPost.authorUsername,
    fullName: "",
  };

  const { authorUsername: _omitir, ...post } = rawPost;
  return { ...post, author };
}
```

- `savePost` serializa a associação como ponteiro.
- `getPost` faz o **double lookup** e devolve `Post` completo.
- Mantenha o KV dentro do service layer; componentes/handlers chamam funções de
  domínio, não `kv.get` direto (exceto leitura trivial).

## 3. Mapeamento de tipos ↔ valores do KV

| Tipo TS | Suporte no KV | Observação |
|---------|---------------|------------|
| `string`, `number`, `boolean`, `bigint`, `null`, `undefined` | direto | `undefined` em propriedade é preservado |
| `Date` | direto | structured clone mantém `Date` |
| `Uint8Array` | direto | binários; bom para PDF/XML |
| `Array`, objeto plano | direto | aninhamento livre, inclusive circular |
| `Map`, `Set` | direto | preserve ao hidratar |
| `RegExp` | direto | — |
| `Deno.KvU64` | direto (topo) | só como valor de topo |
| instância de classe | **não** | converta para objeto plano antes |
| `function`, `Symbol` | **não** | não serializáveis |

**SEMPRE** converta classe → objeto plano na escrita:

```ts
class PostEntity { constructor(public slug: string, public title: string) {} }

await kv.set(["posts", p.slug], { slug: p.slug, title: p.title }); // ✅
```

## 4. Versionamento de schema

Evolução de schema é inevitável. Versione o valor e trate na leitura:

```ts
interface MtrV1 {
  v: 1;
  numero: string;
  status: string;
}

interface MtrV2 extends Omit<MtrV1, "v"> {
  v: 2;
  atualizadoEm: string;
}

type MtrAtual = MtrV1 | MtrV2;

function migrar(valor: MtrAtual): MtrV2 {
  if (valor.v === 1) {
    return { ...valor, v: 2, atualizadoEm: new Date(0).toISOString() };
  }
  return valor;
}
```

Alternativa: usar a forma do objeto para detectar a versão (`if (!("v" in
valor))`). **NUNCA** assuma que todo valor no KV está no schema mais recente.

## 5. `getMany` tipado

`getMany` aceita uma tupla para tipar cada posição:

```ts
const [config, contador, lista] = await kv.getMany<
  [{ tema: string }, number, string[]]
>([
  ["config", "ui"],
  ["stats", "visitas"],
  ["mtr", "recentes"],
]);
```

Ou um array homogêneo:

```ts
const entries = await kv.getMany<Mtr[]>(keys);
const mtrs = entries.map((e) => e.value).filter((v): v is Mtr => v !== null);
```

## 6. `KvEntryMaybe` e narrowing

```ts
const entry = await kv.get<Mtr>(["mtr", numero]);
if (entry.value === null) {
  throw new HttpError(404, "MTR não encontrado"); // narrowing para Mtr
}
entry.value.status; // ok
```

Evite `!` (non-null assertion); prefira o guard `if (v === null)`. O type
predicate `(v): v is Mtr => v !== null` mantém o array tipado após `filter`.

## 7. Checklist

```
[ ] Todo `get<T>`/`getMany<...>` com tipo explícito
[ ] `value === null` tratado antes do acesso
[ ] Classes convertidas para objeto plano antes de `set`
[ ] Campo `v` (schema) no valor + tratamento de migração na leitura
[ ] Service layer faz os double lookups de índice/relação
[ ] Handlers/componentes não acessam `kv` cru além do trivial
```
