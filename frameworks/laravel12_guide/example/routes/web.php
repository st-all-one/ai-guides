<?php

// routes/web.php — Rotas web (12.x). O grupo de middleware 'web' é aplicado automaticamente
// (sessão, CSRF, cookies, substitute bindings). NÃO existe mais app/Http/Kernel.php.

use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

// --- Rotas de view/redirect (cacheáveis com route:cache) ---
Route::view('/sobre', 'about')->name('about');
Route::redirect('/antigo', '/', 301);

// --- Controllers (sintaxe [Classe::class, 'metodo']) ---
Route::get('/', [PageController::class, 'home'])->name('home');
Route::get('/posts', [PageController::class, 'index'])->name('posts.index');
Route::get('/posts/{post:slug}', [PageController::class, 'post'])->name('posts.show');

// --- Grupo autenticado ---
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [PageController::class, 'dashboard'])->name('dashboard');

    // IMPORTANTE: rota aponta para CONTROLLER (não closure) para ser compatível com
    // `php artisan route:cache` (closures não são serializáveis no cache de rotas).
    // O Form Request valida+autoriza ANTES do controller; use @csrf no formulário Blade.
    Route::post('/posts', [PageController::class, 'store'])->name('posts.store');
});
