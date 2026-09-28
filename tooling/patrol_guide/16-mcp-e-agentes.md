# 16 — MCP e agentes

> O Patrol tem suporte nativo a agentes de IA via **Patrol MCP** e **agent skills**.

## Patrol MCP

Servidor [Model Context Protocol](https://modelcontextprotocol.io) que expõe `patrol develop` como ferramentas para assistentes de IA rodarem e gerenciarem testes.

- Pacote: [`patrol_mcp`](https://pub.dev/packages/patrol_mcp)
- Compatibilidade: a única restrição é no `patrol_cli`; o resolver escolhe um `patrol_cli` compatível com seu `patrol`.

| patrol_mcp | patrol_cli |
|---|---|
| 0.2.1+ | ^4.8.0 |
| 0.1.4–0.2.0 | ^4.3.0 |
| 0.1.3 | 4.3.1 |
| 0.1.0–0.1.2 | ^4.3.0 |

> `patrol_cli` 4.8.0 exige `patrol` 4.9.0+.

### Instalação

```console
dart pub add --dev patrol_mcp
```

Config (a maioria dos editores usa o mesmo bloco; muda só o arquivo):

```json
{
  "mcpServers": {
    "patrol": {
      "command": "dart",
      "args": ["run", "patrol_mcp"],
      "env": {
        "PROJECT_ROOT": ".",
        "PATROL_FLAGS": "",
        "SHOW_TERMINAL": "false"
      }
    }
  }
}
```

| Editor | Arquivo |
|---|---|
| Claude Code | `.mcp.json` (raiz) |
| Cursor | `.cursor/mcp.json` |
| Gemini CLI | `.gemini/settings.json` |
| GitHub Copilot CLI | `.mcp.json` ou `~/.copilot/mcp-config.json` |
| Copilot VS Code | `.vscode/mcp.json` (chave `servers` + `"type": "stdio"`) |
| Google Antigravity | config global (MCP store) |

### Variáveis de ambiente

| Variável | Efeito |
|---|---|
| `PROJECT_ROOT` | Diretório do `pubspec.yaml` (se o app não estiver na raiz). |
| `PATROL_FLAGS` | Flags extras de `patrol develop` (ex.: `--flavor dev --verbose`, portas). |
| `SHOW_TERMINAL` | Abre o Terminal do macOS para logs ao vivo. |

Também respeita `PATROL_FLUTTER_COMMAND` (FVM/puro). Com FVM, se `dart run patrol_mcp` falhar, rode o servidor no SDK pinado: `"command": "fvm", "args": ["dart", "run", "patrol_mcp"]`.

### Tools

| Tool | Descrição |
|---|---|
| `run` | Roda um arquivo de teste e espera terminar. Auto-seleciona device (Android device > emulador > iOS device > simulador) ou aceita `device`. |
| `devices` | Lista devices Android/iOS. |
| `quit` | Encerra a sessão. |
| `status` | Estado da sessão e output recente. |
| `screenshot` | Captura da tela do device da sessão. |
| `native-tree` | Árvore de UI nativa (para escrever seletores). |

Uso típico (skill oficial):

```
patrol-run({ "testFile": "patrol_test/your_test.dart" })
patrol-screenshot({ "platform": "android" })
patrol-native-tree({})
patrol-status({})
patrol-quit({})
```

## Agent skills

O Patrol publica skills no formato [Agent Skills](https://agentskills.io/) (`SKILL.md`) que ensinam o agente **como** escrever testes. Elas complementam o MCP: o MCP dá as ferramentas, a skill ensina o uso.

### Instalação

```bash
# Claude Code (.claude/skills)
npx skills add leancodepl/patrol/skills -s '*' -a claude-code -y

# Cursor, Codex, Copilot, Gemini CLI, ... (.agents/skills)
npx skills add leancodepl/patrol/skills -s '*' -a universal -y

# Atualizar
npx skills update
```

> Em Claude Code, o `update` pode escrever em `.agents/skills`; se as skills sumirem, reinstale com `-a claude-code`.

### Skills disponíveis

| Skill | Para que serve |
|---|---|
| `patrol-setup` | Setup inicial (Android only): bloco `patrol:`, wiring nativo, primeiro teste verde. |
| `patrol-write-test` | Escrever testes: ordem de ações, regras de API/assertiva, diálogos nativos, keys. |
| `patrol-test-architecture` | Arquitetura LeanCode (Modules, System, ApiClients) com keys compartilhadas. |

### Regras-chave das skills

- Usar `patrol-run` (MCP) para um teste e `patrol test` para todos; **nunca** `flutter test`.
- Inspecionar a API do Patrol antes de implementar; checar `$.platform`.
- Encontrar widgets por key.
- Não usar waits após `tap`/`enterText`/`scrollTo`; assertivas no fim (`waitUntilVisible`).
- Tratar diálogos nativos logo após a ação; preferir `grantPermissionWhenInUse`.
- Não criar `patrolSetUp`/`patrolTearDown` próprios.
- Um arquivo = um teste; após verde, mover lógica para modules.

## Fluxo recomendado com agente

1. Setup: skill `patrol-setup` + `patrol doctor`.
2. Configurar MCP (`.mcp.json` etc.).
3. Instalar skills de escrita/arquitetura.
4. Pedir o teste; o agente escreve, roda via MCP, captura screenshot/native tree, itera.
5. Revisar keys/descrição e mover lógica para modules.

## Fontes

- `docs/documentation/other/patrol-mcp.mdx`, `docs/documentation/other/agent-skills.mdx`, `packages/patrol_mcp/README.md`, `skills/README.md`, `skills/*/SKILL.md`.
