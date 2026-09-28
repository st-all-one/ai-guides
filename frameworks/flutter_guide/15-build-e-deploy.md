# 15 — Build e deploy

## 1. Modos e alvos

| Modo | Comando | Uso |
|---|---|---|
| Debug | `flutter run` | Desenvolvimento, hot reload |
| Profile | `flutter run --profile` | Medir performance (dispositivo real) |
| Release | `flutter build <target>` | Produção |

Alvos: `apk`, `appbundle`, `aar`, `ios`, `ipa`, `macos`, `windows`, `linux`, `web`, `bundle`.

```console
flutter build apk --release
flutter build appbundle --release
flutter build ios --release
flutter build ipa
flutter build macos --release
flutter build windows --release
flutter build linux --release
flutter build web --release
```

## 2. Android

### Assinatura

1. Crie o upload keystore (guarde fora do versionamento):

```console
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. Crie `android/key.properties` (não commite):

```properties
storePassword=<senha>
keyPassword=<senha>
keyAlias=upload
storeFile=<caminho>/upload-keystore.jks
```

3. Configure `android/app/build.gradle.kts` para carregar as propriedades e assinar o release.

> Use **Play App Signing**. Nunca versione o keystore nem `key.properties`. Considere PQC hybrid signing (Android 17+).

### Build

```console
flutter build appbundle --release   # recomendado para Play Store
flutter build apk --release         # APK direto
flutter build apk --split-per-abi   # APKs por ABI
```

- `R8`/minificação reduz código.
- Habilite **multidex** se necessário.
- Revise `AndroidManifest.xml` e a configuração Gradle (application ID, SDK versions, versionCode/versionName).
- Teste o bundle offline (`bundletool`) ou via Play.

## 3. iOS

1. Registre o Bundle ID e o app no App Store Connect.
2. Revise as configurações do projeto Xcode (bundle id, signing, deployment target).
3. Ícones e launch images.
4. Atualize build/version numbers.
5. Crie o arquivo e envie:

```console
flutter build ipa
# ou via Xcode: Product > Archive
```

6. TestFlight → App Store.

- Configure `CFBundleLocalizations` para i18n.
- ATS exige HTTPS.
- Para macOS, habilite entitlements (rede, sandbox).

## 4. Web

```console
flutter build web --release
flutter build web --release --wasm          # WebAssembly (melhor performance)
flutter build web --release --source-maps   # depuração de builds web
```

- **Dev:** `dartdevc` (incremental).
- **Produção:** `dart2js` (JS otimizado) ou `dart2wasm`.
- Web não suporta obfuscação; usa minificação + tree shaking.
- Use `usePathUrlStrategy()` para URLs limpas.
- Considere renderer e tamanho inicial; use deferred loading para features grandes.
- Hospede em qualquer servidor estático/Firebase Hosting.

## 5. Desktop

- **Windows:** `flutter build windows` (PDB em vez de SYMBOLS com `--split-debug-info`).
- **macOS:** `flutter build macos`; requer assinatura/notarização para distribuição.
- **Linux:** `flutter build linux`; requer dependências GTK.
- Empacotamento: MSIX (Windows), DMG/PKG (macOS), Snap/AppImage/Flatpak (Linux).

## 6. Flavors (ambientes)

Separe dev/staging/prod com flavors por plataforma. Configure em `android/app/build.gradle.kts` e Xcode schemes. Use `--flavor`:

```console
flutter run --flavor dev --dart-define=API_URL=https://dev.api
flutter build appbundle --flavor prod --dart-define=API_URL=https://api
```

- `default-flavor` no `pubspec.yaml` define o padrão.
- Combine com `--dart-define` para configuração (não sensível).

## 7. Obfuscação

```console
flutter build apk \
  --obfuscate \
  --split-debug-info=out/android
```

- Funciona só em release; guarde os **SYMBOLS** (ou PDB no Windows).
- Desofusque: `flutter symbolize -i trace.txt -d symbols.symbols`.
- Envie SYMBOLS ao serviço de crash reporting.
- Ver `12` para detalhes e cuidados.

## 8. Tamanho do app

```console
flutter build apk --analyze-size
flutter build appbundle --analyze-size
```

- Tree shaking remove código não usado.
- `--obfuscate --split-debug-info` reduzem tamanho.
- **Deferred components** para carregar features sob demanda.
- Use DevTools **App Size** para investigar.

## 9. CI/CD

- Rode `flutter analyze`, `dart format --set-exit-if-changed`, `flutter test` em cada PR.
- Builds de release automatizados; assinatura via segredos do CI.
- Serviços: GitHub Actions, GitLab CI, Codemagic, Bitrise, Cirrus, Appcircle, Travis.
- Deploy: Play Store (fastlane/`supply`), App Store (`fastlane`/Xcode Cloud), Firebase Hosting (web), Firebase App Distribution (testes).
- Cache de dependências e do SDK para acelerar.
- Matriz de plataformas (Android, iOS, web, desktop) quando aplicável.

## 10. Checklist de release

- [ ] Versão/build atualizados no `pubspec.yaml`
- [ ] `flutter analyze` limpo e testes verdes
- [ ] Assinatura configurada (keystore/Play App Signing)
- [ ] `--obfuscate --split-debug-info` + SYMBOLS guardados
- [ ] Crash reporting ativo e recebendo SYMBOLS
- [ ] Permissões mínimas revisadas
- [ ] Ícones, splash e metadados prontos
- [ ] Testado em dispositivos reais (release/profile)
- [ ] i18n e a11y validados
- [ ] Política de privacidade e requisitos da loja atendidos
- [ ] Rollback/plano de resposta a incidentes definido

## 11. Comandos essenciais

```console
flutter doctor -v
flutter clean
flutter pub get
flutter analyze
dart format --set-exit-if-changed .
flutter test
flutter build appbundle --release --obfuscate --split-debug-info=build/symbols
flutter build ipa --release
flutter build web --release --wasm
```
