Complementar ao documento comum — específico do PHP 7.2.

# Referências no PHP 7.2

Este documento cobre as referências (*references*) disponíveis no PHP 7.2. Todo
o código aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores.

## 1. O que é uma referência

Uma referência no PHP é um **apelido** para o mesmo conteúdo de variável — não
é um ponteiro nem um endereço de memória como em C. Duas variáveis apontam para
o mesmo *zval* (container de variável). Alterar uma reflete na outra.

```php
<?php
$a = 1;
$b =& $a;       // $b é apelido de $a
$b = 2;
echo $a;        // 2
```

## 2. Atribuição por referência

Use `=&` para criar o vínculo. Depois disso, ambas as variáveis compartilham o
valor.

```php
<?php
$original = 'foo';
$ref =& $original;
$ref = 'bar';
echo $original; // 'bar'

// Reatribuir a variável "desvincula" o apelido antigo
$outra = 'x';
$ref =& $outra;
$ref = 'y';
echo $original; // 'bar' (não mudou)
echo $outra;    // 'y'
```

## 3. Passagem por referência em parâmetros

Funções podem receber argumentos por referência para modificar a variável
chamadora.

```php
<?php
function incrementar(int &$valor): void
{
    $valor++;
}

$n = 5;
incrementar($n);
echo $n; // 6
```

## 4. Retorno por referência

Declare o retorno com `&` e capture com `=&`. Útil para acessar e modificar
membros internos, mas use com cuidado.

```php
<?php
class Caixa
{
    private $itens = ['a', 'b', 'c'];

    public function &ultimo(): string
    {
        return $this->itens[count($this->itens) - 1];
    }
}

$c = new Caixa();
$ult =& $c->ultimo();
$ult = 'z';
```

## 5. Removendo uma referência com `unset`

`unset` em uma referência apenas destrói o vínculo, não o valor original.

```php
<?php
$a = 10;
$b =& $a;
unset($b);      // $b deixa de existir; $a permanece 10
echo $a;        // 10
```

## 6. Referências em `foreach`

Ao iterar por referência, a variável continua apontando para o último elemento
após o loop — um erro comum.

```php
<?php
$lista = [1, 2, 3];
foreach ($lista as &$item) {
    $item *= 2;
}
unset($item);   // ESSENCIAL: quebra a referência pendente

print_r($lista); // [2, 4, 6]
```

Sem o `unset($item)`, reutilizar `$item` corromperia o último elemento.

## 7. Cópia vs referência

Por padrão, escalares e arrays são copiados por valor. Objetos são tratados
como handle (a variável aponta para o mesmo objeto, sem `&`).

```php
<?php
$x = [1, 2];
$y = $x;        // cópia
$y[0] = 99;
echo $x[0];     // 1 (não mudou)

$ref =& $x;     // referência
$ref[0] = 99;
echo $x[0];     // 99
```

## 8. Ressalvas

- **Closures**: uma variável capturada por referência com `use (&$v)` compartilha
  o valor com o escopo externo.
- **Escopo global**: `global $x` cria uma referência para a variável global,
  não uma cópia.
- **Performance**: referências podem inibir otimizações do motor e copiar o
  valor (separação de escrita) quando necessário; não as use achando que sempre
  economizam memória.
- **Arrays grandes**: passar por referência evita cópia, mas dificulta o
  raciocínio sobre o código.

## 9. Resumo

| Operação | Sintaxe | Efeito |
|---|---|---|
| atribuir | `$b =& $a` | apelido |
| parâmetro | `function f(&$x)` | modifica chamador |
| retorno | `function &f()` + `$r =& f()` | apelido de interno |
| remover | `unset($b)` | quebra vínculo |
| foreach | `as &$v` | lembre do `unset` |
