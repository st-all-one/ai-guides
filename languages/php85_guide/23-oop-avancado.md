# POO avançado no PHP 8.5

Estado final da POO avançada na série: late static binding, serialização
controlada, `__clone`, classes anônimas, sobrecarga mágica, WeakMap,
lazy objects, property hooks, visibilidade assimétrica e — no 8.5 — `clone()`
com substituição de propriedades.

## Fontes

- `source/UPGRADING:181-214,408-410,570-571,744-747,786-792`.
- `source/Zend/tests/clone/clone_with_005.phpt:40-64`.

### Serialização controlada

```php
final class SessaoUsuario
{
    public function __construct(
        public readonly string $id,
        public readonly array $permissoes,
    ) {}

    public function __serialize(): array
    {
        return ['id' => $this->id, 'permissoes' => $this->permissoes];
    }

    public function __unserialize(array $data): void
    {
        // $data é array; atribuição em readonly é permitida aqui.
        foreach ($data as $k => $v) {
            $this->$k = $v;
        }
    }
}
```

`__sleep()`/`__wakeup()` estão soft-deprecated no 8.5
(`source/UPGRADING:408-410`).

### Late static binding

```php
abstract class Modelo
{
    public static function criar(): static
    {
        return new static();
    }
}
```

### `__clone` e Clone With

`clone($obj, [...])` mantém `__clone()` e dispara hooks `set` na ordem do
array (`source/Zend/tests/clone/clone_with_005.phpt:40-64`). Se `__clone()`
altera o estado, a substituição acontece sobre o resultado — teste o
comportamento na sua classe.

### WeakMap e caches

`WeakMap` permite chaves por objeto sem impedir coleta de lixo. Continua sendo
a escolha correta para metadados de objetos. `Closure::getCurrent()` (novo no
8.5, `source/UPGRADING:747`) ajuda a identificar callbacks em instrumentação.

### Lazy objects e preload

Recursos do 8.4 permanecem: `ReflectionClass::newLazyGhost()` e
`opcache.preload` são as alavancas de inicialização tardia.

### Restrições 8.5

- `ArrayObject`/`ArrayIterator` com objetos depreciados
  (`source/UPGRADING:570-571`).
- `SplObjectStorage::contains/attach/detach` depreciados em favor de `offset*`
  (`source/UPGRADING:565-569`).
- `ReflectionConstant` não é mais final (`source/UPGRADING:878-879`).

## Verificação

- Teste de serialize/unserialize round-trip.
- Teste de `clone()` com `__clone()` e hook `set`.
