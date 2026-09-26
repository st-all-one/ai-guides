---
id: debug
title: "Depurando testes"
---

## Depuração no VS Code
* langs: js

Recomendamos usar a [VS Code Extension](./getting-started-vscode-js.md) para depuração, por uma melhor experiência de desenvolvimento. Com a extensão do VS Code você pode depurar seus testes diretamente no VS Code, ver mensagens de erro, definir *breakpoints* e percorrer seus testes passo a passo.

### Mensagens de erro

Se seu teste falhar, o VS Code mostrará mensagens de erro diretamente no editor, mostrando o que era esperado, o que foi recebido, bem como um log de chamada completo.

### Live Debugging

Você pode depurar seu teste ao vivo no VS Code. Após rodar um teste com a opção `Show Browser` marcada, clique em qualquer um dos locators no VS Code e ele será destacado na janela do Browser. O Playwright também mostrará se há múltiplas correspondências.

Você também pode editar os locators no VS Code e o Playwright mostrará as mudanças ao vivo na janela do navegador.

### Pick a Locator

Escolha um [locator](./locators.md) e copie-o para seu arquivo de teste clicando no botão **Pick locator** na barra lateral de testes. Então, no navegador, clique no elemento desejado e ele aparecerá na caixa **Pick locator** no VS Code. Pressione 'enter' no teclado para copiar o locator para a área de transferência e cole em qualquer lugar do seu código. Ou pressione 'escape' se quiser cancelar.

O Playwright olhará sua página e descobrirá o melhor locator, priorizando [role, text e test id locators](./locators.md). Se o Playwright encontrar múltiplos elementos correspondendo ao locator, ele melhorará o locator para torná-lo resiliente e identificar unicamente o elemento alvo, para que você não precise se preocupar com testes falhando por causa de locators.

### Run in Debug Mode

Para definir um breakpoint, clique ao lado do número da linha onde você quer o breakpoint até que um ponto vermelho apareça. Rode os testes em modo de depuração clicando com o botão direito na linha ao lado do teste que deseja rodar.

Uma janela de navegador será aberta e o teste rodará e pausará onde o breakpoint foi definido. Você pode percorrer os testes, pausar o teste e rodá-lo novamente a partir do menu no VS Code.

### Debug Tests Using Chrome DevTools

Em vez de usar `Debug Test`, escolha `Run Test` no VS Code. Com `Show Browser` habilitado, a sessão do navegador é reutilizada, permitindo que você abra o Chrome DevTools para depuração contínua dos seus testes e da aplicação web.

### Debug em diferentes Browsers

Por padrão, a depuração é feita usando o perfil Chromium. Você pode depurar seus testes em diferentes browsers clicando com o botão direito no ícone de debug na barra lateral de testes e clicando na opção 'Select Default Profile' no menu suspenso.

Então escolha o perfil de teste que deseja usar para depurar seus testes. Cada vez que rodar seu teste em modo de debug, ele usará o perfil selecionado. Você pode rodar testes em modo de debug clicando com o botão direito no número da linha onde seu teste está e selecionando 'Debug Test' no menu.

## Playwright Inspector

O **Playwright Inspector** é uma ferramenta GUI para ajudar você a depurar seus testes Playwright. Ele permite percorrer seus testes, editar locators ao vivo, escolher locators e ver logs de *actionability*.

### Run in debug mode
* langs: js

Rode seus testes com a flag `--debug` para abrir o inspector. Isso configura o Playwright para depuração e abre o inspector. Defaults úteis adicionais são configurados quando `--debug` é usado:

- Browsers são lançados em modo *headed*
- O timeout padrão é definido como 0 (= sem timeout)

#### Debug all tests on all browsers

Para depurar todos os testes, rode o comando de teste com a flag `--debug`. Isso rodará os testes um a um, e abrirá o inspector e uma janela de navegador para cada teste.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --debug
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --debug
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --debug
```

</TabItem>
</Tabs>

#### Debug one test on all browsers

Para depurar um teste em uma linha específica, rode o comando de teste seguido do nome do arquivo de teste e o número da linha do teste que deseja depurar, seguido da flag `--debug`. Isso rodará um único teste em cada browser configurado no seu [`playwright.config`](./test-configuration-js.md) e abrirá o inspector.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test example.spec.ts:10 --debug
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test example.spec.ts:10 --debug
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test example.spec.ts:10 --debug
```

</TabItem>
</Tabs>

#### Debug on a specific browser

