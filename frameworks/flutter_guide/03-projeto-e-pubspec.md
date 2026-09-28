# 03 — Projeto, `pubspec` e dependências

## 1. Estrutura de um projeto

```
meu_app/
├── android/            # Runner nativo Android
├── ios/                # Runner nativo iOS
├── web/                # index.html e bootstrap web
├── windows/ macos/ linux/
├── lib/
│   ├── main.dart       # entrypoint
│   └── ...             # seu código
├── test/               # testes unitários e de widget
├── integration_test/   # testes de integração
├── assets/             # imagens, fontes, dados
├── analysis_options.yaml
├── l10n.yaml           # configuração de internacionalização
├── pubspec.yaml        # manifesto do projeto
├── pubspec.lock        # versões exatas (commitar em apps)
└── .gitignore
```

Entrypoint:

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());
```

Convenções de diretórios recomendadas pela arquitetura:

```
lib/
├── main.dart
├── app/                # MaterialApp/GoRouter, tema, DI
├── data/
│   ├── services/       # clientes HTTP, plugins (stateless)
│   ├── repositories/   # fonte da verdade, cache, retry
│   └── models/         # API models e domain models
├── ui/
│   ├── core/           # widgets compartilhados (não "widgets/")
│   └── features/
│       └── home/
│           ├── home_screen.dart
│           └── home_viewmodel.dart
└── utils/
```

> Use nomes de classe que reflitam o componente arquitetural: `HomeViewModel`, `HomeScreen`, `UserRepository`, `ClientApiService`. Evite nomes que colidam com o SDK.

## 2. `pubspec.yaml`

Manifesto do projeto: metadados, dependências, assets, fontes, shaders e configurações.

```yaml
name: meu_app
description: Um app de exemplo.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: ^3.13.0

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  http: ^1.2.0
  provider: ^6.1.0
  go_router: ^14.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
  mocktail: ^1.0.0
  build_runner: ^2.4.0

flutter:
  uses-material-design: true
  generate: true            # habilita gen_l10n
  assets:
    - assets/images/
    - assets/data/arquivo.json
  fonts:
    - family: Raleway
      fonts:
        - asset: assets/fonts/Raleway-Regular.ttf
        - asset: assets/fonts/Raleway-Bold.ttf
          weight: 700
  shaders:
    - shaders/efeito.frag
```

### Campos principais

| Campo | Função |
|---|---|
| `name` | Nome do pacote (snake_case) |
| `version` | `major.minor.patch+build` (usado no Android/iOS) |
| `environment.sdk` | Restrição de versão do Dart |
| `dependencies` | Dependências de runtime |
| `dev_dependencies` | Só desenvolvimento/teste |
| `dependency_overrides` | Força versões (temporário; ver §5) |
| `flutter.assets` | Arquivos empacotados |
| `flutter.fonts` | Fontes customizadas |
| `flutter.generate` | Gera localizações automaticamente |
| `flutter.uses-material-design` | Inclui ícones Material |
| `flutter.shaders` | Fragment shaders |
| `flutter.deferred-components` | Carregamento sob demanda |

## 3. Gerenciamento de dependências

- `pub` permite **apenas uma versão de cada pacote** na árvore de compilação (evita conflitos de tipo, inchaço e estado global inconsistente).
- O **version solver** encontra uma versão concreta que satisfaz todas as restrições.
- `pubspec.lock` registra as versões exatas; **commite em apps**, não em pacotes.

### Restrições de versão

| Sintaxe | Equivale a | Observação |
|---|---|---|
| `^1.2.3` | `>=1.2.3 <2.0.0` | Padrão recomendado |
| `^0.8.0` | `>=0.8.0 <0.9.0` | Pré-1.0: minor pode quebrar |
| `^0.0.3` | `>=0.0.3 <0.0.4` | Patch pode quebrar |
| `>=5.4.0 <6.0.0` | Faixa explícita | Útil para casos específicos |
| `any` | Qualquer | **Evite** |

> Use **faixas**, não versões exatas, no `pubspec.yaml`. O lock garante reprodutibilidade; as faixas permitem atualizar.

### Comandos

```console
flutter pub get                       # resolve e baixa
flutter pub add http                  # adiciona dependência
flutter pub add dev:mocktail          # dev dependency
flutter pub upgrade                   # atualiza dentro das faixas
flutter pub upgrade --major-versions  # sobe também major
flutter pub outdated                  # mostra versões disponíveis
flutter pub deps                      # árvore de dependências
```

### Conflitos de versão

Ocorrem quando dois pacotes exigem versões incompatíveis de uma dependência transitiva. Passos:

1. `flutter pub upgrade` — tente versões mais novas compatíveis.
2. `flutter pub outdated` — veja o que está disponível.
3. `dependency_overrides` — **temporário**; teste bem, pois pode causar erros de compilação/runtime.
4. Se o pacote está abandonado: abra issue, envie PR ou aponte para um fork via `git:`/`path:`.

```yaml
dependency_overrides:
  foo: ^2.0.0
