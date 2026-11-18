# 12 - iOS Native Deep

Path note. At tag 8.6.2 the runtime sources live under src/ios/Capacitor/Capacitor/ (for example `src/ios/Capacitor/Capacitor/CAPBridge.swift`); src/ios/Sources/ does not exist at this tag. The docs plugin guide instead describes the ios/Sources/EchoPlugin/ layout generated for a standalone plugin package (`docs/plugins/creating-plugins/ios-guide.md:17-21`).

## Plugin shape

A plugin has an implementation class extending `NSObject` and a wrapper extending `CAPPlugin` and `CAPBridgedPlugin`; the wrapper exports methods callable from JavaScript (`docs/plugins/creating-plugins/ios-guide.md:23-25`). The generated example is the reference pattern: (`docs/plugins/creating-plugins/ios-guide.md:50-68`)

```swift
import Foundation
import Capacitor

@objc(EchoPlugin)
public class EchoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EchoPlugin"
    public let jsName = "Echo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = Echo()

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
}
```

`identifier`, `jsName`, and `pluginMethods` replace the older `CAP_PLUGIN` macro for Swift/SPM plugins; the converter tool maps macro arguments to these three properties (`docs/main/ios/spm.md:129-134`). `@objc` on the class and each method is mandatory so the Objective-C runtime can discover them (`docs/main/ios/custom-code.md:46`). `CAPPluginMethod.ReturnType` has exactly `promise`, `callback`, and `none` (`src/ios/Capacitor/Capacitor/CAPPluginMethod.swift:9-17`). JSExport turns each declaration into a shim calling `nativePromise` or `nativeCallback` (`src/ios/Capacitor/Capacitor/JSExport.swift:135-180`).

## Registration and loading

For a local plugin, override `capacitorDidLoad()` in a custom view controller. (`docs/main/ios/custom-code.md:59-61`)

```swift
override open func capacitorDidLoad() {
    bridge?.registerPluginInstance(EchoPlugin())
}
```

The bridge validates conformance, guards against duplicate JS names, calls `load(on:)`, and exports the JS shim: (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:372-389`)

```swift
    public func registerPluginInstance(_ pluginInstance: CAPPlugin) {
        guard let pluginInstance = pluginInstance as? CapacitorPlugin else {
            CAPLog.print("""

            ⚡️  Plugin \(pluginInstance.classForCoder) must conform to CAPBridgedPlugin.
            ⚡️  Not loading plugin \(pluginInstance.classForCoder)
            """)
            return
        }

        if plugins[pluginInstance.jsName] != nil {
            CAPLog.print("⚡️  Overriding existing registered plugin \(pluginInstance.classForCoder)")
        }
        plugins[pluginInstance.jsName] = pluginInstance
        pluginInstance.load(on: self)

        JSExport.exportJS(for: pluginInstance, in: webViewDelegationHandler.contentController)
    }
```

Packaged plugins are discovered from `capacitor.config.json`'s `packageClassList` and loaded by `NSClassFromString` (`src/ios/Capacitor/Capacitor/CapacitorBridge.swift:327-357`, `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:400-408`). A published plugin is both CocoaPods and SPM; add frameworks in the `.podspec` and `Package.swift` (`docs/plugins/creating-plugins/ios-guide.md:361-397`).

## Calls, data, and settlement

A method receives `CAPPluginCall`; typed accessors filter `NSNull`, while direct `options` access can return it (`docs/main/reference/core-apis/data-types.md:27-45`). Settlement borrows Promise names: (`src/ios/Capacitor/Capacitor/CAPPluginCall.swift:37-55`)

```swift
    func resolve() {
        successHandler(CAPPluginCallResult(nil), self)
    }

    func resolve(_ data: PluginCallResultData = [:]) {
        successHandler(CAPPluginCallResult(data), self)
    }

    func reject(_ message: String, _ code: String? = nil, _ error: Error? = nil, _ data: PluginCallResultData? = nil) {
        errorHandler(CAPPluginCallError(message: message, code: code, error: error, data: data))
    }

    func unimplemented() {
        unimplemented("not implemented")
    }

    func unimplemented(_ message: String) {
        errorHandler(CAPPluginCallError(message: message, code: "UNIMPLEMENTED", error: nil, data: [:]))
    }
```

`resolve(with:)` uses `JSValueEncoder` and rejects with "Failed encoding response" on failure; `decode(_:)` uses `JSValueDecoder` (`src/ios/Capacitor/Capacitor/CAPPluginCall.swift:66-96`). `keepAlive` is set by `save()`, and `isSaved` aliases it (`src/ios/Capacitor/Capacitor/CAPPluginCall.m:24-34`). Listener registration marks the call kept alive and stores it by event name; removal resolves the stored id and releases it (`src/ios/Capacitor/Capacitor/CAPPlugin.m:105-117`). `notifyListeners(..., retainUntilConsumed: true)` buffers events emitted before the first listener (`src/ios/Capacitor/Capacitor/CAPPlugin.m:82-103`). Dates stringify inbound by default; opt out with `shouldStringifyDatesInCalls = false` in `load()` (`docs/main/reference/core-apis/data-types.md:70-84`).

## Permissions, events, navigation, SPM

Declare `checkPermissions()` and `requestPermissions()`; block-based APIs can settle in place, delegate-based APIs save the call and retrieve it by id (`docs/plugins/creating-plugins/ios-guide.md:156-246`). Emit plugin events with `self.notifyListeners("event", data: [:])` and remove them via the handle from `addListener` (`docs/plugins/creating-plugins/ios-guide.md:315-346`). To intercept navigation implement `shouldOverrideLoad:`; `true` cancels, `false` allows, `nil` defers to default policy (`docs/plugins/creating-plugins/ios-guide.md:354-359`; `src/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift:83-99`). Use `unavailable` for newer-OS gates and `unimplemented` for platform gaps (`docs/plugins/creating-plugins/ios-guide.md:287-313`).

SPM has used a generated `CapApp-SPM` base package since Capacitor 6; the CLI rewrites it on sync, so do not edit it by hand. (`docs/main/ios/spm.md:20-24`)

```text
When a Capacitor project is using SPM we use a 'Base SPM' package that will serve as the place that references all of your projects dependencies:

![Base SPM Picture](/img/v6/docs/ios/spm/base-spm.png)

The Capacitor CLI will modify the CapApp-SPM package when you sync new plugins. It is important you do not touch the contents here because the CLI can and will change things.
```

Create an SPM project with `npx cap add ios --packagemanager SPM`, and migrate with `npx cap spm-migration-assistant` followed by two Xcode steps (`docs/main/ios/spm.md:26-121`).

## Sources
- https://capacitorjs.com/docs/ios/custom-code
- https://capacitorjs.com/docs/ios/spm
- https://capacitorjs.com/docs/core-apis/ios
- https://capacitorjs.com/docs/core-apis/data-types
- https://capacitorjs.com/docs/plugins/ios
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/8.6.2/ios/Capacitor/Capacitor/CAPPlugin.m
- https://github.com/ionic-team/capacitor/blob/8.6.2/ios/Capacitor/Capacitor/CAPPluginCall.swift
- https://developer.apple.com/documentation/swift/codable
- https://developer.apple.com/documentation/webkit/wkwebview
- https://registry.npmjs.org/@capacitor/ios
