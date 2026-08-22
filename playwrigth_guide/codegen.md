---
id: codegen
title: "Test generator (Codegen)"
---

## Introdução

O Playwright traz a capacidade de gerar testes para você enquanto você realiza ações no navegador, e é uma ótima forma de começar rapidamente com testes. O Playwright olhará sua página e descobrirá o melhor locator, priorizando [role, text e test id locators](./locators.md). Se o gerador encontrar múltiplos elementos correspondendo ao locator, ele melhorará o locator para torná-lo resiliente e identificar unicamente o elemento alvo.

## Quando usar

- **Bootstrapping de testes:** gere a estrutura inicial de um fluxo de usuário sem escrever locators manualmente.
- **Descoberta de locators resilientes:** deixe o gerador escolher o melhor locator (role/text/testid).
- **Geração de asserções:** gravar `assert visibility`, `assert text` e `assert value` diretamente pela UI.
- **Emulação de contexto:** gerar testes para viewport, device, color scheme, geolocalização, idioma ou timezone específicos.

## Gerar testes no VS Code
* langs: js

Instale a extensão do VS Code e gere testes diretamente do VS Code. A extensão está disponível no [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright). Consulte nosso guia sobre [começar com VS Code](./getting-started-vscode-js.md).

### Record a New Test

Para gravar um teste, clique no botão **Record new** na barra lateral de testes. Isso criará um arquivo `test-1.spec.ts` assim como abrirá uma janela de navegador.

No navegador, vá para a URL que deseja testar e comece a clicar para gravar suas ações de usuário.

O Playwright gravará suas ações e gerará o código de teste diretamente no VS Code. Você também pode gerar asserções escolhendo um dos ícones na barra de ferramentas e então clicando em um elemento na página para asserir contra. As seguintes asserções podem ser geradas:

- `'assert visibility'` para asserir que um elemento está visível
- `'assert text'` para asserir que um elemento contém um texto específico
- `'assert value'` para asserir que um elemento tem um valor específico

Uma vez terminado de gravar, clique no botão **cancel** ou feche a janela do navegador. Você então pode inspecionar seu arquivo `test-1.spec.ts` e melhorá-lo manualmente se necessário.

### Record at Cursor

Para gravar a partir de um ponto específico do seu teste, mova seu cursor para onde deseja gravar mais ações e então clique no botão **Record at cursor** na barra lateral de testes. Se sua janela de navegador ainda não estiver aberta, primeiro rode o teste com 'Show browser' marcado e então clique no botão **Record at cursor**.

Na janela do navegador, comece a realizar as ações que deseja gravar.

No arquivo de teste no VS Code você verá suas novas ações geradas adicionadas ao teste na posição do cursor.

### Generating locators

Você pode gerar locators com o test generator.

- Clique no botão **Pick locator** na barra lateral de testes e então passe o mouse sobre elementos na janela do navegador para ver o [locator](./locators.md) destacado abaixo de cada elemento.
- Clique no elemento desejado e ele aparecerá na caixa **Pick locator** no VS Code.
- Pressione <kbd>Enter</kbd> no teclado para copiar o locator para a área de transferência e cole em qualquer lugar do seu código. Ou pressione 'escape' se quiser cancelar.

## Gerar testes com o Playwright Inspector

Ao rodar o comando `codegen`, duas janelas serão abertas: uma janela de navegador onde você interage com o site que deseja testar e a janela do Playwright Inspector onde você pode gravar seus testes e então copiá-los para seu editor.

### Running Codegen

Use o comando `codegen` para rodar o test generator seguido da URL do site para o qual deseja gerar testes. A URL é opcional e você sempre pode rodar o comando sem ela e então adicionar a URL diretamente na janela do navegador.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
</Tabs>

### Recording a test

Rode o comando `codegen` e realize ações na janela do navegador. O Playwright gerará o código para as interações do usuário que você pode ver na janela do Playwright Inspector. Uma vez terminado de gravar seu teste, pare a gravação e pressione o botão **copy** para copiar seu teste gerado para seu editor.

Com o test generator você pode gravar:

- Ações como click ou fill simplesmente interagindo com a página
- Asserções clicando em um dos ícones na barra de ferramentas e então clicando em um elemento na página para asserir contra. Você pode escolher:
  - `'assert visibility'` para asserir que um elemento está visível
  - `'assert text'` para asserir que um elemento contém um texto específico
  - `'assert value'` para asserir que um elemento tem um valor específico

