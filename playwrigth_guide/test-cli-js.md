---
id: test-cli
title: "Linha de comando (CLI)"
---

O Playwright oferece uma poderosa interface de linha de comando (CLI) para rodar testes, gerar código, depurar e muito mais. A lista mais atualizada de comandos e argumentos pode ser obtida a qualquer momento via `npx playwright --help`.

## Comandos essenciais

### Rodar testes (Run Tests)

Executa seus testes do Playwright. [Leia mais sobre rodar testes](./running-tests.md).

#### Sintaxe

```bash
npx playwright test [options] [test-filter...]
```

#### Exemplos

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
# Roda todos os testes
npx playwright test

# Roda um único arquivo de teste
npx playwright test tests/todo-page.spec.ts

# Roda um conjunto de arquivos de teste
npx playwright test tests/todo-page/ tests/landing-page/

# Roda testes em uma linha específica
npx playwright test my-spec.ts:42

# Roda testes pelo título
npx playwright test -g "add a todo item"

# Roda testes em navegadores com UI (headed)
npx playwright test --headed

# Roda testes de um projeto específico
npx playwright test --project=chromium

# Obtém ajuda
npx playwright test --help
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test
yarn playwright test tests/todo-page.spec.ts
yarn playwright test tests/todo-page/ tests/landing-page/
yarn playwright test my-spec.ts:42
yarn playwright test -g "add a todo item"
yarn playwright test --headed
yarn playwright test --project=chromium
yarn playwright test --help
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm exec playwright test
pnpm exec playwright test tests/todo-page.spec.ts
pnpm exec playwright test tests/todo-page/ tests/landing-page/
pnpm exec playwright test my-spec.ts:42
pnpm exec playwright test -g "add a todo item"
pnpm exec playwright test --headed
pnpm exec playwright test --project=chromium
pnpm exec playwright test --help
```

</TabItem>
</Tabs>

**Desabilitar [paralelização](./test-parallel.md)**

```bash
npx playwright test --workers=1
```

**Rodar em modo debug com o [Playwright Inspector](./debug.md)**

```bash
npx playwright test --debug
```

**Rodar testes no [UI mode](./test-ui-mode.md) interativo**

```bash
npx playwright test --ui
```

#### Opções comuns

| Opção | Descrição |
| :--- | :--- |
| `--debug` | Roda testes com o Playwright Inspector. Atalho para as opções `PWDEBUG=1 --timeout=0 --max-failures=1 --headed --workers=1`. |
| `--headed` | Roda testes em navegadores com UI (padrão: headless). |
| `-g <grep>` ou `--grep <grep>` | Roda apenas os testes que casam com esta expressão regular (padrão: ".*"). |
| `--project <project-name...>` | Roda apenas os testes dos projetos informados; suporta o curinga '*' (padrão: todos os projetos). |
| `--ui` | Roda testes no UI mode interativo. |
| `-j <workers>` ou `--workers <workers>` | Número de workers concorrentes ou porcentagem dos cores lógicos; use 1 para um único worker (padrão: 50%). |

#### Todas as opções

| Opção | Descrição |
| :--- | :--- |
| Argumentos sem opção | Cada argumento é tratado como uma expressão regular casada contra o caminho completo do arquivo de teste. Apenas testes desses arquivos serão executados. Símbolos especiais como `$` ou `*` devem ser escapados com `\`. Em muitos shells você pode precisar citar os argumentos. |
| `--add-reporter <reporter>` | Reporter a adicionar além dos configurados no arquivo de configuração, separados por vírgula. Pode ser um nome de reporter nativo ou um caminho para um arquivo customizado. Diferente de `--reporter`, mantém os reporters já configurados. |
| `-c <file>` ou `--config <file>` | Arquivo de configuração, ou um diretório de teste com opção "playwright.config.{m,c}?{js,ts}". Padrão: `playwright.config.ts` ou `playwright.config.js` no diretório atual. |
| `--debug` | Roda testes com o Playwright Inspector. Atalho para `PWDEBUG=1 --timeout=0 --max-failures=1 --headed --workers=1`. |
| `--fail-on-flaky-tests` | Falha se qualquer teste for marcado como flaky (padrão: false). |
| `--forbid-only` | Falha se `test.only` for chamado (padrão: false). Útil no CI. |
| `--fully-parallel` | Roda todos os testes em paralelo (padrão: false). |
| `--global-timeout <timeout>` | Tempo máximo que a suíte pode rodar em milissegundos (padrão: ilimitado). |
| `-g <grep>` ou `--grep <grep>` | Roda apenas os testes que casam com esta expressão regular (padrão: ".*"). |
| `-G <grep>` ou `--grep-invert <grep>` | Roda apenas os testes que NÃO casam com esta expressão regular. |
| `--headed` | Roda testes em navegadores com UI (padrão: headless). |
| `--ignore-snapshots` | Ignora expectations de screenshot e snapshot. |
| `-j <workers>` ou `--workers <workers>` | Número de workers concorrentes ou porcentagem dos cores lógicos; use 1 para um único worker (padrão: 50%). |
| `--last-failed` | Roda apenas as falhas novamente. |
| `--last-failed-file <file>` | Sobrescreve o caminho padrão do JSON de última execução para `--last-failed` (padrão: `<outputDir>/.last-run.json`). Equivale à variável de ambiente `PLAYWRIGHT_LAST_RUN_OUTPUT_FILE`. |
| `--list` | Coleta todos os testes e os reporta, mas não os executa. |
| `--max-failures <N>` ou `-x` | Para após as primeiras `N` falhas. Passar `-x` para após a primeira falha. |
| `--no-deps` | Não roda dependências de projeto. |
| `--output <dir>` | Pasta para artefatos de saída (padrão: "test-results"). |
| `--only-changed [ref]` | Roda apenas arquivos de teste alterados entre 'HEAD' e 'ref'. Padrão: alterações não commitadas. Suporta apenas Git. |
| `--pass-with-no-tests` | Faz a execução ter sucesso mesmo se nenhum teste for encontrado. |
| `--project <project-name...>` | Roda apenas os testes dos projetos informados; suporta '*' (padrão: todos). |
| `--quiet` | Suprime stdio. |
| `--repeat-each <N>` | Roda cada teste `N` vezes (padrão: 1). |
| `--reporter <reporter>` | Reporter a usar, separado por vírgula; pode ser "dot", "line", "list" etc. (padrão: "list"). Também aceita caminho para reporter customizado. |
| `--retries <retries>` | Número máximo de tentativas para testes flaky; zero para nenhum retry (padrão: nenhum). |
| `--shard <shard>` | Divide os testes e executa apenas o shard selecionado, no formato "atual/total", base 1, ex.: "3/5". |
| `--test-list <file>` | Caminho para um arquivo de lista de testes. Veja [test list](#test-list) para detalhes. |
| `--test-list-invert <file>` | Caminho para um arquivo de lista de testes a pular. Veja [test list](#test-list) para detalhes. |
| `--timeout <timeout>` | Define o limite de timeout do teste em milissegundos; zero para ilimitado (padrão: 30 segundos). |
| `--trace <mode>` | Força o modo de trace: `on`, `off`, `on-first-retry`, `on-all-retries`, `retain-on-failure`, `retain-on-first-failure`, `retain-on-failure-and-retries`. |
| `--tsconfig <path>` | Caminho para um único tsconfig aplicável a todos os arquivos importados (padrão: procura tsconfig por arquivo importado). |
| `--ui` | Roda testes no UI mode interativo. |
| `--ui-host <host>` | Host para servir a UI; especificar esta opção abre a UI em uma aba do navegador. |
| `--ui-port <port>` | Porta para servir a UI; 0 para qualquer porta livre; especificar abre a UI em uma aba. |
| `-u` ou `--update-snapshots [mode]` | Atualiza snapshots com os resultados reais. Valores: "all", "changed", "missing", "none". Sem a flag, padrão "missing"; com a flag mas sem valor, padrão "changed". |
| `--update-source-method [mode]` | Atualiza snapshots com os resultados reais. Valores: "patch" (padrão), "3way", "overwrite". "Patch" cria um arquivo de diff unificado; "3way" gera marcadores de conflito no código; "overwrite" sobrescreve o código com os novos valores. |
| `-x` | Para após a primeira falha. |

#### Test list

As opções `--test-list` e `--test-list-invert` aceitam um caminho para um arquivo de lista de testes. Este arquivo deve listar testes no formato similar à saída produzida no modo `--list`.

```txt
# Este é um arquivo de test list.
# Pode incluir comentários e linhas vazias.

