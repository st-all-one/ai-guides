# 12 — Segurança

## 1. Filosofia

A estratégia de segurança do Flutter se apoia em cinco pilares:

- **Identify** — identificar ativos, ameaças e vulnerabilidades.
- **Detect** — varredura de vulnerabilidades, SAST, fuzzing.
- **Protect** — mitigar vulnerabilidades conhecidas.
- **Respond** — processos de reporte, triagem e resposta.
- **Recover** — conter e recuperar de incidentes.

Reporte vulnerabilidades do Flutter em <https://g.co/vulnz> (o time responde em até 5 dias úteis). Atualizações de segurança são publicadas para a branch `stable`.

## 2. Higiene de dependências e SDK

- **Mantenha o Flutter atualizado.** Releases corrigem defeitos de segurança.
- **Mantenha as dependências atualizadas.** Evite fixar versões; verifique atualizações de segurança periodicamente.
- Não use forks privados/desatualizados do Flutter — eles ficam para trás em correções.
- Revise pacotes antes de adicionar: mantenimento, licença, permissões, tamanho da dependência transitiva.
- `flutter pub outdated` / `flutter pub upgrade` regularmente.
- Use `flutter analyze`, `dart fix` e scanners de dependência no CI.

> A cadeia de suprimentos é um vetor real: um pacote malicioso ou abandonado pode comprometer o app.

## 3. Obfuscação de código

- Obfuscate renomeia símbolos do código Dart compilado, dificultando engenharia reversa.
- Funciona **somente em release build**; não criptografa recursos nem impede engenharia reversa.
- Web não suporta obfuscação; usa minificação.

```console
flutter build apk \
  --obfuscate \
  --split-debug-info=out/android
```

Alvos suportados: `aar`, `apk`, `appbundle`, `ios`, `ios-framework`, `ipa`, `linux`, `macos`, `macos-framework`, `windows`.

- Gere e **faça backup do arquivo SYMBOLS** (ou PDB no Windows x64). Sem ele, stack traces de crash são ilegíveis.
- Desofusque stack traces:

```console
flutter symbolize -i stack-trace.txt -d out/android/app.android-arm64.symbols
```

- Gere mapa de obfuscação JSON com `--extra-gen-snapshot-options=--save-obfuscation-map=out/android/map.json`.
- **Cuidados:** código que depende de nomes de classe/função (ex.: `expect(foo.runtimeType.toString(), 'Foo')`) quebra; nomes de enum não são ofuscados.
- Envie os SYMBOLS ao serviço de crash reporting para desofuscar relatórios.

## 4. Segredos

> **É uma prática de segurança ruim armazenar segredos no app.** O binário é distribuído ao usuário e pode ser inspecionado.

- Nunca coloque chaves de API, tokens de serviço, senhas ou certificados privados no código, em assets, no `pubspec.yaml` ou em `--dart-define`.
- `--dart-define` é **público** no binário — use apenas para configuração não sensível (URLs, flags).
- Segredos de verdade ficam no **backend**; o app chama o backend, que detém as credenciais.
- Para chaves de serviços (ex.: Firebase AI Logic), use SDKs que mantêm chaves fora do código.
- Não logue segredos/PII (ver `10`).
- Rotacione credenciais vazadas imediatamente.

## 5. Armazenamento seguro no dispositivo

- **Nunca** use `shared_preferences` para tokens/senhas (texto claro).
- Use `flutter_secure_storage` (Keychain no iOS/macOS, Keystore/EncryptedSharedPreferences no Android) para credenciais.
- Chaves de criptografia devem ser gerenciadas pelo Keystore/Keychain, não embutidas.
- Prefira **tokens de curta duração** + refresh; armazene refresh tokens com segurança.
- Limpe dados sensíveis ao fazer logout.
- Para bancos locais com dados sensíveis, considere criptografia (ex.: SQLCipher).

## 6. Rede

- **Sempre HTTPS** (TLS). Nunca HTTP puro em produção.
- Não desabilite a validação de certificados.
- Considere **certificate pinning** para APIs críticas (mitiga MITM em redes hostis); pese a manutenção e o risco de quebrar com rotação de certificado.
- Valide **status codes**, esquema e host; não confie cegamente em redirecionamentos.
- Trate timeouts e erros sem vazar detalhes internos ao usuário.
- Evite enviar PII desnecessária; minimize telemetria.
- Cuidado com `WebView`: desabilite JavaScript/`file://` quando não precisar, valide URLs carregadas, restrinja navegação.

