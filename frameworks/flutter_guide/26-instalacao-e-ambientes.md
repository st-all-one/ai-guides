# 26 — Instalação, SDK e ambientes

Como instalar, atualizar e manter o ambiente Flutter. Para o dia a dia de projeto, ver `03`; para editores/DevTools, ver `22`.

## 1. Métodos de instalação

| Método | Quando usar |
|---|---|
| **Quick start** (VS Code) | Começar rápido com Code OSS/VS Code |
| **With VS Code** | Setup guiado pela extensão Flutter |
| **Manual** | Controle total (baixar SDK e configurar) |
| **Custom** | Escolher IDE, plataforma-alvo e configurar |

Todos terminam com `flutter doctor` validando o ambiente.

## 2. Pré-requisitos por plataforma

| Alvo | Requisitos |
|---|---|
| **Android** | Android Studio (ou cmdline-tools), JDK, SDK/emulador; licenças aceitas |
| **iOS/macOS** | macOS + Xcode + CocoaPods (e SwiftPM quando aplicável) |
| **Web** | Navegador (Chrome/Edge/Firefox/Safari) |
| **Windows** | Visual Studio com "Desktop development with C++" |
| **Linux** | Dependências GTK e toolchain de build |

```console
flutter doctor -v
```

## 3. Adicionar ao PATH

- **Windows**: adicione `flutter\bin` às variáveis de ambiente.
- **macOS/Linux**: exporte `export PATH="$PATH:/caminho/para/flutter/bin"` em `~/.zshrc`/`~/.bashrc`.
- **ChromeOS**: ver `install/add-to-path.md`.

Confirme com `which flutter` / `flutter --version`.

## 4. Versões, canais e arquivo

| Canal | Descrição |
|---|---|
| **stable** | Recomendado para produção; ~trimestral + hotfixes |
| **beta** | Última stable testada; atualizado mensalmente |
| **main** | Desenvolvimento do Flutter; não recomendado |

```console
flutter channel            # ver canal atual
flutter channel beta       # trocar
flutter upgrade            # atualizar no canal atual
```

- **Public release windows** e **branch cutoff dates** definem quando uma mudança entra numa release.
- **SDK archive**: baixar versões específicas; trocar com `git checkout <versão>` dentro do SDK.
- Evite depender do canal `main` em produção.

## 5. Atualização

```console
flutter upgrade
flutter pub upgrade          # dependências
flutter pub outdated
```

- Acompanhe **migration guides** de breaking changes e a lista de anúncios.
- Considere registrar seus testes no **test registry** para detectar regressões futuras.
- `flutter pub upgrade --major-versions` para atualizações maiores (revise mudanças).

## 6. Conteúdo do SDK e CLIs

O SDK inclui: framework Dart/Flutter, engine, ferramentas e suporte a editores.

- **`flutter` CLI**: `create`, `run`, `build`, `test`, `analyze`, `doctor`, `pub`, `gen-l10n`, `symbolize`…
- **`dart` CLI**: `format`, `fix`, `analyze`, `test`, `pub`, `run`, `compile`…

```console
flutter --version
dart --version
flutter help
dart help
```

## 7. Criar um novo app

```console
flutter create meu_app
cd meu_app
flutter run
```

- Nome em `lowercase_with_underscores`.
- Templates: `app` (padrão), `package`, `plugin`, `module` (add-to-app), `skeleton`.
- Plataformas: `flutter create --platforms=android,ios,web,linux,macos,windows .`
- No VS Code: **Flutter: New Project**.

## 8. Plataformas suportadas

| Plataforma | Status |
|---|---|
| Android | Estável |
| iOS | Estável |
| Web | Estável |
| macOS | Estável |
| Windows | Estável |
| Linux | Estável |
| Embedded/Fuchsia | Experimental/variável |

Consulte `reference/supported-platforms.md` para detalhes e versões mínimas.

## 9. Troubleshooting comum

| Problema | Solução |
|---|---|
| `flutter: command not found` | Adicionar `flutter/bin` ao PATH |
| Flutter em pastas especiais/OneDrive | Mover para caminho simples (sem espaços) |
| Múltiplas versões de Java | Definir `JAVA_HOME` corretamente |
| `cmdline-tools` ausente | Instalar via SDK Manager |
| Android license status unknown | `flutter doctor --android-licenses` |
| `SocketException`/sem rota | Rede/firewall/proxy |
| Exit code 69 / erros de build | `flutter clean` + reinstalar deps |
| Windows "Filename too long" | `git config --system core.longpaths true` |

Sempre comece por `flutter doctor -v`.

## 10. Desinstalar/reinstalar

- Remova o diretório do SDK e as entradas de PATH.
- Limpe arquivos de configuração/caches (`.dart-tool`, `.pub-cache`, configs de IDE).
- Reinstale pelo método escolhido e valide com `flutter doctor`.

## 11. Boas práticas de ambiente

- Use a mesma versão do SDK em toda a equipe (fixe via FVM ou `flutter --version` documentada).
- Mantenha Android Studio/Xcode atualizados.
- Versione `.fvmrc`/documentação de toolchain se usar FVM.
- Rode `flutter doctor` na CI.
- Nunca versione `.dart_tool/`, `build/`, segredos ou keystores (ver `12`).
