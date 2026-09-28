# 16 — Boas práticas consolidadas

## 1. Arquitetura

- Separe **UI layer** (View + ViewModel) e **Data layer** (Repository + Service).
- Use **MVVM**: widgets burros, lógica no ViewModel.
- **Fluxo unidirecional**: dados descem, eventos sobem.
- **Single Source of Truth**: cada dado tem um dono (repository).
- **Dependency injection** via construtor + `provider` no topo.
- **Domain layer** só quando necessário (lógica complexa/reutilizada).
- **Repository pattern** com classes abstratas por ambiente.
- **Modelos imutáveis** (`freezed`/`built_value`).
- **`Result`** (sealed) para erros previsíveis; exceções para o inesperado.
- **Commands** para ações assíncronas com estado (running/error/completed).

## 2. Widgets e UI

- `build()` puro, rápido e sem efeitos colaterais.
- Widgets pequenos e focados; quebre `build()` grandes.
- Prefira `StatelessWidget`/`StatefulWidget` a funções que retornam widgets.
- `const` sempre que possível.
- Localize `setState` ao menor subtree.
- Respeite constraints; não lute contra o layout.
- `ListView.builder` para listas longas.
- Use `ValueKey` em listas dinâmicas; evite `GlobalKey` desnecessário.
- Descarte controllers/listeners em `dispose`.
- Cheque `mounted` antes de `setState` assíncrono.

## 3. Estado

- Estado efêmero → `setState`; app state → ViewModel/repository.
- Exponha dados imutáveis (`UnmodifiableListView`).
- Uma única biblioteca de estado por app.
- Não guarde `BuildContext` para uso posterior.
- Teste ViewModels sem Flutter.

## 4. Dart e tipagem

- Evite `dynamic`; prefira tipos concretos.
- Use null safety; evite `!` sem necessidade.
- `final`/`const` por padrão.
- Use records/patterns para modelar dados locais.
- `sealed` + `switch` exaustivo para variantes.
- Trate exceções na fronteira; não engula erros.
- Documente APIs públicas.

## 5. Assincronismo e dados

- Crie `Future`/`Stream` fora do `build`.
- Injete clientes HTTP.
- Converta JSON em modelos tipados imediatamente.
- Isole trabalho pesado (isolates/`compute`).
- Cancele subscrições.
- Trate timeout, offline, HTTP 4xx/5xx.
- Nunca bloqueie a main thread.
- Use parâmetros em SQL (nunca interpole).

## 6. Testes

- Muitos unit + widget; poucos integration.
- Teste comportamento, não implementação.
- Use **fakes** para dependências.
- Teste cada camada isoladamente.
- Cobertura acompanhada no CI.
- Goldens para regressões visuais.
- Se é difícil testar, refatore a arquitetura.

## 7. Performance

- Meça em **profile** num dispositivo real.
- `const`, `setState` localizado, listas lazy.
- Evite `saveLayer`/`Opacity`/clip desnecessários.
- Não sobrescreva `operator ==` em widgets.
- Isolates para trabalho pesado.
- Analise tamanho do app.

## 8. Segurança

- Sem segredos no cliente.
- HTTPS sempre; considere pinning.
- Secure storage para credenciais.
- Obfusque release; guarde SYMBOLS.
- Permissões mínimas; valide entradas/deep links.
- Regras críticas validadas no backend.
- Mantenha SDK/dependências atualizados.

## 9. Logs e observabilidade

- `dart:developer log`/`debugPrint`; sem `print` em produção.
- Nunca logue PII/segredos.
- Handler global de erros no `main`.
- Crash reporting em produção (com SYMBOLS).

## 10. Acessibilidade e i18n

- TalkBack/VoiceOver testados; contraste ≥ 4.5:1; alvos ≥ 48×48.
- Semantics em widgets customizados.
- Layout por tamanho de janela.
- Todo texto externalizado em `.arb`.
- Plurais/placeholders corretos; RTL testado.

## 11. Lints recomendados (`analysis_options.yaml`)

```yaml
include: package:flutter_lints/flutter.yaml

linter:
  rules:
    always_use_package_imports: true
    avoid_print: true
    avoid_dynamic_calls: true
    prefer_const_constructors: true
    prefer_const_declarations: true
    prefer_final_locals: true
    use_key_in_widget_constructors: true
    unawaited_futures: true
    avoid_slow_async_io: true
    cancel_subscriptions: true
    close_sinks: true
    comment_references: true
```

## 12. Nomenclatura

| Item | Convenção | Exemplo |
|---|---|---|
| Arquivo | `snake_case` | `home_viewmodel.dart` |
| Classe | `UpperCamelCase` | `HomeViewModel` |
| Variável/método | `lowerCamelCase` | `fetchBookings` |
| Constante | `lowerCamelCase` | `defaultTimeout` |
| Privado | `_` prefixo | `_bookings` |
| View | sufixo `Screen`/nome do componente | `HomeScreen` |
| ViewModel | sufixo `ViewModel` | `HomeViewModel` |
| Repository | sufixo `Repository` | `UserRepository` |
| Service | sufixo `Service` | `ApiClientService` |

Evite nomes que colidam com o SDK (ex.: `Widget`, `Builder`). Coloque widgets compartilhados em `ui/core/`, não `widgets/`.

## 13. Anti-padrões

| Anti-padrão | Problema | Alternativa |
|---|---|---|
| Lógica de negócio em widget | Difícil de testar/manter | ViewModel |
| `setState` no topo da árvore | Rebuild excessivo | Localizar |
| `dynamic` em JSON | Erros em runtime | Modelos tipados |
| `print` em produção | Sem metadados/segurança | `dart:developer log` |
| Segredos no app | Vazamento | Backend |
| Rotas nomeadas em app complexo | Deep links limitados | `go_router` |
| `operator ==` em widgets | O(N²) | Não sobrescrever |
| `GlobalKey` como comunicação | Acoplamento | Provider/InheritedWidget |
| Múltiplas libs de estado | Inconsistência | Uma só |
| Listas com `children:` enormes | Build custoso | `.builder` |
| Ignorar `dispose` | Vazamentos | Descartar recursos |
| `catch` genérico silencioso | Bugs escondidos | Tratar/logar |
| `sleep` em testes | Flaky/lento | `pump`/`fakeAsync` |
| `Opacity` em animação | Jank | `AnimatedOpacity`/`FadeInImage` |

## 14. Checklist de code review

- [ ] Respeita camadas (UI/data/domain) e UDF
- [ ] Sem lógica de negócio em widgets
- [ ] `build()` puro; `const` onde possível
- [ ] `setState` localizado
- [ ] Tratamento de erro explícito (`Result`/exceções)
- [ ] Recursos descartados (`dispose`)
- [ ] Sem `dynamic`/`!` desnecessários
- [ ] Testes para a mudança
- [ ] Sem segredos/PII em logs
- [ ] `flutter analyze` limpo e formatado
- [ ] Acessível (semantics, contraste, alvos)
- [ ] Textos externalizados
- [ ] Performance considerada (listas, imagens, rebuilds)
