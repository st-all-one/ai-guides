---
id: selenium-grid
title: "Selenium Grid (experimental)"
---

## Introdução

O Playwright pode conectar a um [Selenium Grid Hub](https://www.selenium.dev/documentation/grid/) que roda Selenium 4 para lançar o navegador **Google Chrome** ou **Microsoft Edge**, em vez de rodar o navegador na máquina local. Note que este recurso é **experimental** e tem prioridade correspondente.

:::warning
Existe o risco de a integração do Playwright com o Selenium Grid Hub quebrar no futuro. Certifique-se de pesar riscos contra benefícios antes de usá-lo.

Internamente, o Playwright conecta ao navegador usando o websocket do [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). O Selenium 4 atualmente expõe essa capacidade. Porém, isso [pode não ser o caso no futuro](https://github.com/SeleniumHQ/selenium/issues/11590#issuecomment-1436113950). Se o Selenium remover essa capacidade, o Playwright deixará de funcionar com ele.
:::

Antes de conectar o Playwright ao seu Selenium Grid, garanta que o grid funciona com [Selenium WebDriver](https://www.selenium.dev/documentation/webdriver/). Por exemplo, rode [um dos exemplos](https://github.com/SeleniumHQ/selenium/tree/trunk/javascript/selenium-webdriver/example) e passe a variável de ambiente `SELENIUM_REMOTE_URL`. Se o exemplo de webdriver não funcionar, procure erros na saída do seu hub/node/standalone do Selenium e busque [issues do Selenium](https://github.com/SeleniumHQ/selenium/issues) por uma solução possível.

## Iniciando o Selenium Grid

Se você roda um Selenium Grid distribuído, os nodes do Playwright precisam estar registrados com um endereço acessível, para que o Playwright possa conectar aos navegadores. Para garantir que funcione como esperado, defina a variável de ambiente `SE_NODE_GRID_URL` apontando para o hub ao rodar os nodes do Selenium.

```bash
# Inicia o selenium node
SE_NODE_GRID_URL="http://<selenium-hub-ip>:4444" java -jar selenium-server-<version>.jar node
```

## Conectando o Playwright ao Selenium Grid

Para conectar o Playwright ao **Selenium Grid 4**, defina a variável de ambiente `SELENIUM_REMOTE_URL` apontando para o seu Selenium Grid Hub. Note que isso funciona apenas para Google Chrome e Microsoft Edge.

```bash
SELENIUM_REMOTE_URL=http://<selenium-hub-ip>:4444 npx playwright test
```

Você não precisa mudar seu código, apenas use seu harness de teste ou [`method: BrowserType.launch`] normalmente.

### Passando capabilities adicionais

Se o seu grid requer capabilities adicionais (por exemplo, você usa um serviço externo), defina a variável de ambiente `SELENIUM_REMOTE_CAPABILITIES` para fornecer capabilities serializadas em JSON.

```bash
SELENIUM_REMOTE_URL=http://<selenium-hub-ip>:4444 SELENIUM_REMOTE_CAPABILITIES="{'mygrid:options':{os:'windows',username:'John',password:'secure'}}" npx playwright test
```

### Passando headers adicionais

Se o seu grid requer headers adicionais (por exemplo, você deve fornecer um token de autorização para usar navegadores na nuvem), defina a variável de ambiente `SELENIUM_REMOTE_HEADERS` para fornecer headers serializados em JSON.

```bash
SELENIUM_REMOTE_URL=http://<selenium-hub-ip>:4444 SELENIUM_REMOTE_HEADERS="{'Authorization':'Basic b64enc'}" npx playwright test
```

### Logs detalhados

Rode com a variável de ambiente `DEBUG=pw:browser*` para ver como o Playwright está conectando ao Selenium Grid.

```bash
DEBUG=pw:browser* SELENIUM_REMOTE_URL=http://internal.grid:4444 npx playwright test
```

Se você abrir uma issue, inclua esse log.

## Usando Selenium Docker

Uma forma fácil de usar o Selenium Grid é rodar os containers Docker oficiais. Leia mais na documentação de [selenium docker images](https://github.com/SeleniumHQ/docker-selenium). Para a convenção de tags, [leia mais](https://github.com/SeleniumHQ/docker-selenium/wiki/Tagging-Convention#selenium-grid-4x-and-above).

### Modo Standalone

Aqui está um exemplo de como rodar o selenium standalone e conectar o Playwright a ele. Note que hub e node estão no mesmo `localhost`, e passamos a variável `SE_NODE_GRID_URL` apontando para ele.

Primeiro inicie o Selenium:

```bash
docker run -d -p 4444:4444 --shm-size="2g" -e SE_NODE_GRID_URL="http://localhost:4444" selenium/standalone-chromium:latest
```

Depois rode o Playwright:

```bash
SELENIUM_REMOTE_URL=http://localhost:4444 npx playwright test
```

### Modo Hub e Nodes

Aqui está um exemplo de como rodar o hub do selenium e um único node, e conectar o Playwright ao hub. Note que hub e node têm IPs diferentes, e passamos a variável `SE_NODE_GRID_URL` apontando para o hub ao iniciar os containers node.

Primeiro inicie o container hub e um ou mais containers node:

```bash
docker run -d -p 4442-4444:4442-4444 --name selenium-hub selenium/hub:4.25.0
docker run -d -p 5555:5555 \
    --shm-size="2g" \
    -e SE_EVENT_BUS_HOST=<selenium-hub-ip> \
    -e SE_EVENT_BUS_PUBLISH_PORT=4442 \
    -e SE_EVENT_BUS_SUBSCRIBE_PORT=4443 \
    -e SE_NODE_GRID_URL="http://<selenium-hub-ip>:4444"
    selenium/node-chromium:4.25.0
```

Depois rode o Playwright:

```bash
SELENIUM_REMOTE_URL=http://<selenium-hub-ip>:4444 npx playwright test
```

## Selenium 3

Internamente, o Playwright conecta ao navegador usando o websocket do [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). O Selenium 4 expõe essa capacidade, enquanto o Selenium 3 não.

Isso significa que o Selenium 3 é suportado de forma best-effort, onde o Playwright tenta conectar diretamente ao node do grid. Os nodes do grid devem ser diretamente acessíveis a partir da máquina que roda o Playwright.

## Exemplo completo

`playwright.config.ts` forçando o canal Chrome para uso via Selenium Grid:

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chrome-grid',
      use: {
        ...devices['Desktop Chrome'],
        // O Selenium Grid só suporta Google Chrome e Microsoft Edge.
        channel: 'chrome',
      },
    },
  ],
});
```

```bash
# Conecta ao grid e roda os testes (sem mudar o código de teste)
SELENIUM_REMOTE_URL=http://<selenium-hub-ip>:4444 npx playwright test
```

### Quando usar

- Você já possui um Selenium Grid 4 infraestruturado e quer reaproveitá-lo para rodar testes do Playwright em Chrome/Edge.
- Cenários onde os navegadores precisam rodar em máquinas distantes do runner de teste.

### Armadilhas comuns

- **Recurso experimental**: pode quebrar em atualizações futuras do Selenium. Não use para suítes críticas sem plano de contingência.
- Funciona **apenas** com Google Chrome e Microsoft Edge (não Firefox/WebKit).
- O hub/node devem ser acessíveis e o grid deve funcionar com Selenium WebDriver antes de tentar o Playwright.
- Selenium 3 tem suporte best-effort e exige que os nodes sejam diretamente acessíveis.
