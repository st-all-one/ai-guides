# Configuracoes Globais e de Projeto

## Localizacao

| Local | Escopo |
|-------|--------|
| `~/.pi/agent/settings.json` | Global (todos projetos) |
| `.pi/settings.json` | Projeto (diretorio atual) |

Edite diretamente ou use `/settings` para opcoes comuns.

## Project Trust

PI pergunta antes de confiar em um projeto que contem recursos locais. Confiar permite:
- Carregar `.pi/settings.json` e recursos `.pi`
- Instalar pacotes de projeto ausentes
- Executar extensoes do projeto

Decisoes sao salvas em `~/.pi/agent/trust.json`.

| defaultProjectTrust | Comportamento |
|---------------------|---------------|
| `"ask"` (default) | Pergunta no interativo |
| `"always"` | Confia automaticamente |
| `"never"` | Ignora recursos do projeto |

Use `--approve`/`-a` ou `--no-approve`/`-na` para override por execucao.

## Todas as Configuracoes

### Modelo e Thinking

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "hideThinkingBlock": false,
  "showCacheMissNotices": false,
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

### UI e Display

```json
{
  "theme": "dark",
  "externalEditor": "code --wait",
  "quietStartup": false,
  "defaultProjectTrust": "ask",
  "collapseChangelog": false,
  "doubleEscapeAction": "tree",
  "treeFilterMode": "default",
  "editorPaddingX": 0,
  "outputPad": 1,
  "autocompleteMaxVisible": 5,
  "showHardwareCursor": false,
  "tuiMode": "regular",
  "fullscreenExitOutput": "transcript",
  "fullscreenScrollbar": "auto"
}
```

`tuiMode`: `"regular"` ou `"fullscreen"`. Mude com `/settings`.

### Compaction

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

### Branch Summary

```json
{
  "branchSummary": {
    "reserveTokens": 16384,
    "skipPrompt": false
  }
}
```

### Retry

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "provider": {
      "timeoutMs": 3600000,
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

Mantenha `retry.provider.maxRetries` em `0` exceto quando retries do provider sao explicitamente necessarios.

### Message Delivery

```json
{
  "steeringMode": "one-at-a-time",
  "followUpMode": "one-at-a-time",
  "transport": "auto",
  "httpIdleTimeoutMs": 300000,
  "websocketConnectTimeoutMs": 15000
}
```

### Terminal e Imagens

```json
{
  "terminal": {
    "showImages": true,
    "imageWidthCells": 60,
    "clearOnShrink": false
  },
  "images": {
    "autoResize": true,
    "blockImages": false
  }
}
```

### Shell

```json
{
  "shellPath": "C:/Program Files/Git/bin/bash.exe",
  "shellCommandPrefix": "shopt -s expand_aliases",
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### Ferramentas

```json
{
  "defaultTools": ["bash", "edit", "write"]
}
```

Array vazio comeca sem ferramentas built-in, mantendo extensoes e tools do SDK.

### Sessoes

```json
{
  "sessionDir": ".pi/sessions"
}
```

### Model Cycling

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

```json
{
  "markdown": {
    "codeBlockIndent": "  ",
    "mermaid": "streaming"
  }
}
```

### Network

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### Telemetria e Update Checks

`enableInstallTelemetry` controla ping anonimo. `PI_SKIP_VERSION_CHECK=1` desabilita verificacao de versao. `--offline` ou `PI_OFFLINE=1` desabilita todas operacoes de rede na inicializacao.

### Recursos

```json
{
  "packages": ["pi-skills", "@org/my-extension"],
  "extensions": ["/path/to/extension.ts"],
  "skills": ["/path/to/skills"],
  "prompts": ["/path/to/prompts"],
  "themes": ["/path/to/themes"],
  "enableSkillCommands": true
}
```

Arrays suportam glob patterns e exclusoes (`!pattern`). Use `+path` para include forçado e `-path` para exclude forçado.

## Exemplo Completo

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "warnings": {
    "anthropicExtraUsage": true
  },
  "packages": ["pi-skills"]
}
```

## Override de Projeto

Settings do projeto mergeiam com as globais (objetos aninhados sao mergeados):

```json
// ~/.pi/agent/settings.json (global)
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 16384 }
}

// .pi/settings.json (projeto)
{
  "compaction": { "reserveTokens": 8192 }
}

// Resultado
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 8192 }
}
```
