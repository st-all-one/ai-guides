# Glossário de Macros, Types e Convenções

## 1. Catálogo de Macros MDN

### Sidebars

| Macro | Onde Usar | Exemplo |
|-------|-----------|---------|
| `{{DefaultAPISidebar("Nome")}}` | Páginas overview e guide | `{{DefaultAPISidebar("Fetch API")}}` |
| `{{APIRef("Nome")}}` | Páginas de interface | `{{APIRef("Fetch API")}}` |

### Badges de Contexto

| Macro | Significado | Exemplo |
|-------|-------------|---------|
| `{{securecontext_header}}` | Requer HTTPS | APIs como WebAuthn, WebGPU |
| `{{AvailableInWorkers}}` | Disponível em workers | Fetch API, WebCodecs |
| `{{AvailableInWorkers("window_and_dedicated")}}` | Window + dedicated workers | WebCodecs API |
| `{{AvailableInWorkers("window_and_worker_except_service")}}` | Exceto service workers | Compute Pressure, XMLHttpRequest |

### Badges de Status

| Macro | Significado | Quando Usar |
|-------|-------------|-------------|
| `{{SeeCompatTable}}` | Experimental | Especificação instável |
| `{{deprecated_header}}` | Deprecated | Ainda funciona, não usar |
| `{{non-standard_header}}` | Non-standard | Apenas um browser |
| `{{experimental_inline}}` | Experimental (inline) | Junto a interfaces/métodos específicos |
| `{{deprecated_inline}}` | Deprecated (inline) | Junto a interfaces/métodos específicos |
| `{{Non-standard_Inline}}` | Non-standard (inline) | Junto a interfaces/métodos específicos |
| `{{ReadOnlyInline}}` | Read-only (inline) | Em propriedades somente leitura |

### Macros de Conteúdo

| Macro | Resultado | Exemplo de Uso |
|-------|-----------|----------------|
| `{{DOMxRef("Request")}}` | Link para interface DOM | `{{DOMxRef("Request")}}` |
| `{{domxref("Window/fetch", "fetch()")}}` | Link para método com texto | `{{domxref("Window/fetch", "fetch()")}}` |
| `{{JSxRef("Promise")}}` | Link para objeto JS global | `{{JSxRef("Promise")}}` |
| `{{HTTPHeader("Content-Type")}}` | Link para header HTTP | `{{HTTPHeader("Content-Type")}}` |
| `{{HTMLElement("video")}}` | Link para elemento HTML | `{{HTMLElement("video")}}` |
| `{{glossary("CORS")}}` | Link para glossário | `{{glossary("CORS")}}` |
| `{{Glossary("Nonce", "nonce")}}` | Link com texto alternativo | `{{Glossary("Nonce", "nonce")}}` |
| `{{cssxref("display")}}` | Link para propriedade CSS | `{{cssxref("display")}}` |
| `{{httpstatus("404")}}` | Link para status HTTP | `{{httpstatus("404")}}` |
| `{{CSP("require-trusted-types-for")}}` | Link para diretiva CSP | `{{CSP("require-trusted-types-for")}}` |

### Macros de Template

| Macro | Função | Onde Aparece |
|-------|--------|-------------|
| `{{Specifications}}` | Tabela de specs (do front matter) | Rodapé de toda página |
| `{{Compat}}` | Tabela de compatibilidade | Rodapé de toda página |
| `{{SubpagesWithSummaries}}` | Lista automática de subpáginas | Páginas de índice |
| `{{ListGroups}}` | Lista grupos de API | `api/index.md` |
| `{{APIListAlpha}}` | Lista alfabética de interfaces | `api/index.md` |
| `{{EmbedLiveSample("id")}}` | Exemplo executável | Guias e tutoriais |

## 2. Catálogo de page-type

