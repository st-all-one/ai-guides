---
id: canary-releases
title: "Releases canary"
---

## Introdução

O Playwright para Node.js possui um sistema de releases canary.

Ele permite que você **teste novos recursos ainda não lançados** em vez de esperar por um release completo. Eles são publicados diariamente na tag `next` do NPM do Playwright.

É uma boa forma de **dar feedback aos mantenedores**, garantindo que a feature recém-implementada funcione como esperado.

:::note

Usar um release canary em produção pode parecer arriscado, mas, na prática, não é.

Um release canary passa em todos os testes automatizados e é usado para testar, por exemplo, o HTML report, o Trace Viewer ou o Playwright Inspector com testes end-to-end.

:::

## Tag `next` do NPM

Para qualquer commit relacionado a código no `main`, a integração contínua publica um release canary diário sob a dist tag `@next` do NPM.

Você pode ver no [npm](https://www.npmjs.com/package/@playwright/test?activeTab=versions) as tags atuais:

- `latest`: releases estáveis
- `next`: próximos releases, publicados diariamente
- `beta`: após o branch de release ser cortado (geralmente uma semana antes de um release estável), cada commit é publicado sob essa tag

## Usando um release canary

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
npm install -D @playwright/test@next
```

</TabItem>

<TabItem value="yarn">

```bash
yarn add --dev @playwright/test@next
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm install --save-dev @playwright/test@next
```

</TabItem>

</Tabs>

Depois de instalar, lembre-se de instalar/atualizar os binários dos navegadores correspondentes:

```bash
npx playwright install --with-deps
```

> **Armadilhas comuns (gotchas):** versões `@next` podem conter mudanças incompatíveis (breaking changes) antes de estabilizarem. Use-as em uma branch de teste ou em CI separado — nunca como dependência fixa de produção sem validação. Ao reportar bugs, sempre informe a versão exata (`npx playwright --version`) da tag `next`.

## Documentação

A documentação estável e a documentação `next` são publicadas em [playwright.dev](https://playwright.dev). Para ver a documentação `next`, pressione a tecla <kbd>Shift</kbd> no teclado `5` vezes.
