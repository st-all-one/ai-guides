# NGINX Mail Module Reference (IMAP/POP3/SMTP Proxy)

## Overview

The mail modules enable NGINX to act as a mail proxy server for IMAP, POP3, and SMTP protocols. Built with `--with-mail`.

## ngx_mail_core_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| listen | `listen address:port [ssl] [proxy_protocol] [backlog=number] [rcvbuf=size] [sndbuf=size] [bind] [ipv6only=on\|off] [multipath] [so_keepalive=...]` | — | server | Socket for accepting connections |
| mail | `mail { ... }` | — | main | Mail configuration context |
| max_errors | `max_errors number` | 5 | mail, server | Protocol errors before closing (1.21.0) |
| protocol | `protocol imap\|pop3\|smtp` | — | server | Protocol for proxied server |
| resolver | `resolver address ... [valid=time] [ipv4=on\|off] [ipv6=on\|off] [status_zone=zone]` | off | mail, server | DNS servers for client hostname |
| resolver_timeout | `resolver_timeout time` | 30s | mail, server | DNS query timeout |
| server | `server { ... }` | — | mail | Server configuration |
| server_name | `server_name name` | hostname | mail, server | Server name for greeting/salt/EHLO |
| timeout | `timeout time` | 60s | mail, server | Timeout before proxying to backend |

### listen Parameters

| Parameter | Description |
|-----------|-------------|
| `ssl` | All connections on this port use SSL |
| `proxy_protocol` | PROXY protocol (1.19.8) |
| `backlog=number` | Pending connection queue length |
| `rcvbuf=size` | SO_RCVBUF for listening socket (1.11.13) |
| `sndbuf=size` | SO_SNDBUF for listening socket (1.11.13) |
| `bind` | Separate bind() call |
| `ipv6only=on\|off` | IPv6 socket behavior |
| `multipath` | Multipath TCP (Linux 5.6+, 1.29.7) |
| `so_keepalive=...` | TCP keepalive configuration |

### Automatic Protocol Detection

| Protocol | Ports |
|----------|-------|
| imap | 143, 993 |
| pop3 | 110, 995 |
| smtp | 25, 587, 465 |

---

## ngx_mail_ssl_module (--with-mail_ssl_module)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssl | `ssl on\|off` | off | mail, server | **Obsolete** (removed 1.25.1), use `listen ... ssl` |
| ssl_certificate | `ssl_certificate file` | — | mail, server | PEM certificate |
| ssl_certificate_compression | `ssl_certificate_compression on\|off` | off | mail, server | TLS 1.3 cert compression (1.29.1) |
| ssl_certificate_key | `ssl_certificate_key file` | — | mail, server | PEM secret key |
| ssl_ciphers | `ssl_ciphers ciphers` | HIGH:!aNULL:!MD5 | mail, server | Enabled ciphers |
| ssl_client_certificate | `ssl_client_certificate file` | — | mail, server | CA certs for client verification |
| ssl_conf_command | `ssl_conf_command name value` | — | mail, server | OpenSSL config (1.19.4) |
| ssl_crl | `ssl_crl file` | — | mail, server | Revoked certificates |
| ssl_dhparam | `ssl_dhparam file` | — | mail, server | DH parameters |
| ssl_ecdh_curve | `ssl_ecdh_curve curve` | auto | mail, server | ECDHE curve |
| ssl_password_file | `ssl_password_file file` | — | mail, server | Key passphrases |
| ssl_prefer_server_ciphers | `ssl_prefer_server_ciphers on\|off` | off | mail, server | Server cipher preference |
| ssl_protocols | `ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3]` | TLSv1.2 TLSv1.3 | mail, server | Enabled protocols |
| ssl_session_cache | `ssl_session_cache off\|none\|[builtin[:size]] [shared:name:size]` | none | mail, server | Session cache |
| ssl_session_ticket_key | `ssl_session_ticket_key file` | — | mail, server | Session ticket key |
| ssl_session_tickets | `ssl_session_tickets on\|off` | on | mail, server | Session tickets |
| ssl_session_timeout | `ssl_session_timeout time` | 5m | mail, server | Session cache timeout |
| ssl_trusted_certificate | `ssl_trusted_certificate file` | — | mail, server | Trusted CA (not sent to clients) |
| ssl_verify_client | `ssl_verify_client on\|off\|optional\|optional_no_ca` | off | mail, server | Client cert verification |
| ssl_verify_depth | `ssl_verify_depth number` | 1 | mail, server | Verification depth |
| starttls | `starttls on\|off\|only` | off | mail, server | STARTTLS support |

