# Blade no Laravel 5.5.50

> **Documento de referência estrito para Laravel 5.5.50 (LTS).**
> Todo o conteúdo abaixo baseia-se exclusivamente na documentação oficial de
> Laravel 5.5 (`blade.md`, `views.md`, `csrf.md`, `authorization.md`,
> `releases.md`) e em comportamento verificado do Laravel 5.5.50. Recursos de
> versões posteriores (ex.: `@canany`, `@prepend`, `Blade::component()` como
> alias helper, componentes baseados em classes) **não** fazem parte do 5.5 e
> são sinalizados em notas específicas para evitar confusão.

---

## Introdução

Blade é o motor de templates simples, porém poderoso, fornecido com o Laravel.
Ao contrário de outros motores de template PHP populares, o Blade **não** o
impede de usar PHP puro nas suas views. Na verdade, todas as views Blade são
**compiladas para código PHP puro** e cacheadas até que sejam modificadas.
Isso significa que o Blade adiciona essencialmente **zero overhead** à sua
aplicação.

* Arquivos Blade usam a extensão **`.blade.php`**.
* Geralmente são armazenados em **`resources/views`**.
* A compilação gera arquivos PHP em cache (em
  `storage/framework/views` por padrão). O template só é recompilado quando o
  arquivo de origem muda.
* É possível misturar PHP cru livremente dentro de uma view Blade.

```php
// Retornando uma view Blade a partir de uma rota
Route::get('blade', function () {
    return view('child');
});
```

> **Armadilha:** Views Blade compiladas são arquivos PHP em cache. Nunca use as
> constantes mágicas `__DIR__` e `__FILE__` dentro de uma view Blade, pois elas
> apontarão para o **local do arquivo compilado em cache**, e não para o arquivo
> de origem em `resources/views`. (Documentado em `blade.md`.)

---

## Herança de Templates (Template Inheritance)

Dois dos principais benefícios do Blade são a **herança de templates** e as
**seções (sections)**. O padrão consiste em definir um "layout mestre"
(_master layout_) e fazer com que páginas filhas estendam esse layout,
injetando conteúdo nas seções definidas.

### Definindo um Layout

Um layout é uma view Blade comum que usa as diretivas `@section` e `@yield`.

```blade
{{-- Stored in resources/views/layouts/app.blade.php --}}

<html>
    <head>
        <title>App Name - @yield('title')</title>
    </head>
    <body>
        @section('sidebar')
            This is the master sidebar.
        @show

        <div class="container">
            @yield('content')
        </div>
    </body>
</html>
```

* `@yield('nome')` — exibe o conteúdo de uma seção. É um "placeholder".
* `@section('nome') ... @show` — **define** uma seção **e a exibe
  imediatamente** no ponto em que aparece.
* `@section('nome') ... @endsection` — **define** a seção, mas **não** a exibe
  no ponto; ela só será exibida onde houver um `@yield` correspondente no
  layout (ou onde for explicitamente renderizada).

> **Diferença crítica (`@show` vs `@endsection`):** `@show` define e renderiza a
> seção ali mesmo; `@endsection` apenas a define para ser renderizada via
> `@yield`. Esquecer essa distinção é uma fonte comum de layouts "vazios".

### Estendendo um Layout

A view filha usa `@extends` para declarar qual layout herdar e `@section`
para injetar conteúdo.

```blade
{{-- Stored in resources/views/child.blade.php --}}

@extends('layouts.app')

@section('title', 'Page Title')

@section('sidebar')
    @parent

    <p>This is appended to the master sidebar.</p>
@endsection

@section('content')
    <p>This is my body content.</p>
@endsection
```

* `@extends('layouts.app')` — indica que esta view herda de
  `resources/views/layouts/app.blade.php`.
* `@section('title', 'Page Title')` — forma **inline** (single-line) de definir
  uma seção cujo conteúdo é uma string simples.
* `@parent` — **dentro** de uma seção da filha, injeta o conteúdo da seção do
  layout mestre, permitindo **anexar** conteúdo em vez de sobrescrever. Sem
  `@parent`, o conteúdo da filha **substituirá** totalmente o da mãe.

> **Armadilha:** `@parent` deve ser usado dentro de uma `@section ... @endsection`
> da filha. Se você esquecer `@parent` onde pretendia anexar, o conteúdo do
> layout será perdido silenciosamente.

