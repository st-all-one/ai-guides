# USAGE — Como usar este repositório

## Objetivo

Este repositório foi criado para ser usado **como fonte de contexto por modelos de linguagem (LLMs)** durante tarefas de programação. Os guias são densos, diretos e otimizados para referência rápida — não para leitura sequencial como um tutorial tradicional.

## Para humanos

Navegue pelos guias como documentação técnica convencional. Cada diretório contém arquivos numerados que formam uma progressão lógica. O [`README.md`](./README.md) lista todos os guias disponíveis.

## Para IAs (assistentes de código)

Ao ser invocado como contexto, siga estas diretrizes:

1. **Leia o `SKILL.md` do guia** — cada guia tem um `SKILL.md` que descreve em <1kB o propósito, estrutura e quando usar. Comece por ele.
2. **Leia o índice do guia relevante** — cada guia tem um arquivo `00-*` ou `01-*` que apresenta a estrutura completa.
3. **Verifique o `VERSION`** — confira se a versão referenciada é compatível com o projeto do usuário.
4. **Consulte apenas as seções necessárias** — não leia o guia inteiro; busque o arquivo específico para a tarefa.
5. **Priorize guias específicos** — se o usuário estiver trabalhando com Leptos, carregue o `leptos_guide/`; se for CSS moderno, carregue `css_guide/`.
6. **Ignore `conversations/`** — este diretório contém histórico de chat e não deve ser usado como referência técnica.

## Convenções

- `VERSION` → versão de referência da tecnologia coberta pelo guia
- `SKILL.md` → metadados do guia otimizados para carregamento rápido por IA
- `00-*` ou `01-*` → introdução / sumário
- Arquivos numerados sequencialmente → ordem recomendada de consulta
- `*-recommended-*` → práticas recomendadas e implementação final
- Conteúdo em português (pt-BR) com termos técnicos em inglês quando apropriado

## Fluxo sugerido

```
1. Identificar tecnologia alvo
2. Carregar `guia/SKILL.md` (metadados — <1kB)
3. Carregar `guia/VERSION` (versão de referência)
4. Carregar `guia/00-introducao.md` (visão geral)
5. Carregar arquivo(s) específico(s) para a tarefa
6. Implementar com base no guia
```
