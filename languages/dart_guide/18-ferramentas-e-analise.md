# 18 — Ferramentas, análise estática e qualidade

## 1. A CLI `dart`

| Comando | Função |
|---|---|
| `dart create` | cria projeto (`-t console-simple`, `-t package`, `-t web`) |
| `dart run` | executa via JIT (`dart run bin/app.dart`, `dart run pkg:cmd`) |
| `dart compile` | compila (`exe`, `aot-snapshot`, `jit-snapshot`, `js`, `wasm`) |
| `dart analyze` | análise estática |
| `dart fix` | aplica correções automáticas de lints |
| `dart format` | formata código |
| `dart test` | roda testes |
| `dart doc` | gera documentação (`doc/api/`) |
| `dart pub` | gerencia dependências e publicação |
| `dart info` | informações do SDK/ferramentas |
| `dart build` | build com build hooks (`hooks`) |
| `dart devtools` | abre o DevTools |
| `dart --version` | versão do SDK |

```bash
dart create -t console-simple meu_cli
cd meu_cli
dart pub get
dart run bin/meu_cli.dart
dart compile exe bin/meu_cli.dart -o build/meu_cli
dart analyze --fatal-infos
dart format --output=none --set-exit-if-changed .
dart test
dart doc
```

## 2. Análise estática

- O **analyzer** encontra problemas antes da execução (erros, warnings, lints).
- Configure em `analysis_options.yaml` na raiz do pacote.
- Níveis: **info** (não falha), **warning** (falha só com `--fatal-warnings`),
  **error** (falha).
- Use `package:lints/recommended.yaml` (Dart) ou
  `package:flutter_lints/flutter.yaml` (Flutter).
- Ative os modos estritos (`strict-casts`, `strict-inference`,
  `strict-raw-types`).

```yaml
# analysis_options.yaml
include: package:lints/recommended.yaml

analyzer:
  exclude: [build/**]
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  errors:
    invalid_assignment: warning
    missing_return: error
    dead_code: info
    todo: ignore

linter:
  rules:
    always_declare_return_types: true
    avoid_print: true
    cancel_subscriptions: true
    close_sinks: true
    only_throw_errors: true
    prefer_single_quotes: true
    unawaited_futures: true
    use_rethrow_when_possible: true

formatter:
  page_width: 80
  trailing_commas: automate   # ou preserve
```

### Supressão de diagnósticos

```dart
// ignore: avoid_print
print('permitido aqui');

// ignore_for_file: public_member_api_docs
```
```yaml
# analysis_options.yaml — por arquivo/padrão
analyzer:
  exclude: [build/**, '**/*.g.dart', '**/*.freezed.dart']
  errors:
    todo: ignore
```
- Prefira corrigir a ignorar; sempre justifique (`// ignore: regra - motivo`).
- Suprima a regra **específica**, nunca `// ignore` genérico.
- Exclua código gerado do analyze, mas mantenha o gerador limpo.

### Plugins de analyzer

Regras/diagnósticos adicionais (frameworks, lógica de negócio).

```yaml
plugins:
  meu_plugin: ^1.0.0
```
- Configure diagnósticos e suprima como qualquer regra.
- Para escrever um plugin: `package:analyzer` + entrypoint `plugin`
  (ver `tools/analyzer-plugins` oficial).

### Performance do analyzer/IDE

- O analyzer costuma ser o gargalo de IDE lento.
- Windows: exclua o Defender/antivírus de `%LOCALAPPDATA%\.dartServer` e
  `%LOCALAPPDATA%\Pub\Cache`.
