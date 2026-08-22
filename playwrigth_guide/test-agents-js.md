---
id: test-agents
title: "Agents"
---

# Playwright Test Agents

## Introdução

O Playwright traz três Playwright Test Agents prontos para uso: **🎭 planner**, **🎭 generator** e **🎭 healer**.

Esses agents podem ser usados de forma independente, sequencial ou como chamadas encadeadas no loop agentic. Usá-los sequencialmente produz cobertura de teste para o seu produto.

* **🎭 planner** explora a app e produz um plano de teste em Markdown
* **🎭 generator** transforma o plano em Markdown nos arquivos Playwright Test
* **🎭 healer** executa a suíte de testes e repara automaticamente testes que falham

Veja a introdução em vídeo: [Playwright 1.56 - Introducing Playwright Test Agents](https://www.youtube.com/watch?v=_AifxZGxwuk).

### Começando

Comece adicionando as definições dos Playwright Test Agents ao seu projeto usando o comando `init-agents`. Essas definições devem ser regeneradas sempre que o Playwright for atualizado, para absorver novas ferramentas e instruções.

<Tabs
  groupId="agent-loop"
  defaultValue="opencode"
  values={[
    {label: 'VS Code', value: 'vscode'},
    {label: 'Claude', value: 'claude'},
    {label: 'Codex', value: 'codex'},
    {label: 'opencode', value: 'opencode'},
  ]
}>

<TabItem value="vscode">

```bash
npx playwright init-agents --loop=vscode
```

</TabItem>
<TabItem value="claude">

```bash
npx playwright init-agents --loop=claude
```

</TabItem>
<TabItem value="codex">

```bash
npx playwright init-agents --loop=codex
```

</TabItem>
<TabItem value="opencode">

```bash
npx playwright init-agents --loop=opencode
```

</TabItem>
</Tabs>

:::note
O VS Code v1.105 (lançado em 9 de outubro de 2025) é necessário para a experiência agentic funcionar corretamente no VS Code.
:::

Uma vez gerados os agents, você pode usar sua ferramenta de IA preferida para comandá-los a construir Playwright Tests.

## 🎭 Planner

O agente planner explora sua app e produz um plano de teste para um ou muitos cenários e fluxos de usuário.

**Entrada**

* Uma requisição clara ao planner (ex.: "Gere um plano para checkout como convidado.")
* Um `seed test` que configura o ambiente necessário para interagir com sua app
* *(opcional)* Um Product Requirement Document (PRD) para contexto

**Prompt**

<img src="../playwrigth_docs/images/test-agents/planner-prompt.png" alt="planner prompt" width="472"/>

> - Observe como o `seed.spec.ts` é incluído no contexto do planner.
> - O planner rodará este teste para executar toda a inicialização necessária, incluindo global setup, dependências de projeto e todos os fixtures e hooks necessários.
> - O planner também usará este seed test como exemplo de todos os testes gerados. Alternativamente, você pode mencionar o nome do arquivo no prompt.

```ts title="Exemplo: seed.spec.ts"
import { test, expect } from './fixtures';

test('seed', async ({ page }) => {
  // este teste usa fixtures customizadas de ./fixtures
});
```

**Saída**

* Um plano de teste em Markdown salvo como `specs/basic-operations.md`.
* O plano é legível por humanos, mas preciso o suficiente para geração de testes.

<details>
<summary>Exemplo: <b>specs/basic-operations.md</b></summary>

```markdown
# TodoMVC Application - Basic Operations Test Plan

## Application Overview

The TodoMVC application is a React-based todo list manager that demonstrates standard todo application functionality. The application provides comprehensive task management capabilities with a clean, intuitive interface. Key features include:

- **Task Management**: Add, edit, complete, and delete individual todos
- **Bulk Operations**: Mark all todos as complete/incomplete and clear all completed todos  
- **Filtering System**: View todos by All, Active, or Completed status with URL routing support
- **Real-time Counter**: Display of active (incomplete) todo count
- **Interactive UI**: Hover states, edit-in-place functionality, and responsive design
- **State Persistence**: Maintains state during session navigation

## Test Scenarios

### 1. Adding New Todos

**Seed:** `tests/seed.spec.ts`

#### 1.1 Add Valid Todo

**Steps:**
1. Click in the "What needs to be done?" input field
2. Type "Buy groceries"
3. Press Enter key

**Expected Results:**
- Todo appears in the list with unchecked checkbox
- Counter shows "1 item left"
- Input field is cleared and ready for next entry
- Todo list controls become visible (Mark all as complete checkbox)
```

</details>

## 🎭 Generator

O agente generator usa o plano em Markdown para produzir Playwright Tests executáveis. Ele verifica seletores e asserções ao vivo enquanto executa os cenários. O Playwright suporta dicas de geração e fornece um catálogo de asserções para validação estrutural e comportamental eficiente.

**Entrada**

* Plano em Markdown de `specs/`

**Prompt**

<img src="../playwrigth_docs/images/test-agents/generator-prompt.png" alt="generator prompt" width="472"/>

> - Observe como o `basic-operations.md` é incluído no contexto do generator.
> - É assim que o generator sabe de onde obter o plano de teste. Alternativamente, você pode mencionar o nome do arquivo no prompt.

**Saída**

* Uma suíte de testes sob `tests/`
* Testes gerados podem incluir erros iniciais que podem ser curados automaticamente pelo agente healer

<details>
<summary>Exemplo: <b>tests/add-valid-todo.spec.ts</b></summary>

```ts
// spec: specs/basic-operations.md
// seed: tests/seed.spec.ts

import { test, expect } from '../fixtures';

test.describe('Adding New Todos', () => {
  test('Add Valid Todo', async ({ page }) => {
    // 1. Click in the "What needs to be done?" input field
    const todoInput = page.getByRole('textbox', { name: 'What needs to be done?' });
    await todoInput.click();

    // 2. Type "Buy groceries"
    await todoInput.fill('Buy groceries');

    // 3. Press Enter key
    await todoInput.press('Enter');

    // Expected Results:
    // - Todo appears in the list with unchecked checkbox
    await expect(page.getByText('Buy groceries')).toBeVisible();
    const todoCheckbox = page.getByRole('checkbox', { name: 'Toggle Todo' });
    await expect(todoCheckbox).toBeVisible();
    await expect(todoCheckbox).not.toBeChecked();

    // - Counter shows "1 item left"
    await expect(page.getByText('1 item left')).toBeVisible();

    // - Input field is cleared and ready for next entry
    await expect(todoInput).toHaveValue('');
    await expect(todoInput).toBeFocused();

    // - Todo list controls become visible (Mark all as complete checkbox)
    await expect(page.getByRole('checkbox', { name: '❯Mark all as complete' })).toBeVisible();
  });
});
```

</details>

## 🎭 Healer

Quando o teste falha, o agente healer:

* Repete os passos que falharam
* Inspeciona a UI atual para localizar elementos ou fluxos equivalentes
* Sugere um patch (ex.: atualização de locator, ajuste de espera, correção de dado)
* Re-roda o teste até que passe ou até que guardrails parem o loop

**Entrada**

* Nome do teste que falha

**Prompt**

<img src="../playwrigth_docs/images/test-agents/healer-prompt.png" alt="healer prompt" width="469"/>

**Saída**

* Um teste que passa, ou um teste pulado (skipped) se o healer acredita que a funcionalidade está quebrada.

## Artefatos e convenções

As definições estáticas dos agents e os arquivos gerados seguem uma estrutura simples e auditável:

```bash
repo/
  .github/                    # definições dos agents
  specs/                      # planos de teste legíveis por humanos
    basic-operations.md
  tests/                      # Playwright tests gerados
    seed.spec.ts              # seed test para o ambiente
    tests/create/add-valid-todo.spec.ts
  playwright.config.ts
```

### Definições de agents

Sob o capô, as definições de agents são coleções de instruções e ferramentas MCP. Elas são fornecidas pelo Playwright e devem ser regeneradas sempre que o Playwright for atualizado.

Exemplo para subagents do Claude Code:

```bash
npx playwright init-agents --loop=vscode
```

### Specs em `specs/`

Specs são planos estruturados descrevendo cenários em termos legíveis por humanos. Incluem passos, resultados esperados e dados. Specs podem começar do zero ou estender um seed test.

### Testes em `tests/`

Playwright tests gerados, alinhados um-a-um com specs sempre que viável.

### Seed tests `seed.spec.ts`

Seed tests fornecem um contexto `page` pronto para inicializar a execução.

## Quando usar

- **planner** — para mapear fluxos e cenários de uma nova área da aplicação antes de escrever qualquer teste.
- **generator** — para transformar um `specs/*.md` aprovado em testes Playwright executáveis.
- **healer** — para recuperar suítes quebradas por mudanças de UI sem intervenção manual imediata.
- **Loop encadeado** — planner → generator → healer produz cobertura de ponta a ponta com mínima intervenção.

## Armadilhas comuns

- **Definições desatualizadas:** ao atualizar o Playwright, rode `init-agents` novamente; senão os agents perdem novas ferramentas/instruções.
- **Seed test frágil:** se o `seed.spec.ts` não sobe o ambiente corretamente, o planner e o generator herdam o problema.
- **Confiar cegamente no healer:** revise os patches sugeridos; o healer pode pular (`skip`) um teste se achar que a funcionalidade está quebrada — confirme se é regressão real.
- **Specs fora de sincronia:** mantenha `specs/` e `tests/` versionados juntos; specs viram a fonte legível da intenção dos testes.

## Exemplo completo

Fluxo agentic de ponta a ponta com os três agents:

```bash
# 1. Gerar definições dos agents (uma vez; refaça ao atualizar o Playwright)
npx playwright init-agents --loop=opencode
```

```ts title="tests/seed.spec.ts"
import { test, expect } from './fixtures';

test('seed', async ({ page }) => {
  // sobe o ambiente (global setup, fixtures, hooks)
});
```

```ts title="specs/checkout.md"
# Guest Checkout Test Plan
## Scenarios
### 1. Add item to cart and checkout as guest
**Steps:** open catalog, add first item, open cart, proceed to checkout, fill guest form, place order.
**Expected:** order confirmation visible; cart cleared.
```

```ts title="tests/checkout.spec.ts"
// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';

test('guest can checkout', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Email').fill('guest@example.com');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
```

## Boas práticas

- Versione `specs/`, `tests/` e as definições de agents no git.
- Mantenha um `seed.spec.ts` enxuto que apenas garanta o ambiente necessário.
- Revise os specs como documentação viva antes de gerar os testes.
- Use o healer no CI como rede de segurança, mas revise seus patches em code review.
- Regenere as definições de agents a cada atualização do Playwright.