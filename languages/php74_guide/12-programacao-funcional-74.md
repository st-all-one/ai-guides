Complementar ao documento comum — específico do PHP 7.4.

# Programação Funcional (PHP 7.4)

Este documento estende o "Programação Funcional (Baseline)" com os recursos
funcionais que o PHP 7.4 trouxe ou consolidou. O destaque é a **arrow function**
(`fn () =>`), mas também revisamos closures, `Closure::fromCallable`, funções de
array de ordem superior e geradores — todos válidos no 7.4.

> Fora de escopo (8.x): certas sintaxes de callable introduzidas em versões
> posteriores. Não use essas sintaxes aqui.

## 1. Arrow functions `fn() =>` (PHP 7.4)

Sintaxe curta para closures. A diferença fundamental: **capturam por valor**
automaticamente as variáveis do escopo externo — sem `use`.

```php
<?php
$fator = 10;
$dobrados = array_map(fn($n) => $n * $fator, [1, 2, 3]);
// [10, 20, 30]
```

Isso as torna ideais para callbacks curtos em `array_map`, `array_filter`,
`array_reduce`, `usort`, etc.

### Assinaturas completas

```php
<?php
fn(array $x) => $x;
static fn($x): int => $x;
fn($x = 42) => $x;
fn(&$x) => $x;            // passagem por referência
fn($x, ...$rest) => $rest; // variádica
```

### Captura por valor: não modifica o escopo externo

```php
<?php
$total = 0;
$add = fn($n) => $total += $n; // NÃO altera $total externo
$add(5);
var_dump($total); // int(0)
```

Para acumular estado no escopo externo, use uma closure tradicional com
`use (&$total)`:

```php
<?php
$total = 0;
$add = function ($n) use (&$total) { $total += $n; };
$add(5);
var_dump($total); // int(5)
```

### Arrow functions aninhadas

```php
<?php
$z = 1;
$fn = fn($x) => fn($y) => $x * $y + $z;
var_dump($fn(5)(10)); // int(51)
```

## 2. Closures (revisão do baseline)

A classe `Closure` já existia; no 7.4 continua igual. Lembrete rápido:

```php
<?php
$multiplicador = 3;
$vezes = function (int $n) use ($multiplicador): int {
    return $n * $multiplicador;
};
```

`Closure::bind()` / `bindTo()` alteram o `$this` e a visibilidade (útil em
testes). `Closure::fromCallable()` (7.1+) converte um callable em `Closure`:

```php
<?php
function soma(int $a, int $b): int { return $a + $b; }
$c = Closure::fromCallable('soma');
var_dump($c(2, 3)); // int(5)
```

## 3. Funções variádicas e desempacotamento

`...` na definição reúne argumentos restantes; `...` na chamada desempacota
(vide "Sintaxe Básica" do documento comum e o spread em arrays do 7.4).

```php
<?php
function media(...$nums): float
{
    return $nums === [] ? 0.0 : array_sum($nums) / count($nums);
}
var_dump(media(...[10, 20, 30])); // float(20)
```

## 4. Funções de array de ordem superior

### `array_map` com arrow functions

```php
<?php
$numeros = [1, 2, 3, 4];
$quadrados = array_map(fn($n) => $n * $n, $numeros);
// [1, 4, 9, 16]

// Múltiplos arrays:
$soma = array_map(
    fn($a, $b) => $a + $b,
    [1, 2, 3],
    [10, 20, 30]
);
// [11, 22, 33]
```

### `array_filter`

```php
<?php
$pares = array_filter([1, 2, 3, 4], fn($n) => $n % 2 === 0);
// [2, 4] (índices preservados)
$reindexado = array_values($pares);
```

### `array_reduce`

```php
<?php
$total = array_reduce(
    [1, 2, 3, 4],
    fn($acc, $n) => $acc + $n,
    0
);
// 10
```

### `array_walk` (modificação por referência)

```php
<?php
$nomes = ['ana', 'bia'];
array_walk($nomes, fn(&$v) => $v = ucfirst($v));
// ['Ana', 'Bia']
```

### `array_merge` sem argumentos (PHP 7.4)

`array_merge()` e `array_merge_recursive()` agora aceitam zero argumentos
(retornam `[]`), o que combina com o spread:

```php
<?php
$arrays = [['a'], ['b', 'c'], []];
$achatado = array_merge(...$arrays); // ['a', 'b', 'c']
```

## 5. Geradores (`yield`)

Geradores continuam disponíveis no 7.4 (desde 5.5) e são a base de pipelines
preguiçosos/eficientes em memória.

```php
<?php
function contarAte(int $limite): Generator
{
    for ($i = 1; $i <= $limite; $i++) {
        yield $i;
    }
}

foreach (contarAte(3) as $n) {
    echo $n; // 1 2 3
}
```

`yield from` delega para outro gerador/array/Traversable:

```php
<?php
function todas(): Generator
{
    yield from contarAte(2);
    yield from [3, 4];
}
```

## 6. Exemplo combinado (pipeline funcional)

```php
<?php
$numeros = [5, 12, 8, 3, 20];

$maioresQue5 = array_filter($numeros, fn($n) => $n > 5);
$soma = array_reduce($maioresQue5, fn($acc, $n) => $acc + $n, 0); // 40
$dobrados = array_map(fn($n) => $n * 2, $numeros);

usort($numeros, fn($a, $b) => $a <=> $b); // ordenação com spaceship
```

## 7. Diretrizes

- Use arrow functions para callbacks curtos e puros que apenas **leem** o escopo
  externo (captura por valor).
- Use closures `function () use (&$v)` quando precisar **escrever** no escopo
  externo.
- Prefira `array_map`/`array_filter`/`array_reduce` a loops mutáveis para
  transformações puras.
- Use geradores para fluxos grandes ou preguiçosos.
- Não use sintaxes de callable introduzidas em versões 8.x — são de versões
  posteriores.

## 8. Resumo

- Arrow functions (`fn () =>`) no 7.4: concisas, captura por valor.
- Closures, `Closure::fromCallable`, variádicas: do baseline.
- `array_map`/`array_filter`/`array_reduce`/`array_walk` + geradores: combinam
  perfeitamente com arrow functions.
- `array_merge()` sem args (7.4) facilita o padrão `array_merge(...$arrays)`.
