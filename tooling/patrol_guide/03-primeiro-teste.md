# 03 — Primeiro teste

## Anatomia de um teste

```dart
import 'package:patrol/patrol.dart';

void main() {
  patrolTest(
    'descrição clara e específica do objetivo',
    ($) async {
      // 1. inicializar/pumpar o app
      await $.pumpWidgetAndSettle(const MyApp());

      // 2. agir como usuário (ações já esperam e fazem settle)
      await $(#emailTextField).enterText('test@email.com');
      await $(#passwordTextField).at(1).enterText('password');
      await $(#signInButton).tap();

      // 3. assertiva final
      await $(#homeTitle).waitUntilVisible();
    },
  );
}
```

- `patrolTest(descrição, callback)` — teste com **automação de plataforma** habilitada; o callback recebe `PatrolIntegrationTester $`.
- `patrolWidgetTest(descrição, callback)` — teste de widget **sem** automação nativa; recebe `PatrolTester $`.
- `$` é o tester: expõe finders (`$`), `$.platform`, `$.tester`, `$.log`, etc.
- `$` no Dart é apenas um identificador válido — o Patrol o usa por brevidade.

## Inicializando o app dentro do teste

Copie o `main()` do app e **remova**:

1. **NÃO** chame `WidgetsFlutterBinding.ensureInitialized()`.
2. **NÃO** use `runApp()`. Use `$.pumpWidget()` ou `$.pumpWidgetAndSettle()`, passando o mesmo widget que iria ao `runApp()`.
3. **NÃO** modifique `FlutterError.onError`. Ferramentas de monitoramento (Crashlytics) fazem isso e o engine de teste deixa de ver exceções — o teste nunca falha como deveria.

Extraia a inicialização comum (DI, serviços, tema) para uma função e a chame antes do `pumpWidgetAndSettle`:

```dart
// patrol_test/common.dart
Future<void> createApp(PatrolIntegrationTester $) async {
  await initDependencies();
  await $.pumpWidgetAndSettle(const MyApp());
}
```

```dart
patrolTest('real app test', ($) async {
  await createApp($);      // setup compartilhado
  // ... passos ...
});
```

> Alternativa: mova a inicialização para uma função parametrizada que decide o que habilitar no app vs. no teste.

## Fluxo de desenvolvimento com hot restart

Para editar o teste sem recompilar o app a cada linha, use `patrol develop`:

```console
patrol develop --target patrol_test/app_test.dart
```

- A build inicial é lenta; depois, digite **R** para hot restart.
- `--build-name` e `--build-number` definem versão/número.
- `--open-devtools` abre o DevTools automaticamente.

### Caveats do hot restart (importante)

O hot restart reinicia **apenas a parte Dart** (`main()` roda de novo). Portanto:

- a parte nativa **não** reinicia;
- os dados do app **não** são limpos;
- o app **não** é desinstalado;
- **permissões concedidas permanecem concedidas** → trate os dois casos (`isPermissionDialogVisible`) no teste;
- arquivos em storage interno (SharedPreferences, fotos, documentos) **persistem** → limpe você mesmo;
- código nativo que só roda no primeiro launch **não** re-executa;
- em **iOS físico** o hot restart é considerado quebrado ([flutter#122698](https://github.com/flutter/flutter/issues/122698)) — use `patrol test`.

### Tratando permissões no modo develop

```dart
await $(#requestCamera).tap();
if (await $.platform.mobile.isPermissionDialogVisible()) {
  await $.platform.mobile.grantPermissionWhenInUse();
}
```

> Ramificação é exceção; use apenas quando 100% seguro de que não introduz flakiness (este é um caso legítimo).

## Fluxo do tutorial oficial (resumo)

O tutorial "Write your first test" cobre um app de login + notificação:

1. `patrolTest` com `initApp(); await $.pumpWidgetAndSettle(const MainApp());`
2. Encontrar campos (por tipo, depois por índice, depois por **key**).
3. Centralizar as keys em `integration_test_keys.dart` (ver `08-testes-e-organizacao.md`).
4. Conceder permissão: `$.platform.mobile.grantPermissionWhenInUse()`.
5. Disparar notificação, `pressHome()`, `openNotifications()`, `tapOnNotificationBySelector(Selector(textContains: '...'), timeout: ...)`.
6. Verificar a snackbar com `waitUntilVisible()`.

## Flags úteis

```console
patrol test -t patrol_test/app_test.dart --flavor development
patrol test -t patrol_test/app_test.dart --dart-define 'USERNAME=x' --dart-define 'PASSWORD=y'
patrol test --tags smoke
```

## Fontes

- `docs/documentation/write-your-first-test.mdx`, `docs/documentation/index.mdx`, `docs/cli-commands/index.mdx` (develop).
