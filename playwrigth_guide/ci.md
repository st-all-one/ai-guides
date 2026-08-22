---
id: ci
title: "Continuous Integration"
---

## Introdução

Testes do Playwright podem ser executados em ambientes de CI. Criamos configurações de exemplo para provedores de CI comuns.

3 passos para rodar seus testes em CI:

1. **Garanta que o agente de CI consegue rodar navegadores**: use nossa [imagem Docker](./docker.md) em agentes Linux ou instale suas dependências usando a [CLI](./browsers#instalar-dependências-do-sistema).
2. **Instale o Playwright**:
   <Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
   <TabItem value="npm">

   ```bash
   # Instala pacotes NPM
   npm ci

   # Instala navegadores e dependências do Playwright
   npx playwright install --with-deps
   ```

   </TabItem>
   <TabItem value="yarn">

   ```bash
   # Instala pacotes
   yarn install --frozen-lockfile

   # Instala navegadores e dependências do Playwright
   yarn playwright install --with-deps
   ```

   </TabItem>
   <TabItem value="pnpm">

   ```bash
   # Instala pacotes
   pnpm install --frozen-lockfile

   # Instala navegadores e dependências do Playwright
   pnpm playwright install --with-deps
   ```

   </TabItem>
   </Tabs>
3. **Rode seus testes**:
   ```bash
   npx playwright test
   ```

## Workers

Recomendamos definir [workers](./test-configuration#test-config-workers) como `1` em ambientes de CI para priorizar estabilidade e reprodutibilidade. Rodar testes sequencialmente garante que cada teste tenha todos os recursos do sistema, evitando conflitos. Porém, se você tiver um sistema de CI self-hosted potente, pode habilitar testes [paralelos](./test-parallel.md). Para paralelização mais ampla, considere [sharding](./test-parallel.md#shard-tests-between-multiple-machines) — distribuir testes entre múltiplos jobs de CI.

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Desativa testes paralelos em CI.
  workers: process.env.CI ? 1 : undefined,
});
```

## Configurações de CI

A [Command line tools](./browsers#instalar-dependências-do-sistema) pode ser usada para instalar todas as dependências de SO em CI.

### GitHub Actions

#### Em push/pull_request

Testes rodam em push ou pull request nos branches main/master. O [workflow](https://docs.github.com/en/actions/using-workflows/about-workflows) instala todas as dependências, instala o Playwright e então roda os testes. Também cria o HTML report.

```yml js title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v5
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

#### Em push/pull_request (sharded)