### starttls Values

| Value | Description |
|-------|-------------|
| `on` | Allow STLS/STARTTLS commands |
| `off` | Deny STLS/STARTTLS |
| `only` | Require TLS before authentication |

---

## ngx_mail_auth_http_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_http | `auth_http URL` | — | mail, server | HTTP authentication server URL |
| auth_http_header | `auth_http_header header value` | — | mail, server | Custom header for auth requests |
| auth_http_pass_client_cert | `auth_http_pass_client_cert on\|off` | off | mail, server | Send client cert to auth server |
| auth_http_timeout | `auth_http_timeout time` | 60s | mail, server | Auth server timeout |

### Auth HTTP Protocol

#### Request Headers (sent to auth server)

| Header | Description |
|--------|-------------|
| `Auth-Method` | `plain`, `apop`, `cram-md5`, `external`, `none` |
| `Auth-User` | Username |
| `Auth-Pass` | Password or response |
| `Auth-Protocol` | `imap`, `pop3`, `smtp` |
| `Auth-Login-Attempt` | Attempt number |
| `Client-IP` | Client IP address |
| `Client-Host` | Client hostname |
| `Auth-Salt` | Salt for APOP/CRAM-MD5 |
| `Auth-SSL` | `on` if SSL connection |
| `Auth-SSL-Protocol` | SSL protocol (1.21.2) |
| `Auth-SSL-Cipher` | SSL cipher (1.21.2) |
| `Auth-SSL-Verify` | `SUCCESS`, `FAILED:reason`, `NONE` |
| `Auth-SSL-Subject` | Client cert subject |
| `Auth-SSL-Issuer` | Client cert issuer |
| `Auth-SSL-Serial` | Client cert serial |
| `Auth-SSL-Fingerprint` | Client cert SHA1 fingerprint |
| `Auth-SSL-Cert` | Full client cert (if enabled) |
| `Proxy-Protocol-Addr` | PROXY protocol client address |
| `Proxy-Protocol-Port` | PROXY protocol client port |
| `Proxy-Protocol-Server-Addr` | PROXY server address |
| `Proxy-Protocol-Server-Port` | PROXY server port |
| `Auth-SMTP-Helo` | SMTP HELO/EHLO value |
| `Auth-SMTP-From` | SMTP MAIL FROM |
| `Auth-SMTP-To` | SMTP RCPT TO |

#### Response Headers (expected from auth server)

| Header | Description |
|--------|-------------|
| `Auth-Status` | `OK` or error message |
| `Auth-Server` | Backend server address |
| `Auth-Port` | Backend server port |
| `Auth-Pass` | Plain-text password for APOP/CRAM-MD5 |
| `Auth-User` | Override username |
| `Auth-Wait` | Seconds to wait before retry |
| `Auth-Error-Code` | SMTP error code (e.g., `451 4.3.0`) |

---

## ngx_mail_proxy_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_buffer | `proxy_buffer size` | 4k\|8k | mail, server | Buffer size for proxying |
| proxy_pass_error_message | `proxy_pass_error_message on\|off` | off | mail, server | Pass backend errors to client |
| proxy_protocol | `proxy_protocol on\|off` | off | mail, server | PROXY protocol to backend (1.19.8) |
| proxy_smtp_auth | `proxy_smtp_auth on\|off` | off | mail, server | AUTH command on SMTP backend (1.19.4) |
| proxy_timeout | `proxy_timeout timeout` | 24h | mail, server | Timeout between read/write operations |
| xclient | `xclient on\|off` | on | mail, server | XCLIENT command to SMTP backend |

