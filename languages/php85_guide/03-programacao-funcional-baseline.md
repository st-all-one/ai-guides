# Programação funcional básica no PHP 8.5

Base: closures, arrow functions, `array_map`/`array_filter`/`array_reduce`,
first-class callables, generators e `match`. O 8.5 acrescenta o pipe.

## Fontes

- `docs/pipe-operator.txt`.
- `source/UPGRADING:204-205,798-800`.

### Arrow functions e first-class callables

```php
$dobros = array_map(fn(int $n): int => $n * 2, [1, 2, 3]);
$mai = strtoupper(...);
echo array_map($mai, ['a', 'b'])[0]; // A
```

### Array functions modernas

`array_all`, `array_any`, `array_find`, `array_find_key` (8.4) e
`array_first`/`array_last` (8.5) cobrem a maior parte das necessidades sem
loops manuais (`source/UPGRADING:798-800`).

```php
$ok = array_all($residentes, fn($r) => $r['ativo']);
$ultimo = array_last($eventos) ?? null;
```

### Pipe

```php
$slug = ' PHP 8.5 '
    |> trim(...)
    |> (fn(string $s): string => str_replace(' ', '-', $s))
    |> strtolower(...);
```

O pipe não muda a semântica de chamadas nem adiciona custo relevante — opcodes
são semelhantes a chamadas aninhadas (`docs/pipe-operator.txt`).

### Imutabilidade

Prefira funções puras e valores imutáveis (`readonly class`, `clone()` com
substituição no 8.5). Evite `&` em parâmetros; o pipe, inclusive, rejeita
callables com parâmetros por referência
(`source/Zend/tests/pipe_operator/call_by_ref.phpt:15-37`).

## Verificação

- Teste de equivalência entre cadeia `|>` e chamadas aninhadas.
