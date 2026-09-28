# 02 — Dart para Flutter: tipagem e linguagem

Dart é uma linguagem **fortemente tipada, com inferência de tipos e null safety sólido**. O código Flutter é Dart; dominar a linguagem evita a maioria dos bugs de runtime.

## 1. Tipagem estática e inferência

- Toda variável tem um **tipo estático** conhecido em tempo de compilação.
- `var` infere o tipo; `dynamic` desliga a checagem estática (evite).
- `final` = atribuído uma vez; `const` = constante de compilação.
- Prefira tipos explícitos em APIs públicas e `var` em locais óbvios.

```dart
var name = 'Ana';          // String (inferido)
final id = 42;             // int, imutável após atribuição
const pi = 3.14159;        // constante em tempo de compilação
dynamic anything = 1;      // sem checagem estática — EVITE
Object safe = 'texto';     // tipo base não-nulo, seguro

// const em coleções/objetos é profundo
const point = Point(1, 2);
const list = [1, 2, 3];
```

### `dynamic` vs `Object?` vs `Object`

| Tipo | Aceita null | Checagem estática | Uso |
|---|---|---|---|
| `dynamic` | Sim | Nenhuma | Interop, JSON bruto (evitar) |
| `Object?` | Sim | Sim | Valor de tipo desconhecido |
| `Object` | Não | Sim | Valor não-nulo de tipo desconhecido |

> `dynamic` é a maior fonte de erros de runtime. Em JSON, converta logo para modelos tipados (`as`, `fromJson`).

## 2. Null safety

Com **sound null safety**, variáveis não-nulas por padrão; o compilador garante que `null` não vaze para onde não deveria.

```dart
String nome = 'Ana';        // não pode ser null
String? apelido;            // pode ser null
int? idade;

// Operadores
apelido ??= 'sem apelido';           // atribui se null
final tamanho = apelido?.length ?? 0; // acesso seguro + fallback
final forca = idade!;                 // asserção não-nula (use com cuidado)

// Promoção de tipo após checagem
if (apelido != null) {
  print(apelido.length); // promovido a String
}

// late: inicialização tardia, não-nula
late final String config;
```

- `!` lança em runtime se for null — prefira checagens ou `??`.
- `late` evita tornar tudo nullable em campos inicializados depois (ex.: `initState`).
- Parâmetros nomeados obrigatórios usam `required`.

```dart
class User {
  User({required this.name, this.email});
  final String name;
  final String? email;
}
```

## 3. Coleções e literais

```dart
final list = <int>[1, 2, 3];
final set = <String>{'a', 'b'};
final map = <String, int>{'a': 1};

// spread e collection-if/for
final mais = [...list, 4, 5];
final cond = [if (ativo) 'on', if (!ativo) 'off'];
final dobro = [for (final n in list) n * 2];

// operações funcionais
list.map((n) => n * 2).where((n) => n.isEven).toList();
list.fold<int>(0, (acc, n) => acc + n);

// listas imutáveis expostas pela UI
UnmodifiableListView<Item> get items => UnmodifiableListView(_items);
```

## 4. Funções

```dart
// arrow
int soma(int a, int b) => a + b;

// posicionais, nomeados e default
void log(String msg, {String level = 'info', bool timestamp = false}) {}

// first-class: funções são valores
final f = (int x) => x * x;
list.map(f);

// typedefs nomeiam assinaturas
typedef Validator = String? Function(String? value);
```

## 5. Classes, construtores e modificadores

```dart
class Ponto {
  const Ponto(this.x, this.y);          // construtor const
  Ponto.origem() : this(0, 0);          // construtor nomeado
  factory Ponto.fromJson(Map<String, dynamic> j) => Ponto(j['x'], j['y']);

  final double x;
  final double y;

  Ponto copyWith({double? x, double? y}) => Ponto(x ?? this.x, y ?? this.y);
  double get distancia => x * x + y * y;
}

abstract class Repositorio { Future<List<Item>> listar(); }

class RepoApi implements Repositorio {
  @override
  Future<List<Item>> listar() async => [];
}

mixin Loggable {
  void log(String msg) => print('[log] $msg');
}

class Servico with Loggable {}

extension StringX on String {
  String get capitalizado =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}
```

### Modificadores de classe (Dart 3)

| Modificador | Significado |
|---|---|
| `abstract` | Não instanciável |
| `sealed` | Subclasses restritas ao mesmo arquivo; permite `switch` exaustivo |
| `final` | Não pode ser estendida nem implementada fora do arquivo |
| `base` | Deve ser estendida, não implementada |
| `interface` | Pode ser implementada, não estendida |
| `mixin` | Só pode ser usada com `with` |

`sealed` é a base do padrão `Result` (ver `06` e `08`).

## 6. Records e patterns (Dart 3)

**Records** agrupam valores heterogêneos sem classe:

```dart
final (nome, idade) = ('Ana', 30);        // desestruturação
(int, String) par = (1, 'a');
({double x, double y}) ponto = (x: 1.0, y: 2.0);
print(ponto.x);
```

**Patterns** tornam o controle de fluxo expressivo:

```dart
switch (forma) {
  case Circulo(radius: var r) when r > 10:
    print('círculo grande $r');
  case Circulo(radius: final r):
    print('círculo $r');
  case Retangulo(width: var w, height: var h):
    print('retângulo ${w}x$h');
}

// if-case
if (json case {'name': String nome, 'age': int idade}) {
  print('$nome tem $idade');
}

// switch expression
final categoria = switch (idade) {
  < 13 => 'criança',
  < 20 => 'adolescente',
  _ => 'adulto',
};
```

**List/map patterns:**

```dart
final [primeiro, ...resto] = [1, 2, 3];
final {'id': int id, 'title': String title} = json;
```

## 7. Enums

```dart
enum Status {
  pendente('P', 1),
  concluido('C', 2);

  const Status(this.code, this.ordem);
  final String code;
  final int ordem;

  bool get ativo => this == Status.pendente;
}

// switch exaustivo sobre enums
final label = switch (status) {
  Status.pendente => 'Pendente',
  Status.concluido => 'Concluído',
};
```

## 8. Generics

```dart
class Cache<T> {
  final _itens = <T>[];
  void add(T item) => _itens.add(item);
  T? primeiro() => _itens.isEmpty ? null : _itens.first;
}

// restrições
class Repositorio<T extends Entidade> {}

// covariância: List<int> é List<num>
num somaTodos(List<num> xs) => xs.fold(0, (a, b) => a + b);
somaTodos(<int>[1, 2, 3]);
```

## 9. Programação assíncrona

### `Future`

```dart
Future<User> buscar() async {
  final res = await http.get(uri);
  if (res.statusCode != 200) {
    throw HttpException('Falha ${res.statusCode}');
  }
  return User.fromJson(jsonDecode(res.body));
}
```

- `async`/`await` não bloqueiam a thread; suspendem a função.
- `Future` representa um valor que chegará (ou um erro).
- `FutureBuilder`/`StreamBuilder` integram com a UI.

### `Stream`

```dart
Stream<int> contador() async* {
  for (var i = 0; i < 3; i++) {
    yield i;
    await Future.delayed(const Duration(seconds: 1));
  }
}

final sub = contador().listen((v) => print(v));
await sub.cancel(); // sempre cancele em dispose()
```

### `Future.wait` e concorrência

```dart
final [a, b] = await Future.wait([buscarA(), buscarB()]);
```

### Isolates (trabalho pesado)

```dart
final fotos = await Isolate.run<List<Photo>>(() {
  final data = jsonDecode(jsonString) as List<Object?>;
  return data.cast<Map<String, Object?>>().map(Photo.fromJson).toList();
});
```

Detalhes em `08` e `11`.

## 10. Tratamento de exceções

Dart **não** tem checked exceptions: métodos podem lançar sem declarar. Isso favorece erros não tratados — por isso o padrão `Result` é recomendado em apps grandes.

```dart
try {
  await arriscado();
} on HttpException catch (e, s) {
  log('HTTP falhou', error: e, stackTrace: s);
} on FormatException {
  // ...
} catch (e) {
  // captura genérica
} finally {
  cleanup();
}
```

- Capture exceções na **fronteira** (ViewModel/Repository), não em todo lugar.
- Prefira `Result<T>` (sealed) para fluxos previsíveis de erro (ver `06`).

## 11. Dot shorthands (Dart 3.13)

Omite o tipo quando o contexto o determina — muito útil em árvores de widgets:

```dart
Container(
  alignment: .center,                    // Alignment.center
  padding: const .all(16.0),             // EdgeInsets.all(16.0)
  child: Column(
    mainAxisAlignment: .spaceEvenly,     // MainAxisAlignment.spaceEvenly
    children: [
      Text('Hi', style: TextStyle(fontWeight: .bold)),
    ],
  ),
);
```

Funciona para enums, membros estáticos e construtores nomeados, sempre que o **contexto de tipo** é claro.

## 12. Convenções (Effective Dart)

- **Nomes:** `lowerCamelCase` (variáveis/métodos), `UpperCamelCase` (tipos), `lowercase_with_underscores` (arquivos), `_` prefixo para privado (privacidade é por biblioteca/arquivo).
- Prefira `final` a `var` quando não há reatribuição.
- Use `const` sempre que possível (performance de widgets).
- Evite `dynamic`; evite `!` sem necessidade.
- Escreva getters para operações que "acessam propriedade"; métodos para ações.
- Documente APIs públicas com `///`.
- Trate erros; não engula exceções silenciosamente.
- Mantenha `build()` puro e sem lógica de negócio.

## 13. Armadilhas comuns

| Armadilha | Correção |
|---|---|
| Usar `dynamic` em JSON | Criar modelos com `fromJson` |
| `!` em valor que pode ser null | Checar ou usar `??` |
| Mutar lista exposta pela UI | Retornar `UnmodifiableListView` |
| `setState` assíncrono depois de `dispose` | Checar `mounted` |
| Comparar objetos sem `==`/`hashCode` | Usar `freezed`/`equatable` |
| Ignorar `Future` (`unawaited`) | `await` ou tratar explicitamente |
| Bloquear a main thread | Isolate/`compute` |
