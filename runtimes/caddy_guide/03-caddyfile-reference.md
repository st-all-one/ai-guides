# 03 — Referência Completa da Caddyfile

## Global Options

O bloco `{ ... }` no topo da Caddyfile define opções globais.

### Gerais

| Opção | Descrição | Default |
|-------|-----------|---------|
| `debug` | Ativa log nível DEBUG | off |
| `http_port <port>` | Porta interna HTTP | 80 |
| `https_port <port>` | Porta interna HTTPS | 443 |
| `default_bind <hosts...>` | Bind padrão para sites | all interfaces |
| `order <dir> first\|last\|before\|after <dir2>` | Ordem customizada de diretivas | — |
| `storage <mod> { ... }` | Módulo de storage | file_system |
| `storage_clean_interval <dur>` | Intervalo de limpeza de storage | 24h |
| `admin off\|<addr> { origins; enforce_origin }` | Config admin API | localhost:2019 |
| `persist_config off` | Persistir config JSON | on |
| `log [name] { output; format; level; include; exclude }` | Logger global | — |
| `grace_period <dur>` | Grace period shutdown | ∞ |
| `shutdown_delay <dur>` | Delay antes do grace period | 0 |
| `metrics { per_host; observe_catchall_hosts; otlp }` | Métricas Prometheus/OTLP | off |

### TLS

| Opção | Descrição | Default |
|-------|-----------|---------|
| `auto_https off\|disable_redirects\|ignore_loaded_certs\|disable_certs` | Controle de HTTPS automático | on |
| `email <email>` | Email ACME | — |
| `default_sni <name>` | SNI default | — |
| `fallback_sni <name>` | SNI fallback (experimental) | — |
| `local_certs` | Usar CA local sempre | off |
| `skip_install_trust` | Pular instalação CA no trust store | off |
| `acme_ca <url>` | URL ACME CA | ZeroSSL + Let's Encrypt |
| `acme_ca_root <pem>` | Root CA customizada | system |
| `acme_eab { key_id; mac_key }` | External Account Binding | — |
| `acme_dns <provider> [params...]` | DNS challenge global | — |
| `dns <provider> [params...]` | DNS provider default | — |
| `ech <names...> { dns }` | Encrypted ClientHello | — |
| `on_demand_tls { ask; permission }` | Restrição On-Demand TLS | — |
| `key_type ed25519\|p256\|p384\|rsa2048\|rsa4096` | Tipo de chave | — |
| `cert_issuer <name> { ... }` | Issuer customizado | — |
| `renew_interval <dur>` | Scan de renovação | 10m |
| `cert_lifetime <dur>` | Período de validade pedido | 0 (CA decide) |
| `ocsp_interval <dur>` | OCSP check | 1h |
| `ocsp_stapling off` | Desabilitar OCSP stapling | on |
| `renewal_window_ratio <ratio>` | Ratio de renovação | 0.3333 |
| `preferred_chains [smallest] { root_common_name; any_common_name }` | Chain preference | — |

### Server (por listener)

`servers [<listener_address>] { ... }` — config por servidor.

| Opção | Descrição | Default |
|-------|-----------|---------|
| `name <name>` | Nome do servidor | srv0, srv1... |
| `listener_wrappers { tls; http_redirect; proxy_protocol }` | Wrappers de listener | — |
| `timeouts { read_body; read_header; write; idle }` | Timeouts | no timeout |
| `keepalive_interval <dur>` | TCP keepalive | 15s |
| `keepalive_idle <dur>` | Idle antes de keepalive | 15s |
| `keepalive_count <n>` | Máx keepalive packets | 9 |
| `0rtt off` | Desabilitar 0-RTT QUIC | on |
| `trusted_proxies static [private_ranges] <ranges...>` | Proxies confiáveis | — |
| `trusted_proxies_strict` | Parsing right-to-left X-Forwarded-For | off |
| `trusted_proxies_unix` | Confiar unix sockets | off |
| `client_ip_headers <headers...>` | Headers para IP do cliente | X-Forwarded-For |
| `trace` | Log de handlers invocados (experimental) | off |
| `max_header_size <size>` | Tamanho máximo de headers | 1MB |
| `enable_full_duplex` | Full-duplex HTTP/1 | off |
| `log_credentials` | Não redactar credenciais em logs | off |
| `protocols [h1\|h2\|h2c\|h3]` | Protocolos HTTP | h1 h2 h3 |
| `strict_sni_host [on\|insecure_off]` | Validar SNI vs Host | off |

### File Systems

```caddy
filesystem <name> <module> {
    <options...>
}
```

### PKI

```caddy
pki {
    ca [<id>] {
        name
        root_cn
        intermediate_cn
        intermediate_lifetime  # default: 7d
        maintenance_interval   # default: 10m
        renewal_window_ratio   # default: 0.2
        root { format; cert; key }
        intermediate { format; cert; key }
    }
}
```

### Events

```caddy
events {
    on <event> <handler...>
}
```

## Diretivas HTTP Handler

Legenda: `[matcher]` = opcional, `<required>` = obrigatório, `...` = múltiplos.

### abort
`abort [<matcher>]` — Aborta a request imediatamente (fecha conexão).

### acme_server
`acme_server [<matcher>] { lifetime; ca }` — Servidor ACME embutido.

