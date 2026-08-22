---
id: test-typescript
title: "TypeScript"
---

## Introdução

O Playwright suporta TypeScript nativamente. Você simplesmente escreve os testes em TypeScript e o Playwright os lê, transpila para JavaScript e executa. Toda a documentação deste guia assume **TypeScript puro** com `@playwright/test`.

Note que o Playwright **não** checa os tipos e executará os testes mesmo que existam erros não críticos de compilação TypeScript. Recomendamos rodar o compilador TypeScript junto com o Playwright. Por exemplo, em GitHub Actions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    ...
    - name: Run type checks
      run: npx tsc -p tsconfig.json --noEmit
    - name: Run Playwright tests
      run: npx playwright test
```

Para desenvolvimento local, você pode rodar o `tsc` em modo [watch](https://www.typescriptlang.org/docs/handbook/configuring-watch.html):

```sh
npx tsc -p tsconfig.json --noEmit -w
```

> **Por que checar tipos?** O Playwright transpila o TS "solto" (strip types) e ignora erros de tipo. Isso significa que um `page.getByRole(...).fill(...)` com tipos quebrados ainda executa. Rodar `tsc --noEmit` no CI captura bugs de digitação e refactoring quebrando antes do navegador abrir.

## tsconfig.json

O Playwright escolhe o `tsconfig.json` para cada arquivo-fonte que carrega. Note que o Playwright **suporta apenas** as seguintes opções do tsconfig: `allowJs`, `baseUrl`, `paths`, `references` e `extends`.

Recomendamos configurar um `tsconfig.json` separado no diretório de testes para poder mudar preferências específicas dos testes. Veja uma estrutura de diretórios de exemplo:

```txt
src/
    source.ts

tests/
    tsconfig.json  # tsconfig específico dos testes
    example.spec.ts

tsconfig.json  # tsconfig genérico para todas as fontes TypeScript

playwright.config.ts
```

### Exemplo completo de configuração de testes

Um `tsconfig.json` realista para a pasta `tests/`, com `strict` ligado e herança do tsconfig raiz:

```json title="tests/tsconfig.json"
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@myhelper/*": ["../packages/myhelper/*"]
    },
    "noEmit": true
  },
  "include": ["./**/*.ts"]
}
```

### Mapeamento de paths (path mapping)

O Playwright suporta [mapeamento de paths](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping) declarado no `tsconfig.json`.

Exemplo de `tsconfig.json` que funciona com o Playwright:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "paths": {
      "@myhelper/*": ["packages/myhelper/*"]
    }
  }
}
```

Agora você pode importar usando os paths mapeados:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';
import { username, password } from '@myhelper/credentials';

test('example', async ({ page }) => {
  await page.getByLabel('User Name').fill(username);
  await page.getByLabel('Password').fill(password);
});
```

### Resolução do tsconfig

Por padrão, o Playwright procura o `tsconfig.json` mais próximo para cada arquivo importado, subindo a estrutura de diretórios e procurando por `tsconfig.json` ou `jsconfig.json`. Assim, você pode criar um `tests/tsconfig.json` que será usado apenas para seus testes e o Playwright o escolherá automaticamente.

```sh
# O Playwright escolhe o tsconfig automaticamente
npx playwright test
```

Alternativamente, você pode especificar um único arquivo tsconfig na linha de comando, e o Playwright o usará para todos os arquivos importados, não apenas arquivos de teste.

```sh
# Passa um tsconfig específico
npx playwright test --tsconfig=tsconfig.test.json
```

Você também pode especificar um único tsconfig no arquivo de configuração, que será usado para carregar arquivos de teste, reporters etc. Porém, **não** será usado ao carregar o próprio `playwright.config` ou quaisquer arquivos importados dele.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  tsconfig: './tsconfig.test.json',
});
```

### Quando usar `--tsconfig` vs `tsconfig` no config

| Situação | Onde definir |
| -------- | ------------ |
| Testes em `tests/` precisam de opções diferentes do app | `tests/tsconfig.json` (resolução automática) |
| Um único tsconfig para toda a suíte de teste + reporters | `tsconfig` em `playwright.config.ts` |
| Sobrescrever temporariamente em um comando | `--tsconfig=...` na CLI |

## Compilação manual dos testes com TypeScript

Às vezes o Playwright Test não conseguirá transformar seu código TypeScript corretamente — por exemplo, quando você usa features experimentais ou muito recentes do TypeScript, geralmente configuradas no `tsconfig.json`.

Neste caso, você pode fazer sua própria compilação TypeScript antes de enviar os testes ao Playwright.

Primeiro adicione um `tsconfig.json` dentro do diretório de testes:

```json title="tests/tsconfig.json"
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "commonjs",
        "moduleResolution": "Node",
        "sourceMap": true,
        "outDir": "../tests-out",
        "strict": true
    },
    "include": ["./**/*.ts"]
}
```

No `package.json`, adicione dois scripts:

```json title="package.json"
{
  "scripts": {
    "pretest": "tsc --incremental -p tests/tsconfig.json",
    "test": "playwright test -c tests-out"
  }
}
```

O script `pretest` roda o TypeScript nos testes. O `test` rodará os testes que foram gerados no diretório `tests-out`. O argumento `-c` configura o runner para procurar testes dentro de `tests-out`.

Então `npm run test` compilará os testes e os executará.

## Armadilhas comuns (gotchas)

- **Tipos quebrados não falham o teste sozinhos.** O Playwright ignora erros de tipo. Se `tsc` não estiver no pipeline, um teste com tipo errado pode passar no Playwright e quebrar só em runtime.
- **`tsconfig` com opções não suportadas.** O Playwright só honra `allowJs`, `baseUrl`, `paths`, `references` e `extends`. Outras opções (ex.: `target`, `module`) são ignoradas na transpilação automática — por isso a compilação manual existe.
- **Paths relativos ao tsconfig.** O mapeamento em `paths` é relativo ao arquivo `tsconfig.json` que o define, não à raiz do projeto.
- **O `tsconfig` do config não se aplica ao config.** O `tsconfig` definido em `playwright.config.ts` vale para os arquivos de teste, mas não para o próprio `playwright.config.ts`.

## Boas práticas

- Mantenha `strict: true` no `tests/tsconfig.json` para pegar erros cedo.
- Rode `tsc --noEmit` como um step separado no CI (antes do `playwright test`), para que falhas de tipo não se misturem com falhas de teste.
- Use `paths` para módulos compartilhados (helpers, fixtures, dados de teste) em vez de imports relativos profundos (`../../../../utils`).
- Prefira a transpilação automática do Playwright; recorra à compilação manual apenas com features TS muito novas.
