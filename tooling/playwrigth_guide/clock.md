---
id: clock
title: "Clock — controle de tempo nos testes (TypeScript)"
---

## Introdução

Simular com precisão o comportamento dependente de tempo é essencial para validar a correção de aplicações. A funcionalidade [Clock] permite manipular e controlar o tempo dentro dos testes, viabilizando a validação de recursos como tempo de renderização, timeouts e tarefas agendadas sem os atrasos e a variabilidade da execução em tempo real.

A API [Clock] fornece os seguintes métodos para controlar o tempo:

- `setFixedTime`: define um tempo fixo para `Date.now()` e `new Date()`.
- `install`: inicializa o clock e permite:
  - `pauseAt`: pausa o tempo em um momento específico.
  - `fastForward`: avança rapidamente o tempo.
  - `runFor`: executa o tempo por uma duração específica.
  - `resume`: retoma o tempo.
- `setSystemTime`: define o horário atual do sistema.

A abordagem recomendada é usar `setFixedTime` para fixar o tempo em um valor específico. Se isso não atender ao seu caso, use `install`, que permite pausar, avançar e "ticking" do tempo depois. `setSystemTime` é recomendado apenas para casos avançados.

:::note
[`property: Page.clock`] sobrescreve as classes e funções globais nativas relacionadas ao tempo, permitindo controlá-las manualmente:
- `Date`
- `setTimeout`
- `clearTimeout`
- `setInterval`
- `clearInterval`
- `requestAnimationFrame`
- `cancelAnimationFrame`
- `requestIdleCallback`
- `cancelIdleCallback`
- `performance`
- `Event.timeStamp`
:::

:::warning
Se você chamar `install` em qualquer ponto do teste, a chamada **DEVE** ocorrer antes de quaisquer outras chamadas relacionadas ao clock (veja a lista acima). Chamá-las fora de ordem resulta em comportamento indefinido. Por exemplo, você não pode chamar `setInterval`, seguido de `install`, e depois `clearInterval`, pois `install` sobrescreve a definição nativa das funções de clock.
:::

## Testar com tempo predefinido

Muitas vezes você só precisa falsificar `Date.now` mantendo os timers em andamento — o tempo flui naturalmente, mas `Date.now` sempre retorna um valor fixo.

```html
<div id="current-time" data-testid="current-time"></div>
<script>
  const renderTime = () => {
    document.getElementById('current-time').textContent =
        new Date().toLocaleString();
  };
  setInterval(renderTime, 1000);
</script>
```

```ts
await page.clock.setFixedTime(new Date('2024-02-02T10:00:00'));
await page.goto('http://localhost:3333');
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:00:00 AM');

await page.clock.setFixedTime(new Date('2024-02-02T10:30:00'));
// Sabemos que a página tem um timer que atualiza o tempo a cada segundo.
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:30:00 AM');
```

## Tempo e timers consistentes

Às vezes seus timers dependem de `Date.now` e ficam confusos quando o valor de `Date.now` não muda ao longo do tempo. Nesse caso, instale o clock e avance rapidamente até o momento de interesse.

```ts
// Inicializa o clock com um tempo antes do tempo de teste e deixa a página
// carregar naturalmente. `Date.now` progride conforme os timers disparam.
await page.clock.install({ time: new Date('2024-02-02T08:00:00') });
await page.goto('http://localhost:3333');

// Imagine que o usuário fechou a tampa do notebook e abriu de novo às 10h:
// pausa o tempo ao atingir esse ponto.
await page.clock.pauseAt(new Date('2024-02-02T10:00:00'));

// Asserta o estado da página.
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:00:00 AM');

// Fecha a tampa de novo e abre às 10:30.
await page.clock.fastForward('30:00');
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:30:00 AM');
```

## Monitorar inatividade

Monitoramento de inatividade é um recurso comum em aplicações web que desloga usuários após um período ocioso. Testar isso é complicado porque você precisaria esperar muito tempo. Com o clock, você acelera o tempo e testa o recurso rapidamente.

