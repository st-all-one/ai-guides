# 23 — Mídia, monetização e plugins comuns

Plugins oficiais/comunitários mais usados. Sempre verifique suporte de plataforma, licença e manutenção no pub.dev antes de adotar (ver `03`/`12`).

## 1. Câmera

Pacote: **`camera`** (mobile); Android moderno usa `camera_android_camerax` (CameraX), que melhora resolução e trata *device quirks*.

```dart
final cameras = await availableCameras();
final controller = CameraController(
  cameras.first,
  ResolutionPreset.high,
  enableAudio: false,
);
await controller.initialize();
// preview
AspectRatio(aspectRatio: controller.value.aspectRatio,
    child: CameraPreview(controller));
// capturar
final foto = await controller.takePicture();
```

- Peça permissão de câmera/microfone (ver `12`).
- Sempre `dispose()` o controller.
- Para QR/barcode, use `mobile_scanner`.

## 2. Vídeo

Pacote: **`video_player`** (iOS `AVPlayer`, Android `ExoPlayer`; **não** funciona em Linux/Windows).

```dart
final controller = VideoPlayerController.networkUrl(Uri.parse(url));
await controller.initialize();
VideoPlayer(controller);
controller.play();
```

- Para YouTube/streaming avançado, `youtube_player_flutter` ou `better_player`.
- Controle o ciclo de vida: pause ao ir para background.

## 3. Áudio

| Uso | Pacote |
|---|---|
| Gravar/streamar entrada | `record` (`AudioRecorder`) |
| Efeitos e música de baixa latência | `flutter_soloud` (`SoLoud`) |
| Áudio simples/playlist | `just_audio` / `audioplayers` |

```dart
// record
final rec = AudioRecorder();
if (await rec.hasPermission()) {
  final path = await rec.start(const RecordConfig(), path: 'gravacao.m4a');
}
```

- Gerencie o foco de áudio e interrupções (ligações, outros apps).
- Em jogos, pré-carregue sons para evitar jank (ver `19`).

## 4. Anúncios (monetização)

Pacote: **`google_mobile_ads`** (AdMob/Ad Manager). Formatos: app open, banner, interstitial, native, rewarded, rewarded interstitial; suporta **mediação**.

```dart
await MobileAds.instance.initialize();
final ad = BannerAd(
  size: AdSize.banner,
  adUnitId: '<seu-id>',
  request: const AdRequest(),
  listener: BannerAdListener(
    onAdLoaded: (_) {},
    onAdFailedToLoad: (ad, err) => ad.dispose(),
  ),
)..load();

// exibir
AdWidget(ad: ad);
```

- Use **IDs de teste** em desenvolvimento; nunca comite IDs de produção.
- Mediação: `gma_mediation_applovin`, `..._dtexchange`, `..._inmobi`, `..._ironsource`, `..._liftoffmonetize`, `..._meta`, `..._mintegral`, `..._pangle`.
- Respeite consentimento (GDPR/CCPA) e políticas das lojas.

## 5. Compras e pagamentos

| Recurso | Solução |
|---|---|
| Compras no app (IAP) | `in_app_purchase` (Google Play/App Store) |
| Assinaturas | `in_app_purchase` + validação server-side |
| Pagamentos diversos | provedores (ex.: Stripe) via SDK/channel |
| Google Pay | SDK/plugins específicos |

Boas práticas: valide recibos **no servidor**, restaure compras, trate estados pendentes e reembolsos, e nunca confie só no cliente.

## 6. Jogos

- **Casual Games Toolkit**: recursos gratuitos/open source para 2D multiplataforma; turn-based (tabuleiro, cartas, puzzle) encaixam muito bem em Flutter; real-time pode usar engine (ex.: Flame).
- Pacotes: **`flame`** (engine 2D), `flame_audio`, `flame_forge2d`.
- **Conquistas e rankings**: **`games_services`** integra Google Play Games / Game Center.
- **Multiplayer**: Firebase Cloud Firestore para **baixa taxa de ticks** (cartas, estratégia, puzzle); alta taxa (ação) exige solução dedicada com baixa latência.

```dart
// games_services
await GameAuth.signIn();
await GameAuth.showAchievements();
```

## 7. Backend e serviços

| Serviço | Uso |
|---|---|
| **Firebase** | Auth, Firestore, Storage, FCM, Analytics, Crashlytics, Remote Config |
| **Google APIs** | Maps, Places, Calendar via plugins/channels |
| **REST/GraphQL** | `http`/`dio` + codegen (ver `08`) |

- `flutterfire configure` gera `firebase_options.dart`.
- Não inclua segredos no cliente; use Firebase AI Logic / regras de segurança (ver `12`).
- Firestore: modele dados para leituras baratas; use listeners com cuidado (custo/rebuilds).

## 8. Outros plugins frequentes

| Necessidade | Pacote |
|---|---|
| Webview | `webview_flutter` |
| Mapas | `google_maps_flutter` / `flutter_map` |
| Localização | `geolocator` |
| Notificações | `firebase_messaging`, `flutter_local_notifications` |
| Armazenamento seguro | `flutter_secure_storage` |
| Preferências | `shared_preferences` |
| Banco local | `sqflite`, `drift`, `isar` |
| Permissões | `permission_handler` |
| Compartilhar | `share_plus` |
| URL launcher | `url_launcher` |
| Imagens em cache | `cached_network_image` |
| Gráficos | `fl_chart`, `syncfusion_flutter_charts` |
| PDF | `pdf`, `printing` |

## 9. Boas práticas com plugins

- **Fixe versões** e revise dependências transitivas (ver `03`/`12`).
- Prefira plugins com suporte **federado** (Android/iOS/web/desktop).
- Isole plugins atrás de **services** para testabilidade (ver `06`).
- Verifique permissões e privacidade (Info.plist/AndroidManifest).
- Meça o impacto no **tamanho do app** (ver `22`).
- Plugins nativos novos exigem reiniciar o app (não hot reload).
- Trate falhas com `Result`/try-catch e log (ver `08`/`10`).
