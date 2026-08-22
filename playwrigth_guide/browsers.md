---
id: browsers
title: "Navegadores (Browsers)"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Introdução

Cada versão do Playwright exige versões específicas dos binários de navegador para funcionar. Você precisa usar a CLI do Playwright para instalá-los.

A cada release, o Playwright atualiza as versões dos navegadores suportados, de modo que a versão mais recente do Playwright sempre suporte os navegadores mais recentes. Isso significa que, sempre que você atualizar o Playwright, pode ser necessário rodar novamente o comando `install` da CLI.

Este guia é focado em **TypeScript** com `@playwright/test`. Toda a documentação em Python/Java/C# foi removida; os exemplos utilizam exclusivamente a API de testes do Playwright em TypeScript.

## Instalar navegadores

O Playwright instala os navegadores suportados. Rodar o comando sem argumentos instala os navegadores padrão (Chromium, Firefox e WebKit).

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install
```

</TabItem>
</Tabs>

Você também pode instalar um navegador específico passando um argumento:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install webkit
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install webkit
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install webkit
```

</TabItem>
</Tabs>

Para ver todos os navegadores suportados e opções:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install --help
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install --help
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install --help
```

</TabItem>
</Tabs>

### Quando usar

- **Setup inicial do projeto**: rode `npx playwright install` após `npm i -D @playwright/test`.
- **Pipeline de CI**: inclua o comando no passo de instalação (veja [Continuous Integration](./ci.md)).
- **Navegador específico**: instale apenas o que vai testar (ex.: `webkit`) para economizar tempo e espaço em disco.

### Armadilhas comuns

- Esquecer de rodar `install` após atualizar o `@playwright/test` → erro de binário incompatível.
- Achar que o `npm install` já baixa os navegadores (não baixa; é um passo separado).
- Misturar versões de Playwright e navegadores entre máquinas/CI (sempre versione junto).

## Instalar dependências do sistema

As dependências do sistema operacional podem ser instaladas automaticamente. Isso é muito útil em ambientes de CI (Linux).

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install-deps
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install-deps
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install-deps
```

</TabItem>
</Tabs>

Você também pode instalar as dependências de um único navegador passando-o como argumento:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install-deps chromium
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install-deps chromium
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install-deps chromium
```

</TabItem>
</Tabs>

É possível combinar `install-deps` com `install` para que navegadores e dependências do SO sejam instalados num único comando:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install --with-deps chromium
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install --with-deps chromium
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install --with-deps chromium
```

</TabItem>
</Tabs>

Veja os [requisitos do sistema](./intro.md#system-requirements) para os sistemas operacionais oficialmente suportados.

### Boas práticas

- Em CI Linux, sempre use `--with-deps` (ou `install-deps`) para evitar falhas de launch por bibliotecas faltando.
- Em containers, prefira a [imagem Docker oficial](./docker.md) que já traz as dependências.

## Atualizar o Playwright regularmente

Mantendo sua versão do Playwright atualizada, você usa novos recursos e testa seu app nas versões mais recentes de navegador, capturando falhas antes do lançamento público.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
# Atualiza o Playwright
npm install -D @playwright/test@latest

# Instala os novos navegadores
npx playwright install
```

</TabItem>
<TabItem value="yarn">

```bash
# Atualiza o Playwright
yarn add -D @playwright/test@latest

# Instala os novos navegadores
yarn playwright install
```

</TabItem>
<TabItem value="pnpm">

```bash
# Atualiza o Playwright
pnpm add -D @playwright/test@latest

# Instala os novos navegadores
pnpm playwright install
```

</TabItem>
</Tabs>

Para checar a versão instalada:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright --version
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright --version
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright --version
```

</TabItem>
</Tabs>

## Configurar navegadores

O Playwright roda testes em Chromium, WebKit e Firefox, além de navegadores de marca como Google Chrome e Microsoft Edge. Também roda em dispositivos emulados (tablets e mobiles). Veja o [registry de device parameters](https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json) para a lista completa.

### Rodar testes em navegadores diferentes

O Playwright roda seus testes em múltiplos navegadores/configurações configurando **projects** no `playwright.config.ts`. Você também pode adicionar [opções diferentes](./test-configuration) por project.

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    /* Testa em navegadores desktop */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Testa em viewports mobile. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    /* Testa em navegadores de marca. */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }, // ou 'chrome-beta'
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' }, // ou 'msedge-dev'
    },
  ],
});
```

O Playwright roda todos os projects por padrão:

```bash
npx playwright test