### `@hasSection` (verificação de seção)

Para checar se uma seção possui conteúdo antes de renderizá-la:

```blade
@hasSection('navigation')
    <div class="pull-right">
        @yield('navigation')
    </div>

    <div class="clearfix"></div>
@endif
```

> **Nota de versão:** Em 5.5, `@hasSection` é fechado com `@endif` (não existe
> `@endhasSection` no 5.5). O par `@hasSection ... @endif` é o padrão desta
> versão.

### Anexando vs. Sobrescrevendo (`@append` e o padrão `@endsection`)

Além de `@show`/`@endsection`, o Blade 5.5 suporta a diretiva legada
`@append`:

```blade
@section('scripts')
    <script src="/foo.js"></script>
@append
```

`@append` (sem `@endsection`) define a seção e a marca para ser **anexada** se
ocorrer novamente. Na prática no 5.5, o padrão recomendado e documentado é usar
`@section ... @endsection` combinado com `@yield` no layout, e usar `@parent`
dentro da filha para anexar conteúdo ao da mãe.

> **Nota de versão:** A diretiva `@prepend` (que empilha conteúdo no **início**
> de uma stack/seção) **não existe no Laravel 5.5**. Ela foi introduzida apenas
> no Laravel 5.6. No 5.5.50, use `@push`/`@stack` (ver seção Stacks) ou
> `@parent` para compor conteúdo.

---

## Seções e Layouts: Yield de Conteúdo e Stacks

* **Yield de conteúdo:** `@yield('content')` exibe a seção nomeada. Pode receber
  um valor padrão como segundo argumento:
  `@yield('content', 'Conteúdo padrão')` (comportamento padrão do motor de
  views do Laravel, disponível no 5.5).
* **Yield de stacks (scripts/assets):** Para empilhar pedaços de HTML
  (típico: arquivos JS/CSS) a partir de views filhas e renderizá-los num ponto
  do layout, use `@push`/`@stack` (detalhado abaixo).

---

## Components e Slots (novidade do Laravel 5.5)

> Componentes e slots no formato `@component`/`@slot` são uma **feature
> introduzida no Laravel 5.5**. Eles oferecem um modelo mental alternativo a
> seções/layouts, frequentemente mais fácil de entender para UIs reutilizáveis.

### Componente básico (default slot)

Um componente é apenas uma view Blade que recebe a variável mágica **`$slot`**
com o conteúdo injetado.

```blade
{{-- /resources/views/alert.blade.php --}}

<div class="alert alert-danger">
    {{ $slot }}
</div>
```

Para usar o componente:

```blade
@component('alert')
    <strong>Whoops!</strong> Something went wrong!
@endcomponent
```

Tudo o que estiver entre `@component('alert')` e `@endcomponent` e **não**
estiver dentro de um `@slot` nomeado é passado para a variável `$slot`.

### Slots nomeados

Você pode definir múltiplos pontos de injeção. No componente, exiba a variável
que corresponde ao nome do slot:

```blade
{{-- /resources/views/alert.blade.php --}}

<div class="alert alert-danger">
    <div class="alert-title">{{ $title }}</div>

    {{ $slot }}
</div>
```

Na view que consome o componente, use `@slot('nome') ... @endslot`:

```blade
@component('alert')
    @slot('title')
        Forbidden
    @endslot

    You are not allowed to access this resource!
@endcomponent
```

Qualquer conteúdo fora de `@slot` vai para `$slot` (o slot padrão).

### Passando dados adicionais a um componente

O segundo argumento de `@component` é um **array** de dados extras, disponível
no componente como variáveis simples:

```blade
@component('alert', ['foo' => 'bar'])
    ...
@endcomponent
```

Dentro de `alert.blade.php`, `$foo` estará disponível com o valor `'bar'`.

> **Nota de versão — alias de componente:** O helper conveniente
> `Blade::component('alias', 'view')` (que permite usar `@alias` em vez de
> `@component('caminho.completo')`) **não existe no Laravel 5.5**. Ele foi
> introduzido no Laravel 5.6. No 5.5.50 você **sempre** referencia o componente
> pelo caminho completo da view (ex.: `@component('alert')` ou
> `@component('partials.alert')`). Não há `Blade::component()` em 5.5.

