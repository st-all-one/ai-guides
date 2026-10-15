{{-- resources/views/components/alert.blade.php — componente ANÔNIMO (Laravel 12) --}}
{{-- `@props` declara as props; as demais são acessíveis via $attributes. --}}
@props([
    'type' => 'info',
    'message' => null,
])

@php
    $classes = [
        'p-4', 'rounded', 'border',
        'bg-green-100 border-green-300 text-green-800' => $type === 'success',
        'bg-red-100 border-red-300 text-red-800'       => $type === 'error',
        'bg-yellow-100 border-yellow-300 text-yellow-800' => $type === 'warning',
        'bg-blue-100 border-blue-300 text-blue-800'    => $type === 'info',
    ];
@endphp

<div {{ $attributes->class($classes) }}>
    {{ $message ?? $slot }}
</div>
