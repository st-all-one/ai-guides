# Uso Interativo e CLI

## Modo Interativo

Ao iniciar PI, a interface tem 4 areas:

1. **Header** - Atalhos, arquivos de contexto carregados, templates, skills, extensoes
2. **Mensagens** - Mensagens do usuario, respostas, chamadas de ferramenta
3. **Editor** - Onde voce digita; cor da borda indica nivel de thinking
4. **Footer** - Diretorio, nome da sessao, tokens/custo, modelo atual

### Recursos do Editor

| Recurso | Como |
|---------|------|
| Referencia de arquivo | Digite `@` para busca fuzzy |
| Completar caminho | Tab |
| Multi-linha | Shift+Enter (ou Ctrl+Enter no Windows Terminal) |
| Copiar resposta | Ctrl+X copia ultima mensagem do assistente |
| Imagens | Ctrl+V (Alt+V no Windows) ou arrastar para o terminal |
| Comando shell | `!comando` executa e envia saida ao modelo |
| Comando oculto | `!!comando` executa sem enviar saida ao modelo |
| Editor externo | Ctrl+G abre editor externo |

## Slash Commands

| Comando | Descricao |
|---------|-----------|
| `/login`, `/logout` | Gerenciar credenciais |
| `/llama` | Gerenciar modelos llama.cpp |
| `/model` | Trocar modelo |
| `/scoped-models` | Habilitar/desabilitar modelos para Ctrl+P |
| `/settings` | Nivel de thinking, tema, transporte |
| `/resume` | Escolher sessao anterior |
| `/new` | Nova sessao |
| `/name <nome>` | Definir nome da sessao |
| `/session` | Mostrar info da sessao |
| `/tree` | Navegar arvore da sessao |
| `/trust` | Salvar decisao de confianca do projeto |
| `/fork` | Criar sessao a partir de mensagem anterior |
| `/clone` | Duplicar branch ativa em nova sessao |
| `/compact [instrucoes]` | Compactar contexto |
| `/copy` | Copiar ultima resposta para clipboard |
| `/export [arquivo]` | Exportar sessao para HTML ou JSONL |
| `/import <arquivo>` | Importar sessao JSONL |
| `/share` | Upload como gist GitHub privado |
| `/reload` | Recarregar extensoes, skills, prompts, temas |
| `/hotkeys` | Mostrar atalhos |
| `/quit` | Sair |

## Fila de Mensagens

Voce pode enviar mensagens enquanto o agente trabalha:

- **Enter** - Enfileira mensagem de steeting, entregue apos tools do turno atual
- **Alt+Enter** - Enfileira follow-up, entregue quando agente terminar tudo
- **Escape** - Aborta e restaura mensagens enfileiradas no editor
- **Alt+Up** - Recupera mensagens enfileiradas

Configure com `steeringMode` e `followUpMode` nas settings.

## Sessoes

```bash
pi -c                  # Continuar ultima sessao
pi -r                  # Navegar sessoes anteriores
pi --no-session        # Modo efemero (nao salva)
pi --name "minha tarefa" # Nome da sessao no inicio
pi --session <path|id> # Abrir sessao especifica
pi --fork <path|id>    # Fork de uma sessao
```

## Modo Nao-Interativo

```bash
pi -p "Resumir este codebase"              # Print mode
cat README.md | pi -p "Resumir este texto" # Com stdin
pi -p @screenshot.png "O que ha nessa imagem?" # Com imagem
pi --mode json "Listar arquivos"           # Eventos JSON
pi --mode rpc                              # RPC sobre stdin/stdout
```

## Referencia CLI

### Opcoes de Modelo

| Opcao | Descricao |
|-------|-----------|
| `--provider <nome>` | Provider (anthropic, openai, google) |
| `--model <padrao>` | Modelo (suporta `provider/id` e `:<thinking>`) |
| `--api-key <key>` | API key |
| `--thinking <nivel>` | off, minimal, low, medium, high, xhigh, max |
| `--models <padroes>` | Padroes para cycling com Ctrl+P |
| `--list-models [busca]` | Listar modelos disponiveis |

### Opcoes de Sessao

| Opcao | Descricao |
|-------|-----------|
| `-c`, `--continue` | Continuar sessao mais recente |
| `-r`, `--resume` | Navegar e selecionar sessao |
| `--session <path\|id>` | Usar sessao especifica |
| `--fork <path\|id>` | Fork de sessao |
| `--no-session` | Modo efemero |

### Opcoes de Ferramentas

| Opcao | Descricao |
|-------|-----------|
| `--tools <lista>` | Allowlist de ferramentas |
| `--exclude-tools <lista>` | Desabilitar ferramentas especificas |
| `--no-builtin-tools` | Sem ferramentas built-in, manter extensoes |
| `--no-tools` | Desabilitar todas ferramentas |

### Opcoes de Recursos

| Opcao | Descricao |
|-------|-----------|
| `-e`, `--extension <fonte>` | Carregar extensao |
| `--skill <caminho>` | Carregar skill |
| `--prompt-template <caminho>` | Carregar template |
| `--theme <caminho>` | Carregar tema |
| `--no-context-files` | Nao carregar AGENTS.md/CLAUDE.md |

### Exemplos Praticos

```bash
# Interativo com prompt inicial
pi "Listar todos os arquivos .ts em src/"

# Nao-interativo
pi -p "Resumir este codebase"

# Com modelo diferente
pi --provider openai --model gpt-4o "Ajuda a refatorar"

# Modelo com thinking level
pi --model sonnet:high "Resolver problema complexo"

# Apenas leitura
pi --tools read,grep,find,ls -p "Revisar o codigo"

# Desabilitar uma ferramenta
pi --exclude-tools ask_question
```

## Design Principles

PI mantem o nucleo pequeno e coloca comportamento especifico de workflow em extensoes, skills, prompts e pacotes. Nao inclui MCP built-in, sub-agentes, popups de permissao, plan mode, to-dos ou bash em background. Voce pode construir ou instalar esses fluxos como extensoes ou pacotes.
