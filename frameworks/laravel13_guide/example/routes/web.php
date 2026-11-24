<?php

use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');

Route::post('/webhooks/stripe', function () {
    // Fora do grupo web: sem PreventRequestForgery. Valide assinatura do provider.
    return response()->noContent();
});
