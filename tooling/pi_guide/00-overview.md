# PI Coding Agent - Visao Geral

## O que e o PI?

PI e um agente de programacao minimalista para terminal, projetado para ser pequeno no nucleo enquanto e estendido via extensoes TypeScript, skills, prompts, temas e pacotes. Ele roda localmente com as permissoes do usuario que o inicia.

## Arquitetura

```
~/.pi/agent/                   # Diretorio global de configuracao
  ├── settings.json           # Configuracoes globais
  ├── auth.json               # Credenciais de providers
  ├── keybindings.json        # Atalhos de teclado customizados
  ├── extensions/             # Extensoes globais (.ts)
  ├── skills/                 # Skills globais
  ├── prompts/                # Prompt templates globais
  ├── themes/                 # Temas customizados (.json)
  ├── sessions/               # Sessoes salvas (por diretorio)
  ├── trust.json              # Decisoes de confianca de projetos
  └── models.json             # Modelos customizados

<projeto>/
  ├── .pi/
  │   ├── settings.json       # Configuracoes do projeto
  │   ├── extensions/         # Extensoes do projeto
  │   ├── skills/             # Skills do projeto
  │   ├── prompts/            # Prompts do projeto
  │   └── themes/             # Temas do projeto
  ├── AGENTS.md               # Instrucoes do agente (ou CLAUDE.md)
  └── AGENTS.override.md     # Override do AGENTS.md desse diretorio
```

## Ferramentas Built-in

| Ferramenta | Descricao |
|-----------|-----------|
| `read` | Le arquivos |
| `write` | Cria ou sobrescreve arquivos |
| `edit` | Faz patch em arquivos |
| `bash` | Executa comandos shell |
| `grep` | Busca em conteudo de arquivos |
| `find` | Busca arquivos por padrao |
| `ls` | Lista diretorios |

## Fluxo de Trabalho Basico

1. **Instalar**: `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`
2. **Autenticar**: `export ANTHROPIC_API_KEY=sk-ant-...` ou usar `/login`
3. **Rodar**: `pi` no diretorio do projeto
4. **Trabalhar**: Digitar pedidos, PI usa ferramentas para executar tarefas
5. **Personalizar**: Adicionar `AGENTS.md`, extensoes, skills, temas

## Documentacao

| Arquivo | Conteudo |
|---------|----------|
| [01-installation.md](01-installation.md) | Instalacao e configuracao inicial |
| [02-usage.md](02-usage.md) | Uso interativo, CLI, slash commands |
| [03-providers.md](03-providers.md) | Providers, autenticacao, API keys |
| [04-models.md](04-models.md) | Modelos customizados, Ollama, proxies |
| [05-settings.md](05-settings.md) | Configuracoes globais e de projeto |
| [06-sessions.md](06-sessions.md) | Sessoes, tree, branches, compactacao |
| [07-extensions.md](07-extensions.md) | Extensoes TypeScript completas |
| [08-skills.md](08-skills.md) | Skills reutilizaveis |
| [09-packages.md](09-packages.md) | Pacotes PI (npm/git) |
| [10-customization.md](10-customization.md) | Temas, prompts, keybindings |
| [11-integration.md](11-integration.md) | SDK, RPC, integracao programatica |
| [12-security.md](12-security.md) | Seguranca e containerizacao |
| [13-environment.md](13-environment.md) | Variaveis de ambiente e referencia |
