---
id: navigations
title: "Navegações"
---

## Introdução

O Playwright consegue navegar até URLs e lidar com navegações causadas por interações na página (clicar em links, submeter formulários etc.).

## Navegação básica

A forma mais simples de navegação é abrir uma URL:

```ts
import { test } from '@playwright/test';

test('navegar para uma página', async ({ page }) => {
  // Navega a página.
  await page.goto('https://example.com');
});
```

O código acima carrega a página e aguarda o evento [load](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event). O evento `load` é disparado quando a página inteira terminou de carregar, incluindo todos os recursos dependentes, como folhas de estilo, scripts, iframes e imagens.

> :::note
> Se a página fizer um redirecionamento do lado do cliente antes do `load`, `page.goto()` aguardará a página redirecionada disparar o evento `load`.
> :::

## Quando a página está "carregada"?

Páginas modernas realizam inúmeras atividades após o evento `load`: buscam dados de forma preguiçosa (lazy loading), populam a UI, carregam recursos e scripts pesados depois do `load`. Não há como afirmar objetivamente que a página está "carregada" — depende da página, do framework etc. Então, quando começar a interagir?

No Playwright você pode interagir com a página a qualquer momento. Ele automaticamente aguardará que os elementos-alvo se tornem [acionáveis](./actionability.md).

```ts
import { test } from '@playwright/test';

test('navegar e clicar em elemento', async ({ page }) => {
  // Navega e clica no elemento.
  // O clique aguarda automaticamente pelo elemento.
  await page.goto('https://example.com');
  await page.getByText('Example Domain').click();
});
```

No cenário acima, o Playwright aguardará o texto ficar visível, passará pelas demais verificações de actionability e então clicará.

O Playwright opera como um usuário muito rápido: no momento em que vê o botão, ele clica. De forma geral, você não precisa se preocupar se todos os recursos carregaram.

## Hidratação (hydration)