# Roda TODOS os testes de um arquivo:
path/to/example.spec.ts

# Roda todos os testes de um arquivo para um projeto específico:
[chromium] › path/to/example.spec.ts

# Roda todos os testes de um grupo/suite:
path/to/example.spec.ts › suite name

# Roda todos os testes de um grupo aninhado:
path/to/example.spec.ts › outer suite › inner suite

# Teste totalmente qualificado com projeto:
[chromium] › path/to/example.spec.ts:3:9 › suite › nested suite › example test

# Este teste é incluído para todos os projetos:
path/to/example.spec.ts:3:9 › example test

# Use "›" ou ">" como separador:
[firefox] > example.spec.ts > suite > nested suite > example test

# Números de linha/coluna são ignorados; você pode omiti-los.
# As três entradas abaixo referem-se ao mesmo teste:
example.spec.ts › example test
example.spec.ts:15 › example test
example.spec.ts:42:42 › example test
```

### Exibir relatório (Show Report)

Exibe o relatório HTML da última execução de testes. [Leia mais sobre o HTML reporter](./test-reporters.md#html-reporter).

#### Sintaxe

```bash
npx playwright show-report [report] [options]
```

#### Exemplos

```bash
# Exibe o último relatório de teste
npx playwright show-report

# Exibe um relatório específico
npx playwright show-report playwright-report/

