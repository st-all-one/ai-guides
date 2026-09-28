# 07 — Navegação e roteamento

## 1. Visão geral

| Necessidade | Solução |
|---|---|
| App simples, sem deep links complexos | `Navigator` + `MaterialPageRoute` |
| App com deep links, web, múltiplos `Navigator` | `Router` + pacote (`go_router`) |
| Rotas nomeadas (`/home`) | `MaterialApp.routes` — **não recomendado** na maioria dos casos |

Regra do time Flutter: **`go_router` cobre ~90% dos apps**; use `Navigator` puro para casos específicos.

## 2. `Navigator` (imperativo)

O `Navigator` mantém uma pilha de `Route`s com animações de transição adequadas à plataforma.

```dart
// Empilhar
Navigator.of(context).push(
  MaterialPageRoute<void>(builder: (_) => const SecondScreen()),
);

// Voltar
Navigator.of(context).pop(resultado);

// Substituir
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (_) => const HomeScreen()),
);
```

- `push` empilha; `pop` desempilha; `pushReplacement` troca o topo.
- `Navigator.of(context)` obtém o navigator mais próximo.
- Retorne dados via `pop(valor)` e `await Navigator.push(...)`.

```dart
final resultado = await Navigator.push<String>(
  context,
  MaterialPageRoute(builder: (_) => const SelecaoScreen()),
);
```

## 3. Rotas nomeadas e limitações

```dart
MaterialApp(
  routes: {
    '/': (_) => const HomeScreen(),
    '/second': (_) => const SecondScreen(),
  },
);
Navigator.pushNamed(context, '/second');
```

Limitações:

- Deep links sempre empilham uma nova `Route` sem customização.
- Sem suporte ao botão "avançar" do navegador.
- Não recomendado para apps com requisitos de navegação/delink.

## 4. `Router` e `go_router`

Apps com deep links, web ou múltiplos navigators devem usar um pacote declarativo. `go_router` é o preferido.

```dart
final _router = GoRouter(
  initialLocation: '/home',
  debugLogDiagnostics: true,
  redirect: (context, state) =>
      autenticado ? null : '/login',        // guarda de rota
  refreshListenable: authRepository,        // reavalia redirect
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) =>
          LoginScreen(viewModel: LoginViewModel(context.read())),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) =>
          HomeScreen(viewModel: HomeViewModel(context.read())),
      routes: [
        GoRoute(
          path: 'details/:id',              // /home/details/42
          builder: (context, state) => DetailsScreen(
            id: state.pathParameters['id']!,
            extra: state.extra,
          ),
        ),
      ],
    ),
  ],
);

MaterialApp.router(routerConfig: _router);
```

Navegação:

```dart
context.go('/home/details/42');      // substitui a localização
context.push('/home/details/42');    // empilha
context.pop();
context.goNamed('details', pathParameters: {'id': '42'});
```

- `redirect`: guardas de autenticação/onboarding.
- `pathParameters` e `queryParameters`: parâmetros tipados.
- `extra`: passa objetos em memória (não sobrevive a deep link).
- `refreshListenable`: reavalia `redirect` quando o estado de auth muda.

### Route builders gerados

O `go_router_builder` gera rotas type-safe a partir de classes anotadas, reduzindo erros de string.

## 5. `Router` + `Navigator`

- Rotas criadas via `Router`/`go_router` são **page-backed** (a partir de `Page`); são **deep-linkable**.
- Rotas criadas via `Navigator.push`/`showDialog` são **pageless**; **não** são deep-linkable.
- Quando uma rota page-backed é removida, as pageless posteriores também são removidas.
- Para impedir navegação de volta em telas page-backed, use a API do pacote de rotas (não `PopScope`).

## 6. Deep linking

- Configure `AndroidManifest.xml` (intent filters) e `Info.plist`/Associated Domains para app links.
- Com `go_router`, cada rota declara seu path e parses automáticos.
- Use `redirect` para validar/normalizar deep links (ex.: exigir login).
- Valide parâmetros vindos de deep links — nunca confie neles (ver `12`).

## 7. Web

- `Router` integra com a History API: back/forward do navegador funcionam.
- Use `urlStrategy` para URLs limpas (sem `#`):

```dart
import 'package:flutter_web_plugins/url_strategy.dart';

void main() {
  usePathUrlStrategy();
  runApp(const MyApp());
}
```

- Defina rotas pensando em links compartilháveis e SEO.

## 8. Diálogos, sheets e overlays

```dart
showDialog<void>(
  context: context,
  builder: (_) => AlertDialog(
    title: const Text('Confirmar'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('OK')),
    ],
  ),
);

showModalBottomSheet<void>(context: context, builder: (_) => const SheetContent());
```

- `showDialog`/`showModalBottomSheet` adicionam rotas pageless.
- Retorne resultados via `pop(valor)`.

## 9. Boas práticas

- Prefira `go_router` para apps não triviais; centralize rotas num arquivo.
- Use **guardas** (`redirect`) para autenticação, não lógica espalhada nas telas.
- Passe **IDs**, não objetos, em rotas deep-linkable; carregue o objeto no destino.
- Mantenha o roteamento fora dos widgets de negócio.
- Nomeie rotas e centralize constantes de path.
- Trate deep links inválidos com uma rota de erro.
- Não use `GlobalKey<NavigatorState>` para navegar em app com `Router`.
- Teste navegação (widget tests com router mockado).

## 10. Exemplo de constante de rotas

```dart
abstract final class Routes {
  static const home = '/home';
  static const login = '/login';
  static String bookingWithId(int id) => '/home/details/$id';
}
```
