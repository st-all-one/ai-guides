# njs Extended Topics

## Section 1: TypeScript Support

njs provides TypeScript definition files (`.d.ts`) for its API, enabling type-safe code, autocompletion, and compile-time error checking.

### Obtaining TypeScript Definitions

Clone the njs repository and build the type definitions:

```bash
$ git clone https://github.com/nginx/njs
$ cd njs && ./configure && make ts
$ ls build/ts/
njs_core.d.ts
njs_shell.d.ts
ngx_http_js_module.d.ts
ngx_stream_js_module.d.ts
```

### Available Types

| Definition File | Key Types |
|-----------------|-----------|
| `ngx_http_js_module.d.ts` | `NginxHTTPRequest`, `NginxHTTPResponse`, `NginxFetchOptions` |
| `ngx_stream_js_module.d.ts` | `NginxStreamSession` |
| `njs_core.d.ts` | `NjsSharedDict`, `NjsGlobal`, `NjsConsole` |
| `njs_shell.d.ts` | CLI shell types |

### Usage in JavaScript Projects (Autocompletion)

Place the `.d.ts` files where your editor can find them and reference them via a triple-slash directive:

```javascript
/// <reference path="ngx_http_js_module.d.ts" />
/**
 * @param {NginxHTTPRequest} r
 * */
function content_handler(r) {
    r.headersOut['content-type'] = 'text/plain';
    r.return(200, "Hello");
}
```

### Writing Type-Safe TypeScript Code

For full type checking, write `.ts` files and compile to JavaScript:

```typescript
/// <reference path="ngx_http_js_module.d.ts" />
function content_handler(r: NginxHTTPRequest) {
    r.headersOut['content-type'] = 'text/plain';
    r.return(200, "Hello from TypeScript");
}
```

```bash
# Install TypeScript
$ npm install -g typescript

# Compile
$ tsc test.ts

# Resulting test.js works directly with njs
$ njs test.js
```

### npm Package

njs TypeScript definitions are also available as the `@nginx/typescript` npm package for integration into build pipelines.

---

## Section 2: Using Node.js Modules with njs

njs is not Node.js. It uses its own lightweight JS engine, so Node.js built-in modules and npm packages cannot be used directly. However, with the right tooling, many npm libraries can be adapted for use with njs.

### Approach: Bundle + Transpile

The recommended workflow is:

1. **Bundle** dependencies into a single file using browserify or webpack
2. **Transpile** modern JS to ES5-compatible code using babel
3. **Concatenate** the bundle with your njs code

### Step-by-Step Workflow

```bash
# Create project and install tools
$ mkdir my_project && cd my_project
$ npm init -y
$ npm install browserify

# Install your npm dependencies
$ npm install protobufjs
```

**load.js** — entry point that loads libraries into global scope:

```javascript
global.hello = require('./static.js');
```

**Bundle with browserify:**

```bash
$ npx browserify load.js -o bundle.js -d
```

**Concatenate with your njs code:**

```bash
$ cat bundle.js code.js > njs_bundle.js
$ njs ./njs_bundle.js
```

### Example: protobufjs with njs

Generate static module from a `.proto` file:

```bash
$ npx pbjs -t static-module helloworld.proto > static.js
```

Use the bundled library in njs:

```javascript
var pb = require('./static.js');

function set_buffer(pb) {
    var payload = { name: "TestString" };
    var message = pb.helloworld.HelloRequest.create(payload);
    var buffer = pb.helloworld.HelloRequest.encode(message).finish();
    var frame = new Uint8Array(5 + buffer.length);
    frame[0] = 0;
    frame.set(buffer, 5);
    return frame;
}
```

### Example: DNS-packet with Transpilation

Some libraries use modern JS syntax unsupported by njs, requiring transpilation:

```bash
$ npm install @babel/core @babel/cli @babel/preset-env babel-loader
$ npm install webpack webpack-cli
$ npm install buffer dns-packet
```

**webpack.config.js:**

```javascript
const path = require('path');
module.exports = {
    entry: './load.js',
    mode: 'production',
    output: { filename: 'wp_out.js', path: path.resolve(__dirname, 'dist') },
    optimization: { minimize: false },
    node: { global: true },
    module: {
        rules: [{
            test: /\.m?js$/,
            exclude: /(bower_components)/,
            use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } }
        }]
    }
};
```

**load.js:**

```javascript
global.dns = require('dns-packet')
global.Buffer = require('buffer/').Buffer
```

```bash
$ npx webpack --config webpack.config.js
$ cat dist/wp_out.js code.js > njs_dns_bundle.js
$ njs ./njs_dns_bundle.js
```

### Compatibility Restrictions

| Feature | njs Support |
|---------|-------------|
| `require()` | Supported (after bundling) |
| `Buffer` | Supported (global, Node.js-like) |
| `crypto` (Web Crypto) | Built-in `crypto` global, not Node.js `crypto` module |
| `fs` / `path` | Limited: `fs.readFileSync`, `fs.writeFileSync`, `fs.mkdir`, `fs.readdir`, `fs.realpath` |
| `setTimeout` / `setInterval` | Supported |
| `Promise` / `async` / `await` | Supported (since 0.7.0) |
| `String.bytesFrom()` | njs-specific byte string utility |

