# Gerenciamento de Sessoes

## Armazenamento

Sessoes sao salvas automaticamente em `~/.pi/agent/sessions/`, organizadas por diretorio de trabalho. Cada sessao e um arquivo JSONL com estrutura de arvore.

```bash
pi -c                  # Continuar ultima sessao
pi -r                  # Navegar e selecionar sessoes
pi --no-session        # Modo efemero (nao salva)
pi --name "minha tarefa" # Nome da sessao
pi --session <path|id> # Sessao especifica
pi --fork <path|id>    # Fork de sessao
```

## Comandos de Sessao

| Comando | Descricao |
|---------|-----------|
| `/resume` | Navegar sessoes anteriores |
| `/new` | Nova sessao |
| `/name <nome>` | Definir nome |
| `/session` | Mostrar info (arquivo, ID, tokens, custo) |
| `/tree` | Navegar arvore da sessao |
| `/fork` | Criar sessao a partir de mensagem anterior |
| `/clone` | Duplicar branch ativa em nova sessao |
| `/compact [instrucoes]` | Compactar contexto |
| `/export [arquivo]` | Exportar para HTML |
| `/share` | Upload como gist GitHub |

## Navegacao com `/tree`

Sessoes sao armazenadas como arvores. Cada entrada tem um `id` e `parentId`. A posicao atual e a folha ativa.

```
Exemplo de arvore:

  user: "Ola, voce pode ajudar..."
    assistant: "Claro! Posso..."
      user: "Vamos tentar abordagem A..."
        assistant: "Para abordagem A..."
          user: "Isso funcionou..."  <-- ativo
      user: "Na verdade, abordagem B..."
        assistant: "Para abordagem B..."
```

### Controles da Tree

| Tecla | Acao |
|-------|------|
| ↑/↓ | Navegar entradas visiveis |
| ←/→ | Pagina acima/abaixo |
| Ctrl+←/Ctrl+→ | Fold/unfold ou saltar entre segmentos |
| Shift+L | Definir/remover label |
| Shift+T | Toggle timestamps de labels |
| Enter | Selecionar entrada |
| Escape/Ctrl+C | Cancelar |
| Ctrl+O | Ciclar modo de filtro |

Modos de filtro: default, no-tools, user-only, labeled-only, all. Configure o default com `treeFilterMode` nas settings.

### Comportamento de Selecao

**Selecionando mensagem do usuario ou custom:**
1. Move a folha para o pai da mensagem
2. Coloca o texto no editor
3. Voce edita e reenvia, criando nova branch

**Selecionando mensagem do assistente, tool, compaction ou outra:**
1. Move a folha para a entrada
2. Deixa o editor vazio
3. Voce continua dali

## `/tree`, `/fork` e `/clone`

| Feature | `/tree` | `/fork` | `/clone` |
|---------|---------|---------|----------|
| Saida | Mesmo arquivo | Novo arquivo | Novo arquivo |
| Visao | Arvore completa | Seletor de mensagens | Branch ativa |
| Uso tipico | Explorar alternativas | Nova sessao de prompt anterior | Duplicar trabalho atual |
| Summary | Opcional | Nenhum | Nenhum |

## Branch Summaries

Quando `/tree` muda de branch, PI pode resumir a branch abandonada e anexar o resumo na nova posicao. Isso preserva contexto importante sem repetir toda a branch.

Opcoes:
1. Sem resumo
2. Resumo com prompt default
3. Resumo com instrucoes customizadas

## Compactacao

Compactacao resume mensagens antigas para liberar contexto.

### Quando Ativa

```
contextTokens > contextWindow - reserveTokens
```

Default: `reserveTokens` = 16384 tokens.

Execute manualmente com `/compact [instrucoes]`.

### Como Funciona

1. Encontra ponto de corte: caminha da mensagem mais recente para tras, acumulando tokens ate `keepRecentTokens` (default 20k)
2. Extrai mensagens do boundary anterior ate o ponto de corte
3. Gera resumo com LLM usando formato estruturado
4. Anexa `CompactionEntry` com resumo e `firstKeptEntryId`
5. Reconstrui contexto: resumo + mensagens de `firstKeptEntryId` em diante

### Split Turns

Quando uma unica turn excede `keepRecentTokens`, o corte acontece no meio de uma turn (split turn). PI gera dois resumos e os merge:
1. Resumo do historico anterior
2. Resumo do prefixo da turn dividida

### Configuracao

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

Desabilite com `"enabled": false`. Voce ainda pode compactar manualmente com `/compact`.

## Exportar e Compartilhar

```bash
/export              # Exporta para HTML
/share               # Upload como gist GitHub com link compartilhavel
```

Para publicar sessoes para pesquisa: [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf) publica no Hugging Face datasets.

## Formato das Sessoes

Sessoes usam JSONL e contem: mensagens, mudancas de modelo, mudancas de thinking level, labels, compactions, branch summaries e extensoes.

Veja [session-format.md](../pi/packages/coding-agent/docs/session-format.md) para detalhes do formato JSONL e API do SessionManager.
