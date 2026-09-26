# Temas, Prompts e Keybindings

## Temas

### Localizacao

- Built-in: `dark`, `light`
- Global: `~/.pi/agent/themes/*.json`
- Projeto: `.pi/themes/*.json` (apos confianca)
- Pacotes: diretorios `themes/`
- CLI: `--theme <caminho>`

Desabilitar: `--no-themes`

### Selecionar Tema

```json
{ "theme": "my-theme" }
```

Ou `/settings`. Para run inicial sem mudar setting:
```bash
pi --use-theme light
pi --use-theme light/dark  # Segue aparencia do terminal
```

### Criar Tema Customizado

```bash
mkdir -p ~/.pi/agent/themes
```

```json
{
  "$schema": "https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "my-theme",
  "vars": {
    "primary": "#00aaff",
    "secondary": 242
  },
  "colors": {
    "accent": "primary",
    "border": "primary",
    "borderAccent": "#00ffff",
    "borderMuted": "secondary",
    "success": "#00ff00",
    "error": "#ff0000",
    "warning": "#ffff00",
    "muted": "secondary",
    "dim": 240,
    "text": "",
    "thinkingText": "secondary",
    "selectedBg": "#2d2d30",
    "scrollbarThumb": "#555566",
    "searchMatchBg": "#2d2d30",
    "searchMatchText": "",
    "userMessageBg": "#2d2d30",
    "userMessageText": "",
    "customMessageBg": "#2d2d30",
    "customMessageText": "",
    "customMessageLabel": "primary",
    "toolPendingBg": "#1e1e2e",
    "toolSuccessBg": "#1e2e1e",
    "toolErrorBg": "#2e1e1e",
    "toolTitle": "primary",
    "toolOutput": "",
    "mdHeading": "#ffaa00",
    "mdLink": "primary",
    "mdLinkUrl": "secondary",
    "mdCode": "#00ffff",
    "mdCodeBlock": "",
    "mdCodeBlockBorder": "secondary",
    "mdQuote": "secondary",
    "mdQuoteBorder": "secondary",
    "mdHr": "secondary",
    "mdListBullet": "#00ffff",
    "toolDiffAdded": "#00ff00",
    "toolDiffRemoved": "#ff0000",
    "toolDiffContext": "secondary",
    "syntaxComment": "secondary",
    "syntaxKeyword": "primary",
    "syntaxFunction": "#00aaff",
    "syntaxVariable": "#ffaa00",
    "syntaxString": "#00ff00",
    "syntaxNumber": "#ff00ff",
    "syntaxType": "#00aaff",
    "syntaxOperator": "primary",
    "syntaxPunctuation": "secondary",
    "thinkingOff": "secondary",
    "thinkingMinimal": "primary",
    "thinkingLow": "#00aaff",
    "thinkingMedium": "#00ffff",
    "thinkingHigh": "#ff00ff",
    "thinkingXhigh": "#ff0000",
    "thinkingMax": "#ff0088",
    "bashMode": "#ffaa00"
  }
}
```

Hot reload: ao editar o arquivo do tema ativo, PI recarrega automaticamente.

### Formatos de Cor

| Formato | Exemplo | Descricao |
|---------|---------|-----------|
| Hex | `"#ff0000"` | RGB 6-digitos |
| 256-color | `39` | Paleta xterm 256 |
| Variavel | `"primary"` | Referencia a entrada `vars` |
| Default | `""` | Cor padrao do terminal |

## Prompt Templates

### Localizacao

- Global: `~/.pi/agent/prompts/*.md`
- Projeto: `.pi/prompts/*.md` (apos confianca)
- Pacotes: diretorios `prompts/`
- CLI: `--prompt-template <caminho>`

Desabilitar: `--no-prompt-templates`

### Formato

```markdown
---
description: Revisar mudancas git staged
---
Revisar as mudancas staged (`git diff --cached`). Focar em:
- Bugs e erros de logica
- Problemas de seguranca
- Gaps de tratamento de erros
```

O nome do arquivo vira o comando: `review.md` -> `/review`

### Argumentos

- `$1`, `$2`, ... argumentos posicionais
- `$@` ou `$ARGUMENTS` - todos argumentos juntos
- `${1:-default}` - default se argumento vazio
- `${@:N}` - argumentos a partir da posicao N
- `${@:N:L}` - L argumentos comecando em N

```markdown
---
description: Criar componente
---
Criar um componente React chamado $1 com features: $@
```

Uso: `/component Button "onClick handler" "disabled support"`

### Argument Hints

```markdown
---
description: Revisar PRs com analise estruturada
argument-hint: "<PR-URL>"
---
```

## Keybindings

### Arquivo de Configuracao

`~/.pi/agent/keybindings.json`. Apos editar, execute `/reload`.

### Formato da Tecla

`modifier+key`: modifiers sao `ctrl`, `shift`, `alt`, `super` (combinaveis).

### Principais Acoes

| ID | Default | Descricao |
|----|---------|-----------|
| `app.interrupt` | `escape` | Cancelar/abortar |
| `app.clear` | `ctrl+c` | Limpar editor (1a) / sair (2a) |
| `app.exit` | `ctrl+d` | Sair (editor vazio) |
| `app.editor.external` | `ctrl+g` | Editor externo |
| `app.clipboard.pasteImage` | `ctrl+v` | Colar imagem |
| `app.model.select` | `ctrl+l` | Seletor de modelo |
| `app.model.cycleForward` | `ctrl+p` | Ciclar modelo |
| `app.model.cycleBackward` | `shift+ctrl+p` | Ciclar modelo (reverso) |
| `app.thinking.cycle` | `shift+tab` | Ciclar thinking level |
| `app.tools.expand` | `ctrl+o` | Expandir/colapsar tool output |
| `app.message.copy` | `ctrl+x` | Copiar ultima mensagem |
| `app.message.followUp` | `alt+enter` | Enfileirar follow-up |
| `app.message.dequeue` | `alt+up` | Recuperar mensagens enfileiradas |
| `tui.input.submit` | `enter` | Enviar input |
| `tui.input.newLine` | `shift+enter` | Nova linha |
| `tui.input.tab` | `tab` | Autocomplete |

### Exemplo Emacs

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"]
}
```

### Exemplo Vim

```json
{
  "tui.editor.cursorUp": ["up", "alt+k"],
  "tui.editor.cursorDown": ["down", "alt+j"],
  "tui.editor.cursorLeft": ["left", "alt+h"],
  "tui.editor.cursorRight": ["right", "alt+l"]
}
```

### Fullscreen Viewport

No modo fullscreen (`--tui-mode fullscreen`), as teclas de navegação do transcript:

| Keybinding id | Default | Descricao |
|---------------|---------|-----------|
| `tui.altScreen.pageUp` | `pageUp` | Scroll up pagina |
| `tui.altScreen.pageDown` | `pageDown` | Scroll down pagina |
| `tui.altScreen.top` | `home` | Inicio do transcript |
| `tui.altScreen.bottom` | `end` | Fim do transcript |
| `tui.altScreen.search` | `ctrl+shift+f` | Buscar no transcript |
