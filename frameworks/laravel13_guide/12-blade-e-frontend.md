# Blade e frontend — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Mudanças no 13: nomes das views de paginação
> Bootstrap 3 e `Js::from` com `JSON_UNESCAPED_UNICODE`.

---

## 1. Blade seguro por padrão

`{{ $value }}` escapa HTML; `{!! $value !!}` não escapa e só deve ser usado com HTML
já sanitizado. Para injetar dados em JavaScript, prefira `@json($data)` ou `Js::from()`
(`samples/doc-blade.md`). Nunca interpole input do usuário diretamente em `<script>`.

Diretivas úteis: `@csrf`, `@method`, `@error`, `@can`, `@canany`, `@class`, `@style`,
`@checked`, `@selected`, `@include`, `@extends`/`@section`, `@slot`, `@stack`/`@push`.
Components (classe e anônimos) mantêm UI consistente e testável; prefira-os a
`@include` com variáveis globais.

```blade
{{-- Escaping automático; nunca use {!! !!} com input do usuário --}}
<h1>{{ $post->title }}</h1>

@json($post->toArray())
<script>window.post = Js::from($post->toArray());</script>

@vite(['resources/css/app.css', 'resources/js/app.js'])
```

```php
// Blade seguro por padrão: componente com slot escapado
class Alert extends Component
{
    public function __construct(public string $type = 'info') {}

    public function render(): string
    {
        return <<<'BLADE'
        <div class="alert alert-{{ $type }}" role="alert">{{ $slot }}</div>
        BLADE;
    }
}
```

---

## 2. Mudanças no 13 que afetam templates

| Item | Antes | Agora | Ação | Fonte |
|---|---|---|---|---|
| Views de paginação Bootstrap 3 | `pagination::default`, `pagination::simple-default` | `pagination::bootstrap-3`, `pagination::simple-bootstrap-3` | atualizar referências diretas | `samples/doc-upgrade-13.md:470-490` |
| `Js::from` | Unicode escapado (`\u00e8`) | `JSON_UNESCAPED_UNICODE` por padrão | ajustar expectativas de teste/front | `samples/doc-upgrade-13.md:439-446` |

Quem usa `{{ $posts->links() }}` sem passar view nomeada não precisa mudar nada; o
problema aparece apenas em código que referencia os nomes internos diretamente.

---

## 3. Vite e assets

O skeleton traz `vite.config.js`, `resources/css/app.css`, `resources/js/app.js` e
`@vite` no template de boas-vindas (`laravel/laravel@13.x:resources/views/welcome.blade.php`).
Use `@vite(['resources/css/app.css', 'resources/js/app.js'])` no `<head>` e mantenha
`npm run build` no pipeline de deploy (o script `setup` já faz isso
`samples/samples-composer.json:34-44`).

Em produção, sirva os assets com hash do manifesto e cache longo; nunca habilite
HMR em ambiente público.

---

## 4. Renderização e performance

- **Evite lógica de negócio na view**: prepare dados no controller/Resource.
- **`@include` em loop** pode virar N+1 de view; prefira components com dados já carregados.
- **`@defer`/`@fragment`** são úteis para streaming em Livewire/Blade quando aplicável
  (`samples/doc-blade.md`) — use com moderação e meça o impacto.
- **Cache de views**: `view:cache` em deploy; invalide ao publicar alterações de Blade.

---

## 5. Acessibilidade e i18n

Use `__('...')` / `@lang` para textos, `lang` no `<html>`, labels associados a inputs e
`aria-*` quando necessário. O skeleton define `APP_LOCALE`, `APP_FALLBACK_LOCALE` e
`APP_FAKER_LOCALE` (`samples/samples-env.example:7-9`) — mantenha coerentes com o
conteúdo servido.

## Resumo de Pontos-Chave

- **`{{ }}` escapa; `{!! !!}` não** — sanitize antes de usar HTML cru.
- **`@json` / `Js::from`** são a forma segura de passar dados para JavaScript.
- **Views de paginação Bootstrap 3 foram renomeadas** no 13.
- **`Js::from` mantém Unicode legível** por padrão — ajuste testes.
- **`@vite` + build no deploy** são o caminho padrão do skeleton.
- **Sem lógica de negócio em Blade**; prepare dados no controller/Resource.
- **`view:cache` em produção** e invalidação no deploy.
