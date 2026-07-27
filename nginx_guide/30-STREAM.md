# NGINX Stream Module Reference (TCP/UDP)

## Overview

The `ngx_stream_core_module` (since 1.9.0) enables TCP and UDP (1.9.13) proxying. Enabled with `--with-stream`.

## Stream Processing Phases

```
Post-accept -> Pre-access -> Access -> SSL -> Preread -> Content -> Log
```

| Phase | Description | Modules |
|-------|-------------|---------|
| Post-accept | After accepting connection | `ngx_stream_realip_module` |
| Pre-access | Preliminary access check | `ngx_stream_limit_conn_module`, `ngx_stream_set_module` |
| Access | Client access limitation | `ngx_stream_access_module`, `js_access` |
| SSL | TLS/SSL termination | `ngx_stream_ssl_module` |
| Preread | Read initial bytes | `ngx_stream_ssl_preread_module`, `js_preread` |
| Content | Data processing (proxying, returning) | `ngx_stream_proxy_module`, `ngx_stream_return_module`, `ngx_stream_pass_module`, `js_filter` |
| Log | Logging | `ngx_stream_log_module` |

---

## ngx_stream_core_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| listen | `listen address:port [default_server] [ssl] [udp] [proxy_protocol] [setfib=number] [fastopen=number] [backlog=number] [rcvbuf=size] [sndbuf=size] [accept_filter=filter] [deferred] [bind] [ipv6only=on\|off] [reuseport] [multipath] [so_keepalive=on\|off\|keepidle:keepintvl:keepcnt]` | — | server | Sets address and port for accepting connections |
| preread_buffer_size | `preread_buffer_size size` | 16k | stream, server | Size of the preread buffer |
| preread_timeout | `preread_timeout timeout` | 30s | stream, server | Timeout for preread phase |
| proxy_protocol_timeout | `proxy_protocol_timeout timeout` | 30s | stream, server | Timeout for reading PROXY protocol header |
| resolver | `resolver address ... [valid=time] [ipv4=on\|off] [ipv6=on\|off] [status_zone=zone]` | — | stream, server | Configures DNS servers |
| resolver_timeout | `resolver_timeout time` | 30s | stream, server | Timeout for DNS resolution |
| server | `server { ... }` | — | stream | Virtual server configuration |
| server_name | `server_name name ...` | "" | server | Virtual server names (1.25.5) |
| server_names_hash_bucket_size | `server_names_hash_bucket_size size` | 32\|64\|128 | stream | Bucket size for server names hash |
| server_names_hash_max_size | `server_names_hash_max_size size` | 512 | stream | Max size of server names hash |
| stream | `stream { ... }` | — | main | Stream configuration context |
| tcp_nodelay | `tcp_nodelay on\|off` | on | stream, server | Enable/disable TCP_NODELAY |
| variables_hash_bucket_size | `variables_hash_bucket_size size` | 64 | stream | Bucket size for variables hash |
| variables_hash_max_size | `variables_hash_max_size size` | 1024 | stream | Max size for variables hash |

### listen Parameters

| Parameter | Description |
|-----------|-------------|
| `default_server` | Sets as default server for address:port pair (1.25.5) |
| `ssl` | All connections on this port work in SSL mode |
| `udp` | Configures listening for datagrams (1.9.13) |
| `proxy_protocol` | All connections use PROXY protocol (1.11.4, v2 since 1.13.11) |
| `setfib=number` | Sets FIB routing table (FreeBSD, 1.25.5) |
| `fastopen=number` | TCP Fast Open (1.21.0) |
| `backlog=number` | Pending connection queue length |
| `rcvbuf=size` | Receive buffer size (1.11.13) |
| `sndbuf=size` | Send buffer size (1.11.13) |
| `accept_filter=filter` | Accept filter (FreeBSD/NetBSD, 1.25.5) |
| `deferred` | Deferred accept() on Linux (1.25.5) |
| `bind` | Separate bind() call for address:port |
| `ipv6only=on\|off` | IPv6 socket behavior |
| `reuseport` | Per-worker listening sockets (1.9.1) |
| `multipath` | Multipath TCP (Linux 5.6+, 1.29.7) |
| `so_keepalive` | TCP keepalive configuration |

