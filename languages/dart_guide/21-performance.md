# 21 — Performance e otimização

> Como tornar um projeto Dart mais rápido: **medir** antes de otimizar, escolher
> o alvo de compilação certo, reduzir alocações, usar as estruturas corretas,
> paralelizar com isolates e seguir os caminhos rápidos do compilador.
> Baseado na documentação oficial (`dart.dev`), em `dart compile`, DevTools e
> práticas de otimização do compilador (dart2js/AOT).

## 1. Mentalidade: medir primeiro

Regra de ouro: **não otimize por intuição**. Meça com dados reais.

1. Defina a métrica: latência (p50/p95/p99), throughput, tempo de startup,
   memória, tamanho do bundle, FPS.
2. Meça a **baseline** em modo de produção (AOT ou `dart compile js -O2`),
   nunca em JIT/debug (JIT tem custos de aquecimento e asserts).
3. Localize o gargalo com profiler (DevTools CPU/memory/timeline).
4. Otimize **o gargalo** e meça de novo (antes/depois).
5. Evite otimização prematura; priorize algoritmo e I/O antes de micro-ajustes.

## 2. Ferramentas de medição

### Dart DevTools
```bash
dart run --observe bin/app.dart   # habilita observatório/DevTools
# ou
dart devtools
```
- **CPU profiler**: encontre funções quentes (hot spots).
- **Memory/Allocation**: alocações, retenção, GC, vazamentos.
- **Timeline**: eventos, frames, operações assíncronas, I/O.
- **Network**: requisições HTTP.

### Instrumentação com `dart:developer`
```dart
import 'dart:developer' as dev;

final task = dev.TimelineTask()..start('processar');
final result = dev.Timeline.timeSync('cálculo', () => heavy());
task.finish();

dev.log('etapa concluída', name: 'perf', level: 800);
```

### Benchmarks (`package:benchmark_harness`)
```yaml
dev_dependencies:
  benchmark_harness: ^2.3.0
```
```dart
import 'package:benchmark_harness/benchmark_harness.dart';

class SortBenchmark extends BenchmarkBase {
  SortBenchmark() : super('sort');
  final List<int> data = List.generate(10000, (i) => 10000 - i);

  @override
  void run() => (List.of(data)..sort());
}

void main() {
  SortBenchmark().report();
}
```
- Faça warm-up (JIT demora a otimizar); meça em modo release/AOT quando possível.
- Rode múltiplas vezes; compare medianas, não um único resultado.
- Isole: desligue logging/telemetria durante o benchmark.

### Medição simples e confiável
```dart
final sw = Stopwatch()..start();
doWork();
sw.stop();
print('${sw.elapsedMicroseconds} µs');
```

## 3. Escolha do alvo de compilação

| Alvo | Comando | Quando |
|---|---|---|
| JIT (dev) | `dart run` | desenvolvimento, hot reload |
| Executável nativo (AOT) | `dart compile exe` | produção CLI/servidor |
| AOT module | `dart compile aot-snapshot` + `dartaotruntime` | distribuir vários apps |
| JIT snapshot | `dart compile jit-snapshot` | pico de performance após treino |
| JS otimizado | `dart compile js -O2` | produção web |
| Wasm | `dart compile wasm -O2` | produção web (WasmGC) |

- **AOT** (`exe`) tem startup curto e previsível e sem JIT warm-up.
- **JIT snapshot** pode ter **pico de performance maior** que AOT (perfil de
  treino), mas exige runtime e é maior.
- **`dart run`** é para desenvolvimento: possui asserts, sem otimização máxima.
- No servidor, prefira `dart compile exe` para startup e CPU previsíveis.

```bash
dart compile exe bin/server.dart -o build/server
dart compile aot-snapshot bin/app.dart -o build/app.aot
dartaotruntime build/app.aot
dart compile jit-snapshot bin/app.dart -o build/app.jit
```

### Otimização web (`dart2js`)
```bash
dart compile js -O2 -o build/main.js web/main.dart   # recomendado em prod
```
Níveis:
- `-O0`: desliga muitas otimizações (debug).
- `-O1` (padrão): otimizações básicas.
- `-O2`: `-O1` + minificação e otimizações seguras (use em produção).
- `-O3`: também **omite checagens implícitas de tipo** (risco de crash).
- `-O4`: mais agressivo, sensível à variação de entrada.