## 7. Entrada e deep links

- **Valide toda entrada** do usuário, de deep links, de `MethodChannel` e de arquivos.
- Deep links: valide parâmetros e hosts; use `redirect` para exigir autenticação; rejeite URLs inesperadas.
- Sanitize dados antes de exibir (evite injeção de HTML/JS em WebViews).
- Em SQL, use **parâmetros** (`whereArgs`), nunca interpole strings:

```dart
await db.delete('todo', where: '_id = ?', whereArgs: [id]); // seguro
// NUNCA: where: '_id = $id'
```

- Trate JSON externo como não confiável; valide tipos e campos obrigatórios (`@JsonKey(required: true)`).

## 8. Conteúdo sensível na tela

O widget `SensitiveContent` (Android API 35+) impede que telas com dados sensíveis sejam projetadas/gravadas durante compartilhamento de mídia.

```dart
SensitiveContent(
  sensitivity: ContentSensitivity.sensitive,
  child: MySensitiveContent(),
);
```

- Se **qualquer** `SensitiveContent` for `sensitive`, a tela inteira é obscurecida na projeção.
- Não tem efeito em versões inferiores ou outras plataformas.
- No iOS, considere obscurecer conteúdo em app switcher (`applicationWillResignActive`/`BlurView`).

## 9. Assinatura e keystore (Android)

- Assine releases com **upload key**; use **Play App Signing** para a app signing key.
- Crie o upload keystore e **nunca** o versione:

```console
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- `android/key.properties` referencia o keystore; **não** commite (adicione ao `.gitignore`).
- Armazene senhas em um cofre de segredos do CI, não em texto claro.
- Considere **post-quantum cryptography (PQC) hybrid signing** (Android 17+), conforme a doc oficial de deploy.
- Mantenha `R8`/minificação habilitados em release.

## 10. Permissões e plataforma

- Declare **apenas** as permissões necessárias (princípio do menor privilégio).
- Explique ao usuário por que cada permissão é necessária e trate a recusa graciosamente.
- Revise o `AndroidManifest.xml` e o `Info.plist` antes do release.
- Em iOS, `ATS` exige HTTPS; evite exceções.
- Habilite entitles mínimos (ex.: rede) apenas quando necessário.

## 11. Proteção contra engenharia reversa e integridade

- Obfuscação + `--split-debug-info` elevam o custo de reversão (não impedem).
- Considere detecção de root/jailbreak para apps de alto risco (com trade-offs de UX).
- Valide a integridade do servidor (cert pinning, atestação) para operações críticas.
- Não confie em validações apenas no cliente: **regras de negócio sensíveis devem ser validadas no backend**.

## 12. Privacidade e dados

- Minimize coleta; colete só o necessário.
- Informe e obtenha consentimento (LGPD/GDPR/CCPA).
- Criptografe dados sensíveis em repouso e em trânsito.
- Anonimize telemetria; evite IDs persistentes desnecessários.
- Defina política de retenção e permita exclusão de dados.

## 13. Segurança em apps com IA

- Trate saída de LLM como **não confiável**: valide, sanitize e ofereça correção ao usuário.
- Construa **guardrails** (validação de esquema, testes) em torno de dados gerados por IA.
- Mantenha chaves de API no backend/SDK seguro.
- Cuidado com **prompt injection** em conteúdo do usuário; separe instruções de dados.

## 14. Checklist de segurança

- [ ] SDK e dependências atualizados; nenhum pacote abandonado
- [ ] Sem segredos no código/assets/`--dart-define`
- [ ] HTTPS obrigatório; sem desabilitar validação TLS
- [ ] Tokens em secure storage; logout limpa dados
- [ ] Release ofuscado (`--obfuscate` + `--split-debug-info`), SYMBOLS guardados
- [ ] Keystore/`key.properties` fora do versionamento
- [ ] Permissões mínimas e justificadas
- [ ] Validação de entrada/deep links; SQL parametrizado
- [ ] Conteúdo sensível protegido (`SensitiveContent`, app switcher)
- [ ] Crash reporting ativo e com SYMBOLS
- [ ] Regras de negócio críticas validadas no backend
- [ ] `flutter analyze` e scanners de dependência no CI