```html
<div id="remaining-time" data-testid="remaining-time"></div>
<script>
  const endTime = Date.now() + 5 * 60_000;
  const renderTime = () => {
    const diffInSeconds = Math.round((endTime - Date.now()) / 1000);
    if (diffInSeconds <= 0) {
      document.getElementById('remaining-time').textContent =
        'You have been logged out due to inactivity.';
    } else {
      document.getElementById('remaining-time').textContent =
        `You will be logged out in ${diffInSeconds} seconds.`;
    }
    setTimeout(renderTime, 1000);
  };
  renderTime();
</script>
<button type="button">Interaction</button>
```

```ts
// O tempo inicial não importa para o teste, então usamos o tempo atual.
await page.clock.install();
await page.goto('http://localhost:3333');
// Interage com a página
await page.getByRole('button').click();

// Avança o tempo em 5 minutos como se o usuário não fizesse nada.
// É como fechar a tampa do notebook e abrir após 5 minutos: todos os
// timers vencidos disparam uma vez imediatamente, como no navegador real.
await page.clock.fastForward('05:00');

// Verifica que o usuário foi deslogado automaticamente.
await expect(page.getByText('You have been logged out due to inactivity.')).toBeVisible();
```

## Avançar manualmente ("tick") pelo tempo

Em casos raros, você pode querer avançar manualmente pelo tempo, disparando todos os timers e animation frames para ter controle fino sobre a passagem do tempo.

```ts
// Inicializa o clock com um tempo específico, deixa a página carregar naturalmente.
await page.clock.install({ time: new Date('2024-02-02T08:00:00') });
await page.goto('http://localhost:3333');

// Pausa o fluxo de tempo, para os timers; você agora tem controle manual.
await page.clock.pauseAt(new Date('2024-02-02T10:00:00'));
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:00:00 AM');

// Avança manualmente, disparando todos os timers no processo.
// Neste caso, o tempo é atualizado na tela 2 vezes.
await page.clock.runFor(2000);
await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:00:02 AM');
```

## Exemplo completo

```ts title="tests/clock.spec.ts"
import { test, expect } from '@playwright/test';

test('logout por inatividade após 5 minutos', async ({ page }) => {
  // Instala o clock no tempo atual; não precisamos de um valor fixo.
  await page.clock.install();

  await page.goto('http://localhost:3333');
  await page.getByRole('button', { name: 'Interaction' }).click();

  // Avança 5 minutos de uma vez.
  await page.clock.fastForward('05:00');

  await expect(
    page.getByText('You have been logged out due to inactivity.'),
  ).toBeVisible();
});

test('renderização de relógio com tempo fixo', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2024-02-02T10:00:00'));
  await page.goto('http://localhost:3333');
  await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:00:00 AM');

  await page.clock.setFixedTime(new Date('2024-02-02T10:30:00'));
  await expect(page.getByTestId('current-time')).toHaveText('2/2/2024, 10:30:00 AM');
});
```

## Armadilhas comuns

- **Ordem de `install`:** `install` deve ser chamado antes de qualquer outro método de clock (`setTimeout`, `setInterval` etc.) no teste; caso contrário, o comportamento é indefinido.
- **`fastForward` dispara timers de uma vez:** ao avançar muito tempo, todos os timers vencidos disparam imediatamente — cuidado com efeitos colaterais em cascata.
- **Hora fixa + novos timers:** com `setFixedTime`, `Date.now()` é constante; timers baseados em `Date.now()` podem não progredir como esperado. Use `install` + `pauseAt`/`runFor` nesses casos.
- **Vídeo/screenshot com tempo fixo:** evidências visuais podem não refletir a passagem real do tempo; combine com asserções de estado.

## Boas práticas

- Prefira `setFixedTime` para a maioria dos casos (mais simples e determinístico).
- Use `install` quando precisar simular pausas, avanços e ticks realistas (ex.: inatividade, animações).
- Centralize a configuração de tempo no `beforeEach` ou em fixtures para testes determinísticos.
- Combine `clock` com asserções (`expect(...).toHaveText(...)`) para validar o resultado do tempo controlado.
