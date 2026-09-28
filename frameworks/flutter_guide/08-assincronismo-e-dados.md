# 08 — Assincronismo, rede e dados

## 1. Fundamentos

- **`Future<T>`**: valor único que chega (ou erro) no futuro.
- **`Stream<T>`**: sequência de valores ao longo do tempo.
- `async`/`await` suspendem a função sem bloquear a thread.
- A main isolate processa eventos (input, frames). Trabalho pesado deve ir para outra isolate.

```dart
Future<Album> fetchAlbum(http.Client client) async {
  final response = await client.get(Uri.parse('https://api.exemplo.com/albums/1'));
  if (response.statusCode == 200) {
    return Album.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }
  throw Exception('Falha ao carregar álbum');
}
```

### `FutureBuilder` e `StreamBuilder`

```dart
FutureBuilder<Album>(
  future: futureAlbum,
  builder: (context, snapshot) {
    if (snapshot.hasData) return Text(snapshot.data!.title);
    if (snapshot.hasError) return Text('${snapshot.error}');
    return const CircularProgressIndicator();
  },
);
```

- `AsyncSnapshot` expõe `hasData`, `hasError`, `connectionState`.
- Crie o `Future` uma vez (ex.: em `initState`), não dentro do `build` (senão refaz a cada rebuild).

## 2. Rede

### Pacote `http`

```console
flutter pub add http
```

```dart
import 'package:http/http.dart' as http;

Future<List<Item>> buscarItens(http.Client client) async {
  final res = await client.get(Uri.parse('$baseUrl/itens'));
  if (res.statusCode != 200) throw HttpException('HTTP ${res.statusCode}');
  final data = jsonDecode(res.body) as List<dynamic>;
  return data.map((e) => Item.fromJson(e as Map<String, dynamic>)).toList();
}
```

- **Injete o `http.Client`** na função/classe: permite mockar em testes e trocar implementação (IO vs Browser).
- Sempre verifique `statusCode`; trate timeouts com `.timeout(Duration(...))`.
- Feche o cliente quando não usar mais (`client.close()`).

### Permissões de plataforma

- **Android:** declare `<uses-permission android:name="android.permission.INTERNET" />` no `AndroidManifest.xml`.
- **macOS:** habilite `com.apple.security.network.client` nos `.entitlements`.
- **iOS:** ATS já permite HTTPS; HTTP puro exige exceção explícita (evite).

### Segurança de rede

- Use **sempre HTTPS**.
- Não desabilite validação de certificado. Considere **certificate pinning** para APIs críticas.
- Nunca coloque chaves de API no cliente — use um backend intermediário.

## 3. JSON e serialização

### Manual (`dart:convert`)

Bom para protótipos; não escala (sem tipagem, erros em runtime).

```dart
final userMap = jsonDecode(jsonString) as Map<String, dynamic>;
final user = User.fromJson(userMap);

class User {
  User(this.name, this.email);
  final String name;
  final String email;

  User.fromJson(Map<String, dynamic> json)
      : name = json['name'] as String,
        email = json['email'] as String;

  Map<String, dynamic> toJson() => {'name': name, 'email': email};
}
```

### Geração de código (`json_serializable`)

Recomendado para projetos médios/grandes: erros de campo viram erro de compilação.

```console
flutter pub add json_annotation dev:build_runner dev:json_serializable
```

```dart
import 'package:json_annotation/json_annotation.dart';
part 'user.g.dart';

@JsonSerializable()
class User {
  User(this.name, this.email);
  final String name;
  final String email;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
```

```console
dart run build_runner build --delete-conflicting-outputs
dart run build_runner watch --delete-conflicting-outputs
```

Anotações úteis:

```dart
@JsonKey(name: 'registration_date_millis') final int registrationDateMillis;
@JsonKey(defaultValue: false) final bool isAdult;
@JsonKey(required: true) final String id;
@JsonKey(ignore: true) final String verificationCode;

@JsonSerializable(fieldRename: FieldRename.snake)   // snake_case global
```

- Para classes aninhadas, use `@JsonSerializable(explicitToJson: true)`.
- `freezed` combina imutabilidade + JSON.
- **Sem reflexão em runtime** (tree shaking é incompatível): não existe equivalente a GSON/Jackson.

## 4. Parsing em background (isolates)