Running 7 tests using 5 workers

  ✓ [chromium] › example.spec.ts:3:1 › basic test (2s)
  ✓ [firefox] › example.spec.ts:3:1 › basic test (2s)
  ✓ [webkit] › example.spec.ts:3:1 › basic test (2s)
  ✓ [Mobile Chrome] › example.spec.ts:3:1 › basic test (2s)
  ✓ [Mobile Safari] › example.spec.ts:3:1 › basic test (2s)
  ✓ [Google Chrome] › example.spec.ts:3:1 › basic test (2s)
  ✓ [Microsoft Edge] › example.spec.ts:3:1 › basic test (2s)
```

Use a opção `--project` para rodar um único project:

```bash
npx playwright test --project=firefox

Running 1 test using 1 worker

  ✓ [firefox] › example.spec.ts:3:1 › basic test (2s)
```

Com a extensão do VS Code você roda seus testes em navegadores diferentes marcando a caixa ao lado do nome na sidebar do Playwright. Esses nomes vêm do seu `playwright.config.ts` na seção `projects`. O config padrão já traz 3 projects: Chromium, Firefox e WebKit.

![Projetos na extensão do VS Code](../playwrigth_docs/images/vscode-projects-section.png)

### Quando usar projects

- **Cross-browser**: garanta que a app funciona em Chromium, Firefox e WebKit.
- **Mobile/responsivo**: valide layouts com `Pixel 5`, `iPhone 12`.
- **Regression em browser de marca**: teste contra `chrome`/`msedge` estáveis.

### Armadilhas comuns

- Esquecer de espalhar a config em `projects` e rodar só Chromium por padrão.
- Usar `channel` em navegador que não está instalado na máquina (Playwright não instala Chrome/Edge automaticamente).
- Confundir `devices['Desktop Chrome']` (apenas viewport/userAgent) com `channel: 'chrome'` (binário real do Google Chrome).

## Chromium

Para Google Chrome, Microsoft Edge e outros navegadores baseados em Chromium, por padrão o Playwright usa builds open source do Chromium. Como o projeto Chromium está à frente dos navegadores de marca, quando o mundo está no Google Chrome N, o Playwright já suporta o Chromium N+1, que será lançado no Google Chrome e Microsoft Edge semanas depois.

### Chromium: headless shell

O Playwright distribui um build normal do Chromium para operações headed e um [chromium headless shell](https://developer.chrome.com/blog/chrome-headless-shell) separado para o modo headless.

Se você roda testes apenas no headless shell (ou seja, a opção `channel` **não** está especificada), por exemplo em CI, pode evitar baixar o Chromium completo passando `--only-shell` na instalação:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
# roda apenas em headless
npx playwright install --with-deps --only-shell
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install --with-deps --only-shell
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install --with-deps --only-shell
```

</TabItem>
</Tabs>

### Chromium: novo modo headless

Você pode optar pelo novo modo headless usando o channel `'chromium'`. Conforme a [documentação oficial do Chrome](https://developer.chrome.com/blog/chrome-headless-shell):

> New Headless, por outro lado, é o próprio navegador Chrome real, sendo assim mais autêntico, confiável e oferecendo mais recursos. Isso o torna mais adequado para testes end-to-end de alta precisão ou testes de extensões de navegador.

Veja a [issue #33566](https://github.com/microsoft/playwright/issues/33566) para detalhes.

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
});
```

Com o novo modo headless, você pode pular o download do headless shell durante a instalação usando a opção `--no-shell`:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install --with-deps --no-shell
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install --with-deps --no-shell
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install --with-deps --no-shell
```

</TabItem>
</Tabs>

### Boas práticas

- CI puramente headless: use `--only-shell` para imagem menor e mais rápida.
- Testes de extensão de navegador ou que dependem de comportamento real do Chrome: use `channel: 'chromium'` (novo headless).

## Google Chrome & Microsoft Edge

Embora o Playwright possa baixar e usar o build recente do Chromium, ele opera contra os navegadores de marca Google Chrome e Microsoft Edge disponíveis na máquina (note que o Playwright **não** os instala por padrão). Em particular, a versão atual do Playwright suporta os canais Stable e Beta desses navegadores.

Canais disponíveis: `chrome`, `msedge`, `chrome-beta`, `msedge-beta`, `chrome-dev`, `msedge-dev`, `chrome-canary`, `msedge-canary`.