### server_name Matching Priority

1. Exact name
2. Longest wildcard starting with `*` (e.g., `*.example.com`)
3. Longest wildcard ending with `*` (e.g., `mail.*`)
4. First matching regex (in order of appearance)

### Core Variables

| Variable | Description |
|----------|-------------|
| `$binary_remote_addr` | Client address in binary form |
| `$bytes_received` | Bytes received from client (1.11.4) |
| `$bytes_sent` | Bytes sent to client |
| `$connection` | Connection serial number |
| `$hostname` | Host name |
| `$msec` | Current time in seconds with ms resolution |
| `$nginx_version` | NGINX version |
| `$pid` | Worker process PID |
| `$protocol` | TCP or UDP (1.11.4) |
| `$proxy_protocol_addr` | Client address from PROXY header (1.11.4) |
| `$proxy_protocol_port` | Client port from PROXY header (1.11.4) |
| `$proxy_protocol_server_addr` | Server address from PROXY header (1.17.6) |
| `$proxy_protocol_server_port` | Server port from PROXY header (1.17.6) |
| `$proxy_protocol_tlv_<name>` | TLV from PROXY protocol header (1.23.2) |
| `$remote_addr` | Client address |
| `$remote_port` | Client port |
| `$server_addr` | Server address |
| `$server_port` | Server port |
| `$session_time` | Session duration in seconds (1.11.4) |
| `$status` | Session status (200, 400, 403, 500, 502, 503) |
| `$time_iso8601` | Local time in ISO 8601 |
| `$time_iso8601_ms` | Local time in ISO 8601 with ms (1.29.8, Plus) |
| `$time_local` | Local time in Common Log Format |

### PROXY Protocol TLV Type Names

| Name | Code | Description |
|------|------|-------------|
| `alpn` | 0x01 | Upper layer protocol |
| `authority` | 0x02 | Host name from client |
| `unique_id` | 0x05 | Unique connection ID |
| `netns` | 0x30 | Namespace name |
| `ssl` | 0x20 | Binary SSL TLV structure |

### SSL TLV Type Names (accessed with `ssl_` prefix)

| Name | Code | Description |
|------|------|-------------|
| `ssl_version` | 0x21 | SSL version used |
| `ssl_cn` | 0x22 | SSL certificate Common Name |
| `ssl_cipher` | 0x23 | Used cipher name |
| `ssl_sig_alg` | 0x24 | Certificate signature algorithm |
| `ssl_key_alg` | 0x25 | Public-key algorithm |
| `ssl_verify` | — | Client SSL cert verification result (0 = success) |

### Session Status Values

| Code | Description |
|------|-------------|
| 200 | Session completed successfully |
| 400 | Bad client data (e.g., PROXY protocol header) |
| 403 | Access forbidden |
| 500 | Internal server error |
| 502 | Bad gateway (upstream unreachable) |
| 503 | Service unavailable (connection limit) |

---

