# 19 — Arquitetura de projeto e main thread dedicada à renderização

## 1. Objetivo: fluidez perceptível

Fluidez = **cada frame dentro do orçamento**. Em 60 Hz, o orçamento é ~16 ms (na prática **8 ms para build + 8 ms para raster**); em 120 Hz, ~8 ms totais. Quando um frame estoura, ocorre **jank** (engasgo visual). Em Flutter, o trabalho que você controla acontece na **UI thread / main isolate** — o objetivo deste documento é mantê-la **livre para construir e agendar frames**, empurrando tudo que é pesado para fora dela.

> Regra de ouro: **nada que dure mais que um frame gap pode rodar na main thread.**

## 2. Modelo de threads do Flutter

| Thread | O que faz | Visível no overlay |
|---|---|---|
| **Platform thread** | Thread principal do SO; roda código de plugin | Não |
| **UI thread (main isolate)** | Executa **todo o Dart** (seu código + framework); cria a *layer tree* | Sim (gráfico de baixo) |
| **Raster thread** | Converte a layer tree em GPU (Skia/Impeller); roda na CPU | Sim (gráfico de cima) |
| **I/O thread** | Tarefas caras de I/O que bloqueariam UI/raster | Não |

- **Todo o Dart roda na UI thread.** Um cálculo pesado nela atrasa o próximo frame.
- A raster thread depende do que a UI thread produz: uma layer tree complicada a deixa lenta, mesmo que seu Dart esteja rápido.
- **Flutter 3.29+:** as threads de UI e plataforma foram unificadas em iOS e Android (Dart roda na thread nativa da plataforma).
- O **performance overlay** mostra dois gráficos: topo = raster (GPU), baixo = UI. Barras vermelhas indicam frame estourado:
  - vermelho no **UI** → código Dart caro;
  - vermelho no **GPU** → cena complexa de rasterizar.
  - Se ambos, **diagnostique primeiro a UI thread**.

## 3. O que pode e o que não pode rodar na main thread

**Pode (e deve):**
- `build()`, layout, pintura (Dart) — mantidos **curtos e puros**.
- Agendar frames, atualizar estado, disparar commands.
- Coordenar chamadas assíncronas.

**Não pode (offload obrigatório):**
- Parsing/decodificação de JSON grande.
- Decodificação/transformação de imagens em resolução total.
- Criptografia, compressão, hashing de arquivos grandes.
- Consultas pesadas a banco local.
- Leitura/escrita síncrona de arquivos.
- Ordenação/filtragem/busca em listas enormes.
- Processamento de áudio/vídeo.
- Loops longos ou algoritmos O(n²) síncronos.

## 4. Arquitetura que protege a main thread

A arquitetura recomendada (MVVM em camadas) já cria a fronteira certa: **a UI nunca faz trabalho pesado; ela consome estado assíncrono de ViewModels, que delegam a Repositories, que encapsulam Services.**

```
View (main thread, só UI)
  ↓ commands / escuta estado
ViewModel (main thread, só orquestra)
  ↓ chama métodos async
Repository (cache, retry, offload, SSOT)
  ↓ usa
Service (fronteira de I/O e isolates)
  ↓
HTTP / DB / arquivo / isolate / plataforma
```

Princípios:

1. **Services são a fronteira assíncrona.** Nenhum método de service é síncrono/bloqueante. Toda operação pesada é encapsulada ali (`Future`/`Stream`).
2. **Isolates ficam escondidos em services.** Ex.: `PhotoParserService`, `ImageProcessingService`, `CryptoService`. O resto do app só vê `Future<Result<T>>`.
3. **Repositories cuidam de cache, prefetch e retry.** Buscar cedo e cachear evita trabalho no momento crítico do frame.
4. **UI nunca faz IO.** Nem no `build`, nem em `initState` de forma bloqueante; usa commands/streams.
5. **Fluxo unidirecional + estado imutável** minimizam rebuilds e trabalho de layout.
6. **Injeção de dependência** permite trocar o service pesado por um fake em testes.

### Onde colocar trabalho pesado

| Trabalho | Onde vive | Técnica |
|---|---|---|
| Parse de JSON | Service | `Isolate.run`/`compute` |
| Decodificação de imagem | Service / widget de imagem | `cacheWidth`/`cacheHeight`, `precacheImage`, isolates |
| Banco de dados | Service | `sqflite`/`drift` assíncronos |
| Criptografia | Service | isolate |
| Busca/ordenação | Repository/Service | isolate + debounce + paginação |
| Chamada de plataforma | Service | platform channel assíncrono |
| Animação | View | `AnimatedBuilder` + `child` estável, `const` |

## 5. Isolates: a ferramenta principal

Isolates têm **memória própria** e se comunicam por mensagens; não compartilham estado.

### Curta duração — `Isolate.run`

