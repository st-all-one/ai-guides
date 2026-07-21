# Integração entre Media/ e API/

## 1. Relação Atual

A documentação de `media/` (guias de mídia) e `api/` (referências de API) são complementares mas com sobreposições.

### media/ cobre:
- **Formatos e codecs**: guias detalhados de áudio, vídeo, imagem, containers
- **Delivery**: como usar `<video>`, `<audio>`, `<track>`, players customizados
- **Manipulação**: canvas + vídeo, WebGL + vídeo, filtros de áudio
- **Streaming**: HLS, MPEG-DASH, MSE
- **Autoplay**: políticas, detecção, Permissions-Policy

### api/ cobre:
- **Referência de interfaces**: construtores, propriedades, métodos
- **Visão geral de APIs**: conceitos, casos de uso, listas de interfaces
- **Guias de uso**: tutoriais passo-a-passo para cada API

## 2. APIs de Mídia em /api/ e sua Cobertura em /media/

| API em /api/ | Coberta em /media/? | Qualidade |
|-------------|---------------------|-----------|
| HTMLMediaElement | Sim (delivery/) | Excelente |
| Media Source Extensions | Sim (delivery/live_streaming/) | Boa |
| Media Capture and Streams | Sim (delivery/index.md) | Superficial |
| MediaStream Recording | Sim (delivery/index.md) | Superficial |
| Web Audio API | Sim (manipulation/) | Boa |
| WebRTC API | Sim (formats/webrtc_codecs/) | Excelente (codecs) |
| WebVTT API | Sim (delivery/captions/) | Excelente |
| Canvas API | Sim (manipulation/) | Boa |
| WebGL API | Sim (manipulation/) | Boa |
| Fullscreen API | Sim (delivery/player/) | Boa |
| Media Capabilities API | Mínimo (media/index.md) | Superficial |
| Media Session API | Mínimo (media/index.md) | Superficial |
| Picture-in-Picture API | **Não** | — |
| WebCodecs API | **Não** | — |
| Encrypted Media Extensions | Mínimo (delivery/index.md) | Superficial |
| Screen Capture API | **Não** | — |
| Remote Playback API | **Não** | — |
| Audio Output Devices API | **Não** | — |
| Audio Session API | **Não** | — |
| Managed Media Source | **Não** | — |

## 3. Lacunas Identificadas

### Alta Prioridade

1. **WebCodecs API**: API moderna para encode/decode de baixo nível. Sem cobertura em /media/.
   - Potencial guia: "Using WebCodecs for media processing"
   - Relação: VideoFrame ↔ Canvas, AudioData ↔ Web Audio API

2. **Picture-in-Picture API**: API estável e bem suportada para vídeo em janela flutuante.
   - Potencial guia: "Picture-in-Picture for video elements"

3. **Screen Capture API**: `getDisplayMedia()` para capturar tela.
   - Potencial guia: "Screen sharing and recording"

### Média Prioridade

4. **Media Capabilities API**: Detecção de capacidades de codecs/decodificação.
   - Potencial guia: "Checking media capabilities before playback"

5. **Media Session API**: Customização de notificações e controles de mídia.
   - Potencial guia: "Integrating with media notifications"

6. **Managed Media Source**: MSE gerenciado para streaming adaptativo mais eficiente.
   - Potencial guia: "Using Managed Media Source for adaptive streaming"

### Baixa Prioridade

7. **Encrypted Media Extensions (EME)**: DRM para mídia protegida.
   - Nota: conteúdo sensível, requer cuidado com licenciamento

8. **Audio Output Devices API**: Seleção de dispositivos de saída de áudio.
9. **Audio Session API**: Gerenciamento de foco de áudio.
10. **Remote Playback API**: Casting para dispositivos remotos.

## 4. Recomendações de Integração

### 4.1 Cross-Links Bidirecionais

**media/ → api/**: Cada guia em /media/ deve linkar para as APIs relevantes.

```markdown
## See also

- [Web Audio API](/en-US/docs/Web/API/Web_Audio_API)
- [MediaStream Recording API](/en-US/docs/Web/API/MediaStream_Recording_API)
```

**api/ → media/**: Cada overview de API de mídia deve linkar para guias relevantes em /media/.

```markdown
## Guides

- [Audio and video delivery](/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- [Audio and video manipulation](/en-US/docs/Web/Media/Guides/Audio_and_video_manipulation)
```

### 4.2 Separação de Responsabilidades

| Tipo de Conteúdo | Deve ficar em |
|-----------------|---------------|
| Referência de interface (props, métodos) | `/api/NomeInterface/` |
| Guia de uso da API | `/api/nome_api/guia/` |
| Guia de formato/codec | `/media/guides/formats/` |
| Guia de delivery/prática | `/media/guides/delivery/` |
| Visão geral de tecnologia (ex: streaming) | `/media/guides/streaming/` |

### 4.3 Conteúdo a Consolidar

| Conteúdo Atual | Problema | Ação Recomendada |
|---------------|----------|-----------------|
| Streaming em 3 lugares | Fragmentado | Consolidar em `/media/guides/streaming/` |
| support_issues vazio | Incompleto | Completar conteúdo |
| configuring_servers_for_ogg | Legado desproporcional | Condensar para parágrafo |

### 4.4 Novos Guias Recomendados em /media/

```
/media/guides/
├── picture-in-picture/        (novo)
├── screen_capture/            (novo)
├── media_performance/         (novo - lazy loading, preconnect, CDN)
├── accessibility/             (novo ou link externo)
├── drm_eme/                   (novo - EME básico)
└── formats/
    └── support_issues/        (completar conteúdo existente)
```

## 5. Padrão de Documentação para APIs de Mídia

### Template para Overview de API de Mídia

```markdown
---
title: NOME Media API
slug: Web/API/NOME_Media_API
page-type: web-api-overview
browser-compat: api.nome
---

{{DefaultAPISidebar("NOME Media API")}}{{securecontext_header}}

A **NOME Media API** fornece [definição].

## Concepts and usage

[Diagrama de pipeline/blocos da API]

[Explicação do fluxo de dados]

## Interfaces

### [Category 1]

- {{DOMxRef("Interface1")}} — [papel no pipeline]

## Related media guides

- [Audio and video delivery](/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- [Media types and formats](/en-US/docs/Web/Media/Guides/Formats)

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}
```

### Boas Práticas Específicas para Mídia

1. **Incluir diagramas de pipeline** — mostrar fluxo de dados (ex: fonte → decoder → render)
2. **Listar codecs suportados** — tabela com codecs, profiles, containers
3. **Mostrar integração com Canvas/WebGL** — quando aplicável (WebCodecs, Web Audio)
4. **Documentar performance** — hardware acceleration, memory usage, battery impact
5. **Incluir exemplos de configuração** — codec strings, bitrates, resolutions