## ngx_stream_proxy_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_bind | `proxy_bind address [transparent] \| off` | — | stream, server | Local IP for outgoing connections |
| proxy_bind_dynamic | `proxy_bind_dynamic on\|off` | off | stream, server | Bind at each connection (1.29.3, Plus) |
| proxy_buffer_size | `proxy_buffer_size size` | 16k | stream, server | Buffer size for proxied server data |
| proxy_connect_timeout | `proxy_connect_timeout time` | 60s | stream, server | Connection timeout to proxied server |
| proxy_download_rate | `proxy_download_rate rate` | 0 | stream, server | Rate limit for reading from proxied server (bytes/sec) |
| proxy_half_close | `proxy_half_close on\|off` | off | stream, server | Enable TCP half-close (1.21.4) |
| proxy_next_upstream | `proxy_next_upstream on\|off` | on | stream, server | Pass to next server on failure |
| proxy_next_upstream_timeout | `proxy_next_upstream_timeout time` | 0 | stream, server | Time limit for next server tries |
| proxy_next_upstream_tries | `proxy_next_upstream_tries number` | 0 | stream, server | Number of next server tries |
| proxy_pass | `proxy_pass address` | — | server | Set proxied server address |
| proxy_protocol | `proxy_protocol on\|off` | off | stream, server | Enable PROXY protocol upstream |
| proxy_requests | `proxy_requests number` | 0 | stream, server | Datagrams before new UDP session (1.15.7) |
| proxy_responses | `proxy_responses number` | — | stream, server | Expected UDP response datagrams |
| proxy_session_drop | `proxy_session_drop on\|off` | off | stream, server | Terminate sessions on server removal (Plus) |
| proxy_socket_keepalive | `proxy_socket_keepalive on\|off` | off | stream, server | TCP keepalive to proxied server |
| proxy_socket_rcvbuf | `proxy_socket_rcvbuf size` | — | stream, server | SO_RCVBUF for upstream (1.31.3) |
| proxy_socket_sndbuf | `proxy_socket_sndbuf size` | — | stream, server | SO_SNDBUF for upstream (1.31.3) |
| proxy_ssl | `proxy_ssl on\|off` | off | stream, server | Enable SSL to proxied server |
| proxy_ssl_alpn | `proxy_ssl_alpn protocol ...` | — | stream, server | ALPN protocols (1.31.0) |
| proxy_ssl_certificate | `proxy_ssl_certificate file` | — | stream, server | Certificate for upstream auth |
| proxy_ssl_certificate_cache | `proxy_ssl_certificate_cache off \| max=N [inactive=time] [valid=time]` | off | stream, server | Cache for variable certs (1.27.4) |
| proxy_ssl_certificate_key | `proxy_ssl_certificate_key file` | — | stream, server | Secret key for upstream auth |
| proxy_ssl_ciphers | `proxy_ssl_ciphers ciphers` | DEFAULT | stream, server | Ciphers for upstream SSL |
| proxy_ssl_conf_command | `proxy_ssl_conf_command name value` | — | stream, server | OpenSSL config commands (1.19.4) |
| proxy_ssl_crl | `proxy_ssl_crl file` | — | stream, server | CRL for upstream cert verification |
| proxy_ssl_key_log | `proxy_ssl_key_log path` | — | stream, server | Log SSL keys to file (1.27.2, Plus) |
| proxy_ssl_name | `proxy_ssl_name name` | host from proxy_pass | stream, server | Override SNI/server name |
| proxy_ssl_password_file | `proxy_ssl_password_file file` | — | stream, server | Passphrase file for secret keys |
| proxy_ssl_protocols | `proxy_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3]` | TLSv1.2 TLSv1.3 | stream, server | SSL protocols for upstream |
| proxy_ssl_server_name | `proxy_ssl_server_name on\|off` | off | stream, server | Enable SNI to upstream |
| proxy_ssl_session_reuse | `proxy_ssl_session_reuse on\|off` | on | stream, server | Reuse SSL sessions upstream |
| proxy_ssl_trusted_certificate | `proxy_ssl_trusted_certificate file` | — | stream, server | Trusted CA for upstream verification |
| proxy_ssl_verify | `proxy_ssl_verify on\|off` | off | stream, server | Verify upstream certificate |
| proxy_ssl_verify_depth | `proxy_ssl_verify_depth number` | 1 | stream, server | Verification depth |
| proxy_timeout | `proxy_timeout timeout` | 10m | stream, server | Timeout between read/write operations |
| proxy_upload_rate | `proxy_upload_rate rate` | 0 | stream, server | Rate limit for reading from client (bytes/sec) |

---

