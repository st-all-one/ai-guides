---
id: test-webserver
title: "Web server (servidor web)"
---

## Introdução

O Playwright traz a opção `webServer` no arquivo de configuração, que lhe dá a capacidade de subir um servidor de desenvolvimento local antes de rodar seus testes. Isso é ideal para quando você está escrevendo testes durante o desenvolvimento e não tem uma URL de staging ou produção para testar.

### Quando usar

- Você desenvolve testes localmente e precisa de um servidor da aplicação rodando (frontend, API, etc.).
- Seu pipeline de CI ainda não sobe a aplicação como um serviço separado e você prefere que o próprio runner a inicie.
- Você quer evitar apontar os testes para uma URL externa instável durante o desenvolvimento.

### Armadilhas comuns

- `reuseExistingServer: !process.env.CI` é a configuração recomendada: localmente reaproveita um servidor já aberto (evita subir outro), mas no CI obriga a subir um novo para não usar um processo órfão.
- Definir `url` errada (ou porta errada) faz o runner esperar até o `timeout` e falhar com "Timed out waiting for ... to be available".
- `stdout: 'ignore'` esconde logs do servidor; em caso de falha de boot, use `stdout: 'pipe'` para diagnosticar.
- O `webServer` não espera o servidor estar "pronto" por lógica de negócio, apenas que a `url` responda 2xx/3xx/4xx aceitáveis — combine com `wait` se precisar de uma mensagem específica de prontidão.
- No Windows, `gracefulShutdown` com `SIGTERM`/`SIGINT` é ignorado; o encerramento será `SIGKILL`.

## Configurando um web server

Use a propriedade `webServer` na sua config do Playwright para subir um servidor de desenvolvimento web durante os testes.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Roda seu servidor de dev local antes de iniciar os testes
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

| Propriedade | Descrição |
| :- | :- |
| `command`| Comando de shell para iniciar o servidor de dev local da sua aplicação. |
| `cwd` | Diretório de trabalho do processo spawnado, default para o diretório do arquivo de configuração. |
| `env` | Variáveis de ambiente para o comando. Default herda `process.env` com `PLAYWRIGHT_TEST=1` adicionado. |
| `gracefulShutdown` | Como encerrar o processo. Se não especificado, o grupo de processos recebe `SIGKILL` forçado. Se definido como `{ signal: 'SIGTERM', timeout: 500 }`, envia `SIGTERM`, seguido de `SIGKILL` se não sair em 500ms (também aceita `SIGINT`; `0` significa não enviar `SIGKILL`). Windows ignora esta opção. |
| `ignoreHTTPSErrors` | Se ignora erros HTTPS ao buscar a `url`. Default `false`. |
| `name` | Nome customizado para o web server, prefixado nas mensagens de log. Default `[WebServer]`. |
| `port` | **Deprecado**. Use `url`. Porta esperada. Ou `port` ou `url` deve ser especificado. |
| `reuseExistingServer`| Se `true`, reutiliza um servidor existente na `url` quando disponível; se nenhum estiver rodando, roda o comando. Se `false`, lança erro se já houver processo na `url`. Geralmente `!process.env.CI`. |
| `stderr` | Se faz pipe do stderr do comando para o processo (`pipe`) ou ignora (`ignore`). Default `"pipe"`. |
| `stdout` | Se `"pipe"`, faz pipe do stdout; se `"ignore"`, ignora. Default `"ignore"`. |
| `timeout` | Tempo de espera para o processo subir e ficar disponível em ms. Default `60000`. |
| `url`| URL do servidor que deve retornar 2xx, 3xx, 400, 401, 402 ou 403 quando pronto. Ou `port` ou `url` deve ser especificado. |
| `wait` | Considera o comando iniciado apenas quando dada saída foi produzida. Objeto com `stdout`/`stderr` regex opcionais. Grupos de captura nomeados vão para o ambiente, ex.: `/(?<my_server_port>\d+)/` armazena em `process.env['MY_SERVER_PORT']`. |

## Adicionando um timeout ao servidor

Web servers às vezes demoram mais para subir. Neste caso, você pode aumentar o timeout para esperar o servidor iniciar.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Resto da sua config...

  // Roda seu servidor de dev local antes de iniciar os testes
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Adicionando um baseURL

Também é recomendado especificar o `baseURL` na seção `use: {}` da config, para que os testes possam usar URLs relativas e você não precise especificar a URL completa repetidas vezes.

Ao usar `page.goto`, `page.route`, `page.waitForURL`, `page.waitForRequest` ou `page.waitForResponse`, o Playwright considera a `baseURL` usando o construtor `URL()` para montar a URL correspondente. Por exemplo, definindo `baseURL` como `http://localhost:3000` e navegando para `/login`, o Playwright rodará o teste usando `http://localhost:3000/login`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Resto da sua config...

  // Roda seu servidor de dev local antes de iniciar os testes
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

Agora você pode usar um caminho relativo ao navegar na página:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // Isso navegará para http://localhost:3000/login
  await page.goto('./login');
});
```

## Múltiplos web servers

Múltiplos web servers (ou processos em background) podem ser iniciados simultaneamente fornecendo um array de configurações de `webServer`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: [
    {
      command: 'npm run start',
      url: 'http://localhost:3000',
      name: 'Frontend',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run backend',
      url: 'http://localhost:3333',
      name: 'Backend',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

## Exemplo completo

Abaixo uma configuração executável completa que sobe a aplicação, define `baseURL`, ajusta timeout e ainda conecta um projeto de setup que aguarda a aplicação estar pronta:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Servidor de dev da aplicação
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

```ts title="tests/home.spec.ts"
import { test, expect } from '@playwright/test';

test('a home responde', async ({ page }) => {
  // graças ao baseURL, basta usar o caminho relativo
  await page.goto('/');
  await expect(page).toHaveTitle(/Meu App/);
});
```

Se o servidor sinaliza prontidão com uma linha de log específica (em vez de apenas responder na `url`), use `wait`:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    wait: {
      stdout: /Listening on port (\d+)/,
      timeout: 60 * 1000,
    },
  },
});
```

## Boas práticas

- Sempre use `reuseExistingServer: !process.env.CI`: localmente reaproveita o servidor aberto; no CI garante um servidor limpo.
- Defina `baseURL` na seção `use` e use caminhos relativos nos testes (`page.goto('/login')`).
- Aumente `timeout` se o build/dev da aplicação for lento no CI (default é 60s).
- Use `stdout: 'pipe'` temporariamente quando o servidor não subir, para ver a mensagem de erro real.
- Para aplicações que sinalizam prontidão por log, prefira `wait` a confiar apenas no status HTTP da `url`.
- Em containers, garanta que a `url` use `localhost`/`127.0.0.1` e não `0.0.0.0`, senão o Playwright pode não detectar o servidor.
