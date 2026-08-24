Complementar ao documento comum — específico do PHP 7.2.

# Geradores e Iteradores no PHP 7.2

Este documento cobre geradores e os iteradores SPL disponíveis no PHP 7.2.
Todo o código aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores.

## 1. O que é um gerador

Um gerador é uma função que produz uma sequência de valores ao longo do tempo,
sem construir um array inteiro na memória. Em vez de `return`, usa-se `yield`.

```php
<?php
function contarAte(int $limite): Generator
{
    for ($i = 1; $i <= $limite; $i++) {
        yield $i;
    }
}

foreach (contarAte(5) as $n) {
    echo $n; // 1 2 3 4 5
}
```

## 2. `yield` de valor e de chave

```php
<?php
function pares(): Generator
{
    for ($i = 0; $i < 5; $i++) {
        yield $i => $i * 2;
    }
}

foreach (pares() as $indice => $valor) {
    echo "$indice:$valor ";
}
```

Também é possível obter o valor enviado de volta com `yield` em contexto de
expressão:

```php
<?php
function eco(): Generator
{
    while (true) {
        $linha = yield;
        echo $linha . PHP_EOL;
    }
}

$g = eco();
$g->send('ola');
$g->send('mundo');
```

## 3. Delegação de gerador (`yield from`, 7.0+)

Um gerador pode delegar a outro, encadeando a produção de valores.

```php
<?php
function a(): Generator
{
    yield 1;
    yield 2;
}

function b(): Generator
{
    yield from a();
    yield 3;
}

foreach (b() as $v) {
    echo $v; // 1 2 3
}
```

## 4. Gerador como iterador

Um gerador implementa automaticamente `Iterator`. Por isso pode ser usado
em qualquer lugar que aceite um iterável.

```php
<?php
function linhas(string $arquivo): Generator
{
    $h = fopen($arquivo, 'r');
    while (($linha = fgets($h)) !== false) {
        yield rtrim($linha);
    }
    fclose($h);
}

foreach (linhas('/tmp/arquivo.txt') as $linha) {
    echo $linha . PHP_EOL;
}
```

## 5. `return` em geradores (7.0+) e `getReturn()`

A partir do 7.0, `return` em um gerador define um valor final acessível via
`getReturn()` **depois** que o gerador for consumido por completo.

```php
<?php
function soma(): Generator
{
    $total = 0;
    for ($i = 1; $i <= 3; $i++) {
        $total += $i;
        yield $i;
    }
    return $total;
}

$g = soma();
foreach ($g as $v) {
    echo $v;
}
echo $g->getReturn(); // 6
```

## 6. Iteradores SPL (conceitual)

A SPL oferece interfaces e classes de iteração. As principais:

- `Iterator`: define `current()`, `key()`, `next()`, `rewind()`, `valid()`.
- `IteratorAggregate`: define apenas `getIterator()`, delegando a outro
  iterador.
- `ArrayIterator`, `RecursiveArrayIterator`, `FilesystemIterator`, etc.

Exemplo com `IteratorAggregate`:

```php
<?php
class Colecao implements IteratorAggregate
{
    private $dados = ['a', 'b', 'c'];

    public function getIterator(): Iterator
    {
        return new ArrayIterator($this->dados);
    }
}

foreach (new Colecao() as $item) {
    echo $item;
}
```

Exemplo de implementação manual de `Iterator`:

```php
<?php
class Contador implements Iterator
{
    private $pos = 0;
    private $lim = 3;

    public function rewind(): void { $this->pos = 0; }
    public function current() { return $this->pos; }
    public function key() { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return $this->pos < $this->lim; }
}

foreach (new Contador() as $v) {
    echo $v; // 0 1 2
}
```

## 7. Resumo

| Recurso | Desde | Notas no 7.2 |
|---|---|---|
| `yield` | 5.5 | produz valor sob demanda |
| chave/valor | 5.5 | `yield $k => $v` |
| `yield from` | 7.0 | delegação |
| `return` + `getReturn()` | 7.0 | valor final |
| `Iterator`/`IteratorAggregate` | 5.3 | SPL |
| `ArrayIterator` | 5.3 | SPL |