### XCLIENT Behavior

When enabled (default), nginx sends:
1. `EHLO` with server name
2. `XCLIENT` with client parameters
3. `EHLO` or `HELO` as received from client

When disabled, nginx sends `EHLO`/`HELO` with server name.

---

## ngx_mail_smtp_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| smtp_auth | `smtp_auth method ...` | plain login | mail, server | Permitted SASL auth methods |
| smtp_capabilities | `smtp_capabilities extension ...` | — | mail, server | SMTP protocol extensions |
| smtp_client_buffer | `smtp_client_buffer size` | 4k\|8k | mail, server | Buffer for reading SMTP commands |
| smtp_greeting_delay | `smtp_greeting_delay time` | 0 | mail, server | Delay before SMTP greeting |

### SMTP Auth Methods

| Method | Description |
|--------|-------------|
| `plain` | AUTH PLAIN (RFC 4616) |
| `login` | AUTH LOGIN |
| `cram-md5` | AUTH CRAM-MD5 (RFC 2195, needs unencrypted password) |
| `external` | AUTH EXTERNAL (1.11.6) |
| `none` | No authentication required |

---

## ngx_mail_imap_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| imap_auth | `imap_auth method ...` | plain | mail, server | Permitted auth methods |
| imap_capabilities | `imap_capabilities extension ...` | IMAP4 IMAP4rev1 UIDPLUS | mail, server | IMAP capabilities |
| imap_client_buffer | `imap_client_buffer size` | 4k\|8k | mail, server | Buffer for reading IMAP commands |

### IMAP Auth Methods

| Method | Description |
|--------|-------------|
| `plain` | LOGIN command, AUTH=PLAIN (RFC 4616) |
| `login` | AUTH=LOGIN |
| `cram-md5` | AUTH=CRAM-MD5 (RFC 2195, needs unencrypted password) |
| `external` | AUTH=EXTERNAL (1.11.6) |

---

## ngx_mail_pop3_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| pop3_auth | `pop3_auth method ...` | plain | mail, server | Permitted auth methods |
| pop3_capabilities | `pop3_capabilities extension ...` | TOP USER UIDL | mail, server | POP3 capabilities |

### POP3 Auth Methods

| Method | Description |
|--------|-------------|
| `plain` | USER/PASS, AUTH PLAIN, AUTH LOGIN |
| `apop` | APOP (RFC 1939, needs unencrypted password) |
| `cram-md5` | AUTH CRAM-MD5 (RFC 2195, needs unencrypted password) |
| `external` | AUTH EXTERNAL (1.11.6) |

---

## ngx_mail_realip_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| set_real_ip_from | `set_real_ip_from address\|CIDR\|unix:` | — | mail, server | Trusted PROXY protocol addresses (1.19.8) |

---

## Variables

### Core Variables

| Variable | Description |
|----------|-------------|
| `$auth_http_time` | Time spent in auth HTTP request (1.31.0, Plus) |
| `$mail_server` | Mail server name |
| `$mail_ssl` | `on` if SSL/TLS is used |

### Protocol-Specific Variables

**IMAP:**
- `$imap_user` - IMAP user
- `$imap_pass` - IMAP password (raw)

**POP3:**
- `$pop3_user` - POP3 user
- `$pop3_pass` - POP3 password (raw)

**SMTP:**
- `$smtp_helo_name` - HELO/EHLO name
- `$smtp_from` - MAIL FROM value
- `$smtp_to` - RCPT TO value (list of comma-separated recipients)

**SSL:**
- `$ssl_cipher` - Used cipher
- `$ssl_client_verify` - Client cert verification
- `$ssl_protocol` - SSL/TLS protocol version
- `$ssl_server_name` - Server name from SNI
- `$ssl_session_id` - Session identifier
- `$ssl_session_reused` - Whether session was reused
