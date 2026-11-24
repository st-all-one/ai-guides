# Busca semântica e AI SDK — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Recursos first-party do 13: agents, tools,
> embeddings, Image/Audio e consultas vetoriais nativas.

---

## 1. AI SDK: agents

Crie um agente em `app/Ai/Agents/`; use `make()` para resolver pelo container (injeção
automática) ou instanciação direta, e `prompt()` para executar
(`samples/doc-ai-sdk.md:417-432`).

Crie com `php artisan make:agent SalesCoach`. A classe implementa
`Laravel\Ai\Contracts\Agent` e usa o trait `Laravel\Ai\Promptable`; `instructions()`
retorna `Stringable|string` (`samples/doc-ai-sdk.md:335-374`). Não existe classe base
`Laravel\Ai\Agent` — o exemplo em `example/app/Ai/Agents/SalesCoach.php` segue a forma
documentada. Use `make()` para resolver pelo container (injeção automática) ou
instanciação direta, e `prompt()` para executar (`samples/doc-ai-sdk.md:417-432`).

samples/doc-ai-sdk.md:422-425
```php
$response = (new SalesCoach)
    ->prompt('Analyze this sales transcript...');

return (string) $response;
```

`prompt()` aceita overrides de `provider`, `model` e `timeout`
(`samples/doc-ai-sdk.md:434-443`). Cada resposta expõe `raw` com o HTTP response do
provider — útil para rate-limit headers e request IDs
(`samples/doc-ai-sdk.md:445-450`).

Ferramentas (tools) são declaradas no agente e o modelo pode chamá-las; a documentação
cobre validação de argumentos, reparo de tool calls, deferred loading, file storage,
MCP tools e ferramentas do provider (`samples/doc-ai-sdk.md:1100-1476`). Use
**Human Tool Approval** quando a ferramenta tiver efeito colateral externo
(`samples/doc-ai-sdk.md:2095`). Sub-agents são suportados
(`samples/doc-ai-sdk.md:1616`).

Provider-agnóstico: use `Lab::OpenAI`, `Lab::Anthropic` etc. apenas em pontos de
configuração, não espalhados no domínio (`samples/doc-ai-sdk.md:145-299`).

---

## 2. Embeddings e custo

`Str::of(...)->toEmbeddings()` gera um embedding para uma string
(`samples/doc-search.md:114-122`). Para vários inputs, `Embeddings::for([...])->generate()`
faz **uma única chamada** à API — preferível a laços
(`samples/doc-search.md:124-135`).

samples/doc-search.md:127-134
```php
use Laravel\Ai\Embeddings;

$response = Embeddings::for([
    'Napa Valley has great wine.',
    'Laravel is a PHP framework.',
])->generate();

$response->embeddings; // [[0.123, 0.456, ...], [0.789, 0.012, ...]]
```

Dimensões e provider são configuráveis (`samples/doc-ai-sdk.md:2544-2550`); multimodal
é suportado por providers específicos (`samples/doc-ai-sdk.md:2552-2555`). A seção de
cache de embeddings (`samples/doc-ai-sdk.md:2671`) é a forma correta de evitar custo
repetido: **cacheie por hash do conteúdo + modelo + dimensões**, nunca só por texto.

Segurança e custo:

- Chaves de provider apenas em `.env`/`config/services.php`; nunca em logs ou prompts.
- Defina `timeout` por prompt (`samples/doc-ai-sdk.md:434-443`) e limite de tokens no provider.
- Trate `raw` como dado sensível: pode conter headers com identificadores.
- Use prompt caching quando disponível (`samples/doc-ai-sdk.md:2051`).
- Não envie PII a providers sem base legal e contrato de retenção.

---

## 3. Busca vetorial no banco

Requisitos: Laravel AI SDK + PostgreSQL com `pgvector`, MariaDB 11.7+ ou MongoDB com
o pacote oficial (`samples/doc-search.md:110-111`). Postgres no Laravel Cloud já vem
com `pgvector` (`samples/doc-search.md:111`).

Fluxo correto (`samples/doc-search.md:104-108`): gere embedding do conteúdo, armazene
junto ao dado, gere embedding da query, compare similaridade.

samples/doc-search.md:145-153
```php
Schema::ensureVectorExtensionExists();

Schema::create('documents', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->vector('embedding', dimensions: 1536)->index();
    $table->timestamps();
});
```

- Use `AsVector` cast para converter entre array PHP e formato vetorial do banco
  (`samples/doc-search.md:158-169`).
- `whereVectorSimilarTo` usa **cosine similarity**, filtra abaixo de `minSimilarity`
  (0.0–1.0) e ordena por relevância (`samples/doc-search.md:174-183`).
- Se você passa uma string em vez do array, o Laravel gera o embedding automaticamente
  com o provider configurado (`samples/doc-search.md:185-192`).
- APIs de menor nível: `whereVectorDistanceLessThan`, `selectVectorDistance`,
  `orderByVectorDistance` (`samples/doc-search.md:194`).

```php
$documents = Document::query()
    ->whereVectorSimilarTo('embedding', $queryEmbedding, minSimilarity: 0.4)
    ->limit(10)
    ->get();
```

> Índice HNSW é criado por `->index()` na coluna `vector`; sem ele a busca é força
> bruta (`samples/doc-search.md:140-156`). Dimensões devem bater com o provider
> (ex.: 1536 para `text-embedding-3-small`).

---

## 4. Combinando técnicas

A documentação lista full-text, vetorial, reranking, Scout e combinação
(`samples/doc-search.md:22-49`, `samples/doc-search.md:291`). Padrão prático:
full-text para termos exatos → vetorial para sinônimos/semântica → reranking dos top N
(`samples/doc-search.md:197-227`). Scout continua sendo a opção quando você quer
engine externo (Meilisearch/Algolia) via `samples/doc-search.md:227-289`.

---

## 5. Geração de imagem e áudio

O release notes mostra `Image::of('...')->generate()` e `Audio::of('...')->generate()`
(`samples/doc-releases-13.md:82-99`); a documentação dedica seções a Images
(`samples/doc-ai-sdk.md:2310`) e Audio (`samples/doc-ai-sdk.md:2391`). Trate arquivos
gerados como qualquer upload: storage privado, validação de MIME antes de servir e
limite de tamanho.

## Resumo de Pontos-Chave

- **Agents usam `make()` + `prompt()`**; `provider`, `model` e `timeout` são por chamada.
- **`Embeddings::for([...])` faz uma chamada** para vários textos — use em indexing.
- **Cacheie embeddings** por conteúdo + modelo + dimensões; nunca repita chamada paga.
- **pgvector/MariaDB 11.7+/MongoDB** são requisitos da busca vetorial; use `->index()`.
- **`whereVectorSimilarTo`** filtra por `minSimilarity` e ordena por relevância.
- **`raw` expõe dados do provider** — trate como sensível em logs e telemetria.
- **Full-text → vetorial → rerank** é o pipeline mais robusto; Scout para engines externas.
