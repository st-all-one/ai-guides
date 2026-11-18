# 16 - HTTP server and Web APIs

`Deno.serve` is the built-in HTTP server: it speaks HTTP/1.1 and HTTP/2 and uses
web-standard `Request` and `Response` objects
(`docs/rt_runtime__fundamentals__http_server.md:11-15`). The handler is called
per request and returns a `Response` or `Promise<Response>`
(`docs/rt_runtime__fundamentals__http_server.md:19-33`).

## Server options and lifecycle

| Option or call | Observable behavior |
|---|---|
| `Deno.serve(handler)` | listen on port 8000 by default |
| `Deno.serve({ port, hostname }, handler)` | bind a custom port and interface |
| `signal` | `AbortSignal` tying server lifetime to other logic |
| `server.shutdown()` | stop accepting new connections, let in-flight finish |
| `Deno.addSignalListener("SIGINT", ...)` | graceful exit on signal |
| `cert` / `key` | PEM contents, not paths, for HTTPS |
| `automaticCompression: true` | opt in to gzip/brotli body compression |
| `DENO_SERVE_AUTOMATIC_COMPRESSION=1` | process-wide compression switch |
| `--unstable-no-legacy-abort` | only abort the request signal on real disconnect |
| `export default { fetch }` + `deno serve` | `Deno.ServeDefaultExport` style server |

Source: `docs/rt_runtime__fundamentals__http_server.md:44-56`, `:204-221`,
`:223-283`, `:325-334`, `:382-411`. A complete handler is three lines
(`docs/rt_runtime__fundamentals__http_server.md:27-29`):
```ts
Deno.serve((_req) => {
  return new Response("Hello, World!");
});
```

Run it with `deno run --allow-net server.ts`
(`docs/rt_runtime__fundamentals__http_server.md:35-39`). HTTP/2 is automatic,
including cleartext with prior knowledge
(`docs/rt_runtime__fundamentals__http_server.md:268-274`).

## Requests, bodies, and streaming

| Facility | Behavior |
|---|---|
| `req.method`, `req.headers`, `new URL(req.url)` | read method, headers, path, query |
| `req.text()` / `json()` / `formData()` | can fail if the client hangs up mid-body |
| `new Response(body, { status, headers })` | set status and content type |
| `ReadableStream` + `pipeThrough(TextEncoderStream())` | stream a body |
| stream `cancel()` | called on client hangup; clear timers there |

Source: `docs/rt_runtime__fundamentals__http_server.md:58-157`. A streamed
response must stop its producer on cancel
(`docs/rt_runtime__fundamentals__http_server.md:123-140`):
```ts
Deno.serve((req) => {
  let timer: number;
  const body = new ReadableStream({
    async start(controller) {
      timer = setInterval(() => {
        controller.enqueue("Hello, World!\n");
      }, 1000);
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
});
```

Compression is negotiated on `Accept-Encoding` quality values, a compressible
`Content-Type`, and a body larger than 64 bytes; responses with
`Content-Encoding`, `Content-Range`, or `Cache-Control: no-transform` are skipped
(`docs/rt_runtime__fundamentals__http_server.md:276-323`).

## Routing and static files

| Approach | Detail |
|---|---|
| `URLPattern` | built-in web API for path matching with named groups |
| `@std/http` `route` | maps pattern and method pairs to handlers |
| `serveDir` from `@std/http/file-server` | handles content types, ranges, traversal protection |
| Oak / Hono | middleware and larger route trees |

Source: `docs/rt_runtime__fundamentals__http_server.md:159-202`, `:413-421`.
Named path groups need no framework (`docs/rt_runtime__fundamentals__http_server.md:166-178`):
```ts
const userPattern = new URLPattern({ pathname: "/users/:id" });

Deno.serve((req) => {
  const match = userPattern.exec(req.url);
  if (match) {
    const id = match.pathname.groups.id;
    return new Response(`User ${id}`);
  }
  if (new URL(req.url).pathname === "/") {
    return new Response("Home");
  }
  return new Response("Not found", { status: 404 });
});
```

## WebSockets

`Deno.upgradeWebSocket(req)` returns `{ socket, response }`; return the response
to complete the upgrade. WebSockets are supported only on HTTP/1.1, and the
upgraded connection cannot carry HTTP traffic afterward
(`docs/rt_runtime__fundamentals__http_server.md:353-370`):
```ts
Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.addEventListener("open", () => {
    console.log("a client connected!");
  });

  socket.addEventListener("message", (event) => {
    if (event.data === "ping") {
      socket.send("pong");
    }
  });

  return response;
});
```

## Web Platform APIs

| API | Deno-specific behavior |
|---|---|
| `fetch` | no cookie jar, no same-origin policy, no CORS/CORB/OPR handling |
| `fetch` init | `referrer`, `mode`, `credentials`, `cache`, `integrity`, `keepalive` absent; `priority` write-only |
| local fetch | absolute `file:` URLs only, `GET` only, needs `--allow-read` |
| `structuredClone` / `postMessage` | transfer `ArrayBuffer`, `MessagePort`, and stream objects |
| `EventTarget` | events do not bubble; `timeStamp` is always `0` |
| `location` | requires `--location`; assignment throws |
| Web Storage | 10 MB, keyed by location, config path, or main module |
| Web Workers | module type only; local modules need `--allow-read`, remote need `--allow-net` |
| Temporal | global since 2.7 without flags; earlier versions used `--unstable-temporal` |
| CompressionStream | `gzip`, `deflate`, `deflate-raw`, and Brotli since 2.7 |
| File locking | `lock`, `lockSync`, `tryLock`, `tryLockSync` on `Deno.FsFile` |
| Cache API | only `open`, `has`, `delete`, `keys`, `match`, `put`; no relative paths |

Source: `docs/rt_runtime__reference__web_platform_apis.md:28-103`, `:105-165`,
`:178-296`, `:298-417`, `:682-737`, `:1111-1161`. Worker construction must
carry `type: "module"` and an absolute specifier
(`docs/rt_runtime__reference__web_platform_apis.md:315-321`):
```ts
// Good
new Worker(import.meta.resolve("./worker.js"), { type: "module" });

// Bad
new Worker(import.meta.resolve("./worker.js"));
new Worker(import.meta.resolve("./worker.js"), { type: "classic" });
new Worker("./worker.js", { type: "module" });
```

Register the message handler before the first `await` in a worker module or
early messages are lost (`docs/rt_runtime__reference__web_platform_apis.md:324-342`).

## Sources

- https://docs.deno.com/runtime/fundamentals/http_server/
- https://docs.deno.com/runtime/reference/web_platform_apis/
- https://docs.deno.com/runtime/fundamentals/web_dev/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/api/deno/~/Deno.serve
- https://jsr.io/@std/http/doc/file-server
- https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
- https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- https://github.com/denoland/deno
- https://fetch.spec.whatwg.org/
- https://docs.deno.com/runtime/fundamentals/security/
