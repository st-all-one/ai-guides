---
name: playwright-ts-admin
description: >
  Use ao escrever, revisar ou depurar testes end-to-end com Playwright em TypeScript
  (@playwright/test), especialmente para webapps administrativos (CRUD, tabelas, modais,
  autenticação, filtros). Fornece a hierarquia correta de localizadores, padrões de
  autenticação/isolamento, armadilhas comuns e comandos úteis.
---

# Playwright em TypeScript — Skill para Agentes (cenários administrativos)

Dossiê completo (PT, TS): `playwrigth_guide/` (ver `playwrigth_guide/INDICE.md`).
Exemplos práticos admin: `playwrigth_guide/exemplos/`.

## Quando usar

- Automatizar fluxos de UI web (login, CRUD, tabelas, modais, upload, navegação).
- Testes de regressão de webapps administrativos (dashboards, painéis de gestão).
- Testes de API (`APIRequestContext`), mock de rede e autenticação reutilizável.

Não use para: testes unitários (prefira Vitest/Jest), benchmarks de performance pura,
ou quando a app não renderiza DOM acessível (use aí a Playwright Library pura, não o runner).

## Decisão: Playwright Test vs Library

- **`@playwright/test`** (runner): padrão para E2E. Traz fixtures, paralelismo, reporters,
  retry, trace, UI Mode. Use isto na esmagadora maioria dos casos.
- **Playwright Library** (`playwright`): só quando você precisa controlar o browser fora do
  runner (script único, integração com outro framework de teste). Não tem assertions web-first
  nem fixtures — importe `expect` de `@playwright/test` se precisar.

## Hierarquia de localizadores (ORDEM OBRIGATÓRIA)

Prefira sempre o mais semântico e resiliente. Nunca comece por CSS/XPath.

1. `page.getByRole('button', { name: 'Salvar' })` — mais resiliente, valida a11y.
2. `page.getByLabel('E-mail')` / `getByPlaceholder('Buscar')` — formulários.
3. `page.getByText('Usuário criado')` (prefira `toContainText` / regex `/criado/i`).
4. `page.getByAltText` / `getByTitle` — mídia / tooltip.
5. `page.getByTestId('user-row')` — **quando o app expõe `data-testid`/`data-cy` estáveis**.
6. CSS/XPath (`locator('table tr:nth-child(2)')`) — **último recurso**, documente o motivo.

Regras:
- Nunca use `nth-child`, classes de estilo (`div.bg-red-500`) ou índices (`locator.nth(3)`)
  como seletor primário — quebram a cada refactor de layout.
- `data-testid` com valor dinâmico (`user-row-42`) é frágil: prefira `data-testid="user-row"`
  + `data-user-id="42"` e filtre com `.filter({ hasText })` ou `.filter({ has: ... })`.
- **Strict mode**: um locator deve resolver a 1 elemento. Se resolver vários, restrinja ao
  escopo (ex.: `dialog.getByRole('button', { name: 'Salvar' })` em vez de `page.getBy...`).

## Padrão de autenticação admin (reutilizável)

Não logue em todo teste (lento + flaky). Use **setup project** + `storageState`:

```ts title="auth.setup.ts"
import { test as setup } from '@playwright/test';
setup('autenticar admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@example.com');
  await page.getByLabel('Senha').fill(process.env.ADMIN_PASS!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/dashboard');
});
```

```ts title="playwright.config.ts (trecho)"
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'] },
]
```

Múltiplos papéis (admin/editor/viewer): gere um `storageState` por papel (ver `auth.md`).

## Padrões para cenários administrativos

- **Isolamento**: use Browser Contexts (`browser.newContext()`) — cada teste começa limpo.
  No runner, cada teste já tem `page` isolada; não compartilhe estado entre testes.
- **Tabelas**: localize linhas por role/texto, não por posição.
  `page.getByRole('row').filter({ hasText: 'maria@example.com' })`.
- **Modais/dialogs**: `page.getByRole('dialog')` + espera; confirmações usam
  `page.getByRole('alertdialog')`. Trate `beforeunload`/`confirm` via `page.on('dialog')`.
- **Toasts/alertas**: valide com `toContainText`, pois o texto costuma ser dinâmico.
- **Busca/filtros**: preencha e `press('Enter')`; reespere a contagem de linhas mudar.
- **Upload**: `locator.setInputFiles(path)`; **Download**: `const [dl] = await Promise.all([...])`.
- **Page Object**: centralize seletores em `pages/*.ts` quando vários specs tocam a mesma tela
  (ver `pom.md` e `exemplos/pages/admin.ts`). Trocar app de `data-testid`→`role` edita só aí.

## Assertions (web-first, com auto-retry)

```ts
await expect(page.getByRole('dialog')).toBeVisible();
await expect(page.getByText('criado')).toBeVisible();
await expect(rows).toHaveCount(1);
await expect(locator).toContainText(/erro/i);
```
- Use **soft assertions** (`expect.soft`) para não abortar no primeiro erro quando vale a pena.
- `expect.poll` / `expect.toPass` para condições que amadurecem com o tempo.
- Nunca use `await locator.isVisible()` num `if` para decidir fluxo — prefira `expect`.

## TypeScript correto

- Playwright **roda TS direto** (sem `tsc` manual). Use `tsconfig.json` com
  `"moduleResolution": "bundler"` e `"types": ["@playwright/test"]` (ver `test-typescript-js.md`).
- Use `test.extend` para fixtures tipadas; evite `any` nos locators (`Locator`, `Page`, `APIRequestContext`).
- Importe só o necessário: `import { test, expect, type Page, type Locator } from '@playwright/test'`.

## Comandos úteis

```bash
npm init playwright@latest            # scaffold TS
npx playwright test --ui              # UI Mode (watch + trace)
npx playwright test -g "cria usuario" # filtrar por nome
npx playwright test --project=chromium --debug
npx playwright codegen http://localhost:5173   # gerar specs
npx playwright show-report            # abrir HTML report
```

## Armadilhas comuns (NÃO faça)

- ❌ `page.click('.btn-primary:nth-child(2)')` — frágil. ✅ `getByRole('button', { name })`.
- ❌ Logar em cada `test` — lento/flaky. ✅ setup project + `storageState`.
- ❌ Esperar por tempo fixo `page.waitForTimeout(2000)` — ✅ `expect` web-first / `waitForURL`.
- ❌ Seletor CSS para linha de tabela por índice — ✅ `getByRole('row').filter({ hasText })`.
- ❌ `getByText('Usuário #123')` exato com id dinâmico — ✅ `toContainText` ou regex.
- ❌ Compartilhar `page`/estado entre testes — ✅ isole via contexto/fixtures.
- ❌ `getByTestId` aninhado demais — ✅ combine com `getByRole`/`getByLabel` dentro do escopo.
- ❌ Avaliar JS para ler DOM quando um locator semântico serve — ✅ prefira Locator.

## Referência cruzada rápida (no dossiê)

- Localizadores: `locators.md`, `other-locators.md`
- Assertions: `test-assertions-js.md`
- Auth/isolamento: `auth.md`, `browser-contexts.md`
- Config/CI: `test-configuration-js.md`, `ci.md`, `docker.md`
- Admin CRUD completo: `exemplos/admin-crud-completo.spec.ts`
- Admin com/sem tags: `exemplos/com-tags-css-fixas.spec.ts`, `exemplos/sem-tags-css-fixas.spec.ts`
