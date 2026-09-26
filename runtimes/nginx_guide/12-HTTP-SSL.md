# NGINX SSL/TLS, HTTPS, HTTP/2, HTTP/3 & QUIC

This document covers **ngx_http_ssl_module**, **configuring HTTPS servers**, **ngx_http_v2_module** (HTTP/2), **ngx_http_v3_module** (HTTP/3/QUIC), and general QUIC configuration.

---

## 1. ngx_http_ssl_module

Provides HTTPS support. Requires `--with-http_ssl_module` and OpenSSL.

### Example Configuration

```nginx
worker_processes auto;

http {
    server {
        listen              443 ssl;
        keepalive_timeout   70;

        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_certificate     /usr/local/nginx/conf/cert.pem;
        ssl_certificate_key /usr/local/nginx/conf/cert.key;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;
    }
}
```

### Directives

#### `ssl`

| Field | Value |
|-------|-------|
| Syntax | `ssl on \| off;` |
| Default | `ssl off;` |
| Context | http, server |

**OBSOLETE** since 1.15.0, removed in 1.25.1. Use the `ssl` parameter of the `listen` directive instead.

#### `ssl_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `ssl_buffer_size size;` |
| Default | `ssl_buffer_size 16k;` |
| Context | http, server |

Size of buffer for sending data. Smaller values (4k) reduce TTFB; 16k minimizes overhead for large responses.

#### `ssl_certificate`

| Field | Value |
|-------|-------|
| Syntax | `ssl_certificate file;` |
| Default | — |
| Context | http, server |

PEM-format certificate file. Intermediate certificates should be in the same file after the primary certificate. Can be specified multiple times for different key types (RSA + ECDSA). Supports `data:$variable` (1.15.10) and `$ssl_server_name.crt` variables (1.15.9+).

```nginx
ssl_certificate     example.com.rsa.crt;
ssl_certificate_key example.com.rsa.key;
ssl_certificate     example.com.ecdsa.crt;
ssl_certificate_key example.com.ecdsa.key;
```

#### `ssl_certificate_cache`

| Field | Value |
|-------|-------|
| Syntax | `ssl_certificate_cache off;` / `ssl_certificate_cache max=N [inactive=time] [valid=time];` |
| Default | `ssl_certificate_cache off;` |
| Context | http, server |

Cache for SSL certificates and keys specified with variables. `max` = LRU cache size; `inactive` = removal time (default 10s); `valid` = validity period (default 60s).

#### `ssl_certificate_compression`

| Field | Value |
|-------|-------|
| Syntax | `ssl_certificate_compression on \| off;` |
| Default | `ssl_certificate_compression off;` |
| Context | http, server |

Enables TLS 1.3 certificate compression (RFC 8879). Requires OpenSSL 3.2+ or BoringSSL.

#### `ssl_certificate_key`

| Field | Value |
|-------|-------|
| Syntax | `ssl_certificate_key file;` |
| Default | — |
| Context | http, server |

Secret key in PEM format. Can also specify `engine:name:id`, `store:scheme:id`, or `data:$variable`.

#### `ssl_ciphers`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ciphers ciphers;` |
| Default | `ssl_ciphers HIGH:!aNULL:!MD5;` |
| Context | http, server |

Specifies enabled ciphers in OpenSSL format. View list with `openssl ciphers`.

#### `ssl_client_certificate`

| Field | Value |
|-------|-------|
| Syntax | `ssl_client_certificate file;` |
| Default | — |
| Context | http, server |

Trusted CA certificates for client certificate verification. List is sent to clients. Use `ssl_trusted_certificate` if you don't want to send the list.

#### `ssl_conf_command`

| Field | Value |
|-------|-------|
| Syntax | `ssl_conf_command name value;` |
| Default | — |
| Context | http, server |

Sets arbitrary OpenSSL configuration commands. Requires OpenSSL 1.0.2+.

```nginx
ssl_conf_command Options PrioritizeChaCha;
ssl_conf_command Ciphersuites TLS_CHACHA20_POLY1305_SHA256;
```

#### `ssl_crl`

| Field | Value |
|-------|-------|
| Syntax | `ssl_crl file;` |
| Default | — |
| Context | http, server |

Revoked certificates (CRL) in PEM format for client certificate verification.

