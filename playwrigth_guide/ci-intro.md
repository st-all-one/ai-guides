---
id: ci-intro
title: "Configurando CI"
---

## Introdução

Testes do Playwright podem rodar em qualquer provedor de CI. Este guia cobre uma forma de rodar testes no GitHub usando GitHub Actions. Para aprender mais ou como configurar outros provedores de CI, consulte nosso [doc detalhado de Continuous Integration](./ci.md).

### Você vai aprender

- [Como configurar GitHub Actions](./ci-intro.md#configurando-github-actions)
- [Como ver logs de teste](./ci-intro.md#visualizando-logs-de-teste)
- [Como ver o HTML report](./ci-intro.md#html-report)
- [Como ver o trace](./ci-intro.md#visualizando-o-trace)
- [Como publicar o report na web](./ci-intro.md#publicando-report-na-web)

## Configurando GitHub Actions

Ao [instalar o Playwright](./intro.md) usando a [extensão do VS Code](./getting-started-vscode.md) ou com `npm init playwright@latest`, você tem a opção de adicionar um workflow do [GitHub Actions](https://docs.github.com/en/actions). Isso cria um arquivo `playwright.yml` dentro da pasta `.github/workflows` contendo tudo que você precisa para que seus testes rodem a cada push e pull request no branch main/master. Veja como esse arquivo se parece:

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
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

O workflow executa estes passos:

1. Clona seu repositório
2. Instala Node.js
3. Instala dependências NPM
4. Instala navegadores do Playwright
5. Roda testes do Playwright
6. Faz upload do HTML report para a UI do GitHub

Para saber mais, veja ["Understanding GitHub Actions"](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions).

## Criar um Repo e fazer Push para o GitHub

Uma vez que você tem seu [workflow do GitHub Actions](#configurando-github-actions) configurado, tudo que precisa fazer é [Criar um repo no GitHub](https://docs.github.com/en/get-started/quickstart/create-a-repo) ou fazer push do seu código para um repositório existente. Siga as instruções no GitHub e não esqueça de [inicializar um repositório git](https://github.com/git-guides/git-init) usando o comando `git init` para poder [add](https://github.com/git-guides/git-add), [commit](https://github.com/git-guides/git-commit) e [push](https://github.com/git-guides/git-push) seu código.

## Abrindo os Workflows

Clique na aba **Actions** para ver os workflows. Aqui você vê se seus testes passaram ou falharam.

Em Pull Requests você também pode clicar no link **Details** na [PR status check](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks).

## Visualizando logs de teste

Clicar na execução do workflow mostra todas as ações que o GitHub executou e clicar em **Run Playwright tests** mostra as mensagens de erro, o que era esperado e o que foi recebido, bem como o call log.

## HTML Report

O HTML Report mostra um relatório completo dos seus testes. Você pode filtrar por navegadores, testes passados, falhados, pulados e flaky.

### Baixando o HTML Report

Na seção Artifacts, clique em **playwright-report** para baixar seu relatório no formato de um arquivo zip.

### Visualizando o HTML Report

Abrir o relatório localmente não funciona como esperado, pois você precisa de um web server para tudo funcionar corretamente. Primeiro, extraia o zip, de preferência numa pasta que já tenha o Playwright instalado. Usando a linha de comando, entre no diretório onde está o relatório e use `npx playwright show-report` seguido do nome da pasta extraída. Isso serve o relatório e permite visualizá-lo no navegador.

```bash
npx playwright show-report name-of-my-extracted-playwright-report
```

Para saber mais sobre relatórios, consulte nosso guia detalhado sobre [HTML Reporter](./test-reporters.md#html-reporter).

## Visualizando o Trace

Uma vez que você serviu o relatório usando `npx playwright show-report`, clique no ícone de trace ao lado do nome do arquivo do teste. Você pode então ver o trace dos seus testes e inspecionar cada ação para tentar descobrir por que os testes estão falhando.

## Publicando report na web

Baixar o HTML report como zip não é muito conveniente. Porém, podemos usar os recursos de static website hosting do Azure Storage para servir HTML reports na Internet com configuração mínima.

1. Crie uma [conta de Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create).
2. Habilite o [Static website hosting](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to#enable-static-website-hosting) para a conta.
3. Crie um Service Principal no Azure e conceda acesso ao Azure Blob storage. Após execução bem-sucedida, o comando exibe as credenciais usadas no próximo passo.

    ```bash
    az ad sp create-for-rbac --name "github-actions" --role "Storage Blob Data Contributor" --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP_NAME>/providers/Microsoft.Storage/storageAccounts/<STORAGE_ACCOUNT_NAME>
    ```
4. Use as credenciais do passo anterior para configurar secrets criptografados no seu repositório GitHub. Vá em settings do repositório, em [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository), e adicione:
    - `AZCOPY_SPA_APPLICATION_ID`
    - `AZCOPY_SPA_CLIENT_SECRET`
    - `AZCOPY_TENANT_ID`
5. Adicione um passo que faz upload do HTML report para o Azure Storage.

    ```yaml title=".github/workflows/playwright.yml"
    ...
        - name: Upload HTML report to Azure
          shell: bash
          run: |
            REPORT_DIR='run-${{ github.run_id }}-${{ github.run_attempt }}'
            azcopy cp --recursive "./playwright-report/*" "https://<STORAGE_ACCOUNT_NAME>.blob.core.windows.net/\$web/$REPORT_DIR"
            echo "::notice title=HTML report url::https://<STORAGE_ACCOUNT_NAME>.z1.web.core.windows.net/$REPORT_DIR/index.html"
          env:
            AZCOPY_AUTO_LOGIN_TYPE: SPN
            AZCOPY_SPA_APPLICATION_ID: '${{ secrets.AZCOPY_SPA_APPLICATION_ID }}'
            AZCOPY_SPA_CLIENT_SECRET: '${{ secrets.AZCOPY_SPA_CLIENT_SECRET }}'
            AZCOPY_TENANT_ID: '${{ secrets.AZCOPY_TENANT_ID }}'
    ```

O conteúdo do container `$web` pode ser acessado pelo navegador usando a [URL pública](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to?tabs=azure-portal#portal-find-url) do site.

:::note
Este passo não funcionará para pull requests de forks porque tais workflows [não têm acesso aos secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#using-secrets-in-a-workflow).
:::

## Tratando Secrets corretamente

Artifacts como arquivos de trace, HTML reports ou até logs de console contêm informações sobre sua execução de teste. Eles podem conter dados sensíveis como credenciais de usuário de teste, tokens de acesso a um backend de staging, código-fonte de teste ou às vezes até seu código-fonte de aplicação. Trate esses arquivos com o mesmo cuidado que trata dados sensíveis. Se você fizer upload de reports e traces como parte do seu workflow de CI, garanta que os envie apenas para artifact stores confiáveis, ou que criptografe os arquivos antes do upload. O mesmo vale para compartilhar artifacts com membros do time: use um file share confiável ou criptografe os arquivos antes de compartilhar.

## Próximos passos

- [Aprenda a usar Locators](./locators.md)
- [Aprenda a realizar Ações](./input.md)
- [Aprenda a escrever Assertions](./test-assertions.md)
- [Saiba mais sobre o Trace Viewer](./trace-viewer.md)
- [Saiba mais formas de rodar testes no GitHub Actions](./ci.md#github-actions)
- [Saiba mais sobre rodar testes em outros provedores de CI](./ci.md)
