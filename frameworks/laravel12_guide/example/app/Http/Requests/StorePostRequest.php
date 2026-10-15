<?php

namespace App\Http\Requests;

use App\Models\Post;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Form Request: validação e autorização isoladas do controller.
 * O Laravel executa authorize() e rules() ANTES do método do controller;
 * um resultado falso em authorize() devolve 403; falha de validação devolve 302 (web)
 * ou 422 JSON (XHR).
 */
class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Exemplo de autorização via Policy (auto-descoberta em app/Policies).
        return $this->user()?->can('create', Post::class) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:255'],
            'slug'         => ['required', 'string', 'max:255', Rule::unique('posts', 'slug')],
            'body'         => ['required', 'string', 'min:10'],
            'is_featured'  => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug')) {
            $this->merge(['slug' => Str::slug((string) $this->input('title'))]);
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'Informe um título.',
            'slug.unique'    => 'Este slug já está em uso.',
            'body.required'  => 'Escreva o corpo do post.',
            'body.min'       => 'O corpo deve ter pelo menos :min caracteres.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'body'         => 'corpo do post',
            'published_at' => 'data de publicação',
        ];
    }
}
