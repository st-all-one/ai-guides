# Debugging nginx with DTrace pid Provider

## Overview

The DTrace pid provider (available on Solaris, macOS) is a dynamic tracing facility that allows you to probe userland program internals without code changes. With nginx, DTrace can trace function calls, inspect arguments, and measure latencies in real time — all without recompiling or restarting.

## Prerequisites

- **Solaris** (illumos, OpenIndiana, etc.) or **macOS** with DTrace
- nginx built with **debug symbols** (recommended but not required for pid provider)
- Root or `dtrace_proc` privileges to attach to a running process

## Building nginx with DTrace Support

DTrace support does not require special build flags for the pid provider — it works at the system level. However, for richer probes, configure nginx with:

```bash
./configure --with-dtrace ...
```

The `--with-dtrace` flag enables USDT (Userland Statically Defined Tracing) probes in nginx, providing stable probe points that do not depend on internal function names.

## DTrace pid Provider Basics

The pid provider can trace **any** function entry and return in a userland process:

```
pid$target:nginx::entry { }
pid$target:nginx::return { }
```

With `flowindent`, this traces all function calls in the nginx worker:

```bash
# dtrace -q -n 'pid$target:nginx::entry { printf("%s\n", probefunc); }' -p PID
```

## nginx Provider Probes

When built with `--with-dtrace`, nginx exposes the following USDT probes:

| Probe Name | Description |
|------------|-------------|
| `ngx_http_request_done` | HTTP request completed |
| `ngx_http_upstream_connect` | Upstream connection initiated |
| `ngx_http_upstream_done` | Upstream response received |
| `ngx_http_upstream_cache` | Upstream cache event |
| `ngx_http_fastcgi_request_done` | FastCGI request completed |
| `ngx_http_proxy_request_done` | Proxy request completed |
| `ngx_http_memcached_request_done` | Memcached request completed |

### Listing Available Probes

```bash
# List all nginx-related probes
dtrace -l -P nginx*

# List probes in a specific nginx binary
dtrace -l -P nginx$(pgrep nginx | head -1)
```

## Tracing Function Arguments with pid Provider

To inspect function arguments, DTrace needs to know the target structure layout. The key challenge is that nginx headers cannot be directly `#include`d due to cross-dependencies.

### Example: Tracing Request Lines

Attach to `ngx_http_process_request()` and read the request line:

```dtrace
pid$target::*ngx_http_process_request:entry
{
    this->request = (ngx_http_request_t *)copyin(arg0, sizeof(ngx_http_request_t));
    this->request_line = stringof(copyin((uintptr_t)this->request->request_line.data,
                                         this->request->request_line.len));
    printf("request line = %s\n", this->request_line);
    printf("request start sec = %d\n", this->request->start_sec);
}
```

### Required Structure Definitions

The D script needs specific structure definitions. Key types that must be declared:

```dtrace
// Basic nginx types
typedef uint32_t ngx_uint_t;
typedef int32_t  ngx_int_t;

typedef struct {
    size_t      len;
    u_char      *data;
} ngx_str_t;

typedef struct {
    ngx_str_t   name;
    ngx_str_t   value;
} ngx_table_elt_t;
```

Include the auto-generated config file:

```bash
dtrace -C -I ./objs -s trace_request.d -p PID
```

The `-C` flag runs the C preprocessor, and `-I ./objs` points to the build directory containing `ngx_auto_config.h`.

### Simplifying Complex Structures

Since DTrace only needs correct field offsets, irrelevant pointer fields can be typedef'd to `void`:

```dtrace
typedef ngx_http_upstream_t     void;
typedef ngx_http_request_body_t void;
```

This avoids pulling in hundreds of header dependencies.

## Example D Scripts

### 1. Trace Request Latencies

```dtrace
#pragma D option flowindent

pid$target::ngx_http_process_request:entry
{
    self->start = timestamp;
}

pid$target::ngx_http_finalize_request:entry
/self->start/
{
    this->elapsed = (timestamp - self->start) / 1000000;
    printf("request completed in %d ms\n", this->elapsed);
    self->start = 0;
}
```

### 2. Upstream Connection Tracing

```dtrace
pid$target::ngx_http_upstream_connect:entry
{
    printf("connecting to upstream\n");
}

pid$target::ngx_http_upstream_done:entry
{
    printf("upstream request complete\n");
}
```

### 3. All Function Entry/Return (Flow Tracing)

```bash
dtrace -n 'pid$target:nginx::entry { } pid$target:nginx::return { }' -p PID
```

### 4. Profile nginx with Stack Sampling

```bash
dtrace -n 'profile-1001hz { @[stack()] = count(); }' -p $(pgrep nginx)
```

This samples the stack at 1001 Hz and shows where CPU time is spent.

## Running a DTrace Script

The recommended approach is to use a `.d` file with the `-C` and `-I` flags:

```bash
# Run trace script on worker PID 4848
dtrace -C -I ./objs -s trace_process_request.d -p 4848
```

Example output:

```
dtrace: script 'trace_process_request.d' matched 1 probe
CPU     ID                    FUNCTION:NAME
  1      4 .XAbmO.ngx_http_process_request:entry
  request line = GET / HTTP/1.1
  request start sec = 1349162898

  0      4 .XAbmO.ngx_http_process_request:entry
  request line = GET /en/docs/nginx_dtrace_pid_provider.html HTTP/1.1
  request start sec = 1349162899
```

## Limitations

- **Function name mangling**: nginx compiles function names with mangled suffix (e.g., `.XAbmO.`), so use wildcards: `*ngx_http_process_request*`
- **Header dependencies**: nginx headers cannot be directly `#include`d in D scripts due to complex cross-dependencies with PCRE, OpenSSL, and system headers
- **Manual struct definitions**: you must manually define the relevant structures and typedefs in your D script or use optimized minimal definitions
- **Performance impact**: tracing high-frequency functions (e.g., `ngx_http_*`) at production load may impact performance; use with care
- **Platform limited**: pid provider is only available on Solaris/illumos and macOS; Linux users should use `perf`, `bpftrace`, or `systemtap` instead
- **macOS SIP**: on modern macOS, System Integrity Protection may restrict DTrace; disable SIP or use `csrutil enable --without dtrace` to enable
- **No `#include` shortcut**: even with `-C`, full nginx headers will fail due to syntax incompatibilities with DTrace's C parser

## See Also

- [Solaris Dynamic Tracing Guide](http://docs.oracle.com/cd/E19253-01/817-6223/index.html)
- [Introduction to DTrace pid Provider](http://dtrace.org/blogs/brendan/2011/02/09/dtrace-pid-provider/)
- Example D script: [trace_process_request.d](http://nginx.org/download/trace_process_request.d)