#### `ssl_dhparam`

| Field | Value |
|-------|-------|
| Syntax | `ssl_dhparam file;` |
| Default | — |
| Context | http, server |

DH parameters for DHE ciphers. By default no parameters set → DHE ciphers not used.

#### `ssl_early_data`

| Field | Value |
|-------|-------|
| Syntax | `ssl_early_data on \| off;` |
| Default | `ssl_early_data off;` |
| Context | http, server |

Enables TLS 1.3 early data (0-RTT). Requires OpenSSL 1.1.1+ or BoringSSL. **Security**: requests sent within early data are subject to replay attacks.

```nginx
proxy_set_header Early-Data $ssl_early_data;
```

#### `ssl_ecdh_curve`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ecdh_curve curve;` |
| Default | `ssl_ecdh_curve auto;` |
| Context | http, server |

Specifies curve for ECDHE ciphers. Multiple curves supported with OpenSSL 1.0.2+.

```nginx
ssl_ecdh_curve prime256v1:secp384r1;
```

#### `ssl_ech_file`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ech_file file;` |
| Default | — |
| Context | http, server |

Encrypted ClientHello configuration (ECHConfig) in PEM format for TLS 1.3 ECH. Requires OpenSSL ECH feature branch.

#### `ssl_key_log`

| Field | Value |
|-------|-------|
| Syntax | `ssl_key_log path;` |
| Default | — |
| Context | http, server |

Enables SSL key logging in SSLKEYLOGFILE format (compatible with Wireshark). Commercial subscription.

#### `ssl_ocsp`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ocsp on \| off \| leaf;` |
| Default | `ssl_ocsp off;` |
| Context | http, server |

Enables OCSP validation of client certificate chain. `leaf` validates client certificate only. Requires `ssl_verify_client on|optional` and `resolver`.

```nginx
ssl_verify_client on;
ssl_ocsp          on;
resolver          192.0.2.1;
```

#### `ssl_ocsp_cache`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ocsp_cache off \| shared:name:size;` |
| Default | `ssl_ocsp_cache off;` |
| Context | http, server |

Cache for client certificate OCSP validation results. Shared between worker processes.

#### `ssl_ocsp_responder`

| Field | Value |
|-------|-------|
| Syntax | `ssl_ocsp_responder url;` |
| Default | — |
| Context | http, server |

Overrides OCSP responder URL from certificate's Authority Information Access extension. Supports `http://` only.

#### `ssl_password_file`

| Field | Value |
|-------|-------|
| Syntax | `ssl_password_file file;` |
| Default | — |
| Context | http, server |

File with passphrases for secret keys (one per line). Named pipes supported.

#### `ssl_prefer_server_ciphers`

| Field | Value |
|-------|-------|
| Syntax | `ssl_prefer_server_ciphers on \| off;` |
| Default | `ssl_prefer_server_ciphers off;` |
| Context | http, server |

When on, server ciphers are preferred over client ciphers during SSL/TLS negotiation.

#### `ssl_protocols`

| Field | Value |
|-------|-------|
| Syntax | `ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];` |
| Default | `ssl_protocols TLSv1.2 TLSv1.3;` |
| Context | http, server |

Enables specified SSL/TLS protocols. Use default server for protocol settings due to SNI timing.

#### `ssl_reject_handshake`

| Field | Value |
|-------|-------|
| Syntax | `ssl_reject_handshake on \| off;` |
| Default | `ssl_reject_handshake off;` |
| Context | http, server |

Rejects SSL handshakes in the server block. Useful for rejecting unknown SNI names.

```nginx
server {
    listen               443 ssl default_server;
    ssl_reject_handshake on;
}
server {
    listen              443 ssl;
    server_name         example.com;
    ssl_certificate     example.com.crt;
    ssl_certificate_key example.com.key;
}
```

#### `ssl_session_cache`

| Field | Value |
|-------|-------|
| Syntax | `ssl_session_cache off \| none \| [builtin[:size]] [shared:name:size];` |
| Default | `ssl_session_cache none;` |
| Context | http, server |

