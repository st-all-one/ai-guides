# 00 — Dart: visão geral e mapa do guia

> Versão de referência: **Dart 3.13.0** (stable, lançado em 2026-08-12).
> Guia denso em pt-BR, otimizado para consumo por IA, baseado na documentação
> oficial em `dart.dev`.

## 1. O que é Dart

Dart é uma linguagem **client-optimized**, fortemente tipada, com tipagem
estática e *sound null safety*. É a linguagem base do **Flutter**, mas também é
usada para CLIs, servidores, ferramentas de build e web.

Características essenciais:

- **Type safe e sound**: uma variável nunca contém um valor incompatível com
  seu tipo estático. Combina checagem estática (compilação) e checagem de
  runtime (casts, `is`).
- **Null safety sound**: tipos são não-nulos por padrão; `null` só entra via `?`.
  Um `int` não-nulo nunca é `null` em runtime.
- **Inferência de tipos**: anotações são opcionais, mas tipos são obrigatórios.
- **Orientada a objetos pura**: tudo (números, funções, `null`) é objeto;
  classes, mixins, interfaces implícitas, extension methods.
- **Concorrência por isolates**: memória isolada por worker, comunicação por
  mensagens — sem data races/mutex no código Dart.
- **Multiplataforma**: mobile, desktop, web (JS/Wasm), servidor, CLI.

## 2. Plataformas e modos de execução

| Alvo | Compilação | Runtime | Observações |
|---|---|---|---|
| Mobile/desktop (Flutter) | JIT (dev) + AOT (prod) | Dart VM nativa | Hot reload no dev |
| Servidor/CLI | AOT (`dart compile exe`) ou JIT (`dart run`) | Dart VM | Self-contained em AOT |
| Web JS (dev) | DDC incremental | V8/browser | Hot reload |
| Web JS (prod) | `dart compile js` (dart2js) | V8/browser | Dead-code elimination |
| Web Wasm (prod) | `dart compile wasm` (dart2wasm) | WasmGC | Deferred loading (3.13) |

- **JIT** otimiza durante a execução (incremental recompilation, DevTools).
- **AOT** gera código de máquina ARM/x64 com startup previsível.
- **Dart runtime** gerencia memória (GC geracional), aplica o type system
  (checagens dinâmicas) e gerencia isolates.
- **Web**: `dart compile js` ou `dart compile wasm`; `webdev` para servir.

## 3. Modelo mental do programa

1. Toda app começa em `main()` — top-level function.
2. Código roda em um **isolate** (o main isolate por padrão).
3. Cada isolate tem seu **event loop** e fila de eventos.
4. Operações assíncronas (`Future`, `Stream`) liberam o event loop.
5. Para CPU-bound, crie um **isolate** adicional.
6. `Future<T>` = resultado futuro único; `Stream<T>` = sequência assíncrona.

```dart
void main() {
  print('Hello, World!');
}
```

## 4. O que há de novo / relevante em Dart 3.x

| Versão | Recurso |
|---|---|
| 3.0 | Records, patterns, class modifiers, `sealed`, switch exaustivo |
| 3.3 | Extension types; `dart doc` aprimorado |
| 3.7 | Wildcard variables (`_`); legacy web libs deprecadas |
| 3.10 | Dot shorthands (`.valor`, `.new()`, `.parse()`) |
| 3.12 | Private named parameters (`required var String _name`) |
| 3.13 | **Primary constructors**; concise constructor syntax (`new`/`factory`); `Future.pause`; formatter refinements; `--enable-deferred-loading` no Wasm |

## 5. Como este guia está organizado

- **Fundamentos** (`01`) → sintaxe, tipos, operadores.
- **Tipos** (`02`) → sistema de tipos, null safety, generics.
- **OO** (`03`) → classes, construtores, modificadores, mixins, enums.
- **Dados** (`04`, `05`) → coleções, records, pattern matching.
- **Funções** (`06`) → closures, tear-offs, typedefs, extension types.
- **Assincronismo** (`07`, `08`) → Future/Stream e isolates.
- **Erros** (`09`) → Exception/Error, try/catch, assert.
- **Libs e pacotes** (`10`, `11`) → core libs, pub, workspaces.
- **Produção** (`12`–`14`) → segurança, testes, logs.
- **Boas práticas** (`15`–`17`) → Effective Dart (estilo, uso, design).
- **Tooling** (`18`, `19`) → analyzer/lints, interop, plataformas.
- **Performance** (`21`) → medir, compilar para produção, alocação/GC, isolates.
- **Referência** (`20`) → cheatsheet.

## 6. Fluxo recomendado para a IA

1. Identifique a tarefa (escrever código, revisar, depurar, configurar).
2. Consulte o arquivo de tópico correspondente.
3. Para correção de tipos → `02`. Para erros de produção → `12`–`14`.
4. Para revisão de estilo/API → `15`–`17`.
5. Verifique a versão do SDK do projeto (`dart --version`, `pubspec.yaml`).

## 7. Princípios que guiam todas as decisões

- **Segurança de tipos primeiro**: prefira precisão a `dynamic`.
- **Imutabilidade por padrão**: `final`, `const`, classes imutáveis.
- **Falhe cedo e alto**: `Error` para bugs, `Exception` para falhas tratáveis.
- **Explicitude em APIs públicas**: tipos anotados, documentação `///`.
- **Zero warnings no analyzer**: `dart analyze` limpo é o piso de qualidade.
- **Teste e observe**: sem testes e sem logs, não há produção confiável.

## Leitura cruzada
- Sistema de tipos: `02-tipagem-e-null-safety.md`
- Boas práticas oficiais: `15`, `16`, `17`
- Performance e otimização: `21`
- Segurança: `12-seguranca.md`
- Testes: `13-testes.md`
- Logs: `14-logs-e-observabilidade.md`