```dart
Future<List<Photo>> parsePhotos(String jsonString) {
  return Isolate.run<List<Photo>>(() {
    final data = jsonDecode(jsonString) as List<Object?>;
    return data.cast<Map<String, Object?>>().map(Photo.fromJson).toList();
  });
}
```

### Portátil (web) — `compute`

No web não existem isolates; `compute` roda na main thread, mas o mesmo código compila.

```dart
return compute(parsePhotos, response.body);
```

### Longa duração — worker persistente

Para trabalho repetitivo, evite recriar isolates (custo de spawn/cópia). Use `Isolate.spawn` + `ReceivePort`/`SendPort`, ou pacotes como `worker_manager`.

### Regras e limites

- Mensagens mutáveis são **copiadas**; objetos imutáveis (ex.: `String`) passam por **referência**. `Isolate.exit` transfere a posse sem cópia.
- Não passe objetos complexos/não serializáveis (ex.: `Future`, `http.Response`) entre isolates.
- **Sem** `rootBundle` nem `dart:ui` em isolates gerados.
- Plugins de background: `BackgroundIsolateBinaryMessenger.ensureInitialized(rootIsolateToken)`.
- Não é possível receber mensagens não solicitadas do host em isolates de background (ex.: listeners push).
- Evite copiar payloads gigantes; prefira passar caminhos/IDs e ler no worker.

## 6. Estratégias de descarga por cenário

- **JSON grande:** buscar bytes na main thread, decodificar/mapear no isolate.
- **Imagens:** decodifique no tamanho de exibição (`cacheWidth`), use `precacheImage` antes de animar e `FadeInImage` para placeholders.
- **Listas grandes:** `ListView.builder` (lazy), paginação, `itemExtent` fixo.
- **Busca/filtro em tempo real:** debounce (ex.: 300 ms) e execute no isolate; cancele requisições antigas.
- **Banco:** operações assíncronas; nunca `await` síncrono no build.
- **Animação:** isole o subtree animado com `RepaintBoundary`; passe partes estáticas como `child` do `AnimatedBuilder`.
- **Startup:** inicialize serviços pesados de forma tardia/preguiçosa; mostre skeleton/loading.

## 7. Reduzir trabalho na main thread (build/layout/paint)

Mesmo com offload correto, a UI thread ainda precisa ser econômica:

- `const` em widgets; widgets pequenos e focados.
- `setState` no menor subtree possível; `ListenableBuilder`/`Selector` com escopo.
- Evite reconstruir listas inteiras; use builders.
- `RepaintBoundary` em partes que repintam isoladamente (ex.: um vídeo/animador entre widgets estáticos).
- Evite `saveLayer`, `Opacity` e clipping desnecessários (ver `11`).
- Evite passes de *intrinsic* em grids/listas grandes.
- Não sobrescreva `operator ==` em widgets.
- Mantenha imagens em tamanho adequado; use cache.
- Evite `MediaQuery.of(context)` amplo (reconstrói em tudo); prefira `MediaQuery.sizeOf`/`textScalerOf`.

## 8. Agendamento, frames e cooperação

- **`SchedulerBinding.instance.addPostFrameCallback((_) { ... })`** — executa após o frame, sem atrasá-lo. Bom para medir/inicializar.
- **`SchedulerBinding.instance.addTimingsCallback`** — recebe `FrameTiming` (build e raster) para telemetria.
- **`SchedulerBinding.instance.scheduleFrame()`** — solicita um novo frame.
- **`WidgetsBinding.instance.addPersistentFrameCallback`** — roda a cada frame; use com extrema parcimônia.
- **Microtasks vs. eventos:** um loop síncrono longo bloqueia ambos. Quebre trabalho em *chunks* e ceda o controle:

```dart
Future<void> processarEmLotes(List<Item> itens) async {
  const lote = 200;
  for (var i = 0; i < itens.length; i += lote) {
    final fim = (i + lote).clamp(0, itens.length);
    for (var j = i; j < fim; j++) {
      // trabalho curto por item
    }
    await Future<void>.delayed(Duration.zero); // cede para o próximo frame
  }
}
```

- Para trabalho realmente pesado, prefira isolate a fatiar na main thread.
- Use `Future.microtask`/`scheduleMicrotask` só para trabalho curtíssimo (microtasks rodam antes do próximo evento e podem atrasar frames).

## 9. Medir e **demonstrar** fluidez

1. **Sempre em `profile` mode, em dispositivo real** (nunca debug/emulador).
2. Ative o **performance overlay** (tecla `P` ou DevTools) e observe os gráficos UI/raster contra as linhas de 16 ms.
3. **DevTools → Performance**: timeline frame a frame, flame chart, detecção de `saveLayer`, track layouts.
4. **`FrameTiming`** para provar os números:

```dart
import 'dart:developer' as developer;
import 'package:flutter/scheduler.dart';

void main() {
  SchedulerBinding.instance.addTimingsCallback((timings) {
    for (final t in timings) {
      developer.log(
        'build=${t.buildDuration.inMicroseconds}us '
        'raster=${t.rasterDuration.inMicroseconds}us',
        name: 'frame.timing',
      );
    }
  });
  runApp(const MyApp());
}
```

