# Programação funcional avançada no PHP 8.5

Guia dedicado e autocontido para escrever PHP 8.5 em estilo funcional:
pureza, imutabilidade, composição de funções, callables, coleções, fluxos
preguiçosos, pipe operator, generators, fibers e disciplina de erros.
Todo o código é válido no PHP 8.5.13+ (`source/main/php_version.h:3-7`).

## Fontes

- `docs/pipe-operator.txt` (semântica e limitações do `|>`).
- `source/UPGRADING:181-185,204-207,744-746,798-800` (callables, pipe,
  Clone With, `array_first`/`array_last`).
- `source/Zend/tests/pipe_operator/call_by_ref.phpt` (parâmetros por referência).
- `source/Zend/tests/pipe_operator/precedence_addition.phpt` (precedência).

## 1. Fundamentos: pureza e imutabilidade

Uma função pura depende apenas dos argumentos e não produz efeitos
observáveis. Isso torna o código determinístico, paralelizável em teoria e
fácil de testar.

```php
<?php
declare(strict_types=1);

/** @param list<int> $nums @return list<int> */
function dobrar(array $nums): array
{
    return array_map(static fn(int $n): int => $n * 2, $nums);
}
```

Use `readonly class` para valores e `clone($obj, [...])` para variações
(`source/UPGRADING:744-746`). Para sobrescrever uma propriedade readonly
**de fora da classe**, ela precisa de `public public(set)`:

```php
readonly class Ponto
{
    public function __construct(
        public public(set) int $x,
        public public(set) int $y,
    ) {}
}

$mover = static fn(Ponto $p, int $dx): Ponto => clone($p, ['x' => $p->x + $dx]);
```

Se a lógica pertence ao objeto, use método e visibilidade normal — o engine
respeita escopo (`source/Zend/tests/clone/clone_with_002.phpt:12-14`).

## 2. Callables: quatro formas

| Forma | Quando usar | Exemplo |
| --- | --- | --- |
| Closure | lógica com estado/captura | `function (int $x) use ($fator): int { ... }` |
| Arrow fn | expressão curta, captura por valor | `fn(int $x): int => $x * $fator` |
| First-class callable | reutilizar função/método existente | `strtolower(...)`, `$obj->metodo(...)` |
| Invokable | objeto com comportamento de função | `new Normalizador()` com `__invoke()` |

`Closure` é subtipo correto de `callable` no 8.5
(`source/UPGRADING:181`) e first-class callables podem aparecer em
expressões constantes — inclusive parâmetros de atributos
(`source/UPGRADING:182-185`).

```php
#[\Attribute(\Attribute::TARGET_METHOD)]
final class Pipe
{
    /** @param list<Closure> $etapas */
    public function __construct(public readonly array $etapas) {}
}

final class Servico
{
    #[Pipe([trim(...), strtolower(...)])]
    public function executar(string $s): string { return $s; }
}
```
Na seção seguinte, todas as arrow functions usadas à direita do pipe aparecem
entre parênteses. Isso é obrigatório no 8.5: sem parênteses, o compilador falha
com `Arrow functions on the right hand side of |> must be parenthesized`
(`source/Zend/zend_compile.c:6505-6507`).

## 3. Composição com o pipe operator `|>`

O pipe encadeia callables da esquerda para a direita, passando o valor como
**primeiro argumento** (`source/UPGRADING:204-205`). Não é paralelismo nem
atalho de performance: o compilador gera opcodes semelhantes a chamadas
aninhadas (`docs/pipe-operator.txt`).

```php
$slug = ' PHP 8.5 Released '
    |> trim(...)
    |> (fn(string $s): string => str_replace(' ', '-', $s))
    |> (fn(string $s): string => str_replace('.', '', $s))
    |> strtolower(...);
// "php-85-released"
```

### Compositor reutilizável

```php
/**
 * @param list<callable> $fns
 * @return Closure(mixed):mixed
 */
function compose(array $fns): Closure
{
    return static fn(mixed $v): mixed => array_reduce(
        $fns,
        static fn(mixed $acc, callable $f): mixed => $f($acc),
        $v,
    );
}

$normalizar = compose([trim(...), strtolower(...)]);
echo $normalizar('  ABC  '); // abc
```

