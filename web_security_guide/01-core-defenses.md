# Core Defenses & Foundation

## 1. Transport Layer Security (TLS) / HTTPS

**Protege contra:** MITM, SSL stripping, eavesdropping, tampering

**Implementação:**
- Obter certificado TLS (Let's Encrypt — gratuito)
- Configurar servidor via Mozilla SSL Configuration Generator
- Redirecionar HTTP → HTTPS (301 Moved Permanently)

**NGINX:**
```
server { listen 80; return 301 https://$host$request_uri; }
```

**HSTS (Strict-Transport-Security):**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- `max-age`: mínimo 6 meses (`15768000`), recomendado 2 anos (`63072000`)
- `includeSubDomains`: opcional, exigido para preload
- `preload`: submeter em https://hstspreload.org/

**CSP upgrade-insecure-requests:**
```
Content-Security-Policy: upgrade-insecure-requests;
```

## 2. Mixed Content Blocking

**Comportamento do navegador:**
- **Upgradable** (auto-HTTP→HTTPS): imagens, áudio, vídeo (`<img src>`, `<video src>`, etc.)
- **Blockable** (bloqueado totalmente): scripts, stylesheets, iframes, fetch/XHR, web fonts

**Exceção loopback:** `http://127.0.0.1`, `http://localhost`, `file://` são tratados como seguros.

## 3. Secure Contexts

**Definição:** Documento ativo de um top-level browsing context entregue via TLS.

**Origens potentially trustworthy:**
- `https://`
- `http://127.0.0.1`, `http://localhost`, `http://*.localhost`
- `file://`

**APIs restritas a Secure Contexts (67+):**
Service Workers, Web Crypto, Geolocation, Notifications, WebAuthn (passkeys), Web Bluetooth, WebUSB, WebHID, Web NFC, WebTransport, WebGPU, Payment Request, Credential Management, Push, Screen Capture, File System, Generic Sensor, Async Clipboard, etc.

**Feature detection:**
```js
if (window.isSecureContext) { /* usar API poderosa */ }
```

## 4. Same-Origin Policy (SOP)

**Definição de origin:** `scheme + host + port`

**Comportamentos:**
| Operação | Permitido? |
|----------|-----------|
| Cross-origin writes | Geralmente sim (links, form submit, redirects) |
| Cross-origin embedding | Sim (`<script>`, `<img>`, `<style>`, `<iframe>`, `<video>`) |
| Cross-origin reads | Bloqueado (exceções via CORS) |

**Relaxar SOP (controlado):** CORS, CORP, COEP, COOP
**Endpoint `document.domain`:** DEPRECATED — não usar

## 5. Cross-Origin Resource Policy (CORP)

```
Cross-Origin-Resource-Policy: same-origin
```

| Valor | Efeito |
|-------|--------|
| `same-origin` | Mais restritivo — apenas mesma origin |
| `same-site` | Mesmo site (inclui subdomínios) |
| `cross-origin` | Permite qualquer cross-origin (default) |

## 6. Cross-Origin Opener Policy (COOP)

```
Cross-Origin-Opener-Policy: same-origin
```
Protege contra XS-Leaks via `window.open()` — impede que outras origins acessem o objeto `window`.

## 7. Subresource Integrity (SRI)

```html
<script src="https://cdn.example/lib.js"
        integrity="sha384-ABC123..."
        crossorigin="anonymous"></script>
```

- Exige CORS no CDN (`Access-Control-Allow-Origin: *`)
- Browser rejeita o recurso se o hash não corresponder

## 8. Certificate Transparency (CT)

- CAs embutem SCTs (Signed Certificate Timestamps) no certificado X.509v3
- Chrome e Firefox exigem CT para todos os certificados publicamente confiáveis
- RFC 6962 / RFC 9162

## 9. User Activation

**Transient activation:** dura pouco após interação do usuário. APIs: `Window.open()`, `requestFullscreen()`, `Clipboard API`, `getDisplayMedia()`

**Sticky activation:** dura pela sessão inteira. APIs: `beforeunload`, `Navigator.vibrate()`, audio autoplay

**Verificação programática:**
```js
navigator.userActivation.hasBeenActive  // sticky
navigator.userActivation.isActive       // transient
```

## 10. Input Validation

- **Allowlists** (preferir) em vez de denylists
- Validação **client-side** (UX) + **server-side** (segurança)
- Validar: tipo, formato, tamanho, range, padrão
- **File uploads:** authenticated users only, whitelist extensions, store outside webroot
