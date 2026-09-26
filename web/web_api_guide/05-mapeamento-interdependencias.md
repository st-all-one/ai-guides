# Mapeamento de Interdependências entre Web APIs

## 1. APIs de Fundação

APIs que servem como base para múltiplas outras APIs.

| API Base | Usada Por | Relação |
|----------|-----------|---------|
| **HTML DOM API** | Todas as APIs que manipulam elementos HTML | Fundação |
| **Web Workers API** | Service Worker, Shared Worker, WebGPU | Especialização |
| **Streams API** | Fetch (body), WebSocketStream, Compression Streams | Consumo |
| **Credential Management API** | Web Authentication, FedCM, WebOTP | Extensão |
| **Media Capture and Streams** | WebRTC, MediaStream Recording, Screen Capture | Extensão |
| **Permissions API** | Múltiplas APIs que requerem permissão | Consulta |
| **Performance API** | PerformanceObserver, Long Tasks, Element Timing | Fundação |
| **Encoding API** | TextEncoder, TextDecoder (usado por Fetch, Streams) | Utilitário |

## 2. Cadeias de Dependência Complexas

### Shared Storage → Fenced Frame
```
Shared Storage API
  ↓ escreve dados
SharedStorageWorklet
  ↓ processa
Fenced Frame Config
  ↓ exibe
<fencedframe> element
  ↕
Protected Audience API (leilão de anúncios)
Private Aggregation API (relatórios)
```

### Speculation Rules → Múltiplas APIs Deferidas
```
Speculation Rules API
  ↓ ativa prerender
Deferred APIs durante prerender:
  ├── Broadcast Channel API (postMessage)
  ├── Web Storage API (sessionStorage clonado)
  ├── IndexedDB API
  ├── WebSocket API
  ├── Navigation API / History API
  ├── Fetch API (keepalive)
  ├── Notifications API
  ├── Web Audio API (AudioContext)
  ├── Geolocation API
  ├── Service Worker API
  ├── Sensor APIs
  ├── Web Bluetooth / WebHID / WebUSB / Web Serial / Web NFC
  └── +20 outras APIs (ver Speculation Rules API docs)
```

### WebCodecs → Canvas + Web Audio
```
WebCodecs API
  ├── VideoFrame → Canvas API (drawImage)
  ├── AudioData → Web Audio API (AudioBuffer via Float32Array)
  ├── VideoDecoder → HTMLVideoElement (via VideoFrame)
  └── ImageDecoder → Canvas API (frame-by-frame)
```

### WebGPU → WebGL + Workers
```
WebGPU API
  ├── Substitui WebGL para renderização 3D moderna
  ├── Usa Web Workers para GPUDevice em background
  ├── WGSL shaders (substitui GLSL)
  └── Compatibilidade mode para OpenGL ES 3.1 / D3D11
```

## 3. APIs que se Sobreponham (Escolha Consciente)

| API | Alternativa | Quando Usar |
|-----|-------------|-------------|
| Fetch API | XMLHttpRequest | Sempre preferir Fetch |
| WebSocket API | WebTransport API | WebSocket para simplicidade, WebTransport para low-latency |
| WebTransport API | WebSocket API | Streaming bidirecional com reliability configurável |
| Server-Sent Events | WebSocket, Fetch streaming | SSE para one-way server→client |
| Web Audio API | WebCodecs API | Web Audio para playback/processing, WebCodecs para encode/decode raw |
| WebGL API | WebGPU API | WebGPU para novos projetos, WebGL para compatibilidade |
| Beacon API | Fetch keepalive, fetchLater() | fetchLater() para beaconing ao fechar página |
| `<link rel=prefetch>` | Speculation Rules prefetch | Speculation Rules para navegações, link para resources |
| `<link rel=prerender>` | Speculation Rules prerender | Speculation Rules (padronizado, melhor suporte) |

## 4. APIs de Segurança: Cadeia de Confiança

