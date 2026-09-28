# 04 — Widgets e layout

## 1. Widgets: unidade de composição

Um widget é uma **declaração imutável** de parte da UI. Tudo é widget: layout, pintura, interação, tema, animação e navegação. A hierarquia vai até a raiz (`MaterialApp`/`CupertinoApp`/`WidgetsApp`).

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('Home')),
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Olá, mundo'),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => debugPrint('Clique!'),
                  child: const Text('Botão'),
                ),
              ],
            ),
          ),
        ),
      );
}
```

### `build()` deve ser puro

- Retorna a UI para o estado atual; pode rodar a cada frame.
- Sem efeitos colaterais, sem IO, sem lógica pesada.
- Trabalho caro → assíncrono, guardado no estado e lido no build.
- Prefira `StatelessWidget`/`StatefulWidget` a funções `Widget _buildX()`: widgets têm `const`, são reutilizáveis e têm ciclo de vida.

## 2. `StatelessWidget` vs. `StatefulWidget`

```dart
// Sem estado mutável
class Titulo extends StatelessWidget {
  const Titulo({super.key, required this.texto});
  final String texto;
  @override
  Widget build(BuildContext context) => Text(texto);
}

// Com estado mutável
class Contador extends StatefulWidget {
  const Contador({super.key});
  @override
  State<Contador> createState() => _ContadorState();
}

class _ContadorState extends State<Contador> {
  int _count = 0;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text('$_count'),
          FilledButton(
            onPressed: () => setState(() => _count++),
            child: const Text('+'),
          ),
        ],
      );
}
```

- O `State` é onde vive o estado mutável. O widget é imutável e pode ser recriado sem perder o `State`.
- `setState()` agenda um rebuild do `State` e seus descendentes.
- **Nunca** chame `setState` durante o build; nunca use após `dispose` (cheque `mounted`).

### Ciclo de vida do `State`

| Método | Quando | Uso |
|---|---|---|
| `initState()` | Uma vez, ao criar | Inicializar controllers, futuros, listeners |
| `didChangeDependencies()` | Após `initState` e quando um `InheritedWidget` muda | Ler `Theme`/`MediaQuery`/`Provider` |
| `build()` | A cada rebuild | Descrever UI |
| `didUpdateWidget(old)` | Quando o widget pai muda | Reagir a novas props |
| `deactivate()` | Ao sair da árvore temporariamente | — |
| `dispose()` | Ao destruir | Cancelar streams/controllers/listeners |

```dart
@override
void initState() {
  super.initState();
  _controller = TextEditingController();
  _subscription = _stream.listen((_) { if (mounted) setState(() {}); });
}

@override
void dispose() {
  _subscription.cancel();
  _controller.dispose();
  super.dispose();
}
```

> Vazamentos por não chamar `dispose()` são uma das causas mais comuns de problemas de memória.

## 3. Constraints: a regra fundamental

> **Constraints go down. Sizes go up. Parent sets position.**

1. O pai passa largura/altura mínima e máxima.
2. O filho escolhe um tamanho dentro dos limites.
3. O filho devolve o tamanho.
4. O pai posiciona o filho.
5. O pai informa seu próprio tamanho.

Consequências:

- `width: 100` pode ser ignorado se o pai impõe outras restrições.
- Um widget **não decide sua posição**.
- O tamanho pode ser ignorado se o pai não tiver informação de alinhamento.
- Flutter faz **uma passada** de layout (rápido), mas às vezes precisa de uma **intrinsic pass** (custosa; ver `11`).

Tipos de caixas:

- **Tentar ser o maior possível:** `Center`, `ListView`, `Expanded`.
- **Ajustar-se ao filho:** `Text`, `Icon`, `Padding`.
- **Repassar constraints:** muitos widgets de um filho.

```dart
// Use LayoutBuilder para decidir com base no espaço disponível
LayoutBuilder(
  builder: (context, constraints) => constraints.maxWidth < 600
      ? const OneColumnLayout()
      : const TwoColumnLayout(),
);
```

## 4. Widgets de layout essenciais

| Widget | Função |
|---|---|
| `Container` | Combina padding, margem, cor, borda, tamanho, alinhamento |
| `Padding` | Espaçamento interno |
| `Center` / `Align` | Centraliza/alinhamento |
| `Row` / `Column` | Layout flex horizontal/vertical |
| `Expanded` / `Flexible` | Distribui espaço no eixo principal |
| `SizedBox` | Espaço fixo ou espaçador |
| `Stack` / `Positioned` | Sobreposição |
| `Wrap` | Quebra linha automaticamente |
| `GridView` / `ListView` | Grades e listas |
| `SingleChildScrollView` | Rolagem de conteúdo único |
| `CustomScrollView` + slivers | Rolagem avançada |
| `AspectRatio` / `FractionallySizedBox` | Proporções |
| `LayoutBuilder` | Layout reativo ao espaço |

```dart
Row(
  children: [
    const Icon(Icons.message),
    Expanded(                        // evita overflow
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [Text('Título'), Text('Descrição longa...')],
      ),
    ),
  ],
);
```

> **`Expanded`** = `Flexible` com `flex: 1`. Use para resolver overflow horizontal/vertical em `Row`/`Column`.

### `Container` é composição

`Container` é feito de `LimitedBox`, `ConstrainedBox`, `Align`, `Padding`, `DecoratedBox`, `Transform`. Em vez de subclassar, **componha** — esse é o princípio central do Flutter.

## 5. Listas e grids eficientes

```dart
// Lazy: constrói só o visível
ListView.builder(
  itemCount: itens.length,
  itemBuilder: (context, i) => ListTile(title: Text(itens[i].nome)),
);