:::warning
Certas políticas corporativas de Enterprise Browser podem impactar a capacidade do Playwright de lançar e controlar Google Chrome e Microsoft Edge. Rodar em um ambiente com políticas de navegador está fora do escopo do projeto Playwright.
:::

:::warning
Google Chrome e Microsoft Edge migraram para uma implementação de [novo modo headless](https://developer.chrome.com/docs/chromium/headless) mais próxima do modo headed normal. Isso difere do [chromium headless shell](https://developer.chrome.com/blog/chrome-headless-shell) usado pelo Playwright por padrão em headless, então espere comportamentos diferentes em alguns casos. Veja a [issue #33566](https://github.com/microsoft/playwright/issues/33566).
:::

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    /* Testa em navegadores de marca. */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }, // ou 'chrome-beta'
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' }, // ou "msedge-beta" ou 'msedge-dev'
    },
  ],
});
```

#### Instalando Google Chrome & Microsoft Edge

Se o Google Chrome ou Microsoft Edge não estiver disponível na máquina, você pode instalá-los usando a CLI do Playwright:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright install msedge
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install msedge
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright install msedge
```

</TabItem>
</Tabs>

:::warning
As instalações do Google Chrome ou Microsoft Edge são feitas no local global padrão do seu sistema operacional, sobrescrevendo a instalação atual do navegador.
:::

#### Quando usar Google Chrome & Microsoft Edge e quando não usar?

##### Padrão (Default)

Usar a configuração padrão do Playwright com o Chromium mais recente é uma boa ideia na maior parte dos casos. Como o Playwright está à frente dos canais Stable, você tem a tranquilidade de que os próximos releases do Google Chrome ou Microsoft Edge não vão quebrar seu site. Você captura a quebra cedo e tem tempo de sobra para corrigir antes da atualização oficial do Chrome.

##### Regression testing

Ditas as políticas de teste, muitas vezes é exigido regression testing contra os navegadores publicamente disponíveis. Nesse caso, opte por um dos canais estáveis, `"chrome"` ou `"msedge"`.

##### Media codecs

Outro motivo para testar com binários oficiais é testar funcionalidades relacionadas a media codecs. O Chromium não tem todos os codecs que o Google Chrome ou Microsoft Edge empacotam, devido a acordos de licenciamento. Se seu site depende desse tipo de codec (raro), use o canal oficial.

##### Enterprise policy

Google Chrome e Microsoft Edge respeitam políticas corporativas, que incluem limitações de capacidades, proxy de rede e extensões obrigatórias que atrapalham o teste. Se você faz parte de uma organização que usa tais políticas, o mais fácil é usar o Chromium empacotado para testes locais; ainda pode optar pelos canais estáveis nos bots, que tipicamente estão livres dessas restrições.

### Firefox

