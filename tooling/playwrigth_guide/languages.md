---
id: languages
title: "Linguagens suportadas"
---

## Introdução

O Playwright está disponível em múltiplas linguagens que compartilham a mesma implementação subjacente. Todos os recursos centrais de automação de navegador são suportados em todas as linguagens, enquanto a integração com o ecossistema de testes varia. Escolha a linguagem com base na sua experiência, familiaridade com o ecossistema de testes e restrições do projeto.

> **Foco desta documentação:** todo o conteúdo, exemplos e comandos aqui são **TypeScript puro** com `@playwright/test`. O Playwright para Node.js traz o runner de testes mais completo e é a recomendação padrão para novos projetos.

## JavaScript e TypeScript (recomendado)

O Playwright para Node.js vem com seu próprio [test runner](./running-tests-js.md) que oferece paralelização, screenshot assertions, HTML reporter, tracing automático etc. É a opção com a melhor experiência de ponta a ponta e a que recebe os recursos mais recentes primeiro.

### Por que TypeScript?

- **Autocompletar e type-safety** em `page`, `locator`, `expect` e fixtures.
- **Refatoração segura** em toda a suíte de testes.
- **Detecção de erros em tempo de desenvolvimento/CI** com `tsc --noEmit`.

### Estrutura mínima de um projeto TS

```bash
npm init playwright@latest
```

Isso gera:

```txt
playwright.config.ts   # defineConfig com autocompletar de tipos
tests/
  example.spec.ts      # testes em TypeScript
```

Um teste TypeScript típico:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('título da página', async ({ page }) => {
  await page.goto('https://example.com/');
  await expect(page).toHaveTitle('Example Domain');
});
```

### Test runner e ecossistema

O runner nativo (`@playwright/test`) inclui, sem bibliotecas externas:

- [Fixtures e isolamento](./test-fixtures-js.md)
- [Web-first assertions](./test-assertions-js.md)
- [Projects e matrix de configuração](./test-projects-js.md)
- [Paralelização](./test-parallel-js.md)
- [Retries](./test-retries-js.md)
- [HTML reporter e traces](./test-reporters-js.md)

* [Documentação (Node.js)](https://playwright.dev/docs/intro)
* [Repositório no GitHub](https://github.com/microsoft/playwright)

## Outras linguagens

O Playwright também oferece bindings oficiais para **Python**, **Java** e **.NET**, cada uma com seu próprio runner/base classes. Estas linguagens não são cobertas por esta documentação (que é exclusivamente TypeScript). Se o seu projeto já está em uma dessas stacks, consulte a documentação específica:

* Python — [Documentação](https://playwright.dev/python/docs/intro) · [GitHub](https://github.com/microsoft/playwright-python)
* Java — [Documentação](https://playwright.dev/java/docs/intro) · [GitHub](https://github.com/microsoft/playwright-java)
* .NET — [Documentação](https://playwright.dev/dotnet/docs/intro) · [GitHub](https://github.com/microsoft/playwright-dotnet)

> **Boas práticas:** para obter o máximo de web-first assertions, fixtures e tracing com o mínimo de configuração, prefira **TypeScript** com `@playwright/test`. Se você já usa outra linguagem, mantenha a convenção de test runner recomendada para ela (Pytest para Python, JUnit/NUnit para Java/.NET).
