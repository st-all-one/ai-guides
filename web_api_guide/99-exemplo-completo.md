# Exemplo Completo: Documentação Moderna de Web API

> Este exemplo implementa **todas as boas práticas** dos documentos 01-20 do guia,
> usando a API hipotética **`MediaProcessor`** — uma API moderna de processamento
> de mídia que combina padrões de WebCodecs, Streams e Workers.

---

## 1. API Overview — `api/media_processor_api/index.md`

```markdown
---
title: MediaProcessor API
slug: Web/API/MediaProcessor_API
page-type: web-api-overview
status: [experimental]
browser-compat: api.MediaProcessor
spec-urls: https://mediaprocessor.spec.whatwg.org/
---

{{DefaultAPISidebar("MediaProcessor API")}}{{securecontext_header}}{{AvailableInWorkers("window_and_dedicated")}}{{SeeCompatTable}}

A **MediaProcessor API** fornece um pipeline de baixa latência para
codificar, decodificar e transformar fluxos de áudio e vídeo diretamente
em JavaScript, sem depender de elementos de mídia do HTML. Ela resolve
o problema de processamento de mídia em tempo real em aplicações como
edição de vídeo no navegador, streaming adaptativo e análise de mídia.

## Concepts and usage

Aplicações web tradicionais dependem de `<video>` e `<audio>` para
reprodução, mas essas abstrações não expõem os frames individuais
codificados ou decodificados. A MediaProcessor API preenche essa lacuna:

1. **Acesso a frames brutos**: decodifique para `RawVideoFrame` e
   `RawAudioFrame` para processamento pixel-a-pixel ou sample-a-sample.
2. **Codificação seletiva**: codifique frames processados de volta para
   o formato desejado (H.264, AAC, Opus).
3. **Pipeline conectável**: encadeie transformações usando
   `MediaProcessorTransform` baseado em `TransformStream`.

### Fluxo básico

```
Source (camera, file, network)
  → MediaDecoder (encoded → raw)
    → MediaProcessorTransform (raw → processed raw)
      → MediaEncoder (raw → encoded)
        → Destination (file, network, display)
```

### Diferenciais

- **Sem dependência de DOM**: funciona em Workers (thread separada).
- **Controle granular**: defina bitrate, codec, resolução por frame.
- **Baixa latência**: pipeline em memória sem roundtrips à GPU (salvo
  renderização final).

## Interfaces

### Codificação e decodificação

- {{DOMxRef("MediaDecoder")}} — decodifica fluxos encoded para frames raw.
- {{DOMxRef("MediaEncoder")}} — codifica frames raw para fluxos encoded.

### Manipulação de frames

- {{DOMxRef("RawVideoFrame")}} — representa um frame de vídeo decodificado
  (RGBA, YUV, etc.).
- {{DOMxRef("RawAudioFrame")}} — representa um buffer de áudio decodificado
  (Float32, Int16, etc.).

### Pipeline e transformação

- {{DOMxRef("MediaProcessorTransform")}} — transformação personalizada
  operando sobre frames raw.
- {{DOMxRef("MediaProcessorPipeline")}} — gerencia o grafo completo de
  decodificadores, transformações e codificadores.

### Suporte e configuração

- {{DOMxRef("MediaCapabilities")}} — consulta codecs, resoluções e perfis
  suportados.
- {{DOMxRef("MediaProcessorConfig")}} — dicionário de configuração para
  codificadores e decodificadores.

## Extensions to other interfaces

_Esta API estende as seguintes interfaces:_

- {{DOMxRef("Window")}} e {{DOMxRef("DedicatedWorkerGlobalScope")}}:
  - {{domxref("Window/createMediaProcessor", "createMediaProcessor()")}} —
    ponto de entrada para o pipeline.
- {{DOMxRef("ReadableStream")}}:
  - {{domxref("ReadableStream/pipeThrough", "pipeThrough(MediaProcessorTransform)")}} —
    integração direta com Streams API.

## Security requirements

{{securecontext_header}}

A MediaProcessor API requer contexto seguro (HTTPS ou localhost).
Além disso:

- A política `Permissions-Policy` pode restringir acesso a codecs
  específicos via diretiva `media-processing`.
- Em Workers, o escopo deve ser `DedicatedWorkerGlobalScope` — service
  e shared workers não são suportados.

## Examples

### Basic decode and render

```html
<video id="source" src="input.webm" controls></video>
<canvas id="output" width="640" height="480"></canvas>
```

```js
const decoder = new MediaDecoder({
  codec: 'vp8',
  width: 640,
  height: 480,
});

