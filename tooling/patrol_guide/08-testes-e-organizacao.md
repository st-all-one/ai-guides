# 08 — Testes e organização

> Uma suíte de Patrol escala quando as **keys são compartilhadas**, os testes têm **um caminho** e a lógica é **modular**.

## Estrutura de diretórios

- Padrão: `patrol_test/` (desde o Patrol 4.0; antes `integration_test/`).
- Personalize com `patrol.test_directory` no `pubspec.yaml`.
- Mantenha testes **não-Patrol** de integration em `integration_test/`.
- Um arquivo = **um teste** (recomendado pela arquitetura LeanCode).

## Tags

```dart
patrolTest(
  'exemplo com tag',
  tags: ['smoke', 'regression'],
  ($) async { /* ... */ },
);
```

```console
patrol test --tags smoke
patrol test --tags='smoke||regression'
patrol test --tags='(login && smoke)'
patrol test --tags='(payment || navigation) && !regression'
patrol test --exclude-tags slow
```

Sintaxe igual à do pacote `test`: `||` (OR), `&&` (AND), `!` (NOT). Tags precisam ser identificadores Dart válidos (podem conter hífens).

## Keys — a base de tudo

**Regra:** encontre widgets apenas por `Key`; compartilhe as keys entre app e teste num arquivo por feature.

Por quê não strings/tipos: strings quebram com i18n e mudanças de copy; tipos são detalhe de implementação. Considere o exemplo:

```dart
await $(LoginForm).$(Button).at(1).tap();  // o que é isso?
await $(#loginButton).tap();               // claro
```

### Estrutura recomendada de keys

Arquivo agregador:

```dart
// lib/keys.dart
import 'features/home/keys.dart';
import 'features/auth/keys.dart';
import 'common/widgets/keys.dart';

final keys = Keys();

class Keys {
  final home = HomeKeys();
  final auth = AuthKeys();
  final widgets = WidgetKeys();
}
```

Keys de feature (com prefixo para evitar colisão):

```dart
// lib/features/home/keys.dart
import 'package:flutter/widgets.dart';

class _HomeKey extends ValueKey<String> {
  const _HomeKey(String value) : super('home_$value');
}

class HomeKeys {
  final menuIconButton = const _HomeKey('menuIconButton');
  _HomeKey navbarItem(String label) => _HomeKey('navbarItem_$label');
}
```

Uso no app e no teste:

```dart
TextField(key: keys.auth.emailTextField)
await $(keys.auth.emailTextField).enterText('user@example.com');
```

### Keys parametrizadas

Use quando o widget é gerado por lista/DTO/enum:

```dart
enum SizeDTO { small, medium, large }
// app
_Button(key: keys.pickSize.sizeButton(size), value: size)
// keys.dart
_PickSizeKey sizeButton(SizeDTO size) => _PickSizeKey('sizeButton_${size.name}');
```

**Regras de keys** (skill oficial):

- Atribua key **somente** a widgets usados em teste.
- Só **adicione** o parâmetro `key` a widgets existentes — nunca mude assinaturas/refatore a estrutura.
- Nunca hardcode key no app; sempre venha do arquivo de keys.
- Uma key por valor; valores únicos.
- `keys.dart` por feature (pode ter várias classes); agregue no `lib/keys.dart`.
- Para widgets comuns → `WidgetKeys` no diretório do widget; para pacotes externos, importe com alias.
- Ordem alfabética.

## Arquitetura recomendada (LeanCode)

### `testApp` wrapper

Use um wrapper de teste para toda a suíte (setup compartilhado, `modules`, `system`, `apiClients`):

```dart
testApp('Baixar capítulo e tocar offline', ($, modules, system, apiClients) async {
  await modules.auth.getAuthToken();
  await apiClients.backend.addFavourites();
  await openApp($);
  await modules.home.goToTestament();
  await system.enableAirplaneMode();          // $.platform encapsulado
  await modules.player.downloadChapter(index: 9);
  await modules.player.waitUntilDownloaded();
  await modules.player.playCurrentTrack();
  await system.checkIfNativePlayerIsVisible();
});
```

### Modules

Cada **module** representa uma feature na perspectiva do usuário (Auth, Home, Downloads, Player). Métodos do module chamam a API do Patrol e são reutilizáveis.

```dart
// patrol_test/modules/home.dart
final class Home extends Module {
  Home(super.$);

  Future<void> navigateToSettings() async {
    await $(keys.home.settingsButton).scrollTo().tap();
  }
}

// patrol_test/modules/modules.dart
final class Modules {
  Modules(this._$);
  final PatrolIntegrationTester _$;
  late final home = Home(_$);
  late final auth = Auth(_$);
}
```

### System

Classe para interações **nativas** que não pertencem a um module (ex.: ligar modo avião para testar offline). Estende/mistura `PlatformAutomator`:

```dart
final class System extends PlatformAutomator {
  System({required super.config});
  Future<void> checkIfNativePlayerIsVisible() async { /* ... */ }
}
```

### ApiClients

Agrega clientes de API usados para preparar estado (backend de teste, servidor de e-mail, terceiros):

```dart
final class ApiClients {
  final backend = BackendClient();
  final mailpitClient = MailpitClient();
}
```

### Ordem de trabalho ao escrever um teste (skill oficial)

1. Ler os arquivos-chave (agregador de modules, wrapper de teste, `keys.dart` principal, features do cenário).
2. Inspecionar modules existentes e reutilizar.
3. Ver se algum método existente pode ser ajustado.
4. Atribuir keys faltantes.
5. Escrever o teste reutilizando modules; passos novos direto no arquivo.
6. Rodar o teste **frequentemente** durante o desenvolvimento — não só no fim.
7. Depois de verde, **reorganizar** o código em modules (o arquivo de teste deve chamar apenas métodos de module, não APIs do Patrol diretamente).
8. Rodar de novo para confirmar.

## Testes dependentes de plataforma

Se o teste existe/é pulado condicionalmente por plataforma, use `patrolTargetPlatform` (não `defaultTargetPlatform` nem `dart:io` `Platform`), pois a descoberta build-time roda no host:

```dart
patrolTest(
  'compartilha a fatura',
  ($) async { /* ... */ },
  skip: patrolTargetPlatform == PatrolTargetPlatform.iOS,
);
```

## VS Code extension

- Instale a extensão "Patrol" (Marketplace/Open VSX); requer a extensão Dart.
- Configura `test_directory` se não for `patrol_test`.
- Se você tem um wrapper de `patrolTest`, anote-o com `@isTest` (pacote `meta`):

```dart
import 'package:meta/meta.dart';

@isTest
void patrolWrapper(String name, Future<void> Function(PatrolIntegrationTester) test) {
  patrolTest(name, test);
}
```

- Recursos: Test Explorer (rodar/rodar tudo/debugar), logs ao vivo, debugging no modo `develop`, acesso ao Widget Inspector/native tree, argumentos extras nas settings.

## Fontes

- `docs/documentation/other/patrol-tags.mdx`, `skills/patrol-test-architecture`, `skills/patrol-write-test`, `docs/documentation/other/patrol-vs-code-extension.mdx`, `docs/documentation/write-your-first-test.mdx`, `docs/documentation/ci/build-time-test-discovery.mdx`.
