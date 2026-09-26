# njs - NGINX JavaScript Module

## Overview

njs extends NGINX functionality through JavaScript scripting. Supports complex access control, header manipulation, content handlers, and filters.

- **Deprecated**: Built-in njs engine (deprecated since 1.0.0) — use QuickJS (`qjs`)
- **JS Engine**: `ngx` (default, deprecated) or `qjs` (QuickJS)
- **Modules**: `ngx_http_js_module` (HTTP), `ngx_stream_js_module` (Stream)

## Installing njs

Install njs package (e.g., `nginx-module-njs`) or build from source. Download from nginx.org.

## Directives (ngx_http_js_module)

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| js_body_filter | `js_body_filter module.function [buffer_type=string\|buffer]` | — | location, if, limit_except | Response body filter |
| js_access | `js_access module.function` | — | location, if, limit_except | Access phase handler (0.9.9) |
| js_content | `js_content module.function` | — | location, if, limit_except | Content handler |
| js_context_reuse | `js_context_reuse number` | 128 | http, server, location | Max JS contexts to reuse (0.8.6) |
| js_engine | `js_engine njs\|qjs` | njs | http, server, location | JS engine selection (0.8.6) |
| js_fetch_buffer_size | `js_fetch_buffer_size size` | 16k | http, server, location | Fetch buffer size (0.7.4) |
| js_fetch_ciphers | `js_fetch_ciphers ciphers` | HIGH:!aNULL:!MD5 | http, server, location | Fetch ciphers (0.7.0) |
| js_fetch_max_response_buffer_size | `js_fetch_max_response_buffer_size size` | 1m | http, server, location | Max fetch response (0.7.4) |
| js_fetch_protocols | `js_fetch_protocols [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3]` | TLSv1 TLSv1.1 TLSv1.2 | http, server, location | Fetch TLS protocols (0.7.0) |
| js_fetch_timeout | `js_fetch_timeout time` | 60s | http, server, location | Fetch timeout (0.7.4) |
| js_fetch_trusted_certificate | `js_fetch_trusted_certificate file` | — | http, server, location | Fetch CA cert file (0.7.0) |
| js_fetch_verify | `js_fetch_verify on\|off` | on | http, server, location | Verify HTTPS cert (0.7.4) |
| js_fetch_verify_depth | `js_fetch_verify_depth number` | 100 | http, server, location | Fetch verify depth (0.7.0) |
| js_fetch_proxy | `js_fetch_proxy url` | — | http, server, location | Forward proxy for fetch (0.9.4) |
| js_fetch_keepalive | `js_fetch_keepalive connections` | 0 | http, server, location | Keepalive connections (0.9.2) |
| js_fetch_keepalive_requests | `js_fetch_keepalive_requests number` | 1000 | http, server, location | Max requests per connection (0.9.2) |
| js_fetch_keepalive_time | `js_fetch_keepalive_time time` | 1h | http, server, location | Max connection lifetime (0.9.2) |
| js_fetch_keepalive_timeout | `js_fetch_keepalive_timeout time` | 60s | http, server, location | Keepalive idle timeout (0.9.2) |
| js_header_filter | `js_header_filter module.function` | — | location, if, limit_except | Response header filter (0.5.1) |
| js_import | `js_import module.js \| export_name from module.js` | — | http, server, location | Import njs module (0.4.0) |
| js_include | `js_include file` | — | http | **Obsolete**, use js_import |
| js_load_http_native_module | `js_load_http_native_module path [as name]` | — | main | Load native module (0.9.5) |
| js_path | `js_path path` | — | http, server, location | Additional module path |
| js_periodic | `js_periodic module.function [interval=time] [jitter=number] [worker_affinity=mask]` | — | location | Periodic handler (0.8.1) |
| js_preload_object | `js_preload_object name.json \| name from file.json` | — | http, server, location | Preload JSON object (0.7.8) |
| js_set | `js_set $variable module.function [nocache]` | — | http, server, location | Variable handler |
| js_shared_dict_zone | `js_shared_dict_zone zone=name:size [timeout=time] [type=string\|number] [evict] [state=file]` | — | http | Shared dictionary (0.8.0) |
| js_var | `js_var $variable [value]` | — | http, server, location | Writable variable (0.5.3) |

