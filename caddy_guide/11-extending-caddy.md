# 11 — Extending Caddy

## Visão Geral

Caddy é extensível via módulos Go. Todo componente (handler, matcher, storage, DNS provider, etc.) pode ser substituído ou estendido.

## Module System

### Naming

Módulos são identificados por IDs hierárquicos:
- `http.handlers.reverse_proxy`
- `http.matchers.path`
- `caddy.storage.file_system`
- `tls.issuance.acme`
- `dns.providers.cloudflare`

### Namespaces

| Namespace | Interface | Descrição |
|-----------|-----------|-----------|
| `admin.api` | `AdminRouter` | Endpoints admin API |
| `caddy.config_loaders` | `ConfigLoader` | Carregadores de config |
| `caddy.fs` | `FileSystem` | Sistemas de arquivos |
| `caddy.listeners` | `Listener` | Listeners customizados |
| `caddy.logging.encoders` | `zapcore.Encoder` | Encoders de log |
| `caddy.logging.writers` | `Writer` | Destinos de log |
| `caddy.storage` | `StorageConverter` | Armazenamento |
| `dns.providers` | `DNSProvider` | Providers DNS |
| `events.handlers` | `EventHandler` | Handlers de eventos |
| `http.handlers` | `MiddlewareHandler` | Handlers HTTP |
| `http.ip_sources` | `IPRangeSource` | Fontes de IP |
| `http.matchers` | `RequestMatcher` | Matchers HTTP |
| `tls.issuance` | `Issuer` | Emissores de certificados |
| `tls.cert_managers` | `CertificateManager` | Gestores de certificado |

## Escrevendo um Módulo

### Quick Start

```go
package mymodule

import (
    "github.com/caddyserver/caddy/v2"
    "github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
    "github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func init() {
    caddy.RegisterModule(MyHandler{})
}

// MyHandler implements caddyhttp.MiddlewareHandler
type MyHandler struct {
    Greeting string `json:"greeting,omitempty"`
}

// CaddyModule returns the module information
func (MyHandler) CaddyModule() caddy.ModuleInfo {
    return caddy.ModuleInfo{
        ID:  "http.handlers.my_handler",
        New: func() caddy.Module { return new(MyHandler) },
    }
}

// Provision inicializa o módulo
func (m *MyHandler) Provision(ctx caddy.Context) error {
    if m.Greeting == "" {
        m.Greeting = "Hello"
    }
    return nil
}

// Validate valida a configuração
func (m *MyHandler) Validate() error {
    if m.Greeting == "" {
        return fmt.Errorf("greeting must not be empty")
    }
    return nil
}

// ServeHTTP implements caddyhttp.MiddlewareHandler
func (m *MyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
    // Lógica antes do próximo handler
    w.Write([]byte(m.Greeting))
    // Opcional: chamar next
    return next.ServeHTTP(w, r)
}

// Interface guards
var (
    _ caddyhttp.MiddlewareHandler = (*MyHandler)(nil)
    _ caddyfile.Unmarshaler       = (*MyHandler)(nil)
)
```

### Adicionando Suporte Caddyfile

```go
// UnmarshalCaddyfile implements caddyfile.Unmarshaler
func (m *MyHandler) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
    for d.Next() {
        if !d.Args(&m.Greeting) {
            return d.Err("missing greeting value")
        }
    }
    return nil
}
```

### Registrando no Caddyfile

```go
func init() {
    RegisterDirective("my_handler", func() Handler {
        return new(MyHandler)
    })
}
```

Ou via global `order`:

```caddy
{
    order my_handler before file_server
}
```

## Build com Plugins

### Via xcaddy

```bash
xcaddy build \
    --with github.com/user/mymodule
```

### Via Docker builder

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/user/mymodule

FROM caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

## Adicionando Placeholders

```go
func (m *MyHandler) Provision(ctx caddy.Context) error {
    repl := caddy.NewReplacer()
    // Substituir placeholders em tempo de provisionamento
    m.Greeting = repl.ReplaceAll(m.Greeting, "{env.MY_VAR}")
    return nil
}

// Em ServeHTTP:
func (m *MyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
    repl := r.Context().Value(caddy.ReplacerCtxKey).(*caddy.Replacer)
    greeting := repl.ReplaceAll(m.Greeting, "")
    // ...
}
```

## Config Adapters Customizados

```go
package myadapter

import (
    "github.com/caddyserver/caddy/v2"
    "github.com/caddyserver/caddy/v2/caddyconfig"
)

func init() {
    caddy.RegisterAdapter("myadapter", MyAdapter{})
}

type MyAdapter struct{}

func (a MyAdapter) Adapt(body []byte, options map[string]any) ([]byte, []caddyconfig.Warning, error) {
    // Converter body (ex: YAML) para JSON do Caddy
    var warnings []caddyconfig.Warning
    jsonBytes := caddyconfig.JSON(convertedStruct, warnings)
    return jsonBytes, warnings, nil
}
```

## Module Documentation

Módulos podem prover documentação inline:

```go
func (MyHandler) CaddyModule() caddy.ModuleInfo {
    return caddy.ModuleInfo{
        ID: "http.handlers.my_handler",
        New: func() caddy.Module { return new(MyHandler) },
        // Descrição aparece em `caddy list-modules`
    }
}
```

## Boas Práticas

1. **Lifecycle**: Usar `Provision` para setup, nunca no construtor
2. **Imutabilidade**: Config deve ser imutável após `Provision`
3. **Interface guards**: Sempre declarar `var _ Interface = (*Type)(nil)`
4. **Thread safety**: ServeHTTP pode ser chamado concorrentemente
5. **Caddyfile**: Implementar `caddyfile.Unmarshaler` para compatibilidade
6. **Placeholders**: Substituir em `Provision` quando possível (mais rápido)
7. **Cleanup**: Implementar `caddy.CleanerUpper` se alocar recursos
8. **Testes**: Usar `caddyhttp.ResponseRecorder` e `caddy.NewTestReplacer()`
