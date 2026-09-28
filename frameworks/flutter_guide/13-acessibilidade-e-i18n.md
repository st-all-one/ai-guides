# 13 — Acessibilidade e internacionalização

## Parte A — Acessibilidade (a11y)

## 1. Por que importa

Acessibilidade é requisito moral, legal e de negócio. Normas: **WCAG 2**, **EN 301 549**, **VPAT**; leis: **ADA** (EUA), **Section 508**, **European Accessibility Act (EAA)**. Inclua um checklist de acessibilidade antes de publicar.

## 2. Checklist de release

- **Interações ativas:** todo botão deve fazer algo; se for no-op, mostre um `SnackBar` explicando.
- **Leitor de tela:** teste com **TalkBack** (Android) e **VoiceOver** (iOS); descrições devem ser inteligíveis.
- **Contraste:** mínimo **4.5:1** entre texto/controles e fundo (exceto componentes desabilitados); valide imagens.
- **Troca de contexto:** nada muda o contexto do usuário automaticamente enquanto ele digita.
- **Alvos tocáveis:** mínimo **48×48 px**.
- **Erros:** ações importantes devem poder ser desfeitas; sugira correção.
- **Daltonismo:** legível em modos colorblind e escala de cinza.
- **Escala:** legível com fontes e escala de exibição muito grandes.

## 3. Semantics

O `Semantics` expõe informações às tecnologias assistivas. Widgets Material/Cupertino já trazem semântica; widgets customizados precisam dela.

```dart
Semantics(
  label: 'Curtir publicação',
  button: true,
  enabled: true,
  child: IconButton(
    onPressed: _like,
    icon: const Icon(Icons.favorite),
  ),
);
```

- `label`, `hint`, `value`, `button`, `enabled`, `checked`, `selected`.
- `ExcludeSemantics` para decorativos; `MergeSemantics` para agrupar.
- `SemanticsService.announce(...)` para anúncios.

### Testando semântica

```dart
final handle = tester.ensureSemantics();
await tester.pumpWidget(const MyWidget());
expect(tester.getSemantics(find.byType(IconButton)), matchesSemantics(label: 'Curtir'));
handle.dispose();
```

## 4. Textos e escalonamento

- Respeite a escala de fonte do sistema (não fixe tamanhos pequenos).
- Use `MediaQuery.textScalerOf(context)` para ajustar layouts.
- Evite truncar textos essenciais; permita quebra de linha.
- `maxLines`/`overflow` com cautela.

## 5. Foco e teclado

- Suporte navegação por teclado (tab/enter/setas) em desktop e web.
- Use `FocusTraversalGroup`, `FocusNode`, `Shortcuts`/`Actions`.
- Não sequestre o foco; restaure ao fechar diálogos.
- Ordem de foco deve seguir a ordem visual/lógica.

## 6. Animações e movimento

- Respeite `MediaQuery.disableAnimations` (usuário pediu menos movimento).
- Evite animações piscantes; ofereça alternativa sem movimento.
- Nunca dependa de cor como único indicador.

## 7. Adaptativo e responsivo

- Não decida layout por tipo de dispositivo nem orientação; use tamanho de janela (`MediaQuery.sizeOf`, `LayoutBuilder`).
- Suporte redimensionamento, dobra e multijanela; preserve estado com `PageStorageKey`.
- Não bloqueie orientação (é inclusive um problema de acessibilidade).
- Suporte mouse, trackpad e atalhos de teclado além do toque.
- Não ocupe toda a largura em telas grandes; limite o conteúdo.

## Parte B — Internacionalização (i18n)

## 8. Setup com `flutter_localizations` + `gen_l10n`

Por padrão, o Flutter só oferece inglês (EUA). Para outros idiomas:

```console
flutter pub add flutter_localizations:"{sdk: flutter}" intl:any
```

```yaml
flutter:
  generate: true
```

Crie `l10n.yaml` na raiz:

```yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
```

Crie `lib/l10n/app_en.arb`:

```json
{
  "helloWorld": "Hello World!",
  "@helloWorld": {
    "description": "Saudação convencional"
  }
}
```

E `app_es.arb`:

```json
{ "helloWorld": "¡Hola Mundo!" }
```

Rode `flutter pub get`/`flutter run` (ou `flutter gen-l10n`) para gerar o código.

## 9. Usando as localizações

```dart
import 'l10n/app_localizations.dart';

MaterialApp(
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  supportedLocales: AppLocalizations.supportedLocales,
  home: const MyHomePage(),
);

// Uso
Text(AppLocalizations.of(context)!.helloWorld);
```

- Use `GlobalCupertinoLocalizations.delegates` para `CupertinoApp` e `GlobalWidgetsLocalizations.delegate` para `WidgetsApp`.
- `MaterialApp.onGenerateTitle` para o título localizado.
- O app precisa ter iniciado para `AppLocalizations.of(context)` funcionar.

## 10. Placeholders, plurais e selects

```json
{
  "hello": "Olá, {name}!",
  "@hello": {
    "placeholders": { "name": { "type": "String" } }
  },
  "itemsCount": "{count, plural, =0{Nenhum item} =1{1 item} other{{count} itens}}",
  "@itemsCount": {
    "placeholders": { "count": { "type": "int" } }
  }
}
```

```dart
Text(AppLocalizations.of(context)!.hello('Ana'));
Text(AppLocalizations.of(context)!.itemsCount(3));
```

- Números, moedas e datas também são localizáveis (Intl).
- **Nunca** concatene strings traduzidas — use placeholders; a ordem das palavras varia por idioma.

## 11. Idiomas e locale

- `supportedLocales` define os idiomas suportados.
- `Locale('pt', 'BR')` / `Locale.fromSubtags` (preferido; suporta `scriptCode`).
- `Localizations.override` para forçar locale.
- iOS: configure `CFBundleLocalizations` no `Info.plist`.
- RTL (árabe/hebraico): use `Directionality`/`TextDirection`; o framework adapta widgets Material.

## 12. Boas práticas de i18n

- Externalize **todo** texto visível; nada hardcoded.
- Use chaves semânticas (`checkout_button`), não o texto em inglês.
- Descreva placeholders e plurais corretamente.
- Não concatene frases; use ICU messages.
- Teste com textos longos (alemão) e RTL.
- Formate datas/números com `intl`.
- Mantenha os `.arb` sincronizados; valide no CI.

## 13. Checklist combinado

- [ ] TalkBack e VoiceOver testados
- [ ] Contraste ≥ 4.5:1; alvos ≥ 48×48
- [ ] Semantics em widgets customizados
- [ ] Escala de fonte grande suportada
- [ ] Navegação por teclado em desktop/web
- [ ] Layout por tamanho de janela, não por dispositivo
- [ ] Todo texto externalizado em `.arb`
- [ ] Plurais/placeholders corretos
- [ ] RTL e textos longos testados
- [ ] `gen_l10n` rodando no CI
