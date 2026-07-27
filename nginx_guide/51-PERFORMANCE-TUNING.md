# NGINX Performance Tuning Guide

## Worker Process Tuning

### worker_processes

```
worker_processes auto;   # Recommended: auto (detects CPU count)
```

Set to number of CPU cores. For SSL-heavy workloads, consider `worker_processes * 2` to avoid SSL overhead blocking.

### worker_cpu_affinity

```
worker_cpu_affinity auto;  # Bind workers to CPU cores
```

Manual example (4 cores):
```
worker_cpu_affinity 0001 0010 0100 1000;
```

### worker_rlimit_nofile

```
worker_rlimit_nofile 65535;  # Max open file limit per worker
```

Must be set in main context before `events {}`.

## Event Processing

### worker_connections

```
events {
    worker_connections 1024;   # Per worker
    use epoll;                 # Linux; kqueue on BSD
    multi_accept on;           # Accept multiple connections
    accept_mutex on;           # Thundering herd prevention
    accept_mutex_delay 500ms;
}
```

- **Linux**: `epoll` (best performance)
- **FreeBSD**: `kqueue`
- **Solaris**: `/dev/poll` or `eventport`
- **Windows**: `select` or `poll`

### Recommended Event Configuration

```
events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
    accept_mutex off;   # For high-traffic with reuseport
}
```

With `reuseport`, set `accept_mutex off` since kernel distributes connections.

## TCP Tuning

### sendfile

```
sendfile on;            # Efficient file serving
sendfile_max_chunk 512k; # Per-call transfer limit
```

### tcp_nopush / tcp_nodelay

```
tcp_nopush on;   # Optimize packet headers (sendfile)
tcp_nodelay on;  # Disable Nagle's algorithm
```

### Keepalive Configuration

```
keepalive_timeout 65;
keepalive_requests 100;
```

## SSL Session Caching

```
ssl_session_cache shared:SSL:10m;   # ~40,000 sessions in 10MB
ssl_session_timeout 10m;
ssl_session_tickets off;            # Use cache instead for control
```

- 1MB shared cache ≈ 4,000 sessions
- Use shared cache over built-in (avoids memory fragmentation)

### SSL Hardware Offload

- Use `ssl_engine` for hardware acceleration (e.g., Intel QAT)
- ECDSA certs are faster than RSA for handshakes
- Session resumption reduces handshake overhead significantly

```
ssl_engine qat;  # Example with Intel QAT
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...;
ssl_prefer_server_ciphers on;
```

## Gzip Compression Tuning

```
gzip on;
gzip_comp_level 3;                 # Balance speed/ratio (1-9)
gzip_min_length 1000;              # Skip small responses
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
gzip_proxied any;
gzip_vary on;
gzip_disable "msie6";
gzip_buffers 32 4k;               # Buffer allocation
```

- Level 3-5 gives good compression without high CPU cost
- Level 6+ has diminishing returns
- For API responses, compression can be detrimental (small payloads)

## Proxy Buffering

```
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 8k;
proxy_busy_buffers_size 16k;
proxy_max_temp_file_size 0;       # Avoid temp files
```

### For Large Upstream Responses

```
proxy_buffer_size 8k;
proxy_buffers 256 8k;             # 2MB total buffer
proxy_busy_buffers_size 64k;
```

### Disable Buffering for Real-Time

```
proxy_buffering off;
proxy_buffer_size 4k;
```

## Proxy Cache Tuning

```
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cache:10m 
                 max_size=10g inactive=60m use_temp_path=off;

proxy_cache_key "$scheme$request_method$host$request_uri";
proxy_cache_valid 200 302 60m;
proxy_cache_valid 404 1m;
proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
```

### Cache Size Calculations

- `keys_zone=10m` stores ~80,000-160,000 keys
- `max_size=10g` limits disk cache to 10GB
- `levels=1:2` spreads cache files across directories to prevent one-dir slowness

### Cache Bypass for Dynamic Content

```
proxy_cache_bypass $cookie_nocache $arg_nocache$arg_comment;
proxy_no_cache $http_pragma $http_authorization;
```

## HTTP/2 Tuning

```
http2_max_concurrent_streams 128;      # Default: 128
http2_recv_timeout 10s;                # Idle timeout
http2_idle_timeout 30s;                # Connection idle timeout
http2_chunk_size 8k;                   # Response chunk size
http2_max_requests 1000;               # Requests per connection
http2_max_field_size 4k;               # Header field size
http2_max_header_size 16k;             # Total header size
```

## HTTP/3 (QUIC) Tuning

```
quic_gso on;              # Generic Segmentation Offload
quic_retry on;            # Anti-amplification
quic_bpf on;              # BPF for connection steering (Linux 5.19+)
quic_early_data on;       # 0-RTT
```

Requires `--with-http_v3_module` and `ssl_protocols TLSv1.3`.

## Open File Cache

```
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 60s;
open_file_cache_min_uses 2;
open_file_cache_errors on;   # Cache "no file" errors too
```

- Reduces `stat()` system calls
- `max`: Maximum cached entries
- `inactive`: Remove if unused for this time
- `min_uses`: Minimum hits before caching