// Lista com separadores
ListView.separated(
  itemCount: itens.length,
  separatorBuilder: (_, __) => const Divider(),
  itemBuilder: (context, i) => Text(itens[i].nome),
);

// Grid
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
  ),
  itemCount: itens.length,
  itemBuilder: (context, i) => Card(child: Text(itens[i].nome)),
);
```

- Use `.builder` para listas/grids grandes; evita construir tudo de uma vez.
- `shrinkWrap: true` só quando necessário (custa performance).
- Para listas de tamanho fixo, considere `itemExtent` para acelerar o layout.

## 6. Slivers e `CustomScrollView`

Slivers são a base de rolagem do Flutter. `CustomScrollView` compõe slivers:

```dart
CustomScrollView(
  slivers: [
    const SliverAppBar(title: Text('Título'), floating: true),
    SliverToBoxAdapter(child: Header()),
    SliverList.builder(
      itemCount: itens.length,
      itemBuilder: (_, i) => ListTile(title: Text(itens[i].nome)),
    ),
    const SliverPadding(padding: EdgeInsets.all(8)),
  ],
);
```

| Sliver | Uso |
|---|---|
| `SliverAppBar` | App bar que rola/colapsa |
| `SliverList` / `SliverGrid` | Listas/grades |
| `SliverToBoxAdapter` | Embutir um widget normal |
| `SliverPadding` | Padding |
| `SliverPersistentHeader` | Cabeçalho fixo |
| `SliverFillRemaining` | Preenche o restante |

## 7. Keys

Keys preservam a identidade de widgets entre rebuilds, especialmente em listas reordenáveis.

```dart
ListView(
  children: itens.map((i) => ItemWidget(key: ValueKey(i.id), item: i)).toList(),
);
```

| Key | Uso |
|---|---|
| `ValueKey<T>` | Identidade baseada em valor |
| `ObjectKey` | Identidade baseada em objeto |
| `UniqueKey` | Força recriação do estado |
| `GlobalKey` | Acessa estado/contexto de outro widget (use com parcimônia) |

- Use `ValueKey` em itens de listas dinâmicas.
- `GlobalKey` permite `GlobalKey<FormState>` para validar formulários; evite usar em excesso.

## 8. Material e Cupertino

- **Material** (`package:flutter/material.dart`): design do Android/Google (`Scaffold`, `AppBar`, `ElevatedButton`, `NavigationBar`).
- **Cupertino** (`package:flutter/cupertino.dart`): design iOS (`CupertinoPageScaffold`, `CupertinoButton`).
- Widgets adaptativos escolhem por plataforma (ex.: `Switch.adaptive`, `Slider.adaptive`).
- `MaterialApp`/`CupertinoApp` provêem tema, localização, navegação e overlays.

```dart
MaterialApp(
  theme: ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
    useMaterial3: true,
  ),
  darkTheme: ThemeData.dark(),
  themeMode: ThemeMode.system,
);
```

Acesse o tema com `Theme.of(context)`. Use `ThemeExtension` para tokens customizados.

## 9. Design responsivo e adaptativo

- **Não** faça layout com base em tipo de dispositivo (`phone`/`tablet`) nem em orientação.
- Use `MediaQuery.sizeOf(context)` e `LayoutBuilder` com **breakpoints** (janelas de tamanho).
- Não bloqueie orientação; suporte redimensionamento, dobra e multijanela.
- Preserve estado de rolagem com `PageStorageKey`.
- Evite ocupar toda a largura em telas grandes (limite a largura do conteúdo).

```dart
final width = MediaQuery.sizeOf(context).width;
final cols = width < 600 ? 1 : (width < 900 ? 2 : 3);
```

## 10. Formulários e input

```dart
final _formKey = GlobalKey<FormState>();
final _controller = TextEditingController();

Form(
  key: _formKey,
  child: Column(
    children: [
      TextFormField(
        controller: _controller,
        decoration: const InputDecoration(labelText: 'E-mail'),
        validator: (v) => (v == null || !v.contains('@')) ? 'Inválido' : null,
      ),
      FilledButton(
        onPressed: () {
          if (_formKey.currentState!.validate()) { /* enviar */ }
        },
        child: const Text('Enviar'),
      ),
    ],
  ),
);
```

- Sempre descarte `TextEditingController`, `FocusNode`, `AnimationController` em `dispose`.
- Use `FocusNode` para navegação por teclado e `FocusTraversalGroup`.

## 11. Animações

- **Implícitas** (`AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`): mudam com o estado, sem controller.
- **Explícitas** (`AnimationController` + `Tween` + `AnimatedBuilder`): controle fino.
- Passe subtrees estáticas como `child` do `AnimatedBuilder` para não reconstruí-las a cada tick.
- Respeite `MediaQuery.disableAnimations` (acessibilidade).

## 12. Boas práticas de UI

- Widgets pequenos e focados; quebre `build()` grandes.
- `const` em tudo que for constante.
- Extraia widgets reutilizáveis para `StatelessWidget`, não funções.
- Sem lógica de negócio no widget.
- Localize `setState` ao menor subtree possível.
- Use `ListView.builder` para listas longas.
- Evite `Opacity`/clipping em animações; use `AnimatedOpacity`/`FadeInImage`.
- Teste em telas pequenas, grandes, claro/escuro e com escala de fonte alta.
