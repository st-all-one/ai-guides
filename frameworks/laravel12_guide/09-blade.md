# Blade no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Templates, diretivas, components, layouts, forms,
> stacks, injeção, fragments e extensão.

Views ficam em `resources/views` (`*.blade.php`). São compiladas para PHP e cacheadas — custo
quase zero. Retorne com `view('nome', $dados)`.

---

## 1. Exibição de dados

```blade
Hello, {{ $name }}.                 {{-- escapado (htmlspecialchars) — use SEMPRE --}}

The timestamp is {{ time() }}.
Hello, {!! $rawHtml !!}.            {{-- NÃO escapado — só com HTML confiável! --}}

{{-- JSON seguro para JS --}}
<script>var app = {{ Js::from($array) }};</script>

{{-- escapar delimitadores do Blade (JS frameworks) --}}
Hello, @{{ name }}.

@verbatim
    <div>Hello, {{ name }}.</div>
@endverbatim
```

- `Blade::withoutDoubleEncoding()` no `AppServiceProvider::boot()` desativa dupla codificação.
- `e($value)` helper para escapar fora do Blade.

---

## 2. Diretivas

### 2.1 Condicionais

```blade
@if (count($records) === 1)
    Um registro.
@elseif (count($records) > 1)
    Vários.
@else
    Nenhum.
@endif

@unless (Auth::check()) ... @endunless
@isset($records) ... @endisset
@empty($records) ... @endempty

@switch($i)
    @case(1) ... @break
    @case(2) ... @break
    @default ... 
@endswitch

{{-- autenticação --}}
@auth ... @endauth
@auth('admin') ... @endauth
@guest ... @endguest

{{-- ambiente --}}
@production ... @endproduction
@env('staging') ... @endenv
@env(['staging', 'production']) ... @endenv

{{-- seções --}}
@hasSection('navigation') ... @endif
@sectionMissing('navigation') ... @endif
@hasSection ... 
```

### 2.2 Loop

```blade
@for ($i = 0; $i < 10; $i++) {{ $i }} @endfor
@foreach ($users as $user) <p>{{ $user->id }}</p> @endforeach
@forelse ($users as $user) <li>{{ $user->name }}</li> @empty <p>Nenhum</p> @endforelse
@while (true) ... @endwhile
@continue / @break
@continue($user->type == 1) / @break($user->number == 5)
```

Variável `$loop`:

| Propriedade | Descrição |
|---|---|
| `$loop->index` | índice (0-based) |
| `$loop->iteration` | iteração (1-based) |
| `$loop->remaining` | restantes |
| `$loop->count` | total |
| `$loop->first` / `$loop->last` | primeira/última |
| `$loop->even` / `$loop->odd` | par/ímpar |
| `$loop->depth` | profundidade |
| `$loop->parent` | loop pai (aninhado) |

### 2.3 Classes/atributos condicionais

```blade
<span @class([
    'p-4',
    'font-bold' => $isActive,
    'text-gray-500' => ! $isActive,
    'bg-red' => $hasError,
])></span>

<span @style([
    'background-color: red',
    'font-weight: bold' => $isActive,
])></span>

<input type="checkbox" @checked(old('active', $user->active)) />
<option value="{{ $v }}" @selected(old('version') == $v)>{{ $v }}</option>
<button type="submit" @disabled($errors->isNotEmpty())>Enviar</button>
<input type="email" @readonly($user->isNotAdmin()) />
<input type="text" @required($user->isAdmin()) />
```

### 2.4 Includes e cada

```blade
@include('shared.errors')
@include('view.name', ['status' => 'complete'])
@includeIf('view.name')
@includeWhen($bool, 'view.name', [...])
@includeUnless($bool, 'view.name', [...])
@includeFirst(['custom.admin', 'admin'], [...])
@includeIsolated('view.name', ['user' => $user])   {{-- sem herdar variáveis do pai --}}
@each('view.name', $jobs, 'job')
@each('view.name', $jobs, 'job', 'view.empty')
```