Em algum momento você encontrará um caso em que o Playwright executa uma ação, mas nada acontece — ou você digita texto em um campo e ele some. A causa mais provável é uma má [hidratação](https://en.wikipedia.org/wiki/Hydration_(web_development)) da página.

Quando a página é hidratada, primeiro uma versão estática é enviada ao navegador; depois, a parte dinâmica é enviada e a página "ganha vida". Como um usuário muito rápido, o Playwright começa a interagir no instante em que vê a página. Se o botão estiver habilitado, mas os listeners ainda não foram adicionados, o Playwright fará seu trabalho, mas o clique não terá efeito.

Uma forma simples de verificar se sua página sofre de má hidratação: abra o Chrome DevTools, escolha a emulação de rede "Slow 3G" no painel Network e recarregue a página. Assim que vir o elemento de interesse, interaja com ele. Você verá que cliques em botões são ignorados e o texto digitado é resetado pelo código de carregamento subsequente. O ajuste correto é garantir que todos os controles interativos fiquem desabilitados até depois da hidratação, quando a página está totalmente funcional.

### Armadilhas comuns relacionadas a hidratação

- **Clique "silencioso":** o clique é executado mas o handler ainda não existe. Aguarde um estado mais específico (ex.: `await page.getByRole('button').toBeEnabled()` já não basta; prefira verificar um elemento que só aparece após hidratação).
- **Texto some após digitar:** o `fill` ocorre antes da hidratação e o estado é sobrescrito. Use `page.waitForFunction()` para aguardar uma flag global de hidratação.
- **Mitigação:** se não puder corrigir a aplicação, use `page.waitForSelector()` ou `page.waitForFunction()` para aguardar a hidratação antes de interagir.

```ts
import { test } from '@playwright/test';

test('aguardar hidratação antes de interagir', async ({ page }) => {
  await page.goto('https://example.com');

  // Supondo que a app defina window.__hydrated = true após hidratar.
  await page.waitForFunction(() => (window as unknown as { __hydrated?: boolean }).__hydrated === true);
  await page.getByRole('button', { name: 'Enviar' }).click();
});
```

## Aguardando navegação

Clicar em um elemento pode disparar múltiplas navegações. Nesses casos, recomenda-se usar explicitamente `page.waitForURL()` para uma URL específica.

```ts
import { test } from '@playwright/test';

test('clicar e aguardar URL de login', async ({ page }) => {
  await page.getByText('Click me').click();
  await page.waitForURL('**/login');
});
```

> :::note
> Use padrões glob (`glob`) no `waitForURL`, como `'**/login'` ou `'**/order?id=*'`. O Playwright aceita string com glob, `RegExp` ou função predicado.
> :::

## Back/Forward Cache (BFCache)

Navegadores modernos utilizam o Back/Forward Cache (BFCache) para carregar instantaneamente uma página quando o usuário navega para trás ou para frente. Isso é feito congelando o DOM e o heap de JavaScript da página na memória e descongelando ao retornar.

Por padrão, o Playwright desabilita o BFCache em todos os navegadores para garantir ambientes de teste consistentes e limpos.

Mesmo que você habilite o BFCache explicitamente, **testar restaurações por BFCache não é suportado**. Como uma restauração BFCache pula a fase de busca de rede, o navegador não dispara os eventos padrão de ciclo de vida da navegação (tais como `commit`, `domcontentloaded` ou `load`). O estado interno de `Page` no Playwright depende fortemente desses eventos em nível de rede para se manter sincronizado.

Consequentemente, disparar uma restauração BFCache (por exemplo, via `page.goBack()`) contornará o rastreamento de ciclo de vida do Playwright, resultando em timeouts e um objeto `Page` completamente dessincronizado, onde interações subsequentes falharão.

### Armadilhas comuns

- Não rely em `page.goBack()` / `page.goForward()` para validar estados de BFCache.
- Se precisar testar navegação para trás, prefira fluxos que recarreguem a página normalmente.

## Eventos de navegação

O Playwright divide o processo de exibir um novo documento em uma página em **navegação** e **carregamento** (loading).

- **A navegação inicia** ao mudar a URL da página ou ao interagir com ela (ex.: clicar em um link). A intenção de navegação pode ser cancelada (ex.: DNS não resolvido) ou transformada em download de arquivo.
- **A navegação é confirmada (committed)** quando os cabeçalhos de resposta foram analisados e o histórico de sessão é atualizado. Somente após a navegação ser confirmada com sucesso a página começa a **carregar** o documento.
- **O carregamento** cobre obter o restante do corpo da resposta pela rede, fazer o parse, executar os scripts e disparar os eventos de load:
  - `page.url()` passa a apontar para a nova URL
  - o conteúdo do documento é carregado pela rede e analisado
  - o evento `DOMContentLoaded` é disparado
  - a página executa alguns scripts e carrega recursos como folhas de estilo e imagens
  - o evento `load` é disparado
  - a página executa scripts carregados dinamicamente

### Exemplo completo

```ts
import { test, expect } from '@playwright/test';

test('navegação completa com verificações', async ({ page }) => {
  // Aguarda o carregamento (load) por padrão.
  await page.goto('https://example.com', { waitUntil: 'load' });

  // Clica em link que dispara navegação e aguarda URL específica.
  await page.getByRole('link', { name: 'Artigos' }).click();
  await page.waitForURL('**/articles');

  // Verifica estado do documento após navegação.
  await expect(page).toHaveURL(/articles/);
  console.log('URL final:', page.url());
});
```

## Boas práticas

- Confie no auto-wait do Playwright; raramente é necessário `waitForLoadState()` explícito após `goto`.
- Use `waitForURL()` quando um clique dispara navegação para evitar condições de corrida.
- Para redirecionamentos do lado do cliente, prefira `waitForURL()` em vez de assumir a URL final.
- Em páginas com hidratação problemática, aguarde uma flag de prontidão com `waitForFunction()`.
- Não dependa de BFCache (`goBack`/`goForward`) para validar estados de UI.
