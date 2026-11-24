# Tipagem no PHP 8.5

O PHP 8.5 mantém integralmente o sistema de tipos do 8.4 (union, intersection,
DNF, enums, readonly, property hooks, visibilidade assimétrica) e acrescenta
ajustes pontuais. A nova regra mais relevante para tipos é a relação
`Closure` ⊂ `callable`, além da possibilidade de `final` em propriedades
promovidas e da visibilidade assimétrica em propriedades estáticas.

## Fontes

- `source/UPGRADING` (seções 2, 4 e 6).
- `docs/pipe-operator.txt` (coerção de tipos no pipe).
- `https://www.php.net/releases/8.5/en.php` (anúncio oficial).

### `Closure` como subtipo de `callable`

O core passa a tratar `Closure` como subtipo correto de `callable`
(`source/UPGRADING:181`). Na prática, um parâmetro `callable` aceita closures
e uma propriedade `Closure` é mais específica que `callable`:

```php
<?php
declare(strict_types=1);

final class Pipeline
{
    /** @param list<Closure(mixed):mixed> $etapas */
    public function __construct(private array $etapas) {}

    public function executar(mixed $valor): mixed
    {
        foreach ($this->etapas as $etapa) {
            $valor = $etapa($valor);
        }
        return $valor;
    }
}
```

### `final` em propriedades promovidas

Promoção no construtor agora aceita `final`
(`source/UPGRADING:206-207`). Use quando a classe pode ser estendida mas um
dado específico não pode ser sobrescrito:

```php
final class Pedido
{
    public function __construct(
        public final string $id,
        public readonly int $total,
    ) {}
}
```

> Se a classe inteira é `final`, `final` na propriedade é redundante. Prefira
> `readonly` para imutabilidade de valor.

### Visibilidade assimétrica em propriedades estáticas

A visibilidade `public private(set)` / `public protected(set)` passa a valer
também para propriedades `static` (`source/UPGRADING:197-198`).

```php
final class Contador
{
    private static int $total = 0;

    public static function incrementar(): void
    {
        self::$total++;
    }

    public static function total(): int
    {
        return self::$total;
    }
}
```

### Casts em expressões constantes

O 8.5 permite casts em expressões constantes (`source/UPGRADING:199`), o que
elimina cerimônia em valores padrão e atributos:

```php
final class Limites
{
    public const int MAXIMO = (int) 1_000.9;
    public function __construct(private int $n = (int) 0.5) {}
}
```

### Coerção no operador pipe

O pipe **não** altera as regras de coerção de uma chamada normal
(`docs/pipe-operator.txt`). Com `declare(strict_types=1)` no arquivo que
contém a cadeia, passar `int` para `strlen()` lança `TypeError`; sem
strict types, a coerção usual se aplica.

```php
declare(strict_types=1);
// 1 |> strlen(...); // TypeError: strlen(): Argument #1 must be string, int given
```

### Tipos e atributos em constantes

Atributos em constantes de compile-time não-classe e `#[\Deprecated]` em
constantes são novidades do 8.5 (`source/UPGRADING:200-203`).

```php
final class Versao
{
    #[Deprecated('use API_V2', since: '8.5')]
    public const string API_V1 = 'v1';

    public const string API_V2 = 'v2';
}
```

### Checagens de tipo reforçadas

| Caso | Comportamento 8.5 | Fonte |
| --- | --- | --- |
| `bzcompress()` com `$block_size` fora de 1–9 | `ValueError` | `source/UPGRADING:64-66` |
| `bzcompress()` com `$work_factor` fora de 0–250 | `ValueError` | `source/UPGRADING:67-68` |
| `finfo_file()` com NUL no nome | `ValueError` (antes `TypeError`) | `source/UPGRADING:76-79` |
| `PDO::FETCH_INTO` em `fetchAll()` | `ValueError` | `source/UPGRADING:145-146` |
| `ArrayObject` com enums | não aceito (quebra assumptions do engine) | `source/UPGRADING:161-163` |
| `SplFileObject::fwrite($length)` | agora `?int`, default `null` | `source/UPGRADING:164-165` |
| `readline_*` (add/clear/handler_install) | retorno `true`, não `bool` | `source/UPGRADING:873-876` |

### Anti-padrões de tipagem no 8.5

- Não use `(boolean)`, `(integer)`, `(double)`, `(binary)` — depreciados
  (`source/UPGRADING:368-370`).
- Não confie em `null` como chave de array: depreciado
  (`source/UPGRADING:400-402`).
- Não espere que `array_pop()` funcione direto no pipe: parâmetro por
  referência (`docs/pipe-operator.txt`).
- Não redeclare constantes: depreciado (`source/UPGRADING:384-385`).

## Verificação

- `php -l` nos exemplos; `php -d error_reporting=E_ALL -r '...'` para
  observar avisos de depreciação.
- `php --ini=diff` para conferir diretivas que alteram coerção
  (`docs/cli-ini-diff.txt`).