> Evite `__DIR__`/`__FILE__` em Blade (apontam para a view compilada).

### 2.5 Once / stacks

```blade
@once ... @endonce
@push('scripts') <script>...</script> @endpush
@prepend('scripts') ... @endprepend
@pushOnce('scripts') ... @endPushOnce
@pushOnce('scripts', 'chart.js') ... @endPushOnce   {{-- id único --}}
@prependOnce('scripts') ... @endPrependOnce

@stack('scripts')   {{-- no layout --}}
```

### 2.6 PHP bruto, imports e comentários

```blade
@php
    $counter = 1;
@endphp

@use('App\Models\Flight')
@use('App\Models\Flight', 'FlightModel')
@use('App\Models\{Flight, Airport}')
@use(function App\Helpers\format_currency)
@use(const App\Constants\MAX_ATTEMPTS)

{{-- comentário Blade (não vai para o HTML) --}}
```

### 2.7 Sessão, contexto, injeção e autorização

```blade
@session('status') <div>{{ $value }}</div> @endsession
@context('canonical') <link href="{{ $value }}" rel="canonical"> @endcontext

@inject('metrics', 'App\Services\MetricsService')
<div>Requisições: {{ $metrics->monthly() }}</div>

@can('update', $post) ... @endcan
@cannot('update', $post) ... @endcannot
@canany(['update', 'delete'], $post) ... @endcanany

@error('title') {{ $message }} @enderror
@error('email') ... @enderror
```

---

## 3. Components

### 3.1 Class-based

```bash
php artisan make:component Alert
php artisan make:component Forms/Input
```

```php
namespace App\View\Components;

use Illuminate\View\Component;
use Illuminate\View\View;

class Alert extends Component
{
    protected $except = ['type'];   // não expõe ao template

    public function __construct(
        public string $type,
        public string $message,
    ) {}

    public function render(): View
    {
        return view('components.alert');
    }

    public function isSelected(string $option): bool { return $option === $this->selected; }
    public function shouldRender(): bool { return trim($this->message) !== ''; }
}
```

```blade
<x-alert type="error" :message="$message" class="mt-4" />
<x-inputs.button />                 {{-- subdiretório --}}
<x-card>...<x-card.header>...</x-card.header></x-card>  {{-- index component --}}
```

- Atributos `kebab-case` mapeiam para propriedades `camelCase` (`alert-type` → `$alertType`).
- `:$userId` = atalho de `:user-id="$userId"`.
- `::class` escapa para frameworks JS.

### 3.2 Attributes e slots

```blade
{{-- componente usa $attributes (bag) --}}
<div {{ $attributes->merge(['class' => 'alert alert-'.$type]) }}>
    {{ $message }}          {{-- $slot --}}
</div>

<div {{ $attributes->class(['p-4', 'bg-red' => $hasError]) }}>...</div>
<div @class([...])></div>
```

```blade
<x-card class="mb-4" :$title>
    <x-slot:heading>Heading</x-slot:heading>
    Conteúdo
</x-card>
```

Métodos da attribute bag: `merge`, `class`, `except`, `only`, `filter`, `first`, `has`, `missing`,
`get`, `prepends`, `macros`.

### 3.3 Componentes anônimos

Arquivo em `resources/views/components/alert.blade.php` (sem classe PHP):

```blade
@props(['type' => 'info', 'message'])

<div {{ $attributes->merge(['class' => "alert alert-{$type}"]) }}>
    {{ $message ?? $slot }}
</div>
```

```blade
<x-alert type="error" message="Falhou" />
```

- `@aware(['color' => 'gray'])` acessa dados de um componente pai.
- Caminhos extras: `Blade::anonymousComponentPath(__DIR__.'/../views/components')`
  e `Blade::anonymousComponentPath($path, 'dashboard')` (namespace).
- Convenção: subdiretório `components/forms/input.blade.php` → `<x-forms.input>`.

### 3.4 Componentes dinâmicos e registro manual

```blade
<x-dynamic-component :component="$componentName" class="mt-4" />
```