Regras para gerar código eficiente (documentação oficial):
- **Não use `Function.apply()`.**
- **Não sobrescreva `noSuchMethod()`** (impede otimizações).
- **Evite atribuir `null` a variáveis** (prejudica inferência).
- **Seja consistente com os tipos dos argumentos** em cada função/método.

### Tree shaking e tamanho
- Importe as libs que precisar; o compilador remove o não usado.
- **Deferred loading** (web) reduz o download inicial:
  ```dart
  import 'package:app/relatorio.dart' deferred as relatorio;
  Future<void> abrir() async {
    await relatorio.loadLibrary();
    relatorio.render();
  }
  ```
  - Só web; constantes/tipos de lib diferida não existem antes do load.
  - Wasm 3.13: `dart compile wasm --enable-deferred-loading`.
- **`--no-source-maps`** em produção (tamanho + privacidade).
- **`@RecordUse()`** (3.13) + link hooks tree-shake bibliotecas nativas (FFI).

## 4. Alocação, GC e memória

Dart usa GC geracional (jovens morrem cedo). Alocar muito gera pressão de GC.

- **Reduza alocações no hot path**: evite criar objetos temporários em loops.
- **Reutilize buffers**: `StringBuffer`, `BytesBuilder`, `List` reutilizado.
- **Use `const`**: construtores `const` são canonicalizados (mesma instância).
- **Evite closures desnecessárias** em loops quentes (alocam contexto).
- **Prefira `typed_data`** (`Uint8List`, `Int32List`) para grandes volumes
  numéricos/binários — memória contígua e menos boxing.
- **Não use pool de objetos por reflexo**: o GC de Dart é rápido; meça.
- **Cuidado com vazamentos**: listeners/subscriptions não cancelados, caches
  sem limite, `static` acumulando.

```dart
// BOM: um buffer, sem alocações por iteração
final sb = StringBuffer();
for (final item in items) {
  sb.write(item);
}

// RUIM: cria string intermediária a cada iteração
var s = '';
for (final item in items) {
  s += item;
}
```

### Memória de longo prazo
```dart
final cache = <String, Expensive>{}; // limite o tamanho! (LRU)
// WeakReference: não impede o GC de coletar o alvo
final ref = WeakReference(bigObject);
// Finalizer para liberar recursos externos
final clean = Finalizer<Object>((_) => closeHandle());
```
- Limite caches (LRU) para não crescer infinitamente.
- Feche arquivos, sockets, `StreamController`, `HttpClient`, subscriptions.
- Prefira `Stream` (processa incrementalmente) a carregar tudo em memória.

## 5. Tipos, dispatch e otimização do compilador

- **Evite `dynamic`**: chamadas dinâmicas impedem inlining e otimização;
  use tipos precisos e `Object?` + `is`.
- **Seja monomórfico**: a mesma função chamada com os mesmos tipos é melhor
  otimizada pelo JIT/AOT.
- **Anote tipos de retorno/parâmetros** para dar informação ao compilador.
- **Genéricos com tipos concretos** (`List<int>`, não `List<dynamic>`).
- **Sound null safety** ajuda: gera código menor e mais rápido (menos checagens
  de `null`).
- **Extension types** (3.3) são **zero-cost**: wrappers sobre tipos primitivos
  sem alocação nem custo de runtime.

```dart
// BOM: tipo preciso, dispatch estático
int sum(List<int> xs) {
  var total = 0;
  for (final x in xs) total += x;
  return total;
}

// RUIM: dynamic força checagens e dispatch dinâmico
num sumBad(List xs) {
  num total = 0;
  for (final x in xs) total += x as num;
  return total;
}
```

## 6. Estruturas de dados e algoritmos

Primeiro o algoritmo (complexidade), depois a constante.

| Necessidade | Use | Evite |
|---|---|---|
| busca frequente | `Set`/`Map` (O(1)) | `List.contains` (O(n)) em loop |
| pares chave-valor | `Map` | lista de `MapEntry` |
| fila (FIFO) | `Queue`/`ListQueue` | `List.removeAt(0)` (O(n)) |
| número fixo de bytes | `Uint8List` | `List<int>` |
| deduplicação | `Set` | comparações aninhadas |
| ordenação estável | `List.sort` | reordenar repetidamente |

```dart
// RUIM: O(n²)
final vistos = <int>[];
for (final x in itens) {
  if (!vistos.contains(x)) vistos.add(x);
}

// BOM: O(n)
final vistos = <int>{};
for (final x in itens) {
  vistos.add(x);
}
```

