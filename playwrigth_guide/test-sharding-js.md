---
id: test-sharding
title: "Sharding (divisão de testes em paralelo)"
---

## Introdução

Por padrão, o Playwright executa os arquivos de teste em [paralelo](./test-parallel-js.md) e busca utilizar da melhor forma os núcleos de CPU da sua máquina. Para obter ainda mais paralelismo, você pode escalar a execução dividindo os testes entre várias máquinas rodando simultaneamente. Chamamos esse modo de operação de **"sharding"** (fragmentação). No Playwright, fazer sharding significa dividir sua suíte de testes em partes menores chamadas **"shards"**. Cada shard é como um job independente que pode rodar sozinho. O objetivo é dividir os testes para acelerar o tempo total de execução.

Quando você faz sharding dos seus testes, cada shard roda de forma independente, utilizando os núcleos de CPU disponíveis. Isso ajuda a acelerar o processo executando tarefas simultaneamente.

Em um pipeline de CI, cada shard pode rodar como um job separado, aproveitando os recursos de hardware disponíveis (como núcleos de CPU) para executar os testes mais rápido.

### Quando usar

- Sua suíte de testes leva mais tempo do que o desejado em um único job de CI e você quer reduzir o tempo de feedback.
- Você tem várias máquinas (ou jobs paralelos) disponíveis no CI e quer distribuir a carga.
- Você precisa de um relatório consolidado mesmo com a execução fragmentada.

### Armadilhas comuns

- O Playwright só consegue fazer sharding de testes que podem rodar em paralelo. Por padrão, isso significa que o sharding ocorre por **arquivo de teste**.
- Se os arquivos não têm tamanhos semelhantes (uns com muitos testes, outros com poucos), a distribuição pode ficar desbalanceada — a menos que você use `fullyParallel: true`.
- Esquecer de configurar o reporter `blob` no CI impede o merge dos relatórios depois.
- Rodar os shards localmente sem mesclar os blobs deixa você sem visibilidade do resultado global; sempre preveja um passo de `merge-reports`.

## Dividindo os testes entre várias máquinas

Para fragmentar a suíte, passe `--shard=x/y` na linha de comando. Por exemplo, para dividir a suíte em quatro shards, cada um rodando um quarto dos testes:

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
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --shard=1/4
yarn playwright test --shard=2/4
yarn playwright test --shard=3/4
yarn playwright test --shard=4/4
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --shard=1/4
pnpm exec playwright test --shard=2/4
pnpm exec playwright test --shard=3/4
pnpm exec playwright test --shard=4/4
```

</TabItem>

</Tabs>

Se você rodar esses shards em paralelo em jobs diferentes, sua suíte de testes é concluída até quatro vezes mais rápido.

Note que o Playwright só consegue fazer sharding de testes que podem rodar em paralelo. Por padrão, isso significa que o Playwright fará sharding dos arquivos de teste. Saiba mais em [guia de paralelismo](./test-parallel-js.md).

## Balanceando os shards

O sharding pode ser feito em dois níveis de granularidade, dependendo se você usa a opção `fullyParallel` ou não. Isso afeta como os testes são balanceados entre os shards.

### Sharding com `fullyParallel`

Quando `fullyParallel: true` está habilitado, o Playwright Test executa testes individuais em paralelo entre múltiplos shards, garantindo que cada shard receba uma distribuição equilibrada de testes. Isso permite granularidade em nível de teste, ou seja, cada shard tentará balancear a quantidade de testes individuais que executa. Este é o modo preferido para garantir distribuição equilibrada de carga no sharding, pois o Playwright pode otimizar a execução do shard com base no número total de testes.

### Sharding sem `fullyParallel`

Sem a configuração `fullyParallel`, o Playwright Test usa granularidade em nível de arquivo por padrão, ou seja, arquivos de teste inteiros são atribuídos aos shards (note que o mesmo arquivo pode ser atribuído a diferentes shards em diferentes projetos). Nesse caso, a quantidade de testes por arquivo pode influenciar muito a distribuição dos shards. Se seus arquivos de teste não têm tamanhos uniformes (ou seja, alguns arquivos contêm muitos mais testes que outros), certos shards podem acabar rodando significativamente mais testes, enquanto outros rodam poucos ou nenhum.

### Pontos-chave

- **Com** `fullyParallel: true`: os testes são divididos em nível de teste individual, resultando em execução mais balanceada entre os shards.
- **Sem** `fullyParallel`: os testes são divididos em nível de arquivo; para balancear os shards, é importante manter seus arquivos de teste pequenos e com tamanhos semelhantes.
- Para garantir o uso mais efetivo do sharding, especialmente em ambientes de CI, recomenda-se usar `fullyParallel: true` quando se busca distribuição equilibrada entre os shards. Caso contrário, você pode precisar organizar manualmente seus arquivos de teste para evitar desbalanceamentos.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  testDir: './tests',
});
```

