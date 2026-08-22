---
id: test-reporters
title: "Reporters (relatórios)"
---

## Introdução

O Playwright Test vem com alguns reporters embutidos para diferentes necessidades e com a possibilidade de criar reporters customizados. A forma mais fácil de experimentar os reporters embutidos é passar a [opção de linha de comando](./test-cli-js.md) `--reporter`.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'},
  ]
}>

<TabItem value="npm">

```bash
npx playwright test --reporter=line
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --reporter=line
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --reporter=line
```

</TabItem>

</Tabs>

Para mais controle, você pode especificar reporters programaticamente no [arquivo de configuração](./test-configuration-js.md).

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'line',
});
```

### Múltiplos reporters

Você pode usar múltiplos reporters ao mesmo tempo. Por exemplo, você pode usar `'list'` para uma saída agradável no terminal e `'json'` para obter um arquivo JSON abrangente com os resultados dos testes.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
});
```

### Reporters no CI

Você pode usar reporters diferentes localmente e no CI. Por exemplo, usar o conciso `'dot'` evita saída excessiva. Este é o padrão no CI.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 'dot' conciso no CI, 'list' padrão rodando localmente
  reporter: process.env.CI ? 'dot' : 'list',
});
```

## Reporters embutidos

Todos os reporters embutidos mostram informações detalhadas sobre falhas e diferem principalmente na verbosidade de execuções bem-sucedidas.

### List reporter

O List reporter é o padrão (exceto no CI, onde o `dot` é o padrão). Ele imprime uma linha para cada teste executado.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'list',
});
```

Aqui está um exemplo de saída no meio de uma execução. Falhas serão listadas ao final por padrão.

```bash
npx playwright test --reporter=list
Running 124 tests using 6 workers

 1  ✓ should access error in env (438ms)
 2  ✓ handle long test names (515ms)
 3  x 1) render expected (691ms)
 4  ✓ should timeout (932ms)
 5    should repeat each:
 6  ✓ should respect enclosing .gitignore (569ms)
 7    should teardown env after timeout:
 8    should respect excluded tests:
 9  ✓ should handle env beforeEach error (638ms)
10    should respect enclosing .gitignore:
```

Você pode optar por renderizar os passos via a seguinte opção de config:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list', { printSteps: true }]],
});
```

Você pode imprimir falhas inline assim que ficam disponíveis, em vez de esperar até o final:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list', { printFailuresInline: true }]],
});
```

Você pode omitir as tags de teste que são automaticamente anexadas aos títulos:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list', { omitTags: true }]],
});
```

O List report suporta as seguintes opções de configuração e variáveis de ambiente:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_LIST_PRINT_STEPS` | `printSteps` | Se imprime cada passo em sua própria linha. | `false` |
| `PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE` | `printFailuresInline` | Se imprime detalhes da falha imediatamente após um teste falhar, em vez de ao final. | `false` |
| `PLAYWRIGHT_LIST_OMIT_TAGS` | `omitTags` | Se omite tags de teste automaticamente anexadas aos títulos. | `false` |
| `PLAYWRIGHT_FORCE_TTY` | | Se produz saída adequada para terminal interativo. | `true` em TTY, `false` caso contrário. |
| `FORCE_COLOR` | | Se produz saída colorida. | `true` em TTY, `false` caso contrário. |
| `NO_COLOR` | | Se desabilita saída colorida. | indefinido |

### Line reporter

O Line reporter é mais conciso que o list reporter. Usa uma única linha para reportar o último teste finalizado e imprime falhas quando ocorrem. É útil para suítes grandes onde mostra o progresso mas não polui a saída listando todos os testes.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'line',
});
```

Aqui está um exemplo de saída no meio de uma execução. Falhas são reportadas inline.

```bash
npx playwright test --reporter=line
Running 124 tests using 6 workers
  1) dot-reporter.spec.ts:20:1 › render expected ===================================================

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 0