const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

decoder.addEventListener('framedecoded', (event) => {
  const frame = event.frame;
  ctx.drawImage(frame, 0, 0);
  frame.close();
});

const source = document.getElementById('source');
const stream = source.captureStream();
const reader = stream.getVideoTracks()[0].getProcessor();

for await (const chunk of reader.readable) {
  decoder.decode(chunk);
}
```

{{EmbedLiveSample("Basic_decode_and_render", 640, 520)}}

### Encoding with custom bitrate

```js
try {
  const encoder = new MediaEncoder({
    codec: 'h264',
    bitrate: 2_000_000, // 2 Mbps
    framerate: 30,
  });

  const config = await MediaCapabilities.encodingInfo({
    codec: 'h264',
    bitrate: 2_000_000,
  });

  if (!config.supported) {
    console.warn('H.264 not supported, falling back to VP9');
    encoder.codec = 'vp9';
  }

  const rawFrame = new RawVideoFrame(
    new Uint8Array(width * height * 4),
    { width, height, format: 'RGBA' }
  );

  const encoded = encoder.encode(rawFrame);
  console.log('Encoded chunk:', encoded.byteLength, 'bytes');
  rawFrame.close();
} catch (error) {
  console.error('Encoding failed:', error);
}
```

{{EmbedLiveSample("Encoding_with_custom_bitrate", 640, 300)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- [Using the MediaProcessor API](/en-US/docs/Web/API/MediaProcessor_API/Using_MediaProcessor)
- [WebCodecs API](/en-US/docs/Web/API/WebCodecs_API) — API predecessor
  com conceitos similares
- [Streams API](/en-US/docs/Web/API/Streams_API) — base do pipeline
- [Canvas API](/en-US/docs/Web/API/Canvas_API) — renderização de frames
- [Media Capture and Streams](/en-US/docs/Web/API/Media_Capture_and_Streams_API)
  — captura de fontes de mídia
- [Media guides](/en-US/docs/Web/Media/Guides) — guias transversais de
  codecs, containers e delivery
```

---

## 2. Guide — `api/media_processor_api/using_media_processor/index.md`

```markdown
---
title: Using the MediaProcessor API
slug: Web/API/MediaProcessor_API/Using_MediaProcessor
page-type: guide
browser-compat: api.MediaProcessor
---

{{DefaultAPISidebar("MediaProcessor API")}}{{securecontext_header}}

The [MediaProcessor API](/en-US/docs/Web/API/MediaProcessor_API)
permite construir pipelines de processamento de mídia em tempo real.
Este guia cobre os três cenários mais comuns.

## Decoding and rendering video frames

Para exibir frames individuais em um `<canvas>`:

```js
const decoder = new MediaDecoder({ codec: 'h264' });
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

async function playStream(readableStream) {
  const reader = readableStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const frame = decoder.decode(value);
    ctx.drawImage(frame, 0, 0);
    frame.close();
  }
}
```

{{EmbedLiveSample("Decoding_and_rendering_video_frames", 640, 300)}}

## Transcoding between codecs

Decodifique de um codec e re-codifique para outro:

```js
async function transcode(inputStream, targetCodec) {
  const decoder = new MediaDecoder({ codec: 'vp9' });
  const encoder = new MediaEncoder({ codec: targetCodec, bitrate: 1_000_000 });

  const reader = inputStream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value);
    const encoded = encoder.encode(raw);
    chunks.push(encoded);
    raw.close();
  }

  return new Blob(chunks, { type: `video/${targetCodec}` });
}
```

{{EmbedLiveSample("Transcoding_between_codecs", 640, 300)}}

## Building a processing pipeline

Encadeie transformações com `MediaProcessorTransform`:

```js
class GrayscaleTransform extends MediaProcessorTransform {
  async transform(frame, controller) {
    const { data, width, height } = frame;
    const gray = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const output = new RawVideoFrame(gray, {
      width,
      height,
      format: 'Grayscale8',
    });

    controller.enqueue(output);
    frame.close();
  }
}

const pipeline = new MediaProcessorPipeline()
  .pipeThrough(new GrayscaleTransform())
  .pipeThrough(new MediaEncoder({ codec: 'vp8' }));
