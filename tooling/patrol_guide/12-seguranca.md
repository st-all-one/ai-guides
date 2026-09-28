# 12 — Segurança

> Testes E2E tocam credenciais, dados de produção e o SO. Este arquivo cobre segredos, isolamento, permissões, assinatura e cadeia de suprimentos.

## Segredos e credenciais

**Nunca** versione dados sensíveis nem os coloque no código do teste.

- Use `--dart-define`:

```console
patrol test --dart-define 'USERNAME=Bartek' --dart-define 'PASSWORD=ny4ncat'
```

- Ou `.patrol.env` na raiz (aceita comentários com `#`, inline ou em linha própria):

```
# Credenciais locais — NÃO versionar
EMAIL=user@example.com
PASSWORD=ny4ncat # senha da API
```

- Leia com `String.fromEnvironment`, sempre `const` (por [flutter#55870](https://github.com/flutter/flutter/issues/55870)):

```dart
await $(#nameTextField).enterText(const String.fromEnvironment('USERNAME'));
await $(#passwordTextField).enterText(const String.fromEnvironment('PASSWORD'));
```

### `.gitignore` obrigatório

```
**/test_bundle.dart
.patrol.env
```

O `test_bundle.dart` é gerado pela CLI e pode conter caminhos/config. `.patrol.env` costuma conter segredos.

## Isolamento entre testes

Estado residual entre testes gera resultados falsos e vazamento de dados.

- **Android**: `testInstrumentationRunnerArguments["clearPackageData"] = "true"` limpa os dados do app entre execuções (também passável por `--environment-variables clearPackageData=true` no gcloud).
  - Atenção: limpa os dados do **seu app**, não de terceiros (ex.: Chrome).
- **iOS Simulator**: `patrol test --full-isolation` (experimental; pode ser removido).

Isso também estabiliza ambientes onde o app guarda sessão/token entre testes.

## Permissões

- Prefira conceder/negar pela automação (`grantPermissionWhenInUse`, `denyPermission`) em vez de tocar cegamente na UI.
- Trate o caso "já concedida" (`isPermissionDialogVisible`) para não falhar em reexecuções locais.
- Em iOS, o idioma do device precisa ser inglês para o tratamento automático; caso contrário, faça o fluxo manual.
- Permissões sensíveis via Settings variam por SO/OEM — trate edge cases.
- Em Android, todas as permissões vêm concedidas por padrão no Firebase Test Lab (ajustável via gcloud alpha `--grant-permissions`).

## Assinatura e builds de release (iOS físico)

- iOS físico exige **release** (restrições de JIT).
- Cada target precisa de identidade própria: crie um App ID `com.example.myapp.RunnerUITests.xctrunner` + profile/certificado.
- O `.xctrunner` é gerado no build; avisos de bundle-ID mismatch no Xcode são esperados.
- Com fastlane, desative assinatura automática no target `RunnerUITests` e configure `PROVISIONING_PROFILE_SPECIFIER`.
- Evite coletar diagnósticos no farm: `"diagnosticCollectionPolicy": "Never"` no `.xctestplan` (evita travar em prompt de senha).

## Cadeia de suprimentos

- **Fixe versões no CI** (`dart pub global activate patrol_cli ^4.8.0`, `patrol` pinado no `pubspec.yaml`) para evitar quebras e injeções de versão.
- Prefira packages oficiais e audite dependências.
- `test_bundle.dart` gerado não deve ser modificado à mão.

## Rede e dados

- Teste fluxos offline (modo avião, Wi-Fi off) para validar comportamento de rede.
- Não use dados de produção reais em testes; use backends/contas de teste.
- Evite logar segredos — os logs de passos podem expor valores. Ao registrar entradas sensíveis, sanitize.
- O agente MCP pode ler a árvore nativa e screenshots: trate o ambiente como sensível.

## Acessibilidade e serviços do sistema (Android)

Por padrão, o Patrol **não** suprime serviços de acessibilidade durante a sessão (`FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES`). Suprimir (`androidDontSuppressAccessibilityServices: false`) é útil só quando uma extensão nativa precisa da conexão `UiAutomation` default — mas desliga TalkBack/ferramentas durante o teste.

## Checklist de segurança

- [ ] Nenhum segredo no código/versionamento.
- [ ] `.patrol.env` e `test_bundle.dart` ignorados.
- [ ] Versões de `patrol`/`patrol_cli` fixadas.
- [ ] Isolamento configurado (Android/iOS).
- [ ] Fluxos de permissão tratados (incl. "já concedida").
- [ ] Identidades de assinatura separadas para iOS físico.
- [ ] Dados de teste, nunca de produção.
- [ ] Logs não expõem segredos.

## Fontes

- `docs/documentation/other/tips-and-tricks.mdx`, `docs/documentation/index.mdx`, `docs/documentation/native/advanced.mdx`, `docs/documentation/physical-ios-devices-setup.mdx`, `docs/cli-commands/test.mdx`.