---

## Exibindo Dados (Displaying Data)

### Chaves duplas `{{ }}` (escapadas)

Para exibir dados passados à view, envolva a variável em chaves duplas:

```blade
Hello, {{ $name }}.
```

Você não está limitado a variáveis: pode executar qualquer expressão PHP
válida, incluindo chamadas de função:

```blade
The current UNIX timestamp is {{ time() }}.
```

> **Segurança (XSS):** As instruções `{{ }}` do Blade são **automaticamente
> passadas pela função `htmlspecialchars` do PHP**, prevenindo ataques XSS.
> Esta é a forma **segura e padrão** de exibir dados, especialmente dados
> fornecidos por usuários.

### Chaves triplas removidas

O Blade antigo (pré-5.x) suportava `{{{ }}}` para escaping explícito. **No
Laravel 5.5 isso não existe mais** — `{{ }}` já escapa por padrão. Não use
chaves triplas.

### Exibindo dados não escapados `{!! !!}`

Se você realmente precisa de saída **sem** escaping (ex.: HTML gerado
intencionalmente, conteúdo confiável):

```blade
Hello, {!! $name !!}.
```

> **Armadilha crítica (XSS):** Tenha **extremo cuidado** ao exibir conteúdo
> fornecido por usuários com `{!! !!}`. Sempre use `{{ }}` para dados de
> usuários. Exibir `{{ }}` de um campo não sanitizado com `{!! !!}` abre uma
> vulnerabilidade de Cross-Site Scripting.

### Renderizando JSON com `@json`

Para passar um array/objeto do PHP para o JavaScript, em vez de
`<?php echo json_encode($array); ?>`, use a diretiva `@json`:

```blade
<script>
    var app = @json($array);
</script>
```

`@json` gera a chamada `json_encode` adequada (com flags seguras de acordo com
o motor de Blade 5.5) para inicializar variáveis JS.

### Blade e frameworks JavaScript (`@` e `@verbatim`)

Muitos frameworks JS (Vue, Angular, etc.) também usam chaves para interpolção.
Para que o Blade **não** processe uma expressão e a deixe intacta para o JS,
prefixe com `@`:

```blade
<h1>Laravel</h1>

Hello, @{{ name }}.
```

O `@` é removido na compilação e `{{ name }}` chega ao navegador para o
framework JS processar.

Para grandes blocos de template com muitas expressões JS, use `@verbatim` para
não precisar prefixar cada uma com `@`:

```blade
@verbatim
    <div class="container">
        Hello, {{ name }}.
    </div>
@endverbatim
```

Dentro de `@verbatim`, tudo entre as chaves é deixado intacto pelo Blade.

---

## Estruturas de Controle (Control Structures)

O Blade fornece atalhos limpos para as estruturas de controle do PHP.

### If Statements

```blade
@if (count($records) === 1)
    I have one record!
@elseif (count($records) > 1)
    I have multiple records!
@else
    I don't have any records!
@endif
```

#### `@unless` (negação)

```blade
@unless (Auth::check())
    You are not signed in.
@endunless
```

Equivale a `@if (!Auth::check())`.

#### `@isset` e `@empty`

Atalhos para as funções PHP correspondentes:

```blade
@isset($records)
    // $records está definido e não é null...
@endisset

@empty($records)
    // $records está "vazio"...
@endempty
```

### Diretivas de Autenticação: `@auth` e `@guest`

Para verificar rapidamente se o usuário está autenticado ou é visitante:

```blade
@auth
    // O usuário está autenticado...
@endauth

@guest
    // O usuário NÃO está autenticado...
@endguest
```

Você pode especificar o **guard** a ser verificado:

```blade
@auth('admin')
    // Autenticado via guard 'admin'...
@endauth

@guest('admin')
    // Não autenticado no guard 'admin'...
@endguest
```

> **Nota de versão:** `@auth`/`@guest` como atalhos rápidos foram destacados
> como melhoria do Laravel 5.5 (`releases.md`).

### Diretivas de Autorização: `@can`, `@cannot` e combinações

Para exibir parte da página apenas se o usuário puder (ou não) executar uma
ação, use a família `@can`/`@cannot`.

