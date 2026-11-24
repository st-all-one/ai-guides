# Sintaxe e novos recursos do PHP 8.5

Este capítulo cobre a superfície sintática acrescentada ou alterada no PHP 8.5
em relação ao 8.4. Todo o código é válido no 8.5; nenhum recurso removido é
usado. Versão de referência: PHP 8.5.13 (`source/main/php_version.h:3-7`).

## Fontes

- `source/UPGRADING` (seções 2 e 4: novos recursos e depreciações).
- `docs/pipe-operator.txt`, `docs/array_first-array_last.txt`,
  `docs/boolean-double-integer-binary-casts-deprecated.txt`.
- `https://www.php.net/releases/8.5/en.php` (anúncio oficial).
- `source/Zend/zend_language_parser.y` (gramática: `T_PIPE`).

### Operador pipe `|>`

O PHP 8.5 acrescenta o operador `|>`, que encadeia callables da esquerda para
a direita, passando o valor do lado esquerdo como **primeiro argumento** do
callable à direita (`source/UPGRADING:204-205`). É açúcar sintático: o compilador
gera opcodes semelhantes aos de chamadas aninhadas, então não há ganho de
performance — o ganho é de legibilidade (`docs/pipe-operator.txt`).

```php
<?php
declare(strict_types=1);

$slug = ' PHP 8.5 Released '
    |> trim(...)
    |> (fn(string $s): string => str_replace(' ', '-', $s))
    |> (fn(string $s): string => str_replace('.', '', $s))
    |> strtolower(...);
// "php-85-released"
```

A gramática define o token `T_PIPE` e a produção `expr T_PIPE expr`
(`source/Zend/zend_language_parser.y`). O operando direito pode ser qualquer
callable: função nomeada, primeira classe (`strlen(...)`), closure, arrow
function, método estático, objeto com `__invoke` ou expressão que retorne
um callable (`docs/pipe-operator.txt`).

**Limitações operacionais** (`docs/pipe-operator.txt`):

- Todo callable da cadeia deve aceitar **um único parâmetro obrigatório**; não
  há como reposicionar o argumento.
- Com `declare(strict_types=1)`, a coerência de tipos é a mesma de uma chamada
  normal: `1 |> strlen(...)` lança `TypeError`.
- Callable com retorno `void` é válido, mas produz `null` dali em diante.
- Parâmetros por referência são rejeitados: `array_pop()` não pode ser usado
  diretamente na cadeia. Exceção restrita: funções internas com `@prefer-ref`
  (`array_multisort`, `extract`).
- Precedência: a expressão matemática à esquerda é avaliada antes do pipe;
  parênteses alteram a ordem explicitamente.

```php
echo 10 + 6 |> dechex(...) |> hexdec(...);      // 16
echo 10 + (6 |> dechex(...)) |> hexdec(...);    // 22
```

> Pitfall: `array_pop` exige referência. Use uma closure intermediária:
> `explode('-', 'a-b-c') |> (fn(array $p): string => array_pop($p))`.
> O teste oficial `source/Zend/tests/pipe_operator/call_by_ref.phpt:15-37`
> confirma o erro `Argument #1 ($a) could not be passed by reference`.

### `array_first()` e `array_last()`

Novas funções complementares a `array_key_first()`/`array_key_last()` (7.3):
retornam o **valor** da primeira/última posição, ou `null` se vazio
(`source/UPGRADING:798-800`). `null` também pode ser valor legítimo do array —
se isso importa, verifique `array_key_first()` antes (`docs/array_first-array_last.txt`).

```php
array_first([1, 2, 3]);            // 1
array_first(['a' => 2, 'b' => 1]); // 2 (respeita ordem de inserção)
array_last([]);                    // null
array_last([null, 2]);             // null (valor real, não sentinela)
$evento = array_last($eventos) ?? throw new RuntimeException('sem eventos');
```

### Clone With — `clone($objeto, [...])`

