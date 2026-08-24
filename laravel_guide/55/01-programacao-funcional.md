# Programação Funcional no Laravel 5.5.50

Este dossiê aborda a programação funcional no Laravel **5.5.50 (LTS)**, baseando-se
estritamente na documentação oficial da versão 5.5 (`collections.md`, `helpers.md`,
`eloquent-collections.md`) e em comportamentos estáveis do Laravel 5.5.50.

> **Aviso de versão (crítico):** Este documento **não** inclui recursos de versões
> posteriores. Em particular, **não existem** no Laravel 5.5:
> - *Lazy Collections* (introduzidas no Laravel 6). As coleções do 5.5 são **eager** (avaliadas imediatamente).
> - `Collection::chunkWhile()` (chegou no 5.6).
> - `Collection::join()` (chegou no 5.6).
> - `Collection::reduceSpread()` (chegou no 5.7).
> - `Collection::fold()` (não existe; use `reduce`).
> - Arrow functions `fn () => ...` do PHP **só** existem a partir do PHP 7.4. O Laravel 5.5
>   roda sobre PHP 7.1, portanto **usamos sempre closures normais** `function () { ... }`.

---

## 1. Coleções como Paradigma Funcional

A classe `Illuminate\Support\Collection` é o núcleo da abordagem funcional do Laravel.
Ela provê um *wrapper* fluente e conveniente sobre arrays de dados, permitindo encadear
operações de mapeamento, filtragem e redução sem mutar o array original.

### 1.1 Criação de coleções

A forma canônica é o *helper* global `collect()` (documentado em `helpers.md`):

```php
$collection = collect(['taylor', 'abigail']);
```

Também é possível usar o método estático `Collection::make()` ou `Collection::wrap()`:

```php
use Illuminate\Support\Collection;

$collection = Collection::make([1, 2, 3]);
$fromString = Collection::wrap('John Doe');   // ['John Doe']
$fromArray  = Collection::wrap(['John Doe']);  // ['John Doe']
$fromColl   = Collection::wrap(collect('John')); // ['John']
```

O inverso, `Collection::unwrap()`, extrai os itens subjacentes:

```php
Collection::unwrap(collect('John Doe')); // ['John Doe']
Collection::unwrap(['John Doe']);        // ['John Doe']
Collection::unwrap('John Doe');          // 'John Doe'
```

> Resultados de consultas [Eloquent](eloquent.md) (via `get()`, relacionamentos, etc.)
> são **sempre** instâncias de `Collection` (ou `Illuminate\Database\Eloquent\Collection`).

### 1.2 Imutabilidade conceitual

Conforme `collections.md`:

> "In general, collections are immutable, meaning every `Collection` method returns an
> entirely new `Collection` instance."

Na prática, **quase todos** os métodos retornam uma **nova** instância, preservando a
coleção original. Exceções importantes que **mutam** a própria coleção:

- `transform()` — substitui os itens pelos valores retornados pelo callback.
- `forget()` — remove um item pela chave (não retorna nova coleção).
- `pop()`, `shift()`, `push()`, `prepend()`, `pull()`, `put()`, `splice()` — métodos
  mutáveis de pilha/fila.

```php
$original = collect([1, 2, 3, 4, 5]);

$modified = $original->map(function ($item) {
    return $item * 2;
});

$original->all(); // [1, 2, 3, 4, 5]  (intacta)
$modified->all(); // [2, 4, 6, 8, 10]
```

### 1.3 Coleções "macroable"

Coleções são *macroable* — é possível registrar novos métodos em tempo de execução
via `Collection::macro()`. Ideal para abstrair operações funcionais reutilizáveis
(declarar tipicamente em um *service provider*):

```php
use Illuminate\Support\Str;
use Illuminate\Support\Collection;

Collection::macro('toUpper', function () {
    return $this->map(function ($value) {
        return Str::upper($value);
    });
});

collect(['first', 'second'])->toUpper(); // ['FIRST', 'SECOND']
```

---

## 2. Higher-Order Messages (Mensagens de Ordem Superior)

O Laravel 5.5 suporta *higher order messages*: atalhos onde o método é acessado como
**propriedade dinâmica** da coleção, eliminando a necessidade de escrever a closure
completa. Os métodos que suportam isso em 5.5 são:

`average`, `avg`, `contains`, `each`, `every`, `filter`, `first`, `flatMap`, `map`,
`partition`, `reject`, `sortBy`, `sortByDesc`, `sum`, `unique`.

```php
$users = User::where('votes', '>', 500)->get();

// Equivalente a $users->each(function ($u) { $u->markAsVip(); });
$users->each->markAsVip();

// Equivalente a $users->sum(function ($u) { return $u->votes; });
return $users->sum->votes;
```

Também funciona para `map`, `filter`, `reject`, etc., passando o método/prop a invocar:

```php
collect([1, 2, 3])->map->square(); // chamaria $item->square() em cada item
```