```blade
@can('update', $post)
    <!-- O usuário atual pode atualizar o post -->
@elsecan('create', App\Post::class)
    <!-- O usuário atual pode criar um novo post -->
@endcan

@cannot('update', $post)
    <!-- O usuário atual NÃO pode atualizar o post -->
@elsecannot('create', App\Post::class)
    <!-- O usuário atual NÃO pode criar um post -->
@endcannot
```

* `@can('ability', $model)` — atalho para `@if (Auth::user()->can('update', $post))`.
* `@cannot('ability', $model)` — atalho para `@unless (Auth::user()->can(...))`.
* `@elsecan` / `@elsecannot` — permitem encadear verificações.
* **Ações sem modelo:** passe o nome da classe em vez da instância:
  `@can('create', App\Post::class)`.

> **Nota de versão:** A diretiva `@canany` (verifica se o usuário pode
> **qualquer** uma de várias habilidades) **não existe no Laravel 5.5**. Ela
> foi introduzida no Laravel 5.6. No 5.5.50 use `@can`/`@cannot` ou
> `@if (Auth::user()->canAny([...]))` via PHP puro se necessário.

### Switch Statements

```blade
@switch($i)
    @case(1)
        First case...
        @break

    @case(2)
        Second case...
        @break

    @default
        Default case...
@endswitch
```

Diretivas: `@switch`, `@case`, `@break`, `@default`, `@endswitch`.

---

## Loops

### `@for`

```blade
@for ($i = 0; $i < 10; $i++)
    The current value is {{ $i }}
@endfor
```

### `@foreach`

```blade
@foreach ($users as $user)
    <p>This is user {{ $user->id }}</p>
@endforeach
```

### `@forelse` / `@empty`

Útil para iterar com um "fallback" quando a coleção está vazia:

```blade
@forelse ($users as $user)
    <li>{{ $user->name }}</li>
@empty
    <p>No users</p>
@endforelse
```

### `@while`

```blade
@while (true)
    <p>I'm looping forever.</p>
@endwhile
```

### `@continue` e `@break`

```blade
@foreach ($users as $user)
    @if ($user->type == 1)
        @continue
    @endif

    <li>{{ $user->name }}</li>

    @if ($user->number == 5)
        @break
    @endif
@endforeach
```

Forma condicional em uma linha (passando a condição diretamente):

```blade
@foreach ($users as $user)
    @continue($user->type == 1)

    <li>{{ $user->name }}</li>

    @break($user->number == 5)
@endforeach
```

---

## A Variável `$loop` (The Loop Variable)

Dentro de qualquer loop, a variável **`$loop`** está disponível e fornece
metadados da iteração.

```blade
@foreach ($users as $user)
    @if ($loop->first)
        This is the first iteration.
    @endif

    @if ($loop->last)
        This is the last iteration.
    @endif

    <p>This is user {{ $user->id }}</p>
@endforeach
```

### Loops aninhados e `$loop->parent`

Em loops aninhados, acesse o `$loop` do pai via a propriedade `parent`:

```blade
@foreach ($users as $user)
    @foreach ($user->posts as $post)
        @if ($loop->parent->first)
            This is first iteration of the parent loop.
        @endif
    @endforeach
@endforeach
```

### Propriedades de `$loop`

| Propriedade        | Descrição                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `$loop->index`     | O índice da iteração atual (começa em `0`).                      |
| `$loop->iteration` | A iteração atual (começa em `1`).                                |
| `$loop->remaining` | Quantas iterações restam no loop.                                |
| `$loop->count`     | O número total de itens no array/coleção iterado.                |
| `$loop->first`     | Se esta é a primeira iteração.                                   |
| `$loop->last`      | Se esta é a última iteração.                                     |
| `$loop->even`      | Se o índice de iteração é par (disponível no motor 5.5).         |
| `$loop->odd`       | Se o índice de iteração é ímpar (disponível no motor 5.5).       |
| `$loop->depth`     | O nível de aninhamento do loop atual.                            |
| `$loop->parent`    | Em loop aninhado, o `$loop` do loop pai.                         |

> **Nota:** As propriedades `even`/`odd` fazem parte do objeto `$loop` do
> Laravel 5.5 (acessíveis como `$loop->even`, `$loop->odd`).

---

## Comentários Blade

