# Referências no PHP 8.5

O modelo de referências do PHP permanece estável: uma referência é um *alias*
para o mesmo zval, não um ponteiro de memória. O 8.5 acrescenta uma restrição
importante: o operador pipe **não aceita callables com parâmetros por
referência**.

## Fontes

- `source/Zend/tests/pipe_operator/call_by_ref.phpt:1-37`.
- `docs/pipe-operator.txt` (seção "Functions with by-reference parameters").

### Semântica básica

```php
$a = 1;
$b = &$a;  // alias
$b = 2;
echo $a;   // 2

function inc(int &$v, int $n = 1): void { $v += $n; }
inc($a, 3); // $a = 5

unset($b);  // rompe só o alias; $a continua 5
```

Referências em parâmetros não anulam a tipagem: `int &$x` ainda exige `int`.

### Referência em `foreach`

```php
$itens = [1, 2, 3];
foreach ($itens as &$item) {
    $item *= 2;
}
unset($item); // obrigatório: evita alias com o último elemento
```

### Pipe operator e parâmetros por referência

O pipe passa o valor anterior por valor para o próximo callable. Funções que
declaram parâmetro por referência falham
(`source/Zend/tests/pipe_operator/call_by_ref.phpt:15-37`):

```php
explode('-', 'a-b-c') |> array_pop(...);
// Error: array_pop(): Argument #1 ($array) could not be passed by reference
```

Solução: encapsulate em closure com variável local.

```php
$ultimo = explode('-', 'a-b-c')
    |> (static fn(array $partes): string => array_pop($partes)); // "c"
```

Exceção restrita: funções internas com `@prefer-ref` (`array_multisort`,
`extract`) aceitam valor direto (`docs/pipe-operator.txt`).

### Retorno por referência

```php
class Caixa
{
    private int $valor = 0;
    public function &acesso(): int { return $this->valor; }
}

$c = new Caixa();
$r = &$c->acesso();
$r = 42;
```

Em código 8.5, prefira `readonly`, *property hooks* ou métodos explícitos a
retorno por referência — referências expõem estado interno e dificultam
raciocínio sobre imutabilidade.

### Clone With e aliases

`clone($obj, [...])` cria um novo objeto; as referências existentes não são
redirecionadas. Modificar uma propriedade no clone não altera o original
(`source/Zend/tests/clone/clone_with_001.phpt:17-28`).

## Verificação

- Rode `php -l` e um teste de smoke para `array_pop` via pipe: deve lançar
  `Error`, não modificar silenciosamente o array.
- Procure `foreach (... as &$` sem `unset()` logo após o loop.