> Atenção: *higher order messages* só funcionam quando o callback faria exatamente
> `$item->metodo()` ou `$item->propriedade`. Para lógicas mais complexas, use a
> closure explícita.

---

## 3. Mapeamento, Filtragem e Iteração

### 3.1 `map()`

Itera e aplica o callback a cada valor, retornando **nova** coleção:

```php
$collection = collect([1, 2, 3, 4, 5]);

$multiplied = $collection->map(function ($item, $key) {
    return $item * 2;
});

$multiplied->all(); // [2, 4, 6, 8, 10]
```

> `map` **preserva as chaves originais**. Se precisar de índices consecutivos após um
> `map`, encadeie `->values()`.

### 3.2 `filter()`

Mantém apenas os itens que passam no *truth test*. Sem callback, remove tudo que é
`false` (equivalente a `false`, `null`, `''`, `0`, `[]`):

```php
collect([1, 2, 3, 4])->filter(function ($value, $key) {
    return $value > 2;
})->all(); // [3, 4]

collect([1, 2, 3, null, false, '', 0, []])->filter()->all(); // [1, 2, 3]
```

> **Armadilha:** `filter()` **não reindexa** as chaves. `[1,2,3,4]->filter(>2)` resulta
> em `[2 => 3, 3 => 4]`. Use `->values()` para reindexar:
> `->filter(...)->values()->all()` → `[3, 4]`.

### 3.3 `reject()`

Inverso de `filter()`: remove os itens cujo callback retorna `true`.

```php
collect([1, 2, 3, 4])->reject(function ($value, $key) {
    return $value > 2;
})->all(); // [1, 2]
```

### 3.4 `each()`

Itera chamando um callback. Retornar `false` **interrompe** a iteração (útil para
*short-circuit*). Diferente de `map`, `each` é para *efeito colateral*, não transformação.

```php
$collection->each(function ($item, $key) {
    if ($item->invalid()) {
        return false; // para a iteração
    }
    $item->process();
});
```

### 3.5 `eachSpread()`

Igual a `each`, mas espalha (spread) os valores de itens aninhados como argumentos:

```php
collect([['John Doe', 35], ['Jane Doe', 33]])
    ->eachSpread(function ($name, $age) {
        // ...
    });
```

### 3.6 `flatMap()`

Aplica o callback e **achata** o resultado em um nível:

```php
collect([
    ['name' => 'Sally'],
    ['school' => 'Arkansas'],
    ['age' => 28],
])->flatMap(function ($values) {
    return array_map('strtoupper', $values);
})->all();
// ['name' => 'SALLY', 'school' => 'ARKANSAS', 'age' => '28']
```

### 3.7 `transform()` (mutação)

Igual a `map`, porém **muta** a própria coleção (não devolve nova instância):

```php
$collection = collect([1, 2, 3, 4, 5]);
$collection->transform(function ($item, $key) {
    return $item * 2;
});
$collection->all(); // [2, 4, 6, 8, 10]
```

### 3.8 `mapSpread()`

Espalha itens aninhados (ex.: após `chunk`) como argumentos do callback:

```php
collect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    ->chunk(2)
    ->mapSpread(function ($odd, $even) {
        return $odd + $even;
    })->all(); // [1, 5, 9, 13, 17]
```

### 3.9 `mapToGroups()`

Agrupa os itens conforme o callback, que deve retornar um array associativo de
um único par chave/valor:

```php
collect([
    ['name' => 'John Doe', 'department' => 'Sales'],
    ['name' => 'Jane Doe', 'department' => 'Sales'],
    ['name' => 'Johnny Doe', 'department' => 'Marketing'],
])->mapToGroups(function ($item, $key) {
    return [$item['department'] => $item['name']];
})->toArray();
/*
[
    'Sales'      => ['John Doe', 'Jane Doe'],
    'Marketing'  => ['Johhny Doe'],
]
*/
```

### 3.10 `mapWithKeys()`

Callback deve retornar um array associativo de um par chave/valor (para re-chaveamento):

```php
collect([
    ['name' => 'John', 'email' => 'john@example.com'],
    ['name' => 'Jane', 'email' => 'jane@example.com'],
])->mapWithKeys(function ($item) {
    return [$item['email'] => $item['name']];
})->all();
// ['john@example.com' => 'John', 'jane@example.com' => 'Jane']
```

### 3.11 `mapInto()`

Cria uma nova instância da classe informada, passando o valor ao construtor:

```php
class Currency
{
    public function __construct(string $code)
    {
        $this->code = $code;
    }
}

collect(['USD', 'EUR', 'GBP'])->mapInto(Currency::class)->all();
// [Currency('USD'), Currency('EUR'), Currency('GBP')]
```

---

## 4. Ordenação e Agrupamento

### 4.1 `sort()`

Ordena a coleção. **Preserva as chaves originais** — use `values()` para reindexar:

```php
collect([5, 3, 1, 2, 4])->sort()->values()->all(); // [1, 2, 3, 4, 5]
```

Aceita callback personalizado (equivalente a `uasort` do PHP).

### 4.2 `sortBy()` / `sortByDesc()`

Ordena por uma chave (ou callback). Também preserva chaves:

```php
collect([
    ['name' => 'Desk', 'price' => 200],
    ['name' => 'Chair', 'price' => 100],
    ['name' => 'Bookcase', 'price' => 150],
])->sortBy('price')->values()->all();
/*
[
    ['name' => 'Chair', 'price' => 100],
    ['name' => 'Bookcase', 'price' => 150],
    ['name' => 'Desk', 'price' => 200],
]
*/
```

### 4.3 `groupBy()`

Agrupa por chave (string ou callback). Suporta múltiplos critérios em array e
`$preserveKeys`:

```php
collect([
    ['account_id' => 'account-x10', 'product' => 'Chair'],
    ['account_id' => 'account-x10', 'product' => 'Bookcase'],
    ['account_id' => 'account-x11', 'product' => 'Desk'],
])->groupBy('account_id')->toArray();
/*
[
    'account-x10' => [ ['account_id' => 'account-x10', 'product' => 'Chair'], ... ],
    'account-x11' => [ ['account_id' => 'account-x11', 'product' => 'Desk'] ],
]
*/
```

### 4.4 `keyBy()`

Re-chaveia a coleção pela chave informada. Em caso de chaves duplicadas, **apenas a
última** prevalece:

```php
collect([
    ['product_id' => 'prod-100', 'name' => 'Desk'],
    ['product_id' => 'prod-200', 'name' => 'Chair'],
])->keyBy('product_id')->all();
// ['prod-100' => [...], 'prod-200' => [...]]
```

### 4.5 `partition()`

Separa itens que passam/no passam no teste. Combine com `list()` do PHP:

```php
$collection = collect([1, 2, 3, 4, 5, 6]);

list($underThree, $aboveThree) = $collection->partition(function ($i) {
    return $i < 3;
});
// $underThree = [1, 2]; $aboveThree = [3, 4, 5, 6]
```

> `partition` também é elegível para *higher order message*.

### 4.6 `reverse()`, `shuffle()`, `nth()`

- `reverse()`: inverte a ordem preservando chaves.
- `shuffle()`: embaralha aleatoriamente.
- `nth($step, $offset = 0)`: pega cada n-ésimo elemento.

```php
collect(['a', 'b', 'c', 'd', 'e', 'f'])->nth(4);     // ['a', 'e']
collect(['a', 'b', 'c', 'd', 'e', 'f'])->nth(4, 1);  // ['b', 'f']
```

---

## 5. Segmentação, Fatias e Combinação

### 5.1 `chunk()`

Quebra em coleções menores de tamanho fixo (útil em grids Bootstrap nas views):

```php
collect([1, 2, 3, 4, 5, 6, 7])->chunk(4)->toArray(); // [[1,2,3,4],[5,6,7]]
```

```blade
@foreach ($products->chunk(3) as $chunk)
    <div class="row">
        @foreach ($chunk as $product)
            <div class="col-xs-4">{{ $product->name }}</div>
        @endforeach
    </div>
@endforeach
```

> No Laravel 5.5 **não existe** `chunkWhile()`. Use `chunk()` ou `split()`.

### 5.2 `split()`

Quebra em N grupos (não por tamanho, mas em número de partes):

```php
collect([1, 2, 3, 4, 5])->split(3)->toArray(); // [[1, 2], [3, 4], [5]]
```

### 5.3 `slice()`

Retorna fatia a partir do índice; o segundo argumento limita o tamanho. Preserva
chaves — use `values()` se necessário:

```php
collect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])->slice(4)->all();      // [5..10]
collect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])->slice(4, 2)->all();   // [5, 6]
```

### 5.4 `take()`

Retorna nova coleção com N itens. Negativo pega do fim:

```php
collect([0, 1, 2, 3, 4, 5])->take(3)->all();   // [0, 1, 2]
collect([0, 1, 2, 3, 4, 5])->take(-2)->all(); // [4, 5]
```

### 5.5 `splice()`

Remove e retorna fatia a partir do índice; pode receber tamanho e itens de
substituição. **Muta** a coleção original:

```php
$collection = collect([1, 2, 3, 4, 5]);
$chunk = $collection->splice(2);        // [3, 4, 5]; coleção fica [1, 2]
$chunk = $collection->splice(2, 1);     // [3]; coleção fica [1, 2, 4, 5]
$chunk = $collection->splice(2, 1, [10, 11]); // [3]; coleção fica [1, 2, 10, 11, 4, 5]
```

### 5.6 `zip()`

Combina os valores do array informado com a coleção no índice correspondente:

