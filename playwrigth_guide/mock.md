---
id: mock
title: "Mock de APIs"
---

## Introdução

APIs Web geralmente são implementadas como endpoints HTTP. O Playwright fornece APIs para **mockar** e **modificar** o tráfego de rede, tanto HTTP quanto HTTPS. Qualquer requisição feita por uma página, incluindo [XHRs](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) e requisições [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), pode ser rastreada, modificada e mockada. Com o Playwright você também pode mockar usando arquivos HAR que contêm múltiplas requisições de rede feitas pela página.

Todos os exemplos abaixo usam TypeScript com `@playwright/test`.

### Quando usar

- **Mockar requisições**: quando você quer isolamento total da API real (testes determinísticos e rápidos).
- **Modificar respostas**: quando precisa da resposta real, mas com ajustes pontuais (ex.: adicionar um item a uma lista).
- **HAR files**: quando deseja gravar o tráfego real uma vez e replay-lo de forma estável em CI.
- **WebSockets**: para substituir ou interceptar a comunicação de um WebSocket.

## Mock de requisições de API

O código a seguir intercepta todas as chamadas para `*/**/api/v1/fruits` e retorna uma resposta customizada no lugar. Nenhuma requisição à API será feita. O teste navega para a URL que usa a rota mockada e verifica que o dado mockado está presente na página.

```ts title="tests/mock-api.spec.ts"
import { test, expect } from '@playwright/test';

test('mocka uma fruta e não chama a API', async ({ page }) => {
  // Mocka a chamada da API antes de navegar.
  await page.route('*/**/api/v1/fruits', async route => {
    const json = [{ name: 'Strawberry', id: 21 }];
    await route.fulfill({ json });
  });

  // Vai para a página.
  await page.goto('https://demo.playwright.dev/api-mocking');

  // Verifica que a fruta Strawberry está visível.
  await expect(page.getByText('Strawberry')).toBeVisible();
});
```

Você pode ver, no trace do teste de exemplo, que a API nunca foi chamada — porém foi atendida (`fulfill`) com os dados mockados.

<img src="https://github.com/microsoft/playwright/assets/13063165/3dc14cbf-c100-4efc-ac21-d7b52d698b53" alt="api mocking trace" width="2946" height="1902" />

Saiba mais sobre [rede avançada](./network.md).

### Boas práticas

- Defina a rota **antes** de `page.goto()` para garantir que a primeira requisição já seja interceptada.
- Use `await route.fulfill(...)` (assíncrono) em vez de versões síncronas.
- Prefira padrões glob restritos (`*/**/api/v1/fruits`) para não interceptar recursos acidentalmente.

## Modificar respostas de API

Às vezes é essencial fazer a requisição à API, mas a resposta precisa ser ajustada para permitir testes reprodutíveis. Nesse caso, em vez de mockar a requisição, você executa a requisição e a atende com a resposta modificada.

No exemplo abaixo interceptamos a chamada à API de frutas e adicionamos uma nova fruta chamada `'Loquat'` aos dados. Depois navegamos para a URL e verificamos que esse dado está lá:

```ts title="tests/mock-api.spec.ts"
import { test, expect } from '@playwright/test';

test('busca o JSON da API e adiciona uma nova fruta', async ({ page }) => {
  // Obtém a resposta e adiciona a ela.
  await page.route('*/**/api/v1/fruits', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.push({ name: 'Loquat', id: 100 });
    // Atende usando a resposta original, enquanto patcha o corpo da
    // resposta com o objeto JSON informado.
    await route.fulfill({ response, json });
  });

  // Vai para a página.
  await page.goto('https://demo.playwright.dev/api-mocking');

  // Verifica que a nova fruta está visível.
  await expect(page.getByText('Loquat', { exact: true })).toBeVisible();
});
```

No trace do teste podemos ver que a API foi chamada e a resposta foi modificada.

<img src="https://github.com/microsoft/playwright/assets/13063165/8b8dd82d-1b3e-428e-871b-840581fed439" alt="trace de teste mostrando a API sendo chamada e atendida" width="2946" height="1902" />

Inspecionando a resposta, vemos que nossa nova fruta foi adicionada à lista.

<img src="https://github.com/microsoft/playwright/assets/13063165/03e6c87c-4ecc-47e8-9ca0-30fface25e9d" alt="trace de teste mostrando a resposta mockada" width="2946" height="1902" />

Saiba mais sobre [rede avançada](./network.md).