### Incompatible Node.js APIs

These Node.js APIs are **not** available in njs:

- `http` / `https` / `net` / `tls` (use `ngx.fetch()` instead)
- `stream` (use njs stream filter API)
- `child_process`
- `os`
- `cluster`
- `path` (most methods)
- `events` (use njs callback API)
- `util`
- `assert`
- `process` (partial: no `process.nextTick`, `process.hrtime`)
- `zlib` (no built-in, but bundled libraries with zlib may work if compiled to pure JS)
- Dynamic `require()` (only static resolution after bundling)
- `eval` / `new Function()` (blocked for security in nginx module mode)
- Node.js-style `crypto` module (use Web Crypto API instead)
- DOM APIs (`document`, `window`, `fetch`) — use `ngx.fetch()`

### Best Practices

- Use **browserify** or **webpack** in `production` mode (avoids `eval`)
- Use **babel** with `@babel/preset-env` to transpile modern JS
- Load libraries into `global.*` so the bundle exposes them
- Use `String.bytesFrom(frame)` to convert arrays to byte strings for nginx
- Test with `njs` CLI before deploying to nginx module
- Avoid packages that depend on Node.js built-in `net`, `http`, `stream`, or `child_process`

---

## Section 3: njs Changelog Summary

### njs 1.0.0 (June 2026)
- Aligned exception classes between njs and QuickJS engines
- `TypeError` for API misuse, `RangeError` for status bounds violations
- Rejected unsafe request targets/methods/header values in `ngx.fetch()`
- Heap use-after-free fix in `r.subrequest()` with background subrequests
- Worker segfault fix for non-slotted headers (e.g. `Proxy-Connection`)
- Content-Length truncation fix for large bodies
- Bounded string-producing chained-buffer growth (catchable `RangeError`)
- Various QuickJS engine stability fixes

### njs 0.9.9 (May 2026)
- **Security fix** (CVE-2026-8711): heap buffer overflow in `js_fetch_proxy`
- Added `js_access` directive
- Added `r.readRequestText()`, `r.readRequestArrayBuffer()`, `r.readRequestJSON()`
- Added `r.readRequestForm()` (form parsing)
- Added `jsVarNames()` method

### njs 0.9.7 (April 2026)
- Improved shared dict eviction strategy
- Added `ttl()` method to shared dictionaries
- Ed25519 and X25519 support for WebCrypto
- `crypto.subtle.wrapKey()` / `unwrapKey()`
- `crypto.randomUUID()`
- `await` expressions in tagged templates
- Switched to OpenSSL EVP for hashing

### njs 0.9.6 (March 2026)
- Optional chaining (`?.`)
- Nullish coalescing assignment (`??=`)
- Logical assignment (`||=`, `&&=`)
- ~100x performance improvement for `Error.stack`
- Shared dict state file expire field truncation fix

### njs 0.9.5 (January 2026)
- Native module support for QuickJS engine
- `js_body_filter` fixes for multiple chunks and nginx cache

### njs 0.9.4 (October 2025)
- HTTP forward proxy support for `ngx.fetch()`

### njs 0.9.2 (September 2025)
- HTTP keepalive support for `ngx.fetch()`
- Default stack size increased to 160K
- `njs.on('exit')` API for QuickJS

### njs 0.9.0 (May 2025)
- Major performance refactoring of built-in strings, symbols, and small integers
- +29% overall benchmark improvement (V8 v7 suite)

### njs 0.8.6 (October 2024)
- **QuickJS engine introduced** (`js_engine qjs`)
- `nocache` flag for `js_set`
- HTTP capture group variables exposed
- Buffer module for QuickJS

### njs 0.8.1 (September 2023)
- `js_periodic` directive (scheduled JS handlers)
- `items()` method for shared dictionaries

### njs 0.8.0 (September 2023)
- `js_shared_dict_zone` directive (shared memory dictionaries)
- First-class `Promise` support integrated

### njs 0.7.8 (October 2022)
- `js_preload_object` directive
- `ngx.conf_prefix` property
- `s.sendUpstream()` / `s.sendDownstream()` stream methods
- `njs.memoryStats` object

### njs 0.7.0 (October 2021)
- **Async/Await** implementation
- **WebCrypto API** (crypto global)
- HTTPS support for Fetch API
- `setReturnValue()` method

### njs 0.4.0 (April 2020)
- `js_import` directive (replaces `js_include`)
- Multi-value header support

### njs 0.3.8 (January 2020)
- Node.js module support via bundling
- `String.bytesFrom()`

### njs 0.2.0 (April 2018)
- `setTimeout()` / `clearTimeout()`
- `r.subrequest()` and `r.return()` methods
- Node.js-style crypto methods
- Byte string encoding (hex, base64, base64url)
- CLI version reporting

### njs 0.1.6 (January 2016)
- Initial release with basic HTTP request/response API
