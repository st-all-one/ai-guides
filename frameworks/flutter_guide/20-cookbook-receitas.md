# 20 — Cookbook: receitas essenciais

Complementa `04` (widgets) e `08` (dados) com as receitas oficiais agrupadas por tema. Cada seção indica o widget/API central e um exemplo mínimo.

## 1. Animações

### Implícitas (`AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`)

Animam automaticamente quando uma propriedade muda. Prefira-as a `AnimationController` sempre que possível.

```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  curve: Curves.easeInOut,
  width: _aberto ? 200 : 100,
  height: _aberto ? 200 : 100,
  color: _aberto ? Colors.blue : Colors.red,
  child: const SizedBox.shrink(),
);
```

| Widget | Anima |
|---|---|
| `AnimatedContainer` | largura, altura, cor, padding, borda, transform |
| `AnimatedOpacity` | opacidade (mais barato que `Opacity` animado) |
| `AnimatedSwitcher` | troca de filhos (fade/scale) |
| `AnimatedAlign`, `AnimatedPadding`, `AnimatedPositioned` | posição/alinhamento |
| `AnimatedDefaultTextStyle`, `AnimatedPhysicalModel` | texto/elevação |

### Controlador explícito (`AnimationController` + `Tween` + `AnimatedBuilder`)

```dart
class _Pulsa extends StatefulWidget {
  const _Pulsa();
  @override
  State<_Pulsa> createState() => _PulsaState();
}

class _PulsaState extends State<_Pulsa> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 1))
        ..repeat(reverse: true);
  late final Animation<double> _a =
      Tween<double>(begin: 0.5, end: 1).animate(
    CurvedAnimation(parent: _c, curve: Curves.easeInOut),
  );

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: _a,
        child: const FlutterLogo(size: 128),
      );
}
```

Use `AnimatedBuilder(animation: _a, child: _estatico, builder: ...)` para evitar reconstruir a parte estática.

### Transição de rota customizada (`PageRouteBuilder`)

```dart
Navigator.of(context).push(PageRouteBuilder(
  pageBuilder: (_, __, ___) => const TelaDestino(),
  transitionsBuilder: (_, animation, __, child) {
    final tween = Tween(begin: const Offset(0, 1), end: Offset.zero)
        .chain(CurveTween(curve: Curves.easeOut));
    return SlideTransition(position: animation.drive(tween), child: child);
  },
));
```

### Física (`SpringSimulation`, `ScrollSimulation`)

Use `AnimationController.animateWith(SpringSimulation(...))` para efeitos realistas (mola, gravidade). Capture a velocidade do gesto com `VelocityTracker`.

### Hero (transição entre telas)

```dart
// Tela A
Hero(tag: 'foto', child: Image.network(url));
// Tela B
Hero(tag: 'foto', child: Image.network(url));
```

## 2. Gestos e interação

| Receita | Widget/API |
|---|---|
| Toque simples / longo | `GestureDetector`, `InkWell`, `InkResponse` |
| Ripple Material | `InkWell` (sobre `Material`) |
| Swipe para dispensar | `Dismissible` |
| Arrastar e soltar | `Draggable`/`DragTarget`, `LongPressDraggable` |
| Detecção de gestos | `GestureDetector.onPanUpdate`, `onScaleUpdate` |

```dart
Dismissible(
  key: ValueKey(item.id),
  background: Container(color: Colors.red, alignment: Alignment.centerRight,
      padding: const EdgeInsets.only(right: 20), child: const Icon(Icons.delete)),
  onDismissed: (_) => setState(() => itens.remove(item)),
  child: ListTile(title: Text(item.nome)),
);
```

```dart
Draggable<String>(
  data: 'item',
  feedback: const Material(child: Text('Arrastando')),
  childWhenDragging: const Opacity(opacity: 0.3, child: Text('item')),
  child: const Text('item'),
);
```

## 3. Effects (receitas visuais)

| Efeito | Técnica |
|---|---|
| **Shimmer loading** | Gradiente animado com `ShaderMask` + `LinearGradient` sobre formas placeholder |
| **Parallax** | Mover a imagem dentro do card com `Transform.translate` conforme o scroll |
| **Staggered menu** | `Interval` em `CurvedAnimation` para escalonar animações |
| **Expandable FAB** | `AnimationController` + `ScaleTransition`/`FadeTransition` em botões filhos |
| **Nested navigation** | `Navigator` aninhado dentro de uma tela (fluxo local) |
| **Download button** | `AnimationController` + `CustomPainter` para progresso/estado |