O GitHub Actions suporta [sharding de testes entre múltiplos jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs). Veja nosso [doc de sharding](./test-sharding) para aprender mais e ver um [exemplo de GitHub Actions](./test-sharding.md#github-actions-example) de como configurar um job para rodar testes em múltiplas máquinas e como mesclar os HTML reports.

#### Via Containers

O GitHub Actions suporta [rodar jobs num container](https://docs.github.com/en/actions/using-jobs/running-jobs-in-a-container) usando a opção [`jobs.<job_id>.container`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontainer). Isso é útil para não poluir o host com dependências e ter um ambiente consistente (ex.: testes de regressão visual) entre SOs.

```yml js title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  playwright:
    name: 'Playwright Tests'
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
      options: --user 1001
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
      - name: Install dependencies
        run: npm ci
      - name: Run your tests
        run: npx playwright test
```

#### Em deployment

Isso inicia os testes após um [GitHub Deployment](https://developer.github.com/v3/repos/deployments/) entrar no estado `success`. Serviços como Vercel usam esse padrão para rodar testes end-to-end no ambiente deployado.

```yml js title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  deployment_status:
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
      env:
        PLAYWRIGHT_TEST_BASE_URL: ${{ github.event.deployment_status.target_url }}
```

#### Fail-Fast

Suítes grandes podem demorar muito. Usando a flag `--only-changed`, você roda primeiro os arquivos de teste propensos a falhar. Isso dá um loop de feedback mais rápido e reduz o consumo de CI em Pull Requests. Para detectar os arquivos afetados, `--only-changed` analisa o grafo de dependências da suíte (heurística; pode perder testes, então rode a suíte completa depois).

```yml js title=".github/workflows/playwright.yml" {24-26}
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
      with:
        # Checkout não-shallow, para referenciar $GITHUB_BASE_REF.
        fetch-depth: 0
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run changed Playwright tests
      run: npx playwright test --only-changed=origin/$GITHUB_BASE_REF
      if: github.event_name == 'pull_request'
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v5
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### Docker

Temos uma [imagem Docker pré-construída](./docker.md) que pode ser usada diretamente ou como referência para atualizar suas definições Docker. Siga a [Configuração Docker recomendada](./docker.md#configuração-docker-recomendada) para o melhor desempenho.

### Azure Pipelines

Para agentes Windows ou macOS, nenhuma configuração extra é necessária; apenas instale o Playwright e rode os testes.

Para agentes Linux, você pode usar [nosso container Docker](./docker.md) com o suporte do Azure Pipelines a [jobs containerizados](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/container-phases?view=azure-devops). Alternativamente, use a [Command line tools](./browsers#instalar-dependências-do-sistema) para instalar as dependências necessárias.

Para rodar os testes do Playwright use esta pipeline task:

```yml js
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:
- task: UseNode@1
  inputs:
    version: '22'
  displayName: 'Install Node.js'
- script: npm ci
  displayName: 'npm ci'
- script: npx playwright install --with-deps
  displayName: 'Install Playwright browsers'
- script: npx playwright test
  displayName: 'Run Playwright tests'
  env:
    CI: 'true'
```

#### Publicando a pasta playwright-report no Azure Pipelines

Isso faz o pipeline falhar se algum teste falhar. Para integrar os resultados com o Azure DevOps, use a task `PublishTestResults`:

```yml
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:
- task: UseNode@1
  inputs:
    version: '22'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'npm ci'
- script: npx playwright install --with-deps
  displayName: 'Install Playwright browsers'
- script: npx playwright test
  displayName: 'Run Playwright tests'
  env:
    CI: 'true'
- task: PublishTestResults@2
  displayName: 'Publish test results'
  inputs:
    searchFolder: 'test-results'
    testResultsFormat: 'JUnit'
    testResultsFiles: 'e2e-junit-results.xml'
    mergeTestResults: true
    failTaskOnFailedTests: true
    testRunTitle: 'My End-To-End Tests'
  condition: succeededOrFailed()
- task: PublishPipelineArtifact@1
  inputs:
    targetPath: playwright-report
    artifact: playwright-report
    publishLocation: 'pipeline'
  condition: succeededOrFailed()
```

Note: o reporter JUnit precisa ser configurado em `playwright.config.ts`:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['junit', { outputFile: 'test-results/e2e-junit-results.xml' }]],
});
```

#### Azure Pipelines (sharded)

```yaml
trigger:
- main

pool:
  vmImage: ubuntu-latest

strategy:
  matrix:
    chromium-1:
      project: chromium
      shard: 1/3
    chromium-2:
      project: chromium
      shard: 2/3
    chromium-3:
      project: chromium
      shard: 3/3
    firefox-1:
      project: firefox
      shard: 1/3
    firefox-2:
      project: firefox
      shard: 2/3
    firefox-3:
      project: firefox
      shard: 3/3
    webkit-1:
      project: webkit
      shard: 1/3
    webkit-2:
      project: webkit
      shard: 2/3
    webkit-3:
      project: webkit
      shard: 3/3
steps:
- task: UseNode@1
  inputs:
    version: '22'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'npm ci'
- script: npx playwright install --with-deps
  displayName: 'Install Playwright browsers'
- script: npx playwright test --project=$(project) --shard=$(shard)
  displayName: 'Run Playwright tests'
  env:
    CI: 'true'
```

#### Azure Pipelines (containerizado)

```yml js
trigger:
- main

pool:
  vmImage: ubuntu-latest
container: mcr.microsoft.com/playwright:v%%VERSION%%-noble

steps:
- task: UseNode@1
  inputs:
    version: '22'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'npm ci'
- script: npx playwright test
  displayName: 'Run Playwright tests'
  env:
    CI: 'true'
```

### CircleCI

Rodar o Playwright no CircleCI é muito similar ao GitHub Actions. Para especificar a [imagem Docker](./docker.md) pré-construída, modifique a definição do agente com `docker:` na sua config:

```yml js
executors:
  pw-noble-development:
    docker:
      - image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
```

Note: ao usar a definição de agente docker, você está especificando a resource class onde o Playwright roda para o tier 'medium' [aqui](https://circleci.com/docs/configuration-reference?#docker-execution-environment). O comportamento padrão do Playwright é definir o número de workers para a contagem de cores detectada (2 no caso do medium tier). Sobrescrever o número de workers para algo maior causará timeouts e falhas desnecessárias.

#### Sharding no CircleCI

Sharding no CircleCI é indexado com 0, o que significa que você precisará sobrescrever as ENV VARS de paralelismo padrão. O exemplo a seguir demonstra como rodar o Playwright com CircleCI Parallelism de 4 adicionando 1 ao `CIRCLE_NODE_INDEX` para passar ao arg `--shard`:

```yml
  playwright-job-name:
    executor: pw-noble-development
    parallelism: 4
    steps:
      - run: SHARD="$((${CIRCLE_NODE_INDEX}+1))"; npx playwright test --shard=${SHARD}/${CIRCLE_NODE_TOTAL}
```

### Jenkins

O Jenkins suporta agentes Docker para pipelines. Use a [imagem Docker do Playwright](./docker.md) para rodar testes no Jenkins.

```groovy js
pipeline {
   agent { docker { image 'mcr.microsoft.com/playwright:v%%VERSION%%-noble' } }
   stages {
      stage('e2e-tests') {
         steps {
            sh 'npm ci'
            sh 'npx playwright test'
         }
      }
   }
}
```

### Bitbucket Pipelines

O Bitbucket Pipelines pode usar [imagens Docker públicas como ambientes de build](https://confluence.atlassian.com/bitbucket/use-docker-images-as-build-environments-792298897.html). Para rodar testes do Playwright no Bitbucket, use nossa imagem Docker pública ([veja Dockerfile](./docker.md)).

```yml js
image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
```

### GitLab CI

Para rodar testes do Playwright no GitLab, use nossa imagem Docker pública ([veja Dockerfile](./docker.md)).

```yml js
stages:
  - test

tests:
  stage: test
  image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
  script:
  ...
```

#### Sharding

O GitLab CI suporta [sharding de testes entre múltiplos jobs](https://docs.gitlab.com/ee/ci/jobs/job_control.html#parallelize-large-jobs) usando a keyword [parallel](https://docs.gitlab.com/ee/ci/yaml/index.html#parallel). O job de teste será dividido em jobs menores rodando em paralelo.

```yml
stages:
  - test

tests:
  stage: test
  image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
  parallel: 7
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

O GitLab CI também suporta sharding usando [parallel:matrix](https://docs.gitlab.com/ee/ci/yaml/index.html#parallelmatrix). No exemplo abaixo, temos 2 valores de `PROJECT` e 10 de `SHARD`, resultando em 20 jobs.

```yml
stages:
  - test

tests:
  stage: test
  image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
  parallel:
    matrix:
      - PROJECT: ['chromium', 'webkit']
        SHARD: ['1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10']
  script:
    - npm ci
    - npx playwright test --project=$PROJECT --shard=$SHARD
```

### Google Cloud Build

Para rodar testes do Playwright no Google Cloud Build, use nossa imagem Docker pública ([veja Dockerfile](./docker.md)).

```yml
steps:
- name: mcr.microsoft.com/playwright:v%%VERSION%%-noble
  script:
  ...
  env:
  - 'CI=true'
```

### Drone

Para rodar testes do Playwright no Drone, use nossa imagem Docker pública ([veja Dockerfile](./docker.md)).

```yml
kind: pipeline
name: default
type: docker

steps:
  - name: test
    image: mcr.microsoft.com/playwright:v%%VERSION%%-noble
    commands:
      - npx playwright test
```

## Caching de navegadores

Fazer cache dos binários de navegador **não** é recomendado, já que o tempo para restaurar o cache é comparável ao tempo de download. Especialmente no Linux, as [dependências de SO](./browsers.md#instalar-dependências-do-sistema) precisam ser instaladas e não são cacheáveis.

Se mesmo assim quiser fazer cache dos binários entre runs de CI, faça cache [desses diretórios](./browsers.md#gerenciando-binários-de-navegador) na sua config de CI, contra um hash da versão do Playwright.

## Debugando lançamento de navegadores

O Playwright suporta a variável de ambiente `DEBUG` para emitir logs de debug durante a execução. Definir como `pw:browser` ajuda a debugar erros `Error: Failed to launch browser`.

```bash
DEBUG=pw:browser npx playwright test
```

## Rodando em modo headed

Por padrão, o Playwright lança navegadores em modo headless. Veja no nosso guia [Running tests](./running-tests.md#run-tests-in-headed-mode) como rodar em modo headed.

Em agentes Linux, execução headed requer [Xvfb](https://en.wikipedia.org/wiki/Xvfb) instalado. Nossa [imagem Docker](./docker.md) e GitHub Action já trazem o Xvfb pré-instalado. Para rodar em headed com Xvfb, adicione `xvfb-run` antes do comando:

```bash
xvfb-run npx playwright test
```

## Exemplo completo (playwright.config.ts + GitHub Actions)

```js title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // Em CI, paralelismo 1 para estabilidade.
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Boas práticas

- Fixe `node-version: lts/*` e use `npm ci` (não `npm install`) para builds reprodutíveis.
- Habilite `trace: 'on-first-retry'` ou `retain-on-failure` para facilitar o debug pós-falha.
- Publique o `playwright-report/` e `test-results/` como artifacts mesmo em caso de falha (`if: ${{ !cancelled() }}`).

### Armadilhas comuns

- Não instalar dependências de SO (`--with-deps`) → `Failed to launch browser`.
- Esquecer `CI=true`/`CI: 'true'` → configs que dependem dessa flag não engajam.
- Cache de navegadores que na verdade não economiza tempo e complica o ambiente.
- Sharding mal configurado (índice 0 no CircleCI) → jobs ignorados ou duplicados.
