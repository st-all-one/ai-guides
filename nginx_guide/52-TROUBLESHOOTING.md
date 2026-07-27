# NGINX Troubleshooting Guide

## Configuration Testing

### Test Configuration Syntax

```
nginx -t          # Test configuration (validates syntax + opens files)
nginx -T          # Test configuration + print (includes all config files)
nginx -t -s reload # Test then reload if valid
```

Common output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Common Configuration Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `[emerg] unknown directive` | Typo in directive name | Check spelling |
| `[emerg] invalid number of arguments` | Wrong parameter count | Check directive syntax |
| `[emerg] "server" directive is not allowed here` | Wrong context | Move to correct block |
| `[emerg] duplicate "default" server` | Multiple default_server | Remove extra |
| `[emerg] "listen" directive duplicate` | Same address:port used twice | Use unique pairs |
| `[emerg] cannot load certificate` | SSL file missing/bad perms | Check path and permissions |
| `[emerg] bind() to 0.0.0.0:80 failed` | Port in use | `lsof -i :80` or `fuser 80/tcp` |
| `[emerg] mkdir() failed` | Directory doesn't exist | Create directory |

## Debug Logging

### Enable Debug Log

```
error_log /var/log/nginx/error.log debug;   # In main context
```

Selective debug per server/location:
```
error_log /var/log/nginx/error.log info;
server {
    error_log /var/log/nginx/server-debug.log debug;
    # ...
}
```

### Debug Modules

```
error_log /var/log/nginx/error.log debug|debug_http|debug_ssl|debug_upstream|debug_event;
```

### Analyze Debug Log

```
grep -E "^(20[0-9]{2}/[0-9]{2}|[0-9]{4})" /var/log/nginx/error.log
tail -f /var/log/nginx/error.log | grep "error"
```

## Error Log Interpretation

### Log Levels (increasing severity)

| Level | Description |
|-------|-------------|
| `debug` | Debugging info |
| `info` | Informational |
| `notice` | Notice (config reload) |
| `warn` | Warning |
| `error` | Error |
| `crit` | Critical |
| `alert` | Immediate action needed |
| `emerg` | Emergency (system unstable) |

### Common Error Log Messages

| Message | Meaning | Action |
|---------|---------|--------|
| `accept() failed (53: Software caused connection abort)` | Client disconnect | Safe to ignore |
| `connect() failed (111: Connection refused)` | Upstream down | Check backend |
| `connect() failed (110: Connection timed out)` | Upstream unreachable | Check network/firewall |
| `upstream timed out (110: Connection timed out)` | Backend slow | Increase proxy_read_timeout |
| `upstream prematurely closed connection` | Backend crash | Check backend logs |
| `no live upstreams` | All upstreams down | Check health checks |
| `ssl_stapling: certificate status request failed` | OCSP responder down | Check resolver |
| `recv() failed (104: Connection reset by peer)` | Client disconnect | Safe to ignore |
| `*1 open socket #1 left in connection 1` | Connection leaks | Debug keepalive |

## "accept() failed" Errors (Backlog Exhaustion)

### Error Message
```
accept() failed (24: Too many open files)
accept() failed (88: Socket operation on non-socket)
2013/12/09 12:15:25 [emerg] 12345#0: accept() failed (24: Too many open files)
```

### Root Causes

1. **Backlog queue full**: Too many simultaneous connection attempts
2. **File descriptor limit**: `worker_rlimit_nofile` too low
3. **Socket queue overflow**: `net.core.somaxconn` too low

### Solutions

```
# 1. Increase backlog
listen 80 backlog=65535;

# 2. Increase fd limit
worker_rlimit_nofile 65535;

# 3. OS tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535
```

## "sys_errlist" Deprecation Warning

### Error Message

```
"sys_errlist" is deprecated on Linux, use "strerror" instead
```

### Cause

This is a warning from older Linux kernels/glibc about `sys_errlist[]` symbol being deprecated. It appears in builds using older toolchains.

### Fix

- Update to newer glibc (> 2.31)
- Rebuild nginx with newer toolchain
- The warning is harmless but should be fixed during upgrades

## Chunked Encoding Issues

### Symptoms

- `upstream sent invalid chunked response` errors
- Malformed responses when proxying
- Content-Length + Transfer-Encoding: chunked conflict

