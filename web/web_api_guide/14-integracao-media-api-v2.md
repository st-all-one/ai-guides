# Integração Media/API — Correção e Expansão

## Visão Geral

Este documento revisa e expande a tabela de integração do doc 07, corrigindo omissões e erros identificados na análise do repositório real.

## Tabela Corrigida: APIs de Mídia em `/api/` com Cobertura em `/media/`

| API em `/api/` | Cobertura em `/media/` | Qualidade | Notas |
|----------------|------------------------|-----------|-------|
| Audio Output Devices API | ❌ Não | — | Existe em `api/audio_output_devices_api/` mas sem cobertura em `media/` |
| Audio Session API | ❌ Não | — | Existe em `api/audio_session_api/` mas sem cobertura em `media/` |
| Canvas API (captura via `captureStream()`) | ⚠️ Parcial | Superficial | API de mídia indireta — referenciada em guias de manipulação |
| Document Picture-in-Picture API | ❌ Não | — | Existe em `api/document_picture-in-picture_api/` — nenhuma cobertura em `media/` |
| Encrypted Media Extensions | ✅ Sim | Parcial | Referenciada em `media/guides/delivery/`; `api/encrypted_media_extensions_api/` tem overview |
| HTMLMediaElement | ✅ Sim | Bom | Coberto em `media/guides/` (autoplay, delivery, formats) |
| Insertable Streams for MediaStreamTrack API | ❌ Não | — | Existe em `api/insertable_streams_for_mediastreamtrack_api/` — não coberto em `media/` |
| Managed Media Source API | ❌ Não | — | Existe em `api/managedmediasource/` — não coberto em `media/` |
| Media Capabilities API | ✅ Sim | Bom | Guias em `media/guides/` (delivery, formats); overview em `api/media_capabilities_api/` |
| Media Capture and Streams | ✅ Sim | Bom | Coberto em `media/guides/capture/`; overview em `api/media_capture_and_streams_api/` |
| Media Session API | ✅ Sim | Bom | Guias em `media/guides/` (audio, video delivery); overview em `api/media_session_api/` |
| Media Source Extensions | ✅ Sim | Parcial | Referenciada em `media/guides/delivery/` (streaming); `api/media_source_extensions_api/` |
| MediaStream Recording API | ✅ Sim | Bom | Coberto em `media/guides/capture/`; `api/mediastream_recording_api/` |
| MediaStream Image Capture API | ❌ Não | — | Existe em `api/mediastream_image_capture_api/` — não coberto em `media/` |
| Picture-in-Picture API | ❌ Não | — | Existe em `api/picture-in-picture_api/` mas sem cobertura em `media/` |
| Remote Playback API | ❌ Não | — | Existe em `api/remote_playback_api/` — não coberto em `media/` |
| Screen Capture API | ❌ Não | — | Existe em `api/screen_capture_api/` com guia `using_screen_capture/`; sem cobertura em `media/` |
| Web Audio API | ✅ Sim | Bom | Guia dedicado em `media/guides/audio/`; overview em `api/web_audio_api/` |
| WebCodecs API | ❌ Não | — | Existe em `api/webcodecs_api/` com guia; nenhuma cobertura em `media/` |
| WebRTC API | ✅ Sim | Bom | Coberto em `media/guides/capture/`, `delivery/`; overview em `api/webrtc_api/` |

## APIs de Mídia Adicionais em `/api/` (não na tabela original)

| API | Diretório | Observação |
|-----|-----------|------------|
| `capturecontroller/` | `api/capturecontroller/` | Controla zoom em streams de captura (nova, experimental) |
| `mediastreamtrackgenerator/` | `api/mediastreamtrackgenerator/` | Gera tracks sintéticas |
| `mediastreamtrackprocessor/` | `api/mediastreamtrackprocessor/` | Processa tracks in-place |
| `browsercapturemediastreamtrack/` | `api/browsercapturemediastreamtrack/` | Captura de abas/janelas |
| `audiosinkinfo/` | `api/audiosinkinfo/` | Informações de saída de áudio |
| `videoplaybackquality/` | `api/videoplaybackquality/` | Métricas de playback de vídeo |

