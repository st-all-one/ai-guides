# 14 - Web and PWA

Capacitor treats the browser as a first-class target, not an emulator of native behavior. The same `@capacitor/core` dependency and plugin APIs serve both contexts, while the bridge selects web or native implementations at runtime. Correct web behavior depends on knowing which plugins actually have a web implementation, how to detect the platform, and what a PWA needs beyond the web bundle.

## One codebase, two runtimes

The bridge runs in either a native context or the web, with many plugins available in both under the same API and calling conventions (`docs/main/web/progressive-web-apps.md:22-26`):

```text
Capacitor has first-class support for Progressive Web Apps _and_ native apps. That means that Capacitor's bridge supports running in either a native context or in the web, with many plugins available _in both contexts_ with the exact same API and calling conventions.

This means you use `@capacitor/core` and Capacitor plugins as dependencies for both your native app _and_ your Progressive Web App, and Capacitor seamlessly calls web code when required and native code when available.

Additionally, Capacitor offers a number of utilities for querying the current platform to provide customized experiences when running natively or on the web.
```

A PWA is a web app deployed to a normal server, reachable by URL and indexable by search engines, optimized for mobile performance and using Web APIs for native-like features (`docs/main/web/progressive-web-apps.md:14-18`). There is no separate web build of the Capacitor runtime: the built web bundle from the framework toolchain is the app, and `webDir` tells the CLI where to find it (`docs/main/reference/config.md:16-26`, `docs/main/basics/workflow.md:11-25`).

## Platform detection

Branch on capability rather than assumption. `Capacitor.getPlatform()` returns `web`, `ios`, or `android`; `isNativePlatform()` is false for both browsers and installed PWAs (`docs/main/basics/utilities.md:42-46`, `docs/main/basics/utilities.md:58-62`). The documented branch looks like this (`docs/main/basics/utilities.md:49-55`):

```typescript
if (Capacitor.getPlatform() === 'ios') {
  console.log('iOS!');
} else if (Capacitor.getPlatform() === 'android') {
  console.log('Android!');
} else {
  console.log('Web!');
}
```

`Capacitor.isPluginAvailable(name)` checks the plugin registry, including custom plugins, and should gate any call that may lack a web implementation (`docs/main/basics/utilities.md:79-88`):

```typescript
const isAvailable = Capacitor.isPluginAvailable('Camera');

if (!isAvailable) {
  // Have the user upload a file instead
} else {
  // Otherwise, make the call:
  const image = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
  });
}
```

## Web plugin fallbacks

Plugin classes are implemented in JavaScript as proxies, and the `WebPlugin` base class provides listener registration and window-event bridging (`src/core/src/web-plugin.ts:9-41`, `src/core/src/web-plugin.ts:75-84`). A pluginmethod with no web implementation signals that explicitly via `Unimplemented` or `Unavailable` exceptions rather than failing silently (`src/core/src/web-plugin.ts:86-92`):

```typescript
  protected unimplemented(msg = 'not implemented'): CapacitorException {
    return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
  }

  protected unavailable(msg = 'not available'): CapacitorException {
    return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
  }
```

Practical fallbacks therefore follow a fixed pattern: check availability, prefer a web API where one exists, then degrade the feature. For example, `CapacitorHttp` supports complex body types only on web or through patched `fetch`/`XMLHttpRequest`, while file transfer is not supported on web (`docs/apis/http.md:236`, `docs/apis/file-transfer.md:216`). Storage is another divergence: on web, Local Storage and IndexedDB follow normal browser eviction rules, whereas native Preferences is eviction-resistant (`docs/main/guides/storage.md:19-25`).

## File URLs and secure context

The web view and device files use different protocols, so filesystem paths must be rewritten before display. `Capacitor.convertFileSrc()` turns a native `file:///` path into a web-view-friendly URL such as `http://localhost/_capacitor_file_/...` (`docs/main/basics/utilities.md:22-28`). On the web platform this is primarily a portability concern: code that saves and renders a file should call the helper unconditionally so the same source works in both runtimes.

Keep `server.hostname` at its `localhost` default. It is treated as a secure context, which is required for `navigator.geolocation` and `MediaDevices.getUserMedia` (`docs/main/reference/config.md:607-622`). Custom URL schemes carry caveats: WKWebView cannot use `http` or `https` as a custom iOS scheme, and custom Android schemes cannot change URL path as of WebView 117 (`docs/main/reference/config.md:624-648`).

## Manifest and service worker

A PWA needs an App Manifest and a Service Worker (`docs/main/web/progressive-web-apps.md:28-42`). The requirement is stated tersely (`docs/main/web/progressive-web-apps.md:28-30`):

```text
## Adding Progressive Web App Support to your app

Progressive Web Apps should have an App Manifest and a Service Worker.
```

The manifest sits beside `index.html` and supplies install metadata: name, theme colors, and icons. The Service Worker proxies network requests and performs background sync; writing one from scratch is discouraged in favor of Workbox recipes (`docs/main/web/progressive-web-apps.md:34-42`).

The manifest and service worker belong to the framework build output, so they must be emitted into `webDir` and copied with the rest of the bundle (`docs/main/basics/workflow.md:15-27`). Live-reload `server.url` settings are development-only and must not be committed to a deployed PWA (`docs/main/guides/live-reload.md:60-71`).

## Measurement and reach

PWA quality is judged by Time to Interactive and First Meaningful Paint; run the PWA checklist and Lighthouse before release (`docs/main/web/progressive-web-apps.md:44-50`). Supported browsers are current Chrome, Firefox, Safari, and Edge (`docs/main/getting-started/faqs.md:12-26`). Capacitor does not add a bundler or polyfill layer, so web compatibility is the framework build's responsibility.

## Sources

- https://capacitorjs.com/docs/web/progressive-web-apps
- https://capacitorjs.com/docs/basics/utilities
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/guides/storage
- https://capacitorjs.com/docs/guides/live-reload
- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/apis/file-transfer
- https://capacitorjs.com/docs/config
- https://github.com/ionic-team/capacitor/blob/main/core/src/web-plugin.ts
- https://developer.mozilla.org/en-US/docs/Web/Manifest
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