### Regras e armadilhas do pipe

- Cada callable deve aceitar **um único parâmetro obrigatório**; não há
  reordenação de argumentos (`docs/pipe-operator.txt`).
- Parâmetros por referência são rejeitados — `array_pop()` falha
  (`source/Zend/tests/pipe_operator/call_by_ref.phpt:15-37`). Use closure:
  ```php
  $ultimo = explode('-', 'a-b-c')
      |> (static fn(array $p): string => array_pop($p)); // "c"
  ```
- Retorno `void` vira `null` a partir daí; coloque esses callables no fim.
- Com `strict_types=1`, a coerção é a normal: `1 |> strlen(...)` lança
  `TypeError`.
- Precedência: `10 + 6 |> dechex(...) |> hexdec(...)` é `16`
  (`source/Zend/tests/pipe_operator/precedence_addition.phpt`).

## 4. Coleções: `array_*` sem loops manuais

```php
$numeros = [1, 2, 3, 4, 5, 6];

$pares   = array_filter($numeros, static fn(int $n): bool => $n % 2 === 0);
$dobrados = array_map(static fn(int $n): int => $n * 2, $pares);
$soma    = array_reduce($numeros, static fn(int $a, int $n): int => $a + $n, 0);
```

Do 8.4: `array_all`, `array_any`, `array_find`, `array_find_key`.
Do 8.5: `array_first()` e `array_last()`
(`source/UPGRADING:798-800`).

```php
$todosAtivos = array_all($usuarios, static fn(array $u): bool => $u['ativo']);
$primeiroErro = array_find($erros, static fn(array $e): bool => $e['grave']);
$ultimoEvento = array_last($eventos) ?? throw new RuntimeException('vazio');
```

> `array_first`/`array_last` retornam `null` para array vazio **e** para valor
> `null` legítimo. Se a distinção importa, use `array_key_first()`/
> `array_key_last()` ou verifique `array_key_exists()`.

### `array_reduce` com estado tipado

```php
/** @param array<string,int> $contagem */
$contagem = array_reduce(
    ['a', 'b', 'a'],
    static function (array $acc, string $k): array {
        $acc[$k] = ($acc[$k] ?? 0) + 1;
        return $acc;
    },
    [],
);
// ['a' => 2, 'b' => 1]
```

## 5. Fluxos preguiçosos com generators

`array_map`/`array_filter` materializam arrays. Para volumes grandes, use
`yield` — a memória permanece constante.

```php
function pares(iterable $nums): Generator
{
    foreach ($nums as $n) {
        if ($n % 2 === 0) {
            yield $n;
        }
    }
}

function lerLinhas(string $arquivo): Generator
{
    $h = fopen($arquivo, 'rb') or throw new RuntimeException('abertura falhou');
    try {
        while (($linha = fgets($h)) !== false) {
            yield rtrim($linha, "\r\n");
        }
    } finally {
        fclose($h);
    }
}

foreach (pares(range(1, 1_000_000)) as $par) {
    // processa sem materializar 1e6 elementos
}
```

`yield from` compõe geradores. Um pipe **não** itera generators: ovalor
encaminhado é o próprio `Generator`. Converta com `iterator_to_array()` apenas
em janelas pequenas, ou acumule com `foreach`.

## 6. Fibers: concorrência cooperativa, não paralelismo

`Fiber` permite suspender e retomar execução — útil em schedulers de
frameworks assíncronos. Não é thread nem acelera CPU-bound work.

```php
$fiber = new Fiber(static function (): void {
    $valor = Fiber::suspend('esperando');
    Fiber::suspend($valor * 2);
});

$primeiro = $fiber->start();   // "esperando"
$segundo  = $fiber->resume(21); // 42
```

A branch 8.5 inclui correções de fibers durante unwind de exceções
(`source/NEWS:21-22`). Em aplicação, use fibers via framework, não scheduler
artesanal.

## 7. Manipulação imutável de strings e dados