## ngx_stream_ssl_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssl_alpn | `ssl_alpn protocol ...` | — | stream, server | List of supported ALPN protocols (1.21.4) |
| ssl_certificate | `ssl_certificate file` | — | stream, server | PEM certificate file |
| ssl_certificate_cache | `ssl_certificate_cache off \| max=N [inactive=time] [valid=time]` | off | stream, server | Cache for variable certs (1.27.4) |
| ssl_certificate_compression | `ssl_certificate_compression on\|off` | off | stream, server | TLS 1.3 certificate compression (1.29.1) |
| ssl_certificate_key | `ssl_certificate_key file` | — | stream, server | PEM secret key |
| ssl_ciphers | `ssl_ciphers ciphers` | HIGH:!aNULL:!MD5 | stream, server | Enabled ciphers |
| ssl_client_certificate | `ssl_client_certificate file` | — | stream, server | CA certs for client verification |
| ssl_conf_command | `ssl_conf_command name value` | — | stream, server | OpenSSL config (1.19.4) |
| ssl_crl | `ssl_crl file` | — | stream, server | Revoked certificates |
| ssl_dhparam | `ssl_dhparam file` | — | stream, server | DH parameters for DHE ciphers |
| ssl_ecdh_curve | `ssl_ecdh_curve curve` | auto | stream, server | ECDHE curve |
| ssl_ech_file | `ssl_ech_file file` | — | stream, server | Encrypted ClientHello config (1.29.4) |
| ssl_handshake_timeout | `ssl_handshake_timeout time` | 60s | stream, server | SSL handshake timeout |
| ssl_key_log | `ssl_key_log path` | — | stream, server | Log SSL keys for Wireshark (1.27.2, Plus) |
| ssl_ocsp | `ssl_ocsp on\|off\|leaf` | off | stream, server | OCSP validation of client certs (1.27.2) |
| ssl_ocsp_cache | `ssl_ocsp_cache off \| shared:name:size` | off | stream, server | OCSP result cache (1.27.2) |
| ssl_ocsp_responder | `ssl_ocsp_responder url` | — | stream, server | Override OCSP responder (1.27.2) |
| ssl_password_file | `ssl_password_file file` | — | stream, server | Passphrases for keys |
| ssl_prefer_server_ciphers | `ssl_prefer_server_ciphers on\|off` | off | stream, server | Prefer server ciphers |
| ssl_protocols | `ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3]` | TLSv1.2 TLSv1.3 | stream, server | Enabled SSL protocols |
| ssl_reject_handshake | `ssl_reject_handshake on\|off` | off | stream, server | Reject SSL handshakes (1.25.5) |
| ssl_session_cache | `ssl_session_cache off\|none\|[builtin[:size]] [shared:name:size]` | none | stream, server | SSL session cache |
| ssl_session_ticket_key | `ssl_session_ticket_key file` | — | stream, server | TLS session ticket key |
| ssl_session_tickets | `ssl_session_tickets on\|off` | on | stream, server | Enable session tickets |
| ssl_session_timeout | `ssl_session_timeout time` | 5m | stream, server | Session cache timeout |
| ssl_stapling | `ssl_stapling on\|off` | off | stream, server | OCSP stapling (1.27.2) |
| ssl_stapling_file | `ssl_stapling_file file` | — | stream, server | OCSP response from file (1.27.2) |
| ssl_stapling_responder | `ssl_stapling_responder url` | — | stream, server | Override OCSP responder (1.27.2) |
| ssl_stapling_verify | `ssl_stapling_verify on\|off` | off | stream, server | Verify OCSP response (1.27.2) |
| ssl_trusted_certificate | `ssl_trusted_certificate file` | — | stream, server | Trusted CA certs |
| ssl_verify_client | `ssl_verify_client on\|off\|optional\|optional_no_ca` | off | stream, server | Client cert verification |
| ssl_verify_depth | `ssl_verify_depth number` | 1 | stream, server | Verification depth |

### SSL Variables