Comentários Blade **não** são incluídos no HTML final (diferente de comentários
HTML `<!-- -->`):

```blade
{{-- Este comentário NÃO aparecerá no HTML renderizado --}}
```

> Útil para deixar anotações sem vazar conteúdo/estrutura para o cliente.

---

## PHP cru com `@php`

Para embutir um bloco de PHP puro na view:

```blade
@php
    $counter = 0;
    // lógica PHP...
@endphp
```

> **Armadilha / boa prática:** O Blade fornece `@php`, mas usá-lo com
> frequência é um sinal de que há **lógica de negócio demais na view**. Mantenha
> a apresentação na view e a lógica nos controllers/services. Evite `@php`
> longos; prefira preparar os dados no controller ou via View Composers.

---

## Incluindo Sub-Views (`@include` e variantes)

### `@include`

Inclui uma view Blade dentro de outra. **Todas as variáveis** disponíveis na
view pai são automaticamente disponibilizadas na view incluída:

```blade
<div>
    @include('shared.errors')

    <form>
        <!-- Conteúdo do formulário -->
    </form>
</div>
```

Você pode passar dados extras como array:

```blade
@include('view.name', ['some' => 'data'])
```

### `@includeIf`

Inclui a view **apenas se ela existir** (não dispara erro se ausente):

```blade
@includeIf('view.name', ['some' => 'data'])
```

### `@includeWhen`

Inclui a view com base em uma condição booleana:

```blade
@includeWhen($boolean, 'view.name', ['some' => 'data'])
```

### `@includeFirst`

Inclui a **primeira view que existir** de um array de candidatas (útil para
temas/sobreposição de views de pacotes):

```blade
@includeFirst(['custom.admin', 'admin'], ['some' => 'data'])
```

> **Nota de versão:** `@includeFirst` é uma adiçaõ do Laravel 5.5 (documentado
> em `blade.md` do 5.5).

---

## Renderizando Views para Coleções: `@each`

Combina loop e inclusão em uma linha. Útil para renderizar um partial para cada
item de um array/coleção.

```blade
@each('view.name', $jobs, 'job')
```

* 1º argumento: o partial a renderizar para cada elemento.
* 2º argumento: o array/coleção a iterar.
* 3º argumento: o nome da variável que receberá o item atual dentro do partial.
* A **chave** da iteração atual fica disponível como variável `key` no partial.

Você pode passar um 4º argumento: a view renderizada quando o array estiver
vazio:

```blade
@each('view.name', $jobs, 'job', 'view.empty')
```

> **Armadilha:** Views renderizadas via `@each` **NÃO herdam** as variáveis da
> view pai. Se o partial precisar dessas variáveis, use `@foreach` + `@include`
> em vez de `@each`.

---

## Stacks: `@push` e `@stack`

Stacks permitem "empilhar" conteúdo nomeado em um ponto da view/layout e
renderizá-lo em outro — excelente para injetar bibliotecas JS/CSS a partir de
views filhas.

```blade
@push('scripts')
    <script src="/example.js"></script>
@endpush
```

Você pode dar `@push` na mesma stack múltiplas vezes. Para renderizar todo o
conteúdo empilhado, passe o nome da stack para `@stack`:

```blade
<head>
    <!-- Conteúdo do head -->

    @stack('scripts')
</head>
```

> **Nota de versão:** No Laravel 5.5, o mecanismo de stacks é composto por
> `@push` e `@stack`. A variante `@prepend` (que insere no topo da stack) foi
> introduzida **apenas no Laravel 5.6** e **não está disponível no 5.5.50**.

---

## CSRF em Forms Blade

Para formulários HTML (`POST`, `PUT`, `PATCH`, `DELETE`), você deve incluir um
campo hidden com o token CSRF para que o middleware `VerifyCsrfToken` valide a
requisição.

### `{{ csrf_field() }}` (helper)

```blade
<form method="POST" action="/profile">
    {{ csrf_field() }}
    ...
</form>
```

`csrf_field()` gera o input hidden `<input type="hidden" name="_token" value="...">`.

### `@csrf` (diretiva de atalho)

O Laravel 5.5 também disponibiliza a diretiva `@csrf` como atalho equivalente
a `{{ csrf_field() }}`:

```blade
<form method="POST" action="/profile">
    @csrf
    ...
</form>
```

> **Nota de versão:** A diretiva `@csrf` foi introduzida no Laravel 5.5 como
> atalho conveniente. Em versões anteriores (5.4 e anteriores) usava-se apenas
> `{{ csrf_field() }}`. Ambos funcionam no 5.5.50.

Para aplicações JS, o padrão é expor o token num meta tag e lê-lo no front:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

---

## Service Injection: `@inject`

A diretiva `@inject` resolve um serviço do **service container** do Laravel
diretamente na view. O primeiro argumento é o nome da variável; o segundo é a
classe/interface a resolver.

```blade
@inject('metrics', 'App\Services\MetricsService')

<div>
    Monthly Revenue: {{ $metrics->monthlyRevenue() }}.
</div>
```

> **Armadilha / boa prática:** `@inject` facilita, mas **incentiva acoplamento
> e lógica de negócio na view**. Evite usá-lo para lógica complexa; prefira
> preparar os dados no controller ou via View Composer (`View::composer`) e
> passar à view. Use `@inject` apenas para serviços de apresentação leves.

---

## Extending Blade (Extensão do Compilador)

### Diretivas customizadas com `Blade::directive`

Você pode criar suas próprias diretivas. O callback recebe a expressão contida
na diretiva.

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Blade::directive('datetime', function ($expression) {
            return "<?php echo ($expression)->format('m/d/Y H:i'); ?>";
        });
    }

    public function register()
    {
        //
    }
}
```

Uso na view:

```blade
@datetime($var)
```

Isso gera, no PHP compilado: `<?php echo ($var)->format('m/d/Y H:i'); ?>`.

> **Armadilha crítica:** Ao alterar a lógica de uma diretiva Blade, você
> **precisa apagar o cache** das views compiladas. Use:
> `php artisan view:clear`. Caso contrário, o Blade continuará servindo a
> versão antiga em cache e sua mudança "não surtirá efeito".

### Custom If Statements com `Blade::if` (novidade do 5.5)

Para condicionais simples, `Blade::if` é mais leve que `Blade::directive`.
Defina um nome de diretiva condicional via Closure:

```php
use Illuminate\Support\Facades\Blade;

public function boot()
{
    Blade::if('env', function ($environment) {
        return app()->environment($environment);
    });
}
```

Uso na view (note `@env`, `@elseenv`, `@endenv` gerados automaticamente):

```blade
@env('local')
    // A aplicação está no ambiente local...
@elseenv('testing')
    // A aplicação está no ambiente de testes...
@else
    // Não está em local nem testing...
