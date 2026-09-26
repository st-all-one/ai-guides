---
id: aria-snapshots
title: "Snapshot testing com ARIA"
---

## Visão geral

Com o *Snapshot testing* do Playwright você pode validar a *accessibility tree* de uma página contra um template de snapshot predefinido.

```ts
await page.goto('https://playwright.dev/');
await expect(page).toMatchAriaSnapshot(`
  - banner:
    - heading /Playwright enables reliable end-to-end/ [level=1]
    - link "Get started":
      - /url: /docs/intro
    - link "Star microsoft/playwright on GitHub":
      - /url: https://github.com/microsoft/playwright
    - link /[\\d]+k\\+ stargazers on GitHub/
`);
```

## Quando usar

- **Testes de UI de páginas e componentes inteiros:** ótimo para capturar a estrutura acessível de uma tela.
- **Verificações estruturais amplas** de componentes complexos, onde asserções ponto-a-ponto seriam verbosas.
- **Regression testing** de saídas que raramente mudam de estrutura.
- **Não use para** conteúdo altamente dinâmico que muda com frequência ou de forma imprevisível.

## Assertion testing vs Snapshot testing

*Snapshot testing* e *assertion testing* servem a propósitos diferentes na automação de testes.

### Assertion testing

É uma abordagem direcionada onde você asserte valores ou condições específicas sobre elementos ou componentes. Por exemplo, com o Playwright, `expect(locator).toHaveText(...)` verifica que um elemento contém o texto esperado, e `expect(locator).toHaveValue(...)` confirma que um campo de input tem o valor esperado. Testes de asserção são específicos e geralmente verificam o estado atual de um elemento ou propriedade contra um estado esperado predefinido. Funcionam bem para checagens previsíveis de valor único, mas são limitados em escopo quando se testa a estrutura mais ampla ou variações.

**Vantagens**

- **Clareza:** a intenção do teste é explícita e fácil de entender.
- **Especificidade:** os testes focam em aspectos particulares da funcionalidade, tornando-os robustos contra mudanças não relacionadas.
- **Depuração:** falhas fornecem feedback direcionado, apontando diretamente para o aspecto problemático.

**Desvantagens**

- **Verboso para saídas complexas:** escrever asserções para estruturas de dados complexas ou grandes saídas pode ser trabalhoso e propenso a erros.
- **Custo de manutenção:** à medida que o código evolui, atualizar asserções manualmente pode consumir tempo.

### Snapshot testing

O *snapshot testing* captura um "snapshot" ou representação de todo o estado de um elemento, componente ou dado em um dado momento, que é salvo para comparações futuras. Ao rerodar os testes, o estado atual é comparado ao snapshot, e se houver diferenças, o teste falha. Esta abordagem é especialmente útil para estruturas complexas ou dinâmicas, onde asserir manualmente cada detalhe seria demorado demais. O *snapshot testing* é mais amplo e holístico do que o *assertion testing*, permitindo rastrear mudanças mais complexas ao longo do tempo.

**Vantagens**

- **Simplifica saídas complexas:** testar a saída renderizada de um componente de UI pode ser tedioso com asserções tradicionais. Snapshots capturam a saída inteira para fácil comparação.
- **Loop de feedback rápido:** desenvolvedores conseguem perceber facilmente mudanças não intencionais na saída.
- **Incentiva consistência:** ajuda a manter saída consistente conforme o código evolui.

**Desvantagens**

- **Confiança excessiva:** pode ser tentador aceitar mudanças em snapshots sem entendê-las completamente, potencialmente escondendo bugs.
- **Granularidade:** snapshots grandes podem ser difíceis de interpretar quando surgem diferenças, especialmente se mudanças pequenas afetam grandes porções da saída.
- **Adequação:** não é ideal para conteúdo altamente dinâmico onde saídas mudam com frequência ou de forma imprevisível.

### Quando usar

- **Snapshot testing** é ideal para:
  - Testes de UI de páginas inteiras e componentes.
  - Verificações estruturais amplas de componentes de UI complexos.
  - Testes de regressão para saídas cuja estrutura raramente muda.