**`off`** – strictly prohibit session reuse. **`none`** – gently disallow (tells client sessions may be reused but doesn't store). **`builtin`** – OpenSSL built-in cache, one per worker. **`shared`** – shared between workers (1MB ≈ 4000 sessions). Also automatically manages TLS session ticket keys (1.23.2+).

```nginx
ssl_session_cache builtin:1000 shared:SSL:10m;
```

#### `ssl_session_ticket_key`

| Field | Value |
|-------|-------|
| Syntax | `ssl_session_ticket_key file;` |
| Default | — |
| Context | http, server |

Secret key for encrypting/decrypting TLS session tickets. Required for sharing keys between multiple servers. File must be 80 bytes (AES256) or 48 bytes (AES128). Created with `openssl rand 80 > ticket.key`. Multiple keys support rotation (first encrypts, all decrypt).

#### `ssl_session_tickets`

| Field | Value |
|-------|-------|
| Syntax | `ssl_session_tickets on \| off;` |
| Default | `ssl_session_tickets on;` |
| Context | http, server |

Enables session resumption through TLS session tickets (RFC 5077).

#### `ssl_session_timeout`

| Field | Value |
|-------|-------|
| Syntax | `ssl_session_timeout time;` |
| Default | `ssl_session_timeout 5m;` |
| Context | http, server |

Time during which client may reuse session parameters.

#### `ssl_stapling`

| Field | Value |
|-------|-------|
| Syntax | `ssl_stapling on \| off;` |
| Default | `ssl_stapling off;` |
| Context | http, server |

Enables OCSP stapling. Requires `resolver` and issuer certificate knowledge.

```nginx
ssl_stapling on;
resolver 192.0.2.1;
```

#### `ssl_stapling_file`

| Field | Value |
|-------|-------|
| Syntax | `ssl_stapling_file file;` |
| Default | — |
| Context | http, server |

OCSP response from file (DER format from `openssl ocsp`) instead of querying responder.

#### `ssl_stapling_responder`

| Field | Value |
|-------|-------|
| Syntax | `ssl_stapling_responder url;` |
| Default | — |
| Context | http, server |

Overrides OCSP responder URL from certificate. `http://` only.

#### `ssl_stapling_verify`

| Field | Value |
|-------|-------|
| Syntax | `ssl_stapling_verify on \| off;` |
| Default | `ssl_stapling_verify off;` |
| Context | http, server |

Enables verification of OCSP responses. Requires `ssl_trusted_certificate` with issuer, root, and intermediate CAs.

#### `ssl_trusted_certificate`

| Field | Value |
|-------|-------|
| Syntax | `ssl_trusted_certificate file;` |
| Default | — |
| Context | http, server |

Trusted CA certificates for client certificate verification and OCSP stapling. Unlike `ssl_client_certificate`, the list is NOT sent to clients.

#### `ssl_verify_client`

| Field | Value |
|-------|-------|
| Syntax | `ssl_verify_client on \| off \| optional \| optional_no_ca;` |
| Default | `ssl_verify_client off;` |
| Context | http, server |

Enables client certificate verification. `optional` requests cert and verifies if present. `optional_no_ca` requests cert but does not require trusted CA signature.

#### `ssl_verify_depth`

| Field | Value |
|-------|-------|
| Syntax | `ssl_verify_depth number;` |
| Default | `ssl_verify_depth 1;` |
| Context | http, server |

Verification depth in client certificate chain.

### SSL Error Codes (for error_page)

| Code | Description |
|------|-------------|
| 495 | Error during client certificate verification |
| 496 | Client did not present required certificate |
| 497 | Regular request sent to HTTPS port |

### SSL Embedded Variables

| Variable | Description |
|----------|-------------|
| `$ssl_alpn_protocol` | Protocol selected by ALPN during SSL handshake |
| `$ssl_cipher` | Name of the cipher used |
| `$ssl_ciphers` | List of ciphers supported by client |
| `$ssl_client_escaped_cert` | Client certificate in PEM format (urlencoded) |
| `$ssl_client_cert` | Client certificate in PEM format (deprecated, use `$ssl_client_escaped_cert`) |
| `$ssl_client_fingerprint` | SHA1 fingerprint of client certificate |
| `$ssl_client_i_dn` | Issuer DN of client certificate (RFC 2253) |
| `$ssl_client_i_dn_legacy` | Issuer DN (legacy format) |
| `$ssl_client_raw_cert` | Client certificate in PEM format |
| `$ssl_client_s_dn` | Subject DN of client certificate (RFC 2253) |
| `$ssl_client_s_dn_legacy` | Subject DN (legacy format) |
| `$ssl_client_serial` | Serial number of client certificate |
| `$ssl_client_sigalg` | Signature algorithm of client certificate (OpenSSL 3.5+) |
| `$ssl_client_v_end` | End date of client certificate |
| `$ssl_client_v_remain` | Days until client certificate expires |
| `$ssl_client_v_start` | Start date of client certificate |
| `$ssl_client_verify` | Result: SUCCESS, FAILED:reason, NONE |
| `$ssl_curve` | Negotiated curve for key exchange (OpenSSL 3.0+) |
| `$ssl_curves` | List of curves supported by client |
| `$ssl_early_data` | "1" if TLS 1.3 early data is used |
| `$ssl_ech_outer_server_name` | Public server name if ECH accepted |
| `$ssl_ech_status` | ECH processing result |
| `$ssl_protocol` | Protocol of SSL connection |
| `$ssl_server_name` | Server name requested through SNI |
| `$ssl_session_id` | Session identifier |
| `$ssl_session_reused` | "r" if session reused, "." otherwise |
| `$ssl_sigalg` | Signature algorithm used (OpenSSL 3.5+) |
| `$ssl_sigalgs` | Client-supported signature algorithms (OpenSSL 4.0+) |

---

## 2. Configuring HTTPS Servers

### Basic HTTPS Server

```nginx
server {
    listen              443 ssl;
    server_name         www.example.com;
    ssl_certificate     www.example.com.crt;
    ssl_certificate_key www.example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
}
```

### Optimization Recommendations

- `worker_processes auto;` (one per CPU core)
- Enable keep-alive: `keepalive_timeout 70;`
- Use shared session cache: `ssl_session_cache shared:SSL:10m;`
- Increase session lifetime: `ssl_session_timeout 10m;`
- Disable built-in session cache in favor of shared

```nginx
worker_processes auto;
http {
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    server {
        listen              443 ssl;
        server_name         www.example.com;
        keepalive_timeout   70;
        ssl_certificate     www.example.com.crt;
        ssl_certificate_key www.example.com.key;
    }
}
```

### SSL Certificate Chains

Concatenate server certificate with intermediate certificates:

```bash
cat www.example.com.crt bundle.crt > www.example.com.chained.crt
```

```nginx
ssl_certificate     www.example.com.chained.crt;
ssl_certificate_key www.example.com.key;
```

### Single HTTP/HTTPS Server

```nginx
server {
    listen              80;
    listen              443 ssl;
    server_name         www.example.com;
    ssl_certificate     www.example.com.crt;
    ssl_certificate_key www.example.com.key;
}
```

### Name-based HTTPS Servers (SNI Issue)

The SSL connection is established before the HTTP request is sent, so nginx doesn't know the server name beforehand. Solutions:

1. **Separate IP addresses** (most robust)
2. **SubjectAltName certificate** with multiple names
3. **Wildcard certificate** (`*.example.org`)
4. **SNI** (Server Name Indication) – supported since nginx 0.5.23, OpenSSL 0.9.8f+

```nginx
server {
    listen          443 ssl;
    server_name     www.example.com;
    ssl_certificate www.example.com.crt;
}
server {
    listen          443 ssl;
    server_name     www.example.org;
    ssl_certificate www.example.org.crt;
}
```

### HTTPS Redirect

```nginx
server {
    listen      80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen      443 ssl;
    server_name example.com www.example.com;
    # ssl config...
}
```

### HSTS (HTTP Strict Transport Security)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 3. ngx_http_v2_module (HTTP/2)

Provides HTTP/2 support. Requires `--with-http_v2_module`.

### Example Configuration

```nginx
server {
    listen 443 ssl;
    http2 on;

    ssl_certificate     server.crt;
    ssl_certificate_key server.key;
}
```

### Known Issues

- Before 1.9.14, client request body buffering could not be disabled
- Before 1.19.1, `lingering_close` was not used for HTTP/2 connections
- ALPN TLS extension required (OpenSSL 1.0.2+)
- If `ssl_prefer_server_ciphers on`, ciphers must comply with RFC 9113 blacklist

### Directives

#### `http2`

| Field | Value |
|-------|-------|
| Syntax | `http2 on \| off;` |
| Default | `http2 off;` |
| Context | http, server |

Enables HTTP/2 protocol. Replaces the deprecated `http2` parameter of the `listen` directive.

#### `http2_body_preread_size`

| Field | Value |
|-------|-------|
| Syntax | `http2_body_preread_size size;` |
| Default | `http2_body_preread_size 64k;` |
| Context | http, server |

Buffer size per request for body prereading before processing.

#### `http2_chunk_size`

| Field | Value |
|-------|-------|
| Syntax | `http2_chunk_size size;` |
| Default | `http2_chunk_size 8k;` |
| Context | http, server, location |

Max size of response body chunks. Too low = higher overhead; too high = HOL blocking.

#### `http2_idle_timeout` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_idle_timeout time;` |
| Default | `http2_idle_timeout 3m;` |
| Context | http, server |

OBSOLETE since 1.19.7. Use `keepalive_timeout` instead.

#### `http2_max_concurrent_pushes` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_max_concurrent_pushes number;` |
| Default | `http2_max_concurrent_pushes 10;` |
| Context | http, server |

OBSOLETE since 1.25.1. Server Push has been removed from HTTP/2.

#### `http2_max_concurrent_streams`

| Field | Value |
|-------|-------|
| Syntax | `http2_max_concurrent_streams number;` |
| Default | `http2_max_concurrent_streams 128;` |
| Context | http, server |

Max number of concurrent HTTP/2 streams per connection.

#### `http2_max_field_size` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_max_field_size size;` |
| Default | `http2_max_field_size 4k;` |
| Context | http, server |

OBSOLETE since 1.19.7. Use `large_client_header_buffers` instead.

#### `http2_max_header_size` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_max_header_size size;` |
| Default | `http2_max_header_size 16k;` |
| Context | http, server |

OBSOLETE since 1.19.7. Use `large_client_header_buffers` instead.

#### `http2_max_requests` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_max_requests number;` |
| Default | `http2_max_requests 1000;` |
| Context | http, server |

OBSOLETE since 1.19.7. Use `keepalive_requests` instead.

#### `http2_push` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_push uri \| off;` |
| Default | `http2_push off;` |
| Context | http, server, location |

OBSOLETE since 1.25.1. Use `early_hints` instead.

#### `http2_push_preload` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_push_preload on \| off;` |
| Default | `http2_push_preload off;` |
| Context | http, server, location |

OBSOLETE since 1.25.1. Converted preload links into push requests.

#### `http2_recv_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `http2_recv_buffer_size size;` |
| Default | `http2_recv_buffer_size 256k;` |
| Context | http |

Size of per-worker input buffer.

#### `http2_recv_timeout` (obsolete)

| Field | Value |
|-------|-------|
| Syntax | `http2_recv_timeout time;` |
| Default | `http2_recv_timeout 30s;` |
| Context | http, server |

OBSOLETE since 1.19.7. Use `client_header_timeout` instead.

### HTTP/2 Variables

| Variable | Description |
|----------|-------------|
| `$http2` | Negotiated protocol: "h2" (over TLS), "h2c" (cleartext), or "" |

---

## 4. ngx_http_v3_module (HTTP/3 / QUIC)

Experimental HTTP/3 support. Requires `--with-http_v3_module` and OpenSSL 1.1.1+ (or BoringSSL/LibreSSL/QuicTLS for 0-RTT).

### Example Configuration

```nginx
http {
    log_format quic '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" "$http3"';

    access_log logs/access.log quic;

    server {
        # for better compatibility it's recommended
        # to use the same port for HTTP/3 and HTTPS
        listen 8443 quic reuseport;
        listen 8443 ssl;

        ssl_certificate     certs/example.com.crt;
        ssl_certificate_key certs/example.com.key;

        location / {
            # used to advertise the availability of HTTP/3
            add_header Alt-Svc 'h3=":8443"; ma=86400';
        }
    }
}
```

### Known Issues

- Module is experimental
- Before 1.29.1, 0-RTT support could not be enabled with OpenSSL
- Cannot be built on Win32

### Directives

#### `http3`

| Field | Value |
|-------|-------|
| Syntax | `http3 on \| off;` |
| Default | `http3 on;` |
| Context | http, server |

Enables HTTP/3 protocol negotiation.

#### `http3_hq`

| Field | Value |
|-------|-------|
| Syntax | `http3_hq on \| off;` |
| Default | `http3_hq off;` |
| Context | http, server |

Enables HTTP/0.9 protocol negotiation for QUIC interoperability tests.

#### `http3_max_concurrent_streams`

| Field | Value |
|-------|-------|
| Syntax | `http3_max_concurrent_streams number;` |
| Default | `http3_max_concurrent_streams 128;` |
| Context | http, server |

Max number of concurrent HTTP/3 request streams per connection.

#### `http3_stream_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `http3_stream_buffer_size size;` |
| Default | `http3_stream_buffer_size 64k;` |
| Context | http, server |

Buffer size for reading/writing QUIC streams.

#### `quic_active_connection_id_limit`

| Field | Value |
|-------|-------|
| Syntax | `quic_active_connection_id_limit number;` |
| Default | `quic_active_connection_id_limit 2;` |
| Context | http, server |

Max number of client connection IDs stored on the server.

#### `quic_bpf`

| Field | Value |
|-------|-------|
| Syntax | `quic_bpf on \| off;` |
| Default | `quic_bpf off;` |
| Context | main |

Enables QUIC packet routing using eBPF (Linux 5.7+). Supports connection migration.

#### `quic_gso`

| Field | Value |
|-------|-------|
| Syntax | `quic_gso on \| off;` |
| Default | `quic_gso off;` |
| Context | http, server |

Enables optimized batch sending with UDP segmentation offloading (Linux with UDP_SEGMENT).

#### `quic_host_key`

| Field | Value |
|-------|-------|
| Syntax | `quic_host_key file;` |
| Default | — |
| Context | http, server |

Secret key for encrypting stateless reset and address validation tokens. Randomly generated per reload if not set.

#### `quic_retry`

| Field | Value |
|-------|-------|
| Syntax | `quic_retry on \| off;` |
| Default | `quic_retry off;` |
| Context | http, server |

Enables QUIC Address Validation (Retry packets and NEW_TOKEN frames).

### HTTP/3 Variables

| Variable | Description |
|----------|-------------|
| `$http3` | "h3" for HTTP/3, "hq" for hq connections, or "" |

---

## 5. Dual HTTP/2 + HTTP/3 Configuration

```nginx
server {
    # HTTP/3 (QUIC)
    listen 443 quic reuseport;

    # HTTP/2 + HTTPS
    listen 443 ssl;
    http2 on;

    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # SSL configuration
    ssl_protocols             TLSv1.2 TLSv1.3;
    ssl_ciphers               HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache         shared:SSL:10m;
    ssl_session_timeout       10m;

    # OCSP Stapling
    ssl_stapling         on;
    ssl_stapling_verify  on;
    resolver             1.1.1.1 8.8.8.8;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Advertise HTTP/3
    add_header Alt-Svc 'h3=":443"; ma=86400';

    location / {
        proxy_pass http://backend;
    }
}
```

---

## 6. Building with Alternative TLS Libraries

### BoringSSL

```bash
./configure --with-http_v3_module --with-cc-opt="-I/path/to/boringssl/include" \
    --with-ld-opt="-L/path/to/boringssl/build/crypto -L/path/to/boringssl/build/ssl"
```

### QuicTLS

```bash
./configure --with-http_v3_module --with-cc-opt="-I/path/to/quictls/include" \
    --with-ld-opt="-L/path/to/quictls/lib"
```

### LibreSSL

```bash
./configure --with-http_v3_module --with-cc-opt="-I/path/to/libressl/include" \
    --with-ld-opt="-L/path/to/libressl/lib"
```

---

## 7. Security Defaults & Recommendations

### Modern Minimum

```nginx
ssl_protocols             TLSv1.2 TLSv1.3;
ssl_ciphers               ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache         shared:SSL:10m;
ssl_session_timeout       10m;
ssl_session_tickets       off;
ssl_buffer_size           4k;           # reduce TTFB
ssl_early_data            on;           # 0-RTT (requires caution)
ssl_stapling              on;
ssl_stapling_verify       on;
```

### HTTPS Redirect

```nginx
server {
    listen      80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

### HSTS

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```
