---
id: mock-browser-apis
title: "Mock de APIs do navegador"
---

## Introdução

O Playwright fornece suporte nativo para a maioria dos recursos do navegador. No entanto, existem algumas APIs experimentais e APIs que ainda não são totalmente suportadas por todos os navegadores. O Playwright geralmente não oferece APIs de automação dedicadas nesses casos. Você pode usar mocks para testar o comportamento da sua aplicação nessas situações. Este guia traz alguns exemplos práticos.

Vamos considerar uma aplicação Web que usa a [battery API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery) para exibir o status da bateria do dispositivo. Vamos mockar a battery API e verificar se a página exibe corretamente o status da bateria.

Todos os exemplos usam TypeScript com `@playwright/test`.

### Quando usar

- APIs do navegador sem suporte nativo de automação no Playwright (ex.: Battery Status API).
- APIs somente-leitura que precisam ser forçadas para um valor específico.
- Verificação de que a página chama as APIs esperadas na ordem correta.
- Simulação de eventos (ex.: mudança de nível de bateria) disparados pela aplicação.

## Criando mocks

Como a página pode chamar a API bem cedo durante o carregamento, é importante configurar todos os mocks **antes** da página iniciar o carregamento. A forma mais fácil de conseguir isso é usar [`Page.addInitScript`](./mock-browser-apis.md#criando-mocks):

```ts title="tests/battery.spec.ts"
import { test, expect } from '@playwright/test';

test('configura mock de bateria via addInitScript', async ({ page }) => {
  await page.addInitScript(() => {
    const mockBattery = {
      level: 0.75,
      charging: true,
      chargingTime: 1800,
      dischargingTime: Infinity,
      addEventListener: () => { }
    };
    // Sobrescreve o método para sempre retornar as informações mockadas.
    window.navigator.getBattery = async () => mockBattery;
  });

  await page.goto('/');
});
```

Uma vez feito isso, você pode navegar pela página e verificar o estado da sua UI:

```ts title="tests/battery.spec.ts"
import { test, expect } from '@playwright/test';

// Configura a mock API antes de cada teste.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const mockBattery = {
      level: 0.90,
      charging: true,
      chargingTime: 1800, // segundos
      dischargingTime: Infinity,
      addEventListener: () => { }
    };
    // Sobrescreve o método para sempre retornar as informações mockadas.
    window.navigator.getBattery = async () => mockBattery;
  });
});

test('exibe o status da bateria', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.battery-percentage')).toHaveText('90%');
  await expect(page.locator('.battery-status')).toHaveText('Adapter');
  await expect(page.locator('.battery-fully')).toHaveText('00:30');
});
```

### Boas práticas

- Use `addInitScript` (e não `page.evaluate`) quando precisar que o mock esteja ativo antes de qualquer script da página rodar.
- Centralize a configuração do mock no `beforeEach` para evitar repetição.
- Prefira tipar o objeto mock com `as unknown as` quando necessário para satisfazer o TypeScript.

## Mockando APIs somente-leitura

Algumas APIs são somente-leitura, então você não conseguirá atribuir a uma propriedade do `navigator`. Por exemplo:

```ts title="tests/readonly.spec.ts"
import { test, expect } from '@playwright/test';

test('propriedade somente-leitura não pode ser atribuída', async ({ page }) => {
  // A linha a seguir não terá efeito.
  await page.addInitScript(() => {
    // @ts-expect-error - propriedade somente-leitura
    navigator.cookieEnabled = true;
  });
});
```

Contudo, se a propriedade for [configurable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#configurable), você ainda pode sobrescrevê-la usando JavaScript puro:

```ts title="tests/readonly.spec.ts"
import { test, expect } from '@playwright/test';

test('força cookieEnabled como false via defineProperty', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'cookieEnabled', { value: false });
  });

  await page.goto('/');
});
```

## Verificando chamadas de API

Às vezes é útil verificar se a página fez todas as chamadas de API esperadas. Você pode registrar todas as invocações de métodos da API e então compará-las com um resultado dourado (golden). [`Page.exposeFunction`](./mock-browser-apis.md#verificando-chamadas-de-api) pode ser útil para passar mensagens da página de volta para o código do teste:

```ts title="tests/battery.spec.ts"
import { test, expect } from '@playwright/test';

test('registra as chamadas de bateria', async ({ page }) => {
  const log: string[] = [];
  // Expõe função para enviar mensagens ao script Node.js.
  await page.exposeFunction('logCall', (msg: string) => log.push(msg));
  await page.addInitScript(() => {
    const mockBattery = {
      level: 0.75,
      charging: true,
      chargingTime: 1800,
      dischargingTime: Infinity,
      // Registra as chamadas de addEventListener.
      addEventListener: (name: string, cb: () => void) => (window as any).logCall(`addEventListener:${name}`)
    };
    // Sobrescreve o método para sempre retornar as informações mockadas.
    window.navigator.getBattery = async () => {
      (window as any).logCall('getBattery');
      return mockBattery as any;
    };
  });

  await page.goto('/');
  await expect(page.locator('.battery-percentage')).toHaveText('75%');

  // Compara as chamadas reais com o golden.
  expect(log).toEqual([
    'getBattery',
    'addEventListener:chargingchange',
    'addEventListener:levelchange'
  ]);
});
```

## Atualizando o mock

Para testar que a aplicação reflete corretamente as atualizações de status da bateria, é importante garantir que o objeto mock de bateria dispare os mesmos eventos que a implementação do navegador dispararia. O teste a seguir demonstra como conseguir isso:

```ts title="tests/battery.spec.ts"
import { test, expect } from '@playwright/test';

test('atualiza o status da bateria (sem golden)', async ({ page }) => {
  await page.addInitScript(() => {
    // Classe mock que notificará os listeners correspondentes quando o status mudar.
    class BatteryMock {
      level = 0.10;
      charging = false;
      chargingTime = 1800;
      dischargingTime = Infinity;
      _chargingListeners: Array<() => void> = [];
      _levelListeners: Array<() => void> = [];
      addEventListener(eventName: string, listener: () => void) {
        if (eventName === 'chargingchange')
          this._chargingListeners.push(listener);
        if (eventName === 'levelchange')
          this._levelListeners.push(listener);
      }
      // Será chamado pelo teste.
      _setLevel(value: number) {
        this.level = value;
        this._levelListeners.forEach(cb => cb());
      }
      _setCharging(value: boolean) {
        this.charging = value;
        this._chargingListeners.forEach(cb => cb());
      }
    }
    const mockBattery = new BatteryMock();
    // Sobrescreve o método para sempre retornar as informações mockadas.
    window.navigator.getBattery = async () => mockBattery as any;
    // Salva o objeto mock no window para acesso mais fácil.
    (window as any).mockBattery = mockBattery;
  });

  await page.goto('/');
  await expect(page.locator('.battery-percentage')).toHaveText('10%');

  // Atualiza o nível para 27.5%
  await page.evaluate(() => (window as any).mockBattery._setLevel(0.275));
  await expect(page.locator('.battery-percentage')).toHaveText('27.5%');
  await expect(page.locator('.battery-status')).toHaveText('Battery');

  // Emula o adaptador conectado
  await page.evaluate(() => (window as any).mockBattery._setCharging(true));
  await expect(page.locator('.battery-status')).toHaveText('Adapter');
  await expect(page.locator('.battery-fully')).toHaveText('00:30');
});
```

### Armadilhas comuns

- `page.exposeFunction` deve ser chamado antes de `addInitScript`/`goto`, caso contrário a função não existirá no momento em que o script de inicialização rodar.
- Lidar com `window` em TypeScript exige casts (`as any`) para propriedades não tipadas como `getBattery` ou `mockBattery`; mantenha esses casts restritos ao script de mock.
- Eventos mockados precisam chamar os listeners exatamente como a API real faria, senão a UI não reagirá às mudanças.

## Exemplo completo

Um teste que combina mock inicial, captura de chamadas (golden) e atualização de estado em tempo de execução:

```ts title="tests/battery-full.spec.ts"
import { test, expect } from '@playwright/test';

test('bateria: golden de chamadas + atualização de nível', async ({ page }) => {
  const log: string[] = [];
  await page.exposeFunction('logCall', (msg: string) => log.push(msg));

  await page.addInitScript(() => {
    class BatteryMock {
      level = 0.5;
      charging = true;
      chargingTime = 1800;
      dischargingTime = Infinity;
      _listeners: Record<string, Array<() => void>> = {};
      addEventListener(name: string, cb: () => void) {
        (this._listeners[name] ??= []).push(cb);
      }
      _emit(name: string) { (this._listeners[name] ?? []).forEach(cb => cb()); }
      _setLevel(v: number) { this.level = v; this._emit('levelchange'); }
    }
    const b = new BatteryMock();
    window.navigator.getBattery = async () => {
      (window as any).logCall('getBattery');
      return b as any;
    };
    (window as any).mockBattery = b;
  });

  await page.goto('/');
  await expect(page.locator('.battery-percentage')).toHaveText('50%');

  await page.evaluate(() => (window as any).mockBattery._setLevel(0.8));
  await expect(page.locator('.battery-percentage')).toHaveText('80%');

  expect(log).toContain('getBattery');
});
```

## Boas práticas

- Centralize mocks de APIs do navegador em um `beforeEach` para reuso.
- Use uma classe mock (em vez de objeto estático) quando precisar disparar eventos dinamicamente.
- Mantenha os casts `as any` confinados ao `addInitScript` para não poluir o restante do teste.
- Prefira `exposeFunction` + golden de chamadas para validar a ordem exata das invocações de API.
