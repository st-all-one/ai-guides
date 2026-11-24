# Programação funcional no PHP 8.5

O pipe operator é a adição funcional mais relevante do 8.5. Ele se soma a
arrow functions, first-class callables, `array_all`/`array_any`/
`array_find`/`array_find_key` (8.4) e generators. A regra de ouro: o pipe
organiza cadeias de **uma entrada / uma saída**; para operações com estado ou
múltiplos argumentos, use closures ou funções nomeadas.

## Fontes

- `docs/pipe-operator.txt` (limitações, precedência, callables aceitos).
- `source/UPGRADING:181-185,204-205,747` (callables, pipe, `Closure::getCurrent`).
- `source/UPGRADING:798-800` (`array_first`/`array_last`).

### Encadeamento com `|>`

```php
<?php
declare(strict_types=1);

final class Normalizador
{
    /** @return list<Closure(string):string> */
    private function etapas(): array
    {
        return [
            trim(...),
            static fn(string $s): string => str_replace(' ', '-', $s),
            strtolower(...),
        ];
    }

    public function slug(string $titulo): string
    {
        $etapas = $this->etapas();
        return $titulo
            |> $etapas[0]
            |> $etapas[1]
            |> $etapas[2];
    }
}
```

Cada callable recebe o valor anterior como primeiro argumento; não há
reordenação de parâmetros (`docs/pipe-operator.txt`). A cadeia compila para
opcodes semelhantes a chamadas aninhadas — não há custo extra por nível além
do das próprias chamadas.

### Composição com funções de primeira classe

```php
$maiusculas = strtoupper(...);
$semEspacos = static fn(string $s): string => str_replace(' ', '', $s);

$normalizar = static fn(string $s): string => $s |> $maiusculas |> $semEspacos;
echo $normalizar(' PHP 8.5 '); // PHP8.5
```

### `array_first`/`array_last` em pipelines

```php
$eventos = [
    ['tipo' => 'login', 'ok' => true],
    ['tipo' => 'falha', 'ok' => false],
];

$ultimoSucesso = $eventos
    |> (static fn(array $e): array => array_filter($e, static fn(array $v): bool => $v['ok']))
    |> array_last(...);
// ['tipo' => 'login', 'ok' => true]
```

> Cuidado: `array_first`/`array_last` retornam `null` tanto para array vazio
> quanto para valor `null` legítimo (`docs/array_first-array_last.txt`). Use
> `array_key_first()`/`array_key_last()` quando a distinção importa.

### Limitações que afetam estilo funcional

| Limitação | Alternativa |
| --- | --- |
| Apenas 1 parâmetro obrigatório por callable | closure que captura o contexto extra |
| Parâmetro por referência (`array_pop`) | closure intermediária com variável local |
| Retorno `void` vira `null` | coloque o callable `void` no fim da cadeia |
| `strict_types` aplica coerência normal | converta antes do pipe se necessário |

### `Closure::getCurrent()`

Para instrumentação de callbacks, o 8.5 oferece `Closure::getCurrent()`
(`source/UPGRADING:747`). Útil para identificar qual closure está em execução
em logs de pipeline — evite usá-la como mecanismo de controle de fluxo.

```php
$medir = static function (mixed $v): mixed {
    $quem = \Closure::getCurrent();
    error_log('etapa=' . spl_object_id($quem));
    return $v;
};
```

### Geradores continuam sendo o mecanismo de streaming

O pipe não substitui `yield`: para conjuntos grandes, gere valores sob demanda
e use `array_*` apenas em janelas pequenas. `array_first()`/last sobre um array
já materializado não evita o custo de construí-lo.

## Verificação

- `php -l` nos exemplos.
- Teste de equivalência: compare o resultado da cadeia `|>` com a versão
  aninhada em um script throwaway antes de adotar em código crítico.
