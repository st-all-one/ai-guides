# 15 — Effective Dart: estilo

> Resumo do guia oficial "Effective Dart: Style". O formatter (`dart format`)
> é a fonte da verdade para espaçamento; as regras abaixo cobrem o que ele
> não resolve.

## 1. Identificadores

Três estilos:
- `UpperCamelCase` — tipos, enums, typedefs, parâmetros de tipo, extensões.
- `lowerCamelCase` — membros, variáveis, parâmetros, funções, constantes.
- `lowercase_with_underscores` — pacotes, diretórios, arquivos, prefixos de import.

```dart
// BOM
class SliderMenu {}
class HttpRequest {}
typedef Predicate<T> = bool Function(T value);
extension MyFancyList<T> on List<T> {}
var count = 3;
HttpRequest httpRequest;
void align(bool clearItems) {}
const pi = 3.14;
const defaultTimeout = 1000;

// RUIM
class slider_menu {}
const PI = 3.14;
const DefaultTimeout = 1000;
```

### Regras adicionais
- **DO** nomear pacotes/diretórios/arquivos com `lowercase_with_underscores`
  (`my_package`, `file_system.dart`).
- **DO** nomear prefixos de import com `lowercase_with_underscores`
  (`import 'dart:math' as math;`), não `as Math`/`as JS`.
- **PREFER** `lowerCamelCase` para constantes (não `SCREAMING_CAPS`).
  Exceção: compatibilidade com código legado ou código gerado (protobuf).
- **DO** capitalizar acrônimos com mais de 2 letras como palavras:
  `Http`, `Nasa`, `Uri`; exceção de 2 letras: `ID`, `TV`, `UI` (mas `Mr`).
  No início de `lowerCamelCase`, tudo minúsculo: `httpConnection`, `tvSet`.
- **PREFER** `_` (wildcard) para parâmetros de callback não usados:
  `future.then((_) => ...)`; vários `_` são permitidos.
- **DON'T** usar `_` inicial em identificadores não privados (variáveis locais,
  parâmetros, funções locais, prefixos).
- **DON'T** usar letras/prefáxios húngaros (`kDefaultTimeout`).
- **DON'T** nomear bibliotecas explicitamente (`library my_library;` é legado);
  use `library;` só para doc/comentário de biblioteca.

## 2. Ordenação (diretivas)

Cada seção separada por linha em branco; ordem:
1. `dart:` imports
2. `package:` imports
3. imports relativos
4. `export`s (após todos os imports)
5. `part`s

Ordene alfabeticamente dentro de cada seção. Siga `directives_ordering`.

```dart
import 'dart:async';
import 'dart:collection';

import 'package:bar/bar.dart';
import 'package:foo/foo.dart';

import 'foo.dart';
import 'util.dart';

export 'src/error.dart';
```

## 3. Formatação

- **DO** formatar com `dart format` (sem discussão).
- **CONSIDER** reorganizar o código para ficar "formatter-friendly":
  encurte nomes locais, extraia expressões para variáveis locais.
- **PREFER** linhas ≤ 80 caracteres (`lines_longer_than_80_chars`).
  Exceções: URIs/caminhos em comentário/string; string multilinha.
- **DO** usar chaves em todos os fluxos de controle (evita dangling else).
  Exceção: `if` sem `else` que cabe em uma linha → `if (x == null) return;`.
- **DO** rodar `dart format` antes de commitar; CI verifica
  `dart format --output=none --set-exit-if-changed .`.

```dart
// BOM
if (isWeekDay) {
  print('Bike to work!');
} else {
  print('Go dancing!');
}
if (arg == null) return defaultValue;

// RUIM
if (isWeekDay)
  print('Bike to work!');
else
  print('Go dancing!');
```

## 4. Comentários e documentação (`///`)

- **DO** escrever comentários como frases (maiúscula + ponto).
- **DON'T** usar `/* */` para documentação (só para desativar código).
- **DO** usar `///` em membros e tipos públicos; `dart doc` os processa.
- **PREFER** doc em APIs públicas; considere em privadas.
- **CONSIDER** doc de biblioteca (antes de `library;`).
- **DO** começar com resumo de **uma frase**, em parágrafo separado.
- **AVOID** redundância com o contexto (não repita nome/signatura).
- **PREFER**:
  - Função com efeito colateral → verbo na 3ª pessoa ("Connects to...").
  - Variável não-booleana → sintagma nominal ("The current day...").
  - Booleana → "Whether ..." ("Whether the modal is visible.").
  - Função que retorna valor → sintagma nominal ("The element at...").
- **DON'T** documentar getter e setter da mesma propriedade (só um).
- **DO** usar `[colchetes]` para referenciar identificadores:
  `[StateError]`, `[anotherMethod()]`, `[Duration.inDays]`, `[Point.new]`.
- **DO** explicar parâmetros/retornos/exceções em prosa (sem `@param`).
- **DO** colocar doc **antes** de anotações (`///` acima de `@Component`).
- **CONSIDER** incluir exemplos de código em ```` ```dart ````.
- **AVOID** Markdown excessivo/HTML; prefira fences a indentação de 4 espaços.
- **PREFER** brevidade e termos claros (evite "i.e.", "e.g.").
- **PREFER** "this" a "the" ao referir-se a um membro da instância.

```dart
/// Deletes the file at [path].
///
/// Throws an [IOError] if the file could not be found.
void delete(String path) { ... }

/// Whether the modal is currently displayed to the user.
bool isVisible;
```

## 5. Checklist de estilo

- [ ] `dart format` aplicado.
- [ ] Nomes nos 3 estilos corretos.
- [ ] Imports ordenados por seção e alfabeticamente.
- [ ] Linhas ≤ 80 caracteres.
- [ ] Chaves em fluxos de controle.
- [ ] `///` em APIs públicas com resumo de uma frase.
- [ ] Sem `_` inicial em identificadores não privados.
- [ ] Sem acrônimos gritantes (`HTTP` → `Http`).
- [ ] Doc antes de anotações; sem `@param`/`@return`.