# Exibe o relatório em uma porta customizada
npx playwright show-report --port 8080
```

#### Opções

| Opção | Descrição |
| :--- | :--- |
| `--host <host>` | Host para servir o relatório (padrão: localhost) |
| `--port <port>` | Porta para servir o relatório (padrão: 9323) |

### Instalar navegadores (Install Browsers)

Instala os navegadores exigidos pelo Playwright. [Leia mais sobre o suporte a navegadores](./browsers.md).

#### Sintaxe

```bash
npx playwright install [options] [browser...]
npx playwright install-deps [options] [browser...]
npx playwright uninstall
```

#### Exemplos

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
# Instala todos os navegadores
npx playwright install

# Instala apenas o Chromium
npx playwright install chromium

# Instala navegadores específicos
npx playwright install chromium webkit

# Instala navegadores com dependências do sistema
npx playwright install --with-deps
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright install
yarn playwright install chromium
yarn playwright install chromium webkit
yarn playwright install --with-deps
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm exec playwright install
pnpm exec playwright install chromium
pnpm exec playwright install chromium webkit
pnpm exec playwright install --with-deps
```

</TabItem>
</Tabs>

#### Opções de instalação

| Opção | Descrição |
| :--- | :--- |
| `--force` | Força a reinstalação dos canais estáveis de navegador |
| `--with-deps` | Instala dependências de sistema dos navegadores |
| `--dry-run` | Não executa a instalação, apenas imprime informações |
| `--only-shell` | Instala apenas o chromium-headless-shell em vez do Chromium completo |
| `--no-shell` | Não instala o chromium-headless-shell |
| `--no-remove` | Não remove navegadores não utilizados |

#### Opções de install-deps

| Opção | Descrição |
| :--- | :--- |
| `--dry-run` | Não modifica o sistema. No Linux, simula a instalação via apt-get e sai com código não-zero se faltar algum pacote — útil para scripts de verificação não-interativos. No Windows, imprime o comando de instalação. |

## Ferramentas de geração e depuração

### Code Generation (Codegen)

Grava ações e gera testes para múltiplas linguagens. [Leia mais sobre o Codegen](./codegen-intro.md).

#### Sintaxe

```bash
npx playwright codegen [options] [url]
```

#### Exemplos

```bash
# Inicia a gravação com UI interativa
npx playwright codegen

# Grava em um site específico
npx playwright codegen https://playwright.dev

# Gera código TypeScript (playwright-test)
npx playwright codegen --target=playwright-test
```

#### Opções