```php
collect(['Chair', 'Desk'])->zip([100, 200])->all(); // [['Chair', 100], ['Desk', 200]]
```

### 5.7 `collapse()`

Achata uma coleção de arrays em uma única coleção plana:

```php
collect([[1, 2, 3], [4, 5, 6], [7, 8, 9]])->collapse()->all(); // [1..9]
```

### 5.8 `flatten()`

Achata coleções multidimensionais em uma dimensão. Aceita profundidade (`depth`):

```php
collect(['name' => 'taylor', 'languages' => ['php', 'javascript']])
    ->flatten()->all(); // ['taylor', 'php', 'javascript']

collect([
    'Apple' => [['name' => 'iPhone 6S']],
    'Samsung' => [['name' => 'Galaxy S7']],
])->flatten(1)->values()->all();
// [['name' => 'iPhone 6S'], ['name' => 'Galaxy S7']]
```

### 5.9 `pad()`

Preenche até o tamanho informado (negativo preenche à esquerda). Equivale a
`array_pad` do PHP:

```php
collect(['A', 'B', 'C'])->pad(5, 0)->all();  // ['A','B','C',0,0]
collect(['A', 'B', 'C'])->pad(-5, 0)->all(); // [0,0,'A','B','C']
```

### 5.10 `combine()`, `union()`, `intersect()`, `intersectByKeys()`, `diff*()`

- `combine($values)`: usa as chaves da coleção e os valores do array/coleção informado.
  ```php
  collect(['name', 'age'])->combine(['George', 29])->all();
  // ['name' => 'George', 'age' => 29]
  ```
- `union($items)`: adiciona itens; em chaves duplicadas **permanece** o valor original.
- `intersect($items)`: mantém apenas valores presentes em `$items` (preserva chaves).
- `intersectByKeys($items)`: remove chaves não presentes em `$items`.
- `diff($items)` / `diffAssoc($items)` / `diffKeys($items)`: retorna valores/chaves
  da coleção original ausentes em `$items`.

### 5.11 `concat()`

Anexa array/coleção ao final (5.5 suporta):

```php
collect(['John Doe'])
    ->concat(['Jane Doe'])
    ->concat(['name' => 'Johnny Doe'])
    ->all(); // ['John Doe', 'Jane Doe', 'Johnny Doe']
```

---

## 6. Redução e Agregação

### 6.1 `reduce()`

Reduz a coleção a um único valor, passando o acumulador a cada iteração. O `$carry`
inicial é `null`, mas pode ser definido como segundo argumento:

```php
collect([1, 2, 3])->reduce(function ($carry, $item) {
    return $carry + $item;
}); // 6

collect([1, 2, 3])->reduce(function ($carry, $item) {
    return $carry + $item;
}, 4); // 10
```

> **Não existe** `reduceSpread()` no 5.5 (chegou no 5.7). Para reduzir tuplas,
> use `reduce` com acesso por índice ou `mapSpread` prévio.

### 6.2 `sum()`, `avg()`/`average()`, `min()`, `max()`, `median()`, `mode()`

```php
collect([1, 2, 3, 4, 5])->sum();                       // 15
collect([['foo' => 10], ['foo' => 20]])->max('foo');   // 20
collect([1, 1, 2, 4])->avg();                          // 2
collect([['foo' => 10], ['foo' => 10], ['foo' => 20], ['foo' => 40]])->median('foo'); // 15
collect([1, 1, 2, 4])->mode();                         // [1]
```

Todos aceitam chave (para arrays/objetos aninhados) ou callback.

> `average` é alias de `avg`. Ambos elegíveis para *higher order message*.

### 6.3 `every()`, `contains()` / `containsStrict()`

```php
collect([1, 2, 3, 4])->every(function ($value, $key) {
    return $value > 2;
}); // false

collect(['name' => 'Desk', 'price' => 100])->contains('Desk');        // true
collect([1, 2, 3, 4, 5])->contains(function ($v, $k) { return $v > 5; }); // false
```

`contains` usa comparação "loose" (string numérica == inteiro). Use
`containsStrict` para comparação estrita (`===`).

> `every`, `contains`, `avg`/`average`, `sum` são elegíveis para *higher order messages*.

### 6.4 `first()`, `last()`, `firstWhere()`, `search()`

```php
collect([1, 2, 3, 4])->first(function ($v, $k) { return $v > 2; }); // 3
collect([1, 2, 3, 4])->last(function ($v, $k) { return $v < 3; });  // 2
collect([1, 2, 3, 4])->first(); // 1   (null se vazia)
collect([1, 2, 3, 4])->last();  // 4

// firstWhere (5.5) — por par chave/valor, com ou sem operador
collect([...])->firstWhere('name', 'Linda');        // primeiro com name == Linda
collect([...])->firstWhere('age', '>=', 18);        // primeiro com age >= 18

collect([2, 4, 6, 8])->search(4);            // 1 (loose)
collect([2, 4, 6, 8])->search('4', true);    // false (strict)
collect([2, 4, 6, 8])->search(function ($i, $k) { return $i > 5; }); // 2
```

