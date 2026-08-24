<?php

// routes/web.php — Rotas web (5.5). Middleware 'web' é aplicado automaticamente.

use App\Http\Controllers\PageController;
use App\Http\Requests\StorePostRequest;
use App\Models\Post;
use Illuminate\Support\Facades\Route;

// --- Recursos NOVOS do 5.5: Route::view e Route::redirect ---
Route::view('/sobre', 'about')->name('about');                 // view estática
Route::redirect('/antigo', '/', 301);                          // redirect 301

// --- Controllers (sintaxe de array [Classe::class, 'metodo']) ---
Route::get('/posts', [PageController::class, 'index'])->name('posts.index');
Route::get('/posts/{post}', [PageController::class, 'post'])->name('posts.show');
Route::get('/', [PageController::class, 'home'])->name('home');

// --- Grupo com middleware 'auth' ---
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [PageController::class, 'dashboard'])->name('dashboard');

    // O Form Request (StorePostRequest) faz a validação+autorização ANTES do controller.
    // Em 5.5 use {{ csrf_field() }} no formulário (NÃO @csrf, que é 5.6+).
    // IMPORTANTE: rota aponta para CONTROLLER (não closure) para ser compatível com
    // `php artisan route:cache` (closures não são serializáveis no cache de rotas).
    Route::post('/posts', [PageController::class, 'store'])->name('posts.store');
});
