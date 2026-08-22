---
id: exemplos-admin-crud
title: "Exemplo — CRUD admin completo"
---

# Fluxo CRUD admin ponta a ponta

Exemplo completo combinando as duas abordagens: usa `getByTestId` quando disponível e
`role`/`text` como fallback. Inclui fixture de autenticação e um Page Object reutilizável
(`pages/admin.ts`).

```ts title="exemplos/admin-crud-completo.spec.ts"
import { test, expect, type Page } from '@playwright/test';
import { AdminUsersPage } from './pages/admin';

// Login reutilizável (ver auth.md / exemplos/README.md)
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@example.com');
  await page.getByLabel('Senha').fill(process.env.ADMIN_PASS!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/dashboard');
});

test('ciclo de vida de um usuário (create → read → update → delete)', async ({ page }) => {
  const users = new AdminUsersPage(page);
  await users.goto();

  // CREATE
  await users.openCreate();
  await users.fillForm({ nome: 'João Souza', email: 'joao@example.com', perfil: 'editor' });
  await users.submit();
  await expect(users.toast).toContainText('criado');
  await expect(users.rowByEmail('joao@example.com')).toBeVisible();

  // READ / filtro
  await users.search('joao');
  await expect(users.rows).toHaveCount(1);

  // UPDATE
  await users.rowByEmail('joao@example.com').getByRole('button', { name: 'Editar' }).click();
  await users.fillForm({ nome: 'João S. Atualizado' });
  await users.submit();
  await expect(users.rowByEmail('joao@example.com')).toContainText('Atualizado');

  // DELETE
  await users.rowByEmail('joao@example.com').getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(users.rowByEmail('joao@example.com')).toHaveCount(0);
});

test('valida erro de e-mail duplicado', async ({ page }) => {
  const users = new AdminUsersPage(page);
  await users.goto();
  await users.openCreate();
  await users.fillForm({ nome: 'Dup', email: 'maria@example.com' }); // já existe
  await users.submit();
  await expect(users.errorMessage).toContainText('e-mail já cadastrado');
});
```

```ts title="exemplos/pages/admin.ts"
import { type Page, type Locator } from '@playwright/test';

/** Page Object para o módulo de usuários do admin. */
export class AdminUsersPage {
  readonly page: Page;
  readonly rows: Locator;
  readonly toast: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Prefere data-testid; se o app não tiver, troque por getByRole('row')
    this.rows = page.getByTestId('user-row');
    this.toast = page.getByTestId('toast');
    this.errorMessage = page.getByTestId('form-error');
  }

  async goto() {
    await this.page.goto('/admin/usuarios');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreate() {
    await this.page.getByTestId('user-create').click();
    await this.page.getByRole('dialog').waitFor();
  }

  async fillForm(opts: { nome: string; email?: string; perfil?: string }) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('Nome').fill(opts.nome);
    if (opts.email !== undefined) await dialog.getByLabel('E-mail').fill(opts.email);
    if (opts.perfil !== undefined) await dialog.getByLabel('Perfil').selectOption(opts.perfil);
  }

  async submit() {
    await this.page.getByRole('dialog').getByTestId('submit').click();
  }

  rowByEmail(email: string): Locator {
    return this.rows.filter({ hasText: email });
  }

  async search(term: string) {
    const box = this.page.getByTestId('search');
    await box.fill(term);
    await box.press('Enter');
  }
}
```

## Boas práticas demonstradas

- `beforeEach` faz login isolado por teste (contexto limpo, ver `../browser-contexts.md`).
- Page Object isola seletores: se o app mudar de `data-testid` para `role`, edita-se só aqui.
- Assertions web-first (`toBeVisible`, `toContainText`) com auto-retry (ver `../test-assertions-js.md`).
- `rowByEmail` encapsula filtragem resiliente a reordenação da tabela.
