<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// Modelo Eloquent mínimo (5.5). Convenção: tabela "posts", primary key "id".
// Em 5.5 os models costumam ficar em App\ (sem subnamespace), mas App\Models\ é válido
// e explícito — basta tipar o FQCN no controller para o route model binding funcionar.
class Post extends Model
{
    use SoftDeletes;

    // Mass assignment: apenas estes campos podem ser setados via Post::create($array).
    protected $fillable = [
        'title', 'slug', 'body', 'published_at',
    ];

    // Casts (5.5): conversão automática ao ler/gravar.
    protected $casts = [
        'published_at' => 'datetime',   // Carbon
        'is_featured'  => 'bool',
    ];

    // Accessor (mutator de leitura).
    public function getExcerptAttribute(): string
    {
        return \Illuminate\Support\Str::limit(strip_tags($this->body), 160);
    }

    // Local scope: permite Post::published() (encadeável).
    // Assinatura tipada (PHP 7.1) — retorna Builder para continuar a query.
    public function scopePublished(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->whereNotNull('published_at')
                     ->where('published_at', '<=', now());
    }
}