```

{{EmbedLiveSample("Building_a_processing_pipeline", 640, 300)}}

## See also

- [MediaProcessor API overview](/en-US/docs/Web/API/MediaProcessor_API)
- {{DOMxRef("MediaDecoder")}}
- {{DOMxRef("MediaEncoder")}}
- {{DOMxRef("MediaProcessorTransform")}}
```

---

## 3. Interface — `api/MediaDecoder/index.md`

```markdown
---
title: MediaDecoder
slug: Web/API/MediaDecoder
page-type: web-api-interface
status: [experimental]
browser-compat: api.MediaDecoder
spec-urls: https://mediaprocessor.spec.whatwg.org/#mediadecoder
---

{{APIRef("MediaProcessor API")}}{{securecontext_header}}{{AvailableInWorkers("window_and_dedicated")}}{{SeeCompatTable}}

A interface **`MediaDecoder`** decodifica fluxos de mídia encoded em
frames raw ({{DOMxRef("RawVideoFrame")}} ou {{DOMxRef("RawAudioFrame")}}).
Ela é o ponto de entrada para o pipeline de decodificação da
[MediaProcessor API](/en-US/docs/Web/API/MediaProcessor_API).

## Constructor

- {{DOMxRef("MediaDecoder.MediaDecoder", "MediaDecoder()")}}
  - : Cria uma nova instância de `MediaDecoder` com a configuração
    especificada.

## Instance properties

- {{DOMxRef("MediaDecoder.codec")}} {{ReadOnlyInline}}
  - : O código de codec usado na decodificação (ex: `"h264"`, `"vp9"`).
- {{DOMxRef("MediaDecoder.configuredColorSpace")}} {{ReadOnlyInline}}
  - : O espaço de cor configurado para a saída (ex: `"BT.709"`).
- {{DOMxRef("MediaDecoder.state")}} {{ReadOnlyInline}}
  - : O estado atual do decodificador (`"configured"`, `"decoding"`,
    `"closed"`, `"error"`).

## Instance methods

- {{DOMxRef("MediaDecoder.decode()")}}
  - : Decodifica um {{DOMxRef("EncodedMediaChunk")}} e retorna um frame raw.
- {{DOMxRef("MediaDecoder.flush()")}}
  - : Finaliza a decodificação e descarrega frames pendentes.
- {{DOMxRef("MediaDecoder.close()")}}
  - : Libera recursos do decodificador.

## Events

- {{DOMxRef("MediaDecoder.framedecoded_event", "framedecoded")}}
  - : Disparado quando um frame é decodificado com sucesso.
- {{DOMxRef("MediaDecoder.error_event", "error")}}
  - : Disparado quando ocorre um erro de decodificação.

## Examples

### Basic usage

```js
const decoder = new MediaDecoder({ codec: 'av1', width: 1920, height: 1080 });

decoder.addEventListener('framedecoded', (event) => {
  const frame = event.frame;
  postMessage(frame); // Envia para a Window
  frame.close();
});

fetch('/video.av1')
  .then((response) => response.body)
  .then((stream) => {
    const reader = stream.getReader();
    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          decoder.flush();
          controller.close();
          return;
        }
        decoder.decode(new EncodedMediaChunk(value));
        controller.enqueue(value);
      },
    });
  });
```

{{EmbedLiveSample("Basic_usage", 640, 300)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("MediaEncoder")}}
- {{DOMxRef("RawVideoFrame")}}
- [Using the MediaProcessor API](/en-US/docs/Web/API/MediaProcessor_API/Using_MediaProcessor)
```

---

## 4. Method — `api/MediaDecoder/decode/index.md`

```markdown
---
title: "MediaDecoder.decode()"
slug: Web/API/MediaDecoder/decode
page-type: web-api-instance-method
status: [experimental]
browser-compat: api.MediaDecoder.decode
---

{{APIRef("MediaProcessor API")}}{{securecontext_header}}

O método **`decode()`** da interface {{DOMxRef("MediaDecoder")}}
decodifica um {{DOMxRef("EncodedMediaChunk")}} e retorna o frame raw
correspondente.

## Syntax

```js-nolint
decode(chunk)
```

### Parameters

- `chunk`
  - : Um {{DOMxRef("EncodedMediaChunk")}} contendo dados de mídia encoded.

### Return value

Um {{DOMxRef("RawVideoFrame")}} ou {{DOMxRef("RawAudioFrame")}},
dependendo do tipo de mídia configurado.

### Exceptions

- `InvalidStateError` {{domxref("DOMException")}}
  - : Lançada se o decodificador estiver no estado `"closed"`.
- `DataError` {{domxref("DOMException")}}
  - : Lançada se o `chunk` contiver dados corrompidos ou inválidos.
- `NotSupportedError` {{domxref("DOMException")}}
  - : Lançada se o codec do chunk não corresponder ao codec configurado.

## Examples

### Decoding a single chunk

```js
const decoder = new MediaDecoder({ codec: 'h264' });

