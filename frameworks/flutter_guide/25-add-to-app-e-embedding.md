# 25 — Add-to-app e embedding

Integrar Flutter **dentro** de um app existente (Android, iOS, macOS, web), em vez de reescrevê-lo. Para criar um app novo, use `flutter create` (ver `03`).

## 1. Conceitos

Dois modos:

| Modo | Plataformas | Como funciona |
|---|---|---|
| **Multi-engine** | Android, iOS, macOS | Uma ou mais instâncias do Flutter, cada uma um programa Dart isolado; estado independente, memória mínima por instância |
| **Multi-view** | Web | Um único programa Dart; várias `FlutterView`s compartilham objetos |

Casos de uso:

- **Hybrid navigation stacks**: telas alternam entre Flutter e nativo.
- **Partial-screen views**: widgets Flutter e nativos na mesma tela.

## 2. Android

### Integração

- Adicione um hook do SDK do Flutter ao Gradle para **auto-build e import** do módulo.
- Alternativa: compile o módulo como **AAR** genérico (melhor interoperabilidade AndroidX).
- APIs: **`FlutterEngine`** (inicia/persiste o ambiente), **`FlutterActivity`**/**`FlutterFragment`**.
- Suporta hosts Java/Kotlin e plugins Flutter.
- Debug/hot reload com **`flutter attach`**.

### Exibir telas

```kotlin
// Tela cheia
startActivity(FlutterActivity.createDefaultIntent(this))

// Com rota inicial
FlutterActivity
  .withNewEngine()
  .initialRoute("/produto/42")
  .build(this)
```

- **`FlutterFragment`** para embutir em uma `Activity`; suporta **render mode**, transparência e entrypoint específico.
- **`FlutterView`** (add-flutter-view) para views dimensionadas ao conteúdo.

### Pré-aquecer o engine (pre-warm)

Para reduzir latência, crie um `FlutterEngine` cedo e reutilize-o (cached engine) em vez de criar um por tela. Isso antecipa o carregamento das libs e o start da VM Dart.

### Plugins

- **A. Simples**: plugin usa `FlutterPlugin` — normalmente nada a fazer.
- **B. Precisa de edições no projeto**: ajuste Gradle/manifest.
- **C. Merging libraries**: combine dependências para evitar conflitos.

### Splash

Exiba um splash nativo enquanto o engine carrega (ver `21`).

## 3. iOS

### Integração

- Compile o módulo Flutter como **Swift package** e importe no Xcode.
- Alternativa: auto-build via **Xcode build phases**.
- APIs: **`FlutterEngine`** + **`FlutterViewController`**.
- Suporta hosts Objective-C e Swift; plugins Flutter; `flutter attach`.

### Exibir telas

```swift
let engine = FlutterEngine(name: "engine", project: nil)
engine.run()
let vc = FlutterViewController(engine: engine, nibName: nil, bundle: nil)
present(vc, animated: true)
```

- Use `FlutterAppDelegate`/`FlutterSceneDelegate`.
- **Launch options** e **content-sized views** (dimensionar ao conteúdo).
- Integração com **SwiftPM** (app e autores de plugin).

### macOS

Análogo ao iOS: Swift package, Xcode build phases, `FlutterEngine`, `FlutterViewController`, hosts Swift, plugins, `flutter attach`.

## 4. Web (embedding)

- **Full page mode**: Flutter ocupa a página.
- **Embedded mode**: Flutter renderiza em um **host element** dentro de um app HTML/JS existente (React, Vue, Angular, Django, VanillaJS…). Requisito mínimo: importar libs JS e criar elementos HTML.
- **Custom element (`hostElement`)**: monte e gerencie **múltiplas views** via JS.
- **Host element CSS requirements**: tamanho/posição explícitos são obrigatórios.
- Não há como "desligar" totalmente o engine: remova as `FlutterView`s e deixe o GC agir; o engine permanece aquecido.

```console
flutter build web
# então siga as instruções de embedding para montar as views na página
```

## 5. Múltiplas instâncias (multiple Flutters)

- **Cenários**: várias telas/regiões Flutter independentes.
- **Componentes**: engines, views, entrypoints.
- **Comunicação**: entre instâncias via plataforma (channels) — não compartilham memória Dart.
- **Amostras** oficiais em `flutter/samples/add_to_app`.

## 6. Debug

```console
flutter attach                 # conecta a um app em execução com Flutter
flutter attach -d <device>
```

- **iOS**: depure extensões no Xcode e VS Code.
- **Android**: Android Studio.
- **Sem USB**: depuração sem fio.

## 7. Performance e memória (sequência de carga)

Exibir uma UI Flutter passa por:

1. **Encontrar recursos** Flutter (libs + assets) no apk/ipa/app.
2. **Carregar as bibliotecas** compartilhadas (uma vez por processo).
3. **Iniciar a VM Dart** (uma vez por sessão).
4. **Executar o entrypoint** (Dart).

Implicações:

- Construir um `FlutterEngine` antecipadamente (pre-warm) reduz a latência da primeira tela.
- Custo de memória: engine + snapshot Dart + assets.
- Cada instância adicional (multi-engine) tem custo próprio.
- Ver `19` para manter a main thread livre.

## 8. Limitações

**Mobile:**
- Multi-view não suportado (só multi-engine).
- Empacotar múltiplas libs Flutter no mesmo app não é suportado.
- Plugins que não usam `FlutterPlugin` podem ter comportamento inesperado (ex.: assumir que uma `Activity` Flutter sempre existe).
- Android: o módulo só suporta apps **AndroidX**.

**Web:**
- Multi-engine não suportado (só multi-view).
- Engine não pode ser totalmente desligado.

## 9. Checklist

- [ ] Módulo Flutter criado e importado no host
- [ ] `FlutterEngine` pré-aquecido/reutilizado para latência
- [ ] Rotas iniciais/entrypoints definidos
- [ ] Plugins compatíveis com add-to-app
- [ ] Splash nativo durante a carga
- [ ] `flutter attach` funcionando para hot reload
- [ ] Limitações por plataforma revisadas
- [ ] Memória e tempo de carga medidos (ver `22`)
