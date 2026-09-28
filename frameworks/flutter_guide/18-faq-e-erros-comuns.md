# 18 — FAQ e erros comuns

## Erros de layout

### "A RenderFlex overflowed…"

**Sintoma:** listras amarelas/preto e mensagem no console indicando pixels estourados.

**Causa:** `Row`/`Column` com filho sem restrição de tamanho (ex.: `Text` longo em `Row`).

**Correção:** envolva o filho em `Expanded` (ou `Flexible`) para que ele respeite o espaço disponível.

```dart
Row(
  children: [
    const Icon(Icons.message),
    Expanded(child: Column(children: const [Text('Título'), Text('...')])),
  ],
);
```

### "RenderBox was not laid out"

**Causa:** geralmente efeito secundário de outro erro (viewport sem altura, input sem largura). Corrija a causa primária (constraints).

### "Vertical viewport was given unbounded height"

**Causa:** `ListView`/`SingleChildScrollView` dentro de `Column` sem altura definida.

**Correção:** envolva em `Expanded`, ou use `shrinkWrap: true` (com custo), ou `CustomScrollView` com slivers.

### "An InputDecorator... cannot have an unbounded width"

**Causa:** `TextField` dentro de `Row` sem `Expanded`.

**Correção:** `Expanded(child: TextField(...))`.

### "Incorrect use of ParentData widget"

**Causa:** `Expanded`/`Flexible`/`Positioned` fora do pai esperado (ex.: `Expanded` fora de `Row`/`Column`).

**Correção:** use o widget no pai correto (`Expanded` só em `Flex`; `Positioned` só em `Stack`).

### "setState() called during build"

**Causa:** chamar `setState` (direta ou indiretamente) durante o build.

**Correção:** mova a chamada para um callback, `initState` (sem setState) ou use `WidgetsBinding.instance.addPostFrameCallback`.

## Erros de runtime

### Tela vermelha (debug) ou cinza (release)

**Causa:** exceção não capturada ou erro de renderização.

**Correção:** leia o stack trace; adicione tratamento; configure `ErrorWidget.builder` para release. Ver `10`.

### `Null check operator used on a null value`

**Causa:** uso de `!` em valor null.

**Correção:** substitua por checagem/`??`, ou torne o fluxo não-nulo. Ver `02`.

### `setState() called after dispose()`

**Causa:** callback assíncrono após o widget sair da árvore.

**Correção:** cheque `if (mounted)` antes de `setState`.

### `MissingPluginException`

**Causa:** plugin não registrado (hot restart, plataforma não suportada, build incompleto).

**Correção:** pare e rode de novo (`flutter clean` + `flutter run`); verifique suporte à plataforma.

### `PlatformException`

**Causa:** erro no código nativo do plugin.

**Correção:** leia `code`/`message`/`details`; trate e logue.

## Erros de build

### "Target of URI hasn't been generated: 'x.g.dart'"

**Causa:** código gerado ausente.

**Correção:** rode `dart run build_runner build --delete-conflicting-outputs`.

### Conflito de versões no `pub get`

**Causa:** dependências transitivas incompatíveis.

**Correção:** `flutter pub upgrade`, `flutter pub outdated`, e só então `dependency_overrides` (temporário). Ver `03`.

### "Some code excerpts need to be updated" (repositório de docs)

Não se aplica a apps; é específico do repositório do site.

## Performance

### App com jank / UI travando

- Meça em **profile** num dispositivo real.
- Verifique `saveLayer`, `Opacity`, clipping, listas não-lazy.
- Localize `setState`; use `const`.
- Mova trabalho pesado para isolates.
- Ver `11`.

### Rebuilds excessivos

- Use o Flutter Performance window ("Show widget rebuild information").
- Quebre widgets; use `const`; use `Selector`/`ListenableBuilder` no subtree certo.

### Vazamento de memória

- Descarte controllers/listeners/streams em `dispose`.
- Cancele subscrições.
- Use DevTools **Memory**.

## Assincronismo

### `FutureBuilder` refaz a cada rebuild

**Causa:** `Future` criado dentro do `build`.

**Correção:** crie em `initState`/ViewModel.

### `setState` não atualiza a UI

**Causa:** mutação de estado sem `setState`, ou mutação de lista exposta sem notificar.

**Correção:** chame `setState`/`notifyListeners`; retorne cópia imutável.

## Navegação

### Deep link não abre a tela

- Verifique intent filters/Associated Domains.
- Confirme que a rota é **page-backed** (via `Router`/`go_router`), não pageless.
- Ver `07`.

### Back button não funciona no web

- Use `Router` (não rotas nomeadas) e `usePathUrlStrategy()`.

## Internacionalização

### `AppLocalizations.of(context)` retorna null

**Causa:** app não iniciado ou delegate ausente.

**Correção:** adicione `AppLocalizations.delegate` em `localizationsDelegates`; acesse só após o app iniciar.

## Testes

### Teste trava com animação

**Causa:** `pumpAndSettle` esperando animação infinita.

**Correção:** use `pump(duration)` em vez de `pumpAndSettle`, ou finalize a animação.

### `MissingPluginException` em testes

**Causa:** plugin nativo não disponível no ambiente de teste.

**Correção:** mocke a interface do plugin ou registre um handler falso. Ver `09`.

## Debug rápido

```dart
debugDumpApp();           // árvore de widgets
debugDumpRenderTree();    // render objects
debugDumpSemanticsTree(); // acessibilidade
debugPaintSizeEnabled = true;
```

- DevTools: Inspector, Performance, Memory, Logging.
- `flutter analyze` antes de tudo.
- Reproduza no menor exemplo possível.

## Perguntas frequentes

**Flutter ou React Native?** Flutter desenha a UI com o próprio engine (consistência entre plataformas); RN usa widgets nativos.

**Preciso saber Dart?** Sim; é a linguagem do Flutter. Ver `02`.

**Qual gerenciador de estado usar?** Comece com `ChangeNotifier`/`provider`; migre para riverpod/bloc conforme a complexidade.

**Qual roteador?** `go_router` para a maioria; `Navigator` puro em casos simples.

**Como guardar dados?** `shared_preferences` (config), SQL (`sqflite`/`drift`) para relacional, `flutter_secure_storage` para segredos. Ver `08`/`12`.

**Como testar?** Unit + widget em maioria; integration para fluxos críticos. Ver `09`.

**Como reduzir tamanho do app?** Tree shaking (padrão), `--obfuscate --split-debug-info`, deferred components, `--analyze-size`. Ver `11`/`15`.

**Como depurar crash de release?** Guarde SYMBOLS e use `flutter symbolize`. Ver `12`.
