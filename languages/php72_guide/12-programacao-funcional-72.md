Complementar ao documento comum — específico do PHP 7.2.

# Programação Funcional no PHP 7.2 (além do básico)

Este suplemento cobre closures, funções de primeira classe utilitárias, e
programação funcional disponíveis no 7.2. Todo o código é válido em 7.2.

> Aviso de escopo: **não** existem no 7.2 algumas construções de sintaxe de
> versões posteriores. Use closures completas `function () {}` e `array_merge()`.

## 1. Closures / funções anônimas

```php
<?php
$soma = function (int $a, int $b): int {
    return $a + $b;
};

echo $soma(2, 3); // 5
```

### Uso de variáveis do escopo (`use`)

```php
<?php
$fator = 10;
$multiplicar = function (int $x) use ($fator): int {
    return $x * $fator;
};

// Por referência (cuidado com lifetime):
$contador = 0;
$inc = function () use (&$contador): int {
    return ++$contador;
};
```

## 2. `Closure` — `bind`, `bindTo`, `fromCallable`

Closures têm a classe `Closure`. `bindTo`/`bind` permitem alterar o `$this` e
o escopo de visibilidade de uma closure (útil para acessar membros
`protected`/`private` em testes ou frameworks).

```php
<?php
class Segredo {
    private $valor = 42;
}

$fn = function () {
    return $this->valor;
};

$liga = $fn->bindTo(new Segredo(), Segredo::class);
echo $liga(); // 42 (acessa private via escopo da classe)
```

`Closure::bind` (estático) faz o mesmo:

```php
<?php
$liga2 = Closure::bind(function () {
    return $this->valor;
}, new Segredo(), Segredo::class);
echo $liga2();
```

### `Closure::fromCallable` (7.1)

Converte um callable tradicional (string, método estático, etc.) em uma
`Closure` real — permitindo usar `bindTo` ou passá-la como closure.

```php
<?php
function dobro(int $x): int { return $x * 2; }

$closure = Closure::fromCallable('dobro');
echo $closure(5); // 10
```

## 3. Variádicas `...$args`

Na **definição**, `...` coleta argumentos em um array. Na **chamada**, espalha
(ver `10-sintaxe-recursos-72.md`).

```php
<?php
function media(...$nums): float {
    return array_sum($nums) / count($nums);
}

echo media(1, 2, 3, 4); // 2.5

// Repasse de argumentos
function repassar(callable $fn, ...$args) {
    $r = $fn(...$args);
    return $r;
}
```

## 4. `array_map`, `array_filter`, `array_reduce`, `array_walk`

```php
<?php
$numeros = [1, 2, 3, 4, 5];

$dobrados = array_map(function ($n) { return $n * 2; }, $numeros);
// [2, 4, 6, 8, 10]

$pares = array_filter($numeros, function ($n) { return $n % 2 === 0; });
// [2, 4] (mantém chaves)

$soma = array_reduce($numeros, function ($acc, $n) {
    return $acc + $n;
}, 0);
// 15

array_walk($numeros, function (&$v, $k) {
    $v = $v * $v;
});
// $numeros agora [1, 4, 9, 16, 25]
```

### `ARRAY_FILTER_USE_BOTH` / `ARRAY_FILTER_USE_KEY`

```php
<?php
$dados = ['a' => 1, 'b' => 2, 'c' => 3];

$filtrados = array_filter($dados, function ($v, $k) {
    return $k !== 'b' && $v > 1;
}, ARRAY_FILTER_USE_BOTH);
// ['c' => 3]
```

## 5. Geradores (`yield`, `yield from`)

Desde o PHP 5.5, com `yield from` desde o PHP 7.0. Geradores são lazy e
econômicos em memória — ideais para streams/grandes coleções.

```php
<?php
function contarAte(int $n): Generator {
    for ($i = 1; $i <= $n; $i++) {
        yield $i;
    }
}

foreach (contarAte(5) as $x) {
    echo $x; // 12345
}

// yield com chave
function mapa(): Generator {
    yield 'um' => 1;
    yield 'dois' => 2;
}

// yield from: delega para outro gerador/iterável
function todos(): Generator {
    yield from contarAte(3);
    yield from [4, 5];
}
```

### Gerador como consumidor (`$received = yield`)

```php
<?php
function somador(): Generator {
    $total = 0;
    while (true) {
        $valor = yield $total;
        $total += $valor;
    }
}

$g = somador();
$g->send(0);          // inicializa (primeiro yield retorna 0)
echo $g->send(10);    // 10
echo $g->send(5);     // 15
```

## 6. `call_user_func` / `call_user_func_array`

```php
<?php
function saudar($a, $b) { return "$a $b"; }

echo call_user_func('saudar', 'Olá', 'Mundo');
echo call_user_func_array('saudar', ['Olá', 'Mundo']);

// Método de instância
call_user_func([$obj, 'metodo'], $arg);
```

## 7. Resumo

| Recurso | Disponível | Notas |
|---|---|---|
| Closures `function () {}` | 5.3 | com `use` |
| `Closure::bind/bindTo` | 5.4 | mudar `$this`/escopo |
| `Closure::fromCallable` | 7.1 | callable → Closure |
| `...$args` variádica | 5.6 | definição e chamada |
| `array_map/filter/reduce/walk` | 4+ | funções de ordem superior |
| `yield` / `yield from` | 5.5 / 7.0 | geradores lazy |