| page-type | Descrição | Obrigatório |
|-----------|-----------|-------------|
| `web-api-overview` | Visão geral da API | Sim (para páginas de API) |
| `web-api-interface` | Página de interface | Sim (para interfaces) |
| `web-api-instance-method` | Método de instância | Sim (para métodos) |
| `web-api-instance-property` | Propriedade de instância | Sim (para props) |
| `web-api-static-method` | Método estático | Sim |
| `web-api-static-property` | Propriedade estática | Sim |
| `web-api-constructor` | Construtor | Sim |
| `web-api-event` | Evento | Sim |
| `webgl-extension` | Extensão WebGL | Sim |
| `guide` | Guia/tutorial | Sim (para guias) |
| `landing-page` | Página de aterrissagem | Sim (raiz) |
| `listing-page` | Página de listagem | Sim |

## 3. Padrões de browser-compat

```yaml
# API com ponto de entrada único
browser-compat: api.WebSocket

# API com múltiplas features
browser-compat:
  - api.fetch
  - api.Window.fetchLater

# API com suporte por interface
browser-compat: api.PressureObserver

# Elemento HTML (não API JS)
browser-compat: html.elements.fencedframe
```

## 4. Convenções de Nomenclatura

### Pastas de API
| Formato | Exemplo |
|---------|---------|
| `snake_case` + `_api` | `web_audio_api/`, `fetch_api/` |
| Exceções estabelecidas | `html_dom_api/`, `touch_events/` |

### Pastas de Interface
| Formato | Exemplo |
|---------|---------|
| `PascalCase` | `Request/`, `AudioContext/`, `GPUDevice/` |
| PascalCase exato da interface | `MediaRecorder/`, `RTCPeerConnection/` |

### Pastas de Subpáginas
| Tipo | Formato | Exemplo |
|------|---------|---------|
| Propriedade | `lowercase` | `body/`, `headers/` |
| Método | `lowercase()` | `clone/`, `start/` |
| Evento | `lowercase` | `load/`, `error/` |
| Construtor | PascalCase (como interface) | `Request/request/` |

### Slug Patterns
| Tipo | Slug | Caminho |
|------|------|---------|
| API Overview | `Web/API/Fetch_API` | `api/fetch_api/index.md` |
| Interface | `Web/API/Request` | `api/Request/index.md` |
| Método | `Web/API/Request/clone` | `api/Request/clone/index.md` |
| Guia | `Web/API/Fetch_API/Using_Fetch` | `api/fetch_api/using_fetch/index.md` |
| Propriedade de Window | `Web/API/Window/fetch` | `api/Window/fetch/index.md` |

## 5. Mapa de slugs especiais

| Slug | Path | Nota |
|------|------|------|
| `Web/API` | `api/index.md` | Landing page raiz |
| `Web/API/Fetch_API` | `api/fetch_api/index.md` | Overview |
| `Web/API/Fetch_API/Using_Fetch` | `api/fetch_api/using_fetch/index.md` | Guia |
| `Web/API/Request` | `api/Request/index.md` | Interface |
| `Web/API/Request/clone` | `api/Request/clone/index.md` | Método |
| `Web/API/Window/fetch` | `api/Window/fetch/index.md` | Método global |

## 6. Variações Regionais/Locais

### Inglês (padrão)
```yaml
slug: Web/API/Fetch_API
title: Fetch API
```

### Traduções (ex: português)
```yaml
slug: Web/API/Fetch_API
title: API Fetch
```

Nota: o slug NÃO muda em traduções — apenas o title.

## 7. Convenções para Macros em Traduções

Macros são executadas no servidor e NÃO devem ser traduzidas:

```markdown
<!-- CORRETO -->
{{DefaultAPISidebar("Fetch API")}}
{{DOMxRef("Request")}}

<!-- ERRADO -->
{{DefaultAPISidebar("API Fetch")}}  ← só traduzir se existir sidebar traduzida
```

## 8. Exemplos de Combinações Comuns

```markdown
# API segura + workers
{{DefaultAPISidebar("WebCodecs API")}}{{AvailableInWorkers("window_and_dedicated")}}{{securecontext_header}}

# API experimental
{{DefaultAPISidebar("Compute Pressure API")}}{{SeeCompatTable}}{{AvailableInWorkers("window_and_worker_except_service")}}{{securecontext_header}}

# API interface
{{APIRef("Fetch API")}}{{AvailableInWorkers}}

# API deprecated  
{{DefaultAPISidebar("Battery Status API")}}{{securecontext_header}}{{deprecated_header}}
```