## Lacunas Priorizadas para Cobertura em `/media/`

### Alta Prioridade

| API | Justificativa | Ação Recomendada |
|-----|---------------|------------------|
| WebCodecs API | API central de codecs de baixo nível — complemento direto dos guias de codecs em `media/` | Novo guia em `media/guides/` + cross-links |
| Picture-in-Picture API | Funcionalidade de player usada por todos os guias de entrega de vídeo | Novo guia ou cross-link para guia existente em `api/` |
| Document Picture-in-Picture API | Extensão do PiP para documentos completos | Cross-link para `api/document_picture-in-picture_api/` |

### Média Prioridade

| API | Justificativa | Ação Recomendada |
|-----|---------------|------------------|
| Screen Capture API | Relacionado a captura de mídia — já tem guia em `api/` | Cross-link de `media/guides/capture/` |
| Insertable Streams for MediaStreamTrack | Processamento de streams de mídia | Menção em guias de manipulação de áudio/vídeo |
| Audio Output Devices API | Seleção de dispositivos de saída | Seção em guia de áudio |
| Audio Session API | Gerenciamento de sessão de áudio | Seção em guia de áudio |

### Baixa Prioridade

| API | Justificativa | Ação Recomendada |
|-----|---------------|------------------|
| Managed Media Source | Streaming adaptativo gerenciado | Menção em guia de streaming |
| MediaStream Image Capture | Captura de frames de streams | Seção em guia de captura |
| Remote Playback API | Controle remoto de playback | Menção em guia de delivery |

## Recomendações de Cross-links

### Em `media/guides/` existentes, adicionar links para:

- `media/guides/audio/` → `api/audio_output_devices_api/`, `api/audio_session_api/`, `api/web_audio_api/`
- `media/guides/capture/` → `api/screen_capture_api/`, `api/mediastream_image_capture_api/`, `api/capturecontroller/`
- `media/guides/delivery/` → `api/picture-in-picture_api/`, `api/remote_playback_api/`
- `media/guides/codecs/` (se criado) → `api/webcodecs_api/`

### Em `api/` overviews, adicionar links para:

- `api/webcodecs_api/index.md` → `media/guides/formats/`, `media/guides/delivery/`
- `api/screen_capture_api/index.md` → `media/guides/capture/`
- `api/picture-in-picture_api/index.md` → `media/guides/delivery/`

## Separação de Responsabilidades

| Tipo de Conteúdo | Onde Publicar | Exemplo |
|------------------|---------------|---------|
| Referência de API (interfaces, métodos, propriedades, eventos, construtores) | `/api/` | `Request`, `Response`, `fetch()` |
| Overview de API com visão geral, casos de uso, links | `/api/` | `Fetch_API/index.md` |
| Guia prático de uso da API | `/api/` (subdir) | `Fetch_API/Using_Fetch/` |
| Guia de tecnologia transversal (várias APIs) | `/media/guides/` | `delivery/`, `capture/`, `formats/` |
| Conceitos de mídia independentes de API | `/media/guides/` | `autoplay/`, `audio_and_video_manipulation/` |
| Tutorial passo a passo focado em uma API | `/api/` (subdir) | `webcodecs_api/using_the_webcodecs_api/` |

## Checklist para Integração

- [ ] Toda API de mídia em `/api/` tem link para guia relevante em `/media/guides/` (se existir)
- [ ] Todo guia em `/media/guides/` tem link para APIs de mídia relacionadas em `/api/`
- [ ] APIs sem cobertura em `/media/` têm badge ou nota indicando onde encontrar contexto adicional
- [ ] Sidebar de `media/` (`sidebar: mediasidebar`) inclui links para APIs de mídia mais importantes
- [ ] Terminologia consistente entre seções (ex: "codec" usado da mesma forma em `/media/` e `/api/webcodecs_api/`)
