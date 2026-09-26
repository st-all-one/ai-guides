# Instalacao e Configuracao Inicial

## Instalacao via npm (recomendado)

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` desabilita scripts de lifecycle. PI nao precisa de scripts de install para instalacoes normais.

### Desinstalacao

```bash
# npm
npm uninstall -g @earendil-works/pi-coding-agent

# pnpm
pnpm remove -g @earendil-works/pi-coding-agent

# Yarn
yarn global remove @earendil-works/pi-coding-agent

# Bun
bun uninstall -g @earendil-works/pi-coding-agent
```

Desinstalar PI remove o executavel mas mantem configuracoes, credenciais, sessoes e pacotes em `~/.pi/agent/`.

## Instalacao via curl (Linux/macOS)

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

## Autenticacao

### Opcao 1: Login por assinatura (recomendado)

```bash
pi
/login
```

Providers suportados:
- **Claude Pro/Max** (assinatura Anthropic)
- **ChatGPT Plus/Pro** (Codex/OpenAI)
- **GitHub Copilot**
- **xAI** (Grok/X)
- **OpenRouter** (OAuth)
- **Radius**

### Opcao 2: API Key

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Google Gemini
export GEMINI_API_KEY=...

# DeepSeek
export DEEPSEEK_API_KEY=sk-...

pi
```

### Opcao 3: auth.json

Armazenar credenciais em `~/.pi/agent/auth.json`:

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." }
}
```

O arquivo e criado com permissoes 0600. Credenciais em auth.json tem prioridade sobre variaveis de ambiente.

### Resolucao de Chave

O campo `key` suporta:
- **Comando shell**: `"!security find-generic-password -ws 'anthropic'"` - executa o comando e usa stdout
- **Interpolacao de variavel**: `"$MY_API_KEY"` ou `"${MY_API_KEY}"`
- **Escapes**: `"$$"` para literal `$`, `"$!"` para literal `!`
- **Valor literal**: `"sk-ant-..."`

## Primeira Sessao

```bash
cd /path/to/project
pi
```

PI inicia no diretorio de trabalho atual e pode modificar arquivos la. Use git para rollback facil.

### Instrucoes de Projeto

Crie um `AGENTS.md` na raiz do projeto:

```markdown
# Instrucoes do Projeto

- Executar `npm run check` apos mudancas no codigo
- Nao executar migracoes de producao localmente
- Manter respostas concisas
```

PI carrega:
- `~/.pi/agent/AGENTS.md` (instrucoes globais)
- `AGENTS.md` ou `CLAUDE.md` dos diretorios pais e do diretorio atual
- `AGENTS.override.md` substitui `AGENTS.md`/`CLAUDE.md` desse diretorio

Reinicie PI ou execute `/reload` apos alterar arquivos de contexto.

## Verificando a Instalacao

```bash
pi --version      # Versao
pi --help         # Ajuda
pi --list-models  # Lista modelos disponiveis
```

## Configuracao de Terminal

- **Linux/macOS**: Terminal compativel com cores 24-bit (iTerm2, Kitty, WezTerm, Alacritty)
- **Windows**: Windows Terminal, VS Code
- **SSH**: Increase `PI_TUI_ESC_TIMEOUT` se teclas Alt nao funcionam
- **tmux**: Funciona normalmente, usar `tmux new-session` para testes

## Proximos Passos

- [02-usage.md](02-usage.md) - Aprender a usar PI interativamente
- [03-providers.md](03-providers.md) - Configurar mais providers
- [05-settings.md](05-settings.md) - Configuracoes avancadas