> `first` é elegível para *higher order message*.

---

## 7. Condição Funcional: `when()` e `unless()`

Permitem ramificação fluente encadeada (típica de *query scopes* e pipelines):

```php
$collection = collect([1, 2, 3]);

$collection->when(true, function ($collection) {
    return $collection->push(4);
});
$collection->when(false, function ($collection) {
    return $collection->push(5);
});
$collection->all(); // [1, 2, 3, 4]

$collection->unless(true, function ($collection) {
    return $collection->push(6);
});
$collection->unless(false, function ($collection) {
    return $collection->push(7);
});
$collection->all(); // [1, 2, 3, 4, 7]
```

- `when($condition, $callback)`: executa se `$condition` for verdadeiro.
- `unless($condition, $callback)`: executa se `$condition` for **falso**.

> O callback deve retornar a coleção para manter o encadeamento. Útil em filtros
> dinâmicos de Eloquent combinados com *query scopes* (ver `queries.md`).

---

## 8. Filtragem por Chave/Valor: `where*`

```php
$collection = collect([
    ['product' => 'Desk', 'price' => 200],
    ['product' => 'Chair', 'price' => 100],
    ['product' => 'Bookcase', 'price' => 150],
    ['product' => 'Door', 'price' => 100],
]);

$collection->where('price', 100)->all();              // Chair, Door
$collection->whereStrict('price', 100)->all();        // comparação estrita
$collection->whereIn('price', [150, 200])->all();     // Bookcase, Desk
$collection->whereInStrict('price', [150, 200])->all();
$collection->whereNotIn('price', [150, 200])->all();  // Chair, Door
$collection->whereNotInStrict('price', [150, 200])->all();
```

`where` e suas variantes usam comparação "loose" por padrão; as versões `Strict`
usam `===`. As variantes `filter`/`reject` (com callback) são mais flexíveis; as
`where*` são atalhos convenientes para pares chave/valor.

---

## 9. Unificação, Chaves e Valores

- `pluck($value, $key = null)`: extrai valores de uma chave; pode re-chavear.
  ```php
  collect([['product_id' => 'prod-100', 'name' => 'Desk']])
      ->pluck('name', 'product_id')->all(); // ['prod-100' => 'Desk']
  ```
- `keys()`: retorna as chaves.
- `values()`: **reindexa** para inteiros consecutivos (fundamental após `filter`,
  `sort`, `unique`, `slice` que preservam chaves).
- `flip()`: troca chaves por valores.
- `unique()` / `uniqueStrict()`: remove duplicados (loose/strict). Preserva chaves →
  encadeie `->values()`.
- `merge($items)`: mescla; chaves string sobrescrevem, chaves numéricas são anexadas.
- `combine()`, `union()`, `intersect*()`, `diff*()` já vistos na seção 5.10.

```php
collect([1, 1, 2, 2, 3, 4, 2])->unique()->values()->all(); // [1, 2, 3, 4]
```

---

## 10. Encadeamento Fluente (Fluent Pipeline)

A força das coleções é compor operações sem variáveis intermediárias:

```php
$total = collect(['taylor', 'abigail', null])
    ->map(function ($name) {
        return strtoupper($name);
    })
    ->reject(function ($name) {
        return empty($name);
    })
    ->map(function ($name) {
        return strlen($name);
    })
    ->sum();

// 6 + 7 = 13
```

Uso real com Eloquent (de `eloquent-collections.md`):

```php
$users = App\User::all();

$names = $users->reject(function ($user) {
    return $user->active === false;
})->map(function ($user) {
    return $user->name;
});
```

### 10.1 `pipe()`

Passa a coleção a um callback e **retorna o resultado do callback** (não a coleção):

```php
$collection = collect([1, 2, 3]);

$piped = $collection->pipe(function ($collection) {
    return $collection->sum();
}); // 6
```

### 10.2 `tap()` (método de coleção)

Permite "espiar" a coleção em um ponto do pipeline **sem alterá-la** (o retorno do
callback é ignorado; a coleção segue intacta):

```php
collect([2, 4, 3, 1, 5])
    ->sort()
    ->tap(function ($collection) {
        Log::debug('Values after sorting', $collection->values()->toArray());
    })
    ->shift(); // 1
```

### 10.3 `times()` (estático)

Cria coleção invocando o callback N vezes (útil com *factories*):

```php
$collection = Collection::times(10, function ($number) {
    return $number * 9;
})->all(); // [9, 18, ..., 90]

$categories = Collection::times(3, function ($number) {
    return factory(Category::class)->create(['name' => 'Category #'.$number]);
});
```

---

## 11. Closures e Arrow Functions