```

> `dependency_overrides` só se aplica ao pacote raiz; não inclua em pacotes publicados.

## 4. Análise estática e lints

`analysis_options.yaml` controla o analyzer:

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  errors:
    invalid_annotation_target: ignore
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"

linter:
  rules:
    always_use_package_imports: true
    avoid_print: true
    prefer_const_constructors: true
    unawaited_futures: true
```

- `flutter_lints` é o conjunto recomendado pelo time Flutter. Inclua-o em `dev_dependencies`.
- Lints importantes para performance/correção: `prefer_const_constructors`, `use_key_in_widget_constructors`, `avoid_print`, `unawaited_futures`, `avoid_dynamic_calls`.

```console
flutter analyze          # análise estática
dart analyze
dart fix --dry-run       # lista correções automáticas
dart fix --apply         # aplica correções (deprecações etc.)
```

## 5. Formatação

Uma única convenção de estilo, aplicada automaticamente, evita debates em code review.

```console
dart format .            # formata o projeto
dart format lib/main.dart
```

- VS Code: `Format Document` / `editor.formatOnSave: true`.
- Android Studio/IntelliJ: `Cmd+Option+L` (macOS) / `Ctrl+Alt+L`, ou "Format code on save".

## 6. Code generation

Muitos pacotes geram código (`*.g.dart`, `*.freezed.dart`):

```console
dart run build_runner build --delete-conflicting-outputs
dart run build_runner watch --delete-conflicting-outputs
```

- **Nunca edite** arquivos gerados; adicione-os ao `.gitignore` (ou versione, conforme a política da equipe) e exclua do analyzer.
- Pacotes comuns: `json_serializable`, `freezed`, `built_value`, `mockito`, `riverpod_generator`, `go_router_builder`.

## 7. Versionamento do app

- `version: 1.2.3+45` → `1.2.3` (versionName) e `45` (versionCode).
- Android/iOS leem do `pubspec.yaml`; atualize antes de cada release.
- Use **flavors** para ambientes (dev/staging/prod) e **dart-define** para configuração em tempo de build:

```console
flutter run --dart-define=API_URL=https://dev.api.exemplo.com
flutter build apk --dart-define=API_URL=https://api.exemplo.com
```

Acesse em código:

```dart
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost');
```

> `--dart-define` é **público** no binário. Nunca coloque segredos aqui (ver `12`).

## 8. Assets

```yaml
flutter:
  assets:
    - assets/images/logo.png        # arquivo
    - assets/images/                # diretório inteiro
```

```dart
Image.asset('assets/images/logo.png');
final json = await rootBundle.loadString('assets/data/arquivo.json');
```

- Assets são somente leitura e empacotados no binário.
- Para variações por plataforma, use subpastas/`platform-specific assets`.
- Prefira formatos comprimidos (WebP/AVIF) e imagens responsivas.

## 9. Fontes

```yaml
flutter:
  fonts:
    - family: Raleway
      fonts:
        - asset: assets/fonts/Raleway-Regular.ttf
        - asset: assets/fonts/Raleway-Bold.ttf
          weight: 700
```

```dart
const TextStyle(fontFamily: 'Raleway', fontWeight: FontWeight.bold);
```

## Checklist de projeto saudável

- [ ] `flutter_lints` habilitado e `flutter analyze` limpo
- [ ] `dart format` aplicado (format on save)
- [ ] `pubspec.lock` versionado (em apps)
- [ ] Faixas de versão (`^`) em vez de versões exatas/`any`
- [ ] Arquivos gerados excluídos do analyzer
- [ ] Sem segredos em `--dart-define` ou no repositório
- [ ] `dart fix --apply` rodado após upgrades do SDK
