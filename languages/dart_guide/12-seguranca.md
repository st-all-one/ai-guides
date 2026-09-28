# 12 — Segurança em Dart

> Baseado na página oficial de segurança do Dart e nas boas práticas de
> dependências, entradas, criptografia, servidor e web. Complementa o guia
> web de segurança do repositório (`web/web_security_guide`).

## 1. Filosofia e processo do time Dart

Cinco pilares: **Identify, Detect, Protect, Respond, Recover**.

- Reporte vulnerabilidades em <https://g.co/vulnz> (Google Security Team,
  resposta em até 5 dias úteis). Coordenação nos repositórios `dart-lang`,
  incl. GitHub Security Advisories.
- O time publica correções de segurança para a release **stable** mais recente
  (nível de prioridade P0). Sem bug bounty.
- Avisos na lista `dart-announce`.

Boas práticas oficiais:
- **Mantenha o SDK atualizado** (correções de segurança saem em patch/beta).
- **Mantenha dependências atualizadas**; evite pins rígidos e revise
  periodicamente os advisories.

## 2. Segurança de dependências

```bash
dart pub outdated          # dependências desatualizadas
dart pub upgrade           # atualiza dentro das faixas
dart pub deps              # árvore de dependências
dart pub get               # avisa sobre advisories (GitHub Advisory Database)
```

- Prefira faixas `^x.y.z`; evite `any` e pins exatos rígidos.
- Revise publishers verificados, popularidade e manutenção do pacote.
- Não importe `lib/src/` de terceiros (API não suportada, pode mudar/ conter
  código não auditado exposto).
- Audite a árvore de dependências transitivas; menos dependências = menor
  superfície de ataque.
- Use `dependency_overrides` só temporariamente e de forma consciente.
- Monitore advisories (GitHub Advisory Database) e atualize.
- Suppressão de advisory só com avaliação explícita:
  ```yaml
  ignored_advisories:
    - GHSA-xxxx-xxxx-xxxx
  ```

## 3. Validação de entrada (nunca confie no cliente)

Valide **todo** dado externo: HTTP, CLI, arquivos, variáveis de ambiente,
mensagens de isolate, JSON.

```dart
// Tipos + faixa, não apenas presença
int parsePort(Object? raw) {
  final n = switch (raw) {
    int v => v,
    String v => int.tryParse(v) ?? (throw FormatException('porta inválida', v)),
    _ => throw FormatException('tipo inválido'),
  };
  if (n < 1 || n > 65535) throw RangeError.range(n, 1, 65535, 'port');
  return n;
}

// JSON: converta cedo para tipos precisos
final Map<String, dynamic> json =
    (jsonDecode(body) as Map).cast<String, dynamic>();
final name = json['name'];
if (name is! String) throw const FormatException('name ausente');
```

- Prefira `Object?` + `is`/patterns a `dynamic` (ver `02`).
- Use `Uri`/`Uri.parse` para URLs; `package:path` para caminhos.
- **Path traversal**: normalize e rejeite `..`; confirme que o caminho final
  está sob o diretório permitido.
- **Headers/host**: valide `Host`, `Origin`, `Content-Type`, tamanho de corpo.
- **Limite recursos**: tamanho de payload, timeout, profundidade de JSON,
  número de conexões (DoS).

```dart
// Prevenção de path traversal
String safeJoin(String baseDir, String untrusted) {
  final base = Directory(baseDir).absolute.resolveSymbolicLinksSync();
  final candidate = File('$base/$untrusted').absolute;
  final resolved = candidate.resolveSymbolicLinksSync();
  if (!resolved.startsWith('$base/')) {
    throw ArgumentError('path fora do diretório permitido: $untrusted');
  }
  return resolved;
}
```

## 4. Criptografia

Use bibliotecas auditadas — nunca implemente primitivas.

```yaml
dependencies:
  crypto: ^3.0.0            # hashes/HMAC (sha256, hmac)
  cryptography: ^2.7.0      # AES-GCM, Chacha20, Ed25519, X25519, PBKDF2/Argon2
  pointycastle: ^3.9.0      # opções adicionais (RSA, etc.)
```

```dart
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

// Hash/HMAC para integridade e comparações
final digest = sha256.convert(utf8.encode('mensagem'));
final mac = Hmac(sha256, keyBytes).convert(data);

// Comparação em tempo constante (evita timing attacks)
bool constantTimeEquals(List<int> a, List<int> b) {
  if (a.length != b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff == 0;
}

// Aleatoriedade segura
final rand = Random.secure();
final token = base64Url.encode(List.generate(32, (_) => rand.nextInt(256)));
```

- **Senhas**: armazene com KDF (Argon2id, PBKDF2, bcrypt/scrypt) e salt único;
  nunca MD5/SHA-1/SHA-256 puro como armazenamento de senha.