O Laravel 5.5 roda em **PHP 7.1**, onde **arrow functions** (`fn () => ...`) **não
existem** (só a partir do PHP 7.4). Portanto, toda programação funcional no 5.5 usa
**closures normais**:

```php
// CORRETO no 5.5 (PHP 7.1)
$collection->map(function ($item) {
    return $item * 2;
});

// INVÁLIDO no 5.5 — arrow function só existe no PHP 7.4+
$collection->map(fn ($item) => $item * 2);
```

Closures no PHP 7.1 suportam a palavra-chave `use` para importar variáveis do escopo
externo:

```php
$multiplier = 3;
$collection->map(function ($item) use ($multiplier) {
    return $item * $multiplier;
});
```

---

## 12. Helpers Funcionais Globais

Documentados em `helpers.md`. Os mais relevantes para programação funcional:

### 12.1 `collect()`

Cria uma `Collection` a partir de qualquer valor:

```php
$collection = collect(['taylor', 'abigail']);
```

### 12.2 `optional()`

Acessa propriedades/métodos de um objeto que pode ser `null`, sem erro:

```php
return optional($user->address)->street;     // null se address for null
old('name', optional($user)->name);
```

### 12.3 `data_get()` / `data_set()` / `data_fill()`

Acessam/definem valores em arrays ou objetos aninhados usando *dot notation*,
com valor padrão e suporte a wildcard `*`:

```php
$data = ['products' => ['desk' => ['price' => 100]]];

data_get($data, 'products.desk.price');            // 100
data_get($data, 'products.desk.discount', 0);      // 0 (default)

$data2 = ['products' => [['name' => 'Desk 1', 'price' => 100], ['name' => 'Desk 2']]];
data_set($data2, 'products.*.price', 200);
// ambos os preços viram 200

data_fill($data2, 'products.*.discount', 10); // preenche se ausente
```

> Variantes de array: `array_get`, `array_set`, `array_pluck`, `array_only`,
> `array_except`, `array_divide`, `array_dot`, `array_flatten`, `array_where`,
> `array_wrap`, `array_collapse`, `array_first`, `array_last`, `array_random`,
> `array_sort`, etc. — todas documentadas em `helpers.md`.

### 12.4 `value()`

Retorna o valor dado; se receber uma `Closure`, **executa** e retorna o resultado:

```php
$result = value(true);          // true
$result = value(function () { return false; }); // false
```

### 12.5 `with()`

Retorna o valor dado; se o segundo argumento for uma `Closure`, executa-a e retorna
o resultado:

```php
$result = with(5, function ($value) {
    return is_numeric($value) ? $value * 2 : 0;
}); // 10

with(null, function ($value) { return $value * 2; }); // 0 (null * 2 = 0)
```

### 12.6 `tap()` (helper global)

Aceita `$value` e uma `Closure`; passa `$value` à closure e **retorna `$value`**
(independente do retorno da closure). Sem closure, encadeia métodos forçando o
retorno de `$value`:

```php
$user = tap(User::first(), function ($user) {
    $user->name = 'taylor';
    $user->save();
}); // retorna o modelo $user

// Sem closure: força update() a retornar o modelo em vez do inteiro
$user = tap($user)->update([
    'name' => $name,
    'email' => $email,
]);
```

### 12.7 `retry()`

Tenta executar o callback até atingir o número máximo de tentativas; se não lançar
exceção, retorna o valor. Opcional: intervalo em ms entre tentativas:

```php
return retry(5, function () {
    // tenta 5 vezes, descansando 100ms entre tentativas
}, 100);
```

### 12.8 `blank()` / `filled()`

Testam se um valor é "vazio"/"preenchido" (strings vazias, `null`, `0`, `false`,
`collect()` vazio contam como *blank*; `0`, `true`, `false` contam como *filled*
no caso de `filled` — ver `helpers.md` para a tabela exata).

### 12.9 `transform()` (helper global)

Executa a closure **apenas se o valor não for *blank*** e retorna o resultado;
terceiro argumento é o default para valor *blank*:

```php
$result = transform(5, function ($value) { return $value * 2; }); // 10
$result = transform(null, $callback, 'The value is blank');       // 'The value is blank'
```

### 12.10 `head()` / `last()`

Retornam o primeiro/último elemento de um array puro:

```php
head([100, 200, 300]); // 100
last([100, 200, 300]); // 300
```

### 12.11 `abort()`, `abort_if()`, `abort_unless()`, `class_basename()`, `method_field()`

- `abort(403)`, `abort_if($cond, 403)`, `abort_unless($cond, 403)`: controle de fluxo
  funcional para respostas HTTP.
- `class_basename('Foo\Bar\Baz')`: retorna `'Baz'`.
- `method_field('DELETE')`: gera input hidden para *spoofing* de verbo HTTP (Blade).

---

## 13. Eloquent Collections vs Base Collection