## Mocking com arquivos HAR

Um arquivo HAR é um [HTTP Archive](http://www.softwareishard.com/blog/har-12-spec/) que contém um registro de todas as requisições de rede feitas quando uma página é carregada. Ele contém informações sobre cabeçalhos de requisição/resposta, cookies, conteúdo, tempos e muito mais. Você pode usar arquivos HAR para mockar requisições de rede nos seus testes. Você precisa:

1. Gravar um arquivo HAR.
1. Versionar o arquivo HAR junto com os testes.
1. Rotezar as requisições usando os HARs salvos nos testes.

### Gravando um arquivo HAR

Para gravar um arquivo HAR usamos o método [`Page.routeFromHAR`](./mock.md#replay-a-partir-do-har) ou [`BrowserContext.routeFromHAR`](./mock.md#replay-a-partir-do-har). Esse método recebe o caminho para o arquivo HAR e um objeto opcional de opções. O objeto de opções pode conter a `url` para que apenas requisições com URL casando o padrão glob especificado sejam servidas a partir do HAR. Se não for especificado, todas as requisições serão servidas do HAR.

Definir a opção `update` como `true` criará ou atualizará o HAR com as informações reais de rede, em vez de servir as requisições a partir do HAR. Use isso ao criar um teste para popular o HAR com dados reais.

```ts title="tests/har.spec.ts"
import { test, expect } from '@playwright/test';

test('grava ou atualiza o arquivo HAR', async ({ page }) => {
  // Obtém a resposta a partir do arquivo HAR.
  await page.routeFromHAR('./hars/fruit.har', {
    url: '*/**/api/v1/fruits',
    update: true,
  });

  // Vai para a página.
  await page.goto('https://demo.playwright.dev/api-mocking');

  // Verifica que a fruta está visível.
  await expect(page.getByText('Strawberry')).toBeVisible();
});
```

### Modificando um arquivo HAR

Depois de gravar um arquivo HAR, você pode modificá-lo abrindo o arquivo `.txt` com hash dentro da pasta `hars` e editando o JSON. Esse arquivo deve ser versionado no seu controle de código. Sempre que você rodar esse teste com `update: true`, ele atualizará o HAR com a requisição da API.

```json title="hars/fruit.har/<hash>.txt"
[
  {
    "name": "Playwright",
    "id": 100
  },
  // ... outras frutas
]
```

### Replay a partir do HAR

Agora que você gravou o HAR e modificou os dados mockados, ele pode ser usado para servir respostas correspondentes no teste. Para isso, basta desligar ou remover a opção `update`. Isso executará o teste contra o HAR em vez de bater na API.

```ts title="tests/har.spec.ts"
import { test, expect } from '@playwright/test';

test('pega o JSON do HAR e verifica que a nova fruta foi adicionada', async ({ page }) => {
  // Replay das requisições de API a partir do HAR.
  // Usa uma resposta correspondente do HAR,
  // ou aborta a requisição se nada corresponder.
  await page.routeFromHAR('./hars/fruit.har', {
    url: '*/**/api/v1/fruits',
    update: false,
  });

  // Vai para a página.
  await page.goto('https://demo.playwright.dev/api-mocking');

  // Verifica que a fruta Playwright está visível.
  await expect(page.getByText('Playwright', { exact: true })).toBeVisible();
});
```

No trace do teste podemos ver que a rota foi atendida a partir do HAR e a API não foi chamada.

<img src="https://github.com/microsoft/playwright/assets/13063165/1bd7ab66-ea4f-43c2-a4e5-ca17d4837ff1" alt="trace mostrando o HAR sendo usado" width="2946" height="1902" />

Se inspecionarmos a resposta, vemos que nossa nova fruta foi adicionada ao JSON, o que foi feito editando manualmente o arquivo `.txt` com hash dentro da pasta `hars`.

<img src="https://github.com/microsoft/playwright/assets/13063165/db3117fc-7b02-4973-9a51-29e213261a6a" alt="trace mostrando resposta do HAR" width="2946" height="1902" />

O replay de HAR casa URL e método HTTP estritamente. Para requisições POST, também casa o payload POST estritamente. Se múltiplos registros casarem uma requisição, aquele com mais cabeçalhos correspondentes é escolhido. Uma entrada que resulta em redirect é seguida automaticamente.

Assim como na gravação, se o nome do HAR terminar com `.zip`, ele é considerado um arquivo compactado contendo o HAR junto com os payloads de rede armazenados como entradas separadas. Você também pode extrair esse arquivo, editar payloads ou o log HAR manualmente e apontar para o HAR extraído. Todos os payloads serão resolvidos relativos ao HAR extraído no sistema de arquivos.

#### Gravando HAR com a CLI

Recomendamos a opção `update` para gravar o HAR para o seu teste. Contudo, você também pode gravar o HAR com a Playwright CLI.

Abra o navegador com a Playwright CLI e passe a opção `--save-har` para produzir um arquivo HAR. Opcionalmente, use `--save-har-glob` para salvar apenas as requisições nas quais você está interessado, por exemplo endpoints de API. Se o nome do HAR terminar com `.zip`, os artefatos são escritos como arquivos separados e comprimidos em um único `zip`.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[ {label:'npm', value:'npm'}, {label:'yarn', value:'yarn'}, {label:'pnpm', value:'pnpm'} ]}>

<TabItem value="npm">

```bash
# Salva requisições de API de example.com como arquivo "example.har".
npx playwright open --save-har=example.har --save-har-glob="**/api/**" https://example.com
```

</TabItem>

<TabItem value="yarn">

```bash
# Salva requisições de API de example.com como arquivo "example.har".
yarn playwright open --save-har=example.har --save-har-glob="**/api/**" https://example.com
```

</TabItem>

<TabItem value="pnpm">

```bash
# Salva requisições de API de example.com como arquivo "example.har".
pnpm playwright open --save-har=example.har --save-har-glob="**/api/**" https://example.com
```

</TabItem>

</Tabs>

Saiba mais sobre [rede avançada](./network.md).

## Mock de WebSockets

O código a seguir intercepta conexões WebSocket e mocka toda a comunicação sobre o WebSocket, em vez de conectar ao servidor. Este exemplo responde a um `"request"` com um `"response"`.

```ts title="tests/mock-ws.spec.ts"
import { test, expect } from '@playwright/test';

test('mocka a comunicação de um WebSocket', async ({ page }) => {
  await page.routeWebSocket('wss://example.com/ws', ws => {
    ws.onMessage(message => {
      if (message === 'request')
        ws.send('response');
    });
  });

  await page.goto('https://example.com');
});
```

Alternativamente, você pode querer conectar ao servidor real, mas interceptar as mensagens no meio e modificá-las ou bloqueá-las. Aqui está um exemplo que modifica algumas das mensagens enviadas pela página ao servidor, deixando as demais inalteradas.

```ts title="tests/mock-ws.spec.ts"
import { test, expect } from '@playwright/test';

test('conecta ao servidor e modifica mensagens do WebSocket', async ({ page }) => {
  await page.routeWebSocket('wss://example.com/ws', ws => {
    const server = ws.connectToServer();
    ws.onMessage(message => {
      if (message === 'request')
        server.send('request2');
      else
        server.send(message);
    });
  });

  await page.goto('https://example.com');
});
```

Para mais detalhes, veja [WebSocketRoute](./mock.md#mock-de-websockets).

## Exemplo completo

Um fluxo típico de suíte usando HAR: grava uma vez com `update: true`, versiona o HAR, e depois roda o teste estável contra o replay.

```ts title="tests/checkout.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('checkout com API mockada via HAR', () => {
  test('exibe produtos gravados no HAR', async ({ page }) => {
    // Replay determinístico a partir do HAR.
    await page.routeFromHAR('./hars/checkout.har', {
      url: '*/**/api/products',
      update: false,
    });

    await page.goto('https://demo.playwright.dev/checkout');
    await expect(page.getByText('Playwright')).toBeVisible();
  });
});
```

## Boas práticas

- Grave o HAR uma vez em ambiente controlado e versione o arquivo (incluindo o `.txt` com hash) no repositório.
- Use `update: true` apenas na fase de gravação; nos testes de CI use `update: false`.
- Combine HAR com `page.route` para casos específicos que precisam de respostas dinâmicas.
- Nunca versione segredos que porventura apareçam no HAR; limpe cookies/senhas antes de commitar.

## Armadilhas comuns

- O replay de HAR é estrito em URL, método e (para POST) payload — pequenas divergências fazem a requisição cair fora do HAR.
- Esquecer de definir a rota HAR antes de `goto` faz a primeira requisição bater na rede real.
- `route.fulfill` e `routeWebSocket` não devem ser chamados mais de uma vez por requisição.
