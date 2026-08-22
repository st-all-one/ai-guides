---
id: test-ui-mode
title: "UI Mode (modo visual)"
---

import LiteYouTube from '@site/src/components/LiteYouTube';

## Introdução

O UI Mode permite explorar, executar e depurar testes com uma experiência de "time travel" completa, incluindo modo watch. Todos os arquivos de teste são exibidos na barra lateral, permitindo expandir cada arquivo e bloco `describe` para rodar, visualizar, observar e depurar cada teste individualmente. Filtre testes por **nome**, [**projects**](./test-projects-js.md) (definidos no `playwright.config`), **@tag**, ou pelo status de execução **passed**, **failed** e **skipped**. Veja um trace completo dos seus testes e passe o mouse para frente e para trás sobre cada ação para ver o que acontecia em cada passo. Você também pode abrir o snapshot do DOM de um dado momento em uma janela separada para uma melhor experiência de depuração.

<LiteYouTube
    id="d0u6XhXknzU"
    title="Playwrights UI Mode"
/>

### Quando usar

- Depurar testes que falham de forma intermitente ou com erros difíceis de entender em modo headless.
- Explorar o DOM e entender qual locator o Playwright está usando para cada ação.
- Inspecionar rede, console e timeline de uma execução específica.
- Desenvolver testes em loop rápido com o modo watch.

### Armadilhas comuns

- O UI Mode não considera automaticamente testes de setup de dependências de projeto; rode-os manualmente primeiro.
- Em Docker/GitHub Codespaces, exponha na interface `0.0.0.0` — mas lembre-se de que traces e segredos ficam acessíveis na rede.
- Filtros de `@tag` e project dependem de como você nomeou/definiu no `playwright.config.ts`.
- O UI Mode depende de traces; se a config desativa traces (`trace: 'off'`), a aba de actions e a linha do tempo ficarão vazias.

## Abrindo o UI Mode

Para abrir o UI Mode, rode o seguinte comando no terminal:

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'},
  ]
}>

<TabItem value="npm">

```bash
npx playwright test --ui
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --ui
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --ui
```

</TabItem>

</Tabs>

## Executando seus testes

Ao abrir o UI Mode você verá uma lista de todos os seus arquivos de teste. Você pode rodar todos os testes clicando no ícone de triângulo na barra lateral. Você também pode rodar um único arquivo, um bloco de testes ou um teste individual passando o mouse sobre o nome e clicando no triângulo ao lado.

<img src="https://github.com/microsoft/playwright/assets/13063165/6b87712f-64a5-4d73-a91d-6562b864712c" alt="running tests in ui mode" width="3960" height="2326" />

## Filtrando testes

Filtre testes por texto ou `@tag` ou por testes passed, failed ou skipped. Você também pode filtrar por [projects](./test-projects-js.md) definidos no `playwright.config`. Se você usa dependências de projeto, certifique-se de rodar os testes de setup primeiro antes de rodar os testes dependentes. O UI mode não considera os testes de setup, portanto você terá que rodá-los manualmente primeiro.

<img src="https://github.com/microsoft/playwright/assets/13063165/6f05e589-036d-45d5-9078-38134e1261e4" alt="filtering tests in ui mode" width="3960" height="2326" />

## Timeline view

No topo do trace você pode ver uma visão de linha do tempo do seu teste com cores diferentes destacando navegação e ações. Passe o mouse para frente e para trás para ver um snapshot de imagem de cada ação. Dê duplo clique em uma ação para ver o intervalo de tempo daquela ação. Você pode usar o slider na timeline para aumentar as ações selecionadas, que serão mostradas na aba Actions, e todos os logs de console e rede serão filtrados para mostrar apenas os logs das ações selecionadas.

<img src="https://github.com/microsoft/playwright/assets/13063165/811a9985-32aa-4a3e-9869-de32053cf468" alt="timeline view in ui mode" width="3960" height="2326" />

## Actions

