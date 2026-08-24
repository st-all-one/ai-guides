Complementar ao documento comum — específico do PHP 7.4.

# POO Avançada disponível no PHP 7.4

Este documento cobre recursos avançados de orientação a objetos no PHP 7.4,
incluindo as propriedades tipadas e a serialização customizada introduzidas
nesta versão. Todo o código aqui é 100% válido e executável na versão 7.4.

> Aviso de escopo: nada aqui é específico de versões 8.x. As propriedades
> tipadas e os métodos `__serialize`/`__unserialize` são do 7.4 e permanecem
> válidos.

## 1. Classes anônimas (7.0+)

Úteis para implementações descartáveis ou stubs de teste.

```php
<?php
$logger = new class implements LoggerInterface {
    public function log(string $msg): void
    {
        error_log($msg);
    }
};

$logger->log('iniciando');
```

Podem capturar variáveis do escopo com `use`:

```php
<?php
$prefixo = '[app] ';
$logger = new class($prefixo) {
    private $p;
    public function __construct(string $p) { $this->p = $p; }
    public function log(string $m): void { echo $this->p . $m; }
};
```

## 2. Propriedades tipadas (7.4)

O PHP 7.4 permite declarar o tipo de uma propriedade de classe. Isso elimina a
necessidade de documentar tipos em comentários e valida a atribuição.

```php
<?php
class Produto
{
    public int $id;
    public string $nome;
    public ?float $preco = null;     // nullable
    private array $tags = [];

    public function __construct(int $id, string $nome)
    {
        $this->id = $id;
        $this->nome = $nome;
    }
}

$p = new Produto(1, 'Livro');
$p->preco = 29.90;
```

Tipos válidos em propriedades: tipos escalares (`int`, `float`, `string`,
`bool`), `array`, `callable`, `iterable`, `object`, classes/interfaces e o
`?Tipo` anulável. O tipo `void` não é permitido em propriedades.

## 3. Sobrecarga com métodos mágicos

PHP permite interceptar acesso a membros inexistentes.

- `__get($nome)` / `__set($nome, $valor)`: leitura/escrita de propriedade
  inacessível.
- `__isset($nome)` / `__unset($nome)`: `isset()`/`unset()` de propriedade
  inacessível.
- `__call($nome, $args)`: método de instância inexistente.
- `__callStatic($nome, $args)`: método estático inexistente.

```php
<?php
class Dinamico
{
    private $dados = [];

    public function __get($nome) { return $this->dados[$nome] ?? null; }
    public function __set($nome, $valor) { $this->dados[$nome] = $valor; }
    public function __isset($nome) { return isset($this->dados[$nome]); }

    public function __call($nome, $args)
    {
        return 'chamou ' . $nome;
    }

    public static function __callStatic($nome, $args)
    {
        return 'estatico ' . $nome;
    }
}

$d = new Dinamico();
$d->idade = 30;
echo $d->idade;     // 30
echo $d->foo();     // 'chamou foo'
echo Dinamico::bar(); // 'estatico bar'
```

## 4. Clonagem com `__clone`

`clone` cria uma cópia superficial. Use `__clone` para ajustes pós-clone
(por exemplo, limpar ID).

```php
<?php
class Pedido
{
    public $itens = [];
    public $id;

    public function __clone()
    {
        $this->id = null;
        $this->itens = array_map(function ($i) { return clone $i; }, $this->itens);
    }
}

$p = new Pedido();
$c = clone $p;
```

## 5. Comparação de objetos (`==` vs `===`)

- `$a == $b`: verdadeiro se forem da mesma classe e tiverem as mesmas
  propriedades com valores iguais.
- `$a === $b`: verdadeiro apenas se forem **o mesmo objeto** (mesma instância).

```php
<?php
$a = new stdClass();
$b = new stdClass();
var_dump($a == $b);   // true
var_dump($a === $b);  // false

$c = $a;
var_dump($a === $c);  // true
```

## 6. Serialização: `__sleep`/`__wakeup` e `__serialize`/`__unserialize` (7.4)

Há duas formas de controlar a serialização.

### Métodos clássicos

```php
<?php
class Sessao
{
    public $usuario;
    private $senha;

    public function __sleep()
    {
        return ['usuario']; // não serializa a senha
    }

    public function __wakeup()
    {
        // reidrata dependências
    }
}
```

### Métodos novos do 7.4

A partir do 7.4, prefira `__serialize()` e `__unserialize()`, que dão controle
completo sobre o array serializado (mais robusto que `__sleep`/`__wakeup`):

```php
<?php
class Conta
{
    private $usuario;
    private $senha;

    public function __construct(string $usuario, string $senha)
    {
        $this->usuario = $usuario;
        $this->senha = $senha;
    }

    public function __serialize(): array
    {
        return [
            'usuario' => $this->usuario,
            // senha propositalmente omitida
        ];
    }

    public function __unserialize(array $dados): void
    {
        $this->usuario = $dados['usuario'];
        $this->senha = '';   // não persiste segredos
    }
}

$c = new Conta('ana', 'secreta');
$s = serialize($c);
$r = unserialize($s);
```

Quando ambos os pares existem, `__serialize`/`__unserialize` têm precedência
sobre `__sleep`/`__wakeup`.

## 7. Late Static Bindings (`static::`)

`static::` resolve para a classe efetivamente usada na chamada (vinculação
tardia), diferente de `self::` que é fixa à classe onde foi definida.

```php
<?php
class Base
{
    public static function criar(): self
    {
        return new static(); // instancia a subclasse
    }

    public static function quem(): string
    {
        return static::class;
    }
}

class Filha extends Base {}

echo Filha::quem(); // 'Filha'
```

## 8. Iteração de objetos

Por padrão, um `foreach` em um objeto itera suas propriedades visíveis.

```php
<?php
class Pessoa
{
    public $nome = 'Ana';
    public $idade = 30;
}

foreach (new Pessoa() as $k => $v) {
    echo "$k=$v ";
}
```

Para controle fino, implemente `Iterator` ou `IteratorAggregate` (vide
`21-generators-iterators.md`).

## 9. Resumo

| Recurso | Desde | Notas no 7.4 |
|---|---|---|
| classe anônima | 7.0 | `new class` |
| propriedades tipadas | 7.4 | `public int $id` etc. |
| `__get`/`__set` | 5.3 | sobrecarga |
| `__call`/`__callStatic` | 5.3 | métodos dinâmicos |
| `__clone` | 5.0 | ajuste pós-clone |
| `==` vs `===` | — | instância vs valores |
| `__serialize`/`__unserialize` | 7.4 | serialização robusta |
| `static::` LSB | 5.3 | vinculação tardia |
