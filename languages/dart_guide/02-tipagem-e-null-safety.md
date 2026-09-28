# 02 — Tipagem, inferência e sound null safety

## 1. Os dois pilares

Dart é **type safe** e **sound**:

- **Type safe**: uma variável nunca recebe valor incompatível com seu tipo
  estático. Mistura checagem estática (erros de compilação) com checagem de
  runtime (casts e `is`).
- **Sound**: se o tipo estático não permite `null`, o valor nunca será `null`
  em runtime. Isso vale para programas 100% null-safe (Dart 3+).

Benefícios: bugs de tipo detectados em compilação; código mais legível (tipos
não mentem); refatoração mais segura; AOT mais eficiente.

## 2. Inferência de tipos

Anotações são opcionais — os tipos são obrigatórios e inferidos quando possível.

```dart
var arguments = {'argA': 'hello', 'argB': 42}; // Map<String, Object>
List<int> listOfInt = [];        // inferido <int>
var listOfDouble = [3.0];        // List<double>
var ints = listOfDouble.map((x) => x.toInt()); // Iterable<int>
```

Regras de inferência:
- Campos/métodos sem tipo que sobrescrevem herdam o tipo do supertipo.
- Campos com inicializador inferem do inicializador.
- Variáveis locais inferem do inicializador (não considera reatribuições).
- Type arguments de invocações genéricas inferem do contexto e dos argumentos.
- Quando não há informação suficiente, cai em `dynamic` (perigoso).

```dart
var x = 3;    // int
x = 4.0;      // ERRO de compilação
num y = 3;    // num
y = 4.0;      // OK
```

### Inferência usando bounds (Dart 3.7+)
Melhora a inferência em tipos F-bounded e permite "desconstruir" type
arguments:

```dart
X max<X extends Comparable<X>>(X a, X b) => a.compareTo(b) > 0 ? a : b;
max(3, 7); // antes exigia max<num>(3, 7); agora infere sozinho
```

## 3. Onde anotar tipos (Effective Dart)

- **Anote** variáveis sem inicializador.
- **Anote** campos e variáveis de topo cujo tipo não é óbvio.
- **Anote** o tipo de retorno de funções declaradas (não locais).
- **Anote** o tipo de parâmetros de funções declaradas.
- **Omita** tipos em variáveis locais inicializadas e em invocações genéricas
  cujo tipo é inferido.
- **Omita** tipos em parâmetros de closures quando o contexto os infere.
- Não escreva tipos em *initializing formals* (`this.x`, `super.x`).
- Não escreva setters com tipo de retorno (`void` implícito).
- Use `dynamic` explícito se for isso mesmo que você quer (não deixe inferir).

```dart
// Bom
List<AstNode> parameters;                  // sem inicializador → anote
Future<bool> install(PackageId id);        // API pública → anote
var desserts = <List<Ingredient>>[];       // local inicializado → omita tipo

// Ruim
var parameters;                            // dynamic acidental
install(id, destination) => ...;           // API sem tipos
List<List<Ingredient>> desserts = <List<Ingredient>>[]; // redundante
```

## 4. Regras de substituição (consumidor/produtor)

- **Consumidor** (parâmetro): pode substituir por **supertipo**.
- **Produtor** (retorno): pode substituir por **subtipo**.
- Retorno de override: mesmo tipo ou subtipo.
- Parâmetro de override: mesmo tipo ou supertipo (não estreite).
- `covariant` permite estreitar um parâmetro, movendo a checagem para runtime.

```dart
class Animal { Animal get parent => ...; void chase(Animal a) {} }
class HoneyBadger extends Animal {
  @override HoneyBadger get parent => ...;   // produtor: subtipo OK
  @override void chase(Object a) {}          // consumidor: supertipo OK
}
```

## 5. Sound null safety

Não-nulo por padrão; `?` torna nulável.

```dart
int a = 42;        // nunca null
int? b = null;     // pode ser null
String name = getFileName(); // erro se puder ser null

// Operações sobre nuláveis: só toString, ==, hashCode até promover
void f(String? s) {
  if (s != null) print(s.length); // promovido a String
  print(s?.length);               // null-aware
  print(s!.length);               // força (lança se null)
  print(s ?? 'vazio');            // fallback
}
```