### basic_auth
`basic_auth [<matcher>] [<hash_credential...>] { hash_cache; }` — HTTP Basic Auth.

### bind
`bind [<matcher>] <interfaces...>` — Override de bind address.

### encode
`encode [<matcher>] [<formats...>] { gzip [level]; zstd [level]; minimum_length; match }` — Compressão.
- Formats default: `zstd gzip`
- minimum_length default: 512 bytes
- match default: Content-Type text/*, application/*json*, etc.

### error
`error [<matcher>] [<status>] [<message>]` — Trigger de erro.

### file_server
`file_server [<matcher>] [browse] { fs; root; hide; index; browse { reveal_symlinks; sort; file_limit }; precompressed; status; disable_canonical_uris; pass_thru }` — Servidor de arquivos estáticos.
- index default: `index.html index.txt`
- precompressed default: `br zstd gzip`

### forward_auth
`forward_auth [<matcher>] [<upstream...>] { ... }` — Delega autenticação externa.

### fs
`fs [<matcher>] <name>` — Alterna filesystem.

### handle
`handle [<matcher>] { ... }` — Grupo mutuamente exclusivo de diretivas.

### handle_errors
`handle_errors [<status>] { ... }` — Rotas de erro.

### handle_path
`handle_path [<matcher>] { ... }` — Como `handle` mas remove prefixo do path.

### header
`header [<matcher>] [<field> [<value\|regexp> [<replacement>]]]` — Manipulação de response headers.
- `+field value` — adiciona
- `-field` — deleta
- `-field*` — deleta por sufixo
- `field value` — seta (sobrescreve)
- `field regexp replacement` — regex replace

### import
`import [<pattern>] [<args...>]` — Inclui snippet ou arquivo (com glob).

### intercept
`intercept [<matcher>] { ... }` — Intercepta response de handlers anteriores.

### invoke
`invoke <name>` — Invoca named route (experimental).

### log
`log [<matcher>] [<name>] { output; format; level; include; exclude }` — Access logging.
- Output modules: `stdout`, `file <path>`, `net <addr>`, `discard`
- Format modules: `json`, `console`, `single_field`, `formatted`, `filter`, `regex`, `template` (com transform-encoder plugin)
- Level: `debug`, `info`, `warn`, `error`, `panic`, `fatal`
- Default output: `stderr`

### map
`map [<matcher>] <input> <outputs...> { default; ~<regex> <replacement> }` — Mapeia valores para placeholders.

### method
`method [<matcher>] <method>` — Altera método HTTP.

### metrics
`metrics [<matcher>]` — Endpoint Prometheus `/metrics`.

### php_fastcgi
`php_fastcgi [<matcher>] [<upstream...>] { ... }` — Proxy PHP-FPM com defaults opinados.

### push
`push [<matcher>] [<resources...>] { method; header }` — HTTP/2 server push.

### redir
`redir [<matcher>] [<code\|match>] <to>` — Redirect HTTP.

### request_body
`request_body [<matcher>] { max_size; set }` — Manipula body da request.

### request_header
`request_header [<matcher>] <field> [<value\|regexp> [<replacement>]]` — Manipula request headers.

### respond
`respond [<matcher>] [<status>] [<body>]` — Resposta estática.

### reverse_proxy
Ver [07-reverse-proxy.md](07-reverse-proxy.md).

### rewrite
`rewrite [<matcher>] [<to>]` — Rewrite interno de URI.

### root
`root [<matcher>] <path>` — Seta root path do site.

### route
`route [<matcher>] { ... }` — Grupo de diretivas sem reordenação.

### templates
`templates [<matcher>] { root; ext; between; match; }` — Template engine.

### tls
Ver [06-security-tls.md](06-security-tls.md).

### tracing
`tracing [<matcher>] [<span_name>]` — OpenTelemetry tracing.

### try_files
`try_files [<matcher>] <files...>` — Rewrite baseado em existência de arquivo.

### uri
`uri [<matcher>] <operation> [<arg> [<replacement>]]` — Manipulação de URI.
- Operações: `strip_prefix`, `strip_suffix`, `replace`, `path_regexp`, `query`

### vars
`vars [<matcher>] <name> <value>` — Seta variáveis de request.

## Matchers

### Path Matchers

```caddy
directive /path    # match específico
directive /path/*  # match prefixo
directive *        # match tudo
```

### Named Matchers

```caddy
@name {
    client_ip <ranges...>
    expression <cel_expr>
    file [<files...>]
    header <field> [<value>]
    host <domains...>
    method <methods...>
    not <matcher>
    path <paths...>
    protocol http|https|grpc
    query <key>=<val>...
    remote_ip <ranges...>
    vars <name> <value>
}
```

### Response Matchers

```caddy
@name {
    status <code...>          # ex: 200, 2xx, 404, 5xx
    header <field> [<value>]  # sufixo *, prefixo, substring
}
```

## Snippets

```caddy
(common-logs) {
    log {
        output file /var/log/access.log
        format json
    }
}

example.com {
    import common-logs
}
```

## Named Routes

```caddy
&(app-backend) {
    reverse_proxy app:8080
}

example.com {
    invoke app-backend
}
```

## Comentários

```caddy
# comment
directive  # inline comment
```
