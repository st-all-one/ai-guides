# Semântica e Arquitetura de Documentação de Web APIs

## 1. Princípios Semânticos

Cada página de documentação deve comunicar claramente:

1. **O que é** — definição em 1-3 frases, sem jargão desnecessário
2. **Para que serve** — caso de uso concreto, problema que resolve
3. **Como se encaixa** — relação com outras APIs e tecnologias web
4. **Quando usar** — cenários apropriados vs alternativas
5. **Quando NÃO usar** — armadilhas, limitações, alternativas melhores

## 2. Hierarquia de Informação

### Nível 1: Landing Page
```
Web/API (index.md raiz)
├── Lista todas as APIs disponíveis
├── Duas seções: "Specifications" ({{ListGroups}}) e "Interfaces" ({{APIListAlpha}})
└── Função: descoberta e navegação
```

### Nível 2: API Overview
```
Web/API/Nome_Da_API (index.md)
├── Definição e conceitos
├── Lista de interfaces
├── Guias relacionados
└── Função: visão geral e ponto de partida
```

### Nível 3: Guide
```
Web/API/Nome_Da_API/Guia (subpasta)
├── Tutorial passo-a-passo
├── Código funcional (de preferência com {{EmbedLiveSample}})
├── Explicação conceitual contextual
└── Função: aprendizado prático
```

### Nível 4: Interface Reference
```
Web/API/NomeInterface (subpasta)
├── Construtor
├── Propriedades (instância + estática)
├── Métodos (instância + estática)
├── Eventos
└── Função: consulta técnica detalhada
```

## 3. Interdependências Entre APIs

### Relações Fundamentais

| API Base | APIs Derivadas/Extendidas | Natureza |
|----------|--------------------------|----------|
| Credential Management | Web Authentication, FedCM, WebOTP | Extensão direta |
| Web Workers | Service Worker, Shared Worker | Especialização |
| Streams | Fetch (body), WebSocketStream, Compression | Consumo |
| Media Capture and Streams | WebRTC, MediaStream Recording, Screen Capture | Extensão |
| HTML DOM | Todas as APIs que extendem elementos HTML | Fundação |

### Cadeias de Dependência Complexas

```
Shared Storage API → Fenced Frame API (exibe resultados)
Speculation Rules API → Broadcast Channel, Storage, IndexedDB (deferimento)
WebCodecs API → Canvas API, Web Audio API (conversão de formatos)
WebGPU API → Web Workers API (GPUDevice em workers)
```

### Padrões de Linkagem

- **APIs que estendem outras**: documentar na overview da API derivada, com link para a base
- **APIs que consomem outras**: seção "See also" com links diretos
- **APIs concorrentes**: comparar explicitamente (ex: WebSocket vs WebTransport vs SSE)

## 4. Seções Críticas e Sua Semântica

### "Concepts and usage"

**Propósito**: Explicar o modelo mental da API. Deve responder:
- Qual problema esta API resolve?
- Como ela se diferencia de alternativas?
- Qual o fluxo básico de uso?
- Quais são os conceitos-chave?

**O que EVITAR**:
- Listar todas as interfaces (isso vai na seção "Interfaces")
- Tutoriais completos (isso vai em "Guides")
- Código excessivo sem explicação

### "Interfaces"

**Propósito**: Catálogo referenciável. Deve:
- Agrupar interfaces por função (ex: "Configuring GPUDevices", "Representing pipelines")
- Linkar para cada interface com `{{DOMxRef}}`
- Explicar brevemente o papel de cada interface

### "Guides"

**Propósito**: Ponte entre conceito e prática. Deve:
- Ser auto-contido (o leitor não precisa de múltiplos guias abertos)
- Começar com um exemplo mínimo funcional
- Aprofundar gradualmente
- Usar `{{EmbedLiveSample}}` para exemplos executáveis

### "Security requirements"

**Propósito**: Documentar requisitos de segurança. Toda API que requer:
- HTTPS: usar `{{securecontext_header}}`
- Permissions-Policy: documentar diretivas
- CSP: documentar diretivas necessárias
- User activation: documentar se requer transient/sticky activation

### "Examples"

**Propósito**: Demonstração prática. Pode ser:
- Bloco de código inline com `{{EmbedLiveSample}}`
- Link para demo externa (GitHub, Glitch, CodePen)
- Múltiplos exemplos para diferentes casos de uso

## 5. Padrões de Front Matter por Tipo de Página

### web-api-overview
```yaml
title: Fetch API
slug: Web/API/Fetch_API
page-type: web-api-overview
browser-compat: api.fetch
spec-urls: https://fetch.spec.whatwg.org/
```

### web-api-interface  
```yaml
title: Request
slug: Web/API/Request
page-type: web-api-interface
browser-compat: api.Request
spec-urls: https://fetch.spec.whatwg.org/#request-class
```

### guide
```yaml
title: Using the Fetch API
slug: Web/API/Fetch_API/Using_Fetch
page-type: guide
```

## 6. Versionamento e Status

### Estados de uma API

1. **Experimental** (`{{SeeCompatTable}}`) — apenas em browsers com flag
2. **Stable** — sem badge de status
3. **Deprecated** (`{{deprecated_header}}`) — ainda funciona, mas não use
4. **Non-standard** (`{{non-standard_header}}`) — apenas um browser
5. **Removed** — página mantida como registro histórico (raro)

### Convenções de browser-compat

```yaml
# Chave única (mais comum)
browser-compat: api.fetch

# Múltiplas chaves (API que abrange múltiplas features)
browser-compat:
  - api.fetch
  - api.Window.fetchLater

# Sem chave (API sem dados de compat)
# (omitir o campo completamente)
```

## 7. Convenções de Linguagem

- **Títulos de seção**: sentence case ("Concepts and usage", não "Concepts and Usage")
- **Definições**: presente simples ("The Fetch API provides...")
- **Exemplos**: tom imperativo ("To make a request, call fetch()")
- **Notas**: usar `> [!NOTE]` (sintaxe GitHub Flavored Markdown)
- **Avisos**: usar `> [!WARNING]`
- **Destaques de código inválido**: `\`\`\`js example-bad` para código errado