Estrutura de tipos:
- `String?` é união `String | Null`; `String` é subtipo de `String?`.
- `Object?` é o **top type**; `Object` é quase-topo (exclui `null`).
- `Never` é o **bottom type** (função que nunca retorna; útil em análise de
  alcançabilidade e código com `throw`).
- `Null` não é mais subtipo de tudo; só de tipos nuláveis.
- **Não há mais downcasts implícitos**: `Object o = 'a'; print(o.length);`
  agora exige `o as String` ou verificação `is`.

### Promoção de tipo (type promotion)
Funciona para variáveis locais, parâmetros, `final` privado e após
`is`/`!= null`. Não funciona para campos mutáveis nem getters.

```dart
class UploadException {
  final Response? response;
  UploadException([this.response]);

  @override
  String toString() {
    if (this.response case var response?) { // null-check pattern
      return 'Falha: ${response.url}';
    }
    return 'Falha sem resposta.';
  }
}
```
Alternativas quando a promoção não ocorre: variável local, null-check pattern
ou `!`.

### `late`
```dart
late final int expensive = compute(); // inicializa no primeiro acesso
late String mustBeSet;               // erro em runtime se lido antes
```
Evite `late` quando a lista de inicializadores do construtor resolve;
evite `late final` público sem inicializador (cria setter público).

## 6. Modos estritos de análise

Ative em `analysis_options.yaml` para pegar problemas que o type system permite:

```yaml
analyzer:
  language:
    strict-casts: true        # proíbe downcast implícito de dynamic
    strict-inference: true    # proíbe inferir dynamic silenciosamente
    strict-raw-types: true    # proíbe genéricos incompletos (raw types)
```

- **strict-casts**: `foo(jsonDecode(text))` com `jsonDecode` retornando
  `dynamic` passa a ser erro.
- **strict-inference**: `final m = {};` (Map não inferível) vira aviso.
- **strict-raw-types**: `List n = [1,2,3];` (sem type argument) vira aviso.

Sempre escreva tipos genéricos **completos**:
`List<int>`, `Map<String, int>` — nunca `List` ou `Map` crus.

## 7. Generics

```dart
abstract class Cache<T> {
  T getByKey(String key);
  void setByKey(String key, T value);
}

var names = <String>['a', 'b'];
var uniqueNames = <String>{...names};
var pages = <String, Page>{};

// Restrições de tipo
class Foo<T extends num> { ... }
T first<T>(List<T> ts) => ts.first;

// Covariância (padrão Dart)
List<Object> objs = <String>['a']; // OK (List é covariante)
```

- Coleções são **covariantes** (o runtime rejeita inserções incompatíveis).
- Use `extends` para restringir; `F-bounds` para auto-referência
  (`class A<X extends A<X>>`).
- Convenções de nomes: `E` (elemento), `K`/`V` (chave/valor), `R` (retorno),
  `T`/`S`/`U` (genéricos gerais).

## 8. `dynamic`, `Object?` e `Never` na prática

| Você quer | Use |
|---|---|
| Qualquer valor, sem operações livres | `Object?` |
| Qualquer valor, exceto `null` | `Object` |
| Checagem dinâmica deliberada | `dynamic` (explícito) |
| Função que nunca retorna | `Never` |
| JSON de APIs | `Map<String, dynamic>` + conversão cedo |

```dart
bool convertToBool(Object arg) {
  if (arg is bool) return arg;
  if (arg is String) return arg.toLowerCase() == 'true';
  throw ArgumentError('Cannot convert $arg');
}
```

## 9. Records e pattern types (resumo)

Records são coletâneas fixas, heterogêneas, imutáveis e tipadas; patterns
desestruturam valores. Ver `04` e `05`.

```dart
(int, String) pair = (1, 'a');
var (n, s) = pair;
({int x, int y}) point = (x: 1, y: 2);
```

## 10. Checklist de tipagem

- [ ] `strict-casts`, `strict-inference`, `strict-raw-types` habilitados.
- [ ] Nenhum `dynamic` implícito (procure `var` sem inicializador).
- [ ] APIs públicas com tipos de retorno e parâmetros anotados.
- [ ] Genéricos sempre com type arguments completos.
- [ ] `!` usado apenas quando há prova de não-nulidade.
- [ ] `late` restrito a inicialização lazy/`this`-dependente.
- [ ] Sem `as` desnecessário; prefira `is` + promoção.
