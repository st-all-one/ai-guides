# 01 — Como o Flutter funciona

## 1. Anatomia de um app

Um app Flutter gerado por `flutter create` é composto por:

| Camada | Responsabilidade | Dono |
|---|---|---|
| **Dart App** | Compõe widgets, implementa lógica de negócio | Desenvolvedor |
| **Framework** | Widgets, hit-testing, gestos, acessibilidade, input, tema | Flutter (Dart) |
| **Engine** | Rasteriza cenas, layout de texto, runtime Dart, I/O | Flutter (C++) |
| **Embedder** | Integra com o SO: superfícies de render, acessibilidade, input, event loop | Flutter (Java/C++/Swift/ObjC) |
| **Runner** | Empacota tudo no formato executável do alvo | Desenvolvedor (template) |

O **engine** expõe sua API ao framework por meio de `dart:ui` (baixo nível: input, gráficos, texto). O framework é escrito em Dart e organizado em camadas opcionais e substituíveis.

## 2. Camadas do framework (de baixo para cima)

1. **Foundation** — classes base e serviços (animação, pintura, gestos).
2. **Rendering** — `RenderObject`, layout, pintura, hit-testing, acessibilidade.
3. **Widgets** — abstração de composição; introduz o modelo reativo.
4. **Material / Cupertino** — controles que implementam as linguagens de design do Android/iOS.

> Tudo no nível do framework é **opcional e substituível**. Não há privilégio de acesso entre camadas.

## 3. As três árvores

Flutter mantém três árvores em paralelo:

| Árvore | Tipo | Papel |
|---|---|---|
| **Widget** | Imutável, descartável | Descrição declarativa da UI |
| **Element** | Persistente, mutável | Instância de widget numa posição; liga widget ↔ render object |
| **RenderObject** | Persistente | Layout, pintura, hit-testing, semântica |

### Build: de Widget para Element

Ao construir, o framework chama `build()` e cria um **element** por widget:

- `ComponentElement` — hospeda outros elements (ex.: `StatelessWidget`, `StatefulWidget`).
- `RenderObjectElement` — participa de layout/paint e cria um `RenderObject`.

O `BuildContext` é um handle para a posição do element na árvore. `Theme.of(context)`, `MediaQuery.of(context)` e `Navigator.of(context)` consultam ancestrais via esse contexto.

### Reconciliação (por que rebuilds são baratos)

Widgets são imutáveis, mas os **elements persistem entre frames**. Quando um widget muda, o framework percorre só a parte modificada da árvore e reconfigura os elements/render objects existentes. Por isso:

- `build()` pode ser chamado a cada frame e deve ser **rápido e puro**.
- Um widget pode retornar a **mesma instância** de filho para podar a travessia (usado em animações).
- `const` permite pular grande parte do trabalho.

## 4. Renderização e layout

### Modelo de constraints

Flutter usa um **box constraint model** em 2D. A regra:

> **Constraints go down. Sizes go up. Parent sets position.**

1. O pai passa ao filho 4 doubles: largura mín/máx e altura mín/máx.
2. O filho escolhe um tamanho **dentro** dessas restrições.
3. O filho devolve o tamanho ao pai.
4. O pai posiciona o filho.
5. O pai reporta seu próprio tamanho ao seu pai.

Uma única passada em **O(n)**. Implicações:

- Um widget **não pode ter qualquer tamanho** que queira; só o que as restrições permitem.
- Um widget **não decide sua posição** — o pai decide.
- Se um filho quer um tamanho diferente e o pai não tem informação para alinhá-lo, o tamanho pode ser ignorado. **Seja específico no alinhamento.**
- Tipos de caixas: as que tentam ser o maior possível (`Center`, `ListView`), as que se ajustam ao filho, e as que passam restrições adiante.

`LayoutBuilder` permite ler as constraints e decidir o layout:

```dart
LayoutBuilder(
  builder: (context, constraints) => constraints.maxWidth < 600
      ? const OneColumnLayout()
      : const TwoColumnLayout(),
);
```

### Pipeline de render

`RenderView` (raiz) → `compositeFrame()` → `SceneBuilder` → `Window.render()` em `dart:ui` → GPU. A GPU desenha via **Impeller** (padrão) ou Skia.

### Elementos especiais

- `RenderParagraph` — texto.
- `RenderImage` — imagem.
- `RenderTransform` — transformação.
- A maioria dos widgets usa `RenderBox` (tamanho fixo em 2D cartesiano).

