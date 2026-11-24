# POO básica no PHP 8.5

Base: classes, interfaces, traits, enums, visibilidade, herança, abstract,
static, atributos, `__construct`, `__destruct`, `__clone`, exceções. O 8.5
acrescenta `clone()` com substituição de propriedades e ajustes em atributos.

## Fontes

- `source/UPGRADING:181-214,744-746,806-827`.
- `source/Zend/tests/clone/clone_with_001.phpt`.

### Classe enxuta

```php
<?php
declare(strict_types=1);

interface Repositorio
{
    public function porId(int $id): ?Usuario;
}

readonly class Usuario
{
    public function __construct(
        public int $id,
        public string $nome,
    ) {}
}
```

### Imutabilidade

`readonly class` + `clone($obj, ['prop' => $novoValor])` substitui a escrita de
métodos *with-er* (`source/UPGRADING:744-746`). Hooks `set` são respeitados e
propriedades continuam readonly (`source/Zend/tests/clone/clone_with_014.phpt:16-35`).

### Atributos

`#[Attribute]` define metadados executáveis. No 8.5: atributos em constantes,
`#[\Deprecated]` em constantes, `#[\Override]` em propriedades e
`#[\NoDiscard]` para retornos que não devem ser ignorados
(`source/UPGRADING:189-214`).

```php
#[\NoDiscard]
public function validar(): self { return $this; }
```

### Enums (estado final no 8.5)

Enums são classes com conjunto fechado de casos. Use-os para estados,
tipos e categorias — nunca strings soltas. Suportam métodos, interfaces,
traits, `from()`/`tryFrom()` e backed values (`int`/`string`).

```php
enum Status: string
{
    case Ativo = 'ativo';
    case Inativo = 'inativo';

    public function rotulo(): string
    {
        return match ($this) {
            self::Ativo => 'Ativo',
            self::Inativo => 'Inativo',
        };
    }
}

$status = Status::from($_GET['status'] ?? 'inativo');
echo $status->rotulo();
```

No 8.5, casos de enum são despejados em `__getTypes()` do SOAP
(`source/UPGRADING:302-303`) e `ArrayObject` não aceita enums
(`source/UPGRADING:161-163`). `#[\Deprecated]` agora pode ser aplicado a
traits e constantes (anúncio oficial:
`https://www.php.net/releases/8.5/en.php`).

### Traços

Traits continuam como no 8.4 e podem ser marcados com `#[\Deprecated]` no 8.5.

### Armadilhas 8.5

- `__sleep()`/`__wakeup()` soft-deprecated — use `__serialize()`/
  `__unserialize()` (`source/UPGRADING:408-410`).
- `ArrayObject` com objetos depreciado (`source/UPGRADING:570-571`).
- `Closure` binding inválido depreciado (`source/UPGRADING:390-399`).

## Verificação

- `php -l`; teste de `clone()` com hook e readonly.
