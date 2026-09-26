---
id: exemplos-pages-admin
title: "Page Object — Admin"
---

# Page Object: `AdminUsersPage`

Classe reutilizável para o módulo de usuários do admin. Centraliza seletores e ações,
facilitando manutenção quando a interface muda.

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

## Quando usar Page Objects

- Vários specs tocam a mesma tela (ver `../pom.md`).
- A interface muda com frequência — centraliza o impacto num único arquivo.
- Combina com fixtures (`../test-fixtures-js.md`) para compor pages pré-autenticadas.

## Alternativa sem `data-testid`

Se o admin não expõe tags fixas, troque os seletores internos:

```ts
this.rows = page.getByRole('table').locator('tbody').getByRole('row');
this.toast = page.getByRole('status');              // região aria-live
this.errorMessage = page.getByRole('alert');        // ou getByText(/erro/i)
```
