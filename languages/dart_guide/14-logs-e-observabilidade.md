# 14 — Logs e observabilidade

## 1. Por que logar

Logs servem para **depurar**, **monitorar** e **entender comportamento** em
diferentes ambientes. Logs bem estruturados permitem filtrar por severidade,
correlacionar eventos e auditar. `print()` não serve para produção (sem
níveis, sem timestamp, sem destino configurável).

## 2. `package:logging` (padrão da comunidade)

```yaml
dependencies:
  logging: ^1.2.0
```

```dart
import 'package:logging/logging.dart';

final _log = Logger('meu_app.pagamentos');

void main() {
  Logger.root.level = Level.INFO;
  Logger.root.onRecord.listen((record) {
    print('[${record.time.toIso8601String()}] '
        '${record.level.name} ${record.loggerName}: ${record.message}'
        '${record.error != null ? ' | ${record.error}' : ''}'
        '${record.stackTrace != null ? '\n${record.stackTrace}' : ''}');
  });

  _log.fine('detalhe de depuração');
  _log.info('iniciado');
  _log.warning('configuração ausente');
  _log.severe('falha ao conectar', exception, stackTrace);
}
```

### Níveis
`Level.ALL` > `FINE` > `CONFIG` > `INFO` > `WARNING` > `SEVERE` > `SHOUT` >
`Level.OFF`. Configure `Logger.root.level` para filtrar.

### Hierarquia
```dart
hierarchicalLoggingEnabled = true;
final app = Logger('app');
final db = Logger('app.db'); // herda configuração de 'app'
```
Útil para habilitar/desabilitar subsistemas.

### Loggers nomeados por contexto
```dart
final log = Logger('meu_app.$runtimeType');
```

## 3. Logger com arquivo (CLI/servidor)

```dart
import 'dart:io';
import 'package:logging/logging.dart';

Logger initFileLogger(String name) {
  hierarchicalLoggingEnabled = true;
  final logger = Logger(name);
  final now = DateTime.now();
  final dir = Directory('logs')..createSync(recursive: true);
  final file = File('${dir.path}/${now.year}_${now.month}_${now.day}_$name.txt');

  logger.level = Level.ALL;
  logger.onRecord.listen((record) {
    final msg = '[${record.time} - ${record.loggerName}] '
        '${record.level.name}: ${record.message}';
    file.writeAsStringSync('$msg\n', mode: FileMode.append);
  });
  return logger;
}
```

- Em produção, use `Level.INFO`/`Level.WARNING`, não `ALL`.
- Para logs rotativos/estruturados, prefira `package:logging` + destino externo
  ou um logger de produção (`package:logger`, `sentry`, OpenTelemetry).
- Injeção de dependência: passe o `Logger` (não crie global).

```dart
class SearchCommand {
  SearchCommand({required this.logger});
  final Logger logger;

  Future<void> run() async {
    try {
      final results = await search(query);
      logger.info('busca ok: ${results.length} resultados');
    } on HttpException catch (e, s) {
      logger.warning('busca falhou', e, s);
    } on FormatException catch (e, s) {
      logger.warning('resposta inválida', e, s);
    }
  }
}
```

## 4. `dart:developer` (integração com DevTools)

```dart
import 'dart:developer' as dev;

dev.log(
  'usuário autenticado',
  name: 'auth',
  level: 800,                // 800 info, 900 warning, 1000 severe
  error: exception,
  stackTrace: stackTrace,
);

final task = dev.TimelineTask()..start('importação');
// ... trabalho ...
task.finish();

final result = dev.Timeline.timeSync('cálculo', () => heavy());
```

- Visível no **Dart DevTools** (Observatory/DevTools).
- Excelente em desenvolvimento; não substitui log estruturado de produção.
- `dev.inspect(obj)` explora objetos em tempo de execução.

## 5. Log estruturado (JSON)