- **Evite cópias desnecessárias** (`toList()` só ao precisar).
- Use `List.filled`/`List.generate` com `growable: false` quando o tamanho é fixo.
- Ordene uma vez, não a cada acesso.
- Cacheie resultados caros e idempotentes (com invalidação explícita).

## 7. Strings

- Concatenação em loop → **`StringBuffer`** (evita O(n²)).
- Interpolação `$x` é eficiente; evite `+` encadeado.
- **Compile `RegExp` uma vez** e reuse (fora do loop).
- `split`/`join` são O(n); reutilize listas quando possível.
- Para binário/UTF-8 use `utf8`/`typed_data`, não strings intermediárias.
- `characters` para grafemas (emoji), não `String.length`.

```dart
final emailRe = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.-]+$'); // compile uma vez
bool valid(String s) => emailRe.hasMatch(s);
```

## 8. Iterables e coleções

- Iterables são **lazy**: `map`/`where` não executam até serem consumidos.
- **Evite múltiplas passagens**: combine operações ou materialize uma vez.
- Prefira `for-in` a `forEach` com closure.
- `isEmpty`/`isNotEmpty` em vez de `.length == 0` (pode ser O(n)).
- `whereType<T>()` em vez de `where(...).cast<T>()` (um wrapper a menos).
- Evite `cast()` (checagem em cada operação); crie com o tipo certo.
- Use `fold`/`reduce` com cuidado; para somas grandes, evite closures.

```dart
// RUIM: duas passagens + wrappers
final evens = nums.where((e) => e.isEven).map((e) => e * 2).toList();

// BOM: uma passagem explícita quando é quente
final evens = <int>[];
for (final e in nums) {
  if (e.isEven) evens.add(e * 2);
}
```
> Só troque a forma funcional pela imperativa em hot paths comprovados —
> legibilidade também importa.

## 9. Concorrência e paralelismo

Dart é single-threaded por isolate. CPU-bound precisa de isolates.

```dart
// RUIM: bloqueia o event loop (UI/jank, servidor sem responder)
final parsed = jsonDecode(hugeJson);

// BOM: CPU-bound em isolate
final parsed = await Isolate.run(() => jsonDecode(hugeJson));
```

- Use `Isolate.run` para tarefas pontuais; `Isolate.spawn` para workers.
- Paralelize lotes: `Future.wait([...])` para I/O; pools de isolates para CPU.
- Evite enviar objetos grandes entre isolates (há cópia); use `TransferableTypedData`
  ou `Isolate.exit` para transferir memória.
- Não crie um isolate por item pequeno — o custo de spawn domina.
- Mantenha o event loop livre: nenhuma computação pesada síncrona.

## 10. Assincronismo e I/O

- **Nunca bloqueie** o event loop com `readAsStringSync`, loops longos, etc.
- **Paralelize I/O independente** com `Future.wait`.
- Use **streams** para grandes volumes (memória constante).
- Evite `await` sequencial quando as operações são independentes.

```dart
// RUIM: sequencial
final a = await fetchA();
final b = await fetchB();

// BOM: paralelo
final (a, b) = await (fetchA(), fetchB()).wait;
```

- Reutilize conexões (`HttpClient`/`http.Client` persistente), evite criar
  cliente por requisição.
- Faça buffering/streaming correto; evite ler arquivos inteiros grandes.
- Ajuste timeouts e concorrência (não sobrecarregue downstream).

## 11. Startup e tamanho

- **AOT** reduz startup (sem parse/JIT); prefira `dart compile exe`.
- **Deferred loading** reduz o inicial no web.
- Inicialização **lazy** (`late`, factory) para não pagar custo no startup.
- Evite trabalho no `main()`/top-level além do necessário.
- Reduza dependências: cada pacote aumenta binário e tempo de load.
- No web, `-O2` + tree shaking + `--no-source-maps`; considere Wasm para CPU.
- Nativo/FFI: `@RecordUse()` para tree-shaking de libs nativas (3.13).

## 12. Imutabilidade e `const`

- `const` canonicaliza instâncias: `identical(const A(), const A()) == true`.
- `const` evita alocações e permite otimizações; use em value objects.
- `final` evita reatribuições e facilita análise.
- Modelos imutáveis (com `copyWith`) são mais previsíveis e cacheáveis.

