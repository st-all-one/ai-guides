# 00 — Índice e visão geral

> Guia denso de **Patrol 4.10 / patrol_cli 4.8**, derivado da documentação oficial (`patrol.leancode.co`) e do repositório `leancodepl/patrol`. Otimizado para consumo por IA e referência rápida.

## O que é Patrol

Patrol é um **framework E2E de UI testing para Flutter**, criado pela [LeanCode](https://leancode.co). Ele resolve a maior limitação do `integration_test` oficial: a incapacidade de interagir com o **sistema operacional**.

Com Patrol, o teste em Dart consegue:

- conceder/negar **permissões** em tempo de execução;
- **abrir/tocar notificações**;
- interagir com **WebViews** e fluxos OAuth (ex.: login Google);
- ligar/desligar **Wi-Fi, dados móveis, Bluetooth, localização, modo escuro, modo avião**;
- sair do app, voltar e verificar **preservação de estado**;
- usar a **câmera**, escolher **imagens da galeria**, fazer **pull-to-refresh**;
- automatizar o **navegador** (Flutter Web via Playwright).

Além disso, oferece um **sistema de finders** (`$(#key)`, `$(Text)`, `$('texto')`) muito mais conciso que o `find.*` do `flutter_test`.

## Por que ele é diferente

Patrol **não substitui** o Flutter: ele **estende** `flutter_test` e `integration_test`. O grande truque é compilar seus testes Dart dentro de um **app de teste nativo** e apresentá-los ao SO como testes **JUnit/Espresso** (Android) e **XCTest/XCUITest** (iOS). Assim:

- o resultado é um teste nativo de verdade → funciona em Xcode, Gradle, Android Studio, Firebase Test Lab, BrowserStack, SauceLabs, Marathon;
- você continua escrevendo 100% em Dart.

## Pacotes do ecossistema

| Pacote | Papel |
|---|---|
| `patrol` | Framework principal: `patrolTest`, `$`, `$.platform` (automação nativa). Requer `patrol_cli`. |
| `patrol_cli` | CLI: `test`, `build`, `develop`, `test-without-building`, `devices`, `doctor`, `update`. |
| `patrol_finders` | Somente os finders, para usar em testes de widget/golden sem depender de `patrol`. |
| `patrol_log` | Pacote de logging usado internamente/na CLI. |
| `patrol_mcp` | Servidor MCP que deixa agentes de IA rodarem/gerenciarem testes (`patrol develop`). |
| `patrol_devtools_extension` | Extensão do Flutter DevTools para inspecionar a árvore de UI **nativa**. |
| `adb` | Wrapper simples do `adb`, usado pela CLI. |

## Modelo mental em uma frase

> Você escreve `patrolTest(...)` em Dart; a CLI compila um **test bundle** com todos os testes, embute num app de teste nativo, instala e dispara o **runner nativo**; o runner inicia um **servidor HTTP local** no dispositivo, o Dart executa os passos (widgets via `$`, nativo via `$.platform`) e o resultado volta no formato nativo.

## Versões de referência

- **Patrol:** 4.10 (a documentação cita features que exigem `patrol` 4.10.0 + `patrol_cli` 4.8.0)
- **patrol_cli:** 4.8
- **Flutter mínimo:** 3.32.0 (para as versões 4.x)
- **Dart:** compatível com o Flutter acima
- **Plataformas:** Android 5.0+ (API 21), iOS 13+, macOS 10.14+ (alpha). Windows/Linux **não** suportados.

> A compatibilidade `patrol` × `patrol_cli` é **verificada em runtime**. Sempre use os dois na mesma faixa (ver `01-como-patrol-funciona.md` e `14-troubleshooting.md`).

## Mapa do guia

| Arquivo | Tema | Quando consultar |
|---|---|---|
| `00-index.md` | Visão geral | Começar |
| `01-como-patrol-funciona.md` | Arquitetura interna | Entender o "porquê" |
| `02-instalacao-e-setup.md` | Instalação e setup nativo | Configurar o projeto |
| `03-primeiro-teste.md` | Primeiro teste, inicializar app | Escrever o primeiro teste |
| `04-finders.md` | Finders customizados | Encontrar widgets |
| `05-acoes-e-assertivas.md` | Ações e assertivas | Interagir e validar |
| `06-automacao-de-plataforma.md` | Automação nativa/web | UI do SO e navegador |
| `07-cli.md` | Comandos e flags | Rodar/buildar/desenvolver |
| `08-testes-e-organizacao.md` | Tags, keys, arquitetura | Organizar a suíte |
| `09-boas-praticas.md` | Recomendações consolidadas | Revisar testes |
| `10-logs-e-relatorios.md` | Logs, cobertura, relatórios | Monitorar execução |
| `11-performance.md` | Build, hot restart, sharding | Reduzir tempo e flakiness |
| `12-seguranca.md` | Segredos, isolamento, signing | Endurecer a suíte |
| `13-ci-e-device-farms.md` | CI e farms | Automatizar no pipeline |
| `14-troubleshooting.md` | FAQ e erros comuns | Resolver problemas |
| `15-cheatsheet.md` | Cola de comandos/APIs | Consulta rápida |
| `16-mcp-e-agentes.md` | MCP e agent skills | Usar com IA |
| `17-migracao-e-versoes.md` | Migração e histórico | Vir do 3.x / `$.native` |

## Três conceitos que você precisa dominar

1. **Testes nativos, escritos em Dart.** O binário de teste contém todos os seus testes Dart, mas o SO o vê como JUnit/XCTest. É isso que destrava device farms e relatórios nativos.
2. **Dois mundos, uma API.** Widgets Flutter são manipulados por `$` (finders); o SO e outros apps são manipulados por `$.platform` (automação de plataforma).
3. **Finders por Key são a base.** Uma suíte sustentável compartilha as `Key` entre app e teste, num arquivo único por feature.

## Setup mínimo (resumo)

```console
# 1. CLI
flutter pub global activate patrol_cli
patrol doctor

# 2. Dependência do app
flutter pub add patrol --dev

# 3. Bloco patrol no pubspec.yaml (app_name, package_name, bundle_id) + setup nativo
# 4. Teste
patrol test -t patrol_test/example_test.dart
```

Detalhes completos em `02-instalacao-e-setup.md`.

### Começar rápido sem setup local (Firebase Studio)

Para experimentar sem instalar nada, importe o demo `patrol-idx-demo` no Firebase Studio, marque **Mobile SDK Support (Flutter + Android Emulator)** e clique em Import. O emulador Android abre como preview e o teste roda em modo develop (logs em `onStart`); edite o teste/app e digite `r` para reexecutar.

### Gerar código de extensão (`patrol_gen`)

Para pacotes de extensão nativa, use o contracts generator `patrol_gen` a partir de um schema Dart para produzir cliente Dart + contratos/rotas Android/iOS. Ver `01-como-patrol-funciona.md` e `17-migracao-e-versoes.md`.

## Escopo

Cobre a documentação **voltada ao usuário**. Documentos de contribuidor (`CONTRIBUTING.md`, `dev/*`, skills internos `fix-issue`/`issue-triage`, catálogo `common-issues.md`) e detalhes de implementação do `patrol_gen` ficam de fora — consulte o repositório.

## Fontes

- Documentação oficial: <https://patrol.leancode.co>
- Repositório: <https://github.com/leancodepl/patrol>
- API Dart: <https://pub.dev/documentation/patrol/latest/>
- Discord: <https://discord.gg/ukBK5t4EZg>