## 5. Widgets: declaração vs. estado

- **`StatelessWidget`** — sem estado mutável; sobrescreve `build()`.
- **`StatefulWidget`** — guarda estado mutável num objeto `State` separado. O widget não tem `build()`; quem tem é o `State`. Ao mutar, chame `setState()` para agendar rebuild.

Separar widget e state permite ao pai recriar o widget sem perder o estado persistente: o framework encontra e reusa o `State` existente.

### Ciclo de vida do `State`

```
createState → initState → didChangeDependencies → build
   → didUpdateWidget (quando o widget pai muda)
   → setState → build ...
   → deactivate → dispose
```

- `initState`: inicializa recursos; **não** acesse `context` dependente de ancestrais aqui.
- `didChangeDependencies`: use para ler `InheritedWidget`s e reagir a mudanças.
- `dispose`: cancele streams/controllers/listeners para evitar vazamentos.

## 6. Estado compartilhado

- **Passar pelo construtor** — funciona, mas fica verboso em árvores profundas.
- **`InheritedWidget`** — provê dados a descendentes; `StudentState.of(context)` busca o ancestral mais próximo. `updateShouldNotify()` decide se filhos devem rebuildar.
- O framework usa isso intensamente: `Theme`, `MediaQuery`, `Localizations`.
- Pacotes (`provider`, `riverpod`, `bloc`, `signals`) constroem abstrações sobre `InheritedWidget`/`ChangeNotifier`.

## 7. Platform embedding

O engine é agnóstico e expõe uma **ABI estável**; o **embedder** é o app nativo que hospeda o conteúdo Flutter:

- **iOS/macOS:** `FlutterEngine` + `UIViewController`/`NSViewController`; render via Metal.
- **Android:** `FlutterActivity`/`FlutterView`; render como view ou textura.
- **Windows:** app Win32; render via ANGLE (OpenGL → DirectX 11).
- **Linux:** GTK/embedder nativo.
- Desde **Flutter 3.29**, as threads de UI e plataforma foram unificadas em iOS e Android (Dart roda na thread nativa da plataforma).

## 8. Interoperabilidade

| Mecanismo | Uso | Custo |
|---|---|---|
| **Platform channels** | Chamar código Kotlin/Swift/Java/ObjC | Serialização (Map/codec) |
| **Pigeon** | Gerar código type-safe para channels | Geração de código |
| **FFI (`dart:ffi`)** | Chamar APIs C (Rust/Go/C++) | Sem serialização; mais rápido |
| **JS interop + `package:web`** | Web (substitui FFI) | — |
| **Platform views** | Embutir controles nativos (`AndroidView`, `UiKitView`) | Sincronização/overhead |
| **Add-to-app** | Embutir Flutter em app existente | Inicialização do engine |

## 9. Compilação e modos de build

| Modo | Uso | Características |
|---|---|---|
| **Debug** | Desenvolvimento | Assertions ligadas, service extensions, JIT, hot reload, performance pior |
| **Profile** | Medir performance | Similar a release + tracing/service extensions; **desabilitado em emulador** |
| **Release** | Produção | AOT, sem debug info, tree shaking, menor tamanho; **sem hot reload** |

- `flutter run` → debug; `flutter run --profile` → profile; `flutter run --release` → release.
- **Hot reload** funciona só em debug. Emulador/simulador só roda debug.
- Meça performance sempre em **profile mode num dispositivo real**.

### Web

- Dev: `dartdevc` (incremental, hot restart, hot reload atrás de flag).
- Produção: `dart2js` (JS otimizado) ou `--wasm` (`dart2wasm`).
- Web **não** suporta isolates (use `compute`, que roda na main thread no web).
- Web **não** suporta obfuscação (usa minificação).

## 10. Hot reload vs. hot restart

- **Hot reload (`r`)**: reinjeta código e reconstrói a árvore preservando o estado (quando possível). Ideal para UI e lógica.
- **Hot restart (`R`)**: reinicia o app, zera o estado.
- Limitações do hot reload: mudanças em `main()`, campos globais inicializados, tipos de classe e assinaturas podem exigir restart.

## Resumo prático

1. Escreva `build()` puro e rápido.
2. Respeite constraints; não lute contra o layout.
3. Use `const` e widgets pequenos.
4. Separe estado efêmero de estado de app.
5. Isole trabalho pesado em isolates.
6. Meça em profile/release, nunca em debug.
