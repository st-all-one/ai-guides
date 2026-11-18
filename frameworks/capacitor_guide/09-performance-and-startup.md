# 09 - Performance and Startup

Capacitor performance is dominated by three paths: how the WebView loads local web assets, how calls cross the bridge into native code, and what the web bundle does on the main thread. Tuning the wrong layer yields little.

## WebView startup and local asset serving

Native platforms do not load the bundle from `file://`. Android hosts assets and resources behind a virtual `https://` URL through `WebViewLocalServer`, which keeps the Same-Origin policy intact (`src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:40-51`). Response generation runs off the UI thread and may be parallelized, so the contract explicitly requires minimal blocking (`src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:67-80`):

```java
    /**
     * A handler that produces responses for paths on the virtual asset server.
     * <p>
     * Methods of this handler will be invoked on a background thread and care must be taken to
     * correctly synchronize access to any shared state.
     * <p>
     * On Android KitKat and above these methods may be called on more than one thread. This thread
     * may be different than the thread on which the shouldInterceptRequest method was invoke.
     * This means that on Android KitKat and above it is possible to block in this method without
     * blocking other resources from loading. The number of threads used to parallelize loading
     * is an internal implementation detail of the WebView and may change between updates which
     * means that the amount of time spend blocking in this method should be kept to an absolute
     * minimum.
     */
```

A blank screen is usually an old WebView rather than a bundle problem. The minimum WebView version is 60 by default (`docs/main/reference/config.md:244-255`), and a fresh Android 7 emulator may lack a new enough WebView, producing a blank white screen (`docs/main/getting-started/faqs.md:64-66`).

## Local server and live reload

Production uses the virtual local origin; development can point the WebView at a LAN server. Keep `server.hostname` at `localhost` to preserve secure-context APIs such as geolocation and `getUserMedia`, and leave `iosScheme`/`androidScheme` at defaults: a custom Android scheme can break routing on WebView 117 and later (`docs/main/reference/config.md:607-648`, `docs/main/reference/config.md:640-642`).

`server.url` and `server.cleartext` are meant only for live-reload servers, not production (`docs/main/reference/config.md:649-673`). The manual flow binds the dev server to `0.0.0.0`, edits `server.url`, runs `npx cap copy`, and warns against committing that config (`docs/main/guides/live-reload.md:43-71`); the CLI can instead inject it transiently with `npx cap run --live-reload --port 8100` (`docs/main/guides/live-reload.md:73-77`).

## Bridge overhead and serial plugin queues

Every plugin call crosses a serialization boundary. On Android, plugin execution is posted to a dedicated `HandlerThread`, so native work does not block the UI thread by default (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:137-141`):

```java
    // The ThreadHandler for executing plugin calls
    private final HandlerThread handlerThread = new HandlerThread("CapacitorPlugins");

    // Our Handler for posting plugin calls. Created from the ThreadHandler
    private Handler taskHandler = null;
```

On iOS the equivalent is a single dispatch queue (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:126-127`):

```swift
    // Background dispatch queue for plugin calls
    open private(set) var dispatchQueue = DispatchQueue(label: "bridge")
```

Both are serial execution contexts. A long-running plugin call occupies the queue and delays every later call, so chunk work, avoid blocking I/O inside a plugin method, and hop to `DispatchQueue.main` only for UI updates (`src/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:283`). Large payloads are a related cost: parsing and transferring big data over the bridge causes issues, and JSON-serializability is enforced when serializing plugin responses (`docs/apis/http.md:87-89`, `src/ios/Capacitor/Capacitor/JS.swift:69-72`).

## Bundle, assets, and HTTP

Sync copies the already-built web bundle into both native projects (`docs/main/basics/workflow.md:13-25`), so build output size directly affects first load. There is no bundler inside Capacitor: minification, code splitting, and asset compression belong to the framework build. Native HTTP patching of `fetch` and `XMLHttpRequest` is off by default and must be enabled explicitly (`docs/apis/http.md:11`, `docs/apis/http.md:15-20`):

```text
By default, the patching of `window.fetch` and `XMLHttpRequest` to use native libraries is disabled.
If you would like to enable this feature, modify the configuration below in the `capacitor.config` file.

| Prop          | Type                 | Description                                                                          | Default            |
| ------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| **`enabled`** | <code>boolean</code> | Enable the patching of `fetch` and `XMLHttpRequest` to use native libraries instead. | <code>false</code> |
```

On native, `CapacitorHttp` data is limited to strings or JSON; complex types need base64 serialization, and uploads or downloads of large files belong in `@capacitor/file-transfer` (`docs/apis/http.md:89`, `docs/apis/http.md:236`).

## Storage choices

Web Storage is transient here: the OS can reclaim Local Storage and, on iOS, IndexedDB when space is low (`docs/main/guides/storage.md:19`). Android can opt into persisted storage for IndexedDB. The native Preferences API avoids eviction but is key/value only and meant for small data (`docs/main/guides/storage.md:21-25`); large or high-performance data should use SQLite, optionally with encryption (`docs/main/guides/storage.md:48-54`).

## Games, CPU, and debugging cost

Games should rely on WebGL and canvas rendering, with a game engine recommended for common primitives (`docs/main/guides/games.md:9-11`).

Keep per-frame work and GC pressure off the main thread; synchronous bridge calls from a render loop contend with the serial queues described above. Verbose logging is a measurable cost: set `loggingBehavior` to `none` for release builds (`docs/main/reference/config.md:76-81`). For web targets, PWA audits use Time to Interactive and First Meaningful Paint, with Lighthouse as the measurement tool (`docs/main/web/progressive-web-apps.md:44-50`).

## Sources

- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/guides/storage
- https://capacitorjs.com/docs/guides/games
- https://capacitorjs.com/docs/guides/live-reload
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/getting-started/faqs
- https://capacitorjs.com/docs/web/progressive-web-apps
- https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java
- https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/Bridge.java
- https://github.com/ionic-team/capacitor/blob/main/ios/Sources/Capacitor/CapacitorBridge.swift
- https://developer.android.com/reference/android/webkit/WebView
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