## Log Buffer Tuning

```
access_log /var/log/nginx/access.log main buffer=64k flush=5s;
```

- `buffer=64k`: Writes in 64KB chunks instead of per-request
- `flush=5s`: Force flush if buffer not full

## Thread Pools for Blocking Operations

```
thread_pool default threads=32 max_queue=65536;
aio threads=default;               # For sendfile with threads
```

Requires `--with-threads`. Use with:

```
location /download {
    aio threads;
    directio 4m;           # Direct I/O for files > 4MB
    output_buffers 1 128k;
}
```

## OS-Level Tuning

### Linux sysctl Settings

```
# /etc/sysctl.conf

# Max open files
fs.file-max = 2097152

# TCP socket backlog
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# TCP buffer sizes
net.core.rmem_default = 65536
net.core.wmem_default = 65536
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# TCP Fast Open
net.ipv4.tcp_fastopen = 3

# Connection reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Ephemeral port range
net.ipv4.ip_local_port_range = 1024 65000

# Keepalive
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5

# SYN backlog protection
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2

# TCP slow start after idle
net.ipv4.tcp_slow_start_after_idle = 0
```

## Connection Pooling

```
upstream backend {
    server backend1.example.com:80 weight=5;
    server backend2.example.com:80;

    keepalive 32;                    # Idle keepalive connections
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

For HTTP:

```
proxy_http_version 1.1;
proxy_set_header Connection "";
```

## Load Balancing Algorithm Selection

| Algorithm | Use Case | Directive |
|-----------|----------|-----------|
| Round-robin | Default, even distribution | (default) |
| Least connections | Variable request times | `least_conn` |
| IP hash | Session persistence | `ip_hash` |
| Hash | Cache-friendly routing | `hash $request_uri consistent` |
| Random | Statistical distribution | `random two least_conn` |
| Least time (Plus) | Fastest response | `least_time header` |

## Memory Tuning

### Connection Pool Memory

```
worker_connections 4096;   # Each connection ~232 bytes
```

### Buffer Allocation

```
client_body_buffer_size 128k;   # Per request
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
output_buffers 32 32k;          # Per connection output
postpone_output 1460;           # One TCP MSS
```

### Proxy Buffer Sizing

```
proxy_buffer_size 4k;           # Header buffer (per request)
proxy_buffers 8 8k;             # Data buffers (per request)
proxy_busy_buffers_size 16k;    # Busy buffer limit
```

## DirectIO vs Sendfile

- **sendfile**: Zero-copy for static files (best performance)
- **directio**: Direct disk I/O bypassing page cache (for large files)

```
location /download {
    sendfile on;
    directio 4m;           # Use directio for files > 4MB
    aio on;                # Async I/O
}
```

## Proxy Protocol Overhead

When using PROXY protocol v2, overhead is ~12 bytes per connection v2 header + TCP header. Ensure:
- Backend servers accept PROXY protocol
- Only trusted sources can send PROXY headers

## Performance Testing

### Testing Tools

| Tool | Purpose |
|------|---------|
| `ab` (Apache Bench) | Basic HTTP load testing |
| `wrk` | Modern HTTP benchmarking |
| `wrk2` | Latency-focused benchmarking |
| `h2load` | HTTP/2 specific testing |
| `siege` | Regression testing |
| `locust` | Python-based load testing |
| `k6` | Scriptable load testing |
| `nginx -t` | Configuration validation |
| `nginx -T` | Test + print full config |

### Key Metrics

| Metric | Target | Tool/Method |
|--------|--------|-------------|
| Requests/sec | As high as possible | wrk, ab |
| Latency p50 | < 100ms | wrk2 |
| Latency p99 | < 500ms | wrk2 |
| Error rate | < 0.01% | All tools |
| Connection count | Monitored | `ss -s`, netstat |
| CPU usage | < 80% | top, htop, mpstat |
| Memory usage | Stable | free -m, /proc/meminfo |
| Disk I/O | < 50% | iostat -x 1 |

### Example wrk Command

```
wrk -t12 -c400 -d30s --latency http://localhost:8080/
```

### Monitoring

```
# Live connection stats
curl http://localhost/api/9/connections

# Active connections
curl http://localhost/nginx_status

# Worker metrics
curl http://localhost/api/9/workers
```

## Performance Tuning Checklist

- [ ] Set `worker_processes auto`
- [ ] Use `epoll` event model on Linux
- [ ] Enable `sendfile` and `tcp_nopush`
- [ ] Configure SSL session cache (shared)
- [ ] Tune `worker_connections` to `ulimit -n`
- [ ] Enable gzip with appropriate level
- [ ] Configure proxy buffers properly
- [ ] Use cache for static content
- [ ] Tune `keepalive_timeout` and `keepalive_requests`
- [ ] Set `open_file_cache`
- [ ] Use buffered access logs
- [ ] Tune OS kernel parameters (sysctl)
- [ ] Consider thread pools for blocking I/O
- [ ] Use HTTP/2 with multiplexing
- [ ] Monitor and benchmark before/after changes
