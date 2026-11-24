# Operadores no PHP 8.5

O operador mais importante deste capítulo é o novo pipe `|>`. Ele coexiste com
`??`, `?:`, `<=>`, `match`, `?->`, spread e callable de primeira classe.

## Fontes

- `docs/pipe-operator.txt` (precedência e exemplos oficiais).
- `source/Zend/zend_language_parser.y` (gramática `T_PIPE`).
- `source/UPGRADING:204-205,377-378,386-389` (pipe, backtick, incremento).

### Pipe `|>`

```php
$resultado = $entrada
    |> trim(...)
    |> strtoupper(...);
```

O valor da esquerda é passado como **primeiro argumento** do callable da
direita. Precedência confirmada nos testes oficiais
(`docs/pipe-operator.txt`, seção "Operator precedence"):

```php
echo 10 + 6 |> dechex(...) |> hexdec(...);   // 16: soma primeiro
echo 10 + (6 |> dechex(...)) |> hexdec(...); // 22: parênteses primeiro
```

`??`, `?:` e comparações são avaliados da esquerda para a direita em relação
ao pipe; `==`/`===` têm precedência menor.

### Operadores depreciados/removidos no 8.5

| Operador | Estado | Substituto | Fonte |
| --- | --- | --- | --- |
| `` `comando` `` | depreciado | `shell_exec()` (ou evite shell) | `source/UPGRADING:377-378` |
| `$s++` em string não numérica | depreciado | `str_increment()` | `source/UPGRADING:386-389` |
| `case x;` em `switch` | depreciado | `case x:` | `source/UPGRADING:374-376` |

### Casts

`(bool)`, `(int)`, `(float)`, `(string)` são os únicos nomes canônicos
(`source/UPGRADING:368-370`). Casts em expressões constantes são novos no 8.5
(`source/UPGRADING:199`).

```php
const LIMITE = (int) 1_000.9;
```

### Avisos em operações numéricas

- Cast de `NAN` para outro tipo: aviso (`source/UPGRADING:61-62`).
- Float fora da faixa de `int`: aviso, inclusive em cast implícito
  (`source/UPGRADING:58-60`).

### Callable de primeira classe

`strlen(...)`, `Foo::bar(...)`, `$obj->metodo(...)` continuam válidos e são a
forma recomendada de alimentar o pipe. `Closure` agora é subtipo correto de
`callable` (`source/UPGRADING:181`).

```php
$mai = strtoupper(...);
echo 'abc' |> $mai; // ABC
```

### Constantes mágicas e build

Novas constantes globais: `PHP_BUILD_PROVIDER` e `PHP_BUILD_DATE`
(`source/UPGRADING:885-887`). Úteis para telemetria de build, não para lógica
de negócio.

## Verificação

- `php -l` nos exemplos.
- Script de precedência: compare `10 + 6 |> dechex(...) |> hexdec(...)` com o
  resultado esperado `16`.
