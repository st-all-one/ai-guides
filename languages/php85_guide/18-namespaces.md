# Namespaces no PHP 8.5

Namespaces não mudaram entre 8.4 e 8.5, mas o 8.5 acrescenta uma biblioteca
inteira em namespace — `Uri\Rfc3986`, `Uri\WhatWg`, `Filter\`, `Pdo\Sqlite` —
o que torna a importação explícita parte do trabalho diário.

## Fontes

- `source/ext/uri/php_uri.stub.php:5-6,28,100` (namespaces das novas classes).
- `source/UPGRADING:817-827` (novas classes `Filter\` e `Uri\`).

### Regras estáveis

```php
<?php
declare(strict_types=1);

namespace App\Seguranca;

use Uri\Rfc3986\Uri;
use Uri\WhatWg\Url as WhatwgUrl;
use Filter\FilterFailedException;

final class Validador
{
    public function conferir(string $entrada): Uri
    {
        return new Uri($entrada);
    }
}
```

- `namespace` deve ser a primeira instrução (exceto `declare`).
- `use` funciona para classes, interfaces, enums, funções e constantes.
- Nomes totalmente qualificados (`\Uri\Rfc3986\Uri`) evitam ambiguidade.
- Resolução de funções e constantes não qualificadas faz fallback para o
  namespace global — por isso, `strlen()` funciona sem `\`.
- `use function`/`use const` existem e devem ser preferidos quando o código
  do namespace usa poucos símbolos globais.

### Novos namespaces no 8.5

| Namespace | Conteúdo | Fonte |
| --- | --- | --- |
| `Uri` | `UriException`, `UriError`, `InvalidUriException`, `UriComparisonMode` | `source/ext/uri/php_uri.stub.php:5-26` |
| `Uri\Rfc3986` | `Uri` (final readonly) | `source/ext/uri/php_uri.stub.php:28-98` |
| `Uri\WhatWg` | `Url`, `InvalidUrlException`, `UrlValidationError(Type)` | `source/ext/uri/php_uri.stub.php:100-220` |
| `Filter` | `FilterException`, `FilterFailedException` | `source/UPGRADING:817-820` |
| `Pdo\Sqlite` | `setAuthorizer()`, atributos de transação/explain | `source/UPGRADING:776-779,286-295` |

### Armadilhas

### Verificação de namespace

- `new Uri()` sem `use` dentro de `App\Seguranca` tenta resolver
  `App\Seguranca\Uri` — use `use Uri\Rfc3986\Uri;` ou nome integral.
- Conflito de nomes entre `Uri\Rfc3986\Uri` e `Uri\WhatWg\Url` é evitado com
  alias (`use ... as ...`), não com nomes curtos iguais.
- `class_alias()` não aceita mais `array` ou `callable` como nomes de classe
  (`https://www.php.net/releases/8.5/en.php`).

## Verificação

- `php -l` garante que todos os `use` apontam para classes existentes apenas
  em runtime — use `class_exists()` em teste de smoke.
- `composer dump-autoload -o` após mover classes para novos namespaces.