- **Assertion testing** é ideal para:
  - Validação de lógica central.
  - Teste de valores computados.
  - Testes granulares que exigem condições precisas.

Combinando *snapshot testing* para checagens amplas e estruturais com *assertion testing* para funcionalidade específica, você alcança uma estratégia de testes bem equilibrada.

## Aria snapshots

No Playwright, *aria snapshots* fornecem uma representação YAML da *accessibility tree* de uma página. Esses snapshots podem ser armazenados e comparados depois para verificar se a estrutura da página permanece consistente ou atende às expectativas definidas.

O formato YAML descreve a estrutura hierárquica dos elementos acessíveis na página, detalhando **roles**, **atributos**, **valores** e **texto**. A estrutura segue uma sintaxe em formato de árvore, onde cada nó representa um elemento acessível, e a indentação indica elementos aninhados.

Cada elemento acessível na árvore é representado como um nó YAML:

```yaml
- role "name" [attribute=value]
```

- **role**: especifica a role ARIA ou HTML do elemento (ex.: `heading`, `list`, `listitem`, `button`).
- **"name"**: nome acessível do elemento. Strings entre aspas indicam valores exatos; `/patterns/` são usados para expressão regular.
- **[attribute=value]**: atributos e valores, entre colchetes, representam atributos ARIA específicos, como `checked`, `disabled`, `expanded`, `invalid`, `level`, `pressed` ou `selected`.

