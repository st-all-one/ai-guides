# 10 - Security

A Capacitor app distributes its web bundle to every device, so every string in that bundle is public. The official audit splits the work into data, authentication and deep linking, network, and Web View security (`docs/main/guides/security.md:11-13`); the controls below follow that split.

## Data: keys and tokens

Never embed secret API keys, encryption keys, or other sensitive data in app code: basic static analysis recovers them (`docs/main/guides/security.md:21-23`). Treat build-time environment-variable plugins as a leak vector when they inline sensitive values into the bundle (`docs/main/guides/security.md:23`). Move secret-dependent operations to a server or serverless function that holds the secret and forwards the request (`docs/main/guides/security.md:25`). When a client genuinely needs a persisted token or key, keep it in memory only, or use native secure storage (`docs/main/guides/security.md:27`).

The native primitives are iOS Keychain Services and Android Keystore; both are low-level, so prefer a plugin over hand-rolled calls, with the community `cordova-plugin-ios-keychain` cited as an example and Identity Vault as the enterprise option (`docs/main/guides/security.md:29-35`). Plain `localStorage`, `Preferences`, or a bundled JSON file is not secure storage.

## Authentication and deep links

Custom URL schemes are not globally arbitrated like DNS: a malicious app can override `instagram://` and receive a token intended for you (`docs/main/guides/security.md:39`). Never transmit sensitive data through a custom-scheme deep link (`docs/main/guides/security.md:41`). Universal Links and App Links are safer because they rely on ownership of a real web domain (`docs/main/guides/deep-links.md:20`).

Association is a two-way proof. On iOS, enable Associated Domains and host `.well-known/apple-app-site-association` over HTTPS, then add an `applinks:` entry for that domain in Xcode (`docs/main/guides/deep-links.md:187-199`, `docs/main/guides/deep-links.md:223-227`). On Android, generate `.well-known/assetlinks.json` with the app package and SHA256 fingerprint and add an `android:autoVerify="true"` intent filter with an HTTPS `data` host (`docs/main/guides/deep-links.md:255-259`, `docs/main/guides/deep-links.md:281-288`). Routing is JS work: listen for `appUrlOpen` through the App API and navigate only after the URL is validated (`docs/main/guides/deep-links.md:37-41`, `docs/main/guides/deep-links.md:63-77`).

For OAuth2 the return leg is a deep link, so PKCE is mandatory: verify the chosen plugin supports it before adoption (`docs/main/guides/security.md:43-45`). Without PKCE an intercepted authorization code can be redeemed by the attacker.

## Network

Use TLS everywhere: never call `http://` endpoints, only `https://`, so credentials and tokens are not sent in clear text (`docs/main/guides/security.md:49-55`). Android disables cleartext traffic by default from API 28, and `server.cleartext` exists only for live-reload HTTP servers; it is explicitly not for production (`docs/main/reference/config.md:661-674`). The same applies to `server.url` for an external Web View server and to `android.allowMixedContent`, disabled by default and labeled not for production (`docs/main/reference/config.md:650-659`, `docs/main/reference/config.md:168-181`). Set `server.hostname` to `localhost`: the secure context it provides is what unlocks `navigator.geolocation` and `MediaDevices.getUserMedia` (`docs/main/reference/config.md:608-622`).

## Web View

Content Security Policy limits what the Web View may load: images, XHR, video, Web Sockets, and so on (`docs/main/guides/security.md:59-61`). Configure it in a `<head>` meta tag or as an equivalent server header; keep the allowlist narrow (`docs/main/guides/security.md:61-63`).

A tighter baseline than the docs example uses only the app's own origin.

computed minimal CSP meta tag
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
```

Ordinary JavaScript hygiene still applies to the bulk of the app (`docs/main/guides/security.md:74-78`).

Config flags with security impact deserve an audit pass. `android.useLegacyBridge` swaps `addWebMessageListener` for the less secure `addJavascriptInterface` and defaults to false; leave it off (`docs/main/reference/config.md:317-324`). `server.allowNavigation` widens in-Web-View navigation and defaults to empty; external URLs should open in the system browser (`docs/main/reference/config.md:676-687`). `ios.limitsNavigationsToAppBoundDomains` blocks navigation outside `WKAppBoundDomains` when true, and `localhost` or the configured hostname must be in that list (`docs/main/reference/config.md:460-473`). Keep `cordova.accessOrigins` narrow: omitted, it emits `<access origin="*" />` (`docs/main/reference/config.md:708-717`). Custom schemes are a migration compatibility lever, not a security boundary; non-HTTP Android schemes have not been able to change URL paths since WebView 117 (`docs/main/reference/config.md:637-648`).

## Untrusted content: InAppBrowser

Load third-party or untrusted pages in `@capacitor/inappbrowser`, not in the app Web View; its purpose is to behave as a standard browser without risking application security (`docs/apis/inappbrowser.md:3`, `docs/apis/inappbrowser.md:11`). Three entry points exist: `openInWebView`, `openInSystemBrowser` (Custom Tabs / SFSafariViewController), and `openInExternalBrowser` (`docs/apis/inappbrowser.md:133-169`). Prefer the system or external browser for unknown origins.

Isolation is the key control. Storage and cookies are isolated by default on iOS and on Android API 28+ through a separate `:OSInAppBrowser` process; on lower Android APIs storage is shared (`docs/apis/inappbrowser.md:35-40`). Setting `android.isIsolated: false` opts out and lets untrusted content reach private storage; the docs caution against it (`docs/apis/inappbrowser.md:42-49`). Android requires target SDK 26 (`docs/apis/inappbrowser.md:25-33`). `clearCache` and `clearSessionCache` clear cookie caches before opening, `mediaPlaybackRequiresUserAction` blocks autoplay, and `successUrlPatterns` can close the Web View natively on a known redirect URL (`docs/apis/inappbrowser.md:249-275`). Observe `browserPageNavigationCompleted` to audit final URLs (`docs/apis/inappbrowser.md:207-218`).

## Sources
- https://capacitorjs.com/docs/guides/security
- https://capacitorjs.com/docs/guides/deep-links
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/apis/inappbrowser
- https://developer.apple.com/documentation/security/keychain_services
- https://developer.android.com/training/articles/keystore
- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content
- https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- https://developer.android.com/training/app-links
- https://registry.npmjs.org/@capacitor/inappbrowser
