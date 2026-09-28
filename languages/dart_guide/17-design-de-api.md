# 17 — Effective Dart: design de API

> Resumo do guia oficial "Effective Dart: Design". Foco em bibliotecas e APIs
> consistentes e usáveis.

## 1. Nomes

- **DO** usar termos consistentes em toda a API; siga precedentes conhecidos.
- **AVOID** abreviações (salvo as mais comuns); capitalize corretamente.
- **PREFER** o substantivo mais descritivo por último (`pageCount`,
  `HttpRequest`).
- **CONSIDER** fazer o código ler como frase (`errors.isEmpty`,
  `subscription.cancel()`, `monsters.where((m) => m.hasClaws)`).
- **PREFER** sintagma nominal para propriedade/variável não-booleana
  (`list.length`), não verbo.
- **PREFER** verbo não-imperativo para booleana (`isEmpty`, `hasElements`,
  `canClose`, `closesWindow`) — nunca som que pareça comando.
- **CONSIDER** omitir o verbo em parâmetro booleano nomeado
  (`paused: false`, `caseSensitive: false`, `growable: true`).
- **PREFER** o nome "positivo" para booleanas (`isConnected`, não
  `isDisconnected`); exceção: quando a forma negativa é a mais usada.
- **PREFER** verbo imperativo para função/método com efeito colateral
  (`list.add`, `queue.removeFirst`, `window.refresh`).
- **PREFER** sintagma nominal/verbo não-imperativo para função que retorna
  valor (`elementAt(3)`, `firstWhere(test)`).
- **CONSIDER** verbo imperativo para chamar atenção ao trabalho pesado
  (`database.downloadData()`, `packageGraph.solveConstraints()`).
- **AVOID** começar método com `get`; use getter (`breakfastOrder`) ou verbo
  mais preciso (`fetch`, `calculate`, `download`).
- **PREFER** `to___()` para *conversão* (cópia) — `toSet()`, `toString()`.
- **PREFER** `as___()` para *view* (representação apoiada no original) —
  `asMap()`, `asFloat32List()`.
- **AVOID** descrever parâmetros no nome (`list.add(element)`, não
  `addElement`); exceção para desambiguar (`containsKey`/`containsValue`).
- **DO** seguir convenções mnemônicas de type parameters: `E` (elemento),
  `K`/`V` (chave/valor), `R` (retorno), `T`/`S`/`U` (gerais).

```dart
// BOM
pageCount; updatePageCount(); toSomething(); asSomething();
isEmpty; hasElements; canClose;
list.add('x'); queue.removeFirst();
elementAt(3); firstWhere(test);

// RUIM
numPages; convertToSomething(); wrappedAsSomething();
empty; withElements; closeable; closingWindow;
getBreakfastOrder();
list.addElement(element);
```

## 2. Bibliotecas

- **PREFER** tornar declarações privadas (`_`); interfaces públicas estreitas.
- **CONSIDER** declarar múltiplas classes na mesma biblioteca (privacidade é
  por library; permite "friend classes").

## 3. Classes e mixins

- **AVOID** classe abstrata de um único membro — use função/typedef.
- **AVOID** classe só com membros estáticos — use funções de topo (ou
  constantes agrupadas, exceção legítima).
- **AVOID** estender classe que não foi projetada para subclasse.
- **DO** usar class modifiers (`final`, `interface`, `sealed`, `base`) para
  controlar extensão/implementação e comunicar intenção.
- **DO** usar modifiers para controlar se a classe pode ser interface.
- **PREFER** `mixin` ou `class` puros a `mixin class` (evite ambiguidade).

## 4. Construtores

- **CONSIDER** tornar o construtor `const` se a classe suportar (todos os
  campos `final`, sem corpo). É um compromisso público (não quebre).

## 5. Membros

- **PREFER** campos e variáveis de topo `final`.
- **DO** usar getters para operações que acessam propriedades:
  - sem argumentos e com resultado;
  - caller se importa com o *resultado*;
  - sem efeitos colaterais visíveis ao usuário;
  - idempotente (mesmo resultado sem mudança de estado);
  - não expõe todo o estado do original.
- **DO** usar setters para operações que mudam propriedades (um argumento,
  sem retorno, idempotente).
