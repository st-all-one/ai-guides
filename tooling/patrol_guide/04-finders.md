# 04 — Finders

> O sistema de finders do Patrol (`patrol_finders`) é uma camada fina e expressiva sobre o `flutter_test`. Ele torna o código curto e resolve flakiness com espera automática.

## Formas de encontrar um widget

| Intenção | `flutter_test` | Patrol |
|---|---|---|
| Por tipo | `find.byType(Text)` | `$(Text)` |
| Por texto | `find.text('Subscribe')` | `$('Subscribe')` |
| Por key | `find.byKey(Key('loginButton'))` | `$(Key('loginButton'))` / `$(#loginButton)` |
| Por semantics | `find.bySemanticsLabel('Edit profile')` | `$(find.bySemanticsLabel('Edit profile'))` |

`#loginButton` é um [`Symbol`](https://api.dart.dev/dart-core/Symbol-class.html) — a key deve ser um identificador válido (sem espaços). Para keys com qualquer string, use `Key('...')`.

### Chaining (descendentes / ancestrais)

```dart
// Descendente
await $(ListView).$('Subscribe').tap();
await $(ListView).$(ListTile).$('Subscribe').tap();

// containing (ancestral/descendente composto)
await $(ListTile).containing('Activated').$(#learnMore).tap();
$(Scrollable).containing(Text);
$(Scrollable).containing($(Button).containing(Text));
$(Scrollable).containing(Button).containing(Text);
```

### `which()` — por propriedades

Quando a relação descendente/ancestral não basta:

```dart
await $(#cityTextField)
    .which<TextField>((w) => w.controller.text.isNotEmpty)
    .enterText('Warsaw, Poland');

await $(Icons.error)
    .which<Icon>((i) => i.color == Colors.red)
    .waitUntilVisible();

await $('Delete account')
    .which<ElevatedButton>((b) => !b.enabled)
    .which<ElevatedButton>((b) => b.style?.backgroundColor?.resolve({}) == Colors.red)
    .waitUntilVisible();
```

### Índice e primeiro

```dart
await $('Subscribe').at(2).tap();   // terceiro (0-based)
```

`tap()` por padrão age no **primeiro** widget visível e falha se houver mais de um? Não — ele espera o primeiro ficar visível e toca nele, evitando o erro clássico de `find.text(...)` múltiplo.

## Existência vs visibilidade

Finders padrão (`findsOneWidget`, `findsNothing`) verificam a **árvore de widgets**, não se está **visível para o usuário**.

| API | O que verifica |
|---|---|
| `expect($('Log in'), findsOneWidget)` | Presença na árvore |
| `$('Log in').exists` | `true` se acha ≥1 na árvore |
| `$('Log in').visible` | `true` se acha ≥1 **visível** |
| `await $('Log in').waitUntilVisible()` | Espera até ≥1 ficar visível (com timeout) |

Prefira `waitUntilVisible()` para assertivas de fim de fluxo.

## Ação com espera automática (o diferencial)

`tap()`, `enterText()`, `scrollTo()`:

1. Procuram o primeiro widget **visível**; se não achar, tentam de novo até o timeout.
2. Executam a ação.
3. Fazem `pumpAndSettle` por padrão.

Compare:

```dart
// Sem Patrol: retry manual + risco de loop infinito + ignora visibilidade
while (find.byKey(const Key('addComment')).first.evaluate().isEmpty) {
  await tester.pump(const Duration(milliseconds: 100));
}
await tester.tap(find.byKey(const Key('addComment')).first);

// Com Patrol:
await $(#addComment).tap();
```

### Configurar timeouts

Globalmente:

```dart
patrolWidgetTest(
  'logs in successfully',
  config: const PatrolTesterConfig(findTimeout: Duration(seconds: 10)),
  ($) async { /* ... */ },
);
```

Ad-hoc:

```dart
await $(#addComment).tap(findTimeout: Duration(seconds: 30));
```

## `settlePolicy` — controlar o "pump"

`pumpAndSettle()` renderiza frames até a UI estabilizar (equivale a um humano esperando a animação/loader terminar). Ele é chamado automaticamente em toda ação; a política pode ser trocada:

```dart
await $('Delete account').tap(settlePolicy: SettlePolicy.settle); // padrão
await $('Confirm').tap(settlePolicy: SettlePolicy.pump);
```

| `SettlePolicy` | Método chamado | Comportamento |
|---|---|---|
| `settle` | `pumpAndSettle()` | Lança se ainda houver frames após o timeout. |
| `noSettle` | `pump()` | Pump único. |
| `trySettle` | `pumpAndTrySettle()` | Como `settle`, mas **não lança** se sobrar frame (tenta ~10s). |

`trySettle` é o recomendado para apps com **animações infinitas** (ex.: splash/homescreen animado) — é o novo default nas versões recentes de `patrol_finders`.

## `scrollTo()`

Rola até o widget ficar visível:

```dart
await $('Delete account').scrollTo().tap();
```

Como funciona:

1. espera ≥1 `Scrollable` (ou o `view` informado) ficar visível;
2. rola na direção do scroll até o alvo aparecer;
3. falha por timeout se não aparecer.

**Atenção:** por padrão rola o **primeiro** `Scrollable`. Se houver mais de um na tela, especifique:

```dart
await $('index: 100').scrollTo(view: $(#listView2).$(Scrollable)).tap();
```

> `ListView` **não** estende `Scrollable` — ele constrói um. Por isso é preciso `$(#listView2).$(Scrollable)` e não apenas `$(#listView2)` ([flutter#88762](https://github.com/flutter/flutter/issues/88762)).

## Fallback para `flutter_test`

Tudo do `flutter_test` continua disponível:

```dart
patrolWidgetTest('adds comment', (PatrolTester $) async {
  final WidgetTester tester = $.tester;
  await tester.enterText(find.byKey(const Key('commentTextField')), 'Very nice!');
});
```

## Usar finders em testes de widget (sem o pacote `patrol`)

Adicione `patrol_finders` como dev dependency:

```dart
import 'package:patrol_finders/patrol_finders.dart';

void main() {
  testWidgets('counter incrementa', (WidgetTester tester) async {
    final $ = PatrolTester(tester: tester, config: const PatrolTesterConfig());
    await $.pumpWidget(const MyApp());
    expect($('0'), findsOneWidget);
    await $(Icons.remove).tap();
  });

  // ou o wrapper:
  patrolWidgetTest('counter incrementa', ($) async {
    await $.pumpWidget(const MyApp());
  });
}
```

## Fontes

- `docs/documentation/finders/{overview,usage,advanced,finders-setup}.mdx`.
