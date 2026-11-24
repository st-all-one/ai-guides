<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class AssignRequestContext
{
    /**
     * Correlaciona request → log → erro → job. Em Octane, SEMPRE redefinir por
     * request: o Context sobrevive entre requests no mesmo worker.
     */
    public function handle(Request $request, Closure $next): Response
    {
        Context::add([
            'request_id' => $request->header('X-Request-Id', (string) Str::uuid()),
            'tenant_id' => $request->user()?->tenant_id,
            'route' => $request->route()?->getName(),
        ]);

        Context::hidden(['password', 'token', 'authorization']);

        return $next($request);
    }
}
