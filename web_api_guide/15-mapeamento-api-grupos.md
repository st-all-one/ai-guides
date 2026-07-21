# Grupos de API Não Mapeados e Dependências Adicionais

## Visão Geral

O mapeamento original (doc 05) cobria ~20-25 APIs. Este documento expande com grupos inteiros ausentes e dependências adicionais identificadas.

## 1. Privacy Sandbox APIs

APIs do ecossistema de privacidade do Chrome, com fortes interdependências entre si.

```
Attribution Reporting API
  ├── Fenced Frame API (destino de relatórios)
  ├── Shared Storage API (armazenamento particionado)
  └── Private State Token API (tokens de privacidade)
Topics API
  ├── Documento de observação via JavaScript
  └── Headers de requisição (Fetch API integration)
Private State Token API
  └── Cryptographic operations (Web Crypto API)
```

### Interdependências

| API | Depende de | Usado por |
|-----|-----------|-----------|
| Attribution Reporting API | Fenced Frame, Shared Storage, Trusted Types | Anunciantes, plataformas de ads |
| Topics API | Fetch API, Headers | Publishers, ad tech |
| Private State Token API | Web Crypto API, Fetch API | CDNs, sites cross-origin |

## 2. PWA e Instalação

APIs relacionadas a Progressive Web Apps — compartilham dependência com Service Workers e Manifest.

```
Badging API
  └── Service Worker API (aplicação em segundo plano)
Launch Handler API
  ├── Service Worker API
  └── Navigation API (controle de navegação)
Window Controls Overlay API
  └── CSS Environment Variables (display-mode)
```

## 3. Houdini / CSS Extension APIs

APIs que estendem CSS via JavaScript — dependem do CSS Object Model.

```
CSS Typed OM API
  ├── CSS Object Model (base)
  └── CSS Properties and Values API (propriedades customizadas)
CSS Properties and Values API
  └── CSS Typed OM API (valores tipados)
CSS Painting API (Houdini)
  ├── CSS Typed OM API
  └── Worklets (PaintWorklet)
CSS Font Loading API
  ├── CSS Object Model
  └── FontFace (interface compartilhada)
CSS Custom Highlight API
  ├── CSS Object Model (pseudo-elementos)
  └── Selection API (sobreposição)
```

### Diagrama de Dependências Houdini

```
CSS Object Model
  ├── CSS Typed OM API
  │   └── CSS Properties and Values API
  └── CSS Painting API
        └── Worklets
CSS Font Loading API (uso isolado)
CSS Custom Highlight API (uso isolado)
```

## 4. Device / Foldable APIs

APIs para dispositivos modernos e dobráveis — dependem de eventos DOM e permissões.

```
Viewport Segments API
  ├── CSS View Transitions API
  └── Visual Viewport API
Device Posture API
  ├── Permissions API
  └── Screen Orientation API (sobreposição)
Screen Wake Lock API
  ├── Permissions API
  └── Document API (visibilidade)
VirtualKeyboard API
  ├── Visual Viewport API
  └── Element API (foco)
Screen Orientation API
  └── Screen API (tela)
```

## 5. WebTransport API + Streams API

WebTransport depende fortemente de Streams — não mapeado originalmente.

```
WebTransport API
  ├── Streams API (ReadableStream, WritableStream)
  │   ├── WebTransportReceiveStream → ReadableStream
  │   ├── WebTransportSendStream → WritableStream
  │   ├── WebTransportBidirectionalStream → ReadableStream + WritableStream
  │   └── WebTransportDatagramDuplexStream → ReadableStream + WritableStream
  ├── Web Crypto API (autenticação)
  └── Fetch API (handshake inicial)
```

## 6. WebCodecs API + Streams API

WebCodecs usa Streams para processamento pipeline — dependência secundária não mapeada.

```
WebCodecs API
  ├── Canvas API (renderização de frames decodificados)
  ├── Web Audio API (áudio processado)
  └── Streams API (TransformStream para pipeline)
      ├── EncodedVideoChunk → TransformStream
      └── EncodedAudioChunk → TransformStream
```

## 7. SVG API

Mais de 100 interfaces SVG (~100+ subdiretórios em `api/svg_api/`).

```
SVG API
  ├── HTML DOM API (Element, Document)
  ├── CSS Object Model (estilo, animações)
  ├── DOM API (Node, EventTarget)
  └── Geometry Interfaces (DOMPoint, DOMRect, DOMMatrix)
```

### Subgrupos SVG

| Grupo | Interfaces | Dependência |
|-------|-----------|-------------|
| Elementos gráficos | SVGCircleElement, SVGRectElement, SVGPathElement, etc. | HTML DOM API |
| Animação | SVGAnimateElement, SVGAnimateTransformElement, etc. | SMIL / CSS Animations |
| Filtros | SVGFilterElement, SVGFEGaussianBlurElement, etc. | CSS Filter Effects |
| Dados de caminho | SVGPathElement, SVGPointList, etc. | Geometry Interfaces |
| Transformações | SVGTransform, SVGTransformList | Geometry Interfaces |

## 8. Compression Streams API

API de compressão que depende de Streams.

```
Compression Streams API
  └── Streams API (TransformStream)
      ├── CompressionStream → TransformStream
      └── DecompressionStream → TransformStream
```

## 9. Scheduling APIs

```
Prioritized Task Scheduling API
  ├── Event Loop API (task prioritization)
  └── Performance API (task attribution timing)
```

## 10. Editing APIs

```
EditContext API
  ├── HTML DOM API (Element, Shadow DOM)
  └── Input Events (textupdate, textformatupdate)
HTML Sanitizer API
  ├── Trusted Types API (sanitized HTML)
  └── HTML DOM API (parsing, serialization)
Invoker Commands API
  └── HTML Elements (button, input)
```

## 11. Reporting API

```
Reporting API
  ├── CSP (Content Security Policy) — reports
  ├── Permissions Policy — reports
  ├── Deprecation — reports
  └── Intervention — reports
```

## 12. Streams API como Fundação

A Streams API é uma **fundação transversal** — diversas APIs a consomem. Expandindo o conceito de "fundação" do doc 05:

```
Streams API (fundação)
  ├── Fetch API (Response.body como ReadableStream)
  ├── WebTransport API (ReceiveStream, SendStream)
  ├── WebCodecs API (TransformStream para codec pipeline)
  ├── Compression Streams API (CompressionStream, DecompressionStream)
  ├── MediaStream Recording API (gravador como stream)
  ├── File System Access API (WritableStream para arquivos)
  └── Web Audio API (AudioNode como consumidor de stream)
```

## Matriz de Dependências Atualizada

```
API                 → Depende de Streams?   → Depende de Fetch?   → Precisar de Permissions?
Streams             → N/A                   → Não                  → Não
Fetch               → Sim (Response.body)   → N/A                  → Não
WebTransport        → Sim                   → Sim (inicial)        → Não
WebCodecs           → Sim (TransformStream)  → Não                  → Não
Compression Streams → Sim                   → Não                  → Não
Service Worker      → Sim                   → Sim                  → Não
Badging             → Não                   → Não                  → Sim (notifications)
Screen Wake Lock    → Não                   → Não                  → Sim
Device Posture      → Não                   → Não                  → Sim
Keyboard API        → Não                   → Não                  → Sim
VirtualKeyboard     → Não                   → Não                  → Não
EditContext         → Não                   → Não                  → Não
Sanitizer API       → Não                   → Sim (fetch remote)   → Não
Reporting API       → Não                   → Sim (enviar reports) → Não
```