Quando terminar de interagir com a página, pressione o botão **record** para parar a gravação e use o botão **copy** para copiar o código gerado para seu editor.

Use o botão **clear** para limpar o código e começar a gravar novamente. Uma vez terminado, feche a janela do Playwright Inspector ou pare o comando no terminal.

### Generating locators

Você pode gerar [locators](./locators.md) com o test generator.

- Pressione o botão `'Record'` para parar a gravação e o botão `'Pick Locator'` aparecerá.
- Clique no botão `'Pick Locator'` e então passe o mouse sobre elementos na janela do navegador para ver o locator destacado abaixo de cada elemento.
- Para escolher um locator, clique no elemento que gostaria de localizar e o código para aquele locator aparecerá no campo ao lado do botão Pick Locator.
- Você então pode editar o locator nesse campo para ajustá-lo ou usar o botão copy para copiá-lo e colá-lo em seu código.

## Emulation

Você pode usar o test generator para gerar testes usando emulação, de forma a gerar um teste para um viewport, device, color scheme específicos, assim como emular a geolocalização, idioma ou timezone. O test generator também pode gerar um teste preservando o estado autenticado.

### Emular tamanho de viewport

O Playwright abre uma janela de navegador com seu viewport definido para uma largura e altura específicas e não é responsivo, pois testes precisam rodar sob as mesmas condições. Use a opção `--viewport` para gerar testes com um tamanho de viewport diferente.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --viewport-size="800,600" playwright.dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --viewport-size="800,600" playwright.dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --viewport-size="800,600" playwright.dev
```

</TabItem>
</Tabs>

### Emular devices

Grave scripts e testes enquanto emula um device móvel usando a opção `--device`, que define o tamanho de viewport e user agent, entre outros.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --device="iPhone 13" playwright.dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --device="iPhone 13" playwright.dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --device="iPhone 13" playwright.dev
```

</TabItem>
</Tabs>

### Emular color scheme

Grave scripts e testes enquanto emula o color scheme com a opção `--color-scheme`.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --color-scheme=dark playwright.dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --color-scheme=dark playwright.dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --color-scheme=dark playwright.dev
```

</TabItem>
</Tabs>

### Emular geolocalização, idioma e timezone

Grave scripts e testes enquanto emula timezone, idioma e localização usando as opções `--timezone`, `--geolocation` e `--lang`. Uma vez que a página abre:

1. Aceite os cookies
2. No topo à direita, clique no botão de localizar-me para ver a geolocalização em ação

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --timezone="Europe/Rome" --geolocation="41.890221,12.492348" --lang="it-IT" bing.com/maps
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --timezone="Europe/Rome" --geolocation="41.890221,12.492348" --lang="it-IT" bing.com/maps
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --timezone="Europe/Rome" --geolocation="41.890221,12.492348" --lang="it-IT" bing.com/maps
```

</TabItem>
</Tabs>

### Preservar estado autenticado

Rode `codegen` com `--save-storage` para salvar dados de [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies), [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) e [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) ao final da sessão. Isso é útil para gravar separadamente um passo de autenticação e reutilizá-lo depois ao gravar mais testes.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen github.com/microsoft/playwright --save-storage=auth.json
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen github.com/microsoft/playwright --save-storage=auth.json
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen github.com/microsoft/playwright --save-storage=auth.json
```

</TabItem>
</Tabs>

#### Login

Após realizar a autenticação e fechar o navegador, o `auth.json` conterá o storage state que você pode então reutilizar em seus testes.

Certifique-se de usar o `auth.json` apenas localmente, pois ele contém informações sensíveis. Adicione-o ao seu `.gitignore` ou delete-o assim que terminar de gerar seus testes.

#### Carregar estado autenticado

Rode com `--load-storage` para consumir o storage previamente carregado do `auth.json`. Assim, todos os dados de [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies), [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) e [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) serão restaurados, levando a maioria das web apps ao estado autenticado sem necessidade de login novamente. Isso significa que você pode continuar gerando testes a partir do estado logado.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --load-storage=auth.json github.com/microsoft/playwright
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --load-storage=auth.json github.com/microsoft/playwright
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --load-storage=auth.json github.com/microsoft/playwright
```

</TabItem>
</Tabs>

#### Usar userDataDir existente

