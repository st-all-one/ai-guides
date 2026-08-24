Complementar ao documento comum — específico do PHP 7.2.

# Namespaces no PHP 7.2

Este documento cobre os *namespaces* disponíveis no PHP 7.2. Todo o código
aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores. Alguns
> recursos de sintaxe de versões mais recentes não estão disponíveis nesta
> versão.

## 1. Declarando um namespace

A declaração deve ser a primeira instrução do arquivo (após o `<`?`php` e
quaisquer `declare`). Não pode haver saída de HTML ou espaços antes dela.

```php
<?php
namespace Meu\Projeto;

class Usuario
{
    public function nome(): string
    {
        return 'Ana';
    }
}
```

Há também a sintaxe de bloco (compound), mas ela não altera a resolução — é
apenas uma forma de agrupar código no mesmo namespace:

```php
<?php
namespace Meu\Projeto {
    class A {}
    function helper() {}
}

namespace Outro {
    class B {}
}
```

## 2. O namespace global

Código fora de qualquer `namespace` pertence ao **namespace global**. Para
declará-lo explicitamente:

```php
<?php
namespace;

function globalHelper(): string
{
    return 'global';
}
```

## 3. Importando e apelidando com `use`

A instrução `use` cria um alias para uma classe, interface, trait, função ou
constante, simplificando o uso no corpo do arquivo.

```php
<?php
namespace App\Controlador;

use Meu\Projeto\Model\Usuario;        // classe
use Meu\Projeto\Util\Formatador;       // classe
use function Meu\Projeto\Utils\slugify; // função (7.0+)
use const Meu\Projeto\Config\LIMITE;   // constante (7.0+)

$usuario = new Usuario();
$apelido = slugify($usuario->nome());
```

Você pode definir um alias explícito com `as`:

```php
<?php
use Meu\Projeto\Model\Usuario as ModeloUsuario;
use Meu\Projeto\Servico\Usuario as ServicoUsuario;

$m = new ModeloUsuario();
$s = new ServicoUsuario();
```

## 4. Agrupando instruções `use` (7.0+)

Desde o PHP 7.0 é possível agrupar imports no mesmo namespace base:

```php
<?php
use Meu\Projeto\{
    Model\Usuario,
    Model\Produto,
    Servico\Carrinho,
    Servico\Pagamento,
};
```

O PHP 7.2 também permite a vírgula final dentro do grupo (vide
`10-sintaxe-recursos-72.md`).

Também é possível agrupar funções e constantes:

```php
<?php
use function Meu\Projeto\Util\{
    slugify,
    normalizar,
};

use const Meu\Projeto\Config\{
    LIMITE,
    MOEDA,
};
```

## 5. Fallback para funções e constantes globais

Ao chamar uma função ou constante **não qualificada** dentro de um namespace,
o PHP primeiro procura no namespace atual; se não encontrar, faz *fallback*
para o namespace global (apenas para funções e constantes, **não** para
classes).

```php
<?php
namespace App;

$c = strlen('ola');        // procura App\strlen; não existe -> usa global strlen
$x = PHP_EOL;              // procura App\PHP_EOL; não existe -> usa global
```

Para forçar o global, use a barra inicial:

```php
<?php
namespace App;

$c = \strlen('ola');       // global, sem dúvida
$d = \PHP_EOL;             // constante global
```

## 6. Resolução dinâmica de namespace

Nomes de classes podem ser construídos dinamicamente em variáveis:

```php
<?php
namespace App;

$classe = 'Meu\Projeto\Model\Usuario';  // nome totalmente qualificado
$obj = new $classe();

// ou relativo ao namespace atual
$nome = 'MinhaClasse';
$obj2 = new $nome();        // resolve para App\MinhaClasse
```

## 7. Regras de resolução (não qualificado / qualificado / totalmente qualificado)

- **Não qualificado** (`Foo`): resolve para `NamespaceAtual\Foo` para classes;
  para funções/constantes, cai no global se não existir localmente.
- **Qualificado** (`Foo\Bar`): resolve para `NamespaceAtual\Foo\Bar`.
- **Totalmente qualificado** (`\Foo\Bar`): resolve exatamente para `Foo\Bar`,
  ignorando o namespace atual.

```php
<?php
namespace App\Admin;

use Meu\Projeto\Model\Usuario;

new Usuario();        // App\Admin\Usuario (não qualificado p/ classe)
new \Meu\Projeto\Model\Usuario(); // totalmente qualificado
new Model\Usuario();  // App\Admin\Model\Usuario (qualificado)
```

## 8. Ordem de resolução de nomes

1. Se houver import (`use`) para o nome, o alias substitui o nome.
2. Nomes totalmente qualificados (`\X`) não são modificados.
3. Nomes qualificados recebem o prefixo do namespace atual.
4. Nomes não qualificados de **classes** recebem o prefixo do namespace atual.
5. Nomes não qualificados de **funções/constantes** tentam o namespace atual e,
   em seguida, o global (fallback).

## 9. Resumo

| Recurso | Disponível em | Notas no 7.2 |
|---|---|---|
| `namespace X;` | 5.3 | primeira instrução do arquivo |
| sintaxe de bloco `{}` | 5.3 | agrupa código |
| `namespace;` global | 5.3 | global explícito |
| `use` + `as` | 5.3 | alias |
| `use function` / `use const` | 7.0 | importa função/constante |
| `use` agrupado `{}` | 7.0 | agrupa imports |
| vírgula final no `use {}` | 7.2 | apenas agrupado |
