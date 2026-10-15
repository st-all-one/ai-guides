{{-- resources/views/dashboard.blade.php — área autenticada --}}
<x-layouts.app title="Dashboard">
    <h1>Dashboard</h1>
    <p>Olá, {{ $user->name }}.</p>

    <ul>
        <li>Total de posts: {{ $stats['total'] }}</li>
        <li>Em destaque: {{ $stats['featured'] }}</li>
        <li>Palavras (somadas): {{ number_format($stats['words'], 0, ',', '.') }}</li>
    </ul>
</x-layouts.app>
