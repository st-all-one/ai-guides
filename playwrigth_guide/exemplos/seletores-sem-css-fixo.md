---
id: exemplos-seletores-sem-css-fixo
title: "Seletores sem CSS fixo — guia claro"
---

# Definindo seletores corretamente SEM CSS fixo

Este guia mostra, com exemplos diretos, como localizar elementos em webapps administrativos
**sem depender de `data-testid`/`data-cy` ou de classes CSS estáveis**. A estratégia é
localizar pelo que o *usuário* (e o leitor de tela) vê: papel (role), nome, texto, label.

> Veja também: [sem-tags-css-fixas.spec.ts](./sem-tags-css-fixas.spec.ts) para specs executáveis.

## Golden rules

1. Comece pelo **mais semântico**: `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder`.
2. Restrinja ao **escopo** para evitar ambiguidade (ex.: dentro de um `dialog`).
3. Use **filtros** (`filter({ hasText })` / `filter({ has })`) em vez de posição (`nth-child`).
4. Textos dinâmicos → `toContainText` ou regex (`/criado/i`), nunca texto exato com id.
5. CSS/XPath só como **último recurso** e documentado.

---

## 1. Botões e links (role + name)

```ts
// ❌ frágil: depende de classe/CSS
page.locator('button.btn.btn-primary');

// ✅ semântico: pelo texto visível do botão
page.getByRole('button', { name: 'Salvar' });

// ✅ link pelo texto
page.getByRole('link', { name: 'Voltar ao painel' });

// ✅ ícone com aria-label (ex.: lixeira)
page.getByRole('button', { name: 'Excluir' });
```
> `name` casa com o texto acessível: `innerText`, `aria-label`, `aria-labelledby` ou `alt`.

---

## 2. Formulários (label / placeholder)

```ts
// ❌ frágil: ordem/estrutura do DOM
page.locator('form input').nth(0);

// ✅ pelo <label> associado
page.getByLabel('E-mail').fill('admin@example.com');
page.getByLabel('Senha').fill('segura123');

// ✅ se não houver <label>, use o placeholder
page.getByPlaceholder('Buscar usuário').fill('maria');

// ✅ select pelo label
page.getByLabel('Perfil').selectOption('editor');
```

---

## 3. Tabelas administrativas (role + filtro, não posição)

```ts
// ❌ frágil: posição da linha/coluna
page.locator('table tbody tr:nth-child(3) td:nth-child(2)');

// ✅ linha pelo conteúdo (reordenação não quebra)
const row = page.getByRole('row').filter({ hasText: 'maria@example.com' });
await expect(row).toBeVisible();

// ✅ célula específica pelo cabeçalho
await expect(row.getByRole('cell', { name: 'Editor' })).toBeVisible();

// ✅ ações DENTRO da linha (evita pegar outro botão "Editar")
await row.getByRole('button', { name: 'Editar' }).click();

// ✅ contar linhas após busca
await expect(page.getByRole('table').locator('tbody').getByRole('row')).toHaveCount(1);
```

---

## 4. Modais e diálogos (escopo + role)

```ts
// ❌ ambíguo: "Salvar" pode existir no header e no modal
page.getByRole('button', { name: 'Salvar' }).click();

// ✅ restrinja ao diálogo
const dialog = page.getByRole('dialog');
await dialog.getByLabel('Nome').fill('Maria');
await dialog.getByRole('button', { name: 'Salvar' }).click();

// ✅ confirmação (alertdialog)
await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
```

---

## 5. Textos dinâmicos (toast / mensagens)

```ts
// ❌ quebra: "Usuário #123 criado" muda a cada execução
page.getByText('Usuário #123 criado');

// ✅ parcial
await expect(page.getByText('criado')).toBeVisible();

// ✅ regex (case-insensitive)
await expect(page.getByText(/usuário .* criado/i)).toBeVisible();
```

---

## 6. Combinação poderosa: `filter({ has })`

```ts
// Linha cuja célula de status contém "Ativo"
const ativos = page
  .getByRole('row')
  .filter({ has: page.getByRole('cell', { name: 'Ativo' }) });

await expect(ativos).toHaveCount(3);
```

---

## 7. Quando não há nada estável: XPath com cara de exceção

```ts
// Use SOMENTE se não houver role/text/label. Documente o risco.
await page.locator('//button[contains(., "Exportar")]').click();
```
> Prefira antes negociar um `aria-label` ou `data-testid` com quem mantém a app. Semântica
> vence sempre que disponível (ver `../locators.md`).

---

## Checklist rápido

- [ ] Usei `getByRole` antes de CSS?
- [ ] Restrinjo modais/tabelas a um escopo?
- [ ] Evitei `nth-child` / classes de estilo?
- [ ] Textos dinâmicos usam `toContainText`/regex?
- [ ] Filtrei por `hasText`/`has` em vez de posição?
