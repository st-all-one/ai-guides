# HTTP Load Balancing

## Overview

The `ngx_http_upstream_module` defines groups of servers referenced by `proxy_pass`, `fastcgi_pass`, `uwsgi_pass`, `scgi_pass`, `memcached_pass`, and `grpc_pass`.

---

## Upstream Block

### upstream

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| upstream | `upstream name { ... }` | — | `http` | Defines a group of servers. Servers can listen on different ports; TCP and UNIX-domain sockets can be mixed. |

**Example:**
```nginx
upstream backend {
    server backend1.example.com weight=5;
    server 127.0.0.1:8080       max_fails=3 fail_timeout=30s;
    server unix:/tmp/backend3;
    server backup1.example.com  backup;
}
```

Requests are distributed via weighted round-robin by default. If a server fails, the request passes to the next server. If all servers fail, the client receives the last server's response.

### server

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| server | `server address [parameters]` | — | `upstream` | Defines an upstream server address and optional parameters. |

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `weight=number` | Server weight (default: 1). |
| `max_conns=number` | Max simultaneous connections to the proxied server (0 = no limit, since 1.11.5). Per-worker unless in shared memory. |
| `max_fails=number` | Number of consecutive unsuccessful attempts within `fail_timeout` to mark server unavailable (default: 1, 0 = disabled). |
| `fail_timeout=time` | Time during which `max_fails` must occur, and how long the server is considered unavailable (default: 10s). |
| `backup` | Marks server as backup; used only when primary servers are unavailable. Cannot be used with `hash`, `ip_hash`, or `random`. |
| `down` | Marks server as permanently unavailable. |
| `resolve` | Monitors DNS changes for the domain name and auto-updates upstream (requires `resolver` and shared memory). OSS since 1.27.3. |
| `service=name` | Enables DNS SRV record resolution; requires `resolve` parameter and hostname without port (since 1.9.13). OSS since 1.27.3. |
| `route=string` | Sets server route name for session persistence. OSS since 1.29.6. |
| `drain` | Puts server into draining mode; only bound requests are proxied to it (since 1.13.6). OSS since 1.29.6. |
| `slow_start=time` | Time for server to recover weight from zero to nominal after becoming healthy (Plus). Cannot be used with `hash`, `ip_hash`, or `random`. |

> **Note:** If only a single server exists, `max_fails`, `fail_timeout`, and `slow_start` are ignored.

---

## Load Balancing Methods

### Round-Robin (Default)

No directive needed. Weighted round-robin distributes requests proportionally.

### least_conn

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| least_conn | `least_conn;` | — | `upstream` | Passes request to server with least active connections, accounting for weights. |

### least_time (Plus → OSS since 1.31.0)

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| least_time | `least_time header \| last_byte [inflight]` | — | `upstream` | Passes request to server with lowest avg response time and least active connections. `header` = time to first byte; `last_byte` = full response time; `inflight` includes incomplete requests (since 1.7.10). |

### ip_hash

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ip_hash | `ip_hash;` | — | `upstream` | Uses first three octets of IPv4 (or full IPv6) as hash key for session persistence. Mark removed servers as `down` to preserve hashing. |

### hash

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hash | `hash key [consistent]` | — | `upstream` | Hashed key for client-server mapping. Supports variables. `consistent` uses ketama consistent hashing to minimize remapping when servers change (since 1.7.2). |

### random

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| random | `random [two [method]]` | — | `upstream` | Selects random server accounting for weights. `two` selects two random servers then picks one using method (`least_conn` default, or `least_time=header\|last_byte`). `least_time` method is Plus (since 1.15.1). |

---

## Shared Memory and State

### zone

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| zone | `zone name [size]` | — | `upstream` | Defines shared memory zone for group config and runtime state across workers (since 1.9.0). Enables dynamic reconfiguration via API (Plus). |

### state

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| state | `state file` | — | `upstream` | Specifies file that persists dynamically configurable group state (Plus, since 1.9.7). Cannot be used with `server` directive. |

---

## Keepalive Connections