```php
$resultado = '  usuario@exemplo.com  '
    |> trim(...)
    |> (fn(string $s): string => strtolower($s))
    |> (fn(string $s): string => filter_var($s, FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE));
```

A validação com `FILTER_THROW_ON_FAILURE` lança
`Filter\FilterFailedException` (`source/UPGRADING:265-270`) — não combine com
`FILTER_NULL_ON_FAILURE`.

Para URLs, use a extensão URI: `Uri\Rfc3986\Uri` e `Uri\WhatWg\Url` são
`final readonly`; `with*` e `resolve()` retornam novos objetos
(`source/ext/uri/php_uri.stub.php:30-96,153-220`).

```php
use Uri\Rfc3986\Uri;

$base = new Uri('https://exemplo.com/api/');
$endpoint = $base->resolve('v1/pedidos')->withPath('/api/v2/pedidos');
```

## 8. Erros em estilo funcional

Prefira `throw` como expressão a valores sentinela:

```php
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, FILTER_THROW_ON_FAILURE)
    ?? throw new InvalidArgumentException('id ausente');
```

`#[\NoDiscard]` sinaliza API cujo retorno não pode ser ignorado
(`source/UPGRADING:189-196`):

```php
#[\NoDiscard]
function conferir(int $n): int
{
    return $n >= 0 ? $n : throw new DomainException('negativo');
}

conferir(1);        // aviso
(void) conferir(1); // descarte intencional
$x = conferir(1);   // correto
```

Nunca use exceções para fluxo normal; nunca engula `Throwable` sem engolir silenciosamente.
Capture primeiro o tipo específico (`Filter\FilterFailedException`,
`Uri\InvalidUriException`), depois `Throwable`.

### Estudo de caso: pipeline de ingestão

Combine validação com exceção, URI imutável e valor derivado sem estado
mutável:

```php
use Uri\Rfc3986\Uri;

$processar = static fn(string $bruta): array => [
    'origem' => Uri::parse($bruta)?->toString()
        ?? throw new InvalidArgumentException('URI invalida'),
    'slug'   => $bruta |> trim(...) |> strtolower(...),
];
```

Cada etapa retorna um valor novo; falhas são explícitas e não produzem um
objeto parcialmente inicializado.

## 9. Performance e disciplina

- Pipe e closures não são mais caros que chamadas equivalentes — meça com
  `hrtime(true)` antes de substituir código claro.
- Copy-on-write torna variáveis temporárias baratas: criar `$tmp` não copia
  o array até que ele seja modificado (`docs/pipe-operator.txt`).
- `array_first`/`array_last` são O(n) no pior caso sobre hash, mas evitam
  cálculo de chave e são mais legíveis (`source/ext/standard/array.c:4598-4622`).
- Para macros datasets, generators > arrays materializados.
- Prefira funções curtas e nomes explícitos a encadeamentos longos: uma cadeia
  com mais de 5 etapas merece ser nomeada.

## 10. Anti-padrões

| Anti-padrão | Correção |
| --- | --- |
| `array_pop()` direto no pipe | closure intermediária |
| `void` no meio da cadeia | mover para o fim |
| `array_map` em 1e6 itens | generator + `foreach` |
| `?? null` como erro silencioso | `?? throw ...` |
| `&` em parâmetros "para performance" | valor + `readonly` |
| Ignorar retorno de `#[\NoDiscard]` | uso ou `(void)` explícito |
| Capturar `Throwable` genérico | capturas específicas primeiro |

## Verificação

Execute com PHP 8.5.13+:

```bash
php -l 26-programacao-funcional-avancada.md 2>/dev/null || true
php -r '$f = static fn(int $n): int => $n * 2; echo 21 |> $f; // 42'
```

Cenários esperados:

1. `10 + 6 |> dechex(...) |> hexdec(...)` → `16`.
2. `explode('-', 'a-b-c') |> array_pop(...)` → `Error` por referência.
3. `clone($p, ['x' => 10])` com `public(set)` → novo objeto; sem
   `public(set)` → `Error`.
4. `filter_var('x', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE)` →
   `Filter\FilterFailedException`.
