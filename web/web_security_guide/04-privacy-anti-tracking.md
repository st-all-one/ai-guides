# Privacy & Anti-Tracking

## 1. Tipos de Tracking

| Tipo | Mecanismo | Mitigação |
|------|-----------|-----------|
| **Third-party cookies** | Cookies setados por embedados cross-site | Bloqueio/particionamento de cookies |
| **Redirect tracking (bounce tracking)** | Redirect momentâneo para tracker setar first-party cookie | Bounce Tracking Mitigations |
| **Link decorating** | Parâmetros de URL em links de marketing | Strip de parâmetros de tracking |
| **Fingerprinting** | Coleta de características do browser/device | Noise em timers, APIs restritas |
| **Referer header** | Cabeçalho revela URL de origem | Referrer-Policy |

## 2. Bounce Tracking Mitigations

**Padrão moderno:** Heurística baseada em comportamento (não em listas de trackers).

### Funcionamento
1. Browser monitora navegações, flagando sites que fazem bounce
2. Periodicamente verifica: usuário **não interagiu** com o site nos últimos **45 dias**?
3. Se sim + third-party cookies bloqueados → **estado deletado** (cookies, localStorage, IndexedDB, Cache API)
4. Opera em **sites** (registrable domains), não origins individuais

### Suporte
| Browser | Status |
|---------|--------|
| Chrome | Shipped v116; ativo quando third-party cookies bloqueados |
| Firefox | Modo ETP strict; modo stateless no Firefox 145+ |
| Safari | List-based (ITP 2.0) — não segue spec Navigation Tracking Mitigations |

### Stateless vs Stateful
- **Stateful bounces:** tracker explicitamente seta estado
- **Stateless mode (moderno):** TODO bounce é tratado como stateful (rede e outros estados implícitos podem ser manipulados)

## 3. Referrer Policy

### Cabeçalho HTTP
```
Referrer-Policy: strict-origin-when-cross-origin
```

| Diretiva | Comportamento |
|----------|--------------|
| `no-referrer` | Nunca envia Referer |
| `same-origin` | Apenas mesma origin |
| `strict-origin` | Origin apenas (sem path) em cross-origin |
| `strict-origin-when-cross-origin` | Full em same-origin, origin-only em cross-origin (DEFAULT) |

### Fallback para browsers antigos
```
Referrer-Policy: no-referrer, strict-origin-when-cross-origin
```

### HTML meta element
```html
<meta name="referrer" content="no-referrer">
```

### Per-element attribute
```html
<a href="https://example.org" rel="noreferrer">Link</a>
```

## 4. Permissions Policy

Controla acesso a "powerful features" (geolocation, camera, notifications, etc.).

### Cabeçalho HTTP
```
Permissions-Policy: geolocation=(self "https://trusted.example"), camera=()
```

### Iframe delegation
```html
<iframe src="https://maps.example" allow="geolocation"></iframe>
```

## 5. Fingerprinting — Defesas do Browser

Browsers modernos aplicam noise e restrições para prevenir fingerprinting:

- **Timer precision:** redução de precisão em `performance.now()`
- **Font enumeration:** acesso restrito a fontes instaladas
- **Canvas fingerprinting:** permissão do usuário exigida
- **WebGL:** ruído adicionado
- **Device Memory API:** valores discretos (0.25, 0.5, 1, 2, 4, 8)

## 6. Privacy Sandbox (Google)

| Feature | Status | Propósito |
|---------|--------|-----------|
| CHIPS (Partitioned Cookies) | Active | Opt-in partitioned cookies |
| Bounce Tracking Mitigations | Active | Heuristic-based bounce protection |
| Fenced Frame API | Active | Embedding com privacidade melhorada |
| Private State Token API | Active | Trust conveyance sem identidade |
| Attribution Reporting API | Deprecated | Medição de conversão |
| Topics API | Deprecated | Interest-based advertising |
| Shared Storage API | Deprecated | Cross-site data access |
| Related Website Sets | Deprecated | Declaração de relações entre sites |

**Nota:** Google suspendeu enrollment de novas organizações para features deprecated.

## 7. Ética de Coleta de Dados

Três princípios fundamentais:

1. **Não coletar mais dados que o necessário**
2. **Comunicar claramente** como os dados serão usados
3. **Deletar os dados** quando não forem mais necessários

### Clear-Site-Data (logout)
```
Clear-Site-Data: "cache", "cookies", "storage"
```

## 8. Third-Party Resources — Gerenciamento

- **Auditar** todos os third-party scripts: o que coletam, para quem enviam, privacy policy
- **Isolar:** iframe com sandbox attribute
- **Controlar:** Permissions-Policy, CSP, Referrer-Policy
- **Bloquear** tracking parameters em URLs
- Preferir `rel="noreferrer"` em links externos
