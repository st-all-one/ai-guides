# JSON:API Resources — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Recurso **novo no 13**: `JsonApiResource`
> serializa no formato JSON:API (resource objects, relationships, sparse fieldsets,
> includes, links, headers).

---

## 1. O que o framework faz por você

`JsonApiResource` estende `JsonResource` e automaticamente cuida da estrutura do
resource object (`id`, `type`, `attributes`), relacionamentos, sparse fieldsets,
includes, avaliação lazy de atributos e do header `Content-Type: application/vnd.api+json`
(`samples/doc-eloquent-resources.md:900-905`).

Limite de escopo: o recurso lida com **serialização de saída**. Parsing de query
parameters de entrada (filtros/sort) é responsabilidade de outro pacote; a documentação
sugere Spatie Laravel Query Builder (`samples/doc-eloquent-resources.md:903-905`).

---

## 2. Declaração e retorno

Gere com `php artisan make:resource PostResource --json-api`. A classe estende
`Illuminate\Http\Resources\JsonApi\JsonApiResource` e expõe `$attributes` e
`$relationships` (`samples/doc-eloquent-resources.md:910-941`). Retorne-a diretamente
da rota, ou use `toResource()` / `toResourceCollection()` por convenção
(`samples/doc-eloquent-resources.md:946-984`).

```php
// estrutura típica — derivada das seções samples/doc-eloquent-resources.md:910-1021
class PostResource extends JsonApiResource
{
    protected array $attributes = [
        'title',
        'is_published' => fn (Post $post) => $post->published_at !== null,
    ];

    protected array $relationships = [
        'author' => UserResource::class,
        'comments',
    ];
}
```

Atributos closure só são avaliados quando o campo é solicitado via sparse fieldset —
isso evita trabalho desnecessário (`samples/doc-eloquent-resources.md:989-1021`).

---

## 3. Relacionamentos e includes

Relacionamentos só aparecem quando o cliente pede `?include=...`
(`samples/doc-eloquent-resources.md:1024-1027`). A lista `$relationships` permite
descobrir a classe de resource automaticamente; `toRelationships()` aceita closures
para filtrar (ex.: apenas comentários públicos) mantendo lazy evaluation
(`samples/doc-eloquent-resources.md:1030-1069`).

- `GET /api/posts/1?include=author,comments` → identifier objects em `relationships` e
  objetos completos em `included` (`samples/doc-eloquent-resources.md:1071-1123`).
- Includes aninhados: `?include=comments.author` (`samples/doc-eloquent-resources.md:1125-1129`).
- Profundidade máxima configurável: `JsonApiResource::maxRelationshipDepth(3)`
  (`samples/doc-eloquent-resources.md:1131-1140`) — use para limitar custo e evitar
  ciclos.
- `->includePreviouslyLoadedRelationships()` inclui eager loads feitos no controller
  sem depender da query string (`samples/doc-eloquent-resources.md:1190-1199`).

### Riscos e otimizações de desempenho

- **N+1**: `include=comments` sem `with('comments')` gera uma query por post; faça
  eager loading no controller e use `includePreviouslyLoadedRelationships()`.
- **Profundidade controlada**: `JsonApiResource::maxRelationshipDepth(3)` impede
  `?include=a.b.c.d...` de expandir o grafo sem limite
  (`samples/doc-eloquent-resources.md:1131-1140`).
- **Lazy attributes**: closures em `$attributes` só são avaliadas se o campo for
  solicitado — coloque cálculos caros atrás delas.
- **Payload de erro**: como o framework não gera `errors[]` automaticamente, implemente
  uma resposta padronizada via `withExceptions` e documente o contrato.

Eager loading continua obrigatório: sem `with('comments')`, includes disparam N+1.
Combine `include` do cliente com uma allow-list no servidor para não aceitar
profundidade arbitrária.

---

## 4. `type`, `id`, links e meta

Por convenção `PostResource` → `posts`, `BlogPostResource` → `blog_posts`, e `id` vem
da chave primária (`samples/doc-eloquent-resources.md:1142-1167`). Se um resource
chamado `AuthorResource` serializa um `User`, sobrescreva `toType()` para emitir
`authors`; `toId()` para IDs compostos (`samples/doc-eloquent-resources.md:1142-1167`).

`toLinks()` e `toMeta()` injetam `links.self` e `meta.readable_created_at`
(`samples/doc-eloquent-resources.md:1202-1246`). Em resources genéricos, use `with()`
ou `->additional([...])` (`samples/doc-eloquent-resources.md:845-897`). Links
definidos pelo desenvolvedor são **mesclados**, não sobrescritos, pelo paginador
(`samples/doc-eloquent-resources.md:824-843`).

Código **derivado** da API documentada em
> `samples/doc-eloquent-resources.md:1202-1246`; a assinatura exata deve ser conferida
> na página oficial antes de copiar para produção.

---

## 5. Sparse fieldsets e escapes

`GET /api/posts?fields[posts]=title,created_at&fields[users]=name` restringe
atributos por tipo (`samples/doc-eloquent-resources.md:1170-1178`). Duas válvulas:

- `->ignoreFieldsAndIncludesInQueryString()` desativa o filtro da query string
  (`samples/doc-eloquent-resources.md:1180-1188`) — útil em endpoints internos onde o
  contrato é fixo.
- `->includePreviouslyLoadedRelationships()` preserva o que o controller já carregou
  (`samples/doc-eloquent-resources.md:1190-1199`).

---

## 6. Headers, paginação e erros

Além do `Content-Type` automático, use `->response()->header(...)` ou
`withResponse(Request, JsonResponse)` para customizar o response
(`samples/doc-eloquent-resources.md:1249-1307`). Paginação mantém `links`
(`first`, `last`, `prev`, `next`) e `meta` (`current_page`, `per_page`, `total`) com
envelope `data` **mesmo** após `withoutWrapping()`
(`samples/doc-eloquent-resources.md:508-542`, `samples/doc-eloquent-resources.md:565-597`).
`paginationInformation(...)` acrescenta links customizados
(`samples/doc-eloquent-resources.md:599-618`).

**Erros JSON:API (`errors[]`) não foram verificados** nos arquivos consultados: a
documentação cobre serialização de resources e headers, e os release notes resumem
"JSON:API-compliant response headers" (`samples/doc-releases-13.md:113-117`). Para
payloads de erro no formato JSON:API, implemente `errors[]` via `withExceptions`
(`05-logs-e-erros.md`) e trate como extensão da aplicação — não afirme que o framework
gera isso automaticamente.

---

## 7. Anti-padrões

- Expor `$model->toArray()` em vez de Resource — perde type/id/relationships e vaza campos.
- Aceitar `include` arbitrário sem limite de profundidade — N+1 e resposta enorme.
- Usar `{!! !!}` em Blade para inserir JSON:API — prefira `@json` / `Js::from`.
- Alterar `Content-Type` manualmente — o resource já define o header correto.

## Resumo de Pontos-Chave

- **`JsonApiResource` é first-party no 13** e emite `application/vnd.api+json`.
- **Gerar com `--json-api`**; declarar `$attributes` e `$relationships`.
- **Includes só aparecem quando pedidos**; limite profundidade com `maxRelationshipDepth`.
- **Sparse fieldsets** reduzem Attributes; closures lazy evitam cálculo de campos não pedidos.
- **`toType()`/`toId()`** são necessários quando o nome da classe não representa o tipo.
- **Paginação mantém envelope `data`**, mesmo com `withoutWrapping()`.
- **Erros JSON:API não são gerados automaticamente** — implemente via `withExceptions`.
