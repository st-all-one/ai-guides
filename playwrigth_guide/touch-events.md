---
id: touch-events
title: "Eventos de toque legados (TypeScript)"
---

## Introdução

Aplicações web que tratam [touch events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) legados para responder a gestos como swipe, pinch e tap podem ser testadas despachando manualmente [TouchEvent](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/TouchEvent)s para a página. Os exemplos abaixo usam `Locator.dispatchEvent` e passam pontos [Touch](https://developer.mozilla.org/en-US/docs/Web/API/Touch) como argumentos.

> **Importante:** `Locator.dispatchEvent` **não** define a propriedade [`Event.isTrusted`](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted). Se a sua página depende dela, desative a verificação de `isTrusted` durante o teste.

### Quando usar

- Testar mapas, galerias e gestos customizados baseados em `touchstart`/`touchmove`/`touchend`.
- Validar zoom (pinch) e deslocamento (pan) em dispositivos móveis emulados.
- Cenários em que a API de toque real do Playwright não cobre o gesto desejado.

> **Nota:** sempre emule um dispositivo com toque habilitado (`devices['Pixel 7']` ou `hasTouch: true`) para que os eventos de toque sejam processados.

## Emulando um gesto de pan (deslocamento)

No exemplo abaixo, emulamos um gesto de pan que deve mover o mapa. A aplicação sob teste usa apenas as coordenadas `clientX/clientY` do ponto de toque, então inicializamos apenas isso. Em um cenário mais complexo, defina também `pageX/pageY/screenX/screenY` se a aplicação precisar deles.

```ts
import { test, expect, devices, type Locator } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

async function pan(locator: Locator, deltaX?: number, deltaY?: number, steps?: number) {
  const { centerX, centerY } = await locator.evaluate((target: HTMLElement) => {
    const bounds = target.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    return { centerX, centerY };
  });

  // Fornecemos apenas clientX e clientY pois a app só usa esses valores.
  const touches = [{
    identifier: 0,
    clientX: centerX,
    clientY: centerY,
  }];
  await locator.dispatchEvent('touchstart',
      { touches, changedTouches: touches, targetTouches: touches });

  steps = steps ?? 5;
  deltaX = deltaX ?? 0;
  deltaY = deltaY ?? 0;
  for (let i = 1; i <= steps; i++) {
    const touches = [{
      identifier: 0,
      clientX: centerX + deltaX * i / steps,
      clientY: centerY + deltaY * i / steps,
    }];
    await locator.dispatchEvent('touchmove',
        { touches, changedTouches: touches, targetTouches: touches });
  }

  await locator.dispatchEvent('touchend');
}

test(`gesto de pan para mover o mapa`, async ({ page }) => {
  await page.goto('https://www.google.com/maps/place/@37.4117722,-122.0713234,15z',
      { waitUntil: 'commit' });
  await page.getByRole('button', { name: 'Keep using web' }).click();
  await expect(page.getByRole('button', { name: 'Keep using web' })).not.toBeVisible();
  // Obtém o elemento do mapa.
  const met = page.locator('[data-test-id="met"]');
  for (let i = 0; i < 5; i++)
    await pan(met, 200, 100);
  // Garante que o mapa foi movido.
  await expect(met).toHaveScreenshot();
});
```

## Emulando um gesto de pinch (beliscar)

Abaixo emulamos um gesto de pinch — dois pontos de toque se aproximando — que deve dar zoom out no mapa. A aplicação usa apenas `clientX/clientY`.

```ts
import { test, expect, devices, type Locator } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

async function pinch(locator: Locator,
  arg: { deltaX?: number, deltaY?: number, steps?: number, direction?: 'in' | 'out' }) {
  const { centerX, centerY } = await locator.evaluate((target: HTMLElement) => {
    const bounds = target.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    return { centerX, centerY };
  });

  const deltaX = arg.deltaX ?? 50;
  const steps = arg.steps ?? 5;
  const stepDeltaX = deltaX / (steps + 1);

  // Dois pontos de toque igualmente distantes do centro do elemento.
  const touches = [
    {
      identifier: 0,
      clientX: centerX - (arg.direction === 'in' ? deltaX : stepDeltaX),
      clientY: centerY,
    },
    {
      identifier: 1,
      clientX: centerX + (arg.direction === 'in' ? deltaX : stepDeltaX),
      clientY: centerY,
    },
  ];
  await locator.dispatchEvent('touchstart',
      { touches, changedTouches: touches, targetTouches: touches });

  // Move os pontos de toque em direção um ao outro ou se afastando.
  for (let i = 1; i <= steps; i++) {
    const offset = (arg.direction === 'in' ? (deltaX - i * stepDeltaX) : (stepDeltaX * (i + 1)));
    const touches = [
      {
        identifier: 0,
        clientX: centerX - offset,
        clientY: centerY,
      },
      {
        identifier: 0,
        clientX: centerX + offset,
        clientY: centerY,
      },
    ];
    await locator.dispatchEvent('touchmove',
        { touches, changedTouches: touches, targetTouches: touches });
  }

  await locator.dispatchEvent('touchend', { touches: [], changedTouches: [], targetTouches: [] });
}

test(`gesto de pinch in para dar zoom out no mapa`, async ({ page }) => {
  await page.goto('https://www.google.com/maps/place/@37.4117722,-122.0713234,15z',
      { waitUntil: 'commit' });
  await page.getByRole('button', { name: 'Keep using web' }).click();
  await expect(page.getByRole('button', { name: 'Keep using web' })).not.toBeVisible();
  // Obtém o elemento do mapa.
  const met = page.locator('[data-test-id="met"]');
  for (let i = 0; i < 5; i++)
    await pinch(met, { deltaX: 40, direction: 'in' });
  // Garante que o mapa recebeu zoom out.
  await expect(met).toHaveScreenshot();
});
```

## Armadilhas comuns

- **Falta de dispositivo com toque:** sem `hasTouch: true` (ou `...devices['Pixel 7']`), os eventos de toque podem não ser processados pela página.
- **`Event.isTrusted` é `false`:** `dispatchEvent` não produz eventos confiáveis; código que checa `isTrusted` ignorará o gesto. Ajuste a aplicação ou o teste para esse cenário.
- **Coordenadas incompletas:** se a aplicação lê `pageX/pageY/screenX/screenY` e você só passa `clientX/clientY`, o gesto pode falhar silenciosamente.
- **`identifier` inconsistente:** cada ponto de toque precisa de um `identifier` estável entre `touchstart`, `touchmove` e `touchend`.
- **Falta de `touchend`:** nunca esqueça de disparar `touchend` (com listas vazias em pinch) para finalizar o gesto.

## Boas práticas

- Centralize a lógica de gestos em funções auxiliares reutilizáveis (como `pan` e `pinch`) para manter os testes legíveis.
- Use `test.use({ ...devices['Pixel 7'] })` no topo do arquivo para garantir toque habilitado em todos os testes.
- Combine os gestos com asserções visuais (`toHaveScreenshot`) ou estado da UI para validar o resultado.
- Para gestos de toque modernos (Pointer Events), prefira as ações nativas de `Locator.tap` e `Locator.dragTo` quando possível, reservando `dispatchEvent` para touch events legados.