Para sistemas de observabilidade (ELK, Datadog, Cloud Logging), emita JSON:

```dart
import 'dart:convert';

void logStructured(Logger log, Level level, String message, {
  Map<String, Object?> context = const {},
  Object? error,
  StackTrace? stack,
}) {
  final payload = {
    'timestamp': DateTime.now().toUtc().toIso8601String(),
    'level': level.name,
    'message': message,
    'context': context,
    if (error != null) 'error': error.toString(),
    if (stack != null) 'stack': stack.toString(),
  };
  log.log(level, jsonEncode(payload));
}
```
- Sempre inclua **correlação** (request id, trace id, user id anonimizado).
- Nunca logue objetos inteiros de dados sensíveis.

## 6. O que NUNCA logar (redaction)

- Senhas, tokens, chaves de API, cookies, `Authorization` headers.
- PII: CPF, e-mail, telefone, dados de cartão, localização precisa.
- Corpos de requisição completos com dados sensíveis.
- Stack traces com dados embutidos exibidos ao usuário.

```dart
String redact(String value) {
  if (value.length <= 4) return '***';
  return '${value.substring(0, 2)}***${value.substring(value.length - 2)}';
}

log.info('login user=${redact(email)} token=${redact(token)}');
```

## 7. Níveis e quando usar

| Nível | Uso |
|---|---|
| `FINE`/`FINEST` | depuração detalhada (desligado em prod) |
| `INFO` | eventos de negócio, início/fim, estado |
| `WARNING` | situação inesperada, recuperável |
| `SEVERE`/`SHOUT` | falha que requer atenção/erro de aplicação |
| `OFF` | desliga logging |

Regra: se outra pessoa precisa agir, é `WARNING`+; se é rastreamento, `INFO`.

## 8. Erros e stack traces

```dart
try {
  await risky();
} catch (e, s) {
  log.severe('falha em risky()', e, s); // sempre com stack trace
  rethrow; // se não puder tratar totalmente
}
```
- Preserve stack traces (`rethrow`).
- Agrupe erros por tipo e mensagem para reduzir ruído.
- Use um error tracker (Sentry, Crashlytics) em produção para agregação.

## 9. Observabilidade além de logs

- **Métricas**: contadores, histogramas (latência, throughput).
- **Tracing**: OpenTelemetry (`package:opentelemetry`), spans por operação.
- **Saúde**: endpoints `/health`, readiness/liveness.
- **DevTools**: CPU, memória, isolates, timeline, alocação.
- **Crash reporting**: agregação, deduplicação, alertas.

## 10. Boas práticas

- Um logger por componente, nomeado (`Logger('app.db')`).
- Configure nível e destino por ambiente (dev vs prod).
- Logs assíncronos e sem bloquear o event loop; cuidado com I/O síncrono.
- Não use `print()` em bibliotecas; use `logging` ou injeção.
- Nunca logue segredos/PII; redija sempre.
- Inclua contexto estruturado e id de correlação.
- Evite logar em loop apertado (custo e ruído); agregue.
- Não use `catch` só para logar e engolir; logue e trate/rethrow.
- Em CLI, escreva logs em `stderr` e resultado em `stdout`.
- Limpe/rotacione arquivos de log.

## 11. Exemplo integrado (CLI)

```dart
import 'dart:io';
import 'package:logging/logging.dart';

Future<void> main(List<String> args) async {
  final log = initFileLogger('app');
  try {
    log.info('iniciando com ${args.length} argumentos');
    final result = await runApp(args);
    stdout.writeln(result);
    log.info('concluído com sucesso');
  } on FormatException catch (e, s) {
    log.warning('entrada inválida', e, s);
    stderr.writeln(e.message);
    exitCode = 64;
  } on Exception catch (e, s) {
    log.severe('falha inesperada', e, s);
    stderr.writeln('Erro inesperado. Consulte os logs.');
    exitCode = 70;
  }
}
```
