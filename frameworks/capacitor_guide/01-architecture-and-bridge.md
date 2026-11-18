# 01 - Architecture and Bridge

Scope: `src-head/ARCHITECTURE.md` is main-branch guidance, not text from the pinned 8.6.2 tag; runtime claims below come from the src/core/, src/ios/, and src/android/ trees at the tag. Main branch places the bridge asset under ios/Sources/Capacitor/assets/; 8.6.2 ships it at src/ios/Capacitor/Capacitor/assets/native-bridge.js.

## Two runtimes and bootstrap

`@capacitor/core` is bundled by the app; the bridge script is injected by the host. The main-branch document states: (`src-head/ARCHITECTURE.md:62-66`)

```text
2. **`native-bridge.js`** (`core/native-bridge.ts`) — a standalone IIFE injected into
   the web view **by the native layer before any page script runs**. It is never
   imported by app code and is not part of the `@capacitor/core` module graph. It is
   compiled into `android/capacitor/src/main/assets/native-bridge.js` and
   `ios/Sources/Capacitor/assets/native-bridge.js` as generated, committed artifacts.
```

iOS installs three document-start scripts: a global stub setting `window.Capacitor`, `WEBVIEW_SERVER_URL`, and native flags (`src/ios/Capacitor/Capacitor/JSExport.swift:18-22`), the bridge itself, then per-plugin shims and `PluginHeaders`; the app bundle runs last (`src-head/ARCHITECTURE.md:267-291`). Android concatenates the same strings through `JSInjector`, preferring `WebViewCompat.addDocumentStartJavaScript` with HTML head splicing as fallback (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:264-275`). `createCapacitor` augments the existing global rather than replacing it (`src/core/src/runtime.ts:16-19`). Plugins register before injection on both platforms (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:327-357`, `src/android/capacitor/src/main/java/com/getcapacitor/PluginManager.java:21-39`).

## Wire protocol

One options object per call. (`src/core/src/definitions-internal.ts:94-100`)

```typescript
export interface MessageCallData {
  type?: 'message';
  callbackId: string;
  pluginId: string;
  methodName: string;
  options: any;
}
```

The reply shape adds `data`, `success`, optional `error`, and `save` (`src/core/src/definitions-internal.ts:118-126`). Same payload, different channel: (`src/core/native-bridge.ts:923-942`)

```typescript
    if (getPlatformId(win) === 'android') {
      // android platform
      postToNative = (data) => {
        try {
          win.androidBridge.postMessage(JSON.stringify(data));
        } catch (e) {
          win?.console?.error(e);
        }
      };
    } else if (getPlatformId(win) === 'ios') {
      // ios platform
      postToNative = (data) => {
        try {
          data.type = data.type ? data.type : 'message';
          win.webkit.messageHandlers.bridge.postMessage(data);
        } catch (e) {
          win?.console?.error(e);
        }
      };
    }
```

Replies enter through iOS `evaluateJavaScript("window.Capacitor.fromNative(...)")` or Android `androidBridge.onmessage` plus `JSON.parse` and `returnResult` (`src/core/native-bridge.ts:1032-1043`).

## Callback identity and settlement

The `callbacks` map is keyed by string id; the counter is randomized so a late reply from an older document cannot collide. (`src/core/native-bridge.ts:908-911`)

```typescript
    // Counter of callback ids, randomized to avoid
    // any issues during reloads if a call comes back with
    // an existing callback id from an old session
    let callbackIdCount = Math.floor(Math.random() * 134217728);
```

`toNative` stores the resolver or callback under `++callbackId`, emits `{ callbackId, pluginId, methodName, options }`, and uses sentinel `'-1'` for fire-and-forget calls (`src/core/native-bridge.ts:983-1012`). A promise is removed after its single settlement: (`src/core/native-bridge.ts:1073-1083`)

```typescript
          } else if (typeof storedCall.resolve === 'function') {
            // promise
            if (result.success) {
              storedCall.resolve(result.data);
            } else {
              storedCall.reject(result.error);
            }

            // no need to keep this stored callback
            // around for a one time resolve promise
            callbacks.delete(result.callbackId);
```

`save === false` also deletes the entry (`src/core/native-bridge.ts:1090-1092`), and `removeListener`/`removeAllListeners` purge listener bookkeeping (`src/core/native-bridge.ts:985-995`). A `keepAlive` call is the exception that legitimately resolves repeatedly (`docs/main/reference/core-apis/saving-calls.md:46-64`).

## Routing, data, navigation

iOS resolves by JS name; failure only logs, so a promise may remain pending. (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:500-503`)

```swift
        guard let plugin = plugins[call.pluginId] ?? load() else {
            CAPLog.print("⚡️  Error loading plugin \(call.pluginId) for call. Check that the pluginId is correct")
            return
        }
```

Android rejects unknown plugins immediately. (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:822-830`)

```java
    public void callPluginMethod(String pluginId, final String methodName, final PluginCall call) {
        try {
            final PluginHandle plugin = this.getPlugin(pluginId);

            if (plugin == null) {
                Logger.error("unable to find plugin : " + pluginId);
                call.errorCallback("unable to find plugin : " + pluginId);
                return;
            }
```

Only JSON-representable values cross (`docs/main/reference/core-apis/data-types.md:9`); dates become ISO 8601 strings and JS `null` becomes `NSNull` (`docs/main/reference/core-apis/data-types.md:72-84`); files need base64 encoding first (`src/core/native-bridge.ts:33-52`). iOS defaults to the `capacitor` scheme and Android to `https`/`localhost` (`docs/main/reference/config.md:624-648`); the iOS scheme handler serves interceptor and `_capacitor_file_` paths before routed assets (`src/ios/Capacitor/Capacitor/WebViewAssetHandler.swift:38-53`), while navigation consults plugins, then `allowNavigation`, then the OS for external top-level URLs (`src/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift:83-121`). `Bridge.reset()` clears saved calls and listeners (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:576-581`). Plugin code runs on a serial iOS dispatch queue and a single Android handler thread (`src-head/ARCHITECTURE.md:535-544`).

## Sources
- https://capacitorjs.com/docs/core-apis
- https://capacitorjs.com/docs/core-apis/data-types
- https://capacitorjs.com/docs/core-apis/saving-calls
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/8.6.2/core/native-bridge.ts
- https://github.com/ionic-team/capacitor/blob/8.6.2/ios/Capacitor/Capacitor/CapacitorBridge.swift
- https://github.com/ionic-team/capacitor/blob/8.6.2/android/capacitor/src/main/java/com/getcapacitor/Bridge.java
- https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/2875766-seturlschemehandler
- https://developer.android.com/reference/android/webkit/WebView
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
