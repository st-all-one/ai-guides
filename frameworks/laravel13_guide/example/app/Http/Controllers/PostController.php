<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Routing\Attributes\Controllers\Authorize;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use Illuminate\Http\Resources\Json\JsonApiResource;

#[Middleware('auth')]
final class PostController
{
    #[Middleware('subscribed')]
    #[Authorize('view', Post::class)]
    public function show(Request $request, Post $post): JsonApiResource
    {
        // Eager loading é explícito: includes pedidos pelo cliente não disparam N+1.
        $post->load(['author:id,name']);

        return $post->toResource()
            ->includePreviouslyLoadedRelationships();
    }
}