## Directives (ngx_stream_js_module)

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| js_access | `js_access module.function` | — | stream, server | Access phase handler (0.4.0) |
| js_context_reuse | `js_context_reuse number` | 128 | stream, server | Max JS contexts (0.8.6) |
| js_engine | `js_engine njs\|qjs` | njs | stream, server | JS engine (0.8.6) |
| js_fetch_* | same as HTTP directives | — | stream, server | Fetch API config |
| js_filter | `js_filter module.function` | — | stream, server | Stream data filter |
| js_import | `js_import module.js \| export_name from module.js` | — | stream, server | Import module (0.4.0) |
| js_load_stream_native_module | `js_load_stream_native_module path [as name]` | — | main | Load native module (0.9.5) |
| js_path | `js_path path` | — | stream, server | Module path |
| js_periodic | `js_periodic module.function [interval=time] [jitter=number] [worker_affinity=mask]` | — | server | Periodic handler (0.8.1) |
| js_preload_object | `js_preload_object name.json \| name from file.json` | — | stream, server | Preload object (0.7.8) |
| js_preread | `js_preread module.function` | — | stream, server | Preread phase handler |
| js_set | `js_set $variable module.function [nocache]` | — | stream, server | Variable handler |
| js_shared_dict_zone | `js_shared_dict_zone zone=name:size [timeout=time] [type=string\|number] [evict] [state=file]` | — | stream | Shared dictionary (0.8.0) |
| js_var | `js_var $variable [value]` | — | stream, server | Writable variable (0.5.3) |

## njs API Reference

### Global Objects

| Object | Description |
|--------|-------------|
| `ngx` | NGINX-specific extensions |
| `njs` | njs version info |
| `global` | Standard JS global object |
| `crypto` | Web Crypto API |
| `console` | Console object |
| `Buffer` | Node.js-like Buffer |
| `setTimeout` / `clearTimeout` | Timer functions |
| `setInterval` / `clearInterval` | Interval functions |
| `Promise` | Promise support |

### ngx Global Object

| Property/Method | Description |
|-----------------|-------------|
| `ngx.INFO` | Log level constant |
| `ngx.WARN` | Log level constant |
| `ngx.ERR` | Log level constant |
| `ngx.log(level, msg)` | Write to NGINX error log |
| `ngx.fetch(url, opts)` | HTTP/HTTPS fetch API |
| `ngx.shared` | Shared dictionaries (ngx.shared.zoneName) |

### ngx.shared Dictionary Methods

| Method | Description |
|--------|-------------|
| `get(key)` | Get value by key |
| `set(key, value, [timeout])` | Set key-value pair |
| `add(key, value)` | Add if key does not exist |
| `replace(key, value)` | Replace if key exists |
| `delete(key)` | Remove key |
| `incr(key, delta)` | Increment numeric value |
| `keys()` | Get all keys (iterator) |
| `has(key)` | Check if key exists |
| `pop(key)` | Get and remove key |
| `size` | Number of items |
| `freeSpace` | Free space in zone |
| `capacity` | Total zone capacity |

### HTTP Request Object (r)

| Property/Method | Description |
|-----------------|-------------|
| `r.uri` | Request URI |
| `r.args` | Query string object |
| `r.method` | HTTP method |
| `r.httpVersion` | HTTP version string |
| `r.headersIn` | Request headers object |
| `r.headersOut` | Response headers object |
| `r.remoteAddress` | Client IP address |
| `r.remotePort` | Client port |
| `r.variables` | NGINX variables object |
| `r.status` | Response status code |
| `r.finish()` | Finish response |
| `r.return(status, [body])` | Send response and finish |
| `r.send(data)` | Send response body chunk |
| `r.sendBuffer(data, flags)` | Send buffer for body filter |
| `r.sendHeader()` | Flush response headers |
| `r.headersSent` | Boolean, headers sent flag |
| `r.decline()` | Decline request handling |
| `r.done()` | Mark filter as complete |
| `r.on(event, callback)` | Register event handler |
| `r.off(event)` | Remove event handler |
| `r.subrequest(uri, opts)` | Create subrequest (async) |
| `r.setReturnValue(val)` | Set return value for js_set |
| `r.log(msg)` | Log message |
| `r.error(msg)` | Log error |
| `r.warn(msg)` | Log warning |
| `r.rawHeadersIn` | Raw request headers |
| `r.rawHeadersOut` | Raw response headers |
| `r.requestId` | Unique request ID |
| `r.startTime` | Request start time (ms) |

