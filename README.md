<div align="center">

# ai-guides

**Skills técnicas densas para agentes de IA — contexto sob demanda, não documentação para ler.**

[![License](https://img.shields.io/badge/license-MIT-2b3a42?style=for-the-badge)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-46-009739?style=for-the-badge)](./INDEX.md)
[![CLI](https://img.shields.io/badge/CLI-0.1.1-DEA584?style=for-the-badge&logo=gnubash&logoColor=000)](./bin/ai-guides)
[![Idioma](https://img.shields.io/badge/idioma-pt--BR%20%2F%20EN-6E56CF?style=for-the-badge)](./INDEX.md)

</div>

O **ai-guides** é uma coleção de **46 guias de referência** sobre linguagens, frameworks,
bibliotecas, runtimes, bancos, protocolos, tooling e temas web — cada um empacotado como uma
**skill** (`SKILL.md` + arquivos numerados) que um agente de IA carrega no seu projeto.

A CLI **`ai-guides`** instala e sincroniza qualquer guia em `.agents/skills/<nome>/`, para que o
modelo consulte **apenas a seção necessária** em vez de ler a documentação inteira. Denso,
determinístico e otimizado para tokens.

## 🚀 Quickstart

### 1. Instale a CLI

```bash
curl --proto '=https' --tlsv1.2 --show-error --fail \
  https://raw.githubusercontent.com/st-all-one/ai-guides/main/install.sh | bash
```

Instala o binário em `~/.local/bin/ai-guides` e ajusta o `PATH`. Flags úteis: `--install-dir DIR`,
`--symlink`, `--ref TAG`, `--no-path`, `--uninstall`.

<details>
<summary>A partir do repositório clonado</summary>

```bash
git clone https://github.com/st-all-one/ai-guides.git
cd ai-guides && ./install.sh
```
</details>

### 2. Instale skills no seu projeto

```bash
cd meu-projeto

ai-guides                  # mini-CLI interativo: filtre e selecione
ai-guides list [termo]     # lista as 46 skills
ai-guides search php       # busca por nome / categoria / versão / descrição
ai-guides install dart rust
ai-guides update           # ressincroniza as skills já instaladas
ai-guides remove dart
```

No modo interativo, digite um termo para filtrar (ex.: `php`, `web`, `rust`) e escolha por número
(`1,3,5-7`) ou `a` para todas.

### 3. Use como contexto

Cada guia é copiado **1:1** para `.agents/skills/<nome>/`. Aponte o agente para o `SKILL.md` — o
frontmatter YAML (`name`, `description`, `category`, `version`, `tags`) diz **quando** carregar o
guia; os arquivos numerados (`00-*`, `01-*`, …) formam a ordem de consulta.

```bash
# exemplo: skill Rust instalada
.agents/skills/rust/
├── SKILL.md            # metadados + mapa de arquivos
├── VERSION             # versão de referência
├── 00-introduction.md
├── 01-toolchain.md
└── …
```

> A cópia usa `rsync --delete`: **edições locais são sobrescritas** pelo upstream.

## 🧠 Como funciona

1. **Um guia = uma skill.** `SKILL.md` (frontmatter YAML + mapa) descreve propósito e gatilhos de
   uso; `VERSION` fixa a versão de referência da tecnologia.
2. **Progressão numerada.** Arquivos `00-*`, `01-*`, … formam o caminho lógico de leitura —
   o agente busca o arquivo específico da tarefa, não o guia inteiro.
3. **Cache + 1:1.** A CLI clona o repositório em cache, resolve o nome da skill e sincroniza a
   pasta. `update` ressincroniza sem reinstalar; `remove` apaga o destino com guardas de segurança.

## 📁 Categorias

| Pasta | Skills | Conteúdo |
|---|---:|---|
| [`languages/`](./languages/) | 9 | Linguagens de programação e formatos de marcação |
| [`frameworks/`](./frameworks/) | 6 | Frameworks full-stack e web |
| [`libraries/`](./libraries/) | 8 | UI, templates, query builder e TUI |
| [`runtimes/`](./runtimes/) | 2 | Servidores e runtimes de execução |
| [`databases/`](./databases/) | 3 | Bancos de dados e persistência |
| [`protocols/`](./protocols/) | 5 | Protocolos, especificações e APIs |
| [`tooling/`](./tooling/) | 6 | Ferramentas de build, teste e agentes |
| [`web/`](./web/) | 5 | Temas transversais da plataforma web |
| [`ai/`](./ai/) | 2 | IA, agentes e modelos |

A lista completa (nome, categoria, versão e caminho) está em **[`INDEX.md`](./INDEX.md)**.

## ⚙️ Configuração

Variáveis de ambiente da CLI:

| Variável | Default | Descrição |
|---|---|---|
| `AI_GUIDES_REPO_URL` | `https://github.com/st-all-one/ai-guides.git` | Repositório de origem |
| `AI_GUIDES_BRANCH` | `main` | Branch |
| `AI_GUIDES_CACHE` | `${XDG_CACHE_HOME:-~/.cache}/ai-guides` | Cache do clone |
| `AI_GUIDES_SOURCE` | — | Usa um checkout local em vez do cache |
| `AI_GUIDES_ROOT` | git toplevel ou `$PWD` | Raiz do projeto destino |
| `AI_GUIDES_SKILL_DIR` | `<root>/.agents/skills` | Destino das skills |

> Prefere `.agentes/skills`? Defina `AI_GUIDES_SKILL_DIR="$PWD/.agentes/skills"`.

## 📖 Documentação

| Doc | Conteúdo |
|---|---|
| [`USAGE.md`](./USAGE.md) | Como usar o repositório como contexto (humanos e IA). |
| [`INDEX.md`](./INDEX.md) | Índice completo das 46 skills com categoria, versão e caminho. |
| [`bin/ai-guides`](./bin/ai-guides) | Código da CLI (`list`, `search`, `install`, `update`, `remove`, `sync`). |
| [`install.sh`](./install.sh) | Instalador da CLI com `--prefix`, `--symlink`, `--ref`, `--uninstall`. |

## Licença

MIT © 2026 st-all-one — uso livre, sem atribuição.