Rode `codegen` com `--user-data-dir` para definir um [user data directory](./test-configuration-js.md) fixo para a sessão do navegador. Se você criar um user data directory de navegador customizado, o codegen usará esse perfil de navegador existente e terá acesso a qualquer estado de autenticação presente naquele perfil.

:::warning
[A partir do Chrome 136, o diretório de user data padrão não pode ser acessado via ferramentas automatizadas](https://developer.chrome.com/blog/remote-debugging-port), como o Playwright. Você deve criar um diretório de user data separado para uso em testes.
:::

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --user-data-dir=/path/to/your/browser/data/ github.com/microsoft/playwright
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --user-data-dir=/path/to/your/browser/data/ github.com/microsoft/playwright
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --user-data-dir=/path/to/your/browser/data/ github.com/microsoft/playwright
```

</TabItem>
</Tabs>

#### Autenticar com HTTP credentials

Rode `codegen` com `--http-credentials` para autenticar com [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication). Diferente de credenciais embutidas na URL, elas são enviadas para qualquer origem que as solicite durante a sessão de gravação e são incluídas no código gerado.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen --http-credentials="username:password" example.com
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen --http-credentials="username:password" example.com
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen --http-credentials="username:password" example.com
```

</TabItem>
</Tabs>

## Record using custom setup

Se você gostaria de usar o codegen em algum setup não padrão (por exemplo, usar [`BrowserContext.route`](./network.md)), é possível chamar [`Page.pause`] que abrirá uma janela separada com os controles do codegen.

```ts
import { chromium } from '@playwright/test';

(async () => {
  // Certifique-se de rodar em modo headed.
  const browser = await chromium.launch({ headless: false });

  // Configure o contexto como quiser.
  const context = await browser.newContext({ /* passe quaisquer opções */ });
  await context.route('**/*', route => route.continue());

  // Pause a página e comece a gravar manualmente.
  const page = await context.newPage();
  await page.pause();
})();
```

## Exemplo completo

Fluxo típico: gerar um teste de uma todo list autenticada usando storage preservado e viewport de iPhone.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
# 1. Grava o login e salva o storage
npx playwright codegen github.com/microsoft/playwright --save-storage=auth.json

# 2. Gera testes a partir do estado autenticado, em um device móvel
npx playwright codegen --load-storage=auth.json --device="iPhone 13" github.com/microsoft/playwright
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen github.com/microsoft/playwright --save-storage=auth.json
yarn playwright codegen --load-storage=auth.json --device="iPhone 13" github.com/microsoft/playwright
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen github.com/microsoft/playwright --save-storage=auth.json
pnpm playwright codegen --load-storage=auth.json --device="iPhone 13" github.com/microsoft/playwright
```

</TabItem>
</Tabs>

Código gerado típico (melhore manualmente depois):

```ts
import { test, expect } from '@playwright/test';

test('generated todo flow', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await page.getByPlaceholder('What needs to be done?').click();
  await page.getByPlaceholder('What needs to be done?').fill('Estudar Playwright');
  await page.getByPlaceholder('What needs to be done?').press('Enter');
  await expect(page.getByTestId('todo-item')).toHaveText('Estudar Playwright');
});
```

## Armadilhas comuns

- **Commitar `auth.json`:** contém dados sensíveis. Adicione ao `.gitignore` e remova após gerar testes.
- **Chrome 136 e user data dir padrão:** use um diretório separado via `--user-data-dir`.
- **Locators frágeis gerados:** o gerador é bom, mas revise e prefira `getByRole`/`getByTestId` para estabilidade.
- **Viewport fixa e não responsiva:** testes gerados com `--viewport` rodam em condições fixas; não espere responsividade automática.
- **Asserções só de visibilidade:** gere também `assert text`/`assert value` para contratos mais fortes.

## Boas práticas

- Use o VS Code Extension para gravar e editar locators no mesmo lugar.
- Gere estado autenticado uma vez (`--save-storage`) e reutilize (`--load-storage`) para não gravar o login repetidamente.
- Combine emulação (`--device`, `--color-scheme`, `--lang`, `--timezone`) para cobrir contextos de usuário relevantes.
- Revise e refatore o código gerado: o codegen é um ponto de partida, não o produto final.
- Utilize [`Page.pause`] em setups customizados (ex.: roteamento de rede) para abrir os controles do codegen.```
