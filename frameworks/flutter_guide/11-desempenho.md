# 11 — Desempenho

Flutter é performático por padrão. O trabalho é **evitar armadilhas**. Meça sempre em **profile mode num dispositivo real** — nunca em debug ou emulador.

## 1. Orçamento de frame

- Display 60 Hz → **16 ms por frame**; na prática, **8 ms para build + 8 ms para render**.
- Display 120 Hz → **8 ms totais** para suavidade máxima.
- Mesmo abaixo de 16 ms, otimize: melhora bateria, térmica e dispositivos fracos.

## 2. Minimize operações caras

### Custo de `build()`

- `build()` pode rodar a cada frame; mantenha-o puro e rápido.
- Evite trabalho repetitivo/caro dentro de `build()`.
- Não faça IO/lógica pesada no build — vá para `initState`/ViewModel.

### `setState` localizado

- `setState` rebuilda o `State` e **todos os descendentes**.
- Chame no menor subtree possível; não no topo da árvore para uma mudança local.
- A travessia para quando encontra a **mesma instância** de filho do frame anterior — por isso `const` e subtrees estáveis importam.

### `const`

- Use construtores `const` sempre que possível: o Flutter pula grande parte do rebuild.
- Habilite `prefer_const_constructors` via `flutter_lints`.
- Prefira `StatelessWidget` a funções que retornam widgets (const + reuso).

### `StringBuffer`

Para concatenar em loop, use `StringBuffer` (uma alocação) em vez de `+` (uma por concatenação).

```dart
final sb = StringBuffer();
for (final item in itens) {
  sb.writeln(item.nome);
}
final texto = sb.toString();
```

## 3. Pintura: `saveLayer`, opacidade e clipping

### `saveLayer`

- `saveLayer()` aloca um buffer offscreen e causa troca de render target — **caro**, causa jank.
- Pode ser chamado indiretamente por `ShaderMask`, `ColorFilter`, `Chip` (quando `disabledColorAlpha != 0xff`), `Text` (com `overflowShader`).
- Detecção: `PerformanceOverlayLayer.checkerboardOffscreenLayers`.
- Mitigação: pré-calcular sobreposições estáticas, refatorar para evitar overlaps, ou trocar de pacote.

### `Opacity` e clipping

- Use `Opacity` só quando necessário; para texto/formas, prefira cor semitransparente.
- Para fade em imagem, use `FadeInImage` (fragment shader na GPU).
- Clipping é caro (embora não use `saveLayer` por padrão). `Clip.none` é o default; habilite só quando preciso.
- Cantos arredondados: use `borderRadius` em vez de clip.
- **Nunca** use `Opacity`/clipping dentro de animação; use `AnimatedOpacity`/`FadeInImage`.

## 4. Listas e grids

- Use builders lazy: `ListView.builder`, `GridView.builder`, `SliverList.builder` — constrói só o visível.
- Evite `Column()`/`ListView()` com lista concreta de muitos filhos fora da tela.
- Evite `shrinkWrap: true` desnecessário.
- Para itens de tamanho fixo, `itemExtent` acelera o layout.

## 5. Passes de layout e intrinsics

- Flutter tenta **uma passada** de layout; grids/listas podem exigir uma **intrinsic pass** (cara).
- Intrinsic acontece quando é preciso saber o tamanho "preferido" de todos os filhos (ex.: uniformizar células).
- Detecção: ative **Track layouts** no DevTools; eventos `$runtimeType intrinsics`.
- Mitigação: defina tamanho fixo das células ou escreva um `RenderObject` que use uma célula âncora.

## 6. Pitfalls de widgets

- Evite `AnimatedBuilder` com subtree independente da animação dentro do builder — passe-a como `child`.
- Evite `Opacity` em animação.
- **Não sobrescreva `operator ==` em widgets**: causa comportamento O(N²) e degrada toda a árvore (o compilador perde a suposição de chamada estática). Exceção rara: widgets-folha que raramente mudam.
- Evite reconstruir widgets desnecessariamente; cache instâncias.

## 7. Concorrência e isolates

- A main isolate processa eventos e frames. Trabalho > frame gap causa jank.
- Mova cálculos pesados para isolates (`Isolate.run`, `compute`).
- Casos comuns: banco local, parsing JSON grande, processamento de mídia, criptografia, FFI assíncrono.
- `Isolate.run` copia mensagens mutáveis; objetos imutáveis são passados por referência.
- No web não há isolates; `compute` roda na main thread.
- Plugins de background usam `BackgroundIsolateBinaryMessenger`.

## 8. Tamanho do app

```console
flutter build apk --analyze-size
flutter build appbundle --analyze-size
flutter build ios --analyze-size
```

- **Tree shaking** remove código não usado (Dart e ícones).
- `--split-debug-info` + `--obfuscate` reduzem tamanho.
- **Deferred components** carregam código sob demanda (Android app bundles):

```yaml
flutter:
  deferred-components:
    - name: feature_a
      libraries:
        - uri: "package:meu_app/feature_a.dart"
```

```dart
import 'feature_a.dart' deferred as feature_a;

await feature_a.loadLibrary();
```

- Use `--analyze-size` e o DevTools **App Size** para investigar.

## 9. Performance web

- Evite árvores enormes; tree shaking e deferred loading ajudam.
- Use placeholders/precache de imagens.
- Desabilite transições de navegação desnecessárias.
- Considere `--wasm` para melhor performance (quando aplicável).

## 10. Medição (DevTools)

| View | Uso |
|---|---|
| **Performance** | Timeline, frame times, jank, `saveLayer`, track layouts |
| **CPU Profiler** | Flame chart, hotspots |
| **Memory** | Alocações, vazamentos |
| **Network** | Requisições |
| **App Size** | Composição do binário |
| **Inspector** | Árvore de widgets, rebuilds |

- Flutter Performance window (IDE): "Show widget rebuild information".
- `showPerformanceOverlay: true` para overlay em tempo real.

## 11. Checklist de performance

- [ ] Medindo em **profile** num dispositivo real
- [ ] `const` onde possível; `flutter_lints` ativo
- [ ] `setState` localizado
- [ ] Listas lazy (`ListView.builder`)
- [ ] Sem `saveLayer`/`Opacity`/clip desnecessários
- [ ] Sem `operator ==` em widgets
- [ ] Trabalho pesado em isolates
- [ ] Imagens em tamanho adequado (cacheWidth/decodificação)
- [ ] Sem passes de intrinsic em grids grandes
- [ ] App size analisado e tree shaking funcionando
- [ ] Animações fluidas a 60/120 fps
