---
id: exemplos-sem-tags
title: "Exemplo — Sem tags/CSS fixas (role/text/label)"
---

# Sem tags/CSS fixas

Muitos webapps administrativos (legados ou de terceiros) **não** expõem `data-testid`.
Aí localizamos por semântica: papel (role), texto, label, placeholder, e encadeamento/filtragem.
Evite ao máximo seletores CSS frágeis (`nth-child`, classes de estilo).

```ts title="exemplos/sem-tags-css-fixas.spec.ts"
import { test, expect } from '@playwright/test';

// App de terceiro, sem data-testid. DOM típico:
//   <table> <thead><th>Nome</th><th>E-mail</th>... <tbody>
//   <button>Adicionar</button>  <input placeholder="Buscar usuário">
//   <div role="dialog"> ... <button>Salvar</button>

test.describe('Painel admin de terceiro — sem hooks de teste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/usuarios');
  });

  test('cria usuário pelo formulário semântico', async ({ page }) => {
    // Botão identificado por texto visível (ignora classe/CSS)
    await page.getByRole('button', { name: 'Adicionar' }).click();

    // Modal: campos por label acessível
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome').fill('Maria Silva');
    await dialog.getByLabel('E-mail').fill('maria@example.com');

    // Se não houver <label>, use placeholder ou texto do campo
    await dialog.getByPlaceholder('Selecione o perfil').click();
    await page.getByRole('option', { name: 'Editor' }).click();

    await dialog.getByRole('button', { name: 'Salvar' }).click();

    // Validação por texto (toast/alert)
    await expect(page.getByText('Usuário criado com sucesso')).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: 'maria@example.com' }),
    ).toBeVisible();
  });

  test('busca na tabela por placeholder + role', async ({ page }) => {
    await page.getByPlaceholder('Buscar usuário').fill('maria');
    await page.getByPlaceholder('Buscar usuário').press('Enter');

    // Linhas da tabela via role=row, dentro do corpo da tabela
    const body = page.getByRole('table').locator('tbody');
    await expect(body.getByRole('row')).toHaveCount(1);
  });

  test('lê célula específica sem índice frágil', async ({ page }) => {
    // Localiza a linha pelo e-mail e lê a célula "Perfil" por cabeçalho
    const row = page.getByRole('row').filter({ hasText: 'maria@example.com' });
    await expect(row.getByRole('cell', { name: 'Editor' })).toBeVisible();
  });

  test('abre menu de ações por aria-label', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'maria@example.com' });
    // Ícone de lixeira costuma ter aria-label
    await row.getByRole('button', { name: 'Excluir' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(row).toHaveCount(0);
  });

  test('último recurso: CSS/XPath com cara de instabilidade documentada', async ({ page }) => {
    // Use SOMENTE quando não houver role/text/label estável. Comente o risco.
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
  });
});
```

## Estratégia de localização (ordem de preferência)

1. `getByRole` + `name` — mais resiliente e valida acessibilidade.
2. `getByLabel` / `getByPlaceholder` — formulários.
3. `getByText` / `filter({ hasText })` — conteúdo visível.
4. `getByAltText`, `getByTitle` — mídia/tooltips.
5. CSS/XPath — **último recurso**; documente o motivo.

## Encadeamento e filtragem (poderosos sem tags)

```ts
// Linha cuja célula de status contém "Ativo"
const linhaAtiva = page
  .getByRole('row')
  .filter({ has: page.getByRole('cell', { name: 'Ativo' }) });

// Botão "Editar" DENTRO da linha do usuário
await linhaAtiva.getByRole('button', { name: 'Editar' }).click();
```

## Armadilhas comuns

- Textos dinâmicos (ex.: `"Usuário #123 criado"`) quebram `getByText` exato: use
  `toContainText` ou `getByText(/criado/i)`.
- `getByRole('button', { name: 'Salvar' })` falha se houver dois "Salvar" (ex.: no modal e
  no cabeçalho): restrinja ao escopo do `dialog`.
- `nth-child` quebra a cada refactor de layout — evite.