[23/124] gitignore.spec.ts - should respect nested .gitignore
```

O Line report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_LINE_OMIT_TAGS` | `omitTags` | Se omite tags de teste. | `false` |
| `PLAYWRIGHT_FORCE_TTY` | | Saída para TTY. | `true` em TTY. |
| `FORCE_COLOR` | | Saída colorida. | `true` em TTY. |
| `NO_COLOR` | | Desabilita cores. | indefinido |

### Dot reporter

O Dot reporter é muito conciso — produz um único caractere por teste bem-sucedido. É o padrão no CI e útil quando você não quer muita saída.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'dot',
});
```

Aqui está um exemplo de saída. Falhas são listadas ao final.

```bash
npx playwright test --reporter=dot
Running 124 tests using 6 workers
······F·············································
```

Um caractere é exibido para cada teste executado, indicando seu status:

| Caractere | Descrição |
| --- | --- |
| `·` | Passou |
| `F` | Falhou |
| `×` | Falhou ou estourou o tempo — e será repetido |
| `±` | Passou na repetição (flaky) |
| `T` | Estourou o tempo |
| `°` | Pulado |

O Dot report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_DOT_OMIT_TAGS` | `omitTags` | Se omite tags de teste. | `false` |
| `PLAYWRIGHT_FORCE_TTY` | | Saída para TTY. | `true` em TTY. |
| `FORCE_COLOR` | | Saída colorida. | `true` em TTY. |
| `NO_COLOR` | | Desabilita cores. | indefinido |

### HTML reporter

O HTML reporter produz uma pasta auto-contida que contém o relatório da execução e pode ser servida como página web.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'},
  ]
}>

<TabItem value="npm">

```bash
npx playwright test --reporter=html
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --reporter=html
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --reporter=html
```

</TabItem>

</Tabs>

Por padrão, o HTML report é aberto automaticamente se algum teste falhar. Você controla esse comportamento via a propriedade `open` na config ou a variável `PLAYWRIGHT_HTML_OPEN`. Os valores possíveis são `always`, `never` e `on-failure` (padrão).

Você também pode configurar `host` e `port` usados para servir o relatório.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { open: 'never' }]],
});
```

Por padrão, o relatório é escrito na pasta `playwright-report`. Você pode sobrescrever esse local usando a variável `PLAYWRIGHT_HTML_OUTPUT_DIR` ou a config do reporter.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { outputFolder: 'my-report' }]],
});
```

Se você faz upload de anexos de uma pasta de dados para outro local, use `attachmentsBaseURL` para informar ao HTML report onde buscá-los.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { attachmentsBaseURL: 'https://external-storage.com/' }]],
});
```

Uma forma rápida de abrir o relatório da última execução:

```bash
npx playwright show-report
```

Ou se houver uma pasta customizada:

```bash
npx playwright show-report my-report
```

Você também pode passar um arquivo `.zip` — por exemplo baixado de um artifact de CI. O arquivo deve conter `index.html` no topo. O Playwright extrai para um diretório temporário e serve o relatório:

```bash
npx playwright show-report playwright-report.zip
```

O HTML report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_HTML_TITLE` | `title` | Título exibido no relatório. | sem título |
| `PLAYWRIGHT_HTML_OUTPUT_DIR` | `outputFolder` | Diretório de saída. | `playwright-report` |
| `PLAYWRIGHT_HTML_OPEN` | `open` | Quando abrir no browser: `always`, `never`, `on-failure`. | `on-failure` |
| `PLAYWRIGHT_HTML_HOST` | `host` | Host para servir o relatório. | `localhost` |
| `PLAYWRIGHT_HTML_PORT` | `port` | Porta para servir o relatório. | `9323` ou disponível |
| `PLAYWRIGHT_HTML_ATTACHMENTS_BASE_URL` | `attachmentsBaseURL` | Local de anexos da subpasta `data`. | `data/` |
| `PLAYWRIGHT_HTML_NO_COPY_PROMPT` | `noCopyPrompt` | Desabilita prompt de cópia de erros. | `false` |
| `PLAYWRIGHT_HTML_NO_SNIPPETS` | `noSnippets` | Desabilita snippets de código no log. | `false` |
| `PLAYWRIGHT_HTML_DO_NOT_INLINE_ASSETS` | `doNotInlineAssets` | Escreve JS/CSS como arquivos separados (útil para CSP rígido). | `false` |
| `PLAYWRIGHT_HTML_MERGE_FILES` | `mergeFiles` | Agrupa testes pelo `test.describe()` em vez do arquivo. | `false` |

