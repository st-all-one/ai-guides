Complementar ao documento comum — específico do PHP 7.2.

# Tipagem no PHP 7.2 (além do básico)

Este suplemento documenta o sistema de tipos disponível no PHP 7.2, que vai
além da linha de base. Todo o código é válido em 7.2.

> Aviso de escopo: o sistema de tipos documentado aqui é o disponível no
> PHP 7.2; aspectos mais avançados de tipagem pertencem a outras versões.

## 1. Declarações escalares + `strict_types`

Desde o PHP 7.0. Habilite a tipagem estrita **por arquivo** com
`declare(strict_types=1)`. Sem ela, o PHP faz coercão (nas regras do modo
não-estrito).

```php
<?php
declare(strict_types=1);

function idade(int $anos): string {
    return "Idade: $anos";
}

// No modo estrito, isso gera TypeError:
// idade("vinte"); // TypeError
```

Regras de coerção (modo não-estrito):

| Tipo declarado | Valor aceito / coercionado |
|---|---|
| `int` | `float` truncado; string numérica; `bool`/`null` conforme regras |
| `float` | `int` convertido; string numérica |
| `string` | escalares convertidos para string |
| `bool` | praticamente qualquer coisa (regras de truthiness) |

## 2. Tipos de retorno

Desde o PHP 7.0 você pode (e deve) declarar o tipo de retorno.

```php
<?php
function quadrado(float $x): float {
    return $x * $x;
}

function buscar(int $id): ?array {      // nullable (7.1)
    return isset($this->dados[$id]) ? $this->dados[$id] : null;
}
```

## 3. Tipos anuláveis `?tipo`

Desde o PHP 7.1. Prefixe com `?` para aceitar o tipo ou `null`.

```php
<?php
function encontrar(string $nome): ?Usuario {
    foreach ($this->usuarios as $u) {
        if ($u->nome === $nome) {
            return $u;
        }
    }
    return null;
}
```

## 4. Retorno `void`

Desde o PHP 7.1. Funções `void` não podem retornar valor (nem `return null;`).

```php
<?php
function registrar(string $msg): void {
    file_put_contents('log.txt', $msg, FILE_APPEND);
    // return; // obrigatório ser vazio ou ausente
}
```

## 5. `iterable`

Desde o PHP 7.1. Aceita `array` ou qualquer objeto `Traversable` (ex.:
geradores, `ArrayObject`). Útil para type-hint de coleções.

```php
<?php
function imprimir(iterable $itens): void {
    foreach ($itens as $item) {
        echo $item, "\n";
    }
}

imprimir([1, 2, 3]);
imprimir(new ArrayObject([4, 5, 6]));
```

## 6. Tipo `object` (NOVIDADE do PHP 7.2)

O PHP 7.2 introduziu o tipo `object`, que aceita **qualquer** objeto —
independente de sua classe. Ótimo para contravariância de parâmetro e
covariância de retorno de objetos genéricos.

```php
<?php
function processar(object $obj): object {
    // $obj pode ser stdClass, SplQueue, qualquer instância
    return new SplQueue();
}

processar(new stdClass());
```

Comparação com `callable` e com o cast `(object)`:

| Uso | Significado em 7.2 |
|---|---|
| `object` (type hint) | qualquer instância de objeto |
| `callable` (type hint) | string/nome de função, closure, `[$obj,'metodo']`, invokable |
| `(object)` (cast) | converte array/escalar para stdClass |

## 7. `callable`

Disponível antes do 7.2, mas essencial na tipagem funcional (ver
`12-programacao-funcional-72.md`). Aceita qualquer valor invocável.

```php
<?php
function aplicar(callable $fn, $valor) {
    return $fn($valor);
}

echo aplicar(function ($x) { return $x * 2; }, 21); // 42
echo aplicar('strlen', 'oi');                        // 2
```

## 8. Type juggling e inspeção

O PHP continua dinâmico. Use as funções de inspeção:

```php
<?php
var_dump(gettype($x));     // 'integer', 'string', 'array', 'object'...
var_dump(is_int($x), is_string($x), is_object($x), is_iterable($x));
```

`is_iterable()` (7.1) retorna `true` para `array` e `Traversable`.

## 9. Ampliação de tipo de parâmetro (7.2)

No PHP 7.2, métodos sobrescritos e implementações de interface podem **omitir**
o tipo do parâmetro (ampliação/contravariância informal de parâmetro), mantendo
compatibilidade com LSP.

```php
<?php
interface Repositorio {
    public function salvar(array $dados);
}

class UsuarioRepo implements Repositorio {
    public function salvar($dados) {   // tipo omitido — permitido no 7.2
        // ...
    }
}
```

> Isso não é covariância de retorno (que chegou formalmente no 7.4). No 7.2,
> tipos de retorno em subclasses devem continuar compatíveis conforme as regras
> existentes.

## 10. Resumo de tipos disponíveis em 7.2

- Escalares: `int`, `float`, `string`, `bool`
- Compostos: `array`, `callable`, `iterable` (7.1), `object` (7.2)
- Especiais: `null` (só como `?X`), `void` (7.1), `self`, `parent`, `static`
- Classe/interfaces: `ClassName`, `InterfaceName`
- Anulável: prefixo `?`
