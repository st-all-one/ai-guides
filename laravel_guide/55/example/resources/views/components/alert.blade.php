{{-- Componente Blade (5.5): @component / @slot --}}
{{-- Uso: @component('components.alert', ['type' => 'info', 'message' => 'Oi']) texto @endcomponent --}}
<div class="alert alert-{{ $type }}">
    {{ $message }}   {{-- escaping automático ({{ }} previne XSS) --}}
    {{ $slot }}      {{-- conteúdo do slot padrão --}}
</div>