@endenv
```

> **Nota de versão:** `Blade::if` foi **introduzido no Laravel 5.5** (destacado
> em `releases.md`). É a forma recomendada para condicionais customizadas no
> 5.5.50.

### Sobre `Blade::extend` e `Blade::component`

* **`Blade::extend`**: existia em versões mais antigas do Laravel como forma de
  modificar o compilador via regex/Closure. No Laravel 5.5 o mecanismo
  preferido e documentado para estender o Blade é `Blade::directive` (e
  `Blade::if` para condicionais). Ao escrever código novo em 5.5, use
  `Blade::directive` / `Blade::if`.
* **`Blade::component` (alias helper)**: **não existe no 5.5** — introduzido no
  5.6. No 5.5, components são referenciados por `@component('caminho.view')`.

---

## Armadilhas Comuns (Pitfalls)

1. **Esquecer o `@end*`:** Toda diretiva de abertura (`@if`, `@foreach`,
   `@section`, `@component`, `@slot`, `@push`, `@php`, `@auth`, `@can`, etc.)
   precisa de seu fechamento correspondente. O Blade lançará erro de compilação
   (ou gerará PHP inválido) se faltar um fechamento.
2. **XSS com `{!! !!}`**: Nunca exiba dados de usuários com `{!! !!}`. Use
   `{{ }}` (escapado). O triplo `{{{ }}}` não existe mais no 5.5.
3. **Lógica de negócio na view**: `@php`, `@inject` e expressões complexas em
   `{{ }}` degradam a manutenção. Mova lógica para controllers/services e use
   View Composers para dados de apresentação.
4. **`__DIR__` / `__FILE__` em views**: apontam para o arquivo compilado em
   cache, não à origem.
5. **`@each` não herda variáveis da pai**: use `@foreach` + `@include` se o
   partial precisar de variáveis do contexto pai.
6. **Cache de diretivas**: após mexer em `Blade::directive`/`Blade::if`, rode
   `php artisan view:clear`.
7. **`@parent` ausente**: ao estender layouts com `@section`, esquecer
   `@parent` sobrescreve (e perde) o conteúdo do layout mestre.
8. **`@show` vs `@endsection`**: `@show` renderiza a seção no ponto;
   `@endsection` apenas a define.

---

## Notas Específicas do Laravel 5.5.50

* **Recursos NOVOS no 5.5** documentados aqui: `@component`/`@slot` (Components
  & Slots), `@includeFirst`, `Blade::if` (Custom If Statements), `@auth`/`@guest`
  como atalhos, diretiva `@csrf`.
* **Recursos que NÃO estão no 5.5** (evite usá-los se mira 5.5.50):
  * `@canany` (veio no 5.6).
  * `@prepend` para stacks (veio no 5.6).
  * `Blade::component()` alias helper (veio no 5.6).
  * Componentes baseados em classes (sistema novo de Blade Components, 5.6+ /
    maduro em 7.x+).
  * Chaves triplas `{{{ }}}` (removidas antes do 5.5).
* O motor de views do 5.5 compila para PHP puro e cacheia; recompila apenas
  quando o arquivo fonte muda.

---

## Resumo de Pontos-Chave

* Blade compila para PHP puro e faz cache — overhead ~zero; arquivos em
  `resources/views/*.blade.php`.
* Herança: `@extends`, `@section`/`@yield`, `@parent`, `@show` (define+renderiza)
  vs `@endsection` (define), `@hasSection ... @endif`.
* Components/Slots (5.5): `@component('view', [$data])`, `$slot`, `@slot('nome')`
  / `@endslot`. Sem alias helper no 5.5.
* Exibição: `{{ }}` escapa (anti-XSS); `{!! !!}` não escapa (perigoso);
  `@json` para JS; `@verbatim` e `@{{ }}` para frameworks JS.
* Controle: `@if/@elseif/@else/@endif`, `@unless`, `@isset/@empty`,
  `@auth/@guest` (+ guard), `@switch/@case/@break/@default/@endswitch`,
  `@hasSection`, `@php`, comentários `{{-- --}}`.
* Autorização: `@can/@cannot` com `@elsecan/@elsecannot` (e `@can('ability',
  Model::class)`); `@canany` **não** existe no 5.5.
* Loops: `@for`, `@foreach`, `@forelse/@empty`, `@while`, `@continue`/`@break`
  (com ou sem condição); variável `$loop` (`index`, `iteration`, `remaining`,
  `count`, `first`, `last`, `even`, `odd`, `depth`, `parent`).
* Includes: `@include`, `@includeIf`, `@includeWhen`, `@includeFirst` (5.5);
  `@each` (não herda variáveis da pai).
* Stacks: `@push`/`@stack` (sem `@prepend` no 5.5).
* CSRF: `@csrf` (5.5) e `{{ csrf_field() }}`.
* Service injection: `@inject('var', 'Class')` — use com cautela.
* Extensão: `Blade::directive('nome', fn($expr))` e `Blade::if('nome', fn())`
  (5.5); sempre `php artisan view:clear` após mudar diretivas.

---

## Referências

* `laravel5.5/blade.md` — Blade Templates (fonte primária: template inheritance,
  components & slots, displaying data, control structures, loops, `$loop`,
  comments, `@php`, includes, `@each`, stacks, service injection, extending
  blade, custom if statements).
* `laravel5.5/views.md` — Views (criação, passagem de dados, `View::share`,
  View Composers / Creators).
* `laravel5.5/csrf.md` — CSRF Protection (`csrf_field()`, `VerifyCsrfToken`,
  meta tag `csrf-token`).
* `laravel5.5/authorization.md` — Authorization via Blade (`@can`/`@cannot`,
  `@elsecan`/`@elsecannot`, ações com/sem modelo).
* `laravel5.5/releases.md` — Notas de versão 5.5 (Blade Improvements:
  `Blade::if`, `@auth`/`@guest`, etc.).
