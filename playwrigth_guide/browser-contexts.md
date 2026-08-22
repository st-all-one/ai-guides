---
id: browser-contexts
title: "Isolamento com Browser Contexts"
---

## Introdução

Os testes escritos com o Playwright são executados em ambientes limpos e isolados chamados **browser contexts**. Esse modelo de isolamento melhora a reprodutibilidade e evita falhas em cascata entre testes.

Cada `BrowserContext` é equivalente a um perfil "incógnito" do navegador: ele possui seu próprio storage local, session storage, cookies e estado, e é rápido e barato de criar.

## O que é isolamento de teste?

Isolamento de teste significa que cada teste é completamente independente de outro. Cada teste tem seu próprio `localStorage`, `sessionStorage`, cookies etc. O Playwright consegue isso usando `BrowserContext`s.

Quando você usa o Playwright Test Runner, um `BrowserContext` é criado automaticamente para cada teste, juntamente com uma `Page` padrão (`page`) dentro desse contexto.

```ts tab=js-test
import { test } from '@playwright/test';

test('exemplo de teste', async ({ page, context }) => {
  // "context" é um BrowserContext isolado, criado para este teste específico.
  // "page" pertence a este contexto.
});

test('outro teste', async ({ page, context }) => {
  // "context" e "page" deste segundo teste são completamente
  // isolados do primeiro teste.
});
```

Quando usa a biblioteca (`playwright`) pura, você cria o contexto manualmente:

```ts tab=js-library
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
```

## Por que o isolamento é importante?

- **Sem contaminação de falhas:** se um teste falha, ele não afeta outro teste.
- **Depuração fácil:** você pode rodar um único teste repetidas vezes para investigar erros ou flakiness.
- **Independência de ordem:** não é preciso se preocupar com a ordem de execução ao rodar em paralelo ou com sharding.

## Duas estratégias de isolamento

Existem duas abordagens: começar do zero (`start from scratch`) ou limpar o estado entre os testes (`cleanup in between`).

O problema da limpeza entre testes é que é fácil esquecer de limpar algo, e certas coisas são impossíveis de limpar (como "links visitados"). Estado de um teste pode vazar para o próximo, fazendo-o falhar e dificultando a depuração, já que a causa está em outro teste. **Começar do zero** garante que tudo seja novo; se o teste falha, você olha apenas dentro dele.

### Quando usar

- **Testes automatizados padrão:** confie no contexto isolado automático do Playwright Test Runner.
- **Cenários multiusuário:** crie contextos adicionais manualmente dentro do mesmo teste (ex.: chat entre admin e usuário).
- **Emulação por cenário:** defina viewport, locale, permissões e geolocalização no nível do contexto.

Os `BrowserContext`s também são usados para emular dispositivos móveis, permissões, locale e color scheme. Veja o guia de `emulation.md` para mais detalhes.

## Como o Playwright conquista o isolamento

O Playwright usa `BrowserContext` para isolar testes. Cada teste tem seu próprio contexto. Com o Test Runner, os contextos são criados por padrão; caso contrário, crie-os manualmente.

```ts tab=js-test
import { test } from '@playwright/test';

test('exemplo test', async ({ page, context }) => {
  // "context" é um BrowserContext isolado, criado para este teste.
  // "page" pertence a este contexto.
});

test('outro test', async ({ page, context }) => {
  // "context" e "page" deste segundo teste são completamente
  // isolados do primeiro teste.
});
```

```ts tab=js-library
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
```

## Múltiplos contextos em um único teste

O Playwright pode criar vários `BrowserContext` dentro de um mesmo cenário. Isso é útil para testar funcionalidades multiusuário, como um chat.

```ts tab=js-test
import { test } from '@playwright/test';

test('admin e usuário', async ({ browser }) => {
  // Cria dois contextos de navegador isolados.
  const adminContext = await browser.newContext();
  const userContext = await browser.newContext();

  // Cria páginas e interage com os contextos de forma independente.
  const adminPage = await adminContext.newPage();
  const userPage = await userContext.newPage();
});
```

```ts tab=js-library
import { chromium } from 'playwright';

// Cria uma instância do Chromium.
const browser = await chromium.launch();

// Cria dois contextos de navegador isolados.
const userContext = await browser.newContext();
const adminContext = await browser.newContext();

// Cria páginas e interage com os contextos de forma independente.
const adminPage = await adminContext.newPage();
const userPage = await userContext.newPage();
```

## Exemplo completo

Arquivo `tests/multi-user.spec.ts` simulando um chat entre admin e usuário com contextos isolados:

```ts
import { test, expect } from '@playwright/test';

test('dois usuários trocam mensagens em chat isolado', async ({ browser }) => {
  // Contexto do administrador.
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  // Contexto do usuário.
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();

  await adminPage.goto('https://example.com/chat');
  await userPage.goto('https://example.com/chat');

  // Admin envia mensagem.
  await adminPage.locator('#message').fill('Olá, equipe!');
  await adminPage.getByRole('button', { name: 'Enviar' }).click();

  // Usuário deve receber a mensagem (contextos diferentes, mesma aplicação).
  await expect(userPage.getByText('Olá, equipe!')).toBeVisible();

  // Limpeza explícita dos contextos.
  await adminContext.close();
  await userContext.close();
});
```

## Boas práticas

- Nunca compartilhe um `BrowserContext` entre testes diferentes quando o objetivo é isolamento.
- No Test Runner, prefira os fixtures `page`/`context` em vez de criar contextos manualmente na maioria dos casos.
- Use `browser.newContext()` dentro do teste apenas para cenários específicos (multiusuário, perfis distintos).
- Feche contextos criados manualmente (`await context.close()`) para liberar recursos.
- Aproveite o contexto para aplicar emulação consistente: `await browser.newContext({ locale: 'pt-BR', viewport: { width: 1280, height: 720 } })`.
