---
id: test-components
title: "Teste de componentes"
---

## Introdução

O Playwright Test pode testar os componentes da sua aplicação web de forma isolada. Um component test é um teste Playwright end-to-end normal que roda contra uma pequena página de **galeria de stories** servida pelo seu próprio dev server. Não há runtime dedicado de component testing, nem integração com bundler, nem pacotes npm extras — a fixture embutida [`method: Fixtures.mount`] do `@playwright/test` faz tudo.

```ts
import { test, expect } from '@playwright/test';

test('click should expand', async ({ mount }) => {
  const component = await mount('components/Expandable/Stateful');
  await component.getByRole('button').click();
  await expect(component.getByTestId('expanded')).toHaveValue('true');
});
```

Os testes rodam em Node.js enquanto os componentes rodam em um navegador real: cliques reais são disparados, layout real é executado, regressão visual é possível. Ao mesmo tempo, os testes ganham tudo o que o Playwright Test oferece: paralelismo, parametrização, retries e trace pós-morte (post-mortem).

:::note
Os pacotes experimentais `@playwright/experimental-ct-react`, `-ct-react17` e `-ct-vue` foram removidos e não são mais publicados. Se você ainda os usa, fique no Playwright 1.62 até seguir o [guia de migração](#migração-dos-pacotes-experimentais) abaixo.
:::

## Por que uma abordagem agnóstica de framework

Os pacotes `@playwright/experimental-ct-*` permitiam escrever JSX inline nos testes — `mount(<Button onClick={spy} />)`. Para isso, o Playwright tinha de controlar todo o pipeline: varrer os testes em busca de componentes, compilar um bundle com sua própria cópia do Vite e sua própria config, servir a partir de seu próprio servidor e fazer marshalling de props e callbacks pela fronteira Node.js/navegador.

Esse design manteve os pacotes experimentais para sempre:

- **Só funcionava quando seu setup batia com o nosso.** Aliases de caminho, plugins e CSS precisavam ser espelhados manualmente em `ctViteConfig`. Projetos em webpack, Next.js ou pipelines customizados não podiam usar seu próprio build.
- **A fronteira Node.js/navegador vazava.** JSX escrito no teste era compilado em Node.js e remontado no navegador. Objetos vivos não cruzavam; callbacks funcionavam pela metade via marshalling; mocks de módulo silenciosamente não aplicavam.

A substituição inverte o controle:

- **Você é dono do pipeline.** Componentes são buildados e servidos pelo seu próprio dev server, com seus plugins, aliases e CSS. O Playwright não compila nem serve nada — apenas navega para uma página, como em qualquer outro teste.
- **É agnóstico de framework.** A única peça específica de framework é a gallery page — um pequeno módulo que você possui. React, Vue, Svelte, Solid ou qualquer outro: se seu dev server consegue renderizar, o Playwright consegue testar.
- **É estável.** Testes importam `test` e `expect` do `@playwright/test` puro, e [`method: Fixtures.mount`] é uma fixture embutida documentada. Não há pacote experimental nem dialeto de config separado.

## Como funciona

Três conceitos compõem todo o modelo:

- Um **story** é um pequeno componente wrapper que embute o componente sob teste em um cenário específico: props fixas, dados mock, providers, callbacks registrados. Stories vivem ao lado do componente em arquivos `*.story.tsx` (ou `.ts`/`.jsx`/`.js`/`.vue`); cada export nomeado é um story.
- A **gallery** é uma única página, servida pelo seu dev server, que expõe as funções `window.mount(params)` e `window.unmount()` renderizando um story — resolvido a partir de seus arquivos de story — em um elemento `#root`. É específica de framework e sua para possuir.
- A fixture [`method: Fixtures.mount`] navega para a gallery ([`property: TestOptions.baseURL`]), chama `window.mount()` com o story id e props, e retorna um [Locator] para a raiz da gallery. Escope suas queries a partir dele: `component.getByRole('button').click()`.

Tudo o que o componente precisa é configurado *dentro do story*, que roda no navegador. Tudo o que o teste afirma é observável *através da página*: DOM, URL, rede.

## Começando

### Passo 1: Aponte seu agente de coding para o skill

A gallery é código da aplicação — pertence a você, não ao Playwright. O jeito mais rápido de obter uma é não escrevê-la você mesmo: o Playwright disponibiliza toda essa metodologia como um agent skill. Instale os skills e peça ao seu agente de coding (Claude Code, GitHub Copilot ou similar) para fazer o setup:

```bash
npx playwright init-skills
```

```txt
Set up component testing using the playwright-component-testing skill.
```

O agente detecta seu framework e bundler, implementa a gallery para sua stack, adiciona um projeto Playwright à config e escreve o primeiro story e spec.

O contrato que a gallery cumpre é pequeno e vale conhecer, mesmo que você nunca abra o arquivo:

- É uma única página sob `playwright/gallery/`, servida pelo **seu próprio dev server** — apps Vite a servem com o dev server que já rodam; outros setups rodam um pequeno servidor Vite standalone ao lado da app.
- Ela descobre seus arquivos `*.story.*` e expõe duas funções: `window.mount({ story, props })` renderiza o story com o id dado em um elemento `#root`, e `window.unmount()` o desmonta. Um story desconhecido ou erro de render rejeita, o que aparece como o `mount()` do teste lançando erro.
- Ela reutiliza a raiz de render entre chamadas, então `component.update(props)` reconcilia em vez de remontar e o estado do componente é preservado.
- Ela importa seu CSS global da mesma forma que a entry da app, e o corpo de `window.mount` é o lugar natural para setup de toda a app — o equivalente aos antigos hooks `beforeMount`/`afterMount`.

Se preferir escrever a gallery à mão, o skill instalado contém a especificação completa com exemplos React e Vue em `references/gallery-spec.md`.

### Passo 2: Configure o Playwright

Adicione um projeto ao seu `playwright.config.ts` e aponte `baseURL` para a gallery:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'components',
      testDir: './tests/components',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173/playwright/gallery/index.html',
        serviceWorkers: 'block',
        reuseContext: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/playwright/gallery/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
```

`mount` navega para `baseURL`, então ele deve apontar para a gallery. `serviceWorkers: 'block'` evita que o service worker da app sirva respostas em cache que sombreariam seus `page.route()` mocks. `reuseContext: true` reutiliza o contexto do navegador entre testes em um worker — uma grande aceleração para suítes de componentes, e a mesma otimização que os pacotes experimentais aplicavam implicitamente.

### Passo 3: Escreva um story

Stories vivem ao lado do componente que exercitam. Cada export nomeado é um cenário:

```ts title="src/components/Button.story.tsx"
import { Button } from './Button';

export const Primary = () => <Button title='Submit' />;

export const Disabled = () => <Button title='Submit' disabled />;
```

### Passo 4: Escreva um teste

```ts title="tests/components/button.spec.ts"
import { test, expect } from '@playwright/test';

test('renders primary button', async ({ mount }) => {
  const component = await mount('components/Button/Primary');
  await expect(component.getByRole('button')).toHaveText('Submit');
});

test('disabled button is disabled', async ({ mount }) => {
  const component = await mount('components/Button/Disabled');
  await expect(component.getByRole('button')).toBeDisabled();
});
```

### Passo 5: Rode

```bash
npx playwright test --project=components
```

## Stories como metodologia

Stories não são apenas um workaround de teste — são documentação grepável e revisável dos estados do seu componente, e as convenções mantêm-nas assim:

- **Um export por cenário.** Prefira um novo export de story a parametrizar um existente. `Button.story.tsx` exportando `Primary`, `Disabled`, `WithLongTitle` lê-se como uma especificação do componente.
- **Stories vivem ao lado do componente.** `src/components/Button.story.tsx` documenta `src/components/Button.tsx`. Renomes e refactors tocam ambos juntos.
- **Story ids são derivados do caminho do arquivo**: caminho sob `src/` sem a extensão `.story.*`, mais o nome do export — `components/Button/Primary`. Qualquer sufixo único também funciona: `mount('Button/Primary')`.
- **O story é dono de tudo que o componente precisa**: providers, dados mock, estado, callbacks. O teste não é dono de nada além de interações e asserções.

Como cada story é um estado de página nomeado e endereçável, a gallery serve também como catálogo vivo: abra a URL da gallery em um navegador e renderize qualquer story para inspecioná-lo a olho.

## Padrões de teste

### Grave estado para asserções

Componentes recebem callbacks; testes querem afirmar que eles dispararam. Em vez de fazer marshalling de callbacks entre Node.js e o navegador, **o story é dono do estado e fornece os callbacks** — e grava o resultado observável em um formulário oculto ao lado do componente:

```ts title="src/components/Expandable.story.tsx"
import { useState } from 'react';
import { Expandable } from './Expandable';

export const Stateful = () => {
  const [expanded, setExpanded] = useState(false);
  return <>
    <Expandable expanded={expanded} setExpanded={setExpanded} title='Title'>Details</Expandable>
    <form hidden><input data-testid='expanded' readOnly value={String(expanded)} /></form>
  </>;
};
```

```ts title="tests/components/expandable.spec.ts"
import { test, expect } from '@playwright/test';

test('click should expand', async ({ mount }) => {
  const component = await mount('components/Expandable/Stateful');
  await component.getByRole('button').click();
  await expect(component.getByTestId('expanded')).toHaveValue('true');
});
```

Este padrão é o coração da metodologia:

- Todo o cenário roda no navegador — sem marshalling de callback, sem fronteira Node.js/navegador para vazar.
- `toHaveValue()` é uma web-first assertion: ela faz retry até o estado aterrissar, então não há o que aguardar ou sondar manualmente.
- Registre cada valor observado em seu próprio input `data-testid` — `String(...)` para escalares, `JSON.stringify(...)` para payloads. A direção negativa funciona igual: realize a operação e então afirme que o valor **não** mudou.
- O estado gravado é *visível quando você abre o story na gallery*. Clique no componente manualmente e veja os valores mudarem — o story serve também como página de teste manual para o exato cenário que o teste automatizado cobre. Mantenha o form `hidden` para um baseline de screenshot limpo, ou remova o atributo `hidden` durante o desenvolvimento para ver o estado vivo ao lado do componente.

### Props por teste

Quando um cenário beneficia de parametrização, passe props serializáveis simples como segundo argumento de `mount`. A gallery as entrega ao story como suas props:

```ts title="src/components/Button.story.tsx"
import { Button } from './Button';

export const WithTitle = ({ title = 'Default' }: { title?: string }) =>
  <Button title={title} />;
```

```ts title="tests/components/button.spec.ts"
import type { WithTitle } from '../../src/components/Button.story';

const component = await mount<typeof WithTitle>('Button/WithTitle', { title: 'Hello' });
```

`mount` é genérico sobre o story: passe o tipo do story como argumento de template e as props (e `update()`) são checadas contra a assinatura do story. Mantenha props como dados serializáveis simples — callbacks pertencem ao story.

### Transições de prop com `update()`

Para testar como um componente reage a uma mudança de prop **sem remontar** — estado preservado — chame `component.update(newProps)`. Ele re-renderiza o mesmo story com novas props na raiz existente:

```ts
const component = await mount('components/Counter/Default', { value: 1 });
await expect(component.getByTestId('value')).toHaveText('1');
await component.update({ value: 2 });
await expect(component.getByTestId('value')).toHaveText('2');
```

### Múltiplos estados e comparação visual

Cada `mount()` navega fresco, então os testes são totalmente isolados e montar vários stories em um teste é barato:

```ts
await expect(await mount('Button/Primary')).toHaveScreenshot('primary.png');
await expect(await mount('Button/Disabled')).toHaveScreenshot('disabled.png');
```

Faça screenshot do locator raiz retornado, não da página, para não afirmar sobre nada extra que você possa ter colocado na gallery.

### Tratando requisições de rede

Use [`method: Page.route`] normalmente — registre rotas antes do `mount()`, já que montar navega:

```ts
import { test, expect } from '@playwright/test';

test('renders the error state', async ({ page, mount }) => {
  await page.route('**/api/items', route => route.fulfill({ status: 500 }));
  const component = await mount('components/ItemList/Default');
  await expect(component.getByRole('alert')).toContainText('Something went wrong');
});
```

A opção `serviceWorkers: 'block'` da config evita que o service worker da app sirva respostas em cache que sombreariam as rotas. Times com biblioteca de handlers [MSW](https://mswjs.io/) podem iniciar o worker dentro de um story ou decorator.

### Debugando stories

Abra a URL da gallery em um navegador e chame `await window.mount({ story: 'components/Button/Primary' })` do console do DevTools — é exatamente o que a fixture `mount` faz. Um story desconhecido ou erro de render rejeita `window.mount`, o que aparece como o `mount()` do teste lançando com um stack real. Para navegar sem o console, dê à sua gallery uma página de índice opcional listando todos os stories descobertos.

## Migração dos pacotes experimentais

Os pacotes experimentais compilavam JSX no arquivo de teste e faziam marshalling para o navegador. O padrão de gallery move o cenário para um export de story que roda nativamente no navegador. Veja como os conceitos mapeiam:

| `@playwright/experimental-ct-*` | Story gallery |
|---|---|
| `mount(<Button onClick={spy} />)` | Story stateful: o story fornece `onClick` e grava o efeito em um input oculto; o teste afirma com `toHaveValue()` |
| Props de dados simples do teste | Inalterado no espírito: `mount(id, props)` |
| Children/slots JSX do teste | Um export de story por composição (Vue: um arquivo `.story.vue` para cenários com muitos slots) |
| `component.update(<Button count={2} />)` | `component.update({ count: 2 })` |
| `component.unmount()` | `component.unmount()` |
| Hooks `beforeMount` / `afterMount` | O corpo do `window.mount` da gallery (global), ou decorators de story (por-story) |
| `hooksConfig` por variação de teste | Props: `mount('App/Routing', { route: '/dashboard' })`, interpretadas pelo story |
| Fixture `router` / handlers MSW em Node.js | [`method: Page.route`] no teste, ou MSW `setupWorker` dentro de um story |
| `playwright/index.html` (estilos, tema) | O `index.html` da gallery e o módulo entry importam |
| `ctViteConfig`, `ctPort`, `ctTemplateDir` | Sumiram — a gallery roda pelo seu próprio dev server; a porta vive em `webServer` e `baseURL` |
| `defineConfig` do pacote ct | `defineConfig` puro do `@playwright/test` |

Um spec típico migra assim:

```ts title="Antes: button.spec.tsx"
import { test, expect } from '@playwright/experimental-ct-react';
import Button from '../src/components/Button';

test('counts clicks', async ({ mount }) => {
  let clicks = 0;
  const component = await mount(<Button title='Submit' onClick={() => ++clicks} />);
  await component.getByRole('button').click();
  expect(clicks).toBe(1);
});
```

```ts title="Depois: src/components/Button.story.tsx"
import { useState } from 'react';
import { Button } from './Button';

export const CountsClicks = () => {
  const [clicks, setClicks] = useState(0);
  return <>
    <Button title='Submit' onClick={() => setClicks(count => count + 1)} />
    <form hidden><input data-testid='click-count' readOnly value={String(clicks)} /></form>
  </>;
};
```

```ts title="Depois: tests/components/button.spec.ts"
import { test, expect } from '@playwright/test';

test('counts clicks', async ({ mount }) => {
  const component = await mount('components/Button/CountsClicks');
  await component.getByRole('button').click();
  await expect(component.getByTestId('click-count')).toHaveValue('1');
});
```

Migre incrementalmente: enquanto fixado no Playwright 1.62, configure a gallery e o projeto `components` ao lado do projeto CT antigo, porte spec a spec, depois remova a dependência `@playwright/experimental-ct-*` junto com `playwright/index.html`, `playwright/index.ts` e `playwright/.cache` e atualize.

Pontos de atenção:

- **Story ids são strings.** Renomear ou mover um story quebra specs em runtime, não em compile time. Usar `mount<typeof Story>` ao menos amarra as props ao story em tempo de compilação.
- **JSX por teste acabou.** Um teste que montava uma árvore JSX diferente por teste vira um export de story por composição — que é o ponto: toda composição que vale a pena testar vale a pena nomear e revisar.

## Perguntas frequentes

### Como acesso os métodos ou a instância do componente?

Acessar métodos internos ou a instância do componente dentro do código de teste não é recomendado nem suportado. Em vez disso, foque em observar e interagir com o componente sob a perspectiva do usuário — clique nele, olhe a página e registre efeitos internos no DOM através do story. Testes se tornam menos frágeis e mais valiosos quando evitam detalhes de implementação.

### Posso manter meus plugins de bundler, aliases e setup de CSS?

Sim — esse é o núcleo do design. A gallery é servida pelo seu próprio dev server, então tudo que sua app consegue renderizar, seus stories conseguem renderizar. Não há segunda config de bundler para manter em sincronia.

### E frameworks além de React e Vue?

Peça ao seu agente de coding para implementar o contrato da gallery para seu framework: resolver um story id em um componente, renderizá-lo em `#root`, reutilizar a raiz entre chamadas para que `update()` preserve estado. A fixture `mount` não sabe nem se importa qual framework está do outro lado.

## Quando usar

- **Componentes em isolamento:** teste um `Button`, `Modal` ou `Expandable` sem montar a aplicação inteira, ganhando velocidade e foco.
- **Regressão visual de UI:** combine `mount()` com `toHaveScreenshot()` para validar aparência de cada estado nomeado.
- **Mocks de rede por componente:** use `page.route()` antes do `mount` para simular estados de erro/sucesso de forma limpa.

## Armadilhas comuns

- **`baseURL` aponta para a app, não para a gallery:** `mount` navega para `baseURL`, que deve ser a gallery (`/playwright/gallery/index.html`).
- **Service worker da app sombreia mocks:** sempre `serviceWorkers: 'block'` no projeto de componentes.
- **Callbacks no teste:** não tente passar funções como props — use o padrão de story stateful com input `data-testid`.
- **Estado não preservado:** para testar transição de prop sem perder estado, use `component.update()`, não um novo `mount()`.

## Exemplo completo

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'components',
      testDir: './tests/components',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173/playwright/gallery/index.html',
        serviceWorkers: 'block',
        reuseContext: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/playwright/gallery/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
```

```ts title="src/components/Counter.story.tsx"
import { useState } from 'react';
import { Counter } from './Counter';

export const Default = () => {
  const [count, setCount] = useState(0);
  return <>
    <Counter count={count} onIncrement={() => setCount(c => c + 1)} />
    <form hidden><input data-testid='count' readOnly value={String(count)} /></form>
  </>;
};
```

```ts title="tests/components/counter.spec.ts"
import { test, expect } from '@playwright/test';

test('increments', async ({ mount }) => {
  const component = await mount('components/Counter/Default');
  await expect(component.getByTestId('count')).toHaveValue('0');
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByTestId('count')).toHaveValue('1');
});

test('looks right', async ({ mount }) => {
  await expect(await mount('components/Counter/Default')).toHaveScreenshot('counter.png');
});
```

## Boas práticas

- Deixe a gallery ser código seu (em `playwright/gallery/`), versionado no git.
- Um export de story por estado relevante do componente; trate-os como especificação.
- Grave estado observável em inputs `data-testid` ocultos para asserções via `toHaveValue()`.
- Use `mount<typeof Story>()` para tipagem de props em tempo de compilação.
- Use `reuseContext: true` e `serviceWorkers: 'block'` no projeto de componentes para velocidade e determinismo.