### Causes

1. Backend sends invalid chunked encoding
2. HTTP/1.0 backend with chunked responses
3. Body filter modules modifying content without updating headers

### Solutions

```
# Disable chunked transfer encoding
proxy_set_header Connection "";  # Force HTTP/1.0

# Or disable buffering
proxy_buffering off;

# Fix backend to send valid chunked responses
```

## daemon/master_process off Testing

### Usage in Testing

```
daemon off;          # Run in foreground (non-daemon)
master_process off;  # Run without master process
```

These are useful for:
- Debugging with gdb/lldb
- Testing configurations interactively
- Running inside containers

### Warning

```
nginx: [alert] running with "daemon off" or "master_process off" 
should not be used in production
```

## SSL Handshake Errors

### Common SSL Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SSL_do_handshake() failed` | SSL handshake failure | Check cert/key match |
| `no suitable key share` | TLS 1.3 key share issue | Add key_share to ssl_conf_command |
| `no shared cipher` | No common ciphers | Broaden cipher list |
| `certificate not yet valid` | Cert not yet active | Check system time |
| `certificate has expired` | Cert expired | Renew certificate |
| `self-signed certificate` | Untrusted cert | Add to trusted chain |

### SSL Debugging

```
openssl s_client -connect example.com:443 -servername example.com
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -showcerts
```

## 502 Bad Gateway

### Common Causes

| Cause | Check | Fix |
|-------|-------|-----|
| Upstream down | `curl http://127.0.0.1:8080` | Start/fix backend |
| Upstream timeout | proxy_connect_timeout | Increase timeout |
| Firewall blocking | `telnet backend 8080` | Open firewall |
| DNS failure | `dig backend.example.com` | Fix DNS/resolver |
| Upstream buffer full | proxy_buffer_size | Increase buffers |
| Unix socket permission | `ls -la /tmp/backend.sock` | Fix socket permissions |

### Debugging

```
# Check upstream is alive
curl -I http://backend:8080/health

# Test with explicit timeout
curl -m 5 http://backend:8080/slow-endpoint

# Check nginx debug log
tail -f /var/log/nginx/error.log | grep upstream
```

## 499 Client Closed Request

### Cause

Client closed the connection before receiving the response. Usually caused by:
- Client timeout too low
- Upstream timeout too high
- Long-running requests
- Browser tab closed

### Solutions

```
# Reduce upstream timeouts
proxy_read_timeout 30s;
proxy_send_timeout 30s;

# Or increase client timeouts
client_body_timeout 30s;
client_header_timeout 30s;
```

## Permission Errors

### File Access

| Error | Cause | Fix |
|-------|-------|-----|
| `open() "/var/www/file" failed (13: Permission denied)` | nginx can't read file | `chmod 644` or `chown nginx` |
| `mkdir() "/var/cache/nginx" failed (13: Permission denied)` | Can't create cache dir | `mkdir -p` with proper ownership |
| `socket() failed (13: Permission denied)` | Can't create socket | Check SELinux/AppArmor |

### Socket Creation

```
# Check unix socket permissions
ls -la /var/run/nginx.sock

# Ensure user has write permission
chown nginx:nginx /var/run/nginx.sock
```

### SELinux

```
# Check SELinux status
getenforce
sestatus

# Allow nginx network connections
setsebool -P httpd_can_network_connect 1

# Allow nginx to proxy
setsebool -P httpd_can_network_relay 1

# View SELinux denials
ausearch -m avc -ts recent
grep nginx /var/log/audit/audit.log
```

## Rewrite Loop Detection

### Error Message

```
rewrite or internal redirection cycle while processing "/"
```

### Causes

1. Infinite redirect loop caused by contradictory rewrite rules
2. `try_files` pointing back to the same location
3. `rewrite ^(.*)$ /index.php$1` without termination

### Fix

```
# Terminate rewrite with last or redirect flag
rewrite ^/old-path /new-path permanent;

# Use break flag to stop processing
rewrite ^/app/(.*) /app/index.php?$1 break;

# Fix try_files loops
location / {
    try_files $uri $uri/ /index.php;  # Don't point back to /
}
```

