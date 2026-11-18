# 07 - Logs and Errors

## Where logs originate

iOS routes native diagnostics through `CAPLog`, a thin `Swift.print` wrapper with a global switch and a length cap; it is not a persistent logger. (`src/ios/Capacitor/Capacitor/CAPLog.swift:1-11`)

```swift
public class CAPLog {
    public static var enableLogging: Bool = true

    public static func print(_ items: Any..., separator: String = " ", terminator: String = "\n") {
        if enableLogging {
            for (itemIndex, item) in items.enumerated() {
                Swift.print("\(item)".prefix(4068), terminator: itemIndex == items.count - 1 ? terminator : separator)
            }
        }
    }
}
```

Android uses `Logger` with `LOG_TAG_CORE = "Capacitor"`; `tags(...)` builds subtags, and every level checks `shouldLog()`, which is false only when config disables logging (`src/android/capacitor/src/main/java/com/getcapacitor/Logger.java:8-34`, `src/android/capacitor/src/main/java/com/getcapacitor/Logger.java:52-102`). Web console calls are bridged on iOS by wrapping `debug/error/info/log/trace/warn` into `toNative('Console', 'log', ...)` (`src/core/native-bridge.ts:852-872`), surfaced as `⚡️ [level] - message` (`src/ios/Capacitor/Capacitor/Plugins/Console.swift:14`). Android gets console forwarding from `BridgeWebChromeClient` (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:280`).

## Bootstrap and configuration failures

Missing injected assets are fatal on iOS: `JSExport.exportBridgeJS` logs "Required native-bridge.js file in Capacitor not found. Bridge will not function!" and throws `errorExportingCoreJS` (`src/ios/Capacitor/Capacitor/JSExport.swift:24-35`); `CapacitorBridge.fatalError` then prints the FATAL ERROR block and advises `npx capacitor copy` (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:185-200`). Android logs "Unable to export Capacitor JS. App will not function!" (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:1038-1040`). Bad app directories, missing or malformed `capacitor.config.json`/`config.xml`, and a missing web root produce targeted messages before `exit(1)` (`src/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:341-373`).

## JavaScript errors

`window.onerror` is installed only when `Capacitor.DEBUG`; handlers post a `js.error` record with message, url, line, column, and stringified error (`src/core/native-bridge.ts:944-973`). iOS renders that block as: (`src/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift:351-356`)

```swift
        CAPLog.print("\n⚡️  ------ STARTUP JS ERROR ------\n")
        CAPLog.print("⚡️  \(message)")
        CAPLog.print("⚡️  URL: \(url)")
        CAPLog.print("⚡️  \(filename):\(line):\(col)")
        CAPLog.print("\n⚡️  See above for help with debugging blank-screen issues")
    }
```

Android logs the whole payload via `Logger.error("JavaScript Error: " + jsonStr)` on the `js.error` branch of `postMessage`. (`src/android/capacitor/src/main/java/com/getcapacitor/MessageHandler.java:82-95`)
```java
            } else if (isJavaScriptError) {
                Logger.error("JavaScript Error: " + jsonStr);
            } else {
                String pluginId = postData.getString("pluginId");
                String methodName = postData.getString("methodName");
                JSObject methodData = postData.getJSObject("options", new JSObject());

                Logger.verbose(
                    Logger.tags("Plugin"),
                    "To native (Capacitor plugin): callbackId: " + callbackId + ", pluginId: " + pluginId + ", methodName: " + methodName
                );

                this.callPluginMethod(callbackId, pluginId, methodName, methodData);
            }
```

## Settling calls and interpreting failures

`returnResult` copies the plain error object key by key onto a fresh `cap.Exception`, preserving stack and `instanceof`, then invokes either the callback with `(null, error)` or the promise's `reject`. (`src/core/native-bridge.ts:1057-1072`)

```typescript
          if (result.error) {
            // ensure stacktraces by copying error properties to an Error
            result.error = Object.keys(result.error).reduce((err, key) => {
              // use any type to avoid importing util and compiling most of .ts files
              (err as any)[key] = (result as any).error[key];
              return err;
            }, new cap.Exception(''));
          }

          if (typeof storedCall.callback === 'function') {
            // callback
            if (result.success) {
              storedCall.callback(result.data);
            } else {
              storedCall.callback(null, result.error);
            }
```

Errors with no stored callback are warned, not thrown (`src/core/native-bridge.ts:1085-1088`). Codes come from `ExceptionCode`: `UNIMPLEMENTED` and `UNAVAILABLE` (`src/core/src/util.ts:3-20`); native `reject` fills `message` and optional `code` and `data` (`src/android/capacitor/src/main/java/com/getcapacitor/PluginCall.java:74-92`, `src/ios/Capacitor/Capacitor/CAPPluginCall.swift:45-63`). iOS serialization failures emit `[Capacitor Plugin Error] - plugin - method - Unable to serialize plugin response as JSON.` and return `{}` (`src/ios/Capacitor/Capacitor/JS.swift:60-75`). Routing failures differ: iOS only logs a missing plugin or method, leaving the promise pending (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:500-525`), while Android calls `errorCallback("unable to find plugin : ...")` (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:826-829`).

## Common failure modes

| Symptom | Likely origin | Action |
| --- | --- | --- |
| "Plugin not implemented" | Plugin absent from registry or JS injection blocked | `npx cap sync ios` / `npx cap sync android`, verify Podfile or Gradle sync (`docs/main/ios/troubleshooting.md:88-98`, `docs/main/android/troubleshooting.md:109-121`) |
| Blank screen, STARTUP JS ERROR | Bundled JS throws at load | Read the URL/line block, rebuild the web bundle (`docs/main/ios/troubleshooting.md:12-16`) |
| Promise never settles | iOS routing log for unknown plugin or missing `@objc` selector | Check `jsName`, `pluginMethods`, and `@objc` (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:509-525`) |
| Sandbox not in sync with Podfile.lock | CocoaPods out of date | `npx cap update ios` (`docs/main/ios/troubleshooting.md:50-60`) |
| Missing classes at runtime | ProGuard shrinking reflection targets | Keep rules for the Plugin base class (`docs/main/android/troubleshooting.md:138-139`) |
| JS injection blocked on iOS | `WKAppBoundDomains` or service workers | Remove key or set `limitsNavigationsToAppBoundDomains` (`docs/main/ios/troubleshooting.md:98`) |

## Sources
- https://capacitorjs.com/docs/ios/troubleshooting
- https://capacitorjs.com/docs/android/troubleshooting
- https://capacitorjs.com/docs/core-apis
- https://capacitorjs.com/docs/core-apis/saving-calls
- https://capacitorjs.com/docs/plugins/creating-plugins
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/8.6.2/core/native-bridge.ts
- https://github.com/ionic-team/capacitor/blob/8.6.2/ios/Capacitor/Capacitor/CapacitorBridge.swift
- https://github.com/ionic-team/capacitor/blob/8.6.2/android/capacitor/src/main/java/com/getcapacitor/Logger.java
- https://developer.apple.com/documentation/os/logging
- https://developer.android.com/reference/android/util/Log
