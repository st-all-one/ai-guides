# Tipagem básica no PHP 8.5

Base estável: `declare(strict_types=1)` + tipos explícitos em parâmetros,
retornos e propriedades. O 8.5 mantém union/intersection/DNF, enums, readonly
e property hooks do 8.0–8.4.

## Fontes

- `source/UPGRADING:181-214` (ajustes 8.5).
- `docs/pipe-operator.txt` (coerção).

### Regras

```php
<?php
declare(strict_types=1);

function total(array $itens): float
{
    return array_sum($itens);
}
```

- `strict_types` é por arquivo e afeta argumentos de chamadas feitas **no
  arquivo**; retornos são sempre estritos.
- `?T` = `T|null`; `mixed` é explícito (não use `?mixed`).
- `void` e `never` para funções sem retorno; `static` para fluent interfaces.
- Tipos de interseção (`A&B`) e DNF (`(A&B)|C`) para combinações.
- `readonly` para imutabilidade; `public private(set)` para leitura pública e
  escrita restrita (agora também em `static`, `source/UPGRADING:197-198`).

### Novidades 8.5

- `Closure` é subtipo de `callable` (`source/UPGRADING:181`).
- `final` em propriedades promovidas (`source/UPGRADING:206-207`).
- Casts em expressões constantes (`source/UPGRADING:199`).
- Atributos em constantes (`source/UPGRADING:200-203`).

```php
final class Config
{
    public function __construct(
        public final string $ambiente,
        public protected(set) static int $versao = 1,
    ) {}
}
```

### Coerção no pipe

A conversão de tipos no pipe segue a chamada normal: com strict types,
`1 |> strlen(...)` lança `TypeError` (`docs/pipe-operator.txt`). Converta
antes da cadeia quando o tipo de entrada for ambíguo.

### Erros evitados

- Cast de float fora da faixa para int gera aviso no 8.5
  (`source/UPGRADING:58-60`).
- `NAN` convertido gera aviso (`source/UPGRADING:61-62`).
- Desestruturação de não-array gera aviso (`source/UPGRADING:55-57`).

## Verificação

- `php -l` e `php -d error_reporting=E_ALL` em teste de smoke.