### HTTP Body Filter Arguments

| Argument | Description |
|----------|-------------|
| `r` | HTTP request object |
| `data` | Data chunk (string or Buffer) |
| `flags` | Object with `last` (boolean) property |

### Stream Session Object (s)

| Property/Method | Description |
|-----------------|-------------|
| `s.remoteAddress` | Client IP |
| `s.remotePort` | Client port |
| `s.variables` | NGINX variables |
| `s.allow()` | Allow connection (access phase) |
| `s.deny()` | Deny connection (access phase) |
| `s.decline()` | Decline decision (access phase) |
| `s.done()` | Complete preread/content phase |
| `s.on(event, callback)` | Register data callback |
| `s.off(event)` | Remove callback |
| `s.send(data, flags)` | Send data |
| `s.log(msg)` | Log message |
| `s.warn(msg)` | Log warning |
| `s.error(msg)` | Log error |
| `s.bufferSize` | Buffer size (1.31.0) |
| `s.setBufferSize(size)` | Set buffer size (1.31.0) |

### Periodic Session Object

Periodic handlers receive a session object with access to `ngx` global object and `ngx.fetch()`.

### njs.version

| Property | Description |
|----------|-------------|
| `njs.version` | njs version string |
| `njs.v8` | `false` (njs is not V8) |

## ES Compatibility

njs supports a subset of ECMAScript:
- **ES2020** level features (optional chaining, nullish coalescing, etc.)
- No DOM APIs, no `fetch` (provided via `ngx.fetch()`)
- No Node.js built-in modules
- `import`/`export` syntax for modules

## Shared Dictionaries (Memory Sharing)

`js_shared_dict_zone` creates shared memory zones accessible via `ngx.shared.zoneName` across all worker processes.

### Configuration Examples

```
js_shared_dict_zone zone=foo:1M timeout=60s;          # 1MB, 60s timeout
js_shared_dict_zone zone=bar:512K timeout=30s evict;   # 512KB, evict oldest
js_shared_dict_zone zone=num:32k type=number;           # 32KB, number values
js_shared_dict_zone zone=persistent:1M state=/tmp/dict.json;  # persistent
```

## Security Considerations

- Native modules (`js_load_*_native_module`) run with full process privileges
- Only allowed in `main` context for security reasons
- Use absolute paths for native modules
- Review native module code before loading
- njs runs in a sandboxed environment within worker processes
- Sensitive data in variables may appear in error logs

## CLI

njs provides a standalone command-line utility for development and debugging:

```
njs script.js
```

## Examples

### Basic HTTP Handler

```
function hello(r) {
    r.return(200, "Hello world!");
}
export default {hello};
```

### Access Control with ngx.fetch()

```
async function auth(r) {
    let reply = await ngx.fetch('http://authsvc/check', {
        headers: {Authorization: r.headersIn.Authorization}
    });
    if (reply.status != 200) {
        r.return(401);
        return;
    }
}
```

### Stream Preread

```
function preread(s) {
    s.on('upload', function(data, flags) {
        var n = data.indexOf('\n');
        if (n != -1) {
            line = data.substr(0, n);
            s.done();
        }
    });
}
```

### Stream Filter

```
function header_inject(s) {
    var req = '';
    s.on('upload', function(data, flags) {
        req += data;
        var n = req.search('\n');
        if (n != -1) {
            var rest = req.substr(n + 1);
            req = req.substr(0, n + 1);
            s.send(req + 'Foo: foo\r\n' + rest, flags);
            s.off('upload');
        }
    });
}
```

### Shared Dictionary Usage

```
function get(r) {
    r.return(200, ngx.shared.foo.get(r.args.key));
}
function set(r) {
    r.return(200, ngx.shared.foo.set(r.args.key, r.args.value));
}
function increment(r) {
    r.return(200, ngx.shared.num.incr(r.args.key, 2));
}
```
