# NGINX Security Hardening Guide

## OS-Level Hardening

### Run as Non-Root User

```
user nginx;
worker_processes auto;
pid /var/run/nginx.pid;
```

- Never run nginx as root for worker processes
- Master process runs as root (binds to privileged ports), workers drop privileges

### File Permissions

```
chmod 640 /etc/nginx/nginx.conf
chmod 640 /etc/nginx/ssl/*
chmod 700 /etc/nginx/ssl/
chown -R root:nginx /etc/nginx/
```

- Private keys: 600 or 640, root:nginx
- Config files: 640, root:nginx
- Log files: 640, nginx:nginx

### Restrict Directories

```
chroot /var/www  # if using chroot
```

## SSL/TLS Best Practices

### Protocol Selection

```
ssl_protocols TLSv1.2 TLSv1.3;
```

Reject SSLv2, SSLv3, TLSv1.0, TLSv1.1 (all have known vulnerabilities).

### Cipher Selection

```
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
```

- Prioritize AEAD ciphers (GCM, Chacha20-Poly1305)
- Disable weak: `!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!DSS`

### DH Parameters

```
ssl_dhparam /etc/nginx/ssl/dhparam.pem;
```

Generate: `openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048`

### HSTS

```
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### OCSP Stapling

```
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/ssl/ca-certificates.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
```

### Session Configuration

```
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
```

### Certificate Management

- Use ECDSA certs when possible (faster than RSA)
- Keep private keys secure with proper file permissions
- Use ACME for automated renewal (NGINX Plus)

## Access Control

### IP-Based Restrictions

```
location /admin {
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    deny all;
}
```

### Geo-Based Restrictions

```
geo $blocked_country {
    default 0;
    CN 1;
    RU 1;
}
if ($blocked_country) {
    return 403;
}
```

### Basic Authentication

```
location /private {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

### JWT Authentication (Plus)

```
location /api {
    auth_jwt "API Access";
    auth_jwt_key_file /etc/nginx/keys/public.pem;
}
```

## Rate Limiting (DDoS Protection)

### Connection Limiting

```
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;
```

### Request Rate Limiting

```
limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;
limit_req zone=req_limit burst=20 nodelay;
```

### Stream Connection Limiting

```
stream {
    limit_conn_zone $binary_remote_addr zone=stream_conn:10m;
    server {
        limit_conn stream_conn 20;
    }
}
```

## Request Size Limits

```
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
client_max_body_size 1m;
```

- `client_max_body_size`: Prevents large upload DoS (default 1m)
- `client_body_buffer_size`: Buffers request body (default 8k/16k)
- `client_header_buffer_size`: Buffers header (default 1k)
- `large_client_header_buffers`: For long URIs/cookies

## Hide NGINX Version

```
server_tokens off;
```

Also set in `sub_filter` or `proxy_hide_header` to remove `Server` header.

## Timeout Controls (Slow Loris Protection)

```
client_body_timeout 12s;
client_header_timeout 12s;
keepalive_timeout 15s;
send_timeout 10s;
```

For stream:

```
proxy_connect_timeout 10s;
proxy_timeout 30s;
```

## Buffer Overflow Protections

```
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
output_buffers 32 32k;
postpone_output 1460;
```

## HTTPS Redirect Enforcement

```
server {
    listen 80 default_server;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    # SSL config...
}
```

## Security Headers

```
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" always;
add_header Cross-Origin-Embedder-Policy require-corp always;
add_header Cross-Origin-Opener-Policy same-origin always;
add_header Cross-Origin-Resource-Policy same-origin always;
```

## Secure Upstream Communication

```
proxy_ssl on;
proxy_ssl_verify on;
proxy_ssl_trusted_certificate /etc/nginx/ssl/upstream-ca.pem;
proxy_ssl_protocols TLSv1.2 TLSv1.3;
proxy_ssl_server_name on;
```

For stream:

```
proxy_ssl on;
proxy_ssl_verify on;
proxy_ssl_trusted_certificate /etc/nginx/ssl/upstream-ca.pem;
```

## Deny Access to Hidden Files

```
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}
location ~ ~$ {
    deny all;
}
```

## Restrict HTTP Methods

```
if ($request_method !~ ^(GET|HEAD|POST)$) {
    return 405;
}
```

Or using `limit_except`:

```
location /api {
    limit_except GET POST {
        deny all;
    }
}
```

## Referer Validation

```
valid_referers none blocked server_names
    ~\.(example\.com)$;
if ($invalid_referer) {
    return 403;
}
```

## Secure Links Module (Hotlink Protection)

```
location ~ \.(jpg|jpeg|png|gif|webp)$ {
    valid_referers none blocked example.com *.example.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

For NGINX Plus, use `secure_link` with HMAC:

```
location /files/ {
    secure_link $arg_md5,$arg_expires;
    secure_link_md5 "$secure_link_expires$uri$remote_addr secret";
    if ($secure_link = "") { return 403; }
    if ($secure_link = "0") { return 410; }
}
```

## WebSocket Security

```
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400s;
}
```

## HTTP/2 Security

```
http2_max_concurrent_streams 128;
http2_recv_timeout 10s;
http2_idle_timeout 30s;
http2_chunk_size 8k;
```

## HTTP/3 (QUIC) Security

```
quic_retry on;
quic_gso on;
quic_bpf on;  # Linux 5.19+ with BPF
```

## Additional Security Measures

### Limit Number of Connections per IP

```
limit_conn_zone $binary_remote_addr zone=addr:10m;
server {
    limit_conn addr 10;
}
```

### Disable Unused Modules

When building from source:
```
./configure --without-http_autoindex_module \
            --without-http_ssi_module \
            --without-http_userid_module \
            --without-http_geo_module
```

### Restrict resolver to trusted networks

```
resolver 127.0.0.1 [::1]:5353 valid=300s;
```

### Disable server info in error pages

```
server_tokens off;
```

### Control access to the API (Plus)

```
location /api {
    api write=on;
    allow 127.0.0.1;
    deny all;
}
```

## Security Checklist

- [ ] Run as non-root user
- [ ] Disable `server_tokens`
- [ ] Enable HTTPS with TLSv1.2/TLSv1.3 only
- [ ] Strong cipher selection
- [ ] Enable HSTS
- [ ] Enable OCSP stapling
- [ ] Set request size limits
- [ ] Set appropriate timeouts
- [ ] Restrict access by IP/CIDR
- [ ] Enable rate limiting
- [ ] Add security headers
- [ ] Hide hidden files
- [ ] Restrict HTTP methods
- [ ] Validate referers
- [ ] Secure upstream connections with SSL
- [ ] Protect private keys with proper permissions
- [ ] Keep NGINX updated
- [ ] Disable unused modules