5. **Trace** de seções com `dart:developer Timeline`:

```dart
Timeline.startSync('parsePhotos');
// ...
Timeline.finishSync();
```

6. **Teste de integração de performance** com `integration_test` + `traceAction`/`reportTimings` (ver `cookbook/testing/integration/profiling`).
7. **Flutter Performance window** no IDE: "Show widget rebuild information" e "Track widget rebuilds".

Metas de referência:

- `buildDuration` e `rasterDuration` < 8 ms cada (folga para 60 Hz; ideal para 120 Hz).
- Sem barras vermelhas no overlay em navegação e animações principais.

## 10. Exemplo arquitetural completo

```dart
// ---- Service: esconde o isolate (fronteira assíncrona) ----
class PhotoParserService {
  Future<List<Photo>> parse(String jsonString) {
    return Isolate.run<List<Photo>>(() {
      final raw = jsonDecode(jsonString) as List<Object?>;
      return raw.cast<Map<String, Object?>>().map(Photo.fromJson).toList();
    });
  }
}

// ---- Repository: SSOT, cache, retry; usa o service ----
class PhotoRepository {
  PhotoRepository(this._api, this._parser);
  final ApiClient _api;
  final PhotoParserService _parser;

  List<Photo>? _cache;

  Future<Result<List<Photo>>> getPhotos() async {
    if (_cache != null) return Result.ok(_cache!);
    try {
      final body = await _api.getPhotosRaw();   // I/O assíncrono
      final photos = await _parser.parse(body); // isolate
      _cache = photos;
      return Result.ok(photos);
    } on Exception catch (e) {
      return Result.error(e);
    }
  }
}

// ---- ViewModel: orquestra e expõe estado; main thread só coordena ----
class PhotosViewModel extends ChangeNotifier {
  PhotosViewModel(this._repo) { load = Command0(_load)..execute(); }
  final PhotoRepository _repo;
  late final Command0 load;
  List<Photo> _photos = const [];
  List<Photo> get photos => _photos;

  Future<Result<void>> _load() async {
    final result = await _repo.getPhotos();
    if (result is Ok<List<Photo>>) _photos = result.value;
    notifyListeners();
    return Result.ok(null);
  }
}

// ---- View: só UI; const, lazy e RepaintBoundary ----
class PhotosScreen extends StatelessWidget {
  const PhotosScreen({super.key, required this.viewModel});
  final PhotosViewModel viewModel;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: ListenableBuilder(
          listenable: viewModel,
          builder: (context, _) => viewModel.load.running
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: viewModel.photos.length,
                  itemBuilder: (_, i) => RepaintBoundary(
                    child: _PhotoTile(photo: viewModel.photos[i]),
                  ),
                ),
        ),
      );
}
```

Nesse desenho, a main thread **nunca** decodifica JSON nem toca I/O: ela apenas constrói widgets baratos e reage a notificações.

## 11. Anti-padrões que travam a main thread

| Anti-padrão | Consequência | Correção |
|---|---|---|
| `jsonDecode` de payload grande no `build`/init | Jank/travamento | `Isolate.run`/`compute` |
| Decodificar imagem em resolução total | Pico de memória/jank | `cacheWidth`/`cacheHeight` |
| `File.readAsStringSync` / IO síncrono | Bloqueia frame | APIs assíncronas |
| Loop síncrono longo | Frame perdido | Isolate ou chunk + `yield` |
| `setState` no topo da árvore | Rebuild massivo | Localizar |
| `Column` com centenas de filhos | Build/layout caros | `ListView.builder` |
| `Opacity`/clip em animação | Raster lento | `AnimatedOpacity`/`FadeInImage` |
| `MediaQuery.of(context)` amplo | Rebuild global | `sizeOf`/`textScalerOf` |
| Plugins chamados de forma síncrona | Trava a UI | Canais assíncronos |
| `addPersistentFrameCallback` para lógica | Trabalho a cada frame | Agendar sob demanda |

## 12. Checklist de fluidez

- [ ] Medindo em `profile` num dispositivo real
- [ ] `buildDuration` e `rasterDuration` < 8 ms nos fluxos críticos
- [ ] Nenhuma operação > frame gap na main thread
- [ ] JSON/imagem/cripto/DB em services com isolates
- [ ] UI sem IO; estado via commands/streams
- [ ] `const`, widgets pequenos e `setState` localizado
- [ ] Listas lazy; `RepaintBoundary` onde repinta muito
- [ ] Sem `saveLayer`/`Opacity`/clip desnecessários
- [ ] Imagens decodificadas no tamanho de exibição
- [ ] Debounce em buscas; paginação em listas grandes
- [ ] Monitoramento de `FrameTiming` em produção
- [ ] Perfil de jank validado no DevTools antes do release