Esses valores são derivados de atributos ARIA ou calculados com base na semântica HTML. Para inspecionar a estrutura da *accessibility tree* de uma página, use a [Chrome DevTools Accessibility Tab](https://developer.chrome.com/docs/devtools/accessibility/reference#tab).

## Snapshot matching

O método de asserção [`PageAssertions.toMatchAriaSnapshot`] do Playwright compara a estrutura acessível da página com um template de *aria snapshot* predefinido, ajudando a validar o estado da página contra requisitos de teste. Você também pode usar [`LocatorAssertions.toMatchAriaSnapshot`] para validar uma parte específica da página.

Para o seguinte DOM:

```html
<h1>title</h1>
```

Você pode validá-lo usando o seguinte template de snapshot:

```ts
await expect(page).toMatchAriaSnapshot(`
  - heading "title"
`);
```

Ao validar, o template de snapshot é comparado com a *accessibility tree* atual da página:

- Se a estrutura da árvore corresponder ao template, o teste passa; caso contrário, falha, indicando uma divergência entre os estados acessíveis esperado e atual.
- A comparação é *case-sensitive* e colapsa espaços em branco, então indentação e quebras de linha são ignoradas.
- A comparação é sensível à ordem, ou seja, a ordem dos elementos no template deve corresponder à ordem na *accessibility tree* da página.

### Partial matching

Você pode fazer correspondências parciais em nós omitindo atributos ou nomes acessíveis, permitindo verificar partes específicas da *accessibility tree* sem exigir correspondências exatas. Essa flexibilidade é útil para atributos dinâmicos ou irrelevantes.

```html
<button>Submit</button>
```

```yaml title="aria snapshot"
- button
```

Neste exemplo, a role `button` é correspondida, mas o nome acessível ("Submit") não é especificado, permitindo que o teste passe independentemente do rótulo do botão.

<hr/>

Para elementos com atributos ARIA como `checked` ou `disabled`, omitir esses atributos permite correspondência parcial, focando apenas em role e hierarquia.

```html
<input type="checkbox" checked>
```

```yaml title="aria snapshot (partial match)"
- checkbox
```

Nesta correspondência parcial, o atributo `checked` é ignorado, então o teste passará independentemente do estado do checkbox.

<hr/>

Similarmente, você pode corresponder parcialmente filhos em listas ou grupos omitindo itens específicos ou elementos aninhados.

```html
<ul>
  <li>Feature A</li>
  <li>Feature B</li>
  <li>Feature C</li>
</ul>
```

```yaml title="aria snapshot (partial match)"
- list
  - listitem: Feature B
```

Correspondências parciais permitem criar testes de snapshot flexíveis que verificam a estrutura essencial da página sem impor conteúdo ou atributos específicos.

### Strict matching

Por padrão, um template contendo o subconjunto de filhos será correspondido:

```html
<ul>
  <li>Feature A</li>
  <li>Feature B</li>
  <li>Feature C</li>
</ul>
```

```yaml title="aria snapshot (partial match)"
- list
  - listitem: Feature B
```

A propriedade `/children` pode ser usada para controlar como os elementos filhos são correspondidos:

- `contain` (padrão): corresponde se todos os filhos especificados estiverem presentes na ordem
- `equal`: corresponde se os filhos corresponderem exatamente à lista especificada na ordem
- `deep-equal`: corresponde se os filhos corresponderem exatamente à lista especificada na ordem, incluindo filhos aninhados

```html
<ul>
  <li>Feature A</li>
  <li>Feature B</li>
  <li>Feature C</li>
</ul>
```

O snapshot a seguir falhará devido ao Feature C não estar no template:

```yaml title="aria snapshot"
- list
  - /children: equal
  - listitem: Feature A
  - listitem: Feature B
```

#### Definindo o modo `children` globalmente

Em vez de adicionar uma propriedade `/children` a cada snapshot, você pode definir o modo padrão de correspondência de filhos para todas as chamadas `toMatchAriaSnapshot` no arquivo de configuração:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toMatchAriaSnapshot: {
      children: 'equal',
    },
  },
});
```

Snapshots individuais ainda podem sobrescrever a configuração global incluindo uma propriedade `/children` explícita no template.

### Correspondência com expressões regulares

Expressões regulares permitem correspondência flexível para elementos com texto dinâmico ou variável. Nomes acessíveis e texto suportam padrões de regex.

```html
<h1>Issues 12</h1>
```

```yaml title="aria snapshot"
- heading /Issues \d+/
```

## Gerando snapshots

Criar *aria snapshots* no Playwright ajuda a garantir e manter a estrutura da sua aplicação. Você pode gerar snapshots de várias formas dependendo do seu setup e fluxo de trabalho.

### Gerando snapshots com o Playwright code generator

Se você usa o [Code Generator](./codegen.md) do Playwright, gerar *aria snapshots* é simplificado pela interface interativa:

- **Ação "Assert snapshot":** no code generator, você pode usar a ação "Assert snapshot" para criar automaticamente uma asserção de snapshot para os elementos selecionados. É uma forma rápida de capturar o *aria snapshot* como parte do fluxo de teste gravado.
- **Aba "Aria snapshot":** a aba "Aria snapshot" dentro da interface do code generator representa visualmente o *aria snapshot* para um locator selecionado, permitindo explorar, inspecionar e verificar roles, atributos e nomes acessíveis para auxiliar a criação e revisão de snapshots.

### Atualizando snapshots com `@playwright/test` e a flag `--update-snapshots`

Quando você usa o Playwright test runner (`@playwright/test`), pode atualizar snapshots automaticamente com a flag `--update-snapshots`, ou `-u` para abreviar.

Rodar testes com a flag `--update-snapshots` atualizará snapshots que não corresponderam. Snapshots que corresponderem não serão atualizados.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --update-snapshots
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --update-snapshots
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --update-snapshots
```

</TabItem>
</Tabs>

Atualizar snapshots é útil quando mudanças na estrutura da aplicação exigem novos snapshots como baseline. Note que o Playwright aguardará o timeout máximo de `expect` especificado na configuração do test runner para garantir que a página estabilizou antes de tirar o snapshot. Pode ser necessário ajustar o `--timeout` se o teste atingir o timeout ao gerar snapshots.

#### Template vazio para geração de snapshot

Passar uma string vazia como template em uma asserção gera um snapshot on-the-fly:

```ts
await expect(locator).toMatchAriaSnapshot('');
```

