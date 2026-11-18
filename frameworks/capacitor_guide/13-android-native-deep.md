# 13 - Android Native Deep

## Gradle and package wiring

The runtime is an Android library: `com.android.library`, namespace `com.getcapacitor.android`, SDK 36, min SDK 24, Java 21, and a consumed ProGuard file (`src/android/capacitor/build.gradle:34-72`); WebKit 1.14.0 and Cordova framework 14.0.1 are fixed dependencies (`src/android/capacitor/build.gradle:79-93`). (`src/android/capacitor/build.gradle:42-52`)

```gradle
android {
    namespace = "com.getcapacitor.android"
    compileSdk = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    defaultConfig {
        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
        versionCode 1
        versionName "1.0"
        consumerProguardFiles 'proguard-rules.pro'
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
```

A plugin class extends `Plugin` and carries `@CapacitorPlugin`; methods carrying `@PluginMethod` are callable from JavaScript (`docs/plugins/creating-plugins/android-guide.md:29-33`). The generated example: (`docs/plugins/creating-plugins/android-guide.md:45-64`)

```java
package android.plugin.test;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Echo")
public class EchoPlugin extends Plugin {

    @PluginMethod()
    public void echo(PluginCall call) {
        String value = call.getString("value");

        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }
}
```

`@PluginMethod` defaults to `RETURN_PROMISE`; `RETURN_CALLBACK` and `RETURN_NONE` are the alternatives (`src/android/capacitor/src/main/java/com/getcapacitor/PluginMethod.java:6-15`). `@CapacitorPlugin` also declares `permissions` and legacy `requestCodes` (`src/android/capacitor/src/main/java/com/getcapacitor/annotation/CapacitorPlugin.java:11-35`).

## Registration

A local plugin is registered from `MainActivity` before `super.onCreate` (`docs/main/android/custom-code.md:53-69`). (`docs/main/android/custom-code.md:62-68`)

```diff
 public class MainActivity extends BridgeActivity {
     @Override
     public void onCreate(Bundle savedInstanceState) {
+        registerPlugin(EchoPlugin.class);
         super.onCreate(savedInstanceState);
     }
 }
```

Packaged plugins are listed by class path in `capacitor.plugins.json`; `PluginManager` loads and narrows them to `Plugin` subclasses, throwing `PluginLoadException` on missing files, bad JSON, or unknown classes (`src/android/capacitor/src/main/java/com/getcapacitor/PluginManager.java:21-55`). The bridge derives the JS id from `@CapacitorPlugin(name=...)` or the simple class name, then builds a `PluginHandle`; invalid or unloadable classes are logged rather than thrown (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:702-766`).

## Invocation and call data

`Bridge` starts a single `HandlerThread("CapacitorPlugins")` and posts `callPluginMethod` work to its `Handler` (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:215-225`, `src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:845-860`). `PluginHandle` indexes annotated methods once and invokes reflectively; unknown methods throw `InvalidPluginMethodException` (`src/android/capacitor/src/main/java/com/getcapacitor/PluginHandle.java:126-159`).

`PluginCall` wraps a `JSObject` with typed accessors that return defaults on mismatch (`src/android/capacitor/src/main/java/com/getcapacitor/PluginCall.java:154-263`). `resolve` sends data; `reject` builds `{ message, code, data }` (`src/android/capacitor/src/main/java/com/getcapacitor/PluginCall.java:44-136`). `setKeepAlive(true)` permits repeated results; `release()` clears the call (`src/android/capacitor/src/main/java/com/getcapacitor/PluginCall.java:338-381`). The response writer stamps `save`, `callbackId`, `pluginId`, `methodName`, and `success`, then releases non-kept calls (`src/android/capacitor/src/main/java/com/getcapacitor/MessageHandler.java:101-119`).

```java
    public void sendResponseMessage(PluginCall call, PluginResult successResult, PluginResult errorResult) {
        try {
            PluginResult data = new PluginResult();
            data.put("save", call.isKeptAlive());
            data.put("callbackId", call.getCallbackId());
            data.put("pluginId", call.getPluginId());
            data.put("methodName", call.getMethodName());

            boolean pluginResultInError = errorResult != null;
            if (pluginResultInError) {
                data.put("success", false);
                data.put("error", errorResult);
                Logger.debug("Sending plugin error: " + data.toString());
            } else {
                data.put("success", true);
                if (successResult != null) {
                    data.put("data", successResult);
                }
            }
```

## Navigation, assets, and reset

The bridge defines `public`, `_capacitor_file_`, `_capacitor_content_`, and `_capacitor_http_interceptor_` path markers (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:91-103`); `WebViewLocalServer` serves them via `shouldInterceptRequest` and `hostAssets` (`src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:52-55`, `src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:184`, `src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:635`). `launchIntent` blocks the HTTP proxy path first, then lets plugins override via `shouldOverrideLoad` (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:388-407`). `reset()` clears saved calls and listeners (`src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:576-581`).

## Implementation checklist

1. Add `Plugin` subclass with `@CapacitorPlugin(name = "X")`; annotate each entry point `@PluginMethod`.
2. Register locally in `MainActivity` or publish `capacitor.plugins.json` via the plugin package.
3. Use typed `PluginCall` accessors, validate keys, and reject with a code and message.
4. Set `setKeepAlive(true)` only for callbacks/listeners, and release them on removal.
5. Declare install-time permissions in the manifest; document runtime ones (`docs/plugins/creating-plugins/android-guide.md:226-235`).
6. Add `@PermissionCallback` or `@ActivityCallback` methods for results (`docs/plugins/creating-plugins/android-guide.md:180-224`, `docs/plugins/creating-plugins/android-guide.md:281-309`).
7. After `npx cap sync android`, sync Gradle files if the plugin is not visible (`docs/main/android/troubleshooting.md:109-121`).
8. Keep reflection targets from being stripped by ProGuard (`docs/main/android/troubleshooting.md:123-139`).

## Sources
- https://capacitorjs.com/docs/android/custom-code
- https://capacitorjs.com/docs/android/troubleshooting
- https://capacitorjs.com/docs/core-apis/android
- https://capacitorjs.com/docs/plugins/android
- https://capacitorjs.com/docs/plugins/configuration-values
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/8.6.2/android/capacitor/src/main/java/com/getcapacitor/Bridge.java
- https://github.com/ionic-team/capacitor/blob/8.6.2/android/capacitor/src/main/java/com/getcapacitor/PluginCall.java
- https://developer.android.com/reference/android/webkit/WebView