No Playwright você pode configurar projetos no seu [`playwright.config`](./test-configuration-js.md). Uma vez configurado, você pode depurar seus testes em um browser ou viewport mobile específico usando a flag `--project` seguida do nome do projeto configurado no seu `playwright.config`.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --project=chromium --debug
npx playwright test --project="Mobile Safari" --debug
npx playwright test --project="Microsoft Edge" --debug
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --project=chromium --debug
yarn playwright test --project="Mobile Safari" --debug
yarn playwright test --project="Microsoft Edge" --debug
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --project=chromium --debug
pnpm playwright test --project="Mobile Safari" --debug
pnpm playwright test --project="Microsoft Edge" --debug
```

</TabItem>
</Tabs>

#### Debug one test on a specific browser

Para rodar um teste em um browser específico, adicione o nome do arquivo de teste e o número da linha do teste que deseja depurar, bem como a flag `--project` seguida do nome do projeto.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test example.spec.ts:10 --project=webkit --debug
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test example.spec.ts:10 --project=webkit --debug
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test example.spec.ts:10 --project=webkit --debug
```

</TabItem>
</Tabs>

### Stepping through your tests

Você pode dar play, pausar ou percorrer cada ação do seu teste usando a barra de ferramentas no topo do Inspector. Você pode ver a ação atual destacada no código de teste, e os elementos correspondentes destacados na janela do navegador.

### Run a test from a specific breakpoint

Para acelerar o processo de depuração você pode adicionar um método [`Page.pause`] ao seu teste. Assim você não precisará percorrer cada ação do seu teste para chegar ao ponto onde quer depurar.

```ts
await page.pause();
```

Uma vez adicionado o `page.pause()`, rode seus testes em modo de debug. Clicar no botão "Resume" no Inspector rodará o teste e parará apenas no `page.pause()`.

### Live editing locators

Enquanto roda em modo de debug você pode editar locators ao vivo. Ao lado do botão 'Pick Locator' há um campo mostrando o [locator](./locators.md) no qual o teste está pausado. Você pode editar esse locator diretamente no campo **Pick Locator**, e os elementos correspondentes serão destacados na janela do navegador.

### Picking locators

Durante a depuração, você pode precisar escolher um locator mais resiliente. Você pode fazer isso clicando no botão **Pick Locator** e passando o mouse sobre qualquer elemento na janela do navegador. Enquanto passa o mouse sobre um elemento, você verá o código necessário para localizar esse elemento destacado abaixo. Clicar em um elemento no navegador adicionará o locator ao campo onde você pode então ajustá-lo ou copiá-lo para seu código.

O Playwright olhará sua página e descobrirá o melhor locator, priorizando [role, text e test id locators](./locators.md). Se o Playwright encontrar múltiplos elementos correspondendo ao locator, ele melhorará o locator para torná-lo resiliente e identificar unicamente o elemento alvo.

### Actionability logs

No momento em que o Playwright pausou em uma ação de clique, ele já realizou [verificações de actionability](./actionability.md) que podem ser encontradas no log. Isso pode ajudar você a entender o que aconteceu durante seu teste e o que o Playwright fez ou tentou fazer. O log diz se o elemento estava visível, habilitado e estável, se o locator resolveu para um elemento, rolou para a visualização, e muito mais. Se a actionability não puder ser alcançada, ele mostrará a ação como pendente.

## Trace Viewer

O [Trace Viewer](./trace-viewer.md) do Playwright é uma ferramenta GUI que permite explorar *traces* do Playwright gravados dos seus testes. Você pode voltar e avançar através de cada ação no lado esquerdo, e ver visualmente o que estava acontecendo durante a ação. No meio da tela, você pode ver uma *DOM snapshot* para a ação. Do lado direito você pode ver detalhes da ação, como tempo, parâmetros, valor de retorno e log. Você também pode explorar mensagens de console, requisições de rede e o código-fonte.

Para saber mais sobre como gravar traces e usar o Trace Viewer, consulte o guia [Trace Viewer](./trace-viewer.md).

## Browser Developer Tools

Quando rodando em Debug Mode com `PWDEBUG=console`, um objeto `playwright` fica disponível no console do Developer Tools. As developer tools podem ajudar você a:

- Inspecionar a árvore DOM e **encontrar seletores de elemento**
- **Ver logs de console** durante a execução (ou aprender como [ler logs via API](./test-reporters-js.md))
- Checar **atividade de rede** e outros recursos das developer tools

Para depurar seus testes usando as browser developer tools, comece definindo um breakpoint no seu teste para pausar a execução usando o método [`Page.pause`].

```ts
await page.pause();
```