| Variable | Description |
|----------|-------------|
| `$ssl_alpn_protocol` | ALPN-negotiated protocol (1.21.4) |
| `$ssl_cipher` | Cipher name for established connection |
| `$ssl_ciphers` | List of client-supported ciphers (1.11.7) |
| `$ssl_client_cert` | Client certificate in PEM format |
| `$ssl_client_fingerprint` | SHA1 fingerprint of client cert |
| `$ssl_client_i_dn` | Issuer DN of client cert |
| `$ssl_client_raw_cert` | Client cert as-is in PEM |
| `$ssl_client_s_dn` | Subject DN of client cert |
| `$ssl_client_serial` | Serial number of client cert |
| `$ssl_client_v_end` | End date of client cert |
| `$ssl_client_v_remain` | Days until client cert expires |
| `$ssl_client_v_start` | Start date of client cert |
| `$ssl_client_verify` | Client cert verification result |
| `$ssl_curves` | Client-supported curves (1.11.7) |
| `$ssl_protocol` | SSL protocol for established connection |
| `$ssl_server_name` | Server name from SNI |
| `$ssl_session_id` | Session identifier |
| `$ssl_session_reused` | Whether session was reused |

---

## ngx_stream_upstream_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| upstream | `upstream name { ... }` | — | stream | Defines a group of servers |
| server | `server address [parameters]` | — | upstream | Defines a server |
| zone | `zone name [size]` | — | upstream | Shared memory zone for group |
| state | `state file` | — | upstream | Persistent state file (Plus) |
| hash | `hash key [consistent]` | — | upstream | Hash-based load balancing |
| least_conn | `least_conn` | — | upstream | Least connections balancing |
| least_time | `least_time connect\|first_byte\|last_byte [inflight]` | — | upstream | Least time balancing (Plus) |
| random | `random [two [method]]` | — | upstream | Random load balancing |
| resolver | `resolver address ... [valid=time] [ipv4=on\|off] [ipv6=on\|off] [status_zone=zone]` | — | upstream | DNS resolver (1.27.3) |
| resolver_timeout | `resolver_timeout time` | 30s | upstream | DNS timeout (1.27.3) |

### server Parameters

| Parameter | Description |
|-----------|-------------|
| `weight=number` | Server weight (default: 1) |
| `max_conns=number` | Max simultaneous connections (1.11.5) |
| `max_fails=number` | Max failures before unavailable (default: 1) |
| `fail_timeout=time` | Time for failures and unavailability period (default: 10s) |
| `backup` | Mark as backup server |
| `down` | Mark as permanently unavailable |
| `resolve` | Monitor DNS changes (1.27.3) |
| `service=name` | DNS SRV record resolution |
| `slow_start=time` | Gradual weight recovery (Plus) |

### Upstream Variables

| Variable | Description |
|----------|-------------|
| `$upstream_addr` | Upstream server IP:port or socket path |
| `$upstream_bytes_received` | Bytes received from upstream |
| `$upstream_bytes_sent` | Bytes sent to upstream |
| `$upstream_connect_time` | Time to connect to upstream |
| `$upstream_first_byte_time` | Time to receive first byte |
| `$upstream_last_addr` | Last selected upstream server (1.29.3, Plus) |
| `$upstream_session_time` | Session duration with upstream |

---

## ngx_stream_upstream_hc_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| health_check | `health_check [parameters]` | — | server | Enable periodic health checks |
| health_check_timeout | `health_check_timeout timeout` | 5s | stream, server | Health check timeout |
| match | `match name { ... }` | — | stream | Named test set for health checks |

### health_check Parameters

| Parameter | Description |
|-----------|-------------|
| `interval=time` | Interval between checks (default: 5s) |
| `jitter=time` | Random delay range |
| `fails=number` | Consecutive failures before unhealthy (default: 1) |
| `passes=number` | Consecutive passes before healthy (default: 1) |
| `mandatory [persistent]` | Initial "checking" state |
| `match=name` | Named match block |
| `port=number` | Port for health check |
| `udp` | Use UDP instead of TCP |

### match Parameters