Na aba Actions você pode ver qual locator foi usado para cada ação e quanto tempo cada uma levou. Passe o mouse sobre cada ação do seu teste e veja a mudança no snapshot do DOM. Vá para frente e para trás no tempo e clique em uma ação para inspecionar e depurar. Use as abas Before e After para ver visualmente o que aconteceu antes e depois da ação.

<img src="https://github.com/microsoft/playwright/assets/13063165/7b22fab5-7346-4b98-8fdd-a78ed280647f" alt="use before and after actions in ui mode" width="3960" height="2326" />

## Pop out e inspecione o DOM

Abra o snapshot do DOM em sua própria janela para uma melhor experiência de depuração clicando no ícone de pop out acima do snapshot do DOM. A partir daí você pode abrir o DevTools do browser e inspecionar HTML, CSS, Console etc. Volte ao UI Mode e clique em outra ação e abra-a em pop out para comparar as duas lado a lado ou depurar cada uma individualmente.

<img src="https://github.com/microsoft/playwright/assets/13063165/f9f43a0c-78d7-4574-9a58-c69d2ec53c8f" alt="pop out dom snapshot in ui mode" width="3958" height="2322" />

## Pick locator

Clique no botão pick locator e passe o mouse sobre o snapshot do DOM para ver o locator de cada elemento destacado conforme você passa o mouse. Clique em um elemento para adicionar ao locator playground. Você pode modificar o locator no playground e ver se o locator modificado corresponde a algum elemento no snapshot do DOM. Quando satisfeito, use o botão de copiar para copiar o locator e colar no seu teste.

<img src="https://github.com/microsoft/playwright/assets/13063165/9e7eeb84-bd26-4010-8614-75e24b56c716" alt="pick locator in ui mode" width="3960" height="2326" />

## Source

Conforme você passa o mouse sobre cada ação do seu teste, a linha de código daquela ação é destacada no painel de source. O botão "Open in VSCode" fica no canto superior direito desta seção. Ao clicar, abre seu teste no VS Code exatamente na linha de código clicada.

<img src="https://github.com/microsoft/playwright/assets/13063165/49b9fa2a-8a57-4044-acaa-0a2ea4784c5c" alt="showing source code of tests in ui mode" width="3958" height="2322" />

## Call

A aba call mostra informações sobre a ação, como o tempo que levou, qual locator foi usado, se em strict mode e qual tecla foi usada.

<img src="https://github.com/microsoft/playwright/assets/13063165/442314c3-0b16-4400-bf25-c198f8654849" alt="showing call tab in ui mode" width="3958" height="2322" />

## Log

Veja um log completo do seu teste para entender o que o Playwright está fazendo nos bastidores, como scroll até visível, esperar elemento ficar visível, habilitado e estável e realizar ações como click, fill, press etc.

<img src="https://github.com/microsoft/playwright/assets/13063165/1d214ee5-2c07-414d-a342-f88d0864ac89" alt="showing log of tests in ui mode" width="3958" height="2322" />

## Errors

Se seu teste falhar, você verá as mensagens de erro de cada teste na aba Errors. A timeline também mostrará uma linha vermelha destacando onde o erro ocorreu. Você também pode clicar na aba source para ver em qual linha do código fonte o erro está.

<img src="https://github.com/microsoft/playwright/assets/13063165/ffca2fd1-5349-41fb-ade9-ace143bb2c58" alt="showing errors in ui mode" width="3958" height="2322" />

## Console

Veja logs de console do browser assim como do seu teste. Ícones diferentes indicam se o log veio do browser ou do arquivo de teste.

<img src="https://github.com/microsoft/playwright/assets/13063165/b6a44763-da04-4152-bbac-3369ca4a60ac" alt="showing console logs from tests in ui mode" width="3958" height="2322" />

## Network

A aba Network mostra todas as requisições de rede feitas durante o teste. Você pode ordenar por diferentes tipos de requisição, status code, método, request, content type, duração e tamanho. Clique em uma requisição para ver mais informações como headers de request, headers de response, body de request e body de response.

