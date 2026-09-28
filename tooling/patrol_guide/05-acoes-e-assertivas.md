# 05 — Ações e assertivas

## Ações

Todas as ações do Patrol esperam o alvo ficar visível, agem e fazem settle automaticamente.

```dart
await $(#field).enterText('texto');
await $(#button).tap();
await $('Delete account').scrollTo().tap();
await $(#checkbox).tap();
```

- Não é necessário chamar `pump`/`pumpAndSettle` manualmente entre ações.
- Se o alvo aparecer depois (após HTTP), `tap()` espera até o `findTimeout`.
- `scrollTo()` rola até ficar visível e só então retorna.

### Não use waits redundantes

Regra prática: **só** use `waitUntilVisible`/`waitUntilExists` no **fim** de um fluxo (assertiva) ou quando o fluxo realmente depende daquele estado. Não coloque waits antes/depois de `tap`, `scrollTo` ou `enterText` — o Patrol já faz.

```dart
// NÃO
await $(#plus).waitUntilVisible();
await $(#plus).tap();
await $.pumpAndSettle();

// SIM
await $(#plus).tap();
```

## Assertivas

A API de matchers do `flutter_test` continua valendo dentro do Patrol:

```dart
expect($('Log in'), findsOneWidget);
expect($("Can't touch this"), findsNothing);
expect($(Card), findsNWidgets(3));
expect($('Log in').exists, equals(true));
expect($('Log in').visible, equals(true));
```

### Preferir `waitUntilVisible` no fim

```dart
await $(#successSnackbar).waitUntilVisible();
await $(#errorBanner).waitUntilExists();
```

Use `expect(...)` quando `waitUntilVisible` não bastar (ex.: contagem exata, comparação de texto).

### Ler texto/valor

```dart
expect($(#counterText).text, '1');
```

## Composição de finder + ação

```dart
// Parar no widget certo dentro de uma lista
await $(ListView).$(ListTile).containing('Pedido #42').$('Detalhes').tap();
```

## Ações nativas intercaladas

Ações de widget e nativas podem se alternar livremente no mesmo teste:

```dart
await $(FloatingActionButton).tap();
await $.platform.mobile.pressHome();
await $.platform.mobile.openApp();
expect($(#counterText).text, '1');
```

## Centro de coordenadas

Para gestos arbitrários, use as APIs de plataforma (ver `06-automacao-de-plataforma.md`), ex.:

```dart
await $.platform.android.swipe(...);
await $.platform.android.tapAt(...);
```

## Tratando exceções intencionalmente

Se um teste precisa ignorar uma exceção, use `WidgetTester.takeException()` (via `$.tester`):

```dart
$.tester.takeException();
```

Para múltiplas:

```dart
var count = 0;
dynamic e = $.tester.takeException();
while (e != null) { count++; e = $.tester.takeException(); }
if (count != 0) $.log('Warning: $count exceptions ignored');
```

> Evite `try/catch` no teste, salvo quando realmente necessário.

## Assertivas de estrutura e acessibilidade

O runner do Patrol usa `flutter_test`, então você pode compor com recursos como `find.bySemanticsLabel`, golden tests, etc. Para golden/widget puro, prefira `patrolWidgetTest` (sem automação nativa) e o pacote `patrol_finders`.

## Modo de configuração

`PatrolTesterConfig` controla timeout, logs, settle default:

```dart
patrolTest(
  'meu teste',
  config: const PatrolTesterConfig(printLogs: true),
  ($) async { /* ... */ },
);
```

## Fontes

- `docs/documentation/finders/usage`, `docs/documentation/finders/advanced`, `docs/documentation/logs`, `skills/patrol-write-test`.