```
Trusted Types API
  ↓ previne DOM XSS
CSP (Content Security Policy)
  ↓ controla
  ├── Trusted Types (require-trusted-types-for)
  ├── Script sources (script-src)
  └── Speculation Rules (inline-speculation-rules)
Permissions Policy
  ↓ controla
  ├── Compute Pressure API
  ├── Web Authentication API
  ├── Fenced Frame API
  ├── Shared Storage API
  ├── Autoplay
  └── Deferred Fetch
Credential Management API
  ↓ base para
  ├── Web Authentication API (passkeys, FIDO2)
  ├── FedCM API (federated identity)
  └── WebOTP API (SMS OTP)
```

## 5. APIs de Mídia: Ecossistema Completo

```
                    ┌──────────────────────┐
                    │   HTMLMediaElement    │
                    │  (<video>/<audio>)    │
                    └──────┬───────┬───────┘
                           │       │
              ┌────────────┘       └────────────┐
              │                                  │
     ┌────────▼────────┐              ┌─────────▼─────────┐
     │ Media Source    │              │  Media Stream     │
     │ Extensions (MSE)│              │  Recording API    │
     │ (DASH/HLS)      │              │  (MediaRecorder)  │
     └────────┬────────┘              └─────────┬─────────┘
              │                                  │
     ┌────────▼────────┐              ┌─────────▼─────────┐
     │  WebCodecs API  │              │  Media Capture    │
     │  (encode/decode) │              │  & Streams API    │
     │  Audio/Video     │              │  (getUserMedia)   │
     └────────┬────────┘              └─────────┬─────────┘
              │                                  │
     ┌────────▼────────┐              ┌─────────▼─────────┐
     │  Canvas API     │              │     WebRTC API    │
     │  + WebGL/WebGPU │              │  (RTCPeerConnect.) │
     │  (render)       │              │  (RTCDataChannel)  │
     └────────┬────────┘              └─────────┬─────────┘
              │                                  │
     ┌────────▼────────┐              ┌─────────▼─────────┐
     │  Web Audio API  │              │  Screen Capture   │
     │  (spatialize,   │              │  API (display)    │
     │   filter, mix)  │              │                   │
     └─────────────────┘              └───────────────────┘
```

## 6. Matriz de Compatibilidade entre APIs

| API Requer | API Base | Nota |
|------------|----------|------|
| WebRTC | Media Capture and Streams | getMediaStream |
| WebRTC | Streams API | RTCDataChannel usa streams |
| MediaStream Recording | Media Capture and Streams | MediaRecorder recebe MediaStream |
| WebCodecs | Canvas API (VideoFrame → Canvas) | Conversão de frames |
| WebCodecs | Web Audio API (AudioData → AudioBuffer) | Conversão de áudio |
| WebGPU | Web Workers API | GPUDevice acessível em workers |
| Fenced Frame | Shared Storage API | Config gerada por SharedStorageWorklet |
| Speculation Rules | Broadcast Channel API | Atualização de páginas pré-renderizadas |
| Web Authentication | Credential Management API | Extensão do modelo de credenciais |
| Notifications API | Service Worker API | Notificações persistentes |
| Compute Pressure | Performance API | APIs complementares de monitoramento |

## 7. APIs que NÃO Dependem de Outras (Standalone)

Algumas APIs são autocontidas e não dependem de outras APIs web:

- **Geolocation API** — depende apenas de permissão do usuário
- **Battery Status API** — standalone (embora deprecated)
- **Vibration API** — interface mínima
- **Network Information API** — leitura de estado de rede
- **Page Visibility API** — evento de visibilidade
- **Web Storage API** — localStorage/sessionStorage
- **Console API** — logging (embora não seja "web API" tradicional)

## 8. Observações sobre Manutenção

- APIs de fundação (Workers, Streams, Permissions) raramente mudam — documentação estável
- APIs em cadeia (Shared Storage → Fenced Frame) mudam juntas — requer coordenação
- APIs concorrentes (WebSocket vs WebTransport) precisam de documentação comparativa
- APIs deprecated (WebVR, Battery Status) devem ter links claros para sucessores