```php
// pacote
Blade::component('package-alert', Alert::class);
Blade::componentNamespace('Nightshade\\Views\\Components', 'nightshade');
```

```blade
<x-nightshade::calendar />
```

---

## 4. Layouts

### 4.1 Via components (recomendado)

```blade
{{-- resources/views/components/layouts/app.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? config('app.name') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    {{ $slot }}
</body>
</html>
```

```blade
<x-layouts.app :title="$post->title">
    <h1>{{ $post->title }}</h1>
</x-layouts.app>
```

### 4.2 Via herança (legado)

```blade
{{-- layouts/app.blade.php --}}
<html><body>@yield('content')</body></html>

{{-- filha --}}
@extends('layouts.app')
@section('content') ... @endsection
@yield('content')
@parent
@endsection
```

---

## 5. Forms

```blade
<form method="POST" action="/profile">
    @csrf
    @method('PUT')

    <input type="text" name="title" value="{{ old('title', $post->title) }}" />
    @error('title') <p class="error">{{ $message }}</p> @enderror

    @if ($errors->any())
        <ul>@foreach ($errors->all() as $e) <li>{{ $e }}</li> @endforeach</ul>
    @endif

    <button type="submit" @disabled($errors->isNotEmpty())>Salvar</button>
</form>
```

- `old('campo', $default)` repopula após erro de validação.
- `$errors` é um `ViewErrorBag` compartilhado pelo middleware `ShareErrorsFromSession`.

---

## 6. Service injection

```blade
@inject('metrics', 'App\Services\MetricsService')
<div>Requisições: {{ $metrics->monthly() }}</div>
```

---

## 7. Views, composers e shared data

```php
// texto simples
Route::get('/', fn () => view('greeting', ['name' => 'Finn']));
return view('posts.show')->with('post', $post);
return view('posts.show', compact('post'));

// composers
use Illuminate\Support\Facades\View;
View::composer('layouts.app', fn ($view) => $v->with('site', config('site.name')));
View::composer('dashboard.*', fn ($view) => ...);
View::composer(ProfileComposer::class);
View::creator('profile', ProfileCreator::class);

// compartilhar globalmente
View::share('key', 'value');

// exists
View::exists('emails.customer');
```

---

## 8. Blade fragments (12)

Renderize apenas um pedaço nomeado de uma view (útil para HTMX parcial):

```blade
{{-- resources/views/profile.blade.php --}}
@fragment('user-list')
    <ul>@foreach ($users as $user) <li>{{ $user->name }}</li> @endforeach</ul>
@endfragment
```

```php
return view('profile', ['users' => $users])->fragment('user-list');
```

---

## 9. Estendendo o Blade

```php
use Illuminate\Support\Facades\Blade;

// diretiva custom
Blade::directive('datetime', function (string $expression) {
    return "<?php echo ($expression)->format('m/d/Y H:i'); ?>";
});
// @datetime($var)

// if custom
Blade::if('prod', fn () => app()->environment('production'));
// @prod ... @endprod

// stringable
Blade::stringable(StringableClass::class, fn ($obj) => $obj->toDisplayString());

// sem double encoding
Blade::withoutDoubleEncoding();
```

---

## Resumo de Pontos-Chave

- `{{ }}` **sempre** escapa; `{!! !!}` só com HTML confiável. Use `Js::from()` para JS.
- Diretivas de conveniência: `@class`, `@style`, `@checked`, `@selected`, `@disabled`,
  `@readonly`, `@required`.
- Components (classe ou anônimos) são preferíveis a `@include`; use `@props`, `$attributes` e slots.
- Layouts via `<x-layouts.app>` com `{{ $slot }}`.
- Forms com `@csrf`, `@method`, `old()` e `@error`.
- `@once`/`@pushOnce` + `@stack` para injetar assets 1x.
- `@can`/`@error`/`@inject`/`@context`/`@session` integram Blade ao framework.
- Fragments (`@fragment` + `->fragment()`) retornam parciais para HTMX/AJAX.
- Estenda com `Blade::directive`/`Blade::if`/`Blade::stringable`.