### keepalive

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keepalive | `keepalive connections [local]` | `keepalive 32 local;` | `upstream` | Caches idle keepalive connections to upstream servers per worker (since 1.1.4). `local` disables sharing across locations. Since 1.29.7, enabled by default with 32 connections. |

### keepalive_requests

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keepalive_requests | `keepalive_requests number` | `keepalive_requests 1000;` | `upstream` | Max requests per keepalive connection (since 1.15.3). |

### keepalive_time

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keepalive_time | `keepalive_time time` | `keepalive_time 1h;` | `upstream` | Max time requests can be processed through one keepalive connection (since 1.19.10). |

### keepalive_timeout

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keepalive_timeout | `keepalive_timeout timeout` | `keepalive_timeout 60s;` | `upstream` | Timeout for idle keepalive connections (since 1.15.3). |

> For HTTP upstreams, `proxy_http_version 1.1;` and clearing `Connection` header are required (automatic since 1.29.7).

---

## NTLM Authentication (Plus)

### ntlm

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ntlm | `ntlm;` | — | `upstream` | Enables NTLM authentication proxying. Binds upstream connection to client after `Authorization: Negotiate` or `NTLM`. Requires keepalive enabled (Plus, since 1.9.2). |

---

## Queue (Plus)

### queue

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| queue | `queue number [timeout=time]` | — | `upstream` | If no upstream server can be selected immediately, request is queued. Max queue size = `number`; `timeout` defaults to 60s. Returns 502 on overflow/timeout (Plus, since 1.5.12). |

---

## Resolver Integration

### resolver

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| resolver | `resolver address ... [valid=time] [ipv4=on\|off] [ipv6=on\|off] [status_zone=zone]` | — | `upstream` | Configures DNS name servers for resolving upstream server names (OSS since 1.27.3). |

### resolver_timeout

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| resolver_timeout | `resolver_timeout time` | `resolver_timeout 30s;` | `upstream` | Timeout for name resolution (OSS since 1.27.3). |

---

## Session Persistence / Sticky (Plus → OSS since 1.29.6)

### sticky

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| sticky | `sticky cookie name [expires=time] [domain=domain] [httponly] [samesite=strict\|lax\|none\|$variable] [secure] [path=path]` | — | `upstream` | Enables session affinity. Three methods: `cookie`, `route`, `learn`. |

**`cookie` method:** NGINX generates an HTTP cookie with the server route.
```nginx
upstream backend {
    server backend1.example.com route=a;
    server backend2.example.com route=b;
    sticky cookie srv_id expires=1h domain=.example.com path=/;
}
```

**`route` method:** Proxied server assigns a route; subsequent requests carry routing info in cookie or URI.

**`learn` method:** NGINX learns server-initiated sessions from upstream responses.
```nginx
upstream backend {
    sticky learn
           create=$upstream_cookie_examplecookie
           lookup=$cookie_examplecookie
           zone=client_sessions:1m;
}
```

---

## Health Checks

### Passive Health Checks (OSS)

Built into upstream module via `max_fails` and `fail_timeout` parameters. If a server fails, it is marked as failed and avoided for `fail_timeout`.

### Active Health Checks (Plus)

Provided by `ngx_http_upstream_hc_module`. The upstream group must be in shared memory.

#### health_check

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| health_check | `health_check [parameters]` | — | `location` | Enables periodic health checks (Plus). |

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `interval=time` | 5s | Interval between checks |
| `jitter=time` | none | Random delay range for each check |
| `fails=number` | 1 | Consecutive failures to mark unhealthy |
| `passes=number` | 1 | Consecutive passes to mark healthy |
| `uri=uri` | `/` | URI for health check requests |
| `mandatory [persistent]` | — | Initial "checking" state until first check completes; `persistent` preserves "up" state across reloads |
| `match=name` | status 2xx/3xx | Named match block defining pass criteria |
| `port=number` | server port | Port for health check connections |
| `type=grpc [grpc_service=name] [grpc_status=code]` | — | gRPC health checking protocol |
| `keepalive_time=time` | disabled | Enables keepalive for health checks |

