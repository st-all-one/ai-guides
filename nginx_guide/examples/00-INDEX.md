00-INDEX.md
============

  Exemplos práticos de configuração NGINX para cenários reais.

  Cenários disponíveis:

  php72-laravel55.md
        PHP 7.2 + Laravel 5.5 via FastCGI — front controller,
        cache de conteúdo público, PHP-FPM pool tuning, OPcache,
        segurança (roteiro crítico), filas e rate limiting.

  static-spa-http3.md
        Aplicação SPA (React/Vue/Angular) servida estaticamente
        com HTTP/3 (QUIC), Brotli, cache hash-based, SPA
        fallback e security headers modernos.

  wordpress-php74.md
        WordPress + PHP 7.4 + FastCGI Cache — cache de página
        inteira, purga automática via cookie bypass e isolamento
        por `location`.

  api-gateway.md
        API Gateway com rate limiting por IP, upstream load
        balancing, cache de respostas 200/301/302, CORS e
        roteamento baseado em URI prefix.

  rust-htmx-askama.md
        Rust (Axum) + htmx + Askama com HTTP/3 — proxy
        reverso para backend Rust, assets estáticos servidos
        diretamente, cache inteligente de fragmentos htmx,
        e roteamento separado para API e health check.

  php72-laravel55-http2.md
        PHP 7.2 + Laravel 5.5 via FastCGI (sem HTTP/3) —
        TCP Fast Open, TLS 1.3 Early Data, OCSP Stapling,
        sessão SSL agressiva, HTTP/2 tuning, Early Hints
        (103), keepalive estendido. Performance máxima no
        limite do HTTP/2.
