<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Model Eloquent (Laravel 12). Demonstra:
 *  - mass assignment seguro ($fillable)
 *  - casts() (PHP 8: método em vez de propriedade $casts)
 *  - accessor via Attribute::make
 *  - local scope com o atributo #[Scope] (novo no 12)
 *  - SoftDeletes
 */
class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'body',
        'is_featured',
        'published_at',
    ];

    protected $hidden = ['deleted_at'];

    protected $appends = ['excerpt'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_featured'  => 'boolean',
            'published_at' => 'datetime',
            'deleted_at'   => 'datetime',
        ];
    }

    /** Accessor: excerpt derivado de body (não existe coluna no banco). */
    protected function excerpt(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): string => Str::limit(
                strip_tags($attributes['body'] ?? ''),
                160
            ),
        )->shouldCache();
    }

    /** Mutator: normaliza o slug ao definir. */
    protected function slug(): Attribute
    {
        return Attribute::make(
            set: fn (string $value): string => Str::slug($value),
        );
    }

    /** Local scope: #[Scope] substitui o antigo `scopePublished`. */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    #[Scope]
    protected function featured(Builder $query): void
    {
        $query->where('is_featured', true);
    }
}