Todos os conjuntos multi-resultado do Eloquent são instâncias de
`Illuminate\Database\Eloquent\Collection`, que **estende** `Illuminate\Support\Collection`,
herdando todos os métodos funcionais descritos acima.

Diferenças e ressalvas importantes (de `eloquent-collections.md`):

- A maioria dos métodos Eloquent retorna uma **nova** `Eloquent\Collection`.
- Porém, estes métodos retornam uma **base collection** (`Support\Collection`):
  `pluck`, `keys`, `zip`, `collapse`, `flatten`, `flip`.
- Se um `map` retornar uma coleção sem modelos Eloquent, ela é automaticamente
  convertida em base collection.

```php
$users = App\User::where('active', 1)->get(); // Eloquent\Collection

foreach ($users as $user) {
    echo $user->name; // também é iterável como array PHP
}

$names = $users->reject(function ($user) {
    return $user->active === false;
})->map(function ($user) {
    return $user->name;
}); // Eloquent\Collection de strings -> vira base Collection
```

### 13.1 Custom Collections

É possível usar uma coleção customizada sobrescrevendo `newCollection()` no model:

```php
namespace App;

use App\CustomCollection;
use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    public function newCollection(array $models = [])
    {
        return new CustomCollection($models);
    }
}
```

---

## 14. Avaliação Preguiçosa (Lazy) — Conceitual

No Laravel 5.5 as coleções são **eager**: cada operação (`map`, `filter`, `sort`,
etc.) é executada **imediatamente** e materializa uma nova coleção com todos os
elementos processados. Não há *lazy evaluation* nativa (isso chega com as *Lazy
Collections* no Laravel 6+).

Consequências práticas:

- Encadear muitas operações sobre coleções grandes cria **múltiplas cópias intermediárias**
  do array, consumindo memória e CPU proporcionalmente ao tamanho.
- Para grandes volumes (dezenas de milhares de registros), prefira **filtrar/ordenar
  no banco de dados** via Eloquent/Query Builder (`where`, `orderBy`, `limit`) e só
  então usar coleções para o formato final. Isso evita carregar tudo na memória.
- Em 5.5, para "streaming" de grandes conjuntos, use `chunkById()` / `chunk()` do
  Query Builder (ver `queries.md`), processando em lotes — não coleções lazy.

---

## 15. Armadilhas (Pitfalls) e Boas Práticas

1. **`filter` não reindexa chaves.** Use `->values()` para obter índices 0,1,2...
   ```php
   collect([1,2,3,4])->filter(fn_or_cb > 2)->values()->all(); // [3,4]
   ```
2. **`map` preserva chaves.** Se a origem tem chaves não sequenciais, o resultado
   também as terá — reindexe com `values()` quando precisar de lista contínua.
3. **`sort`/`sortBy`/`unique` preservam chaves** — sempre `->values()` se for
   retornar um array/indexado para a view ou JSON.
4. **`transform`/`forget`/`splice`/`pop`/`shift` mutam a coleção.** Se precisa da
   original, use `map`/`filter` (imutáveis) em vez de `transform`.
5. **Comparações "loose" em `contains`/`where`/`unique`/`search`.** Strings
   numéricas (`'100'`) são iguais a inteiros (`100`). Use as variantes `Strict`
   (`containsStrict`, `whereStrict`, `uniqueStrict`, `search(..., true)`) quando
   a diferença de tipo importa.
6. **`intersect` preserva as chaves da coleção original**, podendo gerar "buracos"
   no índice — reindexe com `values()`.
7. **`pipe` retorna o resultado do callback**, não a coleção — não encadeie após
   `pipe` esperando uma coleção, a menos que o callback retorne a própria coleção.
8. **`tap` (coleção) ignora o retorno da closure** e devolve a coleção; útil para
   logging/debug no meio do pipeline, mas não para transformar dados.
9. **Higher-order messages** só aplicam `$item->metodo()` — nada além disso. Para
   lógica condicional dentro, use closure explícita.
10. **Arrow functions não existem no 5.5 (PHP 7.1)** — sempre closures `function () {}`.
11. **`chunkWhile` e `join` não existem no 5.5** — use `chunk`, `split`, `implode`.

---

## 16. Quando NÃO Usar Collections

- **Grandes volumes de dados do banco:** carregar 50k registros em memória para
  `filter`/`map` é ineficiente. Filtre/ordene via SQL (`where`, `orderBy`, `limit`,
  `chunkById`) e processe em lotes.
- **Loops simples de efeito colateral sem transformação:** um `foreach` direto ou
  `each` é suficiente e mais claro; evite `map` apenas para efeito colateral.
- **Acesso a um único elemento conhecido:** prefira `Arr::get`/`data_get` ou
  `->get($key)` a `filter`+`first`.
- **Performance crítica em hot path:** cada método de coleção cria nova instância e
  itera o array; um loop `for`/`foreach` com array nativo pode ser mais rápido para
  operações triviais em arrays pequenos. Collections brilham em **legibilidade e
  composição**, não em micro-otimização.

