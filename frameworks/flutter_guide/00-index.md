# 00 — Índice e visão geral

> Guia denso de Flutter 3.47 / Dart 3.13, derivado da documentação oficial (`docs.flutter.dev`). Otimizado para consumo por IA e referência rápida.

## O que é Flutter

Flutter é um **toolkit de UI declarativo e cross-platform** criado pelo Google. Um único código Dart compila para:

| Alvo | Saída | Compilador |
|---|---|---|
| Android / iOS | Código de máquina (ARM/x64) | AOT |
| Windows / macOS / Linux | Código de máquina | AOT |
| Web | JavaScript ou WebAssembly | `dart2js` / `dart2wasm` |
| Desenvolvimento | Kernel + VM (hot reload) | JIT / `dartdevc` |

Características centrais:

- **Não delega UI ao sistema operacional.** Flutter tem implementações próprias dos controles (Material e Cupertino) e desenha a cena inteira via **Impeller** (substitui o Skia) — o mesmo visual em todas as versões do SO.
- **Reativo e declarativo:** `UI = f(state)`. Você descreve a interface para um estado; o framework compara e atualiza só o que mudou.
- **Hot reload:** alterações de código aparecem em milissegundos sem perder o estado (só em debug mode).
- **Um só código, vários alvos:** compartilha UI, lógica e testes; interopera com código nativo quando necessário.
- **Licença BSD** e ecossistema amplo em [pub.dev](https://pub.dev).

## Modelo mental em uma frase

> Você compõe **widgets imutáveis**; o framework converte essa árvore em **elements** persistentes e **render objects**; o layout desce restrições e sobe tamanhos; o engine rasteriza a cena. Estado mutável vive em `State`/ViewModels e é exposto à UI por `setState`, `ChangeNotifier` ou bibliotecas.

## Versão de referência

- **Flutter:** 3.47 (documentada; builds 3.47.x)
- **Dart:** 3.13
- Recursos de Dart usados amplamente no guia: null safety, records, patterns/switch expressions, sealed classes, class modifiers, dot shorthands.

## Mapa do guia

| Arquivo | Tema | Quando consultar |
|---|---|---|
| `00-index.md` | Visão geral | Começar |
| `01-como-flutter-funciona.md` | Arquitetura e rendering | Entender o "porquê" |
| `02-dart-para-flutter.md` | Tipagem e linguagem | Escrever código correto |
| `03-projeto-e-pubspec.md` | Projeto, deps, lints | Iniciar/manter projeto |
| `04-widgets-e-layout.md` | Widgets e layout | Construir UI |
| `05-estado-e-gerenciamento.md` | Estado | Gerenciar dados na UI |
| `06-arquitetura-mvvm.md` | MVVM e camadas | Escalar o app |
| `07-navegacao-e-rotas.md` | Navegação | Mover entre telas/deep links |
| `08-assincronismo-e-dados.md` | Rede, JSON, storage | Integrar dados |
| `09-testes.md` | Testes | Garantir qualidade |
| `10-logs-e-observabilidade.md` | Logs e erros | Diagnosticar produção |
| `11-desempenho.md` | Performance | Evitar jank |
| `12-seguranca.md` | Segurança | Endurecer o app |
| `13-acessibilidade-e-i18n.md` | a11y e idiomas | Inclusão |
| `14-plataforma-e-pacotes.md` | Nativo e plugins | Interop |
| `15-build-e-deploy.md` | Build e publicação | Entregar |
| `16-boas-praticas.md` | Recomendações | Revisão de código |
| `17-cheatsheet.md` | Cola | Consulta rápida |
| `18-faq-e-erros-comuns.md` | Troubleshooting | Erros frequentes |
| `19-arquitetura-e-main-thread.md` | Main thread e fluidez | Manter a UI a 60/120 fps |
| `20-cookbook-receitas.md` | Receitas prontas | Animações, gestos, effects, listas, forms |
| `21-integracao-por-plataforma.md` | Integração nativa | Splash, back, restore, Wasm, web |
| `22-devtools-e-editor.md` | DevTools e editores | Profiling e depuração |
| `23-midia-e-plugins-comuns.md` | Mídia e monetização | Câmera, vídeo, ads, IAP, games |
| `24-ai-toolkit-e-genui.md` | IA no app | Chat, GenUI, ferramentas de IA |
| `25-add-to-app-e-embedding.md` | Add-to-app | Embutir Flutter em app existente |
| `26-instalacao-e-ambientes.md` | Instalação | Setup, canais, upgrade |
| `27-flutter-para-outras-plataformas.md` | Vindo de outra stack | Tabelas de tradução

## Três conceitos que você precisa dominar

1. **Widgets são imutáveis e descartáveis.** Mudar a UI = construir novos widgets. O framework reaproveita `Element`s para não reconstruir tudo.
2. **Constraints, não tamanhos.** Um widget só decide seu tamanho dentro das restrições do pai; o pai decide a posição. `width: 100` sem contexto pode ser ignorado.
3. **Estado é dado, não UI.** Separe estado efêmero (local, `setState`) de estado de app (compartilhado, em repositórios/ViewModels).

## Setup mínimo

```console
# Instalar o SDK e verificar o ambiente
flutter doctor -v

# Criar um app
flutter create meu_app
cd meu_app

# Rodar em debug (hot reload)
flutter run

# Rodar testes
flutter test

# Build de release
flutter build apk --release
```

## Fontes

- Documentação oficial: <https://docs.flutter.dev>
- API: <https://api.flutter.dev>
- Dart: <https://dart.dev>
- Pacotes: <https://pub.dev>
