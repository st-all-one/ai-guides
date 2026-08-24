Complementar ao documento comum — específico do PHP 7.2.

# Operadores e Sintaxe Básica no PHP 7.2

Este documento cobre operadores e lembretes de sintaxe disponíveis no PHP 7.2.
Todo o código aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores. A coalescência
> nula `??` e o operador nave `<=>` são válidos desde o 7.0 e, portanto,
> pertencem ao 7.2.

## 1. Lembretes de sintaxe básica

- **Tags PHP**: `<?php ... ?>` (recomendado) ou `<?= ... ?>` para saída curta.
- **Separação de instruções**: cada comando termina com `;`.
- **Comentários**: `//`, `#` (linha) e `/* ... */` (bloco).

```php
<?php
$nome = 'Ana';        // comentário de linha
# outro comentário de linha
/* bloco
   de comentário */
echo $nome;
```

## 2. Aritméticos

`+`, `-`, `*`, `/`, `%` (módulo), `**` (exponenciação, 5.6+).

```php
<?php
echo 2 + 3;   // 5
echo 10 % 3;  // 1
echo 2 ** 3;  // 8
```

## 3. Atribuição e compostos

`=`, `+=`, `-=`, `*=`, `/=`, `%=`, `.=` (concatenação), `&=`, `|=`, `^=`,
`<<=`, `>>=`.

```php
<?php
$a = 5;
$a += 2;      // 7
$s = 'oi';
$s .= ' mundo'; // 'oi mundo'
```

## 4. Bitwise

`&`, `|`, `^`, `~`, `<<`, `>>`.

```php
<?php
$mascara = 0b0011 | 0b0100; // 0b0111
```

## 5. Comparação

`==`, `===`, `!=`, `!==`, `<`, `>`, `<=`, `>=`. O operador nave `<=>` (7.0)
retorna `-1`, `0` ou `1`.

```php
<?php
echo 1 <=> 2;  // -1
echo 2 <=> 2;  // 0
echo 3 <=> 2;  // 1
```

## 6. Coalescência nula `??` (7.0)

Retorna o operando da esquerda se não for `null` nem indefinido; caso
contrário, o da direita. Não emite aviso.

```php
<?php
$cor = $_GET['cor'] ?? 'azul';
```

## 7. Controle de erro `@`

Suprime avisos da expressão seguinte. Use com moderação (impacta performance).

```php
<?php
$arquivo = @file_get_contents('inexistente.txt');
```

## 8. Execução (backticks)

`` `comando` `` executa um comando do shell e retorna a saída. Requer que a
função shell_exec esteja habilitada.

```php
<?php
$saida = `ls -la`;
```

## 9. Incremento/decremento

`++$x` (pré), `$x++` (pós), `--$x`, `$x--`.

```php
<?php
$i = 1;
echo ++$i;    // 2
echo $i++;    // 2 (depois incrementa para 3)
```

## 10. Lógicos

`&&`, `||`, `!`, `and`, `or`, `xor`. Note que `and`/`or` têm precedência
menor que `&&`/`||`.

```php
<?php
if ($a && $b) { }
if ($a and $b) { }
```

## 11. Concatenação de strings

O ponto `.` junta strings.

```php
<?php
echo 'foo' . 'bar'; // 'foobar'
```

## 12. Operadores de array

`+` (união, mantém esquerda em conflito), `==`, `===`, `!=`, `<>`, `!==`.

```php
<?php
$a = ['x' => 1];
$b = ['x' => 2, 'y' => 3];
$c = $a + $b;   // ['x' => 1, 'y' => 3]
```

## 13. Operadores de tipo (`instanceof`)

Verifica se um objeto pertence a uma classe/trait/interface.

```php
<?php
if ($obj instanceof Usuario) { }
```

## 14. Ternário / Elvis `?:`

```php
<?php
$apelido = $nome ?: 'Anônimo';      // elvis
$rotulo = isset($x) ? $x : 'padrao'; // ternário
```

## 15. Type juggling e coerção

O PHP converte tipos automaticamente conforme o contexto. Regras comuns:

- String numérica em contexto numérico vira número.
- `null` vira `0`/`''`/`false` conforme o destino.
- Operações aritméticas forçam operandos a número.

```php
<?php
$x = '10' + 5;     // 15 (int)
$y = '10' . 5;     // '105' (string)
$z = 1 + '2.5';    // 3.5 (float)
```

## 16. Armadilhas de comparação (`==` vs `===`)

`==` compara valores com coerção; `===` exige mesmo valor **e** tipo.

```php
<?php
var_dump(0 == '0');      // true
var_dump(0 === '0');     // false
var_dump(0 == '');       // true  (cuidado!)
var_dump(false == 0);    // true
var_dump(null == '');    // true
var_dump(null === '');   // false
```

Prefira `===`/`!==` para segurança, especialmente em validações de entrada.

## 17. Constantes mágicas

| Constante | Valor |
|---|---|
| `__LINE__` | linha atual |
| `__FILE__` | caminho completo do arquivo |
| `__DIR__` | diretório do arquivo |
| `__FUNCTION__` | nome da função |
| `__CLASS__` | nome da classe |
| `__TRAIT__` | nome do trait |
| `__METHOD__` | classe::método |
| `__NAMESPACE__` | namespace atual |

```php
<?php
namespace App;
echo __NAMESPACE__; // 'App'
```

## 18. Precedência de operadores (resumo)

Da maior para a menor (parcial): `**` › `*` `/` `%` › `+` `-` `.` › `<<` `>>` ›
`<` `<=` `>` `>=` › `==` `!=` `===` `!==` `<=>` › `&` › `^` › `|` › `&&` ›
`||` › `?:` `??` › `=` `+=` `.=` etc › `and` › `xor` › `or`.

Use parênteses para deixar a intenção explícita.

## 19. Resumo

| Grupo | Operadores no 7.2 |
|---|---|
| aritmético | `+ - * / % **` |
| atribuição | `= += -= .= etc` |
| bitwise | `& \| ^ ~ << >>` |
| comparação | `== === != <=> etc` |
| nulo | `??` (7.0) |
| string | `.` |
| array | `+ == ===` |
| tipo | `instanceof` |
