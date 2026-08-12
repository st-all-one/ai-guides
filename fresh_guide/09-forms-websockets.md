# 09 — Forms, File Uploads & WebSockets

> POST handling, formData, multipart, CSRF, app.ws(), ctx.upgrade(), upgrade modes

## 1. Form POST — application/x-www-form-urlencoded

```tsx
// routes/subscribe.tsx
import { page } from "fresh";
import { define } from "@/utils.ts";

export const handlers = define.handlers({
  async GET(ctx) {
    return page({ message: null });
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    const email = form.get("email")?.toString();
    if (!email || !email.includes("@")) {
      return page({ message: "Invalid email" }, { status: 422 });
    }
    // await addToMailingList(email);
    return new Response(null, {
      status: 303, // See Other — PRG pattern
      headers: { Location: "/thanks-for-subscribing" },
    });
  },
});

export default define.page<typeof handlers>(function Subscribe({ data }) {
  return (
    <>
      <form method="post">
        <input type="email" name="email" value="" />
        <button type="submit">Subscribe</button>
      </form>
      {data?.message && <p>{data.message}</p>}
    </>
  );
});
```

**Key points:**
- `ctx.req.formData()` parses `application/x-www-form-urlencoded` bodies
- Default `<form method="post">` sends as urlencoded (no `encType` needed)
- PRG pattern: redirect after POST → prevents double-submission on refresh
- `page()` can accept 2nd arg with `status`, `headers`

**Getting multiple values:**
```ts
const tags = form.getAll("tags").map(v => v.toString());
```

**Getting checkbox/boolean:**
```ts
const agreed = form.get("terms") === "on";
```

## 2. File Uploads — multipart/form-data

```tsx
// routes/upload.tsx
import { page } from "fresh";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const file = form.get("my-file") as File | null;
    if (!file) return page({ message: "Please try again" });

    const name = file.name;
    const contents = await file.text();           // string content
    // const buffer = await file.arrayBuffer();   // binary content
    // const stream = file.stream();              // ReadableStream

    // Validate file
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MiB
    if (contents.length > MAX_SIZE) {
      return page({ message: "File too large (max 10 MiB)" });
    }

    // Process file: save to disk, upload to S3, parse CSV, etc.
    return page({ message: `${name} uploaded! (${contents.length} bytes)` });
  },
});

export default define.page<typeof handler>(function Upload({ data }) {
  return (
    <>
      <form method="post" encType="multipart/form-data">
        <input type="file" name="my-file" />
        <button type="submit">Upload</button>
      </form>
      {data && <p>{data.message}</p>}
    </>
  );
});
```

**Critical:** Set `encType="multipart/form-data"` on the `<form>`. Without it, the browser sends urlencoded and `formData()` won't contain the file.

**Multiple files:**
```tsx
<input type="file" name="files" multiple />
```
```ts
const files = form.getAll("files") as File[];
for (const file of files) {
  const content = await file.text();
}
```

**File interface (Web API):**
```ts
interface File {
  name: string;        // original filename
  size: number;        // bytes
  type: string;        // MIME type (e.g. "image/png")
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array>;
}
```

## 3. Security Notes

**Always validate server-side.** Client-side validation is UX only — it can be bypassed.

```ts
const form = await ctx.req.formData();
const email = form.get("email")?.toString();
const amount = form.get("amount")?.toString();

// Validate
if (!email || !email.includes("@")) return page({ error: "Invalid email" });
if (!amount || isNaN(Number(amount))) return page({ error: "Invalid amount" });
```

**File upload validation checklist:**
```ts
const file = form.get("upload") as File | null;

// 1. Existence
if (!file) return page({ error: "Missing file" });

// 2. Size limit
const MAX_SIZE = 10 * 1024 * 1024;
if (file.size > MAX_SIZE) return page({ error: "File too large" });

// 3. Type whitelist (check extension + MIME)
const ALLOWED = ["image/png", "image/jpeg", "application/pdf"];
if (!ALLOWED.includes(file.type)) return page({ error: "Invalid file type" });

// 4. Never use user-provided filename directly on disk
const safeName = crypto.randomUUID() + ".png";
```

**CSRF protection:** Fresh does not auto-handle CSRF. See `security.md` for SameSite cookies, CSRF tokens, and Origin header checking.

**Rate limiting on file uploads:** Consider at the reverse proxy level (Caddy/Nginx) or via middleware counting upload requests per IP.

## 4. WebSockets — app.ws() (Simplest)

```ts
// main.ts or app.ts
import { App } from "fresh";

const app = new App()
  .ws("/ws", {
    open(socket) {
      console.log("Client connected");
    },
    message(socket, event) {
      console.log("Received:", event.data);
      socket.send(`Echo: ${event.data}`);
    },
    close(socket, code, reason) {
      console.log("Disconnected", code, reason); // code=1000, reason="going away"
    },
    error(socket, event) {
      console.error("WebSocket error", event);
    },
  });
```

Registers a GET route at `/ws` that auto-upgrades to WebSocket. All callbacks are optional — omit any you don't need.

**Forwarding to multiple clients (broadcast pattern):**
```ts
const sockets = new Set<WebSocket>();

const app = new App()
  .ws("/chat", {
    open(socket) {
      sockets.add(socket);
      socket.onclose = () => sockets.delete(socket);
    },
    message(_socket, event) {
      for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(event.data);
        }
      }
    },
  });
```

## 5. WebSockets — ctx.upgrade() Managed Mode