| Parameter | Description |
|-----------|-------------|
| `send string` | Send string to server |
| `expect string \| ~ regex` | Expected response data |

---

## ngx_stream_log_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| access_log | `access_log path format [buffer=size] [gzip[=level]] [flush=time] [if=condition]` | off | stream, server | Sets access log |
| log_format | `log_format name [escape=default\|json\|none] string ...` | — | stream | Specifies log format |
| open_log_file_cache | `open_log_file_cache max=N [inactive=time] [min_uses=N] [valid=time]` | off | stream, server | Cache for log file descriptors |

---

## ngx_stream_limit_conn_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn | `limit_conn zone number` | — | stream, server | Max connections per key |
| limit_conn_dry_run | `limit_conn_dry_run on\|off` | off | stream, server | Dry run mode (1.17.6) |
| limit_conn_log_level | `limit_conn_log_level info\|notice\|warn\|error` | error | stream, server | Log level for limit_conn |
| limit_conn_zone | `limit_conn_zone key zone=name:size` | — | stream | Shared memory zone for limits |

### Variables

| Variable | Description |
|----------|-------------|
| `$limit_conn_status` | PASSED, REJECTED, REJECTED_DRY_RUN (1.17.6) |

---

## ngx_stream_access_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| allow | `allow address\|CIDR\|unix:\|all` | — | stream, server | Allow access |
| deny | `deny address\|CIDR\|unix:\|all` | — | stream, server | Deny access |

---

## ngx_stream_geo_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geo | `geo [$address] $variable { ... }` | — | stream | Creates variable based on IP |

### geo Parameters

| Parameter | Description |
|-----------|-------------|
| `delete` | Deletes specified network |
| `default` | Default value (empty string if not set) |
| `include` | Include file with addresses |
| `ranges` | Addresses specified as ranges |
| `volatile` | Variable is not cacheable (1.29.3) |

---

## ngx_stream_geoip_module (--with-stream_geoip_module)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_country | `geoip_country file` | — | stream | Country database |
| geoip_city | `geoip_city file` | — | stream | City database |
| geoip_org | `geoip_org file` | — | stream | Organization database |

### GeoIP Variables (Country)

| Variable | Description |
|----------|-------------|
| `$geoip_country_code` | Two-letter country code |
| `$geoip_country_code3` | Three-letter country code |
| `$geoip_country_name` | Country name |

### GeoIP Variables (City)

| Variable | Description |
|----------|-------------|
| `$geoip_area_code` | Telephone area code (US only) |
| `$geoip_city_continent_code` | Two-letter continent code |
| `$geoip_city_country_code` | Two-letter country code |
| `$geoip_city_country_code3` | Three-letter country code |
| `$geoip_city_country_name` | Country name |
| `$geoip_dma_code` | DMA region code |
| `$geoip_latitude` | Latitude |
| `$geoip_longitude` | Longitude |
| `$geoip_region` | Two-symbol region code |
| `$geoip_region_name` | Region name |
| `$geoip_city` | City name |
| `$geoip_postal_code` | Postal code |
| `$geoip_org` | Organization name |

---

## ngx_stream_map_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| map | `map string $variable { ... }` | — | stream | Creates variable based on another variable |
| map_hash_bucket_size | `map_hash_bucket_size size` | 32\|64\|128 | stream | Hash bucket size |
| map_hash_max_size | `map_hash_max_size size` | 2048 | stream | Hash max size |

### map Search Priority

1. String value without mask
2. Longest prefix mask (`*.example.com`)
3. Longest suffix mask (`mail.*`)
4. First matching regex
5. Default value

### map Parameters

| Parameter | Description |
|-----------|-------------|
| `default value` | Default resulting value |
| `hostnames` | Source values can be hostnames with masks |
| `include file` | Include file with values |
| `volatile` | Variable is not cacheable (1.11.7) |

---