## Mesclando relatórios de múltiplos shards

No exemplo anterior, cada shard tem seu próprio relatório de teste. Se você quiser ter um relatório combinado mostrando todos os resultados de todos os shards, você pode mesclá-los.

Comece adicionando o reporter `blob` à configuração ao rodar no CI:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI ? 'blob' : 'html',
});
```

O relatório blob contém informações sobre todos os testes que foram executados e seus resultados, bem como todos os anexos de teste, como traces e diffs de screenshots. Relatórios blob podem ser mesclados e convertidos para qualquer outro relatório do Playwright. Por padrão, o relatório blob é gerado no diretório `blob-report`. Você pode saber mais sobre as opções do blob em [Blob reporter](./test-reporters-js.md#blob-reporter).

Para mesclar relatórios de múltiplos shards, coloque os arquivos de relatório blob em um único diretório, por exemplo `all-blob-reports`. Os nomes dos relatórios blob contêm o número do shard, então não haverá conflito.

Depois, rode o comando `npx playwright merge-reports`:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
```

Isso produzirá um relatório HTML padrão no diretório `playwright-report`.

## Exemplo completo

Abaixo um fluxo completo e executável, do tipo que você usaria em um projeto real:

1. Configuração com `blob` no CI e `fullyParallel` para balancear shards em nível de teste:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: process.env.CI ? 'blob' : 'html',
});
```

2. Execução dos shards (4 no total), tipicamente em jobs de CI paralelos:

```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

3. Mesclagem dos relatórios blob em um único relatório HTML:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
npx playwright show-report
```

Um teste de exemplo que pode ser distribuído entre os shards:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('deve carregar a home logada', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## Exemplo de GitHub Actions

O GitHub Actions suporta [sharding de testes entre múltiplos jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) usando a opção `jobs.<job_id>.strategy.matrix`. A opção `matrix` vai rodar um job separado para cada combinação possível das opções fornecidas.

O exemplo a seguir mostra como configurar um job para rodar seus testes em quatro máquinas em paralelo e depois mesclar os relatórios em um único relatório. Não esqueça de adicionar `reporter: process.env.CI ? 'blob' : 'html',` ao seu arquivo `playwright.config.ts` como no exemplo acima.

1. Primeiro adicionamos uma opção `matrix` à configuração do job com `shardTotal: [4]` contendo o número total de shards que queremos criar e `shardIndex: [1, 2, 3, 4]` com um array dos números dos shards.

1. Depois rodamos nossos testes do Playwright com a opção `--shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`. Isso vai rodar nosso comando de teste para cada shard.

1. Por fim, fazemos o upload do nosso relatório blob para os Artifacts do GitHub Actions. Isso tornará o relatório blob disponível para outros jobs no workflow.

```yaml title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  playwright-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright browsers
      run: npx playwright install --with-deps

    - name: Run Playwright tests
      run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

    - name: Upload blob report to GitHub Actions Artifacts
      if: ${{ !cancelled() }}
      uses: actions/upload-artifact@v4
      with:
        name: blob-report-${{ matrix.shardIndex }}
        path: blob-report
        retention-days: 1
