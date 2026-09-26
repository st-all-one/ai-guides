---
id: exemplos-com-tags
title: "Exemplo — Com tags/CSS fixas (data-testid)"
---

# Com tags/CSS fixas estáveis

Quando o app de administração expõe atributos dedicados a testes (`data-testid` ou `data-cy`),
a automação fica simples, legível e resiliente a mudanças de layout/CSS.

```ts title="exemplos/com-tags-css-fixas.spec.ts"
import { test, expect } from '@playwright/test';

// Pré-condição: o app renderiza atributos estáveis, ex.:
//   <button data-testid="user-create">Novo usuário</button>
//   <input data-cy="search" />
//   <tr data-testid="user-row" data-user-id="42"> ... </tr>

test.describe('Painel admin — usuários (com data-testid)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/usuarios');
  });

  test('cria um usuário via modal', async ({ page }) => {
    // Abre o modal de criação (localizador fixo e estável)
    await page.getByTestId('user-create').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Campos identificados por label estável
    await dialog.getByLabel('Nome').fill('Maria Silva');
    await dialog.getByLabel('E-mail').fill('maria@example.com');
    await dialog.getByLabel('Perfil').selectOption('editor');

    // Confirma
    await dialog.getByTestId('submit').click();

    // Validação: toast de sucesso + linha aparece na tabela
    await expect(page.getByTestId('toast-success')).toContainText('Usuário criado');
    await expect(
      page.getByTestId('user-row').filter({ hasText: 'maria@example.com' }),
    ).toBeVisible();
  });

  test('busca e pagina a tabela', async ({ page }) => {
    await page.getByTestId('search').fill('maria');
    await page.getByTestId('search').press('Enter');

    const rows = page.getByTestId('user-row');
    await expect(rows).toHaveCount(1);

    // Paginação fixa
    await page.getByTestId('pagination-next').click();
    await expect(page.getByTestId('user-row')).toHaveCount(0);
  });

  test('edita e remove um usuário', async ({ page }) => {
    const row = page.getByTestId('user-row').filter({ hasText: 'maria@example.com' });

    await row.getByTestId('edit').click();
    await page.getByRole('dialog').getByLabel('Nome').fill('Maria S. Atualizada');
    await page.getByRole('dialog').getByTestId('submit').click();
    await expect(page.getByTestId('toast-success')).toContainText('atualizado');

    // Remove (com confirmação)
    row.getByTestId('delete').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(row).toHaveCount(0);
  });

  test('filtra por perfil usando seletor fixo', async ({ page }) => {
    await page.getByTestId('filter-profile').selectOption('editor');
    await expect(page.getByTestId('user-row')).toHaveCountGreaterThan(0);
  });
});
```

## Por que funciona bem

- `data-testid` não muda quando o designer troca a classe CSS ou a ordem do DOM.
- `getByRole('dialog')` continua semântico mesmo dentro do modal.
- Filtros (`filter({ hasText })`) mantêm o seletor resiliente a posição da linha.

## Armadilhas comuns

- Não usar `data-testid` com valores dinâmicos (ex.: `user-row-42`): prefira um atributo
  fixo (`user-row`) + um atributo de dado (`data-user-id="42"`) para filtrar.
- Evite `getByTestId` aninhado demais; prefira combinar com `getByRole`/`getByLabel` dentro do escopo.
