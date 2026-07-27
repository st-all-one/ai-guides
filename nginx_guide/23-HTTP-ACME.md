# ngx_http_acme_module — Automatic Certificate Management (ACME)

This document covers the **ngx_http_acme_module**, which implements the [ACMEv2](https://datatracker.ietf.org/doc/html/rfc8555) protocol (RFC 8555) for automated certificate lifecycle management. It enables nginx to obtain and automatically renew TLS certificates from ACME-compatible CAs such as Let's Encrypt without external tools.

> **Note:** This module is distinct from the NGINX Plus ACME client (`acme_client`/`acme` directives). The open-source `ngx_http_acme_module` is available as a dynamic module via the `nginx-module-acme` package or built from [github.com/nginx/nginx-acme](https://github.com/nginx/nginx-acme). It is also bundled in NGINX Plus since version 1.29.0 as `nginx-plus-module-acme`.

---

## Example Configuration

```nginx
resolver 127.0.0.1:53;

acme_issuer letsencrypt {
    uri         https://acme-v02.api.letsencrypt.org/directory;
    contact     admin@example.test;
    state_path  /var/cache/nginx/acme;
    accept_terms_of_service;
}

acme_shared_zone zone=ngx_acme_shared:1M;

server {
    listen 443 ssl;
    server_name  .example.test;

    acme_certificate letsencrypt;

    ssl_certificate       $acme_certificate;
    ssl_certificate_key   $acme_certificate_key;
    ssl_certificate_cache max=2;
}

server {
    # Required for ACME HTTP-01 challenge validation
    listen 80;
    location / {
        return 404;
    }
}
```

---

## Directives

### `acme_issuer`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| acme_issuer | `acme_issuer name { ... }` | — | http | Defines an ACME certificate issuer object. |

The `acme_issuer` block groups all configuration for a specific ACME CA. Supported sub-directives within the block:

| Sub-directive | Description |
|---------------|-------------|
| `uri` | **(Mandatory)** The ACME server [directory URL](https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.1) (e.g., `https://acme-v02.api.letsencrypt.org/directory`). |
| `state_path` | Directory for persisting account keys, issued certificates, and private keys across restarts. Defaults to `acme_<issuer>`. Set to `off` (0.2.0+) to disable disk storage. Improves load time and avoids ACME rate limits. |
| `profile` | *(Since 0.3.0)* Requests a [certificate profile](https://datatracker.ietf.org/doc/html/draft-ietf-acme-profiles) from the ACME server. The optional `require` parameter causes renewal to fail if the server does not support the profile. |
| `ssl_verify` | Enables (`on`, default) or disables (`off`) ACME server certificate verification. |
| `ssl_trusted_certificate` | PEM file with trusted CA certificates for verifying the ACME server's TLS certificate. |

---

### `accept_terms_of_service`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| accept_terms_of_service | `accept_terms_of_service;` | — | acme_issuer | Accepts the ACME server's Terms of Service. Some providers (e.g., Let's Encrypt) require this before account registration. The ToS URL is logged to the error log. |

---

### `account_key`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| account_key | `account_key alg[:size] \| file;` | — | acme_issuer | The account's private key used for ACME request authentication. |

Accepted values:
- `ecdsa:256`, `ecdsa:384`, `ecdsa:521` — generate a new ECDSA key for ES256/ES384/ES512
- `rsa:2048`, `rsa:3072`, `rsa:4096` — generate a new RSA key for RS256
- File path — path to an existing key file using one of the algorithms above

Generated keys persist across reloads but are lost on restart unless `state_path` is configured.

---

### `acme_certificate`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| acme_certificate | `acme_certificate issuer [identifier ...] [key=alg[:size]];` | — | server | Requests a certificate from the specified issuer for the given identifiers. |

- **Identifiers**: If omitted, taken from the `server_name` directive. Wildcards and regex patterns in `server_name` are **not** valid certificate identifiers.
- **key parameter**: Sets the type of generated private key. Default: `ecdsa:256`. Options: `ecdsa:256`, `ecdsa:384`, `ecdsa:521`, `rsa:2048`, `rsa:3072`, `rsa:4096`.

```nginx
server {
    server_name example.com www.example.com;
    acme_certificate letsencrypt key=rsa:2048;
    ssl_certificate     $acme_certificate;
    ssl_certificate_key $acme_certificate_key;
}
```

---

### `acme_shared_zone`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| acme_shared_zone | `acme_shared_zone zone=name:size;` | `zone=ngx_acme_shared:256k` | http | Shared memory zone for storing issued certificates, keys, and challenge data. |

The default 256k zone holds approximately 50 ECDSA P-256 keys or 35 RSA 2048 keys. Increase for deployments with many certificates.

---

### `challenge`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| challenge | `challenge type;` | `http-01` | acme_issuer | *(Since 0.2.0)* Specifies the ACME challenge type for domain validation. |

Accepted values:
- `http-01` (also `http`) — serves a token via HTTP on port 80; requires a `listen 80` server block
- `tls-alpn-01` (also `tls-alpn`) — validates via TLS ALPN negotiation on port 443

> Notes:
> - Challenge names may be versioned; an unversioned name (e.g., `http`) automatically selects the latest implemented version.
> - DNS-01 is not currently supported by this module (available via nginx-plus-module-acme with `acme_dns01_callback`).

---

### `common_name_in_csr`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| common_name_in_csr | `common_name_in_csr on \| off;` | `off` | acme_issuer | *(Since 0.4.0)* When enabled, sets the Subject Common Name in the CSR to the first DNS name or IP address in the identifier list. |

> ⚠️ Enabling this may cause some ACME servers to reject the certificate request. Prior to 0.4.0, the Subject CN was always included.

---

### `contact`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| contact | `contact URL;` | — | acme_issuer | Sets the contact URL(s) the ACME server uses to reach the account owner (e.g., for expiry notices). |

The `mailto:` scheme is assumed unless explicitly specified:

```nginx
contact admin@example.test;                     # becomes mailto:admin@example.test
contact mailto:admin@example.test;               # explicit
```

---

### `external_account_key`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| external_account_key | `external_account_key kid file;` | — | acme_issuer | *(Since 0.2.0)* External Account Binding (EAB) credentials for [RFC 8555 Section 7.3.4](https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.4) authorization. |

- `kid` — Key identifier provided by the ACME CA
- `file` — File containing the MAC key in base64url encoding

Instead of a file, the key can be inlined using `data:<key>` syntax:

```nginx
external_account_key my-kid data:abc123...xyz;
```

EAB is required by some CAs (e.g., Google Trust Services, certain enterprise ACME servers) to link accounts to a pre-registered external identity.

---

### `preferred_chain`

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| preferred_chain | `preferred_chain name;` | — | acme_issuer | *(Since 0.3.0)* Prefers a specific certificate chain when the ACME server offers multiple chains. |

If the ACME server provides multiple certificate chains (e.g., cross-signed by different roots), the module selects the chain whose topmost (root) certificate's Subject Common Name matches `name`. Falls back to the default chain if no match is found.

```nginx
acme_issuer letsencrypt {
    uri              https://acme-v02.api.letsencrypt.org/directory;
    preferred_chain  ISRG Root X1;
    accept_terms_of_service;
}
```

---

## Embedded Variables

The module exposes two variables valid in `server` blocks where `acme_certificate` is configured:

| Variable | Description |
|----------|-------------|
| `$acme_certificate` | Path to the issued PEM certificate; pass to `ssl_certificate` |
| `$acme_certificate_key` | Path to the private key; pass to `ssl_certificate_key` |

These are **not** set in `server` blocks without `acme_certificate`. Use with `ssl_certificate_cache` to avoid parsing the certificate on every request:

```nginx
ssl_certificate     $acme_certificate;
ssl_certificate_key $acme_certificate_key;
ssl_certificate_cache max=2;
```

---

## Workflow — Automatic Certificate Lifecycle

### Initial Issuance

1. On startup or configuration reload, the module inspects every `server` block with `acme_certificate`.
2. If no valid certificate exists for the given issuer + identifiers, the module registers an ACME account (using `contact` and `account_key`) and requests certificate issuance.
3. The ACME server challenges domain ownership using the configured `challenge` type (HTTP-01 or TLS-ALPN-01).
4. Upon challenge validation, the ACME server issues the certificate. The module stores it in the shared memory zone and on disk (if `state_path` is set).

### Automatic Renewal

The module continuously monitors certificate expiry and initiates renewal **before** expiration. The renewal check operates as follows:

- **Renewal window**: Certificates are renewed when their remaining validity drops below approximately **30 days** (the standard Let's Encrypt validity is 90 days).
- **next_update_check**: After each successful certificate operation (issuance or renewal), the module schedules the next update check based on the certificate's `next_update` window. This is an internal mechanism that avoids polling on every request — nginx checks for needed renewals at intervals proportional to the certificate's remaining lifetime.
- **Grace period**: If renewal fails (e.g., ACME server unreachable), the module retries periodically and continues serving the existing certificate until expiry.
- **Seamless rotation**: When a renewed certificate is obtained, the `$acme_certificate` and `$acme_certificate_key` variables point to the new certificate immediately. No reload or restart is needed.

### State Persistence

With `state_path` configured, the module persists:
- Account private key
- Issued certificates and their private keys
- Account registration metadata

On restart, the module reads persisted state to avoid re-registration and re-issuance, preserving ACME rate limit quotas.

### Rate Limit Awareness

The module caches responses from the ACME server in the shared memory zone (`acme_shared_zone`). This minimizes redundant requests to the ACME directory and avoids hitting CA-imposed rate limits (e.g., Let's Encrypt's 50 certificates per domain per week).