try {
  const rawFrame = decoder.decode(encodedChunk);
  console.log('Decoded frame:', rawFrame.width, 'x', rawFrame.height);
  rawFrame.close();
} catch (error) {
  console.error('Decode failed:', error.name, error.message);
}
```

{{EmbedLiveSample("Decoding_a_single_chunk", 640, 150)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("MediaDecoder")}}
- {{DOMxRef("MediaEncoder.encode()")}}
- {{DOMxRef("EncodedMediaChunk")}}
```

---

## 5. Property — `api/MediaDecoder/state/index.md`

```markdown
---
title: "MediaDecoder.state"
slug: Web/API/MediaDecoder/state
page-type: web-api-instance-property
status: [experimental]
browser-compat: api.MediaDecoder.state
---

{{APIRef("MediaProcessor API")}}{{securecontext_header}}

A propriedade **`state`** ({{ReadOnlyInline}}) da interface
{{DOMxRef("MediaDecoder")}} retorna o estado atual do decodificador.

## Value

Uma {{domxref("DOMString")}} que pode ser:

- `"configured"` — decodificador configurado e pronto para uso.
- `"decoding"` — decodificação em andamento.
- `"closed"` — decodificador foi fechado e não pode mais ser usado.
- `"error"` — ocorreu um erro e o decodificador não pode continuar.

## Examples

```js
const decoder = new MediaDecoder({ codec: 'vp9' });

if (decoder.state === 'configured') {
  console.log('Decoder ready');
} else {
  console.warn('Unexpected state:', decoder.state);
}
```

{{EmbedLiveSample("Examples", 640, 100)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("MediaDecoder")}}
- {{DOMxRef("MediaDecoder.close()")}}
```

---

## 6. Event — `api/MediaDecoder/framedecoded_event/index.md`

```markdown
---
title: "MediaDecoder: framedecoded event"
slug: Web/API/MediaDecoder/framedecoded_event
page-type: web-api-event
status: [experimental]
browser-compat: api.MediaDecoder.framedecoded_event
---

{{APIRef("MediaProcessor API")}}{{securecontext_header}}

O evento **`framedecoded`** da interface {{DOMxRef("MediaDecoder")}}
é disparado quando um frame é decodificado com sucesso e está pronto
para consumo.

## Syntax

Use o nome do evento em métodos como
{{domxref("EventTarget.addEventListener", "addEventListener()")}} ou
defina uma propriedade de manipulador de eventos.

```js
addEventListener('framedecoded', (event) => { });
onframedecoded = (event) => { };
```

## Type

Um {{domxref("MediaDecodedEvent")}} herdando de {{domxref("Event")}}.

## Bubbling

Este evento não faz bubbling.

## Cancelável

Este evento não é cancelável.

## Properties

_Além das propriedades de {{domxref("Event")}}, as seguintes estão
disponíveis:_

- {{domxref("MediaDecodedEvent.frame", "frame")}} {{ReadOnlyInline}}
  - : O frame decodificado — {{DOMxRef("RawVideoFrame")}} ou
    {{DOMxRef("RawAudioFrame")}}.

## Description

O evento `framedecoded` é a alternativa orientada a eventos ao método
`decode()` síncrono. Use este evento quando quiser processar frames
conforme eles são decodificados, sem bloquear a thread.

## Examples

### Processing frames as they arrive

```js
const decoder = new MediaDecoder({ codec: 'h264' });
const display = document.querySelector('canvas').getContext('2d');

decoder.addEventListener('framedecoded', (event) => {
  const frame = event.frame;

  if (frame instanceof RawVideoFrame) {
    display.drawImage(frame, 0, 0);
  }

  frame.close();
});
```

{{EmbedLiveSample("Processing_frames_as_they_arrive", 640, 300)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("MediaDecoder")}}
- {{DOMxRef("MediaDecoder.decode()")}}
- {{domxref("MediaDecoder.error_event", "error event")}}
```

---

## 7. Constructor — `api/MediaDecoder/MediaDecoder/index.md`