```

1. Após todos os shards terem sido concluídos, você pode rodar um job separado que vai mesclar os relatórios e produzir um [relatório HTML](./test-reporters-js.md#html-reporter) combinado. Para garantir a ordem de execução, fazemos o job `merge-reports` [depender](https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow#defining-prerequisite-jobs) do nosso job `playwright-tests` adicionando `needs: [playwright-tests]`.

```yaml title=".github/workflows/playwright.yml"
jobs:
...
  merge-reports:
    # Merge reports after playwright-tests, even if some shards have failed
    if: ${{ !cancelled() }}
    needs: [playwright-tests]

    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci

    - name: Download blob reports from GitHub Actions Artifacts
      uses: actions/download-artifact@v5
      with:
        path: all-blob-reports
        pattern: blob-report-*
        merge-multiple: true

    - name: Merge into HTML Report
      run: npx playwright merge-reports --reporter html ./all-blob-reports

    - name: Upload HTML report
      uses: actions/upload-artifact@v4
      with:
        name: html-report--attempt-${{ github.run_attempt }}
        path: playwright-report
        retention-days: 14
```

Você agora pode ver que os relatórios foram mesclados e um relatório HTML combinado está disponível na aba de Artifacts do GitHub Actions.

<img height="1610" width="1750" alt="image" src="https://github.com/microsoft/playwright/assets/9798949/b69dac59-fc19-4b98-8f49-814b1c29ca02" />

## Mesclando relatórios de múltiplos ambientes

Se você quer rodar os mesmos testes em múltiplos ambientes, em vez de fragmentar seus testes em múltiplas máquinas, você precisa diferenciar esses ambientes.

Nesse caso, é útil especificar a propriedade `tag`, para marcar todos os testes com o nome do ambiente. Essa tag será automaticamente capturada pelo relatório blob e, posteriormente, pela ferramenta de merge.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: process.env.CI ? 'blob' : 'html',
  tag: process.env.CI_ENVIRONMENT_NAME,  // por exemplo "@APIv2"
});
```

## CLI do merge-reports

`npx playwright merge-reports path/to/blob-reports-dir` lê todos os relatórios blob do diretório passado e os mescla em um único relatório.

Ao mesclar relatórios de SOs diferentes você precisará fornecer uma configuração de merge explícita para desambiguar qual diretório deve ser usado como raiz dos testes.

Opções suportadas:

- `--reporter reporter-a-usar`

  Qual relatório produzir. Pode ser múltiplos reporters separados por vírgula.

  Exemplo:

  ```bash
  npx playwright merge-reports --reporter=html,github ./blob-reports
  ```

- `--config path/para/arquivo/config`

  Especifica o arquivo de configuração do Playwright com os reporters de saída. Use esta opção para passar configuração adicional ao reporter de saída. Este arquivo de configuração pode ser diferente do usado durante a criação dos relatórios blob.

  Exemplo:

  ```bash
  npx playwright merge-reports --config=merge.config.ts ./blob-reports
  ```

  ```ts title="merge.config.ts"
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testDir: 'e2e',
    reporter: [['html', { open: 'never' }]],
  });
  ```

## Boas práticas

- Sempre use `fullyParallel: true` no CI para balancear os shards em nível de teste.
- Configure `reporter: process.env.CI ? 'blob' : 'html'` para poder mesclar depois.
- Nomeie os arquivos de teste de forma equilibrada (evite um arquivo gigante e outros pequenos) caso não use `fullyParallel`.
- Faça o upload dos blobs como artifacts e mescle em um job separado que depende dos jobs de testes.
- Use `npx playwright show-report` localmente para inspecionar o relatório mesclado.
- Mantenha `fail-fast: false` na matrix do CI para que uma falha em um shard não cancele os demais, garantindo que o merge ainda produza um relatório completo.