Note que o Playwright aguardará o timeout máximo de `expect` especificado na configuração do test runner para garantir que a página estabilizou antes de tirar o snapshot. Pode ser necessário ajustar o `--timeout` se o teste atingir o timeout ao gerar snapshots.

#### Arquivos de patch de snapshot

Ao atualizar snapshots, o Playwright cria arquivos de patch que capturam diferenças. Esses arquivos de patch podem ser revisados, aplicados e commitados no controle de versão, permitindo que times rastreiem mudanças estruturais ao longo do tempo e garantam que as atualizações sejam consistentes com os requisitos da aplicação.

A forma como o código fonte é atualizado pode ser alterada usando a flag `--update-source-method`. Há várias opções disponíveis:

- **"patch"** (padrão): gera um arquivo de diff unificado que pode ser aplicado ao código fonte usando `git apply`.
- **"3way":** gera marcadores de conflito de merge no seu código fonte, permitindo que você escolha se aceita as mudanças.
- **"overwrite":** sobrescreve o código fonte com os novos valores de snapshot.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --update-snapshots --update-source-method=3way
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --update-snapshots --update-source-method=3way
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --update-snapshots --update-source-method=3way
```

</TabItem>
</Tabs>

#### Snapshots como arquivos separados

Para armazenar seus snapshots em um arquivo separado, use o método `toMatchAriaSnapshot` com a opção `name`, especificando uma extensão `.aria.yml`.

```ts
await expect(page.getByRole('main')).toMatchAriaSnapshot({ name: 'main.aria.yml' });
```

Por padrão, snapshots de um arquivo de teste `example.spec.ts` são colocados no diretório `example.spec.ts-snapshots`. Como snapshots devem ser iguais entre browsers, apenas um snapshot é salvo mesmo ao testar com múltiplos browsers. Se desejar, você pode customizar o [snapshot path template](./test-configuration-js.md) usando a seguinte configuração:

```ts
export default defineConfig({
  expect: {
    toMatchAriaSnapshot: {
      pathTemplate: '__snapshots__/{testFilePath}/{arg}{ext}',
    },
  },
});
```

### Usando [`Page.ariaSnapshot`] e [`Locator.ariaSnapshot`]

Os métodos [`Page.ariaSnapshot`] e [`Locator.ariaSnapshot`] permitem criar programaticamente uma representação YAML dos elementos acessíveis dentro do escopo de um locator, especialmente útil para gerar snapshots dinamicamente durante a execução do teste.

**Exemplo**:

```ts
const snapshot = await page.ariaSnapshot();
console.log(snapshot);
```

Este comando emite o *aria snapshot* dentro do escopo do locator especificado em formato YAML, que você pode validar ou armazenar conforme necessário.

## Exemplos de accessibility tree

### Headings com atributo level

Headings podem incluir um atributo `level` indicando seu nível de heading.

```html
<h1>Title</h1>
<h2>Subtitle</h2>
```

```yaml title="aria snapshot"
- heading "Title" [level=1]
- heading "Subtitle" [level=2]
```

### Text nodes

Elementos de texto autônomos ou descritivos aparecem como *text nodes*.

```html
<div>Sample accessible name</div>
```

```yaml title="aria snapshot"
- text: Sample accessible name
```

### Texto inline multilinha

Texto multilinha, como parágrafos, é normalizado no *aria snapshot*.

```html
<p>Line 1<br>Line 2</p>
```

```yaml title="aria snapshot"
- paragraph: Line 1 Line 2
```

### Links

Links exibem seu texto ou conteúdo composto de pseudo-elementos. O destino do link pode ser correspondido usando a propriedade `/url`.

```html
<a href="#more-info">Read more about Accessibility</a>
```

```yaml title="aria snapshot"
- link "Read more about Accessibility":
    - /url: "#more-info"
```

O valor de `/url` também pode ser uma expressão regular:

```html
<a href="https://www.youtube.com/channel/UC46Zj8pDH5tDosqm1gd7WTg">YouTube channel</a>
```

```yaml title="aria snapshot"
- link:
  - /url: /https://www.youtube.com/channel/.*/
