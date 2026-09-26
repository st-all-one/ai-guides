---
id: accessibility-testing
title: "Testes de acessibilidade"
---

## Introdução

O Playwright pode ser usado para testar sua aplicação em relação a muitos tipos de problemas de acessibilidade. Testes automatizados de acessibilidade são uma camada complementar (não substituta) da verificação manual.

Exemplos de problemas que podem ser capturados automaticamente:

- Texto difícil de ler para usuários com deficiência visual devido a baixo contraste de cor com o fundo
- Controles de UI e elementos de formulário sem *labels* que um leitor de tela consiga identificar
- Elementos interativos com IDs duplicados que confundem tecnologias assistivas

Os exemplos a seguir dependem do pacote [`@axe-core/playwright`](https://npmjs.org/@axe-core/playwright), que adiciona suporte para executar o motor de testes de acessibilidade [axe](https://www.deque.com/axe/) como parte dos seus testes Playwright.

:::note[Disclaimer]
Testes automatizados de acessibilidade detectam alguns problemas comuns, como propriedades ausentes ou inválidas. Porém, muitos problemas de acessibilidade só podem ser descobertos por testes manuais. Recomendamos o uso combinado de testes automatizados, avaliações manuais de acessibilidade e testes inclusivos com usuários reais.

Para avaliações manuais, recomendamos o [Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/?referrer=playwright-accessibility-testing-js), uma ferramenta gratuita e open source que guia você pela avaliação de um site em relação à cobertura [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa).
:::

## Quando usar

- **CI como rede de segurança:** rode scannings de acessibilidade em cada PR para evitar regressões de contraste, labels ausentes e IDs duplicados.
- **Componentes reutilizados:** valide botões, inputs e menus que entram em muitas telas.
- **Auditoria WCAG:** foque em regras marcadas como `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` quando o objetivo for conformidade normativa.
- **Não use como única fonte de verdade:** axe não consegue validar usabilidade real, fluxo por teclado ou leitura por leitor de tela. Combine com testes manuais.

## Exemplo de testes de acessibilidade

Testes de acessibilidade funcionam como qualquer outro teste Playwright. Você pode criar casos de teste dedicados ou integrar scannings e asserções nas suítes existentes.

### Escaneando uma página inteira

Este exemplo demonstra como testar uma página inteira quanto a violações de acessibilidade detectáveis automaticamente. O teste:

1. Importa o pacote `@axe-core/playwright`
2. Usa a sintaxe normal do Playwright Test para definir o caso de teste
3. Usa a sintaxe normal do Playwright para navegar até a página sob teste
4. Aguarda `AxeBuilder.analyze()` executar o scanning de acessibilidade contra a página
5. Usa [assertions](./test-assertions-js.md) normais do Playwright Test para verificar que não há violações nos resultados

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; // 1

test.describe('homepage', () => { // 2
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('https://your-site.com/'); // 3

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze(); // 4

    expect(accessibilityScanResults.violations).toEqual([]); // 5
  });
});
```

### Configurando o axe para escanear uma parte específica da página

O `@axe-core/playwright` suporta muitas opções de configuração do axe. Você especifica essas opções usando o padrão *Builder* com a classe `AxeBuilder`.

Por exemplo, você pode usar [`AxeBuilder.include()`](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md#axebuilderincludeselector-string--string) para restringir um scanning de acessibilidade a apenas uma parte específica da página.

`AxeBuilder.analyze()` escaneia a página *no seu estado atual* quando você o chama. Para escanear partes da página que são reveladas por interações de UI, use [Locators](./locators.md) para interagir com a página antes de invocar `analyze()`:

```ts
test('navigation menu should not have automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('https://your-site.com/');

  await page.getByRole('button', { name: 'Navigation Menu' }).click();

  // É importante waitFor() a página no estado desejado *antes* de rodar analyze().
  // Caso contrário, o axe pode não encontrar todos os elementos que o teste espera escanear.
  await page.locator('#navigation-menu-flyout').waitFor();

  const accessibilityScanResults = await new AxeBuilder({ page })
      .include('#navigation-menu-flyout')
      .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

### Escaneando por violações WCAG

Por padrão, o axe verifica uma grande variedade de regras de acessibilidade. Algumas dessas regras correspondem a critérios de sucesso específicos das [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/TR/WCAG21/), e outras são regras de "boas práticas" que não são especificamente exigidas por nenhum critério WCAG.

Você pode restringir um scanning de acessibilidade para rodar apenas as regras que estão marcadas como correspondentes a critérios de sucesso WCAG específicos usando [`AxeBuilder.withTags()`](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md#axebuilderwithtagstags-stringarray). Por exemplo, os [Automated Checks do Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/getstarted/fastpass/?referrer=playwright-accessibility-testing-js) incluem apenas regras do axe que testam violações de critérios WCAG A e AA; para replicar esse comportamento, você usaria as tags `wcag2a`, `wcag2aa`, `wcag21a` e `wcag21aa`.

Note que testes automatizados não detectam todos os tipos de violações WCAG.

```ts
test('should not have any automatically detectable WCAG A or AA violations', async ({ page }) => {
  await page.goto('https://your-site.com/');

  const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

Você encontra a lista completa de tags de regras suportadas pelo axe-core na [seção "Axe-core Tags" da documentação da API axe](https://www.deque.com/axe/core-documentation/api-documentation/#axecore-tags).

## Tratando problemas conhecidos

Uma dúvida comum ao adicionar testes de acessibilidade a uma aplicação é "como eu suprimo violações conhecidas?". Os exemplos a seguir demonstram algumas técnicas.

### Excluindo elementos individuais de um scanning

Se sua aplicação contém alguns elementos específicos com problemas conhecidos, você pode usar [`AxeBuilder.exclude()`](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md#axebuilderexcludeselector-string--string) para excluí-los de ser escaneados até que consiga corrigir os problemas.

Esta costuma ser a opção mais simples, mas tem desvantagens importantes:

- `exclude()` excluirá os elementos especificados *e todos os seus descendentes*. Evite usá-lo com componentes que contêm muitos filhos.
- `exclude()` impedirá que *todas* as regras rodem contra os elementos especificados, não apenas as regras correspondentes aos problemas conhecidos.

Exemplo de exclusão de um elemento em um teste específico:

```ts
test('should not have any accessibility violations outside of elements with known issues', async ({
  page,
}) => {
  await page.goto('https://your-site.com/page-with-known-issues');

  const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('#element-with-known-issue')
      .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

Se o elemento em questão é usado repetidamente em muitas páginas, considere [usar um test fixture](#usando-um-test-fixture-para-configuracao-comum-do-axe) para reutilizar a mesma configuração de `AxeBuilder` em múltiplos testes.

### Desabilitando regras individuais de scanning

Se sua aplicação contém muitas violações pré-existentes de uma regra específica, você pode usar [`AxeBuilder.disableRules()`](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md#axebuilderdisablerulesrules-stringarray) para desabilitar temporariamente regras individuais até conseguir corrigir os problemas.

Você encontra os IDs de regra para passar a `disableRules()` na propriedade `id` das violações que quer suprimir. Uma [lista completa de regras do axe](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md) pode ser encontrada na documentação do `axe-core`.

```ts
test('should not have any accessibility violations outside of rules with known issues', async ({
  page,
}) => {
  await page.goto('https://your-site.com/page-with-known-issues');

  const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['duplicate-id'])
      .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

### Usando snapshots para permitir problemas conhecidos específicos

Se você quiser permitir um conjunto mais granular de problemas conhecidos, pode usar [Snapshots](./test-snapshots-js.md) para verificar que um conjunto de violações pré-existentes não mudou. Esta abordagem evita as desvantagens de usar `AxeBuilder.exclude()` ao custo de um pouco mais de complexidade e fragilidade.

Não use um snapshot de todo o array `accessibilityScanResults.violations`. Ele contém detalhes de implementação dos elementos em questão, como um trecho do HTML renderizado; se você incluir isso nos snapshots, seus testes ficarão propensos a quebrar sempre que um dos componentes mudar por um motivo não relacionado:

```ts
// Não faça isso! Isso é frágil.
expect(accessibilityScanResults.violations).toMatchSnapshot();
```

Em vez disso, crie uma *fingerprint* (impressão digital) da(s) violação(ões) em questão que contém apenas informação suficiente para identificar unicamente o problema, e use um snapshot da fingerprint:

```ts
// Isso é menos frágil do que fazer snapshot de todo o array de violações.
expect(violationFingerprints(accessibilityScanResults)).toMatchSnapshot();

// meu-arquivo-de-testes.ts
import type { AxeBuilder } from '@axe-core/playwright';

function violationFingerprints(accessibilityScanResults: AxeBuilder.AnalyzeResult) {
  const violationFingerprints = accessibilityScanResults.violations.map(violation => ({
    rule: violation.id,
    // Estes são seletores CSS que identificam unicamente cada elemento com
    // uma violação da regra em questão.
    targets: violation.nodes.map(node => node.target),
  }));

  return JSON.stringify(violationFingerprints, null, 2);
}
```

## Exportando resultados de scanning como anexo de teste

A maioria dos testes de acessibilidade se preocupa primariamente com a propriedade `violations` dos resultados do axe. Porém, os resultados contêm mais do que apenas `violations`. Por exemplo, os resultados também contêm informação sobre regras que passaram e sobre elementos que o axe considerou inconclusivos para algumas regras. Essa informação pode ser útil para depurar testes que não estão detectando todas as violações esperadas.

Para incluir *todos* os resultados do scanning como parte dos resultados do teste para fins de depuração, você pode adicionar os resultados como um anexo de teste com [`testInfo.attach()`](./test-reporters-js.md). [Reporters](./test-reporters-js.md) então podem embutir ou linkar os resultados completos como parte da saída do teste.

```ts
test('example with attachment', async ({ page }, testInfo) => {
  await page.goto('https://your-site.com/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(accessibilityScanResults, null, 2),
    contentType: 'application/json'
  });

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Usando um test fixture para configuração comum do axe

[Test fixtures](./test-fixtures-js.md) são uma boa forma de compartilhar uma configuração comum de `AxeBuilder` entre muitos testes. Alguns cenários onde isso é útil incluem:

- Usar um conjunto comum de regras em todos os seus testes
- Suprimir uma violação conhecida em um elemento comum que aparece em muitas páginas diferentes
- Anexar relatórios de acessibilidade standalone de forma consistente para muitos scannings

### Criando um fixture

Este exemplo de fixture cria um objeto `AxeBuilder` pré-configurado com as configurações compartilhadas `withTags()` e `exclude()`.

```ts title="axe-test.ts"
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

// Estende o test base fornecendo "makeAxeBuilder"
//
// Este novo "test" pode ser usado em múltiplos arquivos de teste, e cada um
// receberá uma instância de AxeBuilder configurada de forma consistente.
export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () => new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#commonly-reused-element-with-known-issue');

    await use(makeAxeBuilder);
  }
});
export { expect } from '@playwright/test';
```

### Usando um fixture

Para usar o fixture, substitua o `new AxeBuilder({ page })` dos exemplos anteriores pelo fixture `makeAxeBuilder` recém-definido:

```ts
import { test, expect } from './axe-test';

test('example using custom fixture', async ({ page, makeAxeBuilder }) => {
  await page.goto('https://your-site.com/');

  const accessibilityScanResults = await makeAxeBuilder()
      // Usa automaticamente a configuração compartilhada do AxeBuilder,
      // mas também suporta configuração adicional específica do teste
      .include('#specific-element-under-test')
      .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Armadilhas comuns

- **Rodar `analyze()` antes da UI estabilizar:** sempre aguarde (`waitFor`, asserções de visibilidade) o estado da página antes de chamar `analyze()`, senão elementos dinâmicos podem não estar presentes no scanning.
- **Excluir elementos grandes:** `exclude()` remove o elemento *e todos os descendentes* de todas as regras. Prefira `disableRules()` quando o problema for de uma regra específica.
- **Snapshot frágil do array inteiro de violações:** nunca faça `toMatchSnapshot()` em `violations` cru; use uma fingerprint.
- **Achar que 100% automatizado é suficiente:** axe cobre apenas uma fração das WCAG. Mantenha avaliações manuais.

## Boas práticas

- Execute scannings de acessibilidade no CI a cada PR, não só localmente.
- Centralize a configuração do axe em um fixture (tags WCAG, exclusões comuns) para consistência.
- Use `withTags` para mirar exatamente os critérios WCAG exigidos pelo negócio.
- Anexe os resultados completos do scanning via `testInfo.attach()` para facilitar a depuração de falsos positivos/negativos.
- Combine `include()`/`exclude()` para isolar a área sob teste e reduzir ruído.
```
```