- Use disco rápido/**dev drive** para caches; evite diretórios de rede.
- Evite symlinks problemáticos e monorepos gigantes sem `exclude`.
- Reduza dependências e arquivos gerados enormes.
- Rode `dart analyze` no CI em vez de depender só do IDE.

## 3. Lints essenciais

Habilite `package:lints/recommended` e considere:

| Lint | Protege contra |
|---|---|
| `always_declare_return_types` | retornos implícitos/dynamic |
| `avoid_print` | `print` em produção |
| `avoid_dynamic_calls` | chamadas dinâmicas inseguras |
| `cancel_subscriptions` | vazamento de StreamSubscription |
| `close_sinks` | sinks não fechados |
| `only_throw_errors` | lançar objetos não-Error/Exception |
| `unawaited_futures` | Future ignorado |
| `use_rethrow_when_possible` | perda de stack trace |
| `prefer_final_locals`/`prefer_final_fields` | mutabilidade desnecessária |
| `prefer_const_constructors` | performance/imutabilidade |
| `prefer_single_quotes` | consistência |
| `avoid_catches_without_on_clauses` | catch genérico |
| `avoid_catching_errors` | captura de `Error` |
| `public_member_api_docs` | APIs sem doc |
| `directives_ordering` | ordenação de imports |
| `hash_and_equals` | `==` sem `hashCode` |
| `avoid_equals_and_hash_code_on_mutable_classes` | igualdade instável |
| `implementation_imports` | importar `src/` de terceiros |
| `avoid_relative_lib_imports` | caminhos atravessando `lib` |
| `prefer_relative_imports` | imports relativos dentro do pacote |
| `lines_longer_than_80_chars` | estilo |

```bash
dart analyze
dart fix --dry-run      # mostra correções
dart fix --apply        # aplica correções automáticas
```

## 4. Formatação

```bash
dart format .                       # formata (sobrescreve)
dart format -o show bin/app.dart    # mostra sem escrever
dart format -o none .               # só lista o que mudaria
dart format --set-exit-if-changed . # falha se houver mudanças (CI)
```
- Largura configurável (`page_width`, default 80).
- `trailing_commas`: `automate` (default) ou `preserve`.
- A saída do `dart format` **é** o estilo oficial. Integre ao CI.

## 5. `dart analyze` no CI

```yaml
# .github/workflows/ci.yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dart-lang/setup-dart@v1
      - run: dart pub get
      - run: dart format --output=none --set-exit-if-changed .
      - run: dart analyze --fatal-infos
      - run: dart test
```

## 6. Geração de código — `build_runner`

```yaml
dev_dependencies:
  build_runner: ^2.15.1
  build_test: ^3.5.16      # opcional
```

```bash
dart run build_runner build            # build único
dart run build_runner watch            # rebuild incremental
dart run build_runner build --delete-conflicting-outputs
dart run build_runner test             # roda testes
dart run build_runner serve            # servidor de dev
```
- Usado por `json_serializable`, `built_value`, `mockito`, `freezed`, `retrofit`.
- Alternativa a reflection (ruim para AOT) e macros (não suportadas).
- Arquivos gerados geralmente têm `.g.dart`/`.freezed.dart` — não edite à mão.
- Exclua `*.g.dart` da análise quando fizer sentido (`analyzer.exclude`).

## 7. Documentação — `dart doc`

```bash
dart doc                 # gera doc/api/
dart doc --validate-links
```
- Requer doc `///` em APIs públicas.
- Gera links a partir de `[referências]`.
- Não commite `doc/api/`.

## 8. DevTools

```bash
dart devtools
```
- Inspetor, CPU profiler, memória, timeline, isolate, logging.
- Use `dart:developer log()`/`Timeline` para instrumentar.
- Conecta a aplicações em execução (JIT).

## 9. `dart info`

```bash
dart info
dart info --no-verbose
```
Resume versão do SDK, ferramentas, variáveis de ambiente — útil para relatar
bugs.

## 10. Compilação

| Comando | Saída |
|---|---|
| `dart run` | executa via JIT (dev) |
| `dart compile exe` | executável nativo self-contained |
| `dart compile aot-snapshot` | `.aot` para `dartaotruntime` |
| `dart compile jit-snapshot` | snapshot JIT |
| `dart compile js` | JavaScript (dart2js) |
| `dart compile wasm` | WebAssembly (dart2wasm, WasmGC) |
| `dart build` | build com `hooks` |

```bash
dart compile exe bin/app.dart -o build/app
dart compile js web/main.dart -o build/out.js -O2
dart compile wasm web/main.dart -O2 --enable-deferred-loading
```

## 11. Fluxo de qualidade recomendado

1. `dart format .`
2. `dart fix --apply`
3. `dart analyze --fatal-infos`
4. `dart test`
5. `dart pub outdated` e atualização de dependências
6. `dart pub publish --dry-run` (se pacote)

## Checklist
- [ ] `analysis_options.yaml` com `lints/recommended` + modos estritos.
- [ ] CI bloqueia PR sem analyze/formatação/testes limpos.
- [ ] `dart fix` usado para migrações (ex.: parâmetros `final`/`var` no 3.13).
- [ ] Código gerado regenerado via `build_runner`.
- [ ] APIs públicas com `///` e `dart doc` sem warnings.
- [ ] `dart info` anexado em relatos de bug do SDK.