```

### Text boxes

Elementos `input` do tipo `text` mostram o conteúdo do atributo `value`.

```html
<input type="text" value="Enter your name">
```

```yaml title="aria snapshot"
- textbox: Enter your name
```

### Listas com itens

Listas ordenadas e não ordenadas incluem seus itens.

```html
<ul aria-label="Main Features">
  <li>Feature 1</li>
  <li>Feature 2</li>
</ul>
```

```yaml title="aria snapshot"
- list "Main Features":
  - listitem: Feature 1
  - listitem: Feature 2
```

### Elementos agrupados

Grupos capturam elementos aninhados, como elementos `<details>` com conteúdo de summary.

```html
<details>
  <summary>Summary</summary>
  <p>Detail content here</p>
</details>
```

```yaml title="aria snapshot"
- group: Summary
```

### Atributos e estados

Atributos ARIA comuns, como `checked`, `disabled`, `expanded`, `invalid`, `level`, `pressed`, e `selected`, representam estados de controle.

#### Checkbox com atributo `checked`

```html
<input type="checkbox" checked>
```

```yaml title="aria snapshot"
- checkbox [checked]
```

#### Button com atributo `pressed`

```html
<button aria-pressed="true">Toggle</button>
```

```yaml title="aria snapshot"
- button "Toggle" [pressed=true]
```

#### Input com atributo `aria-invalid`

O valor de `aria-invalid` é exposto diretamente. Um valor `true` renderiza como `[invalid]`, enquanto `grammar` e `spelling` renderizam como `[invalid=grammar]` e `[invalid=spelling]`. Um valor `false` é omitido.

```html
<input type="text" aria-label="Email" aria-invalid="true" value="not-an-email">
```

```yaml title="aria snapshot"
- textbox "Email" [invalid]: not-an-email
```

```html
<input type="text" aria-label="Bio" aria-invalid="spelling">
```

```yaml title="aria snapshot"
- textbox "Bio" [invalid=spelling]
```

## Exemplo completo

O exemplo abaixo grava um snapshot da região `main` e o usa como baseline, além de validar asserções pontuais combinadas:

```ts
import { test, expect } from '@playwright/test';

test('a estrutura acessível da home está estável', async ({ page }) => {
  await page.goto('https://your-site.com/');

  // Snapshot estrutural amplo da região principal
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - heading "Bem-vindo" [level=1]
    - link "Começar":
      - /url: /docs/intro
    - list "Recursos":
      - listitem: Rápido
      - listitem: Confiável
  `);

  // Asserção pontual combinada para reforçar contrato crítico
  await expect(page.getByRole('link', { name: 'Começar' })).toBeVisible();
});
```

## Armadilhas comuns

- **Conteúdo dinâmico quebra snapshots:** texto com timestamps, contadores ou IDs gera falso negativo. Use regex (`/Issues \d+/`) ou partial matching omitindo o nó.
- **Ordem sensível:** inverter a ordem dos itens no template faz o teste falhar mesmo que o conteúdo exista.
- **`children` padrão `contain` esconde remoções:** se um item for removido, o snapshot `contain` ainda passa. Use `children: equal` ou `deep-equal` quando a presença exata importar.
- **Achar que snapshot substitui assertion:** para contratos críticos (visibilidade de CTA, valor de input), mantenha asserções diretas.

## Boas práticas

- Combine *snapshot testing* (estrutura) com *assertion testing* (contratos pontuais) para cobertura equilibrada.
- Use `pathTemplate` para centralizar snapshots em `__snapshots__/` e revisá-los no code review.
- Prefira partial matching e regex para regiões com conteúdo variável, evitando snapshots frágeis.
- Defina `toMatchAriaSnapshot.children: 'equal'` globalmente quando a estrutura exata for um requisito.
- Atualize snapshots com `--update-snapshots` apenas após revisar as diferenças (use `--update-source-method=3way` para inspeção).
