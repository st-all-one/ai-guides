Complementar ao documento comum — específico do PHP 7.4.

# Sintaxe: Recursos Novos do PHP 7.4 (e 7.3)

Este documento cobre os recursos de **sintaxe** introduzidos no PHP 7.3 e
consolidados no PHP 7.4. Tudo aqui é **válido e executável no PHP 7.4** e não
existia (ou não nesta forma) no baseline 7.2. Não documentamos recursos de
declarações (ex.: vírgulas à direita em declarações de função/parâmetros) — isso
é do PHP 8.0 e está fora de escopo.

## 1. Operador de atribuição de coalescência nula `??=` (PHP 7.4)

Atribui o valor do lado direito **apenas se** a variável/índice ainda não
estiver definido(a) ou for `null`. É um atalho para o clássico
`if (!isset($x)) { $x = ...; }`.

```php
<?php
// Antes (7.2 e anteriores):
if (!isset($config['timeout'])) {
    $config['timeout'] = 30;
}

// PHP 7.4 — equivalente e mais enxuto:
$config['timeout'] ??= 30;

// Funciona também com variáveis simples e propriedades:
$usuario ??= 'convidado';
$this->cache[$id] ??= $this->computar($id);
```

Diferente de `?:` e `?:=` (que não existem), o `??=` usa a semântica de
`isset` e **não** emite aviso se a variável não existir. Ele NÃO atribui quando
o valor existente é `0`, `''`, `'0'` ou `false` — só quando é `null`/indefinido.

| Expressão | Atribui quando existente for… |
|---|---|
| `$x ??= $v` | `null` ou não definido |
| `$x = $x ?: $v` | falsy (`0`, `''`, `false`, `null`, `[]`) |

## 2. Arrow functions `fn() =>` (PHP 7.4)

Sintaxe concisa para funções anônimas. A grande diferença para `function () {}`
é o **captura automática por valor** das variáveis do escopo pai: não é preciso
`use ($x)`.

```php
<?php
$fator = 10;

// Equivalente às duas formas:
$vezes1 = fn($n) => $n * $fator;
$vezes2 = function ($n) use ($fator) { return $n * $fator; };

var_dump($vezes1(5)); // int(50)
```

### Assinaturas suportadas

Arrow functions aceitam a mesma assinatura de funções comuns: tipos de
parâmetro e de retorno, valores padrão, variádicas e passagem/retorno por
referência.

```php
<?php
fn(array $x) => $x;
static fn($x): int => $x;
fn($x = 42) => $x;
fn(&$x) => $x;
fn($x, ...$rest) => $rest;
```

### Captura por valor (não pode modificar o escopo externo)

A vinculação é **sempre por valor**. Por isso, uma arrow function não consegue
modificar variáveis do escopo externo:

```php
<?php
$x = 1;
$fn = fn() => $x++; // não tem efeito sobre $x externo
$fn();
var_dump($x); // int(1) — inalterado
```

Se precisar modificar o escopo externo, use uma closure tradicional com
`use (&$x)`. Arrow functions aninhadas também capturam por valor:

```php
<?php
$z = 1;
$fn = fn($x) => fn($y) => $x * $y + $z;
var_dump($fn(5)(10)); // int(51)
```

`func_num_args()`, `func_get_arg()` e `func_get_args()` também funcionam dentro
de arrow functions.

## 3. Spread operator em literais de array `[...$arr]` (PHP 7.4)

Agora é possível "espalhar" os elementos de um array (ou Traversable) **dentro
de um literal de array**, não apenas em chamadas de função.

```php
<?php
$partes = ['apple', 'pear'];
$frutas = ['banana', 'orange', ...$partes, 'watermelon'];
// ['banana', 'orange', 'apple', 'pear', 'watermelon']

// Também funciona com iteráveis retornados por geradores:
function pares(): Generator {
    yield 2;
    yield 4;
}
$lista = [0, 1, ...pares(), 6]; // [0, 1, 2, 4, 6]
```

Combine com `array_merge` para mesclar vários arrays sem argumentos (o
`array_merge()` sem argumentos também é novo no 7.4):

```php
<?php
$arrays = [['a', 'b'], ['c'], ['d', 'e']];
$achatado = array_merge(...$arrays); // ['a','b','c','d','e']
```

Na chamada de função, o spread já existia desde o PHP 5.6 (vide "Sintaxe
Básica" do documento comum) — aqui o novo é o uso **dentro do literal de array**.

## 4. Vírgulas à direita em chamadas de função (PHP 7.3)

É permitido terminar a lista de argumentos de uma **chamada** de função/método
com uma vírgula. Útil para listas longas e diffs de código mais limpos.

```php
<?php
$resultado = some_function(
    $primeiro,
    $segundo,
    $terceiro, // vírgula à direita — válida em 7.3+
);

$obj->metodo(
    'a',
    'b',
);
```

> Não confunda: **declarações** de função/método/classe com vírgula à direita
> (nos parâmetros ou na lista `use`) são do PHP 8.0 e **não** devem ser usadas
> aqui. Este recurso do 7.3 aplica-se apenas a *chamadas*.

## 5. Heredoc/Nowdoc mais flexíveis (PHP 7.3)

O marcador de fechamento não precisa mais estar na coluna zero nem ser seguido
imediatamente por `;`/nova linha. Se o marcador estiver indentado, a indentação
é **removida** de todas as linhas do conteúdo.

```php
<?php
// Marcador indentado — a indentação comum é removida do conteúdo:
$texto = <<<FIM
    Olá, mundo.
    Esta linha também tem a indentação removida.
    FIM;

// Concatenando em chamadas, sem ponto-e-vírgula obrigatório após o marcador:
$mensagem = 'cabecalho' . <<<FIM
    corpo da mensagem
    FIM;

// Nowdoc funciona igual (identificador entre aspas):
$sql = <<<'SQL'
    SELECT * FROM usuarios
    WHERE ativo = 1
    SQL;
```

A indentação removida é a do marcador de fechamento; linhas mais indentadas que
ele mantêm o excesso. Isso torna heredoc/nowdoc utilizáveis dentro de blocos
indentados (funções, métodos, arrays) sem poluir o código.

## 6. Separador de literais numéricos `_` (PHP 7.4)

Pequeno conforto de legibilidade: underscores entre dígitos (não no início/fim).

```php
<?php
$pi      = 3.14159_26535;
$bytes   = 1_048_576;        // decimal
$cor     = 0xFF_00_FF;       // hexadecimal
$mascara = 0b1010_0101;      // binário
```

## 7. Diretrizes

- Prefira `??=` a `isset()` + `if` para valores padrão de arrays/objetos.
- Use arrow functions para callbacks curtos que apenas leem o escopo externo;
  use closures com `use (&$v)` quando precisar escrever no escopo externo.
- Use `[...$arr]` para mesclar/achatar arrays de forma declarativa.
- Vírgulas à direita em chamadas melhoram a legibilidade de listas longas — mas
  mantenha-se no escopo de *chamadas* (7.3), não de declarações (8.0).
- Heredoc/nowdoc indentados deixam o código mais limpo dentro de classes/funções.

## 8. Resumo

| Recurso | Versão | Notas |
|---|---|---|
| `??=` | 7.4 | atribuição de coalescência nula |
| `fn() =>` | 7.4 | arrow functions (captura por valor) |
| `[...$arr]` | 7.4 | spread em literal de array |
| vírgula à dir. em chamadas | 7.3 | não em declarações |
| heredoc/nowdoc flexível | 7.3 | marcador pode ser indentado |
| `_` em literais numéricos | 7.4 | legibilidade |
