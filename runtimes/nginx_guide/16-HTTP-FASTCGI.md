# NGINX FastCGI — Guia Completo

## O que é FastCGI?

FastCGI é um protocolo binário para interfacear front-end (servidores web)
com back-end (aplicações). É uma evolução do CGI (Common Gateway Interface),
eliminando a criação de um novo processo para cada requisição: o back-end
mantém um pool persistente de processos workers que reusam conexões.

FastCGI **não é um protocolo de transporte** — ele opera sobre TCP ou
Unix-domain sockets. O NGINX atua como **cliente FastCGI**, roteando requisições
HTTP para aplicações que falam o protocolo.

### Aplicações típicas que usam FastCGI

| Aplicação | Escuta em | Como configurar no NGINX |
|-----------|-----------|--------------------------|
| **PHP-FPM** | `unix:/run/php/php8.x-fpm.sock` ou `127.0.0.1:9000` | `fastcgi_pass` + `fastcgi_param SCRIPT_FILENAME` |
| **HHVM** | `unix:/run/hhvm/hhvm.sock` | Mesmo padrão do PHP-FPM |
| **Python** (uWSGI | `127.0.0.1:9000` | uWSGI também suporta FastCGI |
| **Ruby** (Unicorn | `127.0.0.1:8080` | Rack-compatible via Rack::Handler::FastCGI |
| **Java** (Jetty | `127.0.0.1:9000` | Jetty FastCGI handler |
| **C/C++** (libfcgi | `127.0.0.1:9000` | Aplicações custom com `FCGI_*` API |

### FastCGI vs Proxy HTTP

| Característica | FastCGI | Proxy HTTP |
|----------------|---------|------------|
| Protocolo | FastCGI binário | HTTP/1.x, HTTP/2 |
| Overhead | Menor (binário compacto) | Maior (headers textuais) |
| Pool de conexões | nativo do protocolo (`FCGI_KEEP_CONN`) | `keepalive` + `proxy_http_version 1.1` |
| Parâmetros por requisição | `fastcgi_param` | Headers HTTP |
| Script name | `$fastcgi_script_name` | `$uri` |

> Use **FastCGI** quando precisar se comunicar com PHP-FPM ou outras
> aplicações que implementam o protocolo FastCGI nativamente.
> Use **Proxy HTTP** para comunicação com servidores HTTP comuns
> (Node, Python WSGI, Go, etc.).

---

## Arquitetura e Handshake FastCGI

O NGINX envia um **record** `FCGI_BEGIN_REQUEST` com o `FCGI_ROLE_RESPONDER`,
seguido de `FCGI_PARAMS` (pares chave-valor codificados — os parâmetros
definidos via `fastcgi_param`). Depois envia `FCGI_STDIN` com o corpo da
requisição (se houver), e finaliza com um `FCGI_STDIN` vazio (empty record).

O back-end responde com:
1. `FCGI_STDOUT` — conteúdo da resposta (pode ser fragmentado em múltiplos records)
2. `FCGI_STDERR` — mensagens de erro da aplicação (opcional)
3. `FCGI_END_REQUEST` — finaliza o ciclo com código de status do protocolo

### Parâmetros FastCGI padrão

| Parâmetro | NGINX default | Descrição |
|-----------|---------------|-----------|
| `SCRIPT_FILENAME` | definido manualmente | Caminho absoluto do script |
| `QUERY_STRING` | `$query_string` | String de query |
| `REQUEST_METHOD` | `$request_method` | GET/POST/etc |
| `CONTENT_TYPE` | `$content_type` | Content-Type do request |
| `CONTENT_LENGTH` | `$content_length` | Content-Length do request |
| `SCRIPT_NAME` | `$fastcgi_script_name` | Nome do script (URI) |
| `REQUEST_URI` | `$request_uri` | URI completa |
| `DOCUMENT_URI` | `$document_uri` | URI atual |
| `DOCUMENT_ROOT` | `$document_root` | Raiz do documento |
| `SERVER_PROTOCOL` | `$server_protocol` | HTTP/1.0, HTTP/1.1 |
| `GATEWAY_INTERFACE` | `CGI/1.1` | Versão da especificação |
| `SERVER_SOFTWARE` | `nginx/$version` | Nome do servidor |
| `REMOTE_ADDR` | `$remote_addr` | IP do cliente |
| `REMOTE_PORT` | `$remote_port` | Porta do cliente |
| `SERVER_ADDR` | `$server_addr` | IP do servidor |
| `SERVER_PORT` | `$server_port` | Porta do servidor |
| `SERVER_NAME` | `$server_name` | Nome do servidor |

> Use o arquivo de inclusão fornecido pela distribuição ou crie um
> (`/etc/nginx/fastcgi_params` ou `fastcgi.conf`) com todos os parâmetros
> padrão: `include fastcgi_params;`

---

## Configuração básica (PHP-FPM)

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example;

    location ~ \.php$ {
        fastcgi_pass    unix:/run/php/php8.2-fpm.sock;
        fastcgi_index   index.php;
        fastcgi_param   SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include         fastcgi_params;
    }
}
```

### Variações de `fastcgi_pass`

```nginx
# TCP socket
fastcgi_pass 127.0.0.1:9000;

# Unix socket
fastcgi_pass unix:/run/php/php8.2-fpm.sock;

# Nome DNS (resolvido a cada TTL, ou round-robin se múltiplos IPs)
fastcgi_pass php-upstream:9000;

# Upstream group
upstream php_backend {
    server unix:/run/php/php8.2-fpm.sock weight=3;
    server 127.0.0.1:9000 backup;
    keepalive 32;
}
fastcgi_pass php_backend;
```

> Quando o valor de `fastcgi_pass` contém variáveis, o NGINX primeiro
> procura por um upstream com aquele nome; se não achar, usa um resolver
> DNS (`resolver` directive).

---

## Referência completa de diretivas

### `fastcgi_pass`

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_pass address;` |
| Contexto | `location`, `if in location` |

Define o endereço do servidor FastCGI: `host:porta`,
`unix:/caminho/socket`, nome de upstream, ou variável.

### `fastcgi_param`

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_param parameter value [if_not_empty];` |
| Contexto | `http`, `server`, `location` |

Define um parâmetro enviado ao servidor FastCGI. Valores podem conter
variáveis. O modificador `if_not_empty` (1.1.11+): envia o parâmetro apenas
se o valor não for vazio.

```nginx
fastcgi_param HTTPS           $https if_not_empty;
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
```

Parâmetros não são herdados misturadamente — se você definir **qualquer**
`fastcgi_param` no nível atual, todos os parâmetros do nível anterior
são descartados. Para herdar, use `include fastcgi_params;`.

### `fastcgi_index`

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_index name;` |
| Contexto | `http`, `server`, `location` |

Define o nome do arquivo de índice que é anexado ao
`$fastcgi_script_name` quando a URI termina em `/`.

```nginx
fastcgi_index index.php;
# URI "/" → SCRIPT_FILENAME termina com "/index.php"
```

### `fastcgi_split_path_info`

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_split_path_info regex;` |
| Contexto | `location` |

Define uma regex com **dois grupos de captura**: o primeiro vira
`$fastcgi_script_name`, o segundo vira `$fastcgi_path_info`.

```nginx
location ~ ^(.+\.php)(.*)$ {
    fastcgi_split_path_info       ^(.+\.php)(.*)$;
    fastcgi_param SCRIPT_FILENAME /path/to/php$fastcgi_script_name;
    fastcgi_param PATH_INFO       $fastcgi_path_info;
}
# URI "/show.php/article/0001" →
#   SCRIPT_FILENAME = /path/to/php/show.php
#   PATH_INFO       = /article/0001
```

---

### Buffering e tamanhos

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_buffer_size` | `fastcgi_buffer_size size;` | 4k\|8k | Buffer da primeira parte da resposta (cabeçalho). Se exceder, resposta é considerada inválida. |
| `fastcgi_buffers` | `fastcgi_buffers number size;` | 8 4k\|8k | Número e tamanho dos buffers para ler resposta. |
| `fastcgi_busy_buffers_size` | `fastcgi_busy_buffers_size size;` | 8k\|16k | Tamanho máximo de buffers ocupados enviando ao cliente enquanto o resto ainda está sendo lido. Default = 2 × `buffer_size`. |
| `fastcgi_buffering` | `fastcgi_buffering on \| off;` | on | Habilita/desabilita buffering da resposta. Off: stream síncrono imediato ao cliente. |
| `fastcgi_max_temp_file_size` | `fastcgi_max_temp_file_size size;` | 1024m | Tamanho máximo do arquivo temporário para respostas que não cabem na memória. 0 = desabilita buffering em disco. |
| `fastcgi_temp_file_write_size` | `fastcgi_temp_file_write_size size;` | 8k\|16k | Tamanho dos dados escritos por vez no arquivo temporário. |
| `fastcgi_temp_path` | `fastcgi_temp_path path [level1 [level2 [level3]]];` | `fastcgi_temp` | Diretório para arquivos temporários (níveis de subdiretório 1-2-3). |
| `fastcgi_request_buffering` | `fastcgi_request_buffering on \| off;` | on | Bufferiza corpo da requisição antes de enviar ao backend. Off: envia imediatamente (impossível retentar `next_upstream`). |
| `fastcgi_limit_rate` | `fastcgi_limit_rate rate;` | 0 | Limita velocidade de leitura do backend (bytes/s). 0 = sem limite. Funciona só com `buffering on`. Aceita variáveis (1.27.0+). |

Comportamento do buffering:

```
on (default):
  NGINX → lê resposta completa do backend → buffers/arquivo temp → cliente

off:
  NGINX → lê do backend → cliente (stream síncrono, byte a byte)
```

O buffering também pode ser controlado pelo header de resposta
`X-Accel-Buffering: yes|no`. Desabilite via `fastcgi_ignore_headers`.

```nginx
# Stream otimizado para respostas grandes (download)
fastcgi_buffering off;

# PHP com respostas pequenas e muitos requests
fastcgi_buffering      on;
fastcgi_buffer_size    4k;
fastcgi_buffers        64 4k;
fastcgi_busy_buffers_size 8k;
```

---

### Timeouts

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_connect_timeout` | `fastcgi_connect_timeout time;` | 60s | Timeout de conexão TCP. Geralmente não excede 75s (kernel). |
| `fastcgi_read_timeout` | `fastcgi_read_timeout time;` | 60s | Timeout entre leituras sucessivas do backend. Se o backend não envia nada nesse período, conexão é fechada. |
| `fastcgi_send_timeout` | `fastcgi_send_timeout time;` | 60s | Timeout entre escritas sucessivas para o backend. |
| `fastcgi_socket_keepalive` | `fastcgi_socket_keepalive on \| off;` | off | Habilita `SO_KEEPALIVE` nas conexões TCP com o backend. |

```nginx
# PHP-FPM com scripts lentos
fastcgi_connect_timeout   5s;
fastcgi_read_timeout    300s;
fastcgi_send_timeout     60s;
```

> `fastcgi_read_timeout` e `fastcgi_send_timeout` são **entre operações**,
> não para o total da transferência. Uma resposta de 1GB com throughput
> constante de 1 byte/s não estoura timeout.

---

### Failover e next upstream

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_next_upstream` | `fastcgi_next_upstream error \| timeout \| invalid_header \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| non_idempotent \| off ...;` | `error timeout` | Quando tentar próximo servidor. |
| `fastcgi_next_upstream_timeout` | `fastcgi_next_upstream_timeout time;` | 0 | Tempo limite para tentar next upstream. 0 = ilimitado. |
| `fastcgi_next_upstream_tries` | `fastcgi_next_upstream_tries number;` | 0 | Número máximo de tentativas. 0 = ilimitado. |
| `fastcgi_ignore_client_abort` | `fastcgi_ignore_client_abort on \| off;` | off | Continua enviando requisição ao backend mesmo se cliente fechar conexão. |
| `fastcgi_intercept_errors` | `fastcgi_intercept_errors on \| off;` | off | Intercepta respostas >= 300 do backend e processa com `error_page` do NGINX. |
| `fastcgi_catch_stderr` | `fastcgi_catch_stderr string;` | — | Se a string for encontrada no stderr do backend, a resposta é considerada inválida (trata como `invalid_header` para `next_upstream`). |

```nginx
# Retry em erros 500/503 + POST também é retentado
fastcgi_next_upstream     error timeout http_500 http_503 non_idempotent;
fastcgi_next_upstream_tries 3;
fastcgi_next_upstream_timeout 10s;

# Detecta PHP Fatal Error e tenta outro servidor
fastcgi_catch_stderr "PHP Fatal error";

# Timeout de script PHP → erro 504 customizado
fastcgi_intercept_errors on;
error_page 504 /504.html;
```

> `fastcgi_next_upstream` só funciona se **nada foi enviado ao cliente**
> ainda. Se o erro ocorre no meio da resposta, não há como retentar.

---

### Headers e controle de resposta

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_hide_header` | `fastcgi_hide_header field;` | — | Oculta header da resposta do backend (além de `Status` e `X-Accel-*` que já são ocultos por default). |
| `fastcgi_pass_header` | `fastcgi_pass_header field;` | — | Permite passar headers que seriam ocultos (ex: `X-Accel-*`). |
| `fastcgi_ignore_headers` | `fastcgi_ignore_headers field ...;` | — | Ignora processamento especial dos headers: `X-Accel-Redirect`, `X-Accel-Expires`, `X-Accel-Limit-Rate`, `X-Accel-Buffering`, `X-Accel-Charset`, `Expires`, `Cache-Control`, `Set-Cookie`, `Vary`. |
| `fastcgi_force_ranges` | `fastcgi_force_ranges on \| off;` | off | Força suporte a byte-ranges mesmo sem `Accept-Ranges` no backend. |
| `fastcgi_pass_request_headers` | `fastcgi_pass_request_headers on \| off;` | on | Envia headers originais do cliente como parâmetros `HTTP_*`. |
| `fastcgi_pass_request_body` | `fastcgi_pass_request_body on \| off;` | on | Envia corpo original do cliente. |

Headers X-Accel processados automaticamente pelo NGINX (a menos que
incluídos em `fastcgi_ignore_headers`):

| Header | Efeito |
|--------|--------|
| `X-Accel-Redirect: /internal/uri` | Redirecionamento interno |
| `X-Accel-Expires: 3600` | Define cache time |
| `X-Accel-Limit-Rate: 1024` | Limita taxa de resposta ao cliente |
| `X-Accel-Buffering: yes\|no` | Liga/desliga buffering |
| `X-Accel-Charset: utf-8` | Define charset da resposta |

```nginx
# PHP quer controlar cache via header
fastcgi_ignore_headers Cache-Control Expires;

# Expor um header custom do backend
fastcgi_pass_header X-Custom-Debug;
```

---

### Cache de respostas FastCGI

O NGINX pode cachear respostas FastCGI de forma eficiente usando as
diretivas `fastcgi_cache_*`.

#### `fastcgi_cache_path`

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_cache_path path [levels=levels] [use_temp_path=on\|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on\|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];` |
| Contexto | `http` |

Parâmetros:

| Parâmetro | Descrição |
|-----------|-----------|
| `path` | Diretório raiz do cache |
| `levels=1:2` | Hierarquia de subdiretórios (até 3 níveis, valores 1 ou 2) |
| `keys_zone=name:size` | Zona de memória compartilhada (1MB ≈ 8000 chaves; ≈ 4000 no Plus) |
| `inactive=10m` | Remove dados não acessados nesse período (default 10m) |
| `max_size=size` | Tamanho máximo do cache em disco |
| `min_free=size` | Mínimo de espaço livre em disco (1.19.1) |
| `use_temp_path=off` | Salva temp files no mesmo fs do cache (evita cópia entre filesystems) |
| `manager_files`, `manager_sleep`, `manager_threshold` | Controles do processo "cache manager" |
| `loader_files`, `loader_sleep`, `loader_threshold` | Controles do processo "cache loader" |
| `purger`, `purger_files`, `purger_sleep`, `purger_threshold` | Controles do "cache purger" (Plus) |

```nginx
fastcgi_cache_path /data/nginx/cache levels=1:2 keys_zone=phpcache:10m
                    inactive=60m max_size=1g use_temp_path=off;
```

#### Diretivas de cache

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_cache` | `fastcgi_cache zone \| off;` | `off` | Ativa cache para a zona especificada |
| `fastcgi_cache_key` | `fastcgi_cache_key string;` | `$scheme$fastcgi_server_name$request_uri` | Chave de cache |
| `fastcgi_cache_valid` | `fastcgi_cache_valid [code ...] time;` | — | Tempo de cache por código de resposta |
| `fastcgi_cache_bypass` | `fastcgi_cache_bypass string ...;` | — | Condições para não ler do cache |
| `fastcgi_no_cache` | `fastcgi_no_cache string ...;` | — | Condições para não salvar no cache |
| `fastcgi_cache_use_stale` | `fastcgi_cache_use_stale error \| timeout \| invalid_header \| updating \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| off ...;` | `off` | Usar cache expirado quando backend falha |
| `fastcgi_cache_revalidate` | `fastcgi_cache_revalidate on \| off;` | `off` | Revalidar com `If-Modified-Since`/`If-None-Match` |
| `fastcgi_cache_background_update` | `fastcgi_cache_background_update on \| off;` | `off` | Atualizar em background, servindo stale |
| `fastcgi_cache_lock` | `fastcgi_cache_lock on \| off;` | `off` | Prevenir cache stampede (apenas 1 req popula) |
| `fastcgi_cache_lock_age` | `fastcgi_cache_lock_age time;` | 5s | Se a req que popula não terminar em N s, outra pode tentar |
| `fastcgi_cache_lock_timeout` | `fastcgi_cache_lock_timeout time;` | 5s | Timeout do lock — req vai ao backend mas resposta não é cacheada |
| `fastcgi_cache_methods` | `fastcgi_cache_methods GET \| HEAD \| POST ...;` | `GET HEAD` | Métodos que podem ser cacheados |
| `fastcgi_cache_min_uses` | `fastcgi_cache_min_uses number;` | 1 | Requisições mínimas antes de cachear |
| `fastcgi_cache_max_range_offset` | `fastcgi_cache_max_range_offset number;` | — | Offset máximo para byte-range requests |
| `fastcgi_cache_purge` | `fastcgi_cache_purge string ...;` | — | Requisição PURGE remove entrada do cache (Plus) |

#### Cache completo — exemplo prático

```nginx
http {
    fastcgi_cache_path /data/nginx/cache
                       levels=1:2
                       keys_zone=phpcache:64m
                       inactive=60m
                       max_size=2g
                       use_temp_path=off;

    # Cache by request method (PURGE method)
    map $request_method $purge_method {
        PURGE   1;
        default 0;
    }

    server {
        root /var/www/example;

        location ~ \.php$ {
            fastcgi_pass  unix:/run/php/php8.2-fpm.sock;
            include       fastcgi_params;

            fastcgi_cache           phpcache;
            fastcgi_cache_key       "$scheme$request_method$host$request_uri";
            fastcgi_cache_valid     200 302 10m;
            fastcgi_cache_valid     404         1m;
            fastcgi_cache_valid     any         1m;
            fastcgi_cache_use_stale updating error timeout http_500;
            fastcgi_cache_background_update on;
            fastcgi_cache_lock      on;
            fastcgi_cache_lock_age  10s;
            fastcgi_cache_bypass    $cookie_session;
            fastcgi_no_cache        $http_authorization;
            fastcgi_cache_purge     $purge_method;
        }

        # Purge via PURGE request (Plus)
        location ~ /purge(/.*) {
            fastcgi_cache_purge $purge_method;
        }
    }
}
```

Headers de resposta que controlam cache:

| Header | Efeito |
|--------|--------|
| `X-Accel-Expires: seconds` | Tempo de cache. 0 = não cacheia. `@timestamp` = expira em data absoluta. |
| `Expires: ...` | Usado se `X-Accel-Expires` não existir. |
| `Cache-Control: ...` | Usado se nenhum dos acima existir. |
| `Set-Cookie: ...` | Resposta não é cacheada (a menos que ignorado via `fastcgi_ignore_headers`). |
| `Vary: *` | Não cacheia. `Vary: User-Agent` cacheia considerando o header. |

---

### Store (salvar localmente)

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_store` | `fastcgi_store on \| off \| string;` | `off` | Salva resposta em arquivo local. `on` usa `alias`/`root`. `string` com variáveis define caminho. |
| `fastcgi_store_access` | `fastcgi_store_access users:permissions ...;` | `user:rw` | Permissões dos arquivos salvos. |

```nginx
# Cache de arquivos estáticos gerados pelo backend
location /images/ {
    root /data/www;
    error_page 404 = /fetch$uri;
}

location /fetch/ {
    internal;
    fastcgi_pass         backend:9000;
    fastcgi_store        on;
    fastcgi_store_access user:rw group:rw all:r;
    fastcgi_temp_path    /data/temp;
    alias                /data/www/;
}
```

---

### SSL/TLS em conexões FastCGI

Nem todo backend FastCGI usa SSL (PHP-FPM geralmente não), mas quando
o backend escuta em TLS, use as diretivas `fastcgi_ssl_*`.

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_ssl_certificate` | `fastcgi_ssl_certificate file;` | — | Certificado cliente para auth TLS-mútua |
| `fastcgi_ssl_certificate_key` | `fastcgi_ssl_certificate_key file;` | — | Chave privada do certificado |
| `fastcgi_ssl_ciphers` | `fastcgi_ssl_ciphers ciphers;` | `DEFAULT` | Ciphers permitidos |
| `fastcgi_ssl_conf_command` | `fastcgi_ssl_conf_command name value;` | — | Comando de configuração OpenSSL |
| `fastcgi_ssl_crl` | `fastcgi_ssl_crl file;` | — | CRL para verificar certificado do servidor |
| `fastcgi_ssl_name` | `fastcgi_ssl_name name;` | hostname | Nome para verificação SNI |
| `fastcgi_ssl_password_file` | `fastcgi_ssl_password_file file;` | — | Arquivo com senhas para chave privada |
| `fastcgi_ssl_protocols` | `fastcgi_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];` | `TLSv1.2 TLSv1.3` | Protocolos permitidos |
| `fastcgi_ssl_server_name` | `fastcgi_ssl_server_name on \| off;` | off | Habilita SNI (Server Name Indication) |
| `fastcgi_ssl_session_reuse` | `fastcgi_ssl_session_reuse on \| off;` | on | Reutiliza sessões SSL |
| `fastcgi_ssl_trusted_certificate` | `fastcgi_ssl_trusted_certificate file;` | — | CA confiável para verificar o servidor |
| `fastcgi_ssl_verify` | `fastcgi_ssl_verify on \| off;` | off | Verifica certificado do servidor |
| `fastcgi_ssl_verify_depth` | `fastcgi_ssl_verify_depth number;` | 1 | Profundidade máxima da cadeia de certificação |

```nginx
location /secure/ {
    fastcgi_pass                backend:9443;
    fastcgi_ssl_certificate     /etc/nginx/ssl/client.crt;
    fastcgi_ssl_certificate_key /etc/nginx/ssl/client.key;
    fastcgi_ssl_trusted_certificate /etc/nginx/ssl/ca.crt;
    fastcgi_ssl_verify          on;
    fastcgi_ssl_verify_depth    2;
    fastcgi_ssl_server_name     on;
    fastcgi_ssl_name            "backend.internal";
}
```

---

### Bind de socket

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_bind` | `fastcgi_bind address [transparent] \| off;` | — | Endereço IP local de origem para conexões ao backend. |
| `fastcgi_bind_dynamic` | `fastcgi_bind_dynamic on \| off;` | `off` | Rebind a cada tentativa de conexão (Plus). |
| `fastcgi_send_lowat` | `fastcgi_send_lowat size;` | 0 | Minimiza operações de send no FreeBSD (kqueue `NOTE_LOWAT`). Ignorado em Linux/Solaris/Windows. |
| `fastcgi_socket_rcvbuf` | `fastcgi_socket_rcvbuf size;` | — | Buffer de recebimento do socket (`SO_RCVBUF`). 0 = reseta para padrão do SO (1.31.3+). |
| `fastcgi_socket_sndbuf` | `fastcgi_socket_sndbuf size;` | — | Buffer de envio do socket (`SO_SNDBUF`). 0 = reseta para padrão do SO (1.31.3+). |

```nginx
# Bind com IP específico
fastcgi_bind 10.0.0.1;

# Bind transparente (usar IP real do cliente como origem)
fastcgi_bind $remote_addr transparent;

# Ajustar buffers de socket para alta vazão
fastcgi_socket_rcvbuf 128k;
fastcgi_socket_sndbuf 128k;
```

O bind transparente requer `CAP_NET_RAW` (Linux 1.13.8+) e configuração
de rota no kernel para interceptar tráfego de retorno do backend.

---

### Upstream e keepalive

Use `keepalive` para reutilizar conexões FastCGI e reduzir latência:

```nginx
upstream php_backend {
    server unix:/run/php/php8.1-fpm.sock;
    server unix:/run/php/php8.2-fpm.sock;
    keepalive 32;
}

server {
    location ~ \.php$ {
        fastcgi_pass            php_backend;
        fastcgi_keep_conn       on;      # ← obrigatório para keepalive
        fastcgi_http_version    1.1;     # necessário para keepalive
        # fastcgi_set_header     Connection "";  # se usando proxy_* pattern
        include                 fastcgi_params;
    }
}
```

| Diretiva | Sintaxe | Default | Descrição |
|----------|---------|---------|-----------|
| `fastcgi_keep_conn` | `fastcgi_keep_conn on \| off;` | `off` | Instrui o FastCGI server a manter conexão aberta. Necessário para `keepalive`. |

---

### Variáveis FastCGI

| Variável | Descrição |
|----------|-----------|
| `$fastcgi_script_name` | URI da requisição, ou URI + `fastcgi_index` quando termina em `/`. Com `fastcgi_split_path_info`, é o primeiro capture group. |
| `$fastcgi_path_info` | Segundo capture group de `fastcgi_split_path_info`. Usado para `PATH_INFO`. |

---

### `fastcgi_request_dynamic` (Plus)

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_request_dynamic on \| off;` |
| Default | `off` |
| Contexto | `http`, `server`, `location` |
| Versão | 1.29.3+ (comercial) |

Quando ativado, cria uma instância de requisição separada **para cada**
servidor FastCGI no grupo upstream. Por default, uma única instância
é usada para todos. Isso permite customização por servidor via
`fastcgi_bind_dynamic`, por exemplo.

### `fastcgi_allow_upstream` (Plus)

| Campo | Valor |
|-------|-------|
| Sintaxe | `fastcgi_allow_upstream string ...;` |
| Default | — |
| Contexto | `http`, `server`, `location` |
| Versão | 1.29.3+ (comercial) |

Define condições sob as quais o acesso ao servidor FastCGI é permitido
ou negado. Se todos os parâmetros string não são vazios e não "0", acesso
é permitido. Avaliado antes de cada conexão.

```nginx
geo $upstream_last_addr $allow {
    volatile;
    10.10.0.0/24 1;
}

server {
    fastcgi_pass           localhost:9000;
    fastcgi_allow_upstream $allow;
}
```

---

## Casos de uso

### 1. PHP-FPM — configuração padrão

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/app/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass           unix:/run/php/php8.2-fpm.sock;
        fastcgi_index          index.php;
        fastcgi_param          SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include                fastcgi_params;

        # PHP-FPM tuning
        fastcgi_buffers        256 4k;
        fastcgi_buffer_size    4k;
        fastcgi_connect_timeout 5s;
        fastcgi_read_timeout   30s;
        fastcgi_send_timeout   30s;
        fastcgi_busy_buffers_size 8k;
        fastcgi_temp_file_write_size 8k;
    }

    # Negar acesso a arquivos ocultos
    location ~ /\. {
        deny all;
    }
}
```

### 2. Múltiplos pools PHP (diferentes versões)

```nginx
upstream php_legacy {
    server unix:/run/php/php7.4-fpm.sock;
}

upstream php_current {
    server unix:/run/php/php8.2-fpm.sock;
    keepalive 16;
}

server {
    location ~ ^/legacy/.*\.php$ {
        alias /var/www/legacy;
        fastcgi_pass  php_legacy;
        fastcgi_keep_conn off;
        include fastcgi_params;
    }

    location ~ \.php$ {
        fastcgi_pass  php_current;
        fastcgi_keep_conn on;
        include fastcgi_params;
    }
}
```

### 3. FastCGI com cache de opcode (PHP)

```nginx
fastcgi_cache_path /var/cache/nginx/php levels=1:2 keys_zone=phpcache:128m
                    max_size=4g inactive=60m use_temp_path=off;

server {
    # ...
    set $skip_cache 0;

    # Não cachear POST, session ou admin
    if ($request_method = POST)    { set $skip_cache 1; }
    if ($cookie_session)           { set $skip_cache 1; }
    if ($request_uri ~* /admin/)   { set $skip_cache 1; }

    location ~ \.php$ {
        fastcgi_cache           phpcache;
        fastcgi_cache_key       "$scheme$host$request_uri";
        fastcgi_cache_valid     200 1h;
        fastcgi_cache_bypass    $skip_cache;
        fastcgi_no_cache        $skip_cache;
        fastcgi_cache_use_stale updating error timeout;
        fastcgi_cache_lock      on;

        fastcgi_pass            unix:/run/php/php8.2-fpm.sock;
        include                 fastcgi_params;
    }
}
```

### 4. Load balancing com health checks

```nginx
upstream php_servers {
    least_conn;
    server 10.0.0.1:9000 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:9000 max_fails=3 fail_timeout=30s;
    server 10.0.0.3:9000 backup;
    keepalive 64;
}

server {
    location ~ \.php$ {
        fastcgi_pass                php_servers;
        fastcgi_keep_conn           on;
        fastcgi_next_upstream       error timeout http_500;
        fastcgi_next_upstream_tries 3;
        fastcgi_next_upstream_timeout 10s;
        include                     fastcgi_params;
    }
}
```

---

## Recomendações de performance

### 1. Buffers

```nginx
fastcgi_buffering      on;
fastcgi_buffer_size    4k;
fastcgi_buffers        256 4k;     # 1MB total de buffers
fastcgi_busy_buffers_size 8k;      # 2 buffers → cliente
```

Ajuste com base no tamanho típico das respostas PHP:

| Tamanho resposta | buffers | buffer_size | total |
|-----------------|---------|-------------|-------|
| 4-32 KB | 8 × 4K | 4K | 36 KB |
| 32-256 KB | 64 × 4K | 4K | 260 KB |
| 256 KB-1 MB | 128 × 8K | 8K | 1 MB |
| > 1 MB | 256 × 8K | 8K | 2 MB |

### 2. Keepalive para upstream

```nginx
upstream php { keepalive 32; }
fastcgi_keep_conn on;
```

Reduz drasticamente o overhead de criação de conexões. O PHP-FPM precisa
ter `pm = dynamic` e sockets/tcp com `so_reuseport` se aplicável.

### 3. Cache

```nginx
fastcgi_cache_path ... keys_zone=phpcache:64m max_size=1g;
fastcgi_cache_lock on;       # Evita cache stampede
fastcgi_cache_use_stale updating;  # Serve stale enquanto atualiza
fastcgi_cache_revalidate on; # 304 se recurso não modificado
```

### 4. Ajustes de timeout

```nginx
# Diminuir connect timeout para liberar workers rápido
fastcgi_connect_timeout 3s;

# READ timeout maior para scripts pesados
fastcgi_read_timeout 60s;

# Send timeout (upload de arquivos)
fastcgi_send_timeout 120s;
```

### 5. Request buffering

```nginx
fastcgi_request_buffering on;   # Default. Desligar apenas para streaming
```

Desligar `fastcgi_request_buffering` permite enviar corpo ao backend
imediamente (útil para uploads grandes), mas impede retry via
`next_upstream` se o envio já começou.

### 6. Socket buffers

```nginx
# Para alta vazão em redes rápidas
fastcgi_socket_rcvbuf 128k;
fastcgi_socket_sndbuf 128k;
```

### 7. Cache de opcache (PHP)

No PHP-FPM, configure:

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
```

Isso reduz drasticamente o tempo de execução PHP. O NGINX não precisa
de configuração extra para isso — beneficia qualquer `fastcgi_pass`.

---

## Segurança

### 1. Nunca passe `SCRIPT_FILENAME` diretamente do usuário

```nginx
# ERRADO - permite path traversal
fastcgi_param SCRIPT_FILENAME $document_root$uri;

# CORRETO - apenas para .php files via regex location
location ~ \.php$ {
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

### 2. Negar acesso a arquivos ocultos

```nginx
location ~ /\. {
    deny all;
}
```

### 3. Restringir métodos HTTP

```nginx
limit_except GET HEAD POST {
    deny all;
}
```

### 4. Timeouts agressivos

```nginx
fastcgi_connect_timeout 5s;
fastcgi_read_timeout 30s;
```

### 5. Ocultar versão do NGINX

```nginx
server_tokens off;
```

### 6. Executar com usuário não-root

```nginx
user nginx;
```

O master process roda como root apenas para bind em portas privilegiadas;
workers rodam como `nginx`.

### 7. Desabilitar páginas de erro do backend

```nginx
fastcgi_intercept_errors on;
error_page 500 502 503 504 /50x.html;
```

---

## Solução de problemas

### `Primary script unknown`

Causa: `SCRIPT_FILENAME` não está sendo enviado corretamente, ou
o arquivo não existe no caminho especificado.

```nginx
# Verificar se o caminho está correto
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

# Debug
add_header X-Script-Filename "$document_root$fastcgi_script_name";
```

### `502 Bad Gateway` (upstream recusa conexão)

Verificar se o serviço PHP-FPM está rodando:

```bash
systemctl status php8.2-fpm
ss -ln | grep 9000     # TCP
ls -la /run/php/       # Unix socket
```

Testar conexão:

```bash
SCRIPT_NAME=/test.php \
SCRIPT_FILENAME=/var/www/test.php \
QUERY_STRING= \
REQUEST_METHOD=GET \
cgi-fcgi -bind -connect /run/php/php8.2-fpm.sock
```

### `504 Gateway Timeout`

PHP-FPM demorou mais que `fastcgi_read_timeout`. Aumentar ou otimizar
o script.

### `Upstream prematurely closed connection`

PHP-FPM atingiu `request_terminate_timeout` no `php-fpm.conf` ou o
processo filho morreu (erro 500, segfault).

### File not found no cache

Cache path com permissões erradas. Dar permissão ao usuário do nginx:

```bash
chown -R nginx:nginx /var/cache/nginx
```

### Stale cache não está sendo servido

```nginx
fastcgi_cache_use_stale error timeout updating http_500;
```

### `fastcgi_catch_stderr` não funciona

Verificar se o PHP-FPM está configurado para enviar stderr:

```ini
; php-fpm.conf
catch_workers_output = yes
```

---

## Tabela completa de diretivas

| Diretiva | Contexto | Default | Versão |
|----------|----------|---------|--------|
| `fastcgi_allow_upstream` | http, server, location | — | 1.29.3+ (Plus) |
| `fastcgi_bind` | http, server, location | — | 0.8.22 |
| `fastcgi_bind_dynamic` | http, server, location | off | 1.29.3+ (Plus) |
| `fastcgi_buffer_size` | http, server, location | 4k\|8k | — |
| `fastcgi_buffering` | http, server, location | on | 1.5.6 |
| `fastcgi_buffers` | http, server, location | 8 4k\|8k | — |
| `fastcgi_busy_buffers_size` | http, server, location | 8k\|16k | — |
| `fastcgi_cache` | http, server, location | off | — |
| `fastcgi_cache_background_update` | http, server, location | off | 1.11.10 |
| `fastcgi_cache_bypass` | http, server, location | — | — |
| `fastcgi_cache_key` | http, server, location | — | — |
| `fastcgi_cache_lock` | http, server, location | off | 1.1.12 |
| `fastcgi_cache_lock_age` | http, server, location | 5s | 1.7.8 |
| `fastcgi_cache_lock_timeout` | http, server, location | 5s | 1.1.12 |
| `fastcgi_cache_max_range_offset` | http, server, location | — | 1.11.6 |
| `fastcgi_cache_methods` | http, server, location | GET HEAD | 0.7.59 |
| `fastcgi_cache_min_uses` | http, server, location | 1 | — |
| `fastcgi_cache_path` | http | — | — |
| `fastcgi_cache_purge` | http, server, location | — | 1.5.7+ (Plus) |
| `fastcgi_cache_revalidate` | http, server, location | off | 1.5.7 |
| `fastcgi_cache_use_stale` | http, server, location | off | — |
| `fastcgi_cache_valid` | http, server, location | — | — |
| `fastcgi_catch_stderr` | http, server, location | — | — |
| `fastcgi_connect_timeout` | http, server, location | 60s | — |
| `fastcgi_force_ranges` | http, server, location | off | 1.7.7 |
| `fastcgi_hide_header` | http, server, location | — | — |
| `fastcgi_http_version` | http, server, location | 1.0 | 1.5.6+ |
| `fastcgi_ignore_client_abort` | http, server, location | off | — |
| `fastcgi_ignore_headers` | http, server, location | — | — |
| `fastcgi_index` | http, server, location | — | — |
| `fastcgi_intercept_errors` | http, server, location | off | — |
| `fastcgi_keep_conn` | http, server, location | off | 1.1.4+ |
| `fastcgi_limit_rate` | http, server, location | 0 | 1.7.7 |
| `fastcgi_max_temp_file_size` | http, server, location | 1024m | — |
| `fastcgi_next_upstream` | http, server, location | error timeout | — |
| `fastcgi_next_upstream_timeout` | http, server, location | 0 | 1.7.5 |
| `fastcgi_next_upstream_tries` | http, server, location | 0 | 1.7.5 |
| `fastcgi_no_cache` | http, server, location | — | — |
| `fastcgi_param` | http, server, location | — | — |
| `fastcgi_pass` | location, if in location | — | — |
| `fastcgi_pass_header` | http, server, location | — | — |
| `fastcgi_pass_request_body` | http, server, location | on | — |
| `fastcgi_pass_request_headers` | http, server, location | on | — |
| `fastcgi_read_timeout` | http, server, location | 60s | — |
| `fastcgi_request_buffering` | http, server, location | on | 1.7.11 |
| `fastcgi_request_dynamic` | http, server, location | off | 1.29.3+ (Plus) |
| `fastcgi_send_lowat` | http, server, location | 0 | — |
| `fastcgi_send_timeout` | http, server, location | 60s | — |
| `fastcgi_socket_keepalive` | http, server, location | off | 1.15.6 |
| `fastcgi_socket_rcvbuf` | http, server, location | — | 1.31.3 |
| `fastcgi_socket_sndbuf` | http, server, location | — | 1.31.3 |
| `fastcgi_split_path_info` | location | — | — |
| `fastcgi_store` | http, server, location | off | — |
| `fastcgi_store_access` | http, server, location | user:rw | — |
| `fastcgi_temp_file_write_size` | http, server, location | 8k\|16k | — |
| `fastcgi_temp_path` | http, server, location | fastcgi_temp | — |

### SSL (FastCGI backend)

| Diretiva | Contexto | Default | Versão |
|----------|----------|---------|--------|
| `fastcgi_ssl_certificate` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_certificate_key` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_ciphers` | http, server, location | DEFAULT | 1.29.3+ |
| `fastcgi_ssl_conf_command` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_crl` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_name` | http, server, location | host name | 1.29.3+ |
| `fastcgi_ssl_password_file` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_protocols` | http, server, location | TLSv1.2 TLSv1.3 | 1.29.3+ |
| `fastcgi_ssl_server_name` | http, server, location | off | 1.29.3+ |
| `fastcgi_ssl_session_reuse` | http, server, location | on | 1.29.3+ |
| `fastcgi_ssl_trusted_certificate` | http, server, location | — | 1.29.3+ |
| `fastcgi_ssl_verify` | http, server, location | off | 1.29.3+ |
| `fastcgi_ssl_verify_depth` | http, server, location | 1 | 1.29.3+ |
