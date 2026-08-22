---
id: running-tests
title: "Rodando e depurando testes"
---

## Introdução

Com o Playwright você pode rodar um único teste, um conjunto de testes ou todos os testes. Os testes podem ser executados em um ou em múltiplos navegadores usando a flag `--project`. Os testes rodam em paralelo por padrão e em modo *headless* (sem janela de navegador visível), e os resultados aparecem no terminal. Você pode rodar em modo *headed* com o argumento `--headed`, ou usar o [UI Mode](./test-ui-mode.md) com a flag `--ui` para ver um trace completo dos testes.

**O que você vai aprender**

- [Como rodar testes pela linha de comando](#linha-de-comando)
- [Como depurar testes](#depurando-testes)
- [Como abrir o reporter HTML](#relatórios-de-teste)

## Rodando testes

### Linha de comando

Você roda seus testes com o comando `playwright test`. Isso executa os testes em todos os navegadores configurados no `playwright.config.ts`, e os resultados aparecem no terminal. Os testes rodam em modo headless por padrão.

```bash
npx playwright test
```

![testes rodando na linha de comando](./images/getting-started/run-tests-cli.png)

> **Quando usar:** este é o comando principal para execução local e em CI. Use opções adicionais para filtrar o que rodar.

### Rodar testes em UI Mode

Recomendamos fortemente rodar seus testes com o [UI Mode](./test-ui-mode.md) para uma melhor experiência de desenvolvimento: você percorre cada passo do teste e vê visualmente o que acontecia antes, durante e depois de cada ação. O UI Mode também traz recursos como o *locator picker*, *watch mode* e muito mais.

```bash
npx playwright test --ui
```

![UI Mode](./images/getting-started/ui-mode.png)

Consulte o [guia detalhado de UI Mode](./test-ui-mode.md) para conhecer todos os recursos.

### Rodar testes em modo headed

Para rodar em modo *headed* (com janela visível), use a flag `--headed`. Isso permite ver visualmente como o Playwright interage com o site.

```bash
npx playwright test --headed
```

### Rodar em navegadores diferentes

Para especificar o navegador, use a flag `--project` seguida do nome do projeto (definido no `playwright.config.ts`).

```bash
npx playwright test --project webkit
```

Para múltiplos navegadores, use `--project` várias vezes:

```bash
npx playwright test --project webkit --project firefox
```

### Rodar testes específicos

Para rodar um único arquivo de teste, passe o nome do arquivo:

```bash
npx playwright test landing-page.spec.ts
```

Para rodar um conjunto de arquivos de diretórios diferentes, passe os nomes dos diretórios:

```bash
npx playwright test tests/todo-page/ tests/landing-page/
```

Para rodar arquivos que contenham `landing` ou `login` no nome, passe essas palavras-chave:

```bash
npx playwright test landing login
```

Para rodar um teste por título, use a flag `-g` seguida do título:

```bash
npx playwright test -g "adicionar um item na lista"
```

### Rodar apenas os testes que falharam

Para rodar somente os testes que falharam na última execução, rode os testes e depois rode novamente com a flag `--last-failed`.

```bash
npx playwright test --last-failed
```

O Playwright armazena a lista de testes falhos da execução anterior em `<outputDir>/.last-run.json` (veja [`outputDir`](./test-configuration.md)). Para usar um caminho diferente, passe `--last-failed-file=<path>` ou defina `PLAYWRIGHT_LAST_RUN_OUTPUT_FILE`.

```bash
npx playwright test --last-failed --last-failed-file=.cache/last-run-shard-1.json
```

### Rodar no VS Code

Os testes podem ser rodados diretamente do VS Code usando a [VS Code extension](./getting-started-vscode.md). Após instalar, basta clicar no triângulo verde ao lado do teste desejado ou rodar todos os testes pela sidebar de testes. Veja o guia [Getting Started com VS Code](./getting-started-vscode.md).

![instalar extensão do playwright](./images/getting-started/vscode-extension.png)

## Depurando testes

Como o Playwright roda em Node.js, você pode depurá-lo com o depurador de sua preferência (por exemplo, `console.log`, dentro da sua IDE, ou diretamente no VS Code com a extensão). O Playwright também traz o [UI Mode](./test-ui-mode.md), onde você percorre cada passo, vê logs, erros, requisições de rede, inspeciona o DOM e muito mais. Você também pode usar o [Playwright Inspector](./debug.md#playwright-inspector), que permite avançar passo a passo pelas chamadas da API do Playwright, ver logs de debug e explorar [locators](./locators.md).

### Depurar em UI Mode

Recomendamos depurar com o [UI Mode](./test-ui-mode.md) para uma melhor experiência: você caminha por cada passo e vê visualmente o que acontecia antes, durante e depois. O UI Mode também traz o *locator picker*, *watch mode* e mais.

```bash
npx playwright test --ui
```

![mostrando erros no ui mode](./images/getting-started/ui-mode-error.png)

Durante a depuração, use o botão **Pick Locator** para selecionar um elemento na página e ver o locator que o Playwright usaria. Você pode editar o locator no *locator playground* e vê-lo destacado ao vivo na janela do navegador. Use o botão **Copy Locator** para copiá-lo e colar no teste.

![pick locator no ui mode](./images/getting-started/ui-mode-pick-locator.png)

### Depurar com o Playwright Inspector

Para depurar todos os testes, rode o comando `playwright test` seguido da flag `--debug`.

```bash
npx playwright test --debug
```

![Depurando testes com o Playwright Inspector](./images/getting-started/run-tests-debug.png)

Esse comando abre uma janela do navegador e o Playwright Inspector. Você pode usar o botão *step over* para avançar passo a passo, ou o botão *play* para rodar do início ao fim. Ao terminar, a janela fecha.

Para depurar um único arquivo, passe o nome do arquivo seguido de `--debug`:

```bash
npx playwright test example.spec.ts --debug
```

Para depurar um teste específico a partir do número de linha onde o `test(...` está definido, adicione `:númerodaLinha` ao final do arquivo, seguido de `--debug`:

```bash
npx playwright test example.spec.ts:10 --debug
```

Durante a depuração, use o **Pick Locator** para selecionar um elemento e ver o locator correspondente, editá-lo e vê-lo destacado ao vivo. Use **Copy Locator** para copiar e colar no teste.

![Locator picker no Playwright Inspector](./images/getting-started/run-tests-pick-locator.png)

Consulte o [guia de debug](./debug.md) para saber mais sobre o depurador do VS Code, UI Mode e o Playwright Inspector, além do debug com as *Browser Developer Tools*.

> **Armadilha comum (gotcha):** ao depurar com `--debug`, o navegador fica aberto e pausado. Se o teste travar, feche manualmente. Para depuração rápida de um único ponto, prefira o *breakpoint* no VS Code ou `await page.pause();` dentro do teste.

## Relatórios de teste

O [HTML Reporter](./test-reporters.md#html-reporter) mostra um relatório completo, permitindo filtrar por navegador, testes que passaram, falharam, foram pulados ou são flaky. Por padrão, o relatório HTML abre automaticamente se algum teste falhar; caso contrário, abra com:

```bash
npx playwright show-report
```

![HTML Report](./images/getting-started/html-report.png)

Você pode filtrar e buscar testes, além de clicar em cada um para ver erros e explorar cada passo.

![Detalhe do HTML Reporter](./images/getting-started/html-report-detail.png)

## Exemplo de uso no dia a dia

```bash
# Roda tudo em headless (padrão de CI)
npx playwright test

# Roda só chromium, modo headed, com trace
npx playwright test --project chromium --headed --trace on

# Roda um arquivo específico em UI Mode para depurar
npx playwright test tests/login.spec.ts --ui

# Re-roda só o que falhou na última vez
npx playwright test --last-failed

# Abre o relatório HTML gerado
npx playwright show-report
```

## Boas práticas

- Em CI, rode em modo headless e em Linux (mais barato). Localmente, use `--ui` para depurar.
- Use `--trace on` (ou `trace: 'on-first-retry'` no config) para investigar falhas em CI via [trace viewer](./trace-viewer.md), em vez de só screenshots/vídeos.
- Combine filtros (`--project`, nome de arquivo, `-g "título"`) para rodar conjuntos pequenos durante o desenvolvimento e acelerar o ciclo.

## Próximos passos

- [Gerar testes com o Codegen](./codegen-intro.md)
- [Ver o trace dos seus testes](./trace-viewer-intro.md)
- [Explorar todos os recursos do UI Mode](./test-ui-mode.md)
- [Rodar seus testes em CI com GitHub Actions](./ci-intro.md)
