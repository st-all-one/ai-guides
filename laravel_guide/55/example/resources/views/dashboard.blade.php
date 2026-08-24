@extends('layouts.app')

@section('title', ' · Painel')

@section('content')
    <h1>Painel de {{ $user->name }}</h1>

    <ul>
        <li>Total de posts: {{ $stats['total'] }}</li>
        <li>Destacados: {{ $stats['featured'] }}</li>
        <li>Total de palavras: {{ $stats['words'] }}</li>
    </ul>
@endsection