Used inside `define.handlers` or route handlers. First argument is a handlers object — Fresh detects managed mode by the function-valued keys.

```ts
// routes/api/ws.ts
import { define } from "@/utils.ts";

export const handlers = define.handlers({
  GET(ctx) {
    return ctx.upgrade({
      open(socket) {
        console.log("Client connected");
      },
      message(socket, event) {
        socket.send(`Echo: ${event.data}`);
      },
      close(socket, code, reason) {
        console.log("Disconnected", code, reason);
      },
      error(socket, event) {
        console.error("WebSocket error", event);
      },
    });
  },
});
```

**When managed mode:** You can factor out the handler object for reuse:

```ts
const wsHandlers = {
  open(socket: WebSocket) { /* ... */ },
  message(socket: WebSocket, event: MessageEvent) { /* ... */ },
};

export const handlers = define.handlers({
  GET(ctx) {
    return ctx.upgrade(wsHandlers);
  },
});
```

## 6. WebSockets — ctx.upgrade() Bare Mode

When you need direct access to the `WebSocket` object (chat rooms, pub/sub, custom event wiring). Fresh detects bare mode when the first argument is *not* a handlers object.

```ts
// routes/api/chat.ts
const clients = new Set<WebSocket>();

export const handlers = define.handlers({
  GET(ctx) {
    const { socket, response } = ctx.upgrade();

    socket.onopen = () => {
      clients.add(socket);
    };

    socket.onmessage = (event) => {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(event.data);
        }
      }
    };

    socket.onclose = () => {
      clients.delete(socket);
    };

    socket.onerror = (event) => {
      console.error("Socket error", event);
    };

    return response; // must return the response!
  },
});
```

**Mode detection rules:**
- First arg has keys `open`, `message`, `close`, or `error` → **managed mode** → `ctx.upgrade()` returns the `Response`
- First arg is an options object or absent → **bare mode** → `ctx.upgrade()` returns `{ socket, response }`

**Don't forget `return response` in bare mode** — without it the upgrade won't complete and the client never connects.

## 7. Upgrade Options

```ts
interface UpgradeOptions {
  idleTimeout?: number;  // seconds before auto-close on idle (default: 120)
  protocol?: string;     // Sec-WebSocket-Protocol header value
}

// Managed mode
ctx.upgrade(handlers, { idleTimeout: 60, protocol: "graphql-ws" });

// Bare mode
const { socket, response } = ctx.upgrade({ idleTimeout: 60 });

// app.ws() with options
app.ws("/ws", handlers, { idleTimeout: 60 });
```

## 8. Client-Side WebSocket

```ts
// static/ws-client.js or inline <script>
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${location.host}/ws`);

ws.onopen = () => {
  console.log("Connected");
  ws.send("Hello!");
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
  // event.data is always a string (or Blob if binaryType set)
};

ws.onclose = (event) => {
  console.log("Disconnected", event.code, event.reason);
  // Reconnect logic:
  // setTimeout(() => { /* new WebSocket(...) */ }, 1000);
};

ws.onerror = (event) => {
  console.error("WebSocket error", event);
};

// Sending JSON
ws.send(JSON.stringify({ type: "message", text: "hello" }));
```

**In a Preact island:**
```tsx
// islands/RealtimeCounter.tsx
import { useSignal, useEffect } from "preact/hooks";

export default function RealtimeCounter() {
  const count = useSignal(0);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/api/ws`);
    ws.onmessage = (event) => { count.value = Number(event.data); };
    return () => ws.close();
  }, []);

  return <p>Count: {count}</p>;
}
```

## 9. Vite Dev Server Note

WebSocket upgrades under `deno task dev` require **Fresh 2.4+** and **Deno 2.8+**.

For older versions, use one of:
- `deno task build && deno task start` (production mode)
- Run a separate entry point that bypasses Vite's dev server for WS routes

If WS isn't working in dev mode, try `deno task start` first.

## 10. Non-WebSocket Requests to WS Routes

A non-upgrade request to a WebSocket route throws:
```
HttpError: 400 — "Expected a WebSocket upgrade request"
```

This is auto-handled by Fresh's error pipeline. No manual guard needed.

## 11. Handler Callback Reference

| Callback | Signature | Description |
|----------|-----------|-------------|
| `open` | `(socket: WebSocket) => void` | Connection established |
| `message` | `(socket: WebSocket, event: MessageEvent) => void` | Message received. Use `event.data` for payload. |
| `close` | `(socket: WebSocket, code: number, reason: string) => void` | Connection closed. `code` is WebSocket close code (e.g. 1000 = normal). |
| `error` | `(socket: WebSocket, event: Event) => void` | Error on the connection |

**readiness states:**
```ts
WebSocket.CONNECTING  // 0
WebSocket.OPEN        // 1
WebSocket.CLOSING     // 2
WebSocket.CLOSED      // 3
```

Always check `socket.readyState === WebSocket.OPEN` before `.send()`.

## 12. Quick Decision Table

| Need | Use |
|------|-----|
| Simple echo / broadcast from app root | `app.ws()` |
| WS tied to a specific route with other HTTP methods | `ctx.upgrade()` managed mode |
| Chat room, pub/sub, custom event wiring | `ctx.upgrade()` bare mode |
| Plain form POST | `<form method="post">` — no `encType` |
| Upload ≥1 files | `<form encType="multipart/form-data">` |
| PRG after mutation | 303 redirect |
| Validation error redisplay | `page(data, { status: 422 })` |