A versão do Firefox no Playwright acompanha o build recente do [Firefox Stable](https://www.mozilla.org/en-US/firefox/new/). O Playwright não funciona com a versão de marca do Firefox pois depende de patches.

Note que a disponibilidade de certos recursos, que dependem fortemente da plataforma, pode variar entre sistemas operacionais. Por exemplo, media codecs disponíveis variam substancialmente entre Linux, macOS e Windows.

### WebKit

O WebKit do Playwright deriva das fontes mais recentes do branch main do WebKit, frequentemente antes dessas atualizações serem incorporadas ao Apple Safari e outros navegadores baseados em WebKit. Isso dá bastante tempo de reação para possíveis problemas de atualização. O Playwright não funciona com a versão de marca do Safari pois depende de patches. Em vez disso, teste com o build mais recente do WebKit.

Note que a disponibilidade de certos recursos pode variar entre SOs. Embora rodar WebKit em CI Linux seja a opção mais barata, para uma experiência mais próxima do Safari você deve rodar WebKit no macOS (por exemplo, para reprodução de vídeo).

## Instalar atrás de firewall ou proxy

Por padrão, o Playwright baixa os navegadores do CDN da Microsoft.

Às vezes empresas mantêm um proxy interno que bloqueia o acesso direto a recursos públicos. Nesse caso, o Playwright pode ser configurado para baixar via servidor proxy usando a variável de ambiente `HTTPS_PROXY`.

```bash
# Bash / npm
HTTPS_PROXY=https://192.0.2.1 npx playwright install
```

```bash
# PowerShell (equivalente)
$Env:HTTPS_PROXY="https://192.0.2.1"
npx playwright install
```

> No Windows cmd, use `set HTTPS_PROXY=https://192.0.2.1` antes do comando.

Se as requisições do proxy forem interceptadas por uma CA não confiável e resultarem em `Error: self signed certificate in certificate chain` durante o download, defina seus certificados raiz via a variável [`NODE_EXTRA_CA_CERTS`](https://nodejs.org/api/cli.html#node_extra_ca_certsfile):

```bash
export NODE_EXTRA_CA_CERTS="/path/to/cert.pem"
```

Se sua rede for lenta para conectar ao archive do Playwright, aumente o timeout de conexão em milissegundos com `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT`:

```bash
PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=120000 npx playwright install
```

Se você está [instalando dependências](#instalar-dependências-do-sistema) e precisa usar um proxy no Linux, rode o comando como root. Caso contrário, o Playwright tentará virar root e não passará variáveis como `HTTPS_PROXY` ao gerenciador de pacotes:

```bash
sudo HTTPS_PROXY=https://192.0.2.1 npx playwright install-deps
```

## Baixar de repositório de artefatos

Por padrão, o Playwright baixa navegadores do CDN da Microsoft.

Às vezes empresas mantêm um repositório de artefatos interno para hospedar binários de navegador. Nesse caso, o Playwright pode ser configurado para baixar de um local customizado usando a variável `PLAYWRIGHT_DOWNLOAD_HOST`.

```bash
PLAYWRIGHT_DOWNLOAD_HOST=http://192.0.2.1 npx playwright install
```

Também é possível usar hosts por navegador com `PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST`, `PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST` e `PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST`, que têm precedência sobre `PLAYWRIGHT_DOWNLOAD_HOST`:

```bash
PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST=http://203.0.113.3 PLAYWRIGHT_DOWNLOAD_HOST=http://192.0.2.1 npx playwright install
```

## Gerenciando binários de navegador

O Playwright baixa os navegadores Chromium, WebKit e Firefox nas seguintes pastas de cache do SO:

- `%USERPROFILE%\AppData\Local\ms-playwright` no Windows
- `~/Library/Caches/ms-playwright` no macOS
- `~/.cache/ms-playwright` no Linux

Esses navegadores ocupam algumas centenas de MB em disco:

```bash
du -hs ~/Library/Caches/ms-playwright/*
281M  chromium-XXXXXX
187M  firefox-XXXX
180M  webkit-XXXX
```

Você pode sobrescrever esse comportamento com variáveis de ambiente. Ao instalar, peça para baixar num local específico:

```bash
PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers npx playwright install
```

Ao rodar os testes, peça para o Playwright procurar os navegadores num local compartilhado:

```bash
PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers npx playwright test
```

O Playwright rastreia os pacotes que precisam desses navegadores e os coleta como lixo (garbage collection) conforme você atualiza o Playwright para versões mais novas.

:::note
Desenvolvedores podem ativar esse modo exportando `PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers` no `.bashrc`.
:::

### Instalação hermética (Hermetic install)

Você pode optar pela instalação hermética e colocar os binários na pasta local:

```bash
# Coloca binários em node_modules/playwright-core/.local-browsers
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install
```

:::note
`PLAYWRIGHT_BROWSERS_PATH` não altera o caminho de instalação do Google Chrome e Microsoft Edge.
:::

### Remoção de navegadores obsoletos

O Playwright rastreia os clientes que usam seus navegadores. Quando não há mais clientes que exigem uma versão específica, ela é deletada do sistema. Para desativar a remoção, defina `PLAYWRIGHT_SKIP_BROWSER_GC=1` ou passe `--no-remove`:

```bash
npx playwright install --no-remove
```

### Listar todos os navegadores instalados

Imprime a lista de navegadores de todas as instalações do Playwright na máquina:

```bash
npx playwright install --list
```

### Desinstalar navegadores

Remove os navegadores (chromium, firefox, webkit) da instalação atual do Playwright:

```bash
npx playwright uninstall
```

Para remover navegadores de outras instalações do Playwright, passe `--all`:

```bash
npx playwright uninstall --all
```

## Exemplo completo

Abaixo, um `playwright.config.ts` completo que cobre desktop, mobile e navegadores de marca, com workers ajustados para CI:

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Em CI, roda sequencialmente para estabilidade; localmente, paralelo.
  workers: process.env.CI ? 1 : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
```

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('navegador padrão carrega a home', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
```