- **Simétrico**: AES-GCM/ChaCha20-Poly1305 (autenticados) com nonce único.
- **Assimétrico**: Ed25519/X25519 (ou RSA-OAEP com padding adequado).
- **TLS**: verifique certificados (padrão em `HttpClient`/`package:http`); nunca
  desabilite sem justificativa forte.
- **`Random()` não é seguro**: use `Random.secure()` para tokens;
  `package:cryptography` para chaves.
- **Segredos**: carregue de variáveis de ambiente/secret manager; nunca no
  código, binário ou repositório.

```dart
// Chave/senha de ambiente
final dbPassword = Platform.environment['DB_PASSWORD'];
if (dbPassword == null || dbPassword.isEmpty) {
  throw StateError('DB_PASSWORD não configurada');
}
```

## 5. Segredos e configuração

- Nunca versione `.env`, chaves, tokens, certificados privados.
- `.gitignore` deve excluir segredos; `pub publish` respeita `.gitignore`.
- Use secret managers (GCP Secret Manager, AWS Secrets Manager, Vault).
- Não logue segredos, tokens, senhas, PII (ver `14`).
- Rotacione credenciais; use tokens de curta duração/OIDC quando possível.
- Prefira identidades de workload (OIDC) a chaves estáticas no CI.

## 6. Servidor (`dart:io`, `shelf`, `dart_frog`)

```dart
// Headers de segurança e limites
server.defaultResponseHeaders
  ..add('X-Content-Type-Options', 'nosniff')
  ..add('X-Frame-Options', 'DENY')
  ..add('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

- Rode atrás de TLS (reverse proxy ou `HttpServer.bindSecure` com
  `SecurityContext`).
- Valide e limite o corpo da requisição; aplique timeouts.
- Nunca exponha stack traces ao cliente; registre internamente.
- Use consultas parametrizadas em bancos (evite interpolação de SQL).
- Aplique princípios de menor privilégio e defesa em profundidade.
- Rate limiting e quotas por IP/usuário.
- Atualize dependências; rode o servidor com usuário sem privilégios.

```dart
// Exemplo de limite de tamanho
Future<List<int>> readLimited(HttpRequest req, {int maxBytes = 1 << 20}) async {
  final bytes = <int>[];
  await for (final chunk in req) {
    bytes.addAll(chunk);
    if (bytes.length > maxBytes) {
      throw HttpException('payload muito grande');
    }
  }
  return bytes;
}
```

## 7. Web

- **CSP**, **HSTS**, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, CORS restritivo.
- Prevenção de **XSS**: nunca injete dados não confiáveis em HTML;
  prefira APIs DOM seguras (`textContent`) e frameworks que escapam.
- **CSRF**: tokens sincronizados/`SameSite` cookies.
- **Cookies**: `Secure`, `HttpOnly`, `SameSite=Lax|Strict`.
- **SRI** ao carregar scripts de terceiros.
- Compile com `dart compile js`/`wasm` e sirva por HTTPS.
- Evite libs legadas (`dart:html`, `package:js`); use `dart:js_interop` +
  `package:web`.
- Fique atento ao **prompt injection** se usar AI/ferramentas.

## 8. FFI e código nativo

- FFI burla a segurança de memória do Dart: um bug em C pode corromper o heap.
- Valide tamanhos/ponteiros antes de passar ao nativo; use `Allocator`.
- Prefira bindings gerados (`ffigen`) e mantenha a superfície mínima.
- Nunca passe dados sensíveis sem necessidade; limpe buffers.
- Trate sinais/erros do nativo e valide `NULL`.

## 9. Segurança em build/distribuição

- Compile em ambiente limpo e reprodutível (CI).
- Use `dart compile exe`/`aot-snapshot`; proteja artefatos e assinaturas.
- Não embuta segredos em binários — eles são extraíveis.
- Verifique checksums/assinaturas de dependências e artefatos.
- Mantenha o SDK atualizado para receber correções (incl. memória nativa).

## 10. Checklist de segurança

- [ ] SDK e dependências atualizados; advisories monitorados.
- [ ] Entradas externas validadas (tipo, faixa, tamanho, formato).
- [ ] Path traversal e injeções prevenidas.
- [ ] Criptografia com bibliotecas auditadas; KDF para senhas.
- [ ] Segredos fora do código; carregados de secret manager.
- [ ] Logs sem segredos/PII.
- [ ] TLS verificado; headers de segurança aplicados.
- [ ] Limites de recursos (timeout, payload, rate limit).
- [ ] Erros não vazam detalhes ao cliente.
- [ ] FFI isolado, validado e minimizado.
- [ ] `.gitignore` protege segredos; nada sensível versionado.
- [ ] Testes de segurança (fuzzing, análise estática, revisão).
