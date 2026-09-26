<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// Form Request: validação (e autorização) isoladas do controller (boa-prática 5.5).
// Em uma rota ele é resolvido ANTES do controller; se falhar, redireciona c/ erros.
class StorePostRequest extends FormRequest
{
    // Autorização: só usuários logados podem criar.
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    // Regras de validação (5.5). Note: @csrf é 5.6+; no 5.5 o form usa {{ csrf_field() }}.
    public function rules(): array
    {
        return [
            'title'        => 'required|string|max:255',
            'slug'         => 'required|string|unique:posts,slug',
            'body'         => 'required|string|min:10',
            'published_at' => 'nullable|date',
        ];
    }

    // Mensagens personalizadas (opcional).
    public function messages(): array
    {
        return [
            'title.required' => 'O título é obrigatório.',
            'slug.unique'    => 'Este slug já está em uso.',
        ];
    }
}