```dart
class Point {
  final int x, y;
  const Point(this.x, this.y);
}
const a = Point(1, 2);
const b = Point(1, 2);
print(identical(a, b)); // true
```

## 13. Benchmarks corretos

- Aqueça o JIT antes de medir (warm-up).
- Meça em **release** (AOT/`-O2`), não em debug.
- Use `package:benchmark_harness` para evitar dead-code elimination.
- Varie entradas (tamanho, distribuição) e teste casos de borda.
- Registre p50/p95, não só a média; considere variância.
- Compare com baseline e mantenha os benchmarks no CI (detecção de regressão).

## 14. Anti-patterns de performance

| Anti-pattern | Problema | Correção |
|---|---|---|
| `dynamic` no hot path | dispatch dinâmico, sem inlining | tipos precisos, `Object?` + `is` |
| `List.contains` em loop | O(n²) | `Set`/`Map` |
| `List.removeAt(0)` em loop | O(n²) | `Queue` |
| `+` em strings em loop | O(n²) | `StringBuffer` |
| `readAsStringSync` em servidor | bloqueia event loop | async/`await` |
| computação pesada no main isolate | jank/travamento | `Isolate.run` |
| `await` sequencial independente | latência somada | `Future.wait`/`.wait` |
| `cast()`/`where(...is...)` | wrappers/checagens extras | `whereType`, tipo na criação |
| `noSuchMethod`/`Function.apply` | impede otimização (web) | evite |
| `null` atribuído a variáveis | piora inferência | inicialize com valor concreto |
| cache sem limite | vazamento de memória | LRU/TTL |
| subscription não cancelada | vazamento | `cancel()`/`finally` |
| `RegExp` no loop | recompilação | compile uma vez |
| carregar arquivo inteiro | memória alta | streams |
| dependências supérfluas | binário/startup maiores | audite e remova |
| medir em debug | resultados falsos | meça em release |

## 15. Otimização por plataforma

### Servidor/CLI (nativo)
- `dart compile exe` para produção (AOT).
- Mantenha o event loop livre; I/O assíncrono; isolates para CPU.
- Reutilize clientes/sockets; pool de conexões.
- Perfil com DevTools; monitore memória e GC.

### Web
- `dart compile js -O2` (ou Wasm `-O2`); evite `-O3/-O4` sem testes.
- Deferred loading para telas raras; tree shaking cuida do resto.
- Minimize bridge JS↔Dart (interop tem custo); converta dados em lote.
- Evite `Function.apply`/`noSuchMethod`; tipos consistentes.
- Remova source maps do deploy público.
- Wasm tende a ser mais rápido que JS para cargas de CPU.

### Dispositivos/Flutter (contexto Dart)
- Mova trabalho pesado para `compute()`/`Isolate.run`.
- Evite rebuilds/alocações no frame; use `const` widgets.
- Perf profiling com DevTools (CPU/UI/Raster).

## 16. Checklist de performance

- [ ] Métrica e baseline definidas; gargalo identificado por profiler.
- [ ] Produção compilada em AOT/`-O2` (nunca debug).
- [ ] Sem `dynamic`/`noSuchMethod`/`Function.apply` em hot paths.
- [ ] Algoritmos com complexidade adequada; `Set`/`Map`/`Queue` no lugar certo.
- [ ] Sem concatenação de string em loop; sem alocação supérflua.
- [ ] Computação pesada em isolates; I/O independente em paralelo.
- [ ] `const`/`final` e imutabilidade onde possível.
- [ ] Streams para grandes volumes; recursos fechados.
- [ ] `RegExp` e outras inicializações fora de loops.
- [ ] Web: `-O2`, deferred loading, source maps removidos, interop mínimo.
- [ ] Benchmarks com warm-up e comparação antes/depois.
- [ ] Regressões de performance cobertas no CI.

## 17. Resumo executivo

1. **Meça** (DevTools/benchmarks), otimize o gargalo, meça de novo.
2. **Compile para produção** (AOT / `-O2`) e cuide do startup.
3. **Reduza alocações** e pressão de GC; use `const`, `typed_data`, buffers.
4. **Escolha a estrutura certa** (Set/Map/Queue) e o algoritmo certo.
5. **Paralelize** com isolates (CPU) e `Future.wait` (I/O).
6. **Não bloqueie** o event loop.
7. **Web**: tree shaking, deferred loading, `-O2`, interop enxuto.
8. **Evite os anti-patterns** conhecidos do compilador.
