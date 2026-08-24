<?php

namespace App\Http\Middleware;

use Fideloper\Proxy\TrustProxies as Middleware;
use Illuminate\Http\Request;

// TrustProxies EMBUTIDO no Laravel 5.5 (pacote fideloper/proxy passou a shipar por padrão).
// Necessário quando a app roda atrás de Load Balancer / proxy reverso (ELB, Cloudflare, Nginx),
// para que $request->ip() e a detecção de HTTPS fiquem corretos.
//
// Registre este middleware em app/Http/Kernel.php ($middleware, antes de tudo).
class TrustProxies extends Middleware
{
    // IPs/CIDRs dos proxies confiáveis. Em produção, NUNCA use '*' exposto publicamente.
    protected $proxies = [
        // '192.168.1.1',
        // '10.0.0.0/8',
    ];

    // Quais headers o proxy encaminha (constantes do Symfony Request, disponíveis no 5.5).
    protected $headers = Request::HEADER_X_FORWARDED_ALL;
}