Para JSONs grandes, decodifique fora da main isolate:

```dart
Future<List<Photo>> getPhotos() async {
  final jsonString = await rootBundle.loadString('assets/photos.json');
  return Isolate.run<List<Photo>>(() {
    final data = jsonDecode(jsonString) as List<Object?>;
    return data.cast<Map<String, Object?>>().map(Photo.fromJson).toList();
  });
}
```

- `Isolate.run` cria, executa e encerra a isolate; mensagens mutáveis são copiadas.
- `compute` é o equivalente portável (no web roda na main thread).
- Use para: banco local, notificações, arquivos grandes, processamento de mídia, FFI assíncrono.
- **Limitações:** sem `rootBundle`/`dart:ui` em isolates; no web não há isolates; plugins de background usam `BackgroundIsolateBinaryMessenger`.

## 5. Persistência

### Key-value (`shared_preferences`)

Para configurações simples, flags, tema.

```dart
class SharedPreferencesService {
  static const _kDarkMode = 'darkMode';

  Future<void> setDarkMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kDarkMode, value);
  }

  Future<bool> isDarkMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_kDarkMode) ?? false;
  }
}
```

> `shared_preferences` **não é** para segredos. Para tokens/senhas, use `flutter_secure_storage` (Keychain/Keystore) — ver `12`.

### SQL (`sqflite` / `drift`)

Para dados relacionais/consultas complexas.

```dart
Future<void> open() async {
  _database = await databaseFactory.openDatabase(
    join(await databaseFactory.getDatabasesPath(), 'app_database.db'),
    options: OpenDatabaseOptions(
      version: 1,
      onCreate: (db, _) => db.execute(
        'CREATE TABLE todo(_id INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT)',
      ),
    ),
  );
}
```

- Defina nomes de tabela/coluna como constantes para evitar typos.
- Use `where: '$_idColumnName = ?', whereArgs: [id]` — **nunca** interpole valores (SQL injection).
- No desktop, use `databaseFactoryFfi` (`sqflite_common_ffi`); web não suporta `sqflite`.
- `drift` oferece queries type-safe com geração de código.

### Arquitetura de persistência

Sempre em duas camadas:

- **Service** (`SharedPreferencesService`, `DatabaseService`): esconde o plugin de terceiros, faz IO.
- **Repository** (`ThemeRepository`, `TodoRepository`): fonte da verdade, trata erros, expõe `Result`/`Stream`.

```dart
class ThemeRepository {
  ThemeRepository(this._service);
  final SharedPreferencesService _service;
  final _controller = StreamController<bool>.broadcast();

  Future<Result<bool>> isDarkMode() async {
    try { return Result.ok(await _service.isDarkMode()); }
    on Exception catch (e) { return Result.error(e); }
  }

  Future<Result<void>> setDarkMode(bool value) async {
    try {
      await _service.setDarkMode(value);
      _controller.add(value);
      return Result.ok(null);
    } on Exception catch (e) { return Result.error(e); }
  }

  Stream<bool> observeDarkMode() => _controller.stream;
}
```

## 6. Padrões de dados

### Offline-first

- Leia do **local** primeiro e emita via `Stream`; busque do servidor e atualize o local.
- Use dados locais como fallback quando a rede falha.
- Escreva localmente e sincronize depois (fila/flag de sincronização).
- Sincronize com cuidado: evite sobrescrever alterações locais; versionamento/timestamps ajudam.

### Estado otimista

- Atualize a UI imediatamente, assumindo sucesso; reverta se a operação falhar.
- Mantenha o estado anterior para rollback; trate erros e mostre feedback.
- Ideal para botões de "curtir", "seguir", "adicionar ao carrinho".

### `Result` em toda a camada de dados

Services e repositories retornam `Result<T>` (ver `06`), forçando o ViewModel a tratar sucesso e erro.

## 7. Boas práticas

- Crie `Future`/`Stream` fora do `build`.
- Injete clientes HTTP e dependências.
- Converta JSON em modelos tipados imediatamente.
- Trate erros de rede (timeout, offline, HTTP 4xx/5xx) com mensagens úteis.
- Nunca bloqueie a main thread.
- Sem segredos no cliente.
- Considere cache, retry com backoff e cancelamento.
- Cancele subscrições de `Stream` em `dispose`.
- Teste serviços com mocks e repositories com fakes.