#### match

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| match | `match name { ... }` | — | `http` | Defines named test set for health check response verification (Plus). |

**Match tests:**
- `status 200;` / `status ! 500;` / `status 200 204;` / `status 200-399;`
- `header Content-Type = text/html;` / `!=` / `~ regex` / `!~ regex` / `header Name;` / `header ! Name;`
- `body ~ "regex";` / `body !~ "regex";`
- `require $variable ...;` — all specified variables must be non-empty and non-zero

> Only first 256K of response body examined.

---

## Dynamic Reconfiguration

### upstream_conf (Legacy, Plus)

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| upstream_conf | `upstream_conf;` | — | `location` | Enables HTTP interface for on-the-fly upstream configuration (deprecated since 1.13.3, replaced by API module). |

**Query parameters:** `stream=`, `upstream=name`, `id=number`, `remove=`, `add=`, `backup=`, `server=address`, `service=name`, `weight=`, `max_conns=`, `max_fails=`, `fail_timeout=`, `slow_start=`, `down=`, `up=`, `drain=`, `route=`

Example: `http://127.0.0.1/upstream_conf?upstream=backend`

### API-based Reconfiguration (Plus)

Since 1.13.3, the `ngx_http_api_module` supersedes `upstream_conf`. Upstream groups using `zone` directive can be reconfigured via REST API.

---

## Embedded Variables

| Variable | Description |
|----------|-------------|
| `$upstream_addr` | IP:port or UNIX-socket of upstream server(s). Multiple servers separated by commas; groups separated by colons. |
| `$upstream_bytes_received` | Bytes received from upstream (1.11.4). |
| `$upstream_bytes_sent` | Bytes sent to upstream (1.15.8). |
| `$upstream_cache_status` | Cache status: `MISS`, `BYPASS`, `EXPIRED`, `STALE`, `UPDATING`, `REVALIDATED`, `HIT`. |
| `$upstream_connect_time` | Connection establishment time in seconds with ms resolution (1.9.1). |
| `$upstream_cookie_name` | Cookie from upstream `Set-Cookie` header (1.7.1). |
| `$upstream_header_time` | Time to receive response header (1.7.10). |
| `$upstream_http_name` | Upstream response header fields (e.g. `$upstream_http_server`). |
| `$upstream_last_addr` | IP/address of last selected upstream (Plus, 1.29.3). |
| `$upstream_last_server_name` | Name of last selected upstream server (Plus, 1.25.3). |
| `$upstream_queue_time` | Time spent in upstream queue (Plus, 1.13.9). |
| `$upstream_response_length` | Response length in bytes (0.7.27). |
| `$upstream_response_time` | Time to receive full response (ms resolution). |
| `$upstream_status` | Upstream response status code(s). 502 if no server selected. |
| `$upstream_trailer_name` | Fields from end of upstream response (1.13.10). |

---

## proxy_next_upstream and Related

| Directive | Description |
|-----------|-------------|
| `proxy_next_upstream error \| timeout \| invalid_header \| http_500 \| http_502 \| http_503 \| http_504 \| http_403 \| http_404 \| http_429 \| non_idempotent \| off ...` | Specifies when a request should be passed to the next server. |
| `proxy_next_upstream_tries number` | Limits number of possible server passes (default: 0 = unlimited). |
| `proxy_next_upstream_timeout time` | Timeout for passing to next server (default: 0 = unlimited). |

Analogous directives exist for `fastcgi_`, `uwsgi_`, `scgi_`, `memcached_`, and `grpc_`.

---

## Example: Complete Upstream Configuration

```nginx
resolver 10.0.0.1 valid=30s;

upstream backend {
    zone backend 64k;
    least_conn;

    server app1.example.com weight=3 max_conns=100;
    server app2.example.com weight=2 max_fails=3 fail_timeout=30s slow_start=60s;
    server app3.example.com resolve;

    server backup1.example.com backup;

    keepalive 64;
    keepalive_requests 1000;
    keepalive_timeout 120s;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        health_check interval=10s fails=3 passes=2;
    }
}
```
