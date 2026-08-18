# Skills do Agente

Skills sao pacotes de capacidades autocontidos que o agente carrega sob demanda. Uma skill fornece workflows especializados, instrucoes de setup, scripts auxiliares e documentacao de referencia.

## Localizacoes

### Global
- `~/.pi/agent/skills/`
- `~/.agents/skills/`

### Projeto (apos confianca)
- `.pi/skills/`
- `.agents/skills/` no cwd e diretorios ancestrais

### Via settings
```json
{
  "skills": ["~/.claude/skills", "~/.codex/skills"]
}
```

### Via CLI
```bash
pi --skill <caminho>  # repetivel
pi --no-skills        # desabilitar discovery
```

## Como Funciona

1. PI escaneia localizacoes e extrai nomes/descricoes
2. System prompt inclui skills disponiveis em formato XML
3. Quando tarefa corresponde, agente usa `read` para carregar SKILL.md completo
4. Segue instrucoes usando caminhos relativos

Progressive disclosure: apenas descricoes estao sempre no contexto, instrucoes completas sao carregadas sob demanda.

## Comandos de Skill

```bash
/skill:brave-search           # Carregar e executar
/skill:pdf-tools extrair      # Com argumentos
```

Toggle com `/settings`:
```json
{ "enableSkillCommands": true }
```

## Estrutura de uma Skill

```
my-skill/
├── SKILL.md              # Obrigatorio: frontmatter + instrucoes
├── scripts/              # Scripts auxiliares
│   └── process.sh
├── references/           # Documentacao detalhada
│   └── api-reference.md
└── assets/
    └── template.json
```

## SKILL.md Format

```markdown
---
name: my-skill
description: O que esta skill faz e quando usar. Seja especifico.
---

# Minha Skill

## Setup

Executar uma vez antes do primeiro uso:
```bash
cd /path/to/skill && npm install
```

## Uso

```bash
./scripts/process.sh <input>
```
```

## Frontmatter

| Campo | Obrigatorio | Descricao |
|-------|-------------|-----------|
| `name` | Sim | Max 64 chars. lowercase a-z, 0-9, hifens |
| `description` | Sim | Max 1024 chars. O que faz e quando usar |
| `license` | Nao | Licenca |
| `compatibility` | Nao | Requisitos de ambiente (max 500 chars) |
| `metadata` | Nao | Key-value arbitrario |
| `allowed-tools` | Nao | Tools pre-aprovadas (experimental) |
| `disable-model-invocation` | Nao | Se true, esconde do system prompt |

### Regras de Nome

- 1-64 caracteres
- Letras minusculas, numeros, hifens apenas
- Sem hifens no inicio/fim
- Sem hifens consecutivos

### Descricoes

Boa:
```yaml
description: Extrai texto e tabelas de PDFs, preenche formularios e junta multiplos PDFs. Use ao trabalhar com documentos PDF.
```

Ruim:
```yaml
description: Ajuda com PDFs.
```

## Exemplo Completo

```
brave-search/
├── SKILL.md
├── search.js
└── content.js
```

**SKILL.md:**
```markdown
---
name: brave-search
description: Busca web e extracao de conteudo via Brave Search API. Use para buscar documentacao, fatos ou qualquer conteudo web.
---

# Brave Search

## Setup

```bash
cd /path/to/brave-search && npm install
```

## Buscar

```bash
./search.js "query"              # Busca basica
./search.js "query" --content    # Incluir conteudo da pagina
```

## Extrair Conteudo

```bash
./content.js https://example.com
```
```

## Repositorios de Skills

- [Anthropic Skills](https://github.com/anthropics/skills) - Processamento de documentos (docx, pdf, pptx, xlsx), web dev
- [Pi Skills](https://github.com/badlogic/pi-skills) - Busca web, automacao de browser, Google APIs, transcricao

## Usando Skills de Outros Harnesses

Para usar skills do Claude Code ou OpenAI Codex:

```json
{
  "skills": ["~/.claude/skills", "~/.codex/skills"]
}
```

Projeto-level:
```json
{
  "skills": ["../.claude/skills"]
}
```