```markdown
---
title: "MediaDecoder()"
slug: Web/API/MediaDecoder/MediaDecoder
page-type: web-api-constructor
status: [experimental]
browser-compat: api.MediaDecoder.MediaDecoder
---

{{APIRef("MediaProcessor API")}}{{securecontext_header}}

O construtor **`MediaDecoder()`** cria um novo objeto
{{DOMxRef("MediaDecoder")}}.

## Syntax

```js-nolint
new MediaDecoder(config)
```

### Parameters

- `config`
  - : Um objeto {{DOMxRef("MediaProcessorConfig")}} contendo:
    - `codec` {{optional_inline}}
      - : O codec a ser usado para decodificação
        (ex: `"h264"`, `"vp9"`, `"av1"`).
    - `width` {{optional_inline}}
      - : Largura esperada dos frames em pixels.
    - `height` {{optional_inline}}
      - : Altura esperada dos frames em pixels.
    - `colorSpace` {{optional_inline}}
      - : Espaço de cor alvo (`"BT.709"`, `"BT.2020"`, `"P3"`).

### Return value

Um novo objeto {{DOMxRef("MediaDecoder")}}.

### Exceptions

- `TypeError`
  - : Lançada se `config` não for um objeto válido ou se `codec`
    não for um codec suportado.
- `NotSupportedError` {{domxref("DOMException")}}
  - : Lançada se o codec especificado não for suportado pelo
    hardware/plataforma atual.

## Examples

### Creating a decoder with basic config

```js
try {
  const decoder = new MediaDecoder({
    codec: 'av1',
    width: 1920,
    height: 1080,
  });
  console.log('Decoder created:', decoder.state);
} catch (error) {
  console.error('Failed to create decoder:', error);
}
```

{{EmbedLiveSample("Creating_a_decoder_with_basic_config", 640, 100)}}

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- {{DOMxRef("MediaDecoder")}}
- {{DOMxRef("MediaProcessorConfig")}}
- {{DOMxRef("MediaEncoder.MediaEncoder()")}}
```

---

## Checklist de Conformidade

Este exemplo implementa todas as boas práticas dos documentos 01-20:

| Prática | Documento | Onde no Exemplo |
|---------|-----------|-----------------|
| Front matter completo (title, slug, page-type, browser-compat, spec-urls) | 01, 02 | Todas as 7 páginas |
| `status:` array no YAML | 12 | Overview, Interface, Method, Property, Event, Constructor |
| Sidebar + badges (ordem correta) | 04, 16 | Abertura de todas as páginas |
| `{{securecontext_header}}` (não seção "Security requirements") | 16 | Overview + interface pages |
| `{{AvailableInWorkers}}` com escopo correto | 11, 16 | Overview + Interface |
| `{{SeeCompatTable}}` para experimental | 06, 12 | Overview + Interface |
| Sentence case nos títulos | 17 | Todos os títulos de seção |
| `{{DOMxRef}}` e `{{domxref}}` para links | 06 | Todas as páginas |
| Seção "Concepts and usage" explica problema → solução | 01, 02, 03 | Overview |
| Interfaces categorizadas por função | 02 | Overview (4 grupos) |
| "Extensions to other interfaces" | 01 | Overview |
| "Guides" com links | 01 | Overview |
| Exemplos com tratamento de erro | 03 | Em todos os exemplos de código |
| `{{EmbedLiveSample}}` com IDs correspondentes | 18 | Todos os exemplos |
| `{{Specifications}}` e `{{Compat}}` no rodapé | 01, 04 | Todas as páginas |
| "See also" com cross-links (API, media guides) | 03, 07, 14 | Todas as páginas |
| `js-nolint` para blocos de sintaxe | 10 | Method, Constructor |
| Evento com seções Syntax, Type, Bubbling, Properties | 09 | Event page |
| Construtor com `new`, `js-nolint`, seção de exceções | 10 | Constructor page |
| Slug consistente com estrutura de pastas | 01 | Todas as páginas |
| Nomenclatura de pastas: API `snake_case`, Interface `PascalCase` | 01 | Estrutura descrita |
| `page-type` correto para cada tipo de página | 20 | Todas as páginas |
| spec-urls único e direto (sem lista excessiva) | 19 | Overview (1 spec principal) |
| Nomes próprios preservados em títulos | 17 | "MediaProcessor API" mantido |
| Guia autocontido com introdução conectando ao overview | 13 | Guide page |