Uma vez definido o breakpoint no seu teste, você pode rodar seu teste com `PWDEBUG=console`.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
PWDEBUG=console npx playwright test
```

</TabItem>
<TabItem value="yarn">

```bash
PWDEBUG=console yarn playwright test
```

</TabItem>
<TabItem value="pnpm">

```bash
PWDEBUG=console pnpm playwright test
```

</TabItem>
</Tabs>

Uma vez que o Playwright abre a janela do navegador, você pode abrir as developer tools. O objeto `playwright` estará disponível no painel de console.

#### playwright.$(selector)

Consulta o seletor Playwright, usando o motor de consulta real do Playwright, por exemplo:

```bash
playwright.$('.auth-form >> text=Log in');

<button>Log in</button>
```

#### playwright.$$(selector)

Igual a `playwright.$`, mas retorna todos os elementos correspondentes.

```bash
playwright.$$('li >> text=John')

[<li>, <li>, <li>, <li>]
```

#### playwright.inspect(selector)

Revela o elemento no painel Elements.

```bash
playwright.inspect('text=Log in')
```

#### playwright.locator(selector)

Cria um locator e consulta elementos correspondentes, por exemplo:

```bash
playwright.locator('.auth-form', { hasText: 'Log in' });

Locator ()
  - element: button
  - elements: [button]
```

#### playwright.selector(element)

Gera seletor para o elemento dado. Por exemplo, selecione um elemento no painel Elements e passe `$0`:

```bash
playwright.selector($0)

"div[id="glow-ingress-block"] >> text=/.*Hello.*/"
```

## Verbose API logs

O Playwright suporta logging verboso com a variável de ambiente `DEBUG`.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
DEBUG=pw:api npx playwright test
```

</TabItem>
<TabItem value="yarn">

```bash
DEBUG=pw:api yarn playwright test
```

</TabItem>
<TabItem value="pnpm">

```bash
DEBUG=pw:api pnpm playwright test
```

</TabItem>
</Tabs>

:::note
**Para WebKit**: abrir o WebKit Inspector durante a execução irá impedir que o script Playwright execute adiante e resetará o user agent e a emulação de dispositivo pré-configurados.
:::

## Headed mode

O Playwright roda os browsers em modo *headless* por padrão. Para mudar esse comportamento, use `headless: false` como opção de lançamento.

Você também pode usar a opção [`BrowserType.launch.slowMo`](./test-configuration-js.md) para desacelerar a execução (em N milissegundos por operação) e acompanhar enquanto depura.

```ts
// Chromium, Firefox, ou WebKit
await chromium.launch({ headless: false, slowMo: 100 });
```

## Quando usar

- **VS Code Extension:** depuração diária com breakpoints e live editing de locators.
- **Playwright Inspector (`--debug`):** quando precisa percorrer ações e ver logs de actionability fora do VS Code.
- **`PWDEBUG=console`:** para inspecionar DOM, seletores e rede via DevTools do navegador.
- **`DEBUG=pw:api`:** para ver o log verboso de cada chamada da API do Playwright.
- **Headed + slowMo:** para acompanhar a execução visualmente durante o desenvolvimento.

## Exemplo completo

```ts title="tests/debug.spec.ts"
import { test, expect } from '@playwright/test';

test('depuração com page.pause', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  // Coloque um breakpoint programático; rode com: npx playwright test --debug
  await page.pause();

  await page.getByPlaceholder('What needs to be done?').fill('Estudar Playwright');
  await page.getByPlaceholder('What needs to be done?').press('Enter');
  await expect(page.getByTestId('todo-item')).toHaveText('Estudar Playwright');
});
```

Rode em modo de depuração:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test debug.spec.ts --debug
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test debug.spec.ts --debug
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test debug.spec.ts --debug
```

</TabItem>
</Tabs>

## Armadilhas comuns

- **Chrome 136 e user data dir:** o diretório de user data padrão não pode ser acessado por ferramentas automatizadas; crie um diretório separado.
- **WebKit Inspector durante execução:** trava o script e reseta emulação de user agent/dispositivo.
- **Timeout padrão em `--debug`:** é 0 (sem timeout); não esqueça de remover a flag em CI ou seus testes podem travar.
- **`DEBUG=pw:api` em produção:** gera muito log; use apenas para diagnóstico local.

## Boas práticas

- Use a extensão do VS Code como principal ferramenta de depuração no dia a dia.
- Combine `page.pause()` com `--debug` para pular até o ponto de interesse rapidamente.
- Use `PWDEBUG=console` + DevTools para investigar seletores e rede quando o Inspector não for suficiente.
- Mantenha traces (`trace: 'on-first-retry'`) no CI como rede de segurança para falhas fora do seu ambiente local.