## Common Configuration Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `if ($host = "example.com")` | Inside location block | Move to server block |
| Missing `proxy_set_header Host` | Backend gets wrong host | Add the header |
| Wrong `proxy_http_version` | Chunked encoding issues | Set to 1.1 |
| Missing `proxy_set_header Connection` | Keepalive breakage | Add header |
| `/` vs `alias /var/www;` | Path mismatch | Use `root` instead |
| `return 301 http://$host$uri` | [ ] Missing scheme | Add `$scheme` |
| `proxy_pass http://backend/` vs `/` | URI not preserved | Check trailing slash |
| Missing `ssl_certificate_key` | SSL handshake fails | Add key file |

## Welcome to nginx Page (DNS Hijacking Detection)

### The "Welcome to nginx" Page

If you see the default "Welcome to nginx" page when accessing your site, it means:
1. Your configuration isn't loading for that request (default server is shown)
2. DNS may be pointing to wrong IP
3. config reload didn't apply

### Debugging

```
# Check which server block handles the request
curl -I http://example.com

# Check listen directive matches IP
ss -tlnp | grep nginx

# Force reload
nginx -s reload

# Check configuration syntax
nginx -t
```

## Performance Issues Troubleshooting

### Slow Requests Flowchart

1. **Check backend latency**: Is the upstream slow?
2. **Check nginx workers**: Are they at 100% CPU?
3. **Check SSL handshakes**: Are client certs required?
4. **Check disk I/O**: Is swap being used?
5. **Check network**: Is the pipe saturated?
6. **Check buffers**: Are buffers too small?
7. **Check worker_connections**: Are connections queuing?

### Tools

```
# CPU usage per worker
ps -eo pid,ppid,%cpu,%mem,cmd | grep nginx

# Open connections
ss -s
ss -tlnp | wc -l

# Memory usage
free -m
cat /proc/meminfo

# Disk I/O
iostat -x 1 5
iotop

# Network
sar -n DEV 1 5
nstat -az
```

## Core Debugging with gdb/lldb

### Install Debug Symbols

```
# Install debug package for nginx
# Debian/Ubuntu
apt-get install nginx-dbg

# RHEL/CentOS
debuginfo-install nginx
```

### gdb Setup

```
# Run nginx under gdb
gdb --args nginx -c /etc/nginx/nginx.conf

# Set breakpoints
(gdb) break ngx_http_process_request
(gdb) break ngx_event_accept

# Run
(gdb) run

# Get backtrace on crash
(gdb) bt
(gdb) info registers
```

### Debugging Crashes

```
# Enable core dumps
ulimit -c unlimited
echo "/var/coredumps/core.%e.%p" > /proc/sys/kernel/core_pattern

# Analyze core dump
gdb /usr/sbin/nginx /var/coredumps/core.nginx.1234
(gdb) bt full
```

## DTrace Debugging

### FreeBSD/Solaris

```
# Probe nginx functions
dtrace -n 'nginx*:::request-done { printf("%s %s %d\n", arg0, arg1, arg2); }'

# Profile nginx
dtrace -n 'profile-1001hz { @[stack()] = count(); }' -p $(pgrep nginx)
```

## HTTP/3 Debugging

```
# Check QUIC/HTTP/3 support
curl --http3 -I https://example.com/

# Or with Chrome DevTools (enable HTTP/3 in chrome://flags)

# Debug HTTP/3 connections
nghttp --verbose https://example.com/
```

## Windows-Specific Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `bind() failed` | Port in use | `netstat -ano \| findstr :80` |
| `select() failed` | Socket limit | Use `worker_connections` < 1024 |
| `unlink() failed` | File locked | Close file handles |
| `ioctl() failed` | Incompatible Windows version | Use Windows 10+ |
| PATH issues | Wrong nginx location | Use forward slashes |

## Troubleshooting Flowchart

```
Issue Occurs
  |
  v
Check error.log level: debug
  |
  v
Configuration valid? --> nginx -t
  |
  v
Ports listening? --> ss -tlnp | grep nginx
  |
  v
SSL certs valid? --> openssl verify
  |
  v
Upstream reachable? --> curl http://backend
  |
  v
DNS resolving? --> dig backend.example.com
  |
  v
Firewall rules? --> iptables -L -n
  |
  v
SELinux/AppArmor? --> grep nginx /var/log/audit/audit.log
  |
  v
Resource limits? --> ulimit -a; free -m
  |
  v
Ask for help: community.nginx.org
```
