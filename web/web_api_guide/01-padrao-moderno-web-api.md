# Padrão Moderno de Documentação de Web APIs

## 1. Filosofia Geral

A documentação de Web APIs no MDN segue um padrão rigoroso que equilibra três necessidades concorrentes:

1. **Descoberta** — o leitor precisa encontrar rapidamente a API certa para seu problema
2. **Compreensão** — o leitor precisa entender conceitos, não apenas copiar código
3. **Referência** — o leitor precisa de specs precisas de interfaces, propriedades e métodos

O padrão moderno prioriza esta ordem: **Conceito → Tutorial → Referência**. Primeiro explica-se o "porquê" e o "o quê", depois o "como", e por fim os detalhes técnicos.

## 2. Estrutura de Diretórios

### Padrão para uma API

```
api/nome_da_api/
├── index.md                    (web-api-overview)
├── using_api/                  (guide - opcional)
│   └── index.md
├── concepts/                   (guide - opcional)
│   └── index.md
├── security/                   (guide - opcional)
│   └── index.md
├── diagrama.png                (assets visuais)
└── screenshot.png
```

### Padrão para uma Interface

```
api/NomeInterface/
├── index.md                    (web-api-interface)
├── propriedade/                (subpágina de propriedade)
│   └── index.md
├── metodo/                     (subpágina de método)
│   └── index.md
├── evento/                     (subpágina de evento)
│   └── index.md
├── request/                    (construtor com mesmo nome)
│   └── index.md
└── nome_metodo/                (métodos em lowercase)
    └── index.md
```

### Nomenclatura de Pastas

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| API (overview) | `snake_case` + `_api` | `web_audio_api/`, `fetch_api/` |
| Guia | `snake_case` descritivo | `using_fetch/`, `writing_websocket_client/` |
| Interface | `PascalCase` | `Request/`, `AudioContext/`, `GPUDevice/` |
| Método/Propriedade | `lowercase` | `body/`, `clone/`, `start/` |

## 3. Front Matter YAML

### Campos Obrigatórios

```yaml
---
title: Nome da API           # Título amigável para humanos
slug: Web/API/Nome_Da_API    # URL path (underscores, não hífens)
page-type: web-api-overview   # Tipo de página (ver seção 5)
---
```

### Campos Mais Comuns

```yaml
---
title: Fetch API
slug: Web/API/Fetch_API
page-type: web-api-overview
browser-compat: api.fetch      # Chave(s) de compatibilidade
spec-urls: https://fetch.spec.whatwg.org/  # URL(s) da especificação
status:
  - experimental              # Opcional: experimental, deprecated, non-standard
---
```

### page-type: Valores Possíveis

| page-type | Uso | Slug Pattern |
|-----------|-----|-------------|
| `web-api-overview` | Página principal da API | `Web/API/Nome_Da_API` |
| `web-api-interface` | Página de interface | `Web/API/NomeInterface` |
| `guide` | Tutorial ou guia | `Web/API/Nome_Da_API/Nome_Guia` |
| `landing-page` | Página de aterrissagem | `Web/API` (raiz) |
| `listing-page` | Página de listagem | `Web/API/Nome/Sub` |
| `webgl-extension` | Extensão WebGL | `Web/API/EXT_blend_minmax` |

## 4. Macros de Template Essenciais

### Abertura (primeira linha do body)

```markdown
{{DefaultAPISidebar("Nome da API")}}
```

Para páginas de interface:

```markdown
{{APIRef("Nome da API")}}
```

### Badges de Contexto

```markdown
{{AvailableInWorkers}}                          # Disponível em workers
{{AvailableInWorkers("window_and_dedicated")}}   # Escopo restrito
{{AvailableInWorkers("window_and_worker_except_service")}}
{{securecontext_header}}                        # Requer HTTPS
{{SeeCompatTable}}                              # Experimental
{{deprecated_header}}                           # Deprecado
{{non-standard_header}}                         # Não padrão
```

### Fechamento (rodapé)

```markdown
## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- [Link relacionado](/en-US/docs/...)
```

## 5. Anatomia de uma Página web-api-overview

```
1. Front Matter YAML
2. {{DefaultAPISidebar("...")}} + badges
3. Parágrafo de definição da API (1-3 frases)
4. ## Concepts and usage (seção conceitual principal)
5. ## Interfaces (lista categorizada)
6. ## Extensions to other interfaces (se aplicável)
7. ## Guides (se aplicável)
8. ## Examples (se aplicável, ou links para demos)
9. ## Specifications
10. ## Browser compatibility
11. ## See also
```

## 6. Formatação de Links Internos

```markdown
{{DOMxRef("Request")}}                          # Interface
{{domxref("Window/fetch", "fetch()")}}          # Método com link customizado
{{JSxRef("Promise")}}                           # Objeto JS
{{HTTPHeader("Content-Type")}}                  # Header HTTP
{{HTMLElement("video")}}                        # Elemento HTML
{{glossary("CORS")}}                            # Glossário
{{cssxref("display")}}                          # Propriedade CSS
{{httpstatus("404")}}                           # Status HTTP
```

## 7. Relação Slug ↔ Estrutura de Pastas

A estrutura de pastas é um **espelho exato** do slug:

```
slug: Web/API/Fetch_API/Using_Fetch
path:  /api/fetch_api/using_fetch/index.md

slug: Web/API/Request
path:  /api/request/index.md

slug: Web/API/Request/body
path:  /api/request/body/index.md
```

Regra de conversão: `slug = path` com `_` mapeando para `/`, PascalCase para PascalCase, lowercase para lowercase.

## 8. Padrões Específicos por Tipo de API

### APIs de Fundação (Fetch, Streams, Workers)
- Foco em substituir tecnologias legadas (XMLHttpRequest → Fetch)
- Explicam conceitos fundamentais primeiro
- Listam extensivamente as interfaces

### APIs de Mídia (Web Audio, WebCodecs, WebRTC)
- Frequentemente têm guias separados de "conceitos"
- Incluem diagramas de pipeline/blocos
- Listam codecs e formatos suportados

### APIs de Segurança (Web Authentication, Credential Management, Trusted Types)
- Sempre usam `{{securecontext_header}}`
- Documentam CSP, Permissions-Policy
- Explicam ameaças mitigadas

### APIs Gráficas (WebGL, WebGPU, Canvas)
- Tutoriais extensos de shaders/pipelines
- Explicam modelo de GPU/memória
- Incluem seções de "Validation" para erros comuns

### APIs Experimentais (Speculation Rules, Fenced Frame, Compute Pressure)
- Usam `{{SeeCompatTable}}`
- Documentam status de oposição de vendors
- Foco em explicar casos de uso futuros