Shimmer mínimo:

```dart
ShaderMask(
  blendMode: BlendMode.srcATop,
  shaderCallback: (bounds) => const LinearGradient(
    colors: [Colors.grey, Colors.white, Colors.grey],
  ).createShader(bounds),
  child: const SizedBox(width: 200, height: 16),
);
```

Nested `Navigator`:

```dart
Navigator(
  key: _nestedKey,
  onGenerateRoute: (settings) => MaterialPageRoute(builder: (_) => const Etapa1()),
);
```

## 4. Listas

| Receita | Widget |
|---|---|
| Lista básica | `ListView` |
| Lista longa (lazy) | `ListView.builder` |
| Grid | `GridView.count`/`.builder` |
| Horizontal | `ListView(scrollDirection: Axis.horizontal)` |
| Mista (header + grid + lista) | `CustomScrollView` + slivers |
| Espaçamento entre itens | `ListView.separated` |
| AppBar flutuante | `SliverAppBar` + `FlexibleSpaceBar` |

```dart
CustomScrollView(
  slivers: [
    const SliverAppBar(floating: true, title: Text('Título')),
    SliverGrid.count(crossAxisCount: 2, children: [...cards]),
    SliverList.builder(itemCount: itens.length, itemBuilder: (_, i) => ...),
  ],
);
```

## 5. Formulários

```dart
final _formKey = GlobalKey<FormState>();
final _email = TextEditingController();

@override
void dispose() { _email.dispose(); super.dispose(); }

Form(
  key: _formKey,
  child: Column(children: [
    TextFormField(
      controller: _email,
      keyboardType: TextInputType.emailAddress,
      autofillHints: const [AutofillHints.email],
      decoration: const InputDecoration(labelText: 'E-mail'),
      validator: (v) => (v == null || !v.contains('@')) ? 'Inválido' : null,
      onChanged: (v) => setState(() {}),
    ),
    TextButton(
      onPressed: () {
        if (_formKey.currentState!.validate()) {
          // enviar
        }
      },
      child: const Text('Enviar'),
    ),
  ]),
);
```

- `TextEditingController` e `FocusNode` **precisam** de `dispose()`.
- `FocusTraversalGroup`/`FocusScope` organizam a navegação por teclado/Tab.
- `TextInputAction.next` + `onFieldSubmitted` movem o foco entre campos.
- Autofill com `autofillHints`.

## 6. Imagens

```dart
// Rede com placeholder e erro
FadeInImage.assetNetwork(
  placeholder: 'assets/placeholder.png',
  image: url,
  fit: BoxFit.cover,
);

// Decodificação no tamanho exibido (evita pico de memória)
Image.network(url, cacheWidth: 300);

// Pré-carregar antes de animar
await precacheImage(NetworkImage(url), context);
```

- `CORS`: imagens de rede no **web** exigem cabeçalhos CORS no servidor; use um proxy ou `Image.network` com servidor compatível.
- `errorBuilder`/`frameBuilder` controlam estados.
- Use `RepaintBoundary` em imagens animadas grandes.

## 7. Design e navegação (receitas)

| Receita | Widget |
|---|---|
| Drawer lateral | `Scaffold.drawer` + `Drawer` |
| Abas | `DefaultTabController` + `TabBar`/`TabBarView` |
| SnackBar | `ScaffoldMessenger.of(context).showSnackBar(...)` |
| Bottom sheet | `showModalBottomSheet` / `CupertinoActionSheet` |
| Tema claro/escuro | `ThemeData` + `ThemeMode` + `ColorScheme.fromSeed` |
| Fontes | `google_fonts` ou `pubspec` `fonts:` |
| Orientação | `OrientationBuilder` / `MediaQuery.orientationOf` |
| Navegação básica | `Navigator.push`/`pop` |
| Rotas nomeadas | `MaterialApp.routes` + `pushNamed` |
| Passar/retornar dados | `MaterialPageRoute` + `await push` / `pop(resultado)` |
| App Links / Universal Links | ver `07` e `21` |

```dart
ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo));
```

## 8. Boas práticas de receitas

- Sempre `dispose()` controllers, focus nodes, animations e listeners.
- Prefira animações implícitas; use controlador só quando necessário.
- Listas longas sempre com builder/`itemExtent`.
- Não recrie `Future`/controller no `build`.
- Teste as receitas com `testWidgets` + `pump`/`pumpAndSettle` (ver `09`).