O construtor `clone` passa a ser uma função e aceita um segundo parâmetro
`$withProperties` para substituir propriedades (inclusive `readonly`) durante
a clonagem (`source/UPGRADING:744-746`). É o suporte nativo ao padrão
*with-er* para classes imutáveis (anúncio oficial:
`https://www.php.net/releases/8.5/en.php`).

```php
<?php
declare(strict_types=1);

readonly class Cor
{
    public function __construct(
        public int $vermelho,
        public int $verde,
        public int $azul,
        public int $alfa = 255,
    ) {}

    public function comAlfa(int $alfa): self
    {
        return clone($this, ['alfa' => $alfa]);
    }
}

$azul   = new Cor(79, 91, 147);
$opaco  = $azul->comAlfa(128);
// $azul->alfa continua 255

Regras práticas confirmadas pelos testes oficiais: o array de substituição usa
**nomes de propriedades** como chaves, incluindo chaves numéricas para
propriedades dinâmicas (`source/Zend/tests/clone/clone_with_001.phpt:17-28`);
a **visibilidade é respeitada** — código externo não reescreve `protected`/
`private`, mas método da classe pode (`source/Zend/tests/clone/clone_with_002.phpt:6-31`);
os **hooks `set` executam na ordem do array** e podem lançar exceção
(`source/Zend/tests/clone/clone_with_005.phpt:40-64`); e as propriedades
continuam `readonly` depois do clone (`source/Zend/tests/clone/clone_with_014.phpt:16-35`).
`__clone()` continua sendo chamado no objeto clonado. Use apenas para criar
variações de objetos imutáveis; para mutação real, mantenha métodos de domínio
explícitos.

> Regra crítica (confirmada por execução real no PHP 8.5.13): para reescrever
> uma propriedade `readonly` de fora da classe, ela precisa de visibilidade de
> escrita explícita — `public public(set)`:
> ```php
> readonly class Ponto {
>     public function __construct(
>         public public(set) int $x,
>         public public(set) int $y,
>     ) {}
> }
> $novo = clone($p, ['x' => 10]); // OK
> ```
> Sem `public(set)`, o engine lança
> `Error: Cannot modify protected(set) readonly property ... from global scope`.
> Métodos da própria classe podem usar `clone($this, [...])` com propriedades
> privadas/protected normalmente
> (`source/Zend/tests/clone/clone_with_002.phpt:12-14`).

### `#[\NoDiscard]` e o cast `(void)`

`#[\NoDiscard]` sinaliza que o valor retornado não deve ser descartado; o PHP
emite aviso quando o retorno não é consumido (`source/UPGRADING:189-191`).
O cast `(void)` indica descarte **intencional** e suprime o aviso — ele não
altera a execução (`source/UPGRADING:192-196`).

```php
#[\NoDiscard]
function lerConfig(string $chave): string { return $_ENV[$chave] ?? ''; }

lerConfig('APP_ENV');        // aviso: retorno não consumido
(void) lerConfig('APP_ENV'); // descarte explícito, sem aviso
$ambiente = lerConfig('APP_ENV'); // consumo correto
```

Aplique em APIs onde ignorar o retorno causa bug silencioso (validações,
resultados de operações atômicas, handles). Não use em funções cujo efeito é
apenas o retorno opcional.

### Closures e first-class callables em expressões constantes

A partir do 8.5, closures `static` e first-class callables podem aparecer em
expressões constantes — parâmetros de atributos, valores padrão de propriedades
e parâmetros, e constantes (`source/UPGRADING:181-185`). Em expressões
constantes, a closure deve ser `static` (não captura `$this`).

```php
#[\Attribute(\Attribute::TARGET_METHOD)]
final class Authorize
{
    public function __construct(
        public readonly \Closure $predicate,
    ) {}
}

final class PostController
{
    #[Authorize(static fn(object $user, object $post): bool =>
        $user->id === $post->authorId)]
    public function update(object $user, object $post): void {}
}
```

