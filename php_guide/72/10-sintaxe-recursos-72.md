Complementar ao documento comum — específico do PHP 7.2.

# Sintaxe e Recursos do PHP 7.2 (além do básico)

Este documento cobre os recursos sintáticos disponíveis no PHP 7.2 que vão além
da linha de base comum (vide `01-sintaxe-basica.md`). Todo o código aqui é
100% válido e executável no PHP 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores. Alguns recursos
> de sintaxe de versões posteriores não estão disponíveis nesta versão.

## 1. Coalescência nula encadeada `??`

Disponível desde o PHP 7.0, a coalescência nula encadeia-se para fornecer
valores padrão em cascata. Não emite aviso se a variável não estiver definida.

```php
<?php
$nome = $_GET['nome'] ?? $_POST['nome'] ?? 'Anônimo';

// Também funciona com índices/posições de array
$cor = $config['tema']['cor'] ?? $config['cor'] ?? 'azul';
```

A coalescência é **eager** (avalia o lado direito mesmo quando não usado).
Diferente de `?:`, ela só cai para o lado direito quando o esquerdo for
`null` ou indefinido — `0`, `''` e `'0'` **não** disparam a substituição:

```php
<?php
$quantidade = $_GET['q'] ?? 10;     // '0' permanece 0; nulo vira 10
$outro      = $_GET['x'] ?: 10;      // '0' e '' viram 10 (comportamento diferente)
```

## 2. Operador nave (spaceship) `<=>`

Desde o PHP 7.0. Retorna `-1`, `0` ou `1` para menor, igual ou maior. Ideal
para callbacks de ordenação.

```php
<?php
function cmp($a, $b): int {
    return $a <=> $b;
}

$pessoas = [
    ['nome' => 'Ana', 'idade' => 30],
    ['nome' => 'Bia', 'idade' => 25],
];

usort($pessoas, function ($a, $b) {
    return $a['idade'] <=> $b['idade'];
});

// Ordenação multi-critério
usort($pessoas, function ($a, $b) {
    return [$a['idade'], $a['nome']] <=> [$b['idade'], $b['nome']];
});
```

## 3. Desempacotamento de argumentos em chamadas `...`

Desde o PHP 5.6: espalhe os elementos de um array como argumentos posicionais
na **chamada** da função.

```php
<?php
function soma(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$nums = [1, 2, 3];
echo soma(...$nums); // 6

// Pode ser misturado com argumentos normais
function saudacao(string $saudacao, string $nome): string {
    return "$saudacao, $nome!";
}
echo saudacao('Olá', ...['Mundo']);
```

> Nota: o desempacotamento de arrays na **definição** literal (`[...$arr]`, 7.4)
> não existe no 7.2 — use `array_merge()` para isso.

## 4. Desestruturação de array (shorthand `[]`)

Desde o PHP 7.1, a sintaxe curta `[]` substitui `list()` para extrair valores.

```php
<?php
$ponto = [10, 20, 30];

// Equivalente a list($x, $y, $z)
[$x, $y, $z] = $ponto;
echo "$x, $y, $z"; // 10, 20, 30

// Ignorando posições
[$primeiro, , $terceiro] = $ponto;

// Chaves nomeadas (7.1)
$user = ['id' => 1, 'nome' => 'Ana'];
['id' => $id, 'nome' => $nome] = $user;

// Em foreach
$lista = [['id' => 1, 'nome' => 'A'], ['id' => 2, 'nome' => 'B']];
foreach ($lista as ['id' => $id, 'nome' => $nome]) {
    echo "$id: $nome\n";
}

// Desempacotamento em chamadas (variádica) — ver 03
```

## 5. Offsets negativos em strings

Desde o PHP 7.1, `[]` e `{}` acessam caracteres a partir do fim com índice
negativo.

```php
<?php
$str = 'abcdef';
echo $str[-1]; // 'f'
echo $str[-2]; // 'e'

// Funções também aceitam offset negativo
echo substr($str, -2);    // 'ef'
echo strpos($str, 'd', -5); // funciona com offset negativo
```

## 6. Visibilidade de constantes de classe

Desde o PHP 7.1, constantes de classe podem ter `public`, `protected` ou
`private`.

```php
<?php
class Config
{
    public const VISAO_GERAL = 1;
    protected const INTERNO    = 2;
    private const SEGREDO      = 3;

    public function valor(): int
    {
        return self::SEGREDO;
    }
}

echo Config::VISAO_GERAL;
```

## 7. Multi-catch (captura múltipla)

Desde o PHP 7.1, capture várias exceções em um único bloco com `|`.

```php
<?php
try {
    fazerAlgo();
} catch (InvalidArgumentException | RuntimeException $e) {
    logar($e->getMessage());
} finally {
    limpar();
}
```

## 8. Vírgula final em `use` agrupado

Específico do PHP 7.2: o `use` de namespace agrupado (`{}`) aceita vírgula
final.

```php
<?php
use Meu\Projeto\{
    Controller\Home,
    Controller\Admin,
    Model\Usuario,   // vírgula final permitida no 7.2
};
```

## 9. Sintaxe alternativa (revisão)

Os blocos de controle aceitam forma alternativa com `:` … `end<xc>;`, úteis
em templates. Válidos em 7.2 (recursos de sintaxe de string mais recentes não
se aplicam aqui).

```php
<?php if ($logado): ?>
    <p>Bem-vindo.</p>
<?php elseif ($pendente): ?>
    <p>Aguardando.</p>
<?php else: ?>
    <p>Faça login.</p>
<?php endif; ?>
```

## 10. `declare` por arquivo

`declare(strict_types=1)` e `declare(ticks=1)` são instruções por arquivo. No
7.2 elas funcionam normalmente (vide `16-configuracao-72.md` para detalhes).

```php
<?php
declare(strict_types=1);

function somar(int $a, int $b): int {
    return $a + $b;
}
```

## 11. Resumo

| Recurso | Desde | Notas no 7.2 |
|---|---|---|
| `??` coalescência | 7.0 | eager; ignora `0`/`''` |
| `<=>` spaceship | 7.0 | para comparação tríplice |
| `...` em chamada | 5.6 | espalha array como args |
| `[]` destruturação | 7.1 | substitui `list()` |
| offset negativo | 7.1 | strings e funções |
| `const` visibility | 7.1 | public/protected/private |
| multi-catch | 7.1 | `catch (A | B $e)` |
| vírgula final `use {}` | 7.2 | apenas agrupado |