- **DON'T** definir setter sem getter correspondente.
- **AVOID** fakes de overloading com testes de runtime (`is`); prefira métodos
  separados com nomes distintos.
- **AVOID** `late final` público sem inicializador (cria setter público).
- **AVOID** retornar `Future`/`Stream`/coleção nulável — prefira vazio.
  Exceção: `null` significa algo diferente de vazio.
- **AVOID** retornar `this` só para encadear — use cascades (`..`).

```dart
class Box {
  final contents = [];           // read-only simples
}

var buffer = StringBuffer()
  ..write('one')
  ..write('two');
```

## 6. Tipos (anotações)

- **DO** anotar variáveis sem inicializador.
- **DO** anotar campos e variáveis de topo se o tipo não é óbvio.
- **DON'T** anotar localmente variáveis inicializadas (redundante).
- **DO** anotar tipos de retorno em funções declaradas.
- **DO** anotar tipos de parâmetros em funções declaradas.
- **DON'T** anotar parâmetros de function expressions (inferidos).
- **DON'T** anotar *initializing formals* (`this.x`, `super.x`).
- **DO** escrever type arguments em invocações genéricas não inferidas.
- **DON'T** escrever type arguments já inferidos.
- **AVOID** tipos genéricos incompletos ("raw types") — sempre `List<int>`.
- **DO** anotar com `dynamic` quando for isso mesmo (não deixe inferir).
- **PREFER** assinaturas completas de função a `Function`.
- **DON'T** especificar retorno em setter (`void` é implícito).
- **DON'T** usar a sintaxe antiga de `typedef`.
- **PREFER** tipos de função inline a typedefs.
- **PREFER** sintaxe de tipo de função para parâmetros
  (`bool Function(T)` em vez de `bool f(T)`).
- **AVOID** `dynamic` a menos que queira desligar a checagem estática; prefira
  `Object?`/`Object` + `is`.
- **DO** usar `Future<void>` para membros async sem valor.
- **AVOID** `FutureOr<T>` como retorno; só em posição contravariante (callback).

```dart
// BOM
List<AstNode> parameters;                 // sem inicializador
Future<bool> install(PackageId id, String destination);
bool isValid(String value, bool Function(String) test);
Future<int> triple(FutureOr<int> value) async => (await value) * 3;

// RUIM
var parameters;
install(id, destination);
bool isValid(String value, Function test);
FutureOr<int> triple(FutureOr<int> value);
List numbers = [1, 2, 3];
```

## 7. Parâmetros

- **AVOID** parâmetros posicionais booleanos.
- **AVOID** opcionais posicionais quando o usuário pode omitir os primeiros.
- **AVOID** parâmetros obrigatórios com valor sentinela ("no argument");
  torne opcionais.
- **DO** usar intervalo com `start` inclusivo e `end` exclusivo.

```dart
// BOM
Task.oneShot(); Task.repeating();
ListBox(scroll: true, showScrollbars: true);
string.substring(start);
list.sublist(1, 3); // [1, 2]

// RUIM
Task(true); Task(false);
new ListBox(false, true, true);
string.substring(start, null);
```

## 8. Igualdade

- **DO** sobrescrever `hashCode` se sobrescrever `==`.
- **DO** obedecer às leis de equivalência: reflexiva, simétrica, transitiva.
- **AVOID** igualdade customizada em classes mutáveis.
- **DON'T** tornar o parâmetro de `==` nulável.

```dart
class Person {
  final String name;
  // ...
  @override
  bool operator ==(Object other) => other is Person && name == other.name;
  @override
  int get hashCode => name.hashCode;
}
```

## 9. Checklist de design

- [ ] Nomes consistentes, sem abreviações, substantivo no fim.
- [ ] Booleanas positivas e não-imperativas.
- [ ] Nomes distintos para operações distintas (sem fake overload).
- [ ] Getters/setters "field-like"; setters com getters.
- [ ] Classes com modifiers que comunicam intenção (`sealed`/`final`/...).
- [ ] Tipos anotados em APIs; genéricos completos; sem `Function` cru.
- [ ] Parâmetros nomeados para flags; faixas `[start, end)`.
- [ ] `==`/`hashCode` corretos e imutáveis.
- [ ] Sem retornar `this` para fluência (use cascades).