Também são novos no 8.5: suporte a *casts* em expressões constantes
(`source/UPGRADING:199`), atributos em constantes de compile-time não-classe
(`source/UPGRADING:200-201`) e `#[\Deprecated]` aplicável a constantes
(`source/UPGRADING:202-203`).

### Atributos e visibilidade: ajustes do 8.5

- `#[\Override]` pode ser aplicado a **propriedades** (`source/UPGRADING:208-209`).
- Visibilidade assimétrica agora funciona em propriedades **estáticas**
  (`source/UPGRADING:197-198`).
- Promoção de propriedades no construtor aceita `final`
  (`source/UPGRADING:206-207`): `public function __construct(public final int $id) {}`.
- `#[\DelayedTargetValidation]` adia para tempo de execução erros de compilação
  de atributos do core usados em alvo inválido; o erro só aparece se
  `ReflectionAttribute::newInstance()` for chamado (`source/UPGRADING:47-51,210-214`).
  Use apenas em código de compatibilidade, não como rotina.

```php
final class Servico
{
    public final function __construct(
        public protected(set) static int $instancias = 0,
        public final string $nome = 'padrao',
    ) {}
}
```

> Atenção: `public final static` em propriedade promovida depende do alvo da
> promoção; prefira `final` em classes/métodos e `readonly` em dados.

### Cast's não canônicos depreciados

`(boolean)`, `(integer)`, `(double)` e `(binary)` estão depreciados; use
`(bool)`, `(int)`, `(float)` e `(string)` (`source/UPGRADING:368-370`;
`docs/boolean-double-integer-binary-casts-deprecated.txt`).

```php
$x = (bool) $valor;    // correto
$y = (boolean) $valor; // depreciado no 8.5
```

### Outras mudanças de sintaxe/comportamento

| Mudança | Efeito no 8.5 | Fonte |
| --- | --- | --- |
| `case` terminado com `;` | depreciado; use `:` | `source/UPGRADING:374-376` |
| `null` como offset de array / em `array_key_exists()` | depreciado; use `''` | `source/UPGRADING:400-402` |
| Desestruturação de não-array (exceto `null`) com `[]`/`list()` | aviso | `source/UPGRADING:55-57` |
| Cast de float fora da faixa para `int` | aviso (casts explícitos e implícitos) | `source/UPGRADING:58-60` |
| Cast de `NAN` para outros tipos | aviso | `source/UPGRADING:61-62` |
| Operador backtick `` `cmd` `` | depreciado; use `shell_exec()` | `source/UPGRADING:377-378` |
| Incremento de strings não numéricas (`++`) | depreciado; use `str_increment()` | `source/UPGRADING:386-389` |
| Retorno `null` de `__debugInfo()` | depreciado; retorne `[]` | `source/UPGRADING:379-381` |
| Redeclaração de constante | depreciada | `source/UPGRADING:384-385` |
| `get_defined_functions($exclude_disabled)` | parâmetro depreciado | `source/UPGRADING:371-373` |
| `ini disable_classes` | **removido** | `source/UPGRADING:52-54` |
| `-z` / `--zend-extension` (CLI/CGI) | **removido** | `docs/cli-cgi-z-option-removed.txt` |

### Callable e reflexão: incrementos menores

- `Closure` é agora um subtipo correto de `callable` no sistema de tipos
  (`source/UPGRADING:181`).
- `Closure::getCurrent()` devolve a closure em execução
  (`source/UPGRADING:747`).
- `ReflectionConstant` não é mais `final` e ganhou `getFileName()`,
  `getExtension()`, `getExtensionName()` e `getAttributes()`
  (`source/UPGRADING:878-879,786-791`).

## Verificação

- `php -v` deve reportar `8.5.x`; `source/main/php_version.h:3-7` fixa a
  branch 8.5.13.
- `php -l` em todos os exemplos.
- `php --ini=diff` para confirmar que nenhuma INI legada (ex.: `disable_classes`)
  está em uso (`docs/cli-ini-diff.txt`).
