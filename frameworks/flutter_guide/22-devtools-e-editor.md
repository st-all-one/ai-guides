# 22 — DevTools e ambiente de desenvolvimento

## 1. Flutter/Dart DevTools

Suíte de ferramentas de performance e depuração, distribuída **junto com o SDK** (`flutter upgrade` atualiza). Abre por VS Code, Android Studio/IntelliJ ou linha de comando.

```console
flutter pub global activate devtools   # opcional
flutter run --start-paused
# ou abrir pelo link impresso / pela IDE
```

### Abas principais

| Aba | Para quê |
|---|---|
| **Inspector** | Árvore de widgets, explorador, propriedades, depuração visual |
| **Performance** | Gráfico de frames, timeline, análise de frame, eventos |
| **CPU Profiler** | Call tree, bottom-up, method table, flame chart |
| **Memory** | Heap, alocação, GC, vazamentos |
| **Network** | Tráfego HTTP/HTTPS/WebSocket |
| **Debugger** | Breakpoints, call stack, stepping, console |
| **Logging** | Eventos padrão e logs do app |
| **App Size** | Análise e diff de tamanho do app |
| **Deep Links** | Validar deep links Android/iOS |
| **Extensions** | Ferramentas de terceiros |
| **Console** | Saída, avaliar expressões, heap snapshot |

### Inspector

- Árvore de widgets navegável; selecionar widget e ver **propriedades**.
- `debugDumpApp()`, `debugDumpRenderTree()`, `debugDumpSemanticsTree()`.
- Depuração visual: `debugPaintSizeEnabled`, `debugPaintBaselinesEnabled`, `debugRepaintRainbowEnabled`.
- **Slow Animations** e **Performance Overlay** para inspecionar transições.
- "Show widget rebuild information" / "Track widget rebuilds".

### Performance / Timeline

- **Flutter frames chart**: cada frame, UI vs raster; barras vermelhas = jank.
- **Frame analysis**: escolha um frame e veja a decomposição (build/layout/paint/raster).
- **Timeline events**: flame chart de eventos, incluindo `saveLayer` e layouts.
- Sempre em **profile mode** e dispositivo real.

### CPU Profiler

- **Record/Stop** ou **Load all CPU samples** (buffer circular do VM).
- **Call tree** (top-down, caminhos caros) e **Bottom-up** (métodos caros).
- **Method table** + call graph; **flame chart**.
- **Total** vs **Self** time.
- Sampling: low 1 kHz / medium 4 kHz / high 20 kHz (mais amostras → mais overhead e buffer enche antes).
- Filtre por biblioteca, método ou `UserTag`.
- `--profile-startup` faz o VM descartar amostras após encher, em vez de sobrescrever.

### Memory

- Conceitos: **heap**, **objeto descartável** (`dispose()`), **objeto de risco**, **raiz**, **alcançabilidade** e **retaining path**.
- Use para: OOM, lentidão, app encerrado pelo SO, suspeita de vazamento.
- Diff de snapshots, alocação por classe, GC.
- Sempre descarte controllers/listeners/streams (ver `04`/`11`).

### Network

- Grava tráfego de `dart:io` (`HttpClient`, `dio`) e de pacotes que usam `http_profile` (`cupertino_http`, `cronet_http`, `ok_http`).
- No **web**, use as ferramentas do navegador (Chrome DevTools).
- Filtros: `method`/`m`, `status`/`s`, `type`/`t` (ex.: `my-endpoint m:get t:json s:200`).
- Para capturar o startup: `flutter run --start-paused`, inicie a gravação e retome.

### Debugger / Logging / Console

- Breakpoints, stepping, exceções; console de saída.
- Logging mostra eventos padrão do framework e `dart:developer log()` (ver `10`).
- Console: avaliar expressões e navegar no heap.

### App Size

```console
flutter build apk --analyze-size
flutter build ipa --analyze-size
flutter build web --analyze-size
```

- Aba **Analysis** (o que ocupa espaço) e **Diff** (comparar builds).
- Arquivo de tamanho gerado permite análise offline.

### Deep Links

- Valida deep links Android/iOS, mostrando a rota resolvida.

### Extensions e CLI

- **DevTools extensions**: pacotes podem registrar ferramentas próprias.
- **CLI**: conectar/relançar sessões de debug.

## 2. Hot reload e hot restart

| Ação | Efeito | Estado |
|---|---|---|
| **Hot reload** (`r`) | Injeta código novo, mantém estado | Preservado |
| **Hot restart** (`R`) | Reinicia o app do zero | Perdido |
| **Reload** | Reconstrói widget tree | Preservado |

- Hot reload não reflete mudanças em `main()`, variáveis globais, inicializadores `static`, ou tipos/assinaturas alterados → use hot restart.
- No **web**, hot reload só funciona em modo debug com DDC (não em release).
- Plugins nativos novos exigem **parar e rodar de novo**.

## 3. Editores

### VS Code

- Extensão **Flutter** (+ **Dart**).
- Run/Debug, hot reload/restart, DevTools, inspector.
- **Advanced debugging**: launch configs, breakpoints condicionais, watch.

### Android Studio / IntelliJ

- Plugin Flutter (+ Dart).
- Criação de projetos, edição, issues, run/debug.
- **Flutter Performance** window: rebuild stats, performance overlay.
- **Flutter Inspector** integrado.

### Outros editores

- `editors.md` lista editores locais/online; qualquer editor funciona com `flutter`/`dart` na CLI.

## 4. Qualidade de código no ambiente

### `flutter fix`

```console
dart fix --dry-run
dart fix --apply          # projeto inteiro
dart fix --apply lib/main.dart   # arquivo
```

Aplica correções automáticas sugeridas pelo analyzer (ex.: migrações de API).

### Formatação

```console
dart format .
dart format --output=none --set-exit-if-changed .   # CI
```

- VS Code/Android Studio formatam ao salvar.
- Regras em `analysis_options.yaml` (ver `03`/`16`).

### Pubspec e SDK

- `tools/pubspec.md`: campos e estruturas (`path_to_file`, `path_to_directory`, `flavor_path_field`, `platform_path_field`).
- `tools/sdk.md`: conteúdo do SDK; comandos `flutter` e `dart`; ferramentas suportadas.

### Widget Previewer

- Pré-visualiza widgets isoladamente, sem rodar o app.
- Busca/filtro de previews, customização e **anotações customizadas**.
- Acelera o desenvolvimento de componentes.

### Property Editor

- Edita propriedades de widgets em tempo real (experimental).

## 5. CLI essencial

```console
flutter --version
flutter doctor -v
flutter devices
flutter run -d <device>
flutter attach              # add-to-app / hot reload em app em execução
flutter analyze
flutter test
flutter build <target>
flutter pub <cmd>
dart <cmd>
flutter gen-l10n
flutter symbolize -i trace.txt -d symbols.symbols
```

## 6. Fluxo recomendado

1. `flutter analyze` + format antes de commitar.
2. `dart fix --apply` para migrações.
3. Desenvolver com hot reload; hot restart ao mudar inicializadores.
4. Profile + DevTools para performance.
5. Widget Previewer para componentes isolados.
6. `--analyze-size` antes do release.
7. DevTools **Deep Links** para validar links.