<img src="https://github.com/microsoft/playwright/assets/13063165/946c2722-447a-4005-9518-b4e9b73a8240" alt="showing network requests from tests in ui mode" width="3958" height="2322" />

## Attachments

A aba "Attachments" permite explorar anexos. Se você estiver fazendo [visual regression testing](./test-snapshots-js.md), poderá comparar screenshots examinando o image diff, a imagem atual e a imagem esperada. Ao clicar na imagem esperada você pode usar o slider para deslizar uma imagem sobre a outra e ver facilmente as diferenças.

<img src="https://github.com/microsoft/playwright/assets/13063165/bb83b406-84ed-4380-a96c-0e62d1388093" alt="ui mode with attachments" width="3606" height="2228" />

## Metadata

Ao lado da aba Actions você encontra a aba Metadata, que mostra mais informações sobre o teste, como Browser, tamanho do viewport, duração do teste e mais.

<img src="https://github.com/microsoft/playwright/assets/13063165/befff46e-381a-41c2-8259-e47442add425" alt="metadata tab in ui mode" width="3958" height="2322" />

## Watch mode

Ao lado do nome de cada teste na barra lateral você encontra um ícone de olho. Clicar no ícone ativa o watch mode, que re-roda o teste quando você faz alterações nele. Você pode observar vários testes ao mesmo tempo clicando no olho ao lado de cada um, ou todos os testes clicando no olho no topo da barra lateral.

<img src="https://github.com/microsoft/playwright/assets/13063165/20d7d44c-b52d-43ff-8871-8b828671f3da" alt="watch mode in ui mode" width="3960" height="2326" />

## Docker & GitHub Codespaces

Para ambientes Docker e GitHub Codespaces, você pode rodar o UI Mode no browser. Para que um endpoint seja acessível fora do container, ele precisa ser vinculado à interface `0.0.0.0`:

```bash
npx playwright test --ui-host=0.0.0.0
```

No caso do GitHub Codespaces, a porta é [encaminhada automaticamente](https://docs.github.com/en/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace#about-forwarded-ports), então você pode abrir o UI Mode no browser clicando no link no terminal.

Para ter uma porta estática, você pode passar a flag `--ui-port`:

```bash
npx playwright test --ui-port=8080 --ui-host=0.0.0.0
```

:::note
Esteja ciente de que, ao especificar a flag `--ui-host=0.0.0.0`, o UI Mode com seus traces, senhas e segredos ficam acessíveis de outras máquinas na sua rede. No caso do GitHub Codespaces, as portas são acessíveis apenas da sua conta por padrão.
:::

## Exemplo completo

Para aproveitar ao máximo o UI Mode, você precisa que os traces sejam gerados. A configuração abaixo habilita trace `on-first-retry` (e `on` localmente), o que popula as abas de Actions, Timeline e Network:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    // gera trace em retries e localmente para depuração no UI Mode
    trace: process.env.CI ? 'on-first-retry' : 'on',
  },
});
```

Com isso configurado, abra o UI Mode e rode um teste:

```bash
npx playwright test --ui
```

Para depurar um teste específico rapidamente, use o watch mode (ícone de olho) e edite `tests/example.spec.ts`:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('deve exibir o menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  // ajuste o locator no Playground e clique em "pick locator" para copiá-lo
});
```

## Boas práticas

- Use o modo watch durante o desenvolvimento para iterar rapidamente sem rodar a suíte inteira.
- Combine o UI Mode com `trace: 'on'` ou `on-first-retry` na config para ter traces ricos de depuração.
- Use o pick locator para gerar locators robustos e colá-los direto no teste.
- Em CI, não use UI Mode; use reporters e traces para depuração pós-execução.
- Em containers, prefira `--ui-host=0.0.0.0` apenas em redes confiáveis e proteja a porta com tunnel/forwarding seguro.
