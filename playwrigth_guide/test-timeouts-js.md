---
id: test-timeouts
title: "Timeouts (tempos limite)"
---

Playwright Test possui múltiplos timeouts configuráveis para diversas tarefas.

| Timeout | Default | Descrição |
| :-- | :-- | :-- |
| Test timeout | `30_000` ms | Timeout de cada teste<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na config</span><br/><code>{`{ timeout: 60_000 }`}</code><br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Sobrescrito no teste</span><br/>`test.setTimeout(120_000)` |
| Expect timeout | `5_000` ms | Timeout de cada assertion<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na config</span><br/><code>{`{ expect: { timeout: 10_000 } }`}</code><br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Sobrescrito no teste</span><br/>`expect(locator).toBeVisible({ timeout: 10_000 })` |

## Test timeout

O Playwright Test impõe um timeout para cada teste, 30 segundos por padrão. O tempo gasto pela função de teste, pela configuração de fixtures e pelos hooks `beforeEach` está incluído no test timeout.

Um teste que estoura o tempo produz o seguinte erro:

```txt
example.spec.ts:3:1 › basic test ===========================

Timeout of 30000ms exceeded.
```

Um timeout adicional separado, do mesmo valor, é compartilhado entre os teardowns de fixtures e os hooks `afterEach`, após a função de teste ter terminado.

O mesmo valor de timeout também se aplica aos hooks `beforeAll` e `afterAll`, mas eles não compartilham tempo com nenhum teste.

### Quando usar

- Aumente o test timeout global quando seus testes legítimos demoram mais que 30s (ex.: fluxos de ponta a ponta longos).
- Use `test.slow()` para triplicar o timeout de um teste especificamente lento.
- Use `test.setTimeout()` para um valor customizado preciso.
- Use `testInfo.setTimeout()` dentro de hooks para estender o tempo disponível para setup/teardown.

### Armadilhas comuns

- O test timeout inclui `beforeEach` e setup de fixtures — se o setup é lento, aumente o timeout corretamente.
- Um teste que depende de condições de rede instáveis deve usar assertions com retry (`expect`) em vez de aumentar o test timeout para esconder flakiness.
- `test.setTimeout()` dentro do teste só afeta aquele teste; para hooks use `testInfo.setTimeout`.
- Aumentar o test timeout para mascarar um teste lento esconde um problema real de performance/estabilidade; trate a causa raiz.

### Definindo o test timeout na config

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 120_000,
});
```

### Definindo o timeout para um único teste

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('slow test', async ({ page }) => {
  test.slow(); // forma fácil de triplicar o timeout padrão
  // ...
});

test('very slow test', async ({ page }) => {
  test.setTimeout(120_000);
  // ...
});
```

### Alterando o timeout a partir de um hook `beforeEach`

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  // Estende o timeout de todos os testes que rodam este hook em 30 segundos.
  testInfo.setTimeout(testInfo.timeout + 30_000);
});
```

### Alterando o timeout para hooks `beforeAll`/`afterAll`

`beforeAll` e `afterAll` têm um timeout separado, por padrão igual ao test timeout. Você pode alterá-lo separadamente para cada hook chamando `testInfo.setTimeout` dentro do hook.

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test.beforeAll(async () => {
  // Define o timeout para este hook.
  test.setTimeout(60000);
});
```

## Expect timeout

Assertions com auto-retry, como `expect(locator).toHaveText`, têm um timeout separado, 5 segundos por padrão. O assertion timeout é independente do test timeout. Ele produz o seguinte erro:

```txt
example.spec.ts:3:1 › basic test ===========================

Error: expect(received).toHaveText(expected)

Expected string: "my text"
Received string: ""
Call log:
  - expect.toHaveText with timeout 5000ms
  - waiting for "locator('button')"
```

### Definindo o expect timeout na config

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
});
```

### Especificando o expect timeout para uma única assertion

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('example', async ({ page }) => {
  await expect(page.getByText('hello')).toHaveText('hello', { timeout: 10_000 });
});
```

## Global timeout

O Playwright Test suporta um timeout para toda a execução dos testes. Isso evita uso excessivo de recursos quando tudo deu errado. Não há global timeout padrão, mas você pode definir um razoável na config, por exemplo uma hora. O global timeout produz o seguinte erro:

```txt
Running 1000 tests using 10 workers

  514 skipped
  486 passed
  Timed out waiting 3600s for the entire test run
```

Você pode definir o global timeout na config.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalTimeout: 3_600_000,
});
```

## Avançado: timeouts de baixo nível

Estes são os timeouts de baixo nível pré-configurados pelo runner; você normalmente não precisa alterá-los. Se você chegou a esta seção porque seus testes estão flaky, é muito provável que a solução esteja em outro lugar.

| Timeout | Default | Descrição |
| :-- | :-- | :-- |
| Action timeout | sem timeout | Timeout de cada ação<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na config</span><br/><code>{`{ use: { actionTimeout: 10_000 } }`}</code><br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Sobrescrito no teste</span><br/>`locator.click({ timeout: 10_000 })` |
| Navigation timeout | sem timeout | Timeout de cada navegação<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na config</span><br/><code>{`{ use: { navigationTimeout: 30_000 } }`}</code><br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Sobrescrito no teste</span><br/>`page.goto('/', { timeout: 30_000 })` |
| Global timeout | sem timeout | Timeout global de toda a execução<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na config</span><br/>`{ globalTimeout: 3_600_000 }`<br/> |
| `beforeAll`/`afterAll` timeout | `30_000` ms | Timeout do hook<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido no hook</span><br/>`test.setTimeout(60_000)`<br/> |
| Fixture timeout | sem timeout | Timeout de uma fixture individual<br/><span style={{textTransform:'uppercase',fontSize:'smaller',fontWeight:'bold',opacity:'0.7'}}>Definido na fixture</span><br/>`{ scope: 'test', timeout: 30_000 }`<br/> |

### Definindo action e navigation timeouts na config

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },
});
```

### Definindo o timeout para uma única ação

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://playwright.dev', { timeout: 30000 });
  await page.getByText('Get Started').click({ timeout: 10000 });
});
```

## Fixture timeout

Por padrão, [fixtures](./test-fixtures-js.md) compartilham o timeout com o teste. Porém, para fixtures lentas, especialmente [worker-scoped](./test-fixtures-js.md#worker-scoped-fixtures), é conveniente ter um timeout separado. Assim você mantém o test timeout pequeno e dá mais tempo à fixture lenta.

```ts title="example.spec.ts"
import { test as base, expect } from '@playwright/test';

const test = base.extend<{ slowFixture: string }>({
  slowFixture: [async ({}, use) => {
    // ... realiza uma operação lenta ...
    await use('hello');
  }, { timeout: 60_000 }]
});

test('example test', async ({ slowFixture }) => {
  // ...
});
```

## Exemplo completo

Abaixo uma configuração realista que combina vários timeouts, adequada para uma suíte de ponta a ponta em CI:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // timeout global de cada teste
  timeout: 60_000,
  // timeout de toda a execução (ex.: 2 horas)
  globalTimeout: 7_200_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
});
```

E um teste que demonstra o ajuste fino por teste e por assertion:

```ts title="tests/checkout.spec.ts"
import { test, expect } from '@playwright/test';

test('checkout ponta a ponta', async ({ page }) => {
  // aumenta só este teste para 3 minutos
  test.setTimeout(180_000);

  await page.goto('/checkout');

  // espera até 15s por um elemento que aparece após processamento lento
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15_000 });
});
```

## Boas práticas

- Mantenha o `timeout` global em um valor que reflita testes de ponta a ponta reais; não o use para mascarar flakiness.
- Prefira assertions com auto-retry (`expect(...).toBeVisible()`) a `waitFor`-manual com `setTimeout`.
- Use `test.slow()` para testes pontualmente lentos em vez de aumentar o timeout global.
- Configure `globalTimeout` no CI para impedir que uma falha em cascata consuma todo o runner.
- Para fixtures lentas (ex.: seed de banco), defina `timeout` na própria fixture em vez de inflar o test timeout.
- Mantenha timeouts curtos localmente (padrão) e mais generosos no CI via variáveis de ambiente, para descobrir lentidões cedo.
