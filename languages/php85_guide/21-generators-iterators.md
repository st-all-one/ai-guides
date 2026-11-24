# Geradores, iteradores e fibers no PHP 8.5

Nada mudou na semântica de `yield`, `yield from`, `Fiber` ou SPL Iterators
entre 8.4 e 8.5. Este capítulo registra o estado final e a interação com os
novos recursos.

## Fontes

- `source/Zend/tests/pipe_operator/generators.phpt` (pipe com generators).
- `source/UPGRADING:798-800` (`array_first`/`array_last`).
- `source/NEWS` (correções de fibers na branch 8.5, exemplos em `source/NEWS:21,423`).

### Geradores

```php
function linhas(string $arquivo): Generator
{
    $h = fopen($arquivo, 'rb') or throw new RuntimeException('abriu? não');
    try {
        while (($linha = fgets($h)) !== false) {
            yield rtrim($linha, "\r\n");
        }
    } finally {
        fclose($h);
    }
}
```

Use `yield` para manter memória constante ao processar arquivos, streams ou
resultados de banco. `yield from` compõe geradores sem materializar arrays.

### Pipe e generators

O pipe aceita generators como callable? Não: o pipe encadeia **callables**,
não iteráveis. Um generator é uma função que retorna `Generator`; usá-la como
callable no pipe faria o valor virar `Generator`, não os elementos. Encapsule
a iteração em closure quando precisar combinar os dois mundos
(`source/Zend/tests/pipe_operator/generators.phpt`).

```php
$soma = (static fn(iterable $it): int => array_sum(iterator_to_array($it, false)))(linhas('dados.csv'));
```

Para dados grandes, evite `iterator_to_array()`: itere com `foreach` e acumule.

### `array_first`/`array_last` não são iteradores

Essas funções exigem `array` (`source/UPGRADING:798-800`). Em um generator,
faça a seleção durante a iteração:

```php
$primeiro = null;
foreach (linhas('dados.csv') as $linha) {
    $primeiro ??= $linha;
    break;
}
```

### Fibers

`Fiber` continua sendo primitiva de concorrência cooperativa, não paralelismo.
A branch 8.5 inclui correções relacionadas a exceções em fibers
(`source/NEWS:21,423`). Use via framework assíncrono; não construa um
scheduler ad hoc em código de aplicação.

### SPL Iterators

`ArrayIterator`, `CachingIterator`, `LimitIterator` etc. permanecem úteis para
janelas de dados. Atenção: `ArrayObject`/`ArrayIterator` com objetos estão
depreciados no 8.5 (`source/UPGRADING:570-571`).

## Verificação

- Script com 1e6 linhas: memória deve permanecer estável ao usar `yield`.
- `php -l` e teste de smoke com `array_first()` sobre array já materializado.