| Opção | Descrição |
| :--- | :--- |
| `-b, --browser <name>` | Navegador a usar: chromium, firefox ou webkit (padrão: chromium) |
| `-o, --output <file>` | Arquivo de saída para o script gerado |
| `--target <language>` | Linguagem a usar: javascript, playwright-test, python etc. |
| `--test-id-attribute <attr>` | Atributo a usar para test IDs |

### Trace Viewer

Analisa e visualiza traces de teste para depuração. [Leia mais sobre o Trace Viewer](./trace-viewer.md).

#### Sintaxe

```bash
npx playwright show-trace [options] [trace]
```

#### Exemplos

```bash
# Abre o trace viewer sem um trace específico (carrega traces pela UI)
npx playwright show-trace

# Visualiza um arquivo de trace
npx playwright show-trace trace.zip

# Visualiza trace de um diretório
npx playwright show-trace trace/
```

#### Opções

| Opção | Descrição |
| :--- | :--- |
| `-b, --browser <name>` | Navegador a usar: chromium, firefox ou webkit (padrão: chromium) |
| `-h, --host <host>` | Host para servir o trace |
| `-p, --port <port>` | Porta para servir o trace |

## Comandos especializados

### Mesclar relatórios (Merge Reports)

Lê relatórios [blob](./test-reporters.md#blob-reporter) e os combina. [Leia mais sobre merge-reports](./test-sharding.md).

#### Sintaxe

```bash
npx playwright merge-reports [options] <blob dir>
```

#### Exemplos

```bash
# Combina relatórios de teste
npx playwright merge-reports ./reports
```

#### Opções

| Opção | Descrição |
| :--- | :--- |
| `-c, --config <file>` | Arquivo de configuração. Pode especificar configuração adicional para o relatório de saída |
| `--reporter <reporter>` | Reporter a usar, separado por vírgula; "list", "line", "dot", "json", "junit", "null", "github", "html", "blob" (padrão: "list") |

### Limpar cache (Clear Cache)

Limpa todos os caches do Playwright.

#### Sintaxe

```bash
npx playwright clear-cache
```

## Quando usar cada comando

- **`npx playwright test`** — o comando do dia a dia. Combine com `--project`, `--grep`, `--workers` e `--trace`.
- **`npx playwright test --ui`** — modo interativo para desenvolvimento e depuração de testes individuais.
- **`npx playwright test --debug`** — abre o Inspector para inspecionar seletores e step-through.
- **`npx playwright codegen`** — geração de testes a partir de gravação de ações (ótimo para prototipar locators).
- **`npx playwright show-report`** — revisão de falhas e traces em CI/local.
- **`npx playwright install --with-deps`** — em imagens Docker/CI para garantir navegadores e libs do sistema.

## Armadilhas comuns (gotchas)

- **`--grep` casa com o título do teste, não com o nome do arquivo.** Para filtrar por arquivo, passe o caminho como argumento posicional: `npx playwright test tests/foo/`.
- **Curingas em `--project`** usam `*`, ex.: `--project='*chromium*'`.
- **`--workers=1` não garante ordem entre arquivos** por padrão; apenas serializa a execução dentro da limitação de workers.
- **`npx` vs `yarn`/`pnpm`:** com Yarn use `yarn playwright`, com pnpm use `pnpm exec playwright` (ou `pnpm playwright` em versões recentes).
- **`--trace` na linha de comando sobrescreve** o config; para não coletar trace em todos os testes em CI, prefira `trace: 'on-first-retry'` no config.

## Exemplo completo de fluxo CI

```bash
# 1. Instala navegadores (com libs do sistema)
npx playwright install --with-deps

# 2. Roda os testes em paralelo, apenas Chromium, com trace nas retentativas
npx playwright test --project=chromium --workers=4 --trace=on-first-retry

# 3. Em caso de falhas, abre o relatório
npx playwright show-report
```

## Boas práticas

- Use `npx playwright test` (npm) como padrão; documente variantes yarn/pnpm se o time as usar.
- No CI, fixe a versão do Playwright e rode `playwright install --with-deps` em uma etapa própria.
- Prefira filtros por arquivo/projeto a `--grep` complexos quando possível (mais legível).
- Habilite `--trace` apenas nas retentativas (`on-first-retry`) para não degradar a performance.
- Use `--last-failed` durante o desenvolvimento para reexecutar rapidamente só o que quebrou.