### Blob reporter

Relatórios blob contêm todos os detalhes sobre a execução e podem ser usados depois para produzir qualquer outro relatório. Sua função principal é facilitar a mesclagem de relatórios de [testes fragmentados (sharding)](./test-sharding-js.md).

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'},
  ]
}>

<TabItem value="npm">

```bash
npx playwright test --reporter=blob
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --reporter=blob
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --reporter=blob
```

</TabItem>

</Tabs>

Por padrão, o relatório é escrito no diretório `blob-report`. O nome do arquivo é `report-<hash>.zip` ou `report-<hash>-<shard_number>.zip` quando há [sharding](./test-sharding-js.md).

<Tabs
  groupId="blob-report"
  defaultValue="shards"
  values={[
    {label: 'Shards', value: 'shards'},
    {label: 'Environments', value: 'environments'},
  ]
}>

<TabItem value="shards">

Ao usar blob report para mesclar múltiplos shards, você não precisa passar nenhuma opção.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'blob',
});
```

</TabItem>

<TabItem value="environments">

Ao rodar testes em diferentes ambientes, você pode usar `tag` para adicionar uma tag global correspondente ao ambiente. Essa tag traz clareza ao relatório mesclado e é usada para gerar um nome único de blob report.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'blob',
  tag: process.env.CI_ENVIRONMENT_NAME,  // por exemplo "@APIv2" ou "@linux"
});
```

</TabItem>

</Tabs>

O Blob report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_BLOB_OUTPUT_DIR` | `outputDir` | Diretório de saída. | `blob-report` |
| `PLAYWRIGHT_BLOB_OUTPUT_NAME` | `fileName` | Nome do arquivo. | `report-<project>-<hash>-<shard_number>.zip` |
| `PLAYWRIGHT_BLOB_OUTPUT_FILE` | `outputFile` | Caminho completo. Sobrescreve `outputDir` e `fileName`. | indefinido |

### JSON reporter

O JSON reporter produz um objeto com todas as informações sobre a execução.

Provavelmente você quer escrever o JSON em um arquivo. Use a variável `PLAYWRIGHT_JSON_OUTPUT_NAME`:

```bash
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json
```

Na configuração, passe as opções diretamente:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['json', { outputFile: 'results.json' }]],
});
```

O JSON report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_JSON_OUTPUT_DIR` | | Diretório de saída. | `cwd` ou diretório da config |
| `PLAYWRIGHT_JSON_OUTPUT_NAME` | `outputFile` | Nome base do arquivo. | impresso no stdout |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | `outputFile` | Caminho completo. Sobrescreve as anteriores. | impresso no stdout |

### JUnit reporter

O JUnit reporter produz um relatório XML estilo JUnit.

Use a variável `PLAYWRIGHT_JUNIT_OUTPUT_NAME`:

```bash
PLAYWRIGHT_JUNIT_OUTPUT_NAME=results.xml npx playwright test --reporter=junit
```

Na configuração:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['junit', { outputFile: 'results.xml' }]],
});
```

