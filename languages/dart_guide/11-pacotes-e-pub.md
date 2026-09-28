# 11 — Pacotes, pubspec e ecossistema

## 1. Anatomia de um pacote

```
my_package/
├── lib/
│   ├── my_package.dart        # API pública (barrel)
│   └── src/                   # implementação privada (não importe de fora)
│       └── internal.dart
├── test/                      # testes (espelha lib/)
├── bin/                       # executáveis (se CLI)
├── example/                   # exemplos
├── tool/                      # scripts de dev
├── pubspec.yaml               # metadados e dependências
├── pubspec.lock               # versões resolvidas (commite em apps)
├── analysis_options.yaml      # regras do analyzer/linter
├── CHANGELOG.md
├── README.md
└── LICENSE
```

- `lib/src/` é **privado por convenção**: importar de outro pacote quebra a
  semântica de versionamento (lint `implementation_imports`).
- Nunca importe atravessando `lib` com caminhos relativos
  (`../lib/x.dart`): use `package:meu_pacote/x.dart`.
- Use imports relativos dentro de `lib` e `test` quando não cruzam pacotes.

## 2. `pubspec.yaml`

```yaml
name: meu_pacote            # lowercase_with_underscores
description: >-
  Uma descrição útil de uma linha, semanticamente válida.
version: 1.2.3              # SemVer
repository: https://github.com/user/meu_pacote
homepage: https://exemplo.com
environment:
  sdk: ^3.13.0              # versão mínima/máxima do Dart
  flutter: ">=3.0.0"        # se Flutter

dependencies:
  http: ^1.3.0              # caret: >=1.3.0 <2.0.0
  collection: ">=1.19.0 <2.0.0"
  path: any                 # evite; prefira faixa

dev_dependencies:
  test: ^1.25.0
  lints: ^5.0.0
  mockito: ^5.4.0

executables:
  meu_cli: meu_cli         # bin/meu_cli.dart

platforms:
  android:
  ios:
  web:
  linux:
```

### Fontes de dependência
```yaml
dependencies:
  # pub.dev (padrão)
  http: ^1.0.0
  # git
  foo:
    git:
      url: https://github.com/user/foo.git
      ref: v1.2.0
      path: subdir/
  # path local (monorepo)
  bar:
    path: ../bar
  # hosted em repositório privado
  baz:
    hosted:
      url: https://my-pub-repo.example.com
      name: baz
    version: ^2.0.0
```

### Sintaxe de versão
| Notação | Significado |
|---|---|
| `1.2.3` | exatamente |
| `^1.2.3` | `>=1.2.3 <2.0.0` (caret) |
| `>=1.2.3 <2.0.0` | faixa |
| `any` | qualquer (evite) |
| `1.2.3-beta` | pré-lançamento |

- **Pacotes de biblioteca**: não commite `pubspec.lock`.
- **Aplicações**: commite `pubspec.lock` (reprodutibilidade).
- `^` é o padrão recomendado pela equipe Dart.

## 3. Comandos `dart pub`

```bash
dart pub get                 # resolve e baixa dependências
dart pub upgrade             # atualiza para as últimas compatíveis
dart pub upgrade --major-versions  # sobe limites major
dart pub outdated            # mostra desatualizadas
dart pub add http            # adiciona dependência
dart pub add dev:test        # adiciona dev_dependency
dart pub remove http
dart pub cache repair        # limpa/repara cache
dart pub deps                # árvore de dependências
dart pub publish --dry-run   # valida antes de publicar
dart pub publish             # publica no pub.dev
dart pub global activate <pkg>  # instala executável global
dart pub token add <url>     # credenciais para repositório privado
```

## 4. Versionamento e breaking changes

- Siga **SemVer**: `MAJOR.MINOR.PATCH`.
- A versão de um pacote Dart é a **menor** versão de SDK que ele suporta.
- Use `dart pub publish --dry-run` e marque a versão corretamente.
- Mudanças incompatíveis exigem `MAJOR`; adicione entradas no `CHANGELOG.md`.
- Ferramentas: `dart pub outdated`, `dart pub deps`, `dart fix`.

## 5. Workspaces (monorepo)

Dart 3.6+ suporta workspaces com resolução compartilhada:

```yaml
# pubspec.yaml raiz
name: _workspace
publish_to: none
workspace:
  - packages/core
  - packages/cli
  - packages/utils
environment:
  sdk: ^3.13.0
```

```yaml
# packages/core/pubspec.yaml
name: core
environment:
  sdk: ^3.13.0
resolution: workspace
dependencies:
  meta: ^1.16.0
```

- Um `pubspec.lock` compartilhado na raiz.
- `dart pub get` / `upgrade` operam sobre todo o workspace.
- Reduz duplicação e garante versões consistentes.

## 6. Publicação no pub.dev

Checklist:
1. `name`/`description`/`version`/`repository`/`homepage` preenchidos.
2. `README.md` com uso e exemplos; `CHANGELOG.md` atualizado.
3. `LICENSE` presente (pub.dev favorece licenças OSI).
4. Todos os arquivos públicos documentados (`///`); `dart doc` sem erros.
5. `dart analyze` limpo; testes passando.
6. `dart pub publish --dry-run` sem avisos.
7. Versão incrementada conforme SemVer.

```bash
dart pub publish --dry-run
dart pub publish
```

- **Verified publishers**: associe domínio/verificação no pub.dev.
- **Automated publishing** via GitHub Actions/OIDC (sem tokens de longa vida).
- **Custom repositories**: `publish_to:` e `dart pub token`.
- **Security advisories**: `dart pub get` avisa sobre vulnerabilidades
  conhecidas (GitHub Advisory Database). Para ignorar (com cautela):
  ```yaml
  ignored_advisories:
    - GHSA-4rgh-jx4f-qfcq
  ```

## 7. O que não commitar

```gitignore
.dart_tool/
build/
doc/api/
# pubspec.lock NÃO é ignorado para aplicações
.packages
*.iml
.idea/
.vscode/
.DS_Store
```

- Não commite `.dart_tool/`, `build/`, docs geradas.
- `pubspec.lock` só para aplicações.
- Nunca commite chaves/segredos; `pub publish` respeita `.gitignore`.

## 8. Pacotes recomendados

| Pacote | Uso |
|---|---|
| `http` | cliente HTTP alto nível |
| `logging` | logs estruturados |
| `test` | testes |
| `mockito` | mocks |
| `collection` | utilitários de coleções/igualdade |
| `path` | manipulação de caminhos multiplataforma |
| `args` | parsing de argumentos de CLI |
| `cli_util` | utilitários de CLI |
| `shelf` | middleware de servidor HTTP |
| `crypto` / `cryptography` | hashing e criptografia |
| `json_serializable` / `build_runner` | geração de código |
| `intl` | i18n, datas, números |
| `characters` | grafemas Unicode |
| `stack_trace` | stack traces legíveis |
| `async` | utilitários de Future/Stream |
| `yaml` | parsing de YAML |
| `archive` | zip/tar/gzip |

## 9. Boas práticas

- Não use `src/` de terceiros; não deixe `lib/src/` vazar na API pública.
- Exporte apenas o necessário (barrel `lib/foo.dart` com `export`).
- Restrinja dependências a faixas compatíveis; revise advisories.
- Prefira dependências com publishers verificados e atualização ativa.
- Nunca dependa de `any` ou de versões pré-release em produção sem motivo.
- Rode `dart pub outdated` e `dart pub upgrade` periodicamente.
- Verifique `resolved` em `pubspec.lock` no CI para builds reproduzíveis.
