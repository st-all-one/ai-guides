# NGINX Installation Guide

## Table of Contents

1. [Package Installation](#package-installation)
2. [Building from Source](#building-from-source)
   - [Configuration Parameters](#configuration-parameters)
   - [Paths and Directories](#paths-and-directories)
   - [Privileges](#privileges)
   - [Build Identification](#build-identification)
   - [Connection Processing Modules](#connection-processing-modules)
   - [Threading and AIO](#threading-and-aio)
   - [HTTP Modules — Enable (--with-*)](#http-modules---enable--with-)
   - [HTTP Modules — Disable (--without-*)](#http-modules---disable--without-)
   - [HTTP Paths](#http-paths)
   - [HTTP Master Switches](#http-master-switches)
   - [Mail Proxy Modules](#mail-proxy-modules)
   - [Stream Modules](#stream-modules)
   - [External Modules and Compatibility](#external-modules-and-compatibility)
   - [Compiler and Linker Options](#compiler-and-linker-options)
   - [PCRE Library](#pcre-library)
   - [zlib Library](#zlib-library)
   - [libatomic](#libatomic)
   - [OpenSSL](#openssl)
   - [Debugging](#debugging)
   - [Build Example](#build-example)
3. [Building on Windows with MSVC](#building-on-windows-with-msvc)
4. [Windows Installation (Binary)](#windows-installation-binary)
5. [Command-Line Parameters](#command-line-parameters)
6. [Debug Logging](#debug-logging)
7. [Syslog Configuration](#syslog-configuration)
8. [Contributing Changes](#contributing-changes)

---

## Package Installation

### Linux

Packages are available from [nginx.org](https://nginx.org/linux_packages.html). Add the official nginx repository and install via the package manager.

```bash
# Example for RHEL/CentOS/Fedora
sudo rpm -Uvh https://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm
sudo yum install nginx

# Example for Debian/Ubuntu
echo "deb https://nginx.org/packages/ubuntu/ $(lsb_release -cs) nginx" | sudo tee /etc/apt/sources.list.d/nginx.list
sudo apt-get update
sudo apt-get install nginx
```

### FreeBSD

```bash
# Via packages
pkg install nginx

# Via ports (build with custom options)
cd /usr/ports/www/nginx
make install clean
```

## Building from Source

```bash
tar -xzf nginx-<version>.tar.gz
cd nginx-<version>
./configure <options>
make
sudo make install
```

### Configuration Parameters

## Paths and Directories

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--prefix=<path>` | `/usr/local/nginx` | Base directory for server files; all relative paths use this |
| `--sbin-path=<path>` | `<prefix>/sbin/nginx` | nginx executable name (used only during installation) |
| `--modules-path=<path>` | `<prefix>/modules` | Directory for dynamic modules installation |
| `--conf-path=<path>` | `<prefix>/conf/nginx.conf` | Default configuration file path (can be overridden with `-c`) |
| `--error-log-path=<path>` | `<prefix>/logs/error.log` | Primary error log file (can be changed with `error_log` directive) |
| `--pid-path=<path>` | `<prefix>/logs/nginx.pid` | Master process ID file (can be changed with `pid` directive) |
| `--lock-path=<path>` | `<prefix>/logs/nginx.lock` | Lock file prefix (can be changed with `lock_file` directive) |

## Privileges

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--user=<name>` | `nobody` | Unprivileged user for worker processes (can be changed with `user` directive) |
| `--group=<name>` | same as user | Group for worker processes (can be changed with `user` directive) |

## Build Identification

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--build=<name>` | (none) | Optional build name |
| `--builddir=<path>` | (auto) | Build directory |

## Connection Processing Modules

| Parameter | Description |
|-----------|-------------|
| `--with-select_module` | Force enable `select()` method (built automatically on platforms needing it) |
| `--without-select_module` | Force disable `select()` method |
| `--with-poll_module` | Force enable `poll()` method (built automatically on platforms needing it) |
| `--without-poll_module` | Force disable `poll()` method |

## Threading and AIO

| Parameter | Description |
|-----------|-------------|
| `--with-threads` | Enable thread pools for multi-threaded file I/O |
| `--with-file-aio` | Enable asynchronous file I/O on FreeBSD and Linux |

## HTTP Modules — Enable (`--with-*`)

These modules are **not built by default** unless listed otherwise.

| Parameter | Description | Dependencies |
|-----------|-------------|-------------|
| `--with-http_ssl_module` | HTTPS protocol support | OpenSSL |
| `--with-http_v2_module` | HTTP/2 protocol support | |
| `--with-http_v3_module` | HTTP/3 protocol support | OpenSSL (with QUIC support) |
| `--with-http_realip_module` | Change client address from header | |
| `--with-http_addition_module` | Add text before/after response | |
| `--with-http_xslt_module` | Transform XML with XSLT | libxml2, libxslt |
| `--with-http_xslt_module=dynamic` | Dynamic version of XSLT module | libxml2, libxslt |
| `--with-http_image_filter_module` | Transform JPEG/GIF/PNG/WebP images | |
| `--with-http_image_filter_module=dynamic` | Dynamic version of image filter | |
| `--with-http_geoip_module` | Variables from MaxMind GeoIP DB | MaxMind libraries |
| `--with-http_geoip_module=dynamic` | Dynamic version of GeoIP module | MaxMind libraries |
| `--with-http_sub_module` | Replace strings in response | |
| `--with-http_dav_module` | WebDAV file management | |
| `--with-http_flv_module` | FLV pseudo-streaming | |
| `--with-http_mp4_module` | MP4 pseudo-streaming | |
| `--with-http_gunzip_module` | Decompress gzip for old clients | |
| `--with-http_gzip_static_module` | Serve precompressed `.gz` files | |
| `--with-http_auth_request_module` | Client auth via subrequest | |
| `--with-http_random_index_module` | Random index file | |
| `--with-http_secure_link_module` | Secure link checking | |
| `--with-http_degradation_module` | Degradation module | |
| `--with-http_slice_module` | Request splitting for big caching | |
| `--with-http_stub_status_module` | Basic status info page | |
| `--with-http_perl_module` | Embedded Perl | Perl |
| `--with-http_perl_module=dynamic` | Dynamic embedded Perl | Perl |

#### Perl Module Support

| Parameter | Description |
|-----------|-------------|
| `--with-perl_modules_path=<path>` | Directory for Perl modules |
| `--with-perl=<path>` | Name/path of Perl binary |

## HTTP Modules — Disable (`--without-*`)

These modules are **built by default**; use `--without-*` to disable them.

| Parameter | Disables |
|-----------|----------|
| `--without-http_charset_module` | Charset conversion |
| `--without-http_gzip_module` | Response compression (requires zlib) |
| `--without-http_ssi_module` | Server Side Includes |
| `--without-http_userid_module` | Client identification cookies |
| `--without-http_access_module` | IP-based access control |
| `--without-http_auth_basic_module` | HTTP Basic Authentication |
| `--without-http_mirror_module` | Request mirroring |
| `--without-http_autoindex_module` | Directory listing |
| `--without-http_geo_module` | Geo variables |
| `--without-http_map_module` | Map variables |
| `--without-http_split_clients_module` | A/B testing variables |
| `--without-http_referer_module` | Referer blocking |
| `--without-http_rewrite_module` | URI rewrite/redirect (requires PCRE) |
| `--without-http_proxy_module` | HTTP proxying |
| `--without-http_fastcgi_module` | FastCGI |
| `--without-http_uwsgi_module` | uwsgi |
| `--without-http_scgi_module` | SCGI |
| `--without-http_grpc_module` | gRPC |
| `--without-http_tunnel_module` | HTTP CONNECT tunnel |
| `--without-http_memcached_module` | Memcached |
| `--without-http_limit_conn_module` | Connection limiting |
| `--without-http_limit_req_module` | Request rate limiting |
| `--without-http_empty_gif_module` | Single-pixel transparent GIF |
| `--without-http_browser_module` | Browser detection variables |
| `--without-http_upstream_hash_module` | hash LB method |
| `--without-http_upstream_ip_hash_module` | ip_hash LB method |
| `--without-http_upstream_least_conn_module` | least_conn LB method |
| `--without-http_upstream_least_time_module` | least_time LB method |
| `--without-http_upstream_random_module` | random LB method |
| `--without-http_upstream_keepalive_module` | Upstream keepalive |
| `--without-http_upstream_zone_module` | Upstream shared memory zone |
| `--without-http_upstream_sticky_module` | Session affinity |

## HTTP Paths

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--http-log-path=<path>` | `<prefix>/logs/access.log` | HTTP access log path |
| `--http-client-body-temp-path=<path>` | `<prefix>/client_body_temp` | Client request body temp files |
| `--http-proxy-temp-path=<path>` | `<prefix>/proxy_temp` | Proxy temp files |
| `--http-fastcgi-temp-path=<path>` | `<prefix>/fastcgi_temp` | FastCGI temp files |
| `--http-uwsgi-temp-path=<path>` | `<prefix>/uwsgi_temp` | uwsgi temp files |
| `--http-scgi-temp-path=<path>` | `<prefix>/scgi_temp` | SCGI temp files |

## HTTP Master Switches

| Parameter | Description |
|-----------|-------------|
| `--without-http` | Disable the HTTP server entirely |
| `--without-http-cache` | Disable HTTP caching |

## Mail Proxy Modules

| Parameter | Description | Dependencies |
|-----------|-------------|-------------|
| `--with-mail` | Enable POP3/IMAP4/SMTP mail proxy | |
| `--with-mail=dynamic` | Enable mail proxy as dynamic module | |
| `--with-mail_ssl_module` | SSL/TLS for mail proxy | OpenSSL |
| `--without-mail_pop3_module` | Disable POP3 in mail proxy | |
| `--without-mail_imap_module` | Disable IMAP in mail proxy | |
| `--without-mail_smtp_module` | Disable SMTP in mail proxy | |

## Stream Modules

| Parameter | Description | Dependencies |
|-----------|-------------|-------------|
| `--with-stream` | Enable TCP/UDP proxying and load balancing | |
| `--with-stream=dynamic` | Enable stream as dynamic module | |
| `--with-stream_ssl_module` | SSL/TLS for stream | OpenSSL |
| `--with-stream_realip_module` | Realip via PROXY protocol header | |
| `--with-stream_geoip_module` | GeoIP for stream | MaxMind |
| `--with-stream_geoip_module=dynamic` | Dynamic GeoIP for stream | MaxMind |
| `--with-stream_ssl_preread_module` | SSL preread from ClientHello | |

### Stream Module Disable Flags

| Parameter | Disables |
|-----------|----------|
| `--without-stream_limit_conn_module` | Stream connection limiting |
| `--without-stream_access_module` | Stream access control |
| `--without-stream_geo_module` | Stream geo variables |
| `--without-stream_map_module` | Stream map variables |
| `--without-stream_split_clients_module` | Stream A/B testing |
| `--without-stream_return_module` | Stream return values |
| `--without-stream_pass_module` | Stream socket passing |
| `--without-stream_set_module` | Stream variable setting |
| `--without-stream_upstream_hash_module` | Stream hash LB |
| `--without-stream_upstream_least_conn_module` | Stream least_conn LB |
| `--without-stream_upstream_least_time_module` | Stream least_time LB |
| `--without-stream_upstream_random_module` | Stream random LB |
| `--without-stream_upstream_zone_module` | Stream upstream zone |

## External Modules and Compatibility

| Parameter | Description |
|-----------|-------------|
| `--add-module=<path>` | Enable an external module (static) |
| `--add-dynamic-module=<path>` | Enable an external dynamic module |
| `--with-compat` | Enable dynamic module binary compatibility |
| `--with-google_perftools_module` | Profiling with Google Performance Tools |
| `--with-cpp_test_module` | Build CPP test module |

## Compiler and Linker Options

| Parameter | Description |
|-----------|-------------|
| `--with-cc=<path>` | C compiler name |
| `--with-cpp=<path>` | C preprocessor name |
| `--with-cc-opt=<parameters>` | Additional CFLAGS (e.g., `-I /usr/local/include`, `-D FD_SETSIZE=2048`) |
| `--with-ld-opt=<parameters>` | Additional linker flags (e.g., `-L /usr/local/lib`) |
| `--with-cpu-opt=<cpu>` | CPU-specific optimization: `pentium`, `pentiumpro`, `pentium3`, `pentium4`, `athlon`, `opteron`, `sparc32`, `sparc64`, `ppc64` |

## PCRE Library

Required for regular expressions in `location` and `rewrite` module.

| Parameter | Description |
|-----------|-------------|
| `--without-pcre` | Disable PCRE usage |
| `--with-pcre` | Force PCRE usage |
| `--with-pcre=<path>` | Path to PCRE library sources |
| `--with-pcre-opt=<parameters>` | Additional PCRE build options |
| `--with-pcre-jit` | Enable PCRE JIT compilation |
| `--without-pcre2` | Disable PCRE2 (use original PCRE) (1.21.5+) |

## zlib Library

Required for the `ngx_http_gzip_module`.

| Parameter | Description |
|-----------|-------------|
| `--with-zlib=<path>` | Path to zlib library sources |
| `--with-zlib-opt=<parameters>` | Additional zlib build options |
| `--with-zlib-asm=<cpu>` | Use zlib assembler optimized for `pentium` or `pentiumpro` |

## libatomic

| Parameter | Description |
|-----------|-------------|
| `--with-libatomic` | Force libatomic_ops usage |
| `--with-libatomic=<path>` | Path to libatomic_ops sources |

## OpenSSL

| Parameter | Description |
|-----------|-------------|
| `--with-openssl=<path>` | Path to OpenSSL library sources |
| `--with-openssl-opt=<parameters>` | Additional OpenSSL build options |

## Debugging

| Parameter | Description |
|-----------|-------------|
| `--with-debug` | Enable debug logging support |

## Build Example

```bash
./configure \
    --sbin-path=/usr/local/nginx/nginx \
    --conf-path=/usr/local/nginx/nginx.conf \
    --pid-path=/usr/local/nginx/nginx.pid \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_stub_status_module \
    --with-pcre=../pcre2-10.39 \
    --with-zlib=../zlib-1.3 \
    --with-openssl=../openssl-3.0.14 \
    --with-debug

make
sudo make install
```

## Building on Windows with MSVC

### Prerequisites

- Microsoft Visual C++ Compiler (VS 8, 10, 17 known to work)
- MSYS or MSYS2
- Perl (for OpenSSL + SSL support)
- Git client
- PCRE, zlib, and OpenSSL library sources

### Build Steps

```bash
# Set up Visual C environment
vcvarsall.bat

# Start MSYS bash
# Clone sources
git clone https://github.com/nginx/nginx.git
cd nginx

# Prepare library sources
mkdir objs objs/lib
cd objs/lib
tar -xzf ../../pcre2-10.39.tar.gz
tar -xzf ../../zlib-1.3.1.tar.gz
tar -xzf ../../openssl-3.0.14.tar.gz
cd ../..

# Configure
auto/configure \
    --with-cc=cl \
    --with-debug \
    --prefix= \
    --conf-path=conf/nginx.conf \
    --pid-path=logs/nginx.pid \
    --http-log-path=logs/access.log \
    --error-log-path=logs/error.log \
    --sbin-path=nginx.exe \
    --http-client-body-temp-path=temp/client_body_temp \
    --http-proxy-temp-path=temp/proxy_temp \
    --http-fastcgi-temp-path=temp/fastcgi_temp \
    --http-scgi-temp-path=temp/scgi_temp \
    --http-uwsgi-temp-path=temp/uwsgi_temp \
    --with-cc-opt=-DFD_SETSIZE=1024 \
    --with-pcre=objs/lib/pcre2-10.39 \
    --with-zlib=objs/lib/zlib-1.3.1 \
    --with-openssl=objs/lib/openssl-3.0.14 \
    --with-openssl-opt=no-asm \
    --with-http_ssl_module

nmake
```

## Windows Installation (Binary)

- Uses native Win32 API (not Cygwin).
- Only `select()` and `poll()` (1.15.9+) connection methods — considered **beta**.
- Almost same functionality as Unix, **except**: XSLT filter, image filter, GeoIP module, embedded Perl.
- Paths in config must use UNIX-style forward slashes.
- The directory where nginx is run becomes the prefix for relative paths.

### Windows Limitations

| Limitation | Details |
|------------|---------|
| Single worker | Multiple can be started but only one works |
| No UDP/QUIC | Not supported |
| No XSLT filter | Not ported |
| No image filter | Not ported |
| No GeoIP | Not ported |
| No embedded Perl | Not ported |
| Not a service | Runs as console application (future possibility) |
| I/O completion ports | Not yet implemented (future possibility) |

### Windows Commands

```bash
start nginx          # start
nginx -s stop        # fast shutdown
nginx -s quit        # graceful shutdown
nginx -s reload      # reload configuration
nginx -s reopen      # reopen logs
```

Paths in Windows config:

```nginx
access_log   logs/site.log;
root         C:/web/html;
```

## Command-Line Parameters

| Parameter | Since | Description |
|-----------|-------|-------------|
| `-?` / `-h` | — | Print help |
| `-c <file>` | — | Use alternative configuration file |
| `-e <file>` | 1.19.5 | Use alternative error log file; `stderr` for stderr |
| `-g <directives>` | — | Set global configuration directives (e.g., `-g "pid /var/run/nginx.pid; worker_processes auto;"`) |
| `-l <port>` | 1.29.8 | Enable nginx control REST API on specified port/UNIX socket (commercial) |
| `-p <prefix>` | — | Set nginx path prefix (default: `/usr/local/nginx`) |
| `-q` | — | Suppress non-error messages during config test |
| `-s <signal>` | — | Send signal: `stop`, `quit`, `reload`, `reopen` |
| `-t` | — | Test configuration for syntax validity |
| `-T` | 1.9.2 | Same as `-t` but dump configuration files to stdout |
| `-v` | — | Print nginx version |
| `-V` | — | Print nginx version, compiler version, and configure parameters |

```bash
# Test configuration
nginx -t
nginx -T          # test and dump config

# Override config on the fly
nginx -g "pid /var/run/nginx.pid; worker_processes auto;"

# Use alternative config file
nginx -c /etc/nginx/nginx-alternate.conf

# Set prefix
nginx -p /opt/nginx

# Suppress non-errors during test
nginx -t -q

# Check version and build info
nginx -V
```

## Debug Logging

### Build-Time Setup

```bash
./configure --with-debug ...
```

### Runtime Configuration

```nginx
error_log /path/to/log debug;
```

Pre-built Linux packages provide `nginx-debug` binary (1.9.8+):

```bash
service nginx stop
service nginx-debug start
```

Windows binary is always built with debug support.

### Debugging for Selected Clients

```nginx
error_log /path/to/log;

events {
    debug_connection 192.168.1.1;
    debug_connection 192.168.10.0/24;
    debug_connection unix:;
}
```

### Cyclic Memory Buffer Debug Log

```nginx
error_log memory:32m debug;
```

Extract with gdb:

```gdb
set $log = ngx_cycle->log
while $log->writer != ngx_log_memory_writer
    set $log = $log->next
end
set $buf = (ngx_log_memory_buf_t *) $log->wdata
dump binary memory debug_log.txt $buf->start $buf->end
```

Or with lldb:

```lldb
expr ngx_log_t *$log = ngx_cycle->log
expr while ($log->writer != ngx_log_memory_writer) { $log = $log->next; }
expr ngx_log_memory_buf_t *$buf = (ngx_log_memory_buf_t *) $log->wdata
memory read --force --outfile debug_log.txt --binary $buf->start $buf->end
```

### Important Note

Redefining `error_log` without the `debug` level disables debugging for that context:

```nginx
error_log /path/to/log debug;

http {
    server {
        # This disables debug logging for this server!
        error_log /path/to/log;
    }
}
```

Fix by adding `debug` level:

```nginx
http {
    server {
        error_log /path/to/log debug;
    }
}
```

### debug_connection Directive

| Item | Value |
|------|-------|
| **Syntax** | `debug_connection <address> \| <CIDR> \| unix:` |
| **Default** | — |
| **Context** | `events` |
| **Since** | 1.3.0 / 1.2.1 for IPv6 and unix: |

Enables debug logging for specific client connections by IPv4/IPv6 address, CIDR range, hostname, or UNIX-domain socket.

### debug_points Directive

| Item | Value |
|------|-------|
| **Syntax** | `debug_points abort \| stop` |
| **Default** | — |
| **Context** | `main` |

Creates a core file (`abort`) or stops the process (`stop`) on internal error detection (e.g., socket leak on restart).

## Syslog Configuration

The `error_log` and `access_log` directives support syslog via the `syslog:` prefix.

### Syslog Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `server=<address>` | (required) | Syslog server address: domain/IP with optional port, or `unix:` path. Default port: UDP 514. |
| `facility=<string>` | `local7` | RFC 3164 facility: `kern`, `user`, `mail`, `daemon`, `auth`, `intern`, `lpr`, `news`, `uucp`, `clock`, `authpriv`, `ftp`, `ntp`, `audit`, `alert`, `cron`, `local0`..`local7` |
| `severity=<string>` | `info` | Syslog severity for access_log (same levels as error_log). Ignored for error_log (severity determined by nginx). |
| `tag=<string>` | `nginx` | Syslog message tag |
| `nohostname` | (off) | Disable hostname field in syslog header (1.9.7+) |

### Examples

```nginx
error_log syslog:server=192.168.1.1 debug;

access_log syslog:server=unix:/var/log/nginx.sock,nohostname;
access_log syslog:server=[2001:db8::1]:12345,facility=local7,tag=nginx,severity=info combined;
```

Syslog logging is available since version 1.7.1 (open source).

## Contributing Changes

### Getting Sources

```bash
git clone https://github.com/nginx/nginx.git
```

### Formatting Changes

- Follow the [nginx code style](https://nginx.org/docs/dev/development_guide.html#code_style).
- Commit message: single-line synopsis, empty line, verbose body.
- Limit subject and body lines to 72 characters.
- Email and real name of author must be correct.

### Before Submitting

- Changes should work on a wide range of supported platforms.
- Explain why the change is needed with a use case.
- Run the [test suite](https://github.com/nginx/nginx-tests.git).

### Submitting

Open a pull request from your fork to [nginx/nginx](https://github.com/nginx/nginx).

### License

Submitting changes grants the project permission to use them under the appropriate license.
