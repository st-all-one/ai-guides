# Sintaxe básica no PHP 8.5

Base comum da série PHP, com as correções do 8.5 já aplicadas. Todo código
aqui é válido no PHP 8.5.13+.

## Fontes

- `source/UPGRADING` (mudanças 8.5).
- `source/main/php_version.h:3-7` (versão de referência).

### Estrutura de arquivo

```php
<?php
declare(strict_types=1);

namespace App;

const LIMITE = 100;

final class Servico
{
    public function executar(string $entrada): string
    {
        return $entrada;
    }
}
```

- `<?php` abre; em arquivos puros PHP, omita `?>` final.
- `declare(strict_types=1)` afeta chamadas de função no arquivo; use sempre.
- `namespace` vem depois de `declare`; `use` depois de `namespace`.

### Variáveis e tipos escalares

Tipos: `int`, `float`, `string`, `bool`, `array`, `object`, `callable`,
`iterable`, `mixed`, `null`, `void`, `never`. O 8.5 acrescenta `Closure` como
subtipo correto de `callable` (`source/UPGRADING:181`).

```php
$nome = 'Ana';      // string
$idade = 30;        // int
$ativo = true;      // bool
$notas = [10, 8.5]; // array
```

### Controle de fluxo

```php
$status = match ($codigo) {
    200, 201 => 'ok',
    404 => 'nao encontrado',
    default => 'erro',
};

foreach ($itens as $item) {
    if (!$item['ativo']) continue;
}
```

> No 8.5, terminar `case` com `;` em `switch` está depreciado — use `:`
> (`source/UPGRADING:374-376`).

### Funções

```php
function saudacao(string $nome, string $prefixo = 'Olá'): string
{
    return "$prefixo, $nome";
}
```

Argumentos nomeados (8.0), arrow functions (7.4), first-class callables (8.1)
e o pipe operator (8.5) estão disponíveis:

```php
$slug = ' PHP 8.5 ' |> trim(...) |> strtolower(...); // 'php 8.5'
```

### Comentários e docblocks

Use docblocks para `generics`/`array shapes` que o sistema de tipos do PHP
não expressa; para metadados executáveis, use atributos `#[...]`.
Atributos em constantes são novos no 8.5 (`source/UPGRADING:200-201`).

### Constantes mágicas e build

`__FILE__`, `__DIR__`, `__LINE__`, `__CLASS__`, `__FUNCTION__`,
`__NAMESPACE__`, `__METHOD__` permanecem. Novas constantes globais de build:
`PHP_BUILD_DATE` e `PHP_BUILD_PROVIDER` (`source/UPGRADING:885-887`).

### Erros comuns evitados

- Não use `(boolean)`, `(integer)`, `(double)`, `(binary)` — depreciados no
  8.5 (`source/UPGRADING:368-370`).
- Não use backtick para executar comandos — depreciado
  (`source/UPGRADING:377-378`).
- Não use `null` como chave de array — depreciado
  (`source/UPGRADING:400-402`).

## Verificação

- `php -v` → `PHP 8.5.x`.
- `php -l arquivo.php` → `No syntax errors detected`.