## ngx_stream_keyval_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keyval | `keyval key $variable zone=name` | — | stream | Creates variable from key-value DB |
| keyval_zone | `keyval_zone zone=name:size [state=file] [timeout=time] [type=string\|ip\|prefix] [sync]` | — | stream | Key-value shared memory zone |

### keyval_zone type values

| Type | Description |
|------|-------------|
| `string` | Exact match (default) |
| `ip` | IP/CIDR match |
| `prefix` | Prefix match |

---

## ngx_stream_realip_module (--with-stream_realip_module)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| set_real_ip_from | `set_real_ip_from address\|CIDR\|unix:` | — | stream, server | Trusted addresses |

### Variables

| Variable | Description |
|----------|-------------|
| `$realip_remote_addr` | Original client address |
| `$realip_remote_port` | Original client port |

---

## ngx_stream_ssl_preread_module (--with-stream_ssl_preread_module)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssl_preread | `ssl_preread on\|off` | off | stream, server | Extract info from ClientHello |

### Variables

| Variable | Description |
|----------|-------------|
| `$ssl_preread_protocol` | Highest SSL version supported by client (1.15.2) |
| `$ssl_preread_server_name` | Server name from SNI |
| `$ssl_preread_alpn_protocols` | List of ALPN protocols (1.13.10) |

---

## ngx_stream_zone_sync_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| zone_sync | `zone_sync` | — | server | Enable zone synchronization |
| zone_sync_buffers | `zone_sync_buffers number size` | 8 4k\|8k | stream, server | Buffer count and size |
| zone_sync_connect_retry_interval | `zone_sync_connect_retry_interval time` | 1s | stream, server | Retry interval |
| zone_sync_connect_timeout | `zone_sync_connect_timeout time` | 5s | stream, server | Connection timeout |
| zone_sync_interval | `zone_sync_interval time` | 1s | stream, server | Polling interval |
| zone_sync_recv_buffer_size | `zone_sync_recv_buffer_size size` | 4k\|8k | stream, server | Receive buffer size |
| zone_sync_server | `zone_sync_server address [resolve]` | — | server | Cluster node address |
| zone_sync_ssl | `zone_sync_ssl on\|off` | off | stream, server | Enable SSL for sync |
| zone_sync_ssl_certificate | `zone_sync_ssl_certificate file` | — | stream, server | Certificate for sync |
| zone_sync_ssl_certificate_key | `zone_sync_ssl_certificate_key file` | — | stream, server | Key for sync |
| zone_sync_ssl_ciphers | `zone_sync_ssl_ciphers ciphers` | DEFAULT | stream, server | Ciphers for sync |
| zone_sync_ssl_conf_command | `zone_sync_ssl_conf_command name value` | — | stream, server | OpenSSL commands (1.19.4) |
| zone_sync_ssl_crl | `zone_sync_ssl_crl file` | — | stream, server | CRL for sync |
| zone_sync_ssl_name | `zone_sync_ssl_name name` | host from zone_sync_server | stream, server | SNI name (1.15.7) |
| zone_sync_ssl_password_file | `zone_sync_ssl_password_file file` | — | stream, server | Passphrases for keys |
| zone_sync_ssl_protocols | `zone_sync_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3]` | TLSv1.2 TLSv1.3 | stream, server | SSL protocols |
| zone_sync_ssl_server_name | `zone_sync_ssl_server_name on\|off` | off | stream, server | SNI (1.15.7) |
| zone_sync_ssl_trusted_certificate | `zone_sync_ssl_trusted_certificate file` | — | stream, server | Trusted CA |
| zone_sync_ssl_verify | `zone_sync_ssl_verify on\|off` | off | stream, server | Verify certificate |
| zone_sync_ssl_verify_depth | `zone_sync_ssl_verify_depth number` | 1 | stream, server | Verify depth |
| zone_sync_timeout | `zone_sync_timeout timeout` | 5s | stream, server | Sync timeout |

API endpoint: `/stream/zone_sync/`

---

