# Local Network Access (Private Network Access)

Restrições a requests de sites para a rede local do usuário. Mitiga CSRF contra dispositivos locais (roteadores, impressoras, intranet).

**Spec:** [WICG Local Network Access](https://wicg.github.io/local-network-access/)

## 1. Address Spaces

| Espaço | Exemplo | Acessível de |
|--------|---------|-------------|
| **Public** | `104.18.27.120` | Qualquer lugar na internet |
| **Local** | `192.168.0.1` | Apenas na rede local |
| **Loopback** | `127.0.0.1` (`localhost`) | Apenas no dispositivo local |

## 2. Request Types Affected

| Tipo | Detalhe |
|------|---------|
| Subresource requests | `<img>`, `<script>`, `<iframe>` |
| `fetch()` | Todos modos |
| Subframe navigation | Navegação em iframes |
| Service Workers | `WindowClient.navigate()` em subframes |
| WebSocket | Conexões WS/WSS |
| WebTransport | Sessões |
| WebRTC | Peer connections |

## 3. Permissions

Gated behind two permissions (secure contexts apenas):

| Permission | Alvo | API Check |
|------------|------|-----------|
| `local-network` | Endereços locais (`192.168.x.x`) | `navigator.permissions.query({ name: "local-network" })` |
| `loopback-network` | Endereços loopback (`127.0.0.1`, `localhost`) | `navigator.permissions.query({ name: "loopback-network" })` |

Usuário vê dialog de permissão. Em non-secure contexts, todos requests falham.

## 4. Relaxing Mixed Content

Dispositivos locais frequentemente não têm certificados TLS confiáveis. Com permissão concedida, mixed content blocking é relaxado para requests locais.

### targetAddressSpace
Necessário quando URL é um domínio público que resolve para endereço local:

```js
const req = new Request("http://internal.example.com", {
  method: "get",
  mode: "cors",
  targetAddressSpace: "loopback",  // ou "local"
});
```

- IPs privados (`192.168.x.x`) e `.local` (`http://router.local`) têm mixed content relaxado **se** permissão for concedida
- Sem permissão, mixed content checks ainda se aplicam

## 5. Permissions-Policy Directives

```http
# Document-level
Permissions-Policy: local-network=("https://example.com")
Permissions-Policy: loopback-network=("https://example.com")
```

```html
<!-- Iframe delegation -->
<iframe src="https://example.com" allow="local-network"></iframe>
<iframe src="https://example.com" allow="loopback-network"></iframe>
```

### Múltiplas Origins no Iframe
Se iframe navega para outra origin que também faz requests locais:

```html
<iframe src="https://example.com"
  allow="local-network https://example.com https://example2.com"></iframe>
```

Ou permitir qualquer origin:
```html
<iframe src="https://example.com" allow="local-network *"></iframe>
```

## 6. Legacy `local-network-access` Alias

Originalmente especificado como permissão única. Agora dividido em `local-network` + `loopback-network`.

### Tabela de Resolução
| `local-network` | `loopback-network` | `local-network-access` (legado) |
|----------------|-------------------|-------------------------------|
| `allowed` | `allowed` | `allowed` |
| `allowed` | `prompt` | `allowed` |
| `allowed` | `denied` | `denied` |
| `prompt` | `allowed` | `allowed` |
| `prompt` | `prompt` | `prompt` |
| `denied` | qualquer | `denied` |

Para compatibilidade reversa:
```html
<iframe src="https://example.com"
  allow="local-network-access; local-network; loopback-network"></iframe>
```

## 7. Resumo

- **Pare:** Seu site faz fetch para `localhost` ou `192.168.x.x`? Precisa de permissão do usuário
- **Configure:** `Permissions-Policy` com `local-network` / `loopback-network`
- **Legado:** Inclua `local-network-access` para compatibilidade
- **Mixed content:** Use `targetAddressSpace` para domínios que resolvem para IP local
