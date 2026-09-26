---
id: exemplos-admin
title: "Exemplos — Webapps Administrativos"
---

# Exemplos: interagindo com webapps administrativos

Subpasta prática com exemplos em **TypeScript** (`@playwright/test`) de como automatizar
painéis administrativos (CRUD de usuários, tabelas, filtros, modais, paginação).

Dois cenários opostos de localização de elementos:

| Abordagem | Quando usar | Localizadores preferidos |
| :- | :- | :- |
| **Com tags/CSS fixas** | O app expõe `data-testid` / `data-cy` estáveis (boa prática de instrumentação) | `getByTestId`, `locator('[data-cy=...]')` |
| **Sem tags/CSS fixas** | App de terceiro, sem hooks de teste, ou DOM instável | `getByRole`, `getByText`, `getByLabel`, filtros e encadeamento |

> Regra de ouro (ver `../best-practices-js.md`): priorize atributos voltados ao usuário
> (`role`, `name`, `text`) e evite seletores frágeis (`nth-child`, classes de estilo).

## Arquivos

- [com-tags-css-fixas.spec.ts](./com-tags-css-fixas.spec.ts) — app com `data-testid`/`data-cy` estáveis.
- [sem-tags-css-fixas.spec.ts](./sem-tags-css-fixas.spec.ts) — app sem hooks de teste (role/text/label).
- [seletores-sem-css-fixo.md](./seletores-sem-css-fixo.md) — **guia claro** de seletores sem CSS fixo (antes/depois).
- [admin-crud-completo.spec.ts](./admin-crud-completo.spec.ts) — fluxo CRUD admin ponta a ponta.
- [pages/admin.ts](./pages/admin.ts) — Page Object Model reutilizável.

## Setup mínimo

```bash
npm init playwright@latest   # escolha TypeScript
```

`playwright.config.ts` (trecho relevante):

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './exemplos',
  baseURL: 'http://localhost:5173',   // URL do seu admin
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

## Autenticação admin (reutilizável)

Em admin apps quase sempre há login. Veja `../auth.md` para o padrão de *setup project*
(login uma vez e reuso do storage state). Exemplo enxuto:

```ts title="exemplos/auth.setup.ts"
import { test as setup } from '@playwright/test';

setup('autenticar admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@example.com');
  await page.getByLabel('Senha').fill(process.env.ADMIN_PASS!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/dashboard');
});
```
