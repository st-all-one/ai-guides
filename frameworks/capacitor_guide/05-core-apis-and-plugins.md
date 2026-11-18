# 05 - Core APIs and Plugins

## The Capacitor global

`@capacitor/core` exports `Capacitor` and `registerPlugin` from `src/core/src/global.ts:1-15`; utilities are `getPlatform`, `isNativePlatform`, `isPluginAvailable`, `convertFileSrc`, `DEBUG`, and `isLoggingEnabled` (`src/core/src/definitions.ts:3-46`). Platform detection keys off injected bridges: Android if `androidBridge`, iOS if `webkit.messageHandlers.bridge`, else web. (`src/core/src/util.ts:36-44`)

```typescript
export const getPlatformId = (win: WindowCapacitor): 'android' | 'ios' | 'web' => {
  if (win?.androidBridge) {
    return 'android';
  } else if (win?.webkit?.messageHandlers?.bridge) {
    return 'ios';
  } else {
    return 'web';
  }
};
```

`convertFileSrc` rewrites device paths into WebView URLs (`docs/main/reference/core-apis/web.md:19-40`); at runtime it prefixes `_capacitor_file_`/`_capacitor_content_` (`src/core/native-bridge.ts:153-164`). `isPluginAvailable` checks the per-platform JS implementation or a native `PluginHeader` (`src/core/src/runtime.ts:27-41`).

## Registration and typed proxies

`registerPlugin(name, implementations)` is generic: the type parameter is the public typed surface; implementations is a per-platform map, optionally lazy factory functions. (`src/core/src/definitions.ts:61-72`)

```typescript
export type RegisterPlugin = <T>(pluginName: string, implementations?: Readonly<PluginImplementations>) => T;

/**
 * A map of plugin implementations.
 *
 * Each key should be the lowercased platform name as recognized by Capacitor,
 * e.g. 'android', 'ios', and 'web'. Each value must be an instance of a plugin
 * implementation for the respective platform.
 */
export type PluginImplementations = {
  [platform: string]: (() => Promise<any>) | any;
};
```

Double registration warns and returns the existing proxy (`src/core/src/runtime.ts:50-56`). Per method, the native header wins over a web implementation; the declared return type chooses the calling convention, and absence of both is `UNIMPLEMENTED`. (`src/core/src/runtime.ts:78-98`)

```typescript
    const createPluginMethod = (impl: any, prop: PropertyKey): ((...args: any[]) => any) => {
      if (pluginHeader) {
        const methodHeader = pluginHeader?.methods.find((m) => prop === m.name);
        if (methodHeader) {
          if (methodHeader.rtype === 'promise') {
            return (options: any) => cap.nativePromise(pluginName, prop.toString(), options);
          } else {
            return (options: any, callback: any) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
          }
        } else if (impl) {
          return impl[prop]?.bind(impl);
        }
      } else if (impl) {
        return impl[prop]?.bind(impl);
      } else {
        throw new CapacitorException(
          `"${pluginName}" plugin is not implemented on ${platform}`,
          ExceptionCode.Unimplemented,
        );
      }
    };
```

Methods do not need hand-written JS shims: the returned object is a `Proxy` that materializes members on access. (`src/core/src/runtime.ts:160-179`)

```typescript
    const proxy = new Proxy(
      {},
      {
        get(_, prop) {
          switch (prop) {
            // https://github.com/facebook/react/issues/20030
            case '$$typeof':
              return undefined;
            case 'toJSON':
              return () => ({});
            case 'addListener':
              return pluginHeader ? addListenerNative : addListener;
            case 'removeListener':
              return removeListener;
            default:
              return createPluginMethodWrapper(prop);
          }
        },
      },
    );
```

`addListener` is special: for a native plugin it registers a `keepAlive` call and returns a handle whose `remove()` sends `removeListener` with the resolved callback id (`src/core/src/runtime.ts:136-158`). Web plugins use `WebPlugin.addListener`/`notifyListeners` instead (`src/core/src/web-plugin.ts:14-69`).

## Core plugins

Four plugins ship in `@capacitor/core`: `WebView` (`src/core/src/core-plugins.ts:17`), `CapacitorHttp` (`src/core/src/core-plugins.ts:492-494`), and `SystemBars` (`src/core/src/core-plugins.ts:657-659`). Only `web` implementations are supplied in JS; native implementations live in the iOS and Android packages. The cookie registration: (`src/core/src/core-plugins.ts:152-154`)

```typescript
export const CapacitorCookies = registerPlugin<CapacitorCookiesPlugin>('CapacitorCookies', {
  web: () => new CapacitorCookiesPluginWeb(),
});
```

`CapacitorHttp` exposes `request/get/post/put/patch/delete` returning `{ data, status, headers, url }` (`src/core/src/core-plugins.ts:159-184`, `src/core/src/core-plugins.ts:265-282`). On native, `data` must be a string or JSON; complex types need base64 or the patched `window.fetch`/`XMLHttpRequest` (`src/core/src/core-plugins.ts:205-211`; `src/core/native-bridge.ts:551-557`). The web implementation builds `RequestInit`, forces JSON parsing for JSON content type, and defaults response type to text (`src/core/src/core-plugins.ts:354-449`). `SystemBars` is native-only and its web class rejects each method with `unavailable` (`src/core/src/core-plugins.ts:639-655`). `WebPlugin` centralizes the two error codes. (`src/core/src/web-plugin.ts:86-92`)

```typescript
  protected unimplemented(msg = 'not implemented'): CapacitorException {
    return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
  }

  protected unavailable(msg = 'not available'): CapacitorException {
    return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
  }
```

`ExceptionCode` has exactly `UNIMPLEMENTED` and `UNAVAILABLE` (`src/core/src/util.ts:3-20`).

## Method types and implementation layers

A plugin interface can declare three signatures: void, promise, and callback. (`docs/plugins/creating-plugins/method-types.md:17-29`)

```typescript
export type CallbackID = string;

export interface MyData {
  data: string;
}

export type MyPluginCallback = (message: MyData | null, err?: any) => void;

export interface MyPlugin {
  method1(): never;
  method2(): Promise<MyData>;
  method3(callback: MyPluginCallback): Promise<CallbackID>;
}
```

All are async; the native declaration supplies `RETURN_NONE`, `RETURN_PROMISE`, or `RETURN_CALLBACK` (`docs/plugins/creating-plugins/method-types.md:32-118`). Callback methods must save the call natively for repeated resolution (`docs/main/reference/core-apis/saving-calls.md:46-64`). A web implementation extends `WebPlugin` and `implements` the shared interface (`docs/plugins/creating-plugins/web-guide.md:24-39`), with matching permission aliases across platforms (`docs/plugins/creating-plugins/web-guide.md:41-85`). Configuration values live under the plugin name in `plugins` and are read natively via `getConfig()` (`docs/plugins/creating-plugins/configuration-values.md:85-108`).

## Sources
- https://capacitorjs.com/docs/core-apis
- https://capacitorjs.com/docs/core-apis/web
- https://capacitorjs.com/docs/core-apis/data-types
- https://capacitorjs.com/docs/basics/using-plugins
- https://capacitorjs.com/docs/plugins/creating-plugins
- https://capacitorjs.com/docs/plugins/method-types
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/tree/8.6.2/core/src
- https://registry.npmjs.org/@capacitor/core
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
