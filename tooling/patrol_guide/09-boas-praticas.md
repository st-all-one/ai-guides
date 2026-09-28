# 09 — Boas práticas

> Consolidação do guia "Effective Patrol", das skills oficiais e dos "Tips and tricks". Segue o estilo RFC 2119 (PREFER/SHOULD/CONSIDER/NÃO).

## Finders

- **PREFIRA keys.** As três razões:
  - **Strings** quebram quando a copy muda e são inviáveis com i18n.
  - **Tipos** machucam a legibilidade (você quer "o botão de login", não "o terceiro `ElevatedButton`"), são detalhe de implementação e quebram com mudanças de generics.
  - **Keys** sobrevivem a refatorações de UI.
- **CONSIDERE um arquivo único de keys** (`lib/keys.dart`) importado por app e testes → sem duplicação, sem typos.
  > "Tenha a mentalidade do testador: seus finders são os olhos do tester."

```dart
// RUIM
await $(LoginForm).$(Button).at(1).tap();
// BOM
await $(#loginButton).tap();
```

## Estrutura do teste

- **PREFIRA um caminho (main path).** Teste uma feature e bem. Minimize `if`s — lógica condicional é fonte de flakiness e dificulta o debug. Ramificações só em casos comprovadamente seguros (ex.: checar diálogo de permissão).
- **DEscreva bem o teste.** O primeiro argumento de `patrolTest` é o que você verá daqui a 3 meses. `'signs up for the newsletter and receives a reward'` ≫ `'test'`.
- **Um arquivo = um teste** (arquitetura LeanCode).
- **Ações vs assertivas**: não escreva assertivas após cada ação; concentre no fim, preferindo `waitUntilVisible`.
- **Não escreva waits redundantes** após `tap`/`enterText`/`scrollTo`.
- **Não use `patrolSetUp`/`patrolTearDown` por conta própria** (skill LeanCode) — prefira o wrapper/setup explícito.
- **Não use `try/catch`** a menos que estritamente necessário.

## Tratamento de diálogos nativos

- Trate o diálogo **imediatamente** após a ação que o dispara.
- Prefira `$.platform.mobile.grantPermissionWhenInUse()` a um `tap` cru.
- Verifique visibilidade quando o diálogo pode não aparecer (hot restart / permissão já concedida):

```dart
if (await $.platform.mobile.isPermissionDialogVisible()) {
  await $.platform.mobile.grantPermissionWhenInUse();
}
```

- No iOS, o tratamento automático de permissões só funciona com o **idioma do device em inglês**.

## Credenciais e configuração

- **NUNCA** hardcode dados como e-mail/senha.

```dart
// RUIM
await $(#passwordTextField).enterText('ny4ncat');
// BOM
await $(#passwordTextField).enterText(const String.fromEnvironment('PASSWORD'));
```

- Use `const` por causa de [flutter#55870](https://github.com/flutter/flutter/issues/55870).
- Passe via CLI: `--dart-define 'PASSWORD=ny4ncat'`.
- Ou crie `.patrol.env` na raiz (comentários com `#`, inline ou linha própria):

```
# credenciais locais
EMAIL=user@example.com
PASSWORD=ny4ncat # senha da API
```

## Descoberta de seletores nativos

- Faça **dump da hierarquia nativa**:
  - Android: `adb shell uiautomator dump && adb pull /sdcard/window_dump.xml .`
  - iOS: `idb ui describe-all`
- Ou use a **Patrol DevTools Extension** em uma sessão `patrol develop`.
- Prefira `resourceName` (Android) / `identifier` (iOS) para robustez.

## Permissões sensíveis via Settings

Algumas permissões (background location, DND) exigem ir ao app Configurações:

```dart
await $.platform.mobile.tap(Selector(text: 'Camera'));   // lista
await $.platform.mobile.tap(Selector(text: 'ALLOW'));    // confirmação
await $.platform.mobile.pressBack();                     // volta ao AUT
```

A UI das Configurações varia por SO/versão/OEM — trate os edge cases.

## Permissão antes de pumpar o app

Para pedir permissão antes do widget principal, não use `await` cedo:

```dart
final permissionRequestFuture = Geolocator.requestPermission();
await $.platform.mobile.grantPermissionWhenInUse();
final result = await permissionRequestFuture;
expect(result, equals(LocationPermission.whileInUse));
await $.pumpWidgetAndSettle(MyApp(position: await Geolocator.getCurrentPosition()));
```

## SDKs e convenções

- Use **somente** a API do Patrol (`$`, `$.platform`) no arquivo de teste; encapsule `$.platform` em modules/system.
- Sempre consulte o método correto antes de inventar (a doc oficial e o codebase são a fonte).
- `import 'package:patrol/patrol.dart';` em qualquer arquivo que use a API.
- Nunca rode `flutter test` para testes de UI do Patrol; use `patrol test` / MCP.

## Flakiness

- Não introduza sleeps (`Future.delayed`) como sincronização; prefira `waitUntilVisible`/`scrollTo`.
- `trySettle` (via `settlePolicy`) é mais resiliente com animações infinitas que `settle`.
- Isole testes (dados/estado) para não herdar sujeira: `clearPackageData`, `--full-isolation`, prepare/limpe via API.
- Cuidado com `pullToRefresh`: é nativo e não faz settle — chame `$.pumpAndSettle()` depois.

## Revisão rápida (checklist)

- [ ] Widgets encontrados por key compartilhada.
- [ ] Um caminho, sem `if` desnecessário.
- [ ] Descrição clara.
- [ ] Assertivas no fim (`waitUntilVisible`).
- [ ] Sem waits/sleeps redundantes.
- [ ] Diálogos nativos tratados na hora certa.
- [ ] Sem credenciais hardcoded.
- [ ] Estado preparado/limpo entre testes.
- [ ] `test_bundle.dart` e `.patrol.env` no `.gitignore`.

## Fontes

- `docs/documentation/other/effective-patrol.mdx`, `docs/documentation/other/tips-and-tricks.mdx`, `skills/patrol-write-test/SKILL.md`, `skills/patrol-test-architecture/SKILL.md`.
