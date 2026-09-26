Complementar ao documento comum — específico do PHP 7.2.

# POO Avançada disponível no PHP 7.2

Este documento cobre recursos avançados de orientação a objetos que já existem
no PHP 7.2. Todo o código aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores. Não são
> abordados recursos de tipagem de propriedade que surgiram em versões mais
> recentes.

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

## 2. Sobrecarga com métodos mágicos

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

## 3. Clonagem com `__clone`

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

## 4. Comparação de objetos (`==` vs `===`)

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

## 5. Serialização com `__sleep` / `__wakeup` e `Serializable`

Para controlar a serialização, use os métodos mágicos ou implemente a interface
`Serializable`.

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

Com a interface `Serializable` (era do 7.2):

```php
<?php
class Cache implements Serializable
{
    private $dados;

    public function serialize(): string
    {
        return serialize($this->dados);
    }

    public function unserialize($dados): void
    {
        $this->dados = unserialize($dados);
    }
}
```

## 6. Late Static Bindings (`static::`)

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

## 7. Iteração de objetos

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

## 8. Resumo

| Recurso | Desde | Notas no 7.2 |
|---|---|---|
| classe anônima | 7.0 | `new class` |
| `__get`/`__set` | 5.3 | sobrecarga |
| `__call`/`__callStatic` | 5.3 | métodos dinâmicos |
| `__clone` | 5.0 | ajuste pós-clone |
| `==` vs `===` | — | instância vs valores |
| `Serializable` | 5.3 | interface de serialização |
| `static::` LSB | 5.3 | vinculação tardia |