---

## 17. Notas Específicas da v5.5.50

- PHP mínimo: **7.1** (arrow functions ausentes; closures obrigatórias).
- *Lazy Collections* **ausentes** (recurso do Laravel 6+).
- Métodos funcionais presentes já em 5.5: `map`, `filter`, `reject`, `each`,
  `eachSpread`, `flatMap`, `mapSpread`, `mapToGroups`, `mapWithKeys`, `mapInto`,
  `transform`, `reduce`, `pipe`, `tap`, `when`, `unless`, `where*`, `firstWhere`,
  `groupBy`, `keyBy`, `partition`, `chunk`, `split`, `slice`, `take`, `splice`,
  `zip`, `collapse`, `flatten`, `pad`, `combine`, `union`, `intersect*`, `diff*`,
  `concat`, `unique*`, `pluck`, `values`, `keys`, `flip`, `implode`, `sum`, `avg`,
  `min`, `max`, `median`, `mode`, `every`, `contains*`, `first`, `last`, `search`,
  `times`, `sort`, `sortBy`, `sortByDesc`, `reverse`, `shuffle`, `nth`, `crossJoin`.
- *Higher Order Messages* suportados: `average`, `avg`, `contains`, `each`, `every`,
  `filter`, `first`, `flatMap`, `map`, `partition`, `reject`, `sortBy`, `sortByDesc`,
  `sum`, `unique`.
- Helpers funcionais globais disponíveis: `collect`, `optional`, `data_get`,
  `data_set`, `data_fill`, `value`, `with`, `retry`, `tap`, `transform`, `blank`,
  `filled`, `head`, `last`, `abort`, `abort_if`, `abort_unless`, `class_basename`,
  `method_field`, além das family `array_*`.
- **Ausentes** nesta versão (não documente como 5.5): `chunkWhile`, `join`,
  `reduceSpread`, `fold`, Lazy Collections, arrow functions.

---

## Resumo de Pontos-Chave

- Coleções (`Illuminate\Support\Collection`) são o paradigma funcional do Laravel;
  quase todos os métodos são **imutáveis** e retornam nova instância.
- *Higher Order Messages* permitem `$col->map->metodo()` / `$col->each->acao()` para
  reduzir *boilerplate* de closures.
- `map`/`filter` preservam chaves; `filter`, `sort`, `sortBy`, `unique`, `slice`,
  `intersect` exigem `->values()` para reindexar.
- `transform`, `forget`, `splice`, `pop`, `shift` **mutam** a coleção.
- `pipe` retorna o resultado do callback; `tap` (coleção) ignora o retorno e devolve
  a coleção; `tap` (helper) devolve o `$value`.
- `when`/`unless` dão ramificação fluente; `where*` filtram por par chave/valor
  (loose por padrão, com variantes `Strict`).
- Eloquent Collections estendem a base; `pluck`, `keys`, `zip`, `collapse`,
  `flatten`, `flip` retornam base collection.
- Em 5.5 **não existem**: Lazy Collections, `chunkWhile`, `join`, `reduceSpread`,
  `fold`, nem arrow functions do PHP 7.4 — use closures.
- Prefira filtrar/ordenar no banco para grandes volumes; coleções brilham em
  composição e legibilidade, não em micro-performance.

## Referências (arquivos da doc)

- `collections.md` — criação, métodos disponíveis, higher-order messages, `map`,
  `filter`, `reject`, `each`, `flatMap`, `transform`, `reduce`, `pipe`, `tap`,
  `when`, `unless`, `where*`, `sort*`, `groupBy`, `keyBy`, `partition`, `chunk`,
  `split`, `slice`, `take`, `splice`, `zip`, `collapse`, `flatten`, `pad`,
  `combine`, `union`, `intersect*`, `diff*`, `concat`, `unique*`, `pluck`,
  `values`, `keys`, `flip`, `implode`, `sum`, `avg`, `min`, `max`, `median`,
  `mode`, `every`, `contains*`, `first`, `last`, `search`, `times`, `firstWhere`.
- `helpers.md` — `collect`, `optional`, `data_get`, `data_set`, `data_fill`,
  `value`, `with`, `retry`, `tap`, `transform`, `blank`, `filled`, `head`, `last`,
  `abort`, `abort_if`, `abort_unless`, `class_basename`, `method_field`, família
  `array_*`.
- `eloquent-collections.md` — relação Eloquent Collection ↔ base Collection, métodos
  que retornam base collection, custom collections via `newCollection()`.
- `blade.md` — uso de `chunk()` em grids (ex.: Bootstrap `col-xs-4`).
- `queries.md` — filtragem/ordenação no banco (`where`, `orderBy`, `limit`,
  `chunkById`) para grandes volumes antes de materializar coleções.