## ngx_stream_mqtt_filter_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mqtt | `mqtt on\|off` | off | stream, server | Enable MQTT protocol |
| mqtt_buffers | `mqtt_buffers number size` | 100 1k | stream, server | MQTT message buffers (1.25.1) |
| mqtt_rewrite_buffer_size | `mqtt_rewrite_buffer_size size` | 4k\|8k | server | Obsolete, use mqtt_buffers |
| mqtt_set_connect | `mqtt_set_connect field value` | — | server | Set CONNECT message fields |

### mqtt_set_connect Fields

| Field | Description |
|-------|-------------|
| `clientid` | MQTT client ID |
| `username` | MQTT username |
| `password` | MQTT password |

---

## ngx_stream_mqtt_preread_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mqtt_preread | `mqtt_preread on\|off` | off | stream, server | Extract MQTT CONNECT info |

### Variables

| Variable | Description |
|----------|-------------|
| `$mqtt_preread_clientid` | Client ID from CONNECT message |
| `$mqtt_preread_username` | Username from CONNECT message |

---

## ngx_stream_set_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| set | `set $variable value` | — | server | Set variable value |

---

## ngx_stream_return_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| return | `return value` | — | server | Send value and close connection |

---

## ngx_stream_pass_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| pass | `pass address` | — | server | Pass connection to listening socket (1.25.5) |

---

## ngx_stream_split_clients_module

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| split_clients | `split_clients string $variable { ... }` | — | stream | A/B testing variable using MurmurHash2 |

---

## ngx_stream_num_map_module (Plus)

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| num_map | `num_map [$number] $variable { ... }` | — | stream | Creates variable based on numeric ranges |

Supported special parameters: `default`, `include`, `volatile`.

---

## ngx_stream_proxy_protocol_vendor_module (Plus)

### Variables

| Variable | Description |
|----------|-------------|
| `$proxy_protocol_tlv_aws_vpce_id` | AWS VPC endpoint ID |
| `$proxy_protocol_tlv_azure_pel_id` | Azure private endpoint link ID |
| `$proxy_protocol_tlv_gcp_conn_id` | Google Cloud PSC connection ID |

---

## ngx_stream_js_module

See [40-NJS.md](40-NJS.md) for njs directives including `js_access`, `js_preread`, `js_filter`, `js_set`, `js_var`, `js_import`, `js_engine`, `js_fetch_*`, `js_shared_dict_zone`, `js_periodic`, `js_preload_object`.

### Stream-Specific Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| js_access | `js_access module.function` | — | stream, server | njs function at access phase |
| js_context_reuse | `js_context_reuse number` | 128 | stream, server | Max JS contexts to reuse (0.8.6) |
| js_engine | `js_engine njs\|qjs` | njs | stream, server | JS engine selection (0.8.6) |
| js_fetch_* | various | — | stream, server | Fetch API configuration |
| js_filter | `js_filter module.function` | — | stream, server | Data filter at content phase |
| js_import | `js_import module.js \| export_name from module.js` | — | stream, server | Import njs module (0.4.0) |
| js_include | `js_include file` | — | stream | Obsolete, use js_import |
| js_load_stream_native_module | `js_load_stream_native_module path [as name]` | — | main | Load native module (0.9.5) |
| js_path | `js_path path` | — | stream, server | Additional path for modules |
| js_periodic | `js_periodic module.function [interval=time] [jitter=number] [worker_affinity=mask]` | — | server | Periodic handler (0.8.1) |
| js_preload_object | `js_preload_object name.json \| name from file.json` | — | stream, server | Preload JSON object (0.7.8) |
| js_preread | `js_preread module.function` | — | stream, server | njs function at preread phase |
| js_set | `js_set $variable module.function [nocache]` | — | stream, server | njs variable handler |
| js_shared_dict_zone | `js_shared_dict_zone zone=name:size [timeout=time] [type=string\|number] [evict] [state=file]` | — | stream | Shared dictionary (0.8.0) |
| js_var | `js_var $variable [value]` | — | stream, server | Declare writable variable (0.5.3) |