O JUnit report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_JUNIT_OUTPUT_DIR` | | Diretório de saída. | `cwd` ou diretório da config |
| `PLAYWRIGHT_JUNIT_OUTPUT_NAME` | `outputFile` | Nome base do arquivo. | impresso no stdout |
| `PLAYWRIGHT_JUNIT_OUTPUT_FILE` | `outputFile` | Caminho completo. | impresso no stdout |
| `PLAYWRIGHT_JUNIT_STRIP_ANSI` | `stripANSIControlSequences` | Remove sequências ANSI do texto. | texto como está |
| `PLAYWRIGHT_JUNIT_INCLUDE_PROJECT_IN_TEST_NAME` | `includeProjectInTestName` | Inclui nome do projeto no nome do teste. | não incluído |
| `PLAYWRIGHT_JUNIT_OMIT_TAGS` | `omitTags` | Omite tags de teste nos detalhes de falha. | `false` |
| `PLAYWRIGHT_JUNIT_SUITE_ID` |  | Valor do atributo `id` na raiz `<testsuites/>`. | string vazia |
| `PLAYWRIGHT_JUNIT_SUITE_NAME` |  | Valor do atributo `name` na raiz `<testsuites/>`. | string vazia |

### Chrome tracing reporter

O Chrome tracing reporter produz um arquivo JSON no [Trace Event Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview) que pode ser aberto em `chrome://tracing` ou na [Perfetto UI](https://ui.perfetto.dev). Ele renderiza a execução como uma linha do tempo com uma faixa por worker.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['chrome-trace', { outputFile: 'chrome-trace.json.gz' }]],
});
```

O Chrome tracing report suporta as seguintes opções:

| Variável de Ambiente | Opção de Config | Descrição | Padrão |
| --- | --- | --- | --- |
| `PLAYWRIGHT_CHROME_TRACE_OUTPUT_DIR` | | Diretório de saída. | `test-results` |
| `PLAYWRIGHT_CHROME_TRACE_OUTPUT_NAME` | | Nome base do arquivo. | `chrome-trace.json` |
| `PLAYWRIGHT_CHROME_TRACE_OUTPUT_FILE` | `outputFile` | Caminho completo. | indefinido |

### GitHub Actions annotations

Você pode usar o reporter embutido `github` para obter anotações automáticas de falha ao rodar no GitHub Actions.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 'github' no CI para gerar anotações, 'list' localmente
  reporter: process.env.CI ? 'github' : 'list',
});
```

O reporter `github` aceita `omitTags` (ou a variável `PLAYWRIGHT_GITHUB_OMIT_TAGS`) para suprimir tags nas anotações, por exemplo `reporter: [['github', { omitTags: true }]]`.

## Custom reporters

Você pode criar um reporter customizado implementando uma classe com alguns dos métodos de reporter. Saiba mais sobre a API em [Reporter](./test-reporter-api/).

```ts title="my-awesome-reporter.ts"
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

class MyReporter implements Reporter {
  onBegin(config: FullConfig, suite: Suite) {
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`Starting test ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished test ${test.title}: ${result.status}`);
  }

  onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);
  }
}

export default MyReporter;
```

Agora use este reporter com a opção `reporter` da config:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: './my-awesome-reporter.ts',
});
```

Ou passe o caminho do arquivo como opção `--reporter`:

```bash
npx playwright test --reporter="./myreporter/my-awesome-reporter.ts"
```

Aqui está uma lista curta de implementações open source de reporters para consulta:

* [Allure Reporter](https://github.com/allure-framework/allure-js/tree/main/packages/allure-playwright)
* [Github Actions Reporter](https://github.com/estruyf/playwright-github-actions-reporter)
* [Mail Reporter](https://github.com/estruyf/playwright-mail-reporter)
* [ReportPortal](https://github.com/reportportal/agent-js-playwright)
* [Monocart](https://github.com/cenfun/monocart-reporter)

## Exemplo completo

Configuração típica de CI que gera blob para mesclar e HTML localmente, além de anotações no GitHub Actions:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: process.env.CI
    ? [['blob'], ['github']]
    : [['html', { open: 'on-failure' }], ['list']],
});
```

## Boas práticas

- No CI use `blob` (para mesclar shards) combinado com `github` (anotações), e localmente use `html` + `list`.
- Nunca use `github` com estratégia de matrix se as falhas ficarem duplicadas e confusas.
- Use múltiplos reporters (`[['list'], ['json', ...]]`) quando precisar de saída legível e arquivo machine-readable.
- Para depurar localmente, `npx playwright show-report` abre o HTML gerado.
- Relatórios customizados devem implementar apenas os métodos necessários (`onBegin`, `onTestEnd`, `onEnd`).
- Para sharding, sempre use `blob` e mescle com `npx playwright merge-reports` antes de publicar o relatório final.
