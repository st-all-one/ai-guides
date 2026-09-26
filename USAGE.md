# USAGE — Como usar este repositório

## Objetivo

Este repositório foi criado para ser usado **como fonte de contexto por modelos de linguagem (LLMs)** durante tarefas de programação. Os guias são densos, diretos e otimizados para referência rápida — não para leitura sequencial como um tutorial tradicional.

## Organização

Os guias estão agrupados por **categoria semântica**:

| Pasta | Conteúdo |
|---|---|
| `languages/` | Linguagens de programação e formatos de marcação |
| `frameworks/` | Frameworks full-stack e web |
| `libraries/` | Bibliotecas de UI, templates, query builder e TUI |
| `runtimes/` | Servidores e runtimes de execução |
| `databases/` | Bancos de dados e persistência |
| `protocols/` | Protocolos, especificações e APIs |
| `tooling/` | Ferramentas de desenvolvimento, build, teste e agentes |
| `web/` | Temas transversais da plataforma web |
| `ai/` | IA, agentes e modelos |

A lista completa de skills (nome, categoria, versão e caminho) está em [`INDEX.md`](./INDEX.md).

## Para humanos

Navegue pelas categorias acima ou pelo [`README.md`](./README.md), que lista todos os guias. Cada diretório de guia contém arquivos numerados que formam uma progressão lógica.

## Para IAs (assistentes de código)

Ao ser invocado como contexto, siga estas diretrizes:

1. **Leia o `SKILL.md` do guia** — cada guia tem um `SKILL.md` com frontmatter YAML (`name`, `description`, `category`, `version`, `tags`, `license`) que descreve propósito, arquivos e quando usar. Comece por ele.
2. **Leia o índice do guia relevante** — cada guia tem um arquivo `00-*` ou `01-*` que apresenta a estrutura completa.
3. **Verifique o `VERSION`** — confira se a versão referenciada é compatível com o projeto do usuário.
4. **Consulte apenas as seções necessárias** — não leia o guia inteiro; busque o arquivo específico para a tarefa.
5. **Priorize guias específicos** — se o usuário estiver trabalhando com Leptos, carregue `frameworks/leptos_guide/`; se for CSS moderno, carregue `languages/css_guide/`.
6. **Ignore `conversations/`** — este diretório contém histórico de chat e não deve ser usado como referência técnica.

## Convenções

- `SKILL.md` → metadados do guia otimizados para carregamento rápido por IA (frontmatter YAML + mapa de arquivos)
- `VERSION` → versão de referência da tecnologia coberta pelo guia
- `00-*` ou `01-*` → introdução / sumário
- Arquivos numerados sequencialmente → ordem recomendada de consulta
- `*-recommended-*` → práticas recomendadas e implementação final
- Conteúdo em português (pt-BR) com termos técnicos em inglês quando apropriado

## Fluxo sugerido

```
1. Identificar tecnologia alvo
2. Localizar a categoria semântica (languages, frameworks, libraries, ...)
3. Carregar `guia/SKILL.md` (metadados)
4. Carregar `guia/VERSION` (versão de referência)
5. Carregar `guia/00-introducao.md` (visão geral)
6. Carregar arquivo(s) específico(s) para a tarefa
7. Implementar com base no guia
```
