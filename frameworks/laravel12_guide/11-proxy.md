# Proxy (Load Balancer / Cloudflare / Nginx) no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. `TrustProxies` embutido no framework, configurado em
> `bootstrap/app.php`. `TrustHosts`, IP real e HTTPS atrás de proxy.

Quando a aplicação roda atrás de um load balancer/Cloudflare/Nginx, a conexão chega do proxy
(HTTP na porta 80). Sem configuração, o Laravel gera links `http://` e enxerga o IP do proxy em
vez do cliente. O middleware **`Illuminate\Http\Middleware\TrustProxies`** (parte do stack global
padrão) resolve isso honrando os headers `X-Forwarded-*` apenas de proxies confiáveis.

---

## 1. TrustProxies

Configuração em `bootstrap/app.php`:

```php
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustProxies(at: [
        '192.168.1.1',
        '10.0.0.0/8',
    ]);
})
```

- `at:` aceita lista de IPs e CIDR. **Nunca** use `*` a menos que os proxies sejam de um provedor
  cloud em que você não controla os IPs (ex.: AWS ELB) — e mesmo assim avalie o risco.
- Configure os headers confiados:

```php
$middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR |
    Request::HEADER_X_FORWARDED_HOST |
    Request::HEADER_X_FORWARDED_PORT |
    Request::HEADER_X_FORWARDED_PROTO |
    Request::HEADER_X_FORWARDED_AWS_ELB
);
```

Constantes úteis:

| Constante | Uso |
|---|---|
| `Request::HEADER_X_FORWARDED_FOR` | IP do cliente (`X-Forwarded-For`) |
| `Request::HEADER_X_FORWARDED_HOST` | host original |
| `Request::HEADER_X_FORWARDED_PORT` | porta original |
| `Request::HEADER_X_FORWARDED_PROTO` | protocolo (http/https) |
| `Request::HEADER_X_FORWARDED_AWS_ELB` | conjunto usado por AWS ELB |
| `Request::HEADER_FORWARDED` | header padrão `Forwarded` (RFC 7239) |

Valores prontos: `Request::HEADER_X_FORWARDED_ALL` confia em todos os `X-Forwarded-*`.

### 1.1 Confiar em todos (com cautela)

```php
use Illuminate\Http\Request;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustProxies(at: '*');
})
```

### 1.2 Config dinâmica via config/env

```php
// config/app.php (ou config/trustedproxy.php se usar o pacote externo)
'trusted_proxies' => explode(',', env('TRUSTED_PROXIES', '')),

// bootstrap/app.php
$middleware->trustProxies(at: fn () => config('app.trusted_proxies'));
```

```ini
TRUSTED_PROXIES=10.0.0.0/8,192.168.1.1
```

> `trustProxies(at: ...)` aceita closure, permitindo ler config/DB no momento do boot.

### 1.3 Efeitos

Com os proxies confiáveis configurados corretamente:

```php
$request->ip();          // IP real do cliente
$request->ips();         // cadeia de IPs
$request->isSecure();    // true se o proxy terminou TLS
$request->getScheme();   // 'https'
$request->url();         // esquema/host corretos
url('/x'); asset('img.png'); secure_url(); // HTTPS quando aplicável
```

Sem essa configuração, você verá `http://` em links, redirecionamentos incorretos de HTTPS e
`$request->ip()` devolvendo o IP do balanceador (quebrando rate limiting e logs).

### 1.4 Alternativa: forçar HTTPS por conta própria

Se preferir não confiar em headers, force o esquema em um middleware/provider:

```php
use Illuminate\Support\Facades\URL;

public function boot(): void
{
    if ($this->app->environment('production')) {
        URL::forceScheme('https');
    }
}
```

Isso resolve links, mas **não** corrige `$request->ip()` — para isso, `TrustProxies` continua
necessário. Prefira `TrustProxies` (mais correto) e use `forceScheme` só como complemento.

---

## 2. TrustHosts

Por padrão o Laravel responde a qualquer `Host`. Para restringir hostnames (proteção contra
Host header injection e absolutos incorretos), ative `TrustHosts`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustHosts(at: ['^example\.com$']);          // regex
    $middleware->trustHosts(at: ['^example\.com$'], subdomains: false);
})
```

- Subdomínios da URL da aplicação são confiados por padrão; desligue com `subdomains: false`.
- Pode receber closure para ler config/DB:

```php
$middleware->trustHosts(at: fn () => config('app.trusted_hosts'));
```

```php
// config/app.php
'trusted_hosts' => array_map(
    fn ($h) => '^'.preg_quote(trim($h), '/').'$',
    explode(',', env('TRUSTED_HOSTS', 'localhost'))
),
```

```ini
TRUSTED_HOSTS=example.com,www.example.com
```

> Normalmente o servidor web (Nginx/Apache) já filtra o `Host`; use `TrustHosts` quando não puder
> configurar o servidor diretamente.

---

## 3. Notas por ambiente

### Nginx

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    fastcgi_param HTTP_X_FORWARDED_PROTO $scheme;   # se necessário
    include fastcgi_params;
}
```

Se o Nginx é o terminador TLS e fala com o PHP-FPM local, normalmente **não** é preciso configurar
`TrustProxies` (não há proxy HTTP intermediário). Configure-o quando houver LB/Cloudflare na frente.

### Cloudflare / CDN

- Confie nos ranges de IP publicados pelo provedor (ou use `*` consciente do risco).
- Habilite `HEADER_X_FORWARDED_PROTO` para detectar HTTPS.

### Octane / FrankenPHP

- `TrustProxies` continua valendo; garanta headers corretos no servidor.
- Com Octane, use bindings `scoped` para evitar estado residual (ver `05-performance.md`).

### AWS ELB

```php
$middleware->trustProxies(at: '*', headers: Request::HEADER_X_FORWARDED_AWS_ELB);
```

---

## 4. Interação com `config:cache`

- Se você lê proxies de `config()`, o valor fica congelado no `config:cache` — re-execute o cache
  após mudar `TRUSTED_PROXIES`.
- Passar uma **closure** para `trustProxies`/`trustHosts` é avaliado no boot; ainda assim, evite
  depender de `env()` no runtime (use `config()` dentro da closure).

---

## Resumo de Pontos-Chave

- **`TrustProxies`** vem no stack global e é configurado em `bootstrap/app.php`
  (`trustProxies(at:, headers:)`).
- Liste IPs/CIDR confiáveis; **evite `*`** salvo quando inevitável (ELB/Cloudflare).
- Constantes `HEADER_X_FORWARDED_*` e `HEADER_FORWARDED` (RFC 7239) / `HEADER_X_FORWARDED_AWS_ELB`.
- Sem config, links ficam `http://` e `$request->ip()` mostra o proxy.
- `URL::forceScheme('https')` corrige links, mas **não** o IP — use com `TrustProxies`.
- **`TrustHosts`** restringe hostnames (`trustHosts(at:, subdomains:)`) contra Host header injection.
- Após mudar variáveis confiadas, rode `config:cache` de novo.
- Ambientes: Nginx local geralmente não precisa; LB/Cloudflare/ELB sim.
