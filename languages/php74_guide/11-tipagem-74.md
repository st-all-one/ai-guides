Complementar ao documento comum — específico do PHP 7.4.

# Tipagem (PHP 7.4)

No PHP 7.4 a tipagem deu um salto importante: as **propriedades de classe** agora
podem declarar tipo, e a hierarquia de tipos passou a respeitar
**covariância de retorno** e **contravariância de parâmetro**. Estes recursos
não existiam no baseline 7.2 (onde as propriedades eram sempre sem tipo).

> Estes recursos representam o estado da tipagem no PHP 7.4; versões
> posteriores estendem o sistema de tipos com novos capacidades.

## 1. Propriedades tipadas (Typed Properties)

Desde o PHP 7.4, propriedades de classe podem declarar um tipo. Todos os tipos
válidos para parâmetros são permitidos, **exceto `callable`**. Isso inclui:
`int`, `float`, `string`, `bool`, `array`, `iterable`, `object`, classes,
interfaces, `self`, `parent` e os tipos anuláveis `?Tipo`.

```php
<?php
class User
{
    public int $id;
    public ?string $name;

    public function __construct(int $id, ?string $name)
    {
        $this->id = $id;
        $this->name = $name;
    }
}

$user = new User(1234, null);
var_dump($user->id);   // int(1234)
var_dump($user->name); // NULL
```

### Tipos permitidos vs. não permitidos

| Permitido (7.4) | Não permitido como tipo de propriedade |
|---|---|
| `int`, `float`, `string`, `bool` | `callable` |
| `array`, `iterable`, `object` | combinação de tipos de versões 8.x (fora de escopo) |
| classes, interfaces, `self`, `parent` | tipo abrangente de 8.x (fora de escopo) |
| `?Tipo` (anulável) | retorno com o próprio tipo em 8.x (fora de escopo) |

### Valores padrão

Propriedades tipadas podem ter valor padrão, desde que compatível com o tipo
(ou `null` para tipos anuláveis).

```php
<?php
class Config
{
    public int $timeout = 30;
    public bool $cache = true;
    public ?string $host = null;
}
```

### Inicialização obrigatória (regra do "uninitialized")

Uma propriedade tipada **deve ser inicializada antes de ser lida**. Lê-la sem
valor gera um `Error` (não um aviso):

```php
<?php
class Shape
{
    public int $numberOfSides;
    public string $name;

    public function setName(string $name): void
    {
        $this->name = $name;
    }
}

$circle = new Shape();
$circle->setName('circle');
echo $circle->name;          // ok: "circle"
echo $circle->numberOfSides; // Fatal error: Typed property Shape::$numberOfSides
                             // must not be accessed before initialization
```

Isso torna as propriedades tipadas uma forma de **invariante**: o tipo do
contrato é garantido pelo motor, e o acesso prematuro é pego cedo.

### Interação com `__get` / `__set`

Se uma propriedade tipada for declarada (mesmo que não inicializada) ela **não**
dispara `__get`/`__set` — o acesso direto a ela segue as regras de tipagem. Os
métodos mágicos `__get`/`__set` só entram em ação para propriedades
**inacessíveis** (indefinidas, privadas fora do escopo, etc.). Portanto, não
conte com `__get` para "simular" leitura de uma propriedade tipada não
inicializada; inicialize-a no construtor.

### Exemplo completo (imutabilidade por convenção)

```php
<?php
final class Dinheiro
{
    private int $centavos;

    public function __construct(int $centavos)
    {
        if ($centavos < 0) {
            throw new InvalidArgumentException('Valor negativo');
        }
        $this->centavos = $centavos;
    }

    public function centavos(): int
    {
        return $this->centavos;
    }

    public function somar(Dinheiro $outro): Dinheiro
    {
        return new Dinheiro($this->centavos + $outro->centavos);
    }
}
```

> A imutabilidade nativa do tipo não existe no 7.4 — use o padrão acima
> (construtor + sem setters públicos). Vide "Boas Práticas" do documento comum.

## 2. Covariância de tipo de retorno (PHP 7.4)

Uma subclasse pode **estreitar** (especializar) o tipo de retorno de um método
para um subtipo do retorno da classe pai — desde que respeite o LSP.

```php
<?php
class A {}
class B extends A {}

class Producer
{
    public function method(): A {}
}

class ChildProducer extends Producer
{
    public function method(): B {} // B extends A → válido (covariante)
}
```

## 3. Contravariância de tipo de parâmetro (PHP 7.4)

Uma subclasse pode **ampliar** o tipo de um parâmetro para um supertipo do
parâmetro da classe pai.

```php
<?php
class A {}
class B extends A {}

class C
{
    public function method(B $b) {}
}

class D extends C
{
    public function method(A $a) {} // A é supertipo de B → válido (contravariante)
}
```

### Limitação importante (autoloading)

O suporte completo a variância depende de **autoloading**. Dentro de um único
arquivo, só são possíveis referências não cíclicas, pois todas as classes
precisam existir antes de serem referenciadas:

```php
<?php
class A
{
    public function method(): A {}
}

class B extends A
{
    // Fatal error: Could not check compatibility between B::method():C and
    // A::method(): A, because class C is not available
    public function method(): C {}
}

class C extends B {}
```

Em projetos com autoloader (PSR-4 via Composer), isso não é problema.

## 4. Tabela de variância (7.4)

| Contexto | Pode mudar o tipo na subclasse para… |
|---|---|
| Retorno | subtipo (mais específico) — covariante |
| Parâmetro | supertipo (mais amplo) — contravariante |
| Propriedade | não (o tipo é fixo na declaração) |

## 5. Diretrizes

- Declare o tipo de toda propriedade que represente estado estável; inicialize
  no construtor para evitar o erro de "uninitialized".
- Use `?Tipo` para campos que podem ser `null` (ex.: `?string $name`).
- Aproveite covariância/contravariância para refinir contratos em subclasses sem
  quebrar o LSP.
- `callable` não é tipo de propriedade no 7.4 — armazene closures/objetos
  invocáveis como `Closure` ou `object` e valide em runtime se necessário.

## 6. Resumo

- Propriedades tipadas: `int`, `float`, `string`, `bool`, `array`, `iterable`,
  `object`, classes/interfaces/`self`/`parent`, e `?Tipo`. **Não** `callable`.
- Propriedades tipadas exigem inicialização antes da leitura (senão `Error`).
- Covariância de retorno e contravariância de parâmetro (com autoload).
- Sem combinações de tipos, tipo abrangente, retorno com o próprio tipo nem outros
  recursos de tipagem de versões 8.x — todos pertencem a versões posteriores.
